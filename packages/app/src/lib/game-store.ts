/**
 * In-memory game state storage
 * In production, this would be replaced with a database
 */

import { GameState } from '@bluepoker/shared';

// Global game storage
const games = new Map<string, GameState>();

export const gameStore = {
  get: (gameId: string): GameState | undefined => {
    return games.get(gameId);
  },

  set: (gameId: string, gameState: GameState): void => {
    games.set(gameId, gameState);
  },

  has: (gameId: string): boolean => {
    return games.has(gameId);
  },

  delete: (gameId: string): boolean => {
    return games.delete(gameId);
  },

  clear: (): void => {
    games.clear();
  },

  size: (): number => {
    return games.size;
  }
};