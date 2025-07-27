import { describe, it, expect, beforeEach } from 'vitest';
import { startNewHand, createGame, dealNewHand, executePlayerAction } from '@bluepoker/shared';

describe('Multi-Hand Gameplay Integration', () => {
  let gameState: any;

  beforeEach(() => {
    gameState = createGame('test-game', ['Alice', 'Bob']);
  });

  describe('startNewHand Function', () => {
    it('should reset game state for new hand', () => {
      // Complete a hand first
      gameState = dealNewHand(gameState);
      gameState.phase = 'complete';
      gameState.winner = 0;
      gameState.winnerReason = 'best hand';
      gameState.players[0].chips = 1050;
      gameState.players[1].chips = 950;

      const newHandState = startNewHand(gameState);

      expect(newHandState.phase).toBe('preflop');
      expect(newHandState.handNumber).toBe(1);
      expect(newHandState.activePlayerIndex).toBeGreaterThanOrEqual(0);
      expect(newHandState.pot).toBe(30); // Small blind + big blind
      expect(newHandState.currentBet).toBe(20); // Big blind
      expect(newHandState.communityCards).toEqual([]);
      expect(newHandState.winner).toBeUndefined();
      expect(newHandState.winnerReason).toBeUndefined();
      expect(newHandState.dealerIndex).toBeDefined();
      
      // Players should keep their chip counts (minus blinds)
      expect(newHandState.players[0].chips).toBeLessThan(1050);
      expect(newHandState.players[1].chips).toBeLessThan(950);
      
      // Players should have clean state with new hole cards
      expect(newHandState.players[0].holeCards).toHaveLength(2);
      expect(newHandState.players[1].holeCards).toHaveLength(2);
      expect(newHandState.players[0].folded).toBe(false);
      expect(newHandState.players[0].allIn).toBe(false);
    });

    it('should throw error if hand is not complete', () => {
      gameState = dealNewHand(gameState);
      gameState.phase = 'preflop';

      expect(() => startNewHand(gameState)).toThrow('Cannot start new hand: current hand is not complete');
    });

    it('should throw error if players dont have enough chips', () => {
      gameState.phase = 'complete';
      gameState.players[0].chips = 5;
      gameState.players[1].chips = 5;

      expect(() => startNewHand(gameState)).toThrow('Not enough players have chips to continue');
    });
  });

  describe('Dealer Position and Automatic Dealing', () => {
    it('should have dealer position in initial state', () => {
      expect(gameState.dealerIndex).toBeDefined();
      expect(gameState.dealerIndex).toBeGreaterThanOrEqual(0);
      expect(gameState.dealerIndex).toBeLessThan(2);
    });

    it('should allow actions after startNewHand automatically deals', () => {
      gameState.phase = 'complete';
      gameState = startNewHand(gameState);
      
      expect(gameState.phase).toBe('preflop');
      expect(gameState.players[0].holeCards).toHaveLength(2);
      expect(gameState.players[1].holeCards).toHaveLength(2);
      
      const result = executePlayerAction(gameState, gameState.players[gameState.activePlayerIndex].id, 'call');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Hand Number Tracking', () => {
    it('should start with hand number 0', () => {
      expect(gameState.handNumber).toBe(0);
    });

    it('should increment hand number when dealing', () => {
      gameState = dealNewHand(gameState);
      expect(gameState.handNumber).toBe(1);
    });

    it('should maintain hand number through game completion', () => {
      gameState = dealNewHand(gameState);
      gameState.phase = 'complete';
      
      const newHandState = startNewHand(gameState);
      expect(newHandState.handNumber).toBe(1);
      
      const secondHandState = dealNewHand(newHandState);
      expect(secondHandState.handNumber).toBe(2);
    });

    it('should rotate dealer position between hands', () => {
      const initialDealerIndex = gameState.dealerIndex;
      
      gameState = dealNewHand(gameState);
      expect(gameState.dealerIndex).toBe((initialDealerIndex + 1) % 2);
      
      gameState.phase = 'complete';
      const newHandState = startNewHand(gameState);
      expect(newHandState.dealerIndex).toBe((initialDealerIndex + 2) % 2);
    });
  });

  describe('New Hand API Integration', () => {
    it('should handle new hand request correctly', async () => {
      // Create a game and complete a hand
      const createResponse = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames: ['Alice', 'Bob'] })
      });
      
      const gameData = await createResponse.json();
      const gameId = gameData.gameId;
      
      // Deal and complete a hand (simplified for test)
      await fetch(`/api/game/${gameId}/deal`, { method: 'POST' });
      
      // Simulate game completion by setting phase
      const gameStateResponse = await fetch(`/api/game/${gameId}`);
      const currentState = await gameStateResponse.json();
      
      // For this test, we'll assume the hand is complete
      // In a real scenario, you'd play through the hand
      
      // Test new hand creation
      const newHandResponse = await fetch(`/api/game/${gameId}/new-hand`, {
        method: 'POST'
      });
      
      if (newHandResponse.ok) {
        const newHandData = await newHandResponse.json();
        
        expect(newHandData.phase).toBe('preflop');
        expect(newHandData.handNumber).toBeGreaterThan(0);
        expect(newHandData.activePlayerIndex).toBeGreaterThanOrEqual(0);
        expect(newHandData.pot).toBe(30);
        expect(newHandData.communityCards).toEqual([]);
        expect(newHandData.dealerIndex).toBeDefined();
      } else {
        // Expected if hand is not complete
        expect(newHandResponse.status).toBe(400);
      }
    });
  });
});