/**
 * Lobby API Integration Tests
 * Tests for Increment 5: Lobby system API endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Lobby API Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000';
  let createdGameIds: string[] = [];

  beforeEach(async () => {
    // Clear lobby state before each test
    const { getLobbyManager } = await import('@bluepoker/shared');
    const lobbyManager = getLobbyManager();
    if ('clear' in lobbyManager) {
      (lobbyManager as any).clear();
    }
    createdGameIds = [];
  });

  afterEach(async () => {
    // Cleanup created games
    for (const gameId of createdGameIds) {
      try {
        await fetch(`${BASE_URL}/api/lobby/games/${gameId}`, { method: 'DELETE' });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdGameIds = [];
  });

  describe('GET /api/lobby/games', () => {
    it('should return empty lobby initially', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.games).toEqual([]);
      expect(data.totalGames).toBe(0);
      expect(data.activePlayers).toBe(0);
    });

    it('should return list of created games', async () => {
      // Create test games
      const game1Response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Game 1',
          maxPlayers: 2,
          gameType: 'heads-up'
        })
      });
      const game1 = await game1Response.json();
      createdGameIds.push(game1.gameId);

      const game2Response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Game 2',
          maxPlayers: 4,
          gameType: 'multi-table'
        })
      });
      const game2 = await game2Response.json();
      createdGameIds.push(game2.gameId);

      // Get lobby list
      const response = await fetch(`${BASE_URL}/api/lobby/games`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toHaveLength(2);
      expect(data.totalGames).toBe(2);
      expect(data.games.map((g: any) => g.name)).toContain('Test Game 1');
      expect(data.games.map((g: any) => g.name)).toContain('Test Game 2');
    });

    it('should filter games by status query parameter', async () => {
      // This test will fail initially - endpoint doesn't exist yet
      const response = await fetch(`${BASE_URL}/api/lobby/games?status=waiting`);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/lobby/games', () => {
    it('should create new lobby game successfully', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Test Game',
          maxPlayers: 6,
          gameType: 'multi-table',
          buyIn: 100
        })
      });

      expect(response.status).toBe(201);
      
      const game = await response.json();
      createdGameIds.push(game.gameId);

      expect(game.name).toBe('My Test Game');
      expect(game.maxPlayers).toBe(6);
      expect(game.gameType).toBe('multi-table');
      expect(game.buyIn).toBe(100);
      expect(game.status).toBe('waiting');
      expect(game.playerCount).toBe(0);
      expect(game.players).toEqual([]);
      expect(game.gameId).toBeTruthy();
      expect(game.createdAt).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '', // Invalid empty name
          maxPlayers: 2,
          gameType: 'heads-up'
        })
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('name');
    });

    it('should validate game type', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Game',
          maxPlayers: 2,
          gameType: 'invalid-type'
        })
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('Game type');
    });

    it('should validate max players range', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Game',
          maxPlayers: 15, // Too many players
          gameType: 'multi-table'
        })
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('Max players');
    });
  });

  describe('POST /api/lobby/games/:gameId/join', () => {
    let testGameId: string;

    beforeEach(async () => {
      // Create test game
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Join Test Game',
          maxPlayers: 4,
          gameType: 'multi-table'
        })
      });
      const game = await response.json();
      testGameId = game.gameId;
      createdGameIds.push(testGameId);
    });

    it('should allow player to join available game', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice'
        })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.playerId).toBeTruthy();
      expect(result.gameState.playerCount).toBe(1);
      expect(result.gameState.players[0].name).toBe('Alice');
    });

    it('should prevent joining non-existent game', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/non-existent-id/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice'
        })
      });

      expect(response.status).toBe(404);
      
      const error = await response.json();
      expect(error.error).toContain('not found');
    });

    it('should prevent joining full game', async () => {
      // Fill the game to capacity (4 players)
      for (let i = 1; i <= 4; i++) {
        await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: `Player ${i}` })
        });
      }

      // Try to join as 5th player
      const response = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: 'Alice'
        })
      });

      expect(response.status).toBe(409);
      
      const error = await response.json();
      expect(error.error).toContain('full');
    });

    it('should validate player name', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: '' // Invalid empty name
        })
      });

      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.error).toContain('Player name');
    });
  });

  describe('DELETE /api/lobby/games/:gameId/leave', () => {
    let testGameId: string;
    let playerId: string;

    beforeEach(async () => {
      // Create test game and join as player
      const gameResponse = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Leave Test Game',
          maxPlayers: 2,
          gameType: 'heads-up'
        })
      });
      const game = await gameResponse.json();
      testGameId = game.gameId;
      createdGameIds.push(testGameId);

      const joinResponse = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'Test Player' })
      });
      const joinResult = await joinResponse.json();
      playerId = joinResult.playerId;
    });

    it('should allow player to leave game', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerId
        })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
    });

    it('should handle leaving non-existent game', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/non-existent-id/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerId
        })
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/lobby/games/:gameId/status', () => {
    let testGameId: string;

    beforeEach(async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Status Test Game',
          maxPlayers: 2,
          gameType: 'heads-up'
        })
      });
      const game = await response.json();
      testGameId = game.gameId;
      createdGameIds.push(testGameId);
    });

    it('should return detailed game status', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/${testGameId}/status`);

      expect(response.status).toBe(200);
      
      const status = await response.json();
      expect(status.gameId).toBe(testGameId);
      expect(status.name).toBe('Status Test Game');
      expect(status.status).toBe('waiting');
      expect(status.playerCount).toBe(0);
      expect(status.maxPlayers).toBe(2);
    });

    it('should return 404 for non-existent game', async () => {
      const response = await fetch(`${BASE_URL}/api/lobby/games/non-existent-id/status`);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/lobby/events (SSE)', () => {
    it('should establish SSE connection for lobby updates', async () => {
      // This test will initially fail - SSE endpoint doesn't exist yet
      const response = await fetch(`${BASE_URL}/api/lobby/events`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
    });

    it('should send game creation events via SSE', async () => {
      // This test will validate that game creation triggers lobby events
      // Implementation will depend on SSE event structure
      expect(true).toBe(true); // Placeholder - will implement when SSE is ready
    });
  });
});