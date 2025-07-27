/**
 * Lobby System Unit Tests
 * Tests for Increment 5: Multi-game lobby functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryLobbyManager, type LobbyManager, type LobbyGame } from '@bluepoker/shared';

describe('Lobby System Unit Tests', () => {
  let lobbyManager: LobbyManager;

  beforeEach(() => {
    lobbyManager = new InMemoryLobbyManager();
  });

  describe('Game Creation', () => {
    it('should create a new lobby game with correct properties', () => {
      const game = lobbyManager.createGame('Test Game', 2, 'heads-up');
      
      expect(game.name).toBe('Test Game');
      expect(game.maxPlayers).toBe(2);
      expect(game.gameType).toBe('heads-up');
      expect(game.playerCount).toBe(0);
      expect(game.status).toBe('waiting');
      expect(game.players).toEqual([]);
      expect(game.gameId).toBeTruthy();
      expect(game.createdAt).toBeTruthy();
    });

    it('should create unique game IDs for different games', () => {
      const game1 = lobbyManager.createGame('Game 1', 2, 'heads-up');
      const game2 = lobbyManager.createGame('Game 2', 4, 'multi-table');
      
      expect(game1.gameId).not.toBe(game2.gameId);
    });

    it('should validate game creation parameters', () => {
      expect(() => lobbyManager.createGame('', 2, 'heads-up')).toThrow();
      expect(() => lobbyManager.createGame('Test', 0, 'heads-up')).toThrow();
      expect(() => lobbyManager.createGame('Test', 11, 'heads-up')).toThrow();
    });
  });

  describe('Player Management', () => {
    let testGame: LobbyGame;

    beforeEach(() => {
      testGame = lobbyManager.createGame('Test Game', 4, 'multi-table');
    });

    it('should allow players to join available games', () => {
      const result = lobbyManager.joinGame(testGame.gameId, 'player1', 'Alice');
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      const updatedGame = lobbyManager.getGame(testGame.gameId);
      expect(updatedGame?.playerCount).toBe(1);
      expect(updatedGame?.players).toHaveLength(1);
      expect(updatedGame?.players[0].name).toBe('Alice');
    });

    it('should prevent joining full games', () => {
      // Fill the game to capacity
      lobbyManager.joinGame(testGame.gameId, 'p1', 'Player 1');
      lobbyManager.joinGame(testGame.gameId, 'p2', 'Player 2');
      lobbyManager.joinGame(testGame.gameId, 'p3', 'Player 3');
      lobbyManager.joinGame(testGame.gameId, 'p4', 'Player 4');
      
      const result = lobbyManager.joinGame(testGame.gameId, 'p5', 'Player 5');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });

    it('should prevent duplicate player joins', () => {
      lobbyManager.joinGame(testGame.gameId, 'player1', 'Alice');
      const result = lobbyManager.joinGame(testGame.gameId, 'player1', 'Alice');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already');
    });

    it('should allow players to leave games', () => {
      lobbyManager.joinGame(testGame.gameId, 'player1', 'Alice');
      const result = lobbyManager.leaveGame(testGame.gameId, 'player1');
      
      expect(result.success).toBe(true);
      
      const updatedGame = lobbyManager.getGame(testGame.gameId);
      expect(updatedGame?.playerCount).toBe(0);
      expect(updatedGame?.players).toHaveLength(0);
    });
  });

  describe('Game Listing and Retrieval', () => {
    it('should return empty list when no games exist', () => {
      const games = lobbyManager.getGames();
      expect(games).toEqual([]);
    });

    it('should list all created games', () => {
      const game1 = lobbyManager.createGame('Game 1', 2, 'heads-up');
      const game2 = lobbyManager.createGame('Game 2', 4, 'multi-table');
      
      const games = lobbyManager.getGames();
      expect(games).toHaveLength(2);
      expect(games.map(g => g.gameId)).toContain(game1.gameId);
      expect(games.map(g => g.gameId)).toContain(game2.gameId);
    });

    it('should retrieve specific games by ID', () => {
      const game = lobbyManager.createGame('Test Game', 2, 'heads-up');
      const retrieved = lobbyManager.getGame(game.gameId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.gameId).toBe(game.gameId);
      expect(retrieved?.name).toBe('Test Game');
    });

    it('should return null for non-existent games', () => {
      const retrieved = lobbyManager.getGame('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Game Lifecycle', () => {
    it('should transition game status when enough players join', () => {
      const game = lobbyManager.createGame('Test Game', 2, 'heads-up');
      
      lobbyManager.joinGame(game.gameId, 'p1', 'Player 1');
      let updatedGame = lobbyManager.getGame(game.gameId);
      expect(updatedGame?.status).toBe('waiting');
      
      lobbyManager.joinGame(game.gameId, 'p2', 'Player 2');
      updatedGame = lobbyManager.getGame(game.gameId);
      expect(updatedGame?.status).toBe('playing');
    });

    it('should remove completed games from lobby', () => {
      const game = lobbyManager.createGame('Test Game', 2, 'heads-up');
      const removed = lobbyManager.removeGame(game.gameId);
      
      expect(removed).toBe(true);
      expect(lobbyManager.getGame(game.gameId)).toBeNull();
      expect(lobbyManager.getGames()).not.toContain(game);
    });

    it('should track total player count across all games', () => {
      const game1 = lobbyManager.createGame('Game 1', 4, 'multi-table');
      const game2 = lobbyManager.createGame('Game 2', 2, 'heads-up');
      
      lobbyManager.joinGame(game1.gameId, 'p1', 'Player 1');
      lobbyManager.joinGame(game1.gameId, 'p2', 'Player 2');
      lobbyManager.joinGame(game2.gameId, 'p3', 'Player 3');
      
      expect(lobbyManager.getPlayerCount()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent join operations safely', () => {
      const game = lobbyManager.createGame('Test Game', 2, 'heads-up');
      
      // Simulate concurrent joins to last slot
      const result1 = lobbyManager.joinGame(game.gameId, 'p1', 'Player 1');
      const result2 = lobbyManager.joinGame(game.gameId, 'p2', 'Player 2');
      const result3 = lobbyManager.joinGame(game.gameId, 'p3', 'Player 3');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(false);
      
      const finalGame = lobbyManager.getGame(game.gameId);
      expect(finalGame?.playerCount).toBe(2);
    });

    it('should handle leaving non-existent games gracefully', () => {
      const result = lobbyManager.leaveGame('non-existent-id', 'player1');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle removing non-existent games gracefully', () => {
      const result = lobbyManager.removeGame('non-existent-id');
      expect(result).toBe(false);
    });
  });
});