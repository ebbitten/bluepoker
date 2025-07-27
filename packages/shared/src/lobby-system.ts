/**
 * Lobby System for Multi-Game Management
 * Increment 5: Manages multiple poker games, player discovery, and matchmaking
 */

import { randomUUID } from 'crypto';

// Lobby Game Interface
export interface LobbyGame {
  gameId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
  gameType: 'heads-up' | 'multi-table';
  buyIn?: number;
}

// Lobby Manager Interface
export interface LobbyManager {
  createGame(name: string, maxPlayers: number, gameType: 'heads-up' | 'multi-table', buyIn?: number): LobbyGame;
  joinGame(gameId: string, playerId: string, playerName: string): { success: boolean; error?: string };
  leaveGame(gameId: string, playerId: string): { success: boolean; error?: string };
  getGames(): LobbyGame[];
  getGame(gameId: string): LobbyGame | null;
  removeGame(gameId: string): boolean;
  getPlayerCount(): number;
  updateGameStatus(gameId: string, status: 'waiting' | 'playing' | 'finished'): boolean;
  getTotalGames(): number;
}

// Event types for lobby updates
export interface LobbyEvent {
  type: 'gameCreated' | 'gameUpdated' | 'gameRemoved' | 'playerJoined' | 'playerLeft';
  gameId: string;
  data: LobbyGame | { playerId: string; playerName: string };
}

// In-memory lobby manager implementation
export class InMemoryLobbyManager implements LobbyManager {
  private games = new Map<string, LobbyGame>();
  private playerGameMap = new Map<string, string>(); // playerId -> gameId

  createGame(name: string, maxPlayers: number, gameType: 'heads-up' | 'multi-table', buyIn?: number): LobbyGame {
    // Validation
    if (!name || name.trim().length === 0) {
      throw new Error('Game name is required');
    }
    if (maxPlayers < 2 || maxPlayers > 10) {
      throw new Error('Max players must be between 2 and 10');
    }
    if (!['heads-up', 'multi-table'].includes(gameType)) {
      throw new Error('Invalid game type');
    }

    const gameId = randomUUID();
    const game: LobbyGame = {
      gameId,
      name: name.trim(),
      playerCount: 0,
      maxPlayers,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      players: [],
      gameType,
      buyIn
    };

    this.games.set(gameId, game);
    return { ...game }; // Return copy to prevent mutation
  }

  joinGame(gameId: string, playerId: string, playerName: string): { success: boolean; error?: string } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Validate player name
    if (!playerName || playerName.trim().length === 0) {
      return { success: false, error: 'Player name is required' };
    }

    // Check if game is full
    if (game.playerCount >= game.maxPlayers) {
      return { success: false, error: 'Game is full' };
    }

    // Check if game has already started
    if (game.status === 'playing' || game.status === 'finished') {
      return { success: false, error: 'Game has already started' };
    }

    // Check if player is already in this game
    const existingPlayer = game.players.find(p => p.id === playerId);
    if (existingPlayer) {
      return { success: false, error: 'Player already in this game' };
    }

    // Check if player is in another game
    const existingGameId = this.playerGameMap.get(playerId);
    if (existingGameId && existingGameId !== gameId) {
      return { success: false, error: 'Player already in another game' };
    }

    // Add player to game
    const player = {
      id: playerId,
      name: playerName.trim(),
      isReady: false
    };

    game.players.push(player);
    game.playerCount = game.players.length;
    this.playerGameMap.set(playerId, gameId);

    // Auto-start game if minimum players reached (for heads-up, start at 2)
    if (game.gameType === 'heads-up' && game.playerCount === 2) {
      game.status = 'playing';
    } else if (game.gameType === 'multi-table' && game.playerCount >= 2) {
      // For multi-table, could implement ready system or auto-start at certain threshold
      // For now, keep as waiting until manually started
    }

    return { success: true };
  }

  leaveGame(gameId: string, playerId: string): { success: boolean; error?: string } {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: 'Player not in this game' };
    }

    // Remove player from game
    game.players.splice(playerIndex, 1);
    game.playerCount = game.players.length;
    this.playerGameMap.delete(playerId);

    // Reset game status to waiting if it was playing but now has players left
    if (game.status === 'playing' && game.playerCount > 0) {
      game.status = 'waiting';
    }

    // Note: We keep empty games around - they can be manually removed later
    // This allows for better testing and explicit game lifecycle management

    return { success: true };
  }

  getGames(): LobbyGame[] {
    return Array.from(this.games.values()).map(game => ({ ...game })); // Return copies
  }

  getGame(gameId: string): LobbyGame | null {
    const game = this.games.get(gameId);
    return game ? { ...game } : null; // Return copy to prevent mutation
  }

  removeGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    // Remove all players from the game mapping
    game.players.forEach(player => {
      this.playerGameMap.delete(player.id);
    });

    return this.games.delete(gameId);
  }

  getPlayerCount(): number {
    return Array.from(this.games.values()).reduce((total, game) => total + game.playerCount, 0);
  }

  updateGameStatus(gameId: string, status: 'waiting' | 'playing' | 'finished'): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    game.status = status;

    // If game is finished, clean up after a delay (optional)
    if (status === 'finished') {
      // Could implement auto-cleanup after some time
    }

    return true;
  }

  // Utility methods for lobby management
  getGamesByStatus(status: 'waiting' | 'playing' | 'finished'): LobbyGame[] {
    return this.getGames().filter(game => game.status === status);
  }

  getAvailableGames(): LobbyGame[] {
    return this.getGames().filter(game => 
      game.status === 'waiting' && game.playerCount < game.maxPlayers
    );
  }

  getPlayerGame(playerId: string): LobbyGame | null {
    const gameId = this.playerGameMap.get(playerId);
    return gameId ? this.getGame(gameId) : null;
  }

  // Debug/admin methods
  getTotalGames(): number {
    return this.games.size;
  }

  clear(): void {
    this.games.clear();
    this.playerGameMap.clear();
  }
}

// Singleton instance for the application
let lobbyManagerInstance: LobbyManager | null = null;

export function getLobbyManager(): LobbyManager {
  if (!lobbyManagerInstance) {
    lobbyManagerInstance = new InMemoryLobbyManager();
  }
  return lobbyManagerInstance;
}

// For testing - allow injection of different implementation
export function setLobbyManager(manager: LobbyManager): void {
  lobbyManagerInstance = manager;
}

// Types and interfaces are already exported at their definitions above