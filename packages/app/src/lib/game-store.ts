/**
 * In-memory game state storage with persistence integration
 * Maintains in-memory state for performance while providing persistence for durability
 */

import { GameState } from '@bluepoker/shared';
import { gamePersistenceService } from './persistence-service';

// Use global to persist across Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __gameStore: Map<string, GameState> | undefined;
}

function getGameStore(): Map<string, GameState> {
  if (!global.__gameStore) {
    global.__gameStore = new Map<string, GameState>();
  }
  return global.__gameStore;
}

export const gameStore = {
  get: (gameId: string): GameState | undefined => {
    const store = getGameStore();
    const result = store.get(gameId);
    return result;
  },

  set: (gameId: string, gameState: GameState): void => {
    const store = getGameStore();
    store.set(gameId, gameState);
    
    // Auto-persist game state changes
    gamePersistenceService.autoPerist(gameId, gameState);
  },

  has: (gameId: string): boolean => {
    const store = getGameStore();
    return store.has(gameId);
  },

  delete: (gameId: string): boolean => {
    const store = getGameStore();
    const result = store.delete(gameId);
    return result;
  },

  clear: (): void => {
    const store = getGameStore();
    store.clear();
  },

  size: (): number => {
    const store = getGameStore();
    return store.size;
  },

  getAllGameIds: (): string[] => {
    const store = getGameStore();
    return Array.from(store.keys());
  }
};