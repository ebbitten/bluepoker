import { NextResponse } from 'next/server';
import { gameStore } from '../../../../lib/game-store';

export async function GET() {
  const health = {
    timestamp: Date.now(),
    server: 'running',
    endpoints: {} as Record<string, { status: string; details?: string }>,
    gameStore: {
      activeGames: gameStore.size(),
      games: [] as string[]
    }
  };

  // Test basic endpoints internally
  try {
    // Test if we can access game store
    health.gameStore.games = gameStore.getAllGameIds();
    health.endpoints.gameStore = { status: 'ok' };
  } catch (error) {
    health.endpoints.gameStore = { 
      status: 'error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Test if we can create a deck (tests shared package)
  try {
    const { createDeck } = await import('@bluepoker/shared');
    const deck = createDeck();
    health.endpoints.sharedPackage = { 
      status: deck.length === 52 ? 'ok' : 'error',
      details: `deck has ${deck.length} cards`
    };
  } catch (error) {
    health.endpoints.sharedPackage = { 
      status: 'error', 
      details: error instanceof Error ? error.message : 'Failed to import shared package' 
    };
  }

  // Test game creation workflow
  try {
    const { createGame } = await import('@bluepoker/shared');
    const testGame = createGame('health-check', ['Test1', 'Test2']);
    health.endpoints.gameCreation = { 
      status: testGame.players.length === 2 ? 'ok' : 'error',
      details: `created game with ${testGame.players.length} players`
    };
  } catch (error) {
    health.endpoints.gameCreation = { 
      status: 'error', 
      details: error instanceof Error ? error.message : 'Failed to create test game' 
    };
  }

  // Overall health status
  const allEndpointsOk = Object.values(health.endpoints).every(ep => ep.status === 'ok');
  
  return NextResponse.json({
    ...health,
    status: allEndpointsOk ? 'healthy' : 'degraded'
  });
}