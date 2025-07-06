import { describe, it, expect, beforeEach } from 'vitest';

describe('Game State API Integration', () => {
  const baseUrl = 'http://localhost:3000/api/game';
  let gameId: string;
  
  beforeEach(async () => {
    // Create a new game for each test
    const response = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerNames: ['Alice', 'Bob']
      })
    });
    
    const data = await response.json();
    gameId = data.gameId;
  });

  describe('POST /api/game/create', () => {
    it('should create a new game', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNames: ['Player1', 'Player2']
        })
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.gameId).toBeDefined();
      expect(data.gameState.players).toHaveLength(2);
      expect(data.gameState.players[0].name).toBe('Player1');
      expect(data.gameState.players[1].name).toBe('Player2');
    });

    it('should reject invalid player names', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNames: ['Player1'] // Only one player
        })
      });
      
      expect(response.status).toBe(400);
    });

    it('should reject empty player names', async () => {
      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNames: ['', 'Player2']
        })
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/game/:gameId', () => {
    it('should return game state', async () => {
      const response = await fetch(`${baseUrl}/${gameId}`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.gameId).toBe(gameId);
      expect(data.players).toHaveLength(2);
      expect(data.phase).toBe('preflop');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await fetch(`${baseUrl}/non-existent-game`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/game/:gameId/deal', () => {
    it('should deal new hand', async () => {
      const response = await fetch(`${baseUrl}/${gameId}/deal`, {
        method: 'POST'
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.players[0].holeCards).toHaveLength(2);
      expect(data.players[1].holeCards).toHaveLength(2);
      expect(data.pot).toBe(30); // Blinds posted
      expect(data.currentBet).toBe(20); // Big blind
    });

    it('should return 404 for non-existent game', async () => {
      const response = await fetch(`${baseUrl}/non-existent-game/deal`, {
        method: 'POST'
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/game/:gameId/action', () => {
    beforeEach(async () => {
      // Deal cards before testing actions
      await fetch(`${baseUrl}/${gameId}/deal`, { method: 'POST' });
    });

    it('should execute valid fold action', async () => {
      // Get current game state to find player IDs
      const gameResponse = await fetch(`${baseUrl}/${gameId}`);
      const gameState = await gameResponse.json();
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      
      const response = await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activePlayer.id,
          action: 'fold'
        })
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.gameState.phase).toBe('complete');
      expect(data.gameState.winner).toBeDefined();
    });

    it('should execute valid call action', async () => {
      const gameResponse = await fetch(`${baseUrl}/${gameId}`);
      const gameState = await gameResponse.json();
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      
      const response = await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activePlayer.id,
          action: 'call'
        })
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.gameState.pot).toBe(40); // Both blinds called
    });

    it('should execute valid raise action', async () => {
      const gameResponse = await fetch(`${baseUrl}/${gameId}`);
      const gameState = await gameResponse.json();
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      
      const response = await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activePlayer.id,
          action: 'raise',
          amount: 50
        })
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.gameState.currentBet).toBe(50);
      expect(data.gameState.pot).toBe(70); // 30 from blinds + 40 additional (50 total - 10 already in)
    });

    it('should reject invalid action from wrong player', async () => {
      const gameResponse = await fetch(`${baseUrl}/${gameId}`);
      const gameState = await gameResponse.json();
      const inactivePlayer = gameState.players[1 - gameState.activePlayerIndex];
      
      const response = await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: inactivePlayer.id,
          action: 'call'
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not your turn');
    });

    it('should reject raise without amount', async () => {
      const gameResponse = await fetch(`${baseUrl}/${gameId}`);
      const gameState = await gameResponse.json();
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      
      const response = await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activePlayer.id,
          action: 'raise'
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('amount required');
    });

    it('should return 404 for non-existent game', async () => {
      const response = await fetch(`${baseUrl}/non-existent-game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'player1',
          action: 'fold'
        })
      });
      
      expect(response.status).toBe(404);
    });
  });

  describe('Complete Game Flow', () => {
    it('should support a complete game from deal to showdown', async () => {
      // Deal cards
      await fetch(`${baseUrl}/${gameId}/deal`, { method: 'POST' });
      
      // Get initial state
      let gameResponse = await fetch(`${baseUrl}/${gameId}`);
      let gameState = await gameResponse.json();
      
      expect(gameState.phase).toBe('preflop');
      expect(gameState.pot).toBe(30);
      
      // Small blind calls
      const smallBlind = gameState.players[0];
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: smallBlind.id,
          action: 'call'
        })
      });
      
      // Check game progressed to flop
      gameResponse = await fetch(`${baseUrl}/${gameId}`);
      gameState = await gameResponse.json();
      
      expect(gameState.phase).toBe('flop');
      expect(gameState.communityCards).toHaveLength(3);
      expect(gameState.pot).toBe(40);
      
      // Continue to river by checking (calling 0)
      const bigBlind = gameState.players[1];
      
      // Flop: both check
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: bigBlind.id,
          action: 'call'
        })
      });
      
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: smallBlind.id,
          action: 'call'
        })
      });
      
      // Check turn
      gameResponse = await fetch(`${baseUrl}/${gameId}`);
      gameState = await gameResponse.json();
      expect(gameState.phase).toBe('turn');
      expect(gameState.communityCards).toHaveLength(4);
      
      // Turn: both check
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: bigBlind.id,
          action: 'call'
        })
      });
      
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: smallBlind.id,
          action: 'call'
        })
      });
      
      // Check river
      gameResponse = await fetch(`${baseUrl}/${gameId}`);
      gameState = await gameResponse.json();
      expect(gameState.phase).toBe('river');
      expect(gameState.communityCards).toHaveLength(5);
      
      // River: both check
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: bigBlind.id,
          action: 'call'
        })
      });
      
      await fetch(`${baseUrl}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: smallBlind.id,
          action: 'call'
        })
      });
      
      // Check showdown
      gameResponse = await fetch(`${baseUrl}/${gameId}`);
      gameState = await gameResponse.json();
      expect(gameState.phase).toBe('complete');
      expect(gameState.winner).toBeDefined();
      expect(gameState.winnerReason).toBeDefined();
    });
  });
});