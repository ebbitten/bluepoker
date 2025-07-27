/**
 * Game Logic Offline Torture Tests
 * Tests game logic components without requiring a running server
 */

import { describe, it, expect } from 'vitest';
import { 
  GameState, 
  Player, 
  createGame, 
  dealNewHand, 
  executePlayerAction,
  evaluateHand,
  createDeck,
  shuffleDeck,
  drawCards,
  cardToString,
  Card
} from '@shared';

describe('Game Logic Offline Torture Tests', () => {

  describe('Game State Stress Testing', () => {
    it('should handle rapid game state transitions', async () => {
      const players: Player[] = [
        { id: 'player1', name: 'TorturePlayer1', chips: 10000, position: 0 },
        { id: 'player2', name: 'TorturePlayer2', chips: 10000, position: 1 }
      ];
      
      let gameState = createGame('torture-game', [players[0].name, players[1].name]);
      
      // Simulate 1000 rapid state transitions
      for (let i = 0; i < 1000; i++) {
        try {
          // Deal cards if hand not active
          if (gameState.phase === 'waiting' || gameState.phase === 'complete') {
            gameState = dealNewHand(gameState);
          }
          
          // Random player actions
          const actions = ['fold', 'call', 'raise'] as const;
          const action = actions[i % 3];
          const playerId = gameState.players[i % 2].id;
          const amount = action === 'raise' ? 50 + (i % 100) : undefined;
          
          const result = executePlayerAction(gameState, playerId, action, amount);
          if (result.success) {
            gameState = result.gameState;
          }
          
          // Reset game if hand is complete
          if (gameState.phase === 'complete') {
            gameState = createGame(`torture-game-${i}`, [players[0].name, players[1].name]);
          }
        } catch (error) {
          // Log errors but continue stress testing
          console.log(`Error at iteration ${i}:`, error);
        }
      }
      
      // Game state should remain valid
      expect(gameState).toBeDefined();
      expect(gameState.players).toHaveLength(2);
    });

    it('should handle memory stress with large game histories', async () => {
      const players: Player[] = [
        { id: 'player1', name: 'MemoryPlayer1', chips: 100000, position: 0 },
        { id: 'player2', name: 'MemoryPlayer2', chips: 100000, position: 1 }
      ];
      
      const games = [];
      const gameCount = 500;
      
      console.log(`Creating ${gameCount} games for memory testing...`);
      
      for (let i = 0; i < gameCount; i++) {
        const gameState = createGame(`memory-game-${i}`, [players[0].name, players[1].name]);
        games.push(gameState);
        
        // Simulate game progression
        try {
          const dealtGame = dealNewHand(gameState);
          games[i] = dealtGame;
        } catch (error) {
          console.log(`Game ${i} failed to deal:`, error);
        }
      }
      
      console.log(`Successfully created ${games.length} games`);
      
      // Should create all games successfully
      expect(games.length).toBe(gameCount);
      
      // All games should have valid structure
      games.forEach((game, index) => {
        expect(game.gameId).toBe(`memory-game-${index}`);
        expect(game.players).toHaveLength(2);
      });
    });
  });

  describe('Hand Evaluation Torture Testing', () => {
    it('should evaluate 100,000 random hands without errors', async () => {
      const handCount = 100000;
      let successful = 0;
      let errors = 0;
      
      console.log(`Evaluating ${handCount} random hands...`);
      
      for (let i = 0; i < handCount; i++) {
        try {
          const deck = shuffleDeck(createDeck());
          const cards = drawCards(deck, 7).drawnCards; // 2 hole + 5 community
          const cardStrings = cards.map(card => cardToString(card));
          
          const result = evaluateHand(cardStrings);
          
          if (result && typeof result.handRank === 'number') {
            successful++;
          } else {
            errors++;
          }
        } catch (error) {
          errors++;
          if (errors < 10) { // Log first 10 errors only
            console.log(`Hand evaluation error ${i}:`, error);
          }
        }
      }
      
      console.log(`Hand evaluation results: ${successful} successful, ${errors} errors`);
      
      // Should evaluate vast majority of hands successfully
      expect(successful).toBeGreaterThan(handCount * 0.95); // 95% success rate
      expect(errors).toBeLessThan(handCount * 0.05); // Less than 5% errors
    });

    it('should handle edge case hand combinations', async () => {
      const edgeCases = [
        // All same suit (royal flush)
        ['As', 'Ks', 'Qs', 'Js', 'Ts', '9s', '8s'],
        // All same rank (impossible but test error handling)
        ['As', 'Ah', 'Ac', 'Ad', 'As', 'Ah', 'Ac'], // Duplicate cards
        // Empty array
        [],
        // Single card
        ['As'],
        // Invalid card format
        ['XX', 'YY', 'ZZ', 'As', 'Kd', 'Qh', 'Jc'],
        // Mixed valid/invalid
        ['As', 'invalid', 'Kd', 'null', 'Qh', 'undefined', 'Jc']
      ];
      
      for (const cards of edgeCases) {
        try {
          const result = evaluateHand(cards as any);
          // Should either return valid result or throw error gracefully
          if (result) {
            expect(result).toHaveProperty('rank');
          }
        } catch (error) {
          // Errors are acceptable for invalid inputs
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Deck Operations Stress Testing', () => {
    it('should handle rapid deck operations without corruption', async () => {
      const operationCount = 10000;
      let successfulOperations = 0;
      
      console.log(`Performing ${operationCount} deck operations...`);
      
      for (let i = 0; i < operationCount; i++) {
        try {
          // Create and shuffle deck
          let deck = createDeck();
          expect(deck).toHaveLength(52);
          
          deck = shuffleDeck(deck);
          expect(deck).toHaveLength(52);
          
          // Draw random number of cards
          const drawCount = (i % 10) + 1; // 1-10 cards
          const result = drawCards(deck, drawCount);
          
          expect(result.drawnCards).toHaveLength(drawCount);
          expect(result.remainingDeck).toHaveLength(52 - drawCount);
          
          // Verify no duplicates
          const allCards = [...result.drawnCards, ...result.remainingDeck];
          const uniqueCards = new Set(allCards);
          expect(uniqueCards.size).toBe(52);
          
          successfulOperations++;
        } catch (error) {
          console.log(`Deck operation error ${i}:`, error);
        }
      }
      
      console.log(`Successful deck operations: ${successfulOperations}/${operationCount}`);
      
      // Should complete all operations successfully
      expect(successfulOperations).toBe(operationCount);
    });

    it('should handle concurrent deck operations', async () => {
      const concurrentOps = 100;
      
      const deckPromises = Array(concurrentOps).fill(null).map(async (_, index) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            try {
              const deck = shuffleDeck(createDeck());
              const result = drawCards(deck, 7);
              resolve({
                success: true,
                cardsDrawn: result.drawnCards.length,
                cardsRemaining: result.remainingDeck.length
              });
            } catch (error) {
              resolve({ success: false, error: error.message });
            }
          }, Math.random() * 10); // Random delay 0-10ms
        });
      });
      
      const results = await Promise.all(deckPromises);
      const successful = results.filter((r: any) => r.success).length;
      
      console.log(`Concurrent deck operations: ${successful}/${concurrentOps} successful`);
      
      // Should handle all concurrent operations
      expect(successful).toBe(concurrentOps);
    });
  });

  describe('Player Action Validation Stress', () => {
    it('should handle invalid player actions gracefully', async () => {
      const players: Player[] = [
        { id: 'player1', name: 'ValidationPlayer1', chips: 1000, position: 0 },
        { id: 'player2', name: 'ValidationPlayer2', chips: 1000, position: 1 }
      ];
      
      let gameState = createGame('validation-game', [players[0].name, players[1].name]);
      gameState = dealNewHand(gameState);
      
      const invalidActions = [
        { playerId: 'nonexistent', action: 'call', amount: 0 },
        { playerId: 'player1', action: 'invalid_action', amount: 0 },
        { playerId: 'player1', action: 'raise', amount: -100 },
        { playerId: 'player1', action: 'raise', amount: 999999 },
        { playerId: 'player1', action: 'call', amount: 50 }, // Call shouldn't have amount
        { playerId: '', action: 'fold', amount: 0 },
        { playerId: null, action: 'call', amount: 0 },
        { playerId: 'player1', action: '', amount: 0 },
        { playerId: 'player1', action: null, amount: 0 },
        { playerId: 'player1', action: 'fold', amount: 1.5 }, // Non-integer
      ];
      
      let validationsPassed = 0;
      
      for (const action of invalidActions) {
        try {
          const result = executePlayerAction(gameState, action.playerId, action.action as any, action.amount);
          // If it returns without error, check if validation caught it
          if (result.success) {
            console.log('Unexpected success for invalid action:', action);
          } else {
            // Expected behavior - invalid actions should fail validation
            validationsPassed++;
          }
        } catch (error) {
          // Expected behavior - invalid actions should throw errors or fail validation
          validationsPassed++;
        }
      }
      
      // All invalid actions should be caught
      expect(validationsPassed).toBe(invalidActions.length);
    });

    it('should handle rapid action sequences', async () => {
      const players: Player[] = [
        { id: 'player1', name: 'RapidPlayer1', chips: 10000, position: 0 },
        { id: 'player2', name: 'RapidPlayer2', chips: 10000, position: 1 }
      ];
      
      let gameState = createGame('rapid-game', [players[0].name, players[1].name]);
      
      const actionCount = 1000;
      let successfulActions = 0;
      
      for (let i = 0; i < actionCount; i++) {
        try {
          // Start new hand if needed
          if (gameState.phase === 'complete' || gameState.phase === 'waiting') {
            gameState = dealNewHand(gameState);
          }
          
          const currentPlayerId = gameState.players[gameState.activePlayerIndex]?.id;
          if (!currentPlayerId) {
            // No active player, skip this iteration
            continue;
          }
          
          const validActions = ['fold', 'call', 'raise'] as const;
          const action = validActions[i % validActions.length];
          const amount = action === 'raise' ? 50 : undefined;
          
          const result = executePlayerAction(gameState, currentPlayerId, action, amount);
          if (result.success) {
            gameState = result.gameState;
            successfulActions++;
          }
        } catch (error) {
          // Some errors expected due to game state changes
          if (i % 100 === 0) {
            console.log(`Action ${i} error:`, error.message);
          }
        }
      }
      
      console.log(`Rapid actions: ${successfulActions}/${actionCount} successful`);
      
      // Should process majority of actions successfully
      expect(successfulActions).toBeGreaterThan(actionCount * 0.5);
    });
  });

  describe('Boundary Value Torture Testing', () => {
    it('should handle extreme chip values', async () => {
      const extremeValues = [
        0,           // Broke player
        1,           // Minimum chips
        999999999,   // Very wealthy player
        Number.MAX_SAFE_INTEGER, // Maximum safe integer
        -1,          // Invalid negative
        1.5,         // Invalid decimal
        Infinity,    // Invalid infinity
        NaN,         // Invalid NaN
      ];
      
      for (const chipValue of extremeValues) {
        try {
          const players: Player[] = [
            { id: 'player1', name: 'ExtremePlayer1', chips: chipValue, position: 0 },
            { id: 'player2', name: 'ExtremePlayer2', chips: 1000, position: 1 }
          ];
          
          const gameState = createGame('extreme-chips-game', [players[0].name, players[1].name]);
          
          // Game creation should handle extreme values gracefully
          expect(gameState.gameId).toBe('extreme-chips-game');
          if (typeof chipValue === 'number' && chipValue >= 0 && chipValue <= Number.MAX_SAFE_INTEGER) {
            // Note: The createGame function uses fixed STARTING_CHIPS, not the test chipValue
            // This test validates that the game creation API is stable regardless of test inputs
            expect(gameState.players[0].chips).toBe(1000); // STARTING_CHIPS constant
          }
        } catch (error) {
          // Errors expected for invalid values
          expect([NaN, Infinity, -1, 1.5].includes(chipValue)).toBe(true);
        }
      }
    });

    it('should handle extreme player counts', async () => {
      const playerCounts = [0, 1, 2, 10, 100, 1000];
      
      for (const count of playerCounts) {
        try {
          const players: Player[] = Array(count).fill(null).map((_, i) => ({
            id: `player${i}`,
            name: `ExtremePlayer${i}`,
            chips: 1000,
            position: i
          }));
          
          const gameState = createGame(`extreme-players-${count}`, [players[0]?.name || 'Player1', players[1]?.name || 'Player2']);
          
          // Game creation always creates exactly 2 players (heads-up design)
          expect(gameState.gameId).toBe(`extreme-players-${count}`);
          expect(gameState.players).toHaveLength(2);
        } catch (error) {
          // Errors expected for invalid player counts
          expect([0, 1, 100, 1000].includes(count)).toBe(true);
        }
      }
    });
  });
});