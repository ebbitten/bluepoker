import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '../../../../lib/game-store';
import { broadcaster } from '../../../../lib/event-broadcaster';
import { createGame } from '@bluepoker/shared';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  const sseTest = {
    timestamp: Date.now(),
    gameId: gameId || 'none provided',
    tests: {} as Record<string, { status: string; details?: string }>,
    broadcaster: {
      connectionCount: 0,
      connections: [] as string[]
    }
  };

  let testGameId = gameId;

  // Test 1: Create a test game if no gameId provided
  if (!testGameId) {
    try {
      const testGame = createGame(`sse-test-${Date.now()}`, ['SSETest1', 'SSETest2']);
      gameStore.set(testGame.gameId, testGame);
      testGameId = testGame.gameId;
      sseTest.tests.gameCreation = { 
        status: 'ok', 
        details: `Created test game: ${testGameId}` 
      };
    } catch (error) {
      sseTest.tests.gameCreation = { 
        status: 'error', 
        details: error instanceof Error ? error.message : 'Failed to create test game' 
      };
      return NextResponse.json(sseTest);
    }
  }

  // Test 2: Check if game exists in store
  const game = gameStore.get(testGameId!);
  if (game) {
    sseTest.tests.gameRetrieval = { 
      status: 'ok', 
      details: `Game found with ${game.players.length} players` 
    };
  } else {
    sseTest.tests.gameRetrieval = { 
      status: 'error', 
      details: 'Game not found in store' 
    };
  }

  // Test 3: Check broadcaster status
  try {
    const connectionCount = broadcaster.getConnectionCount(testGameId!);
    sseTest.broadcaster.connectionCount = connectionCount;
    sseTest.tests.broadcaster = { 
      status: 'ok', 
      details: `Broadcaster available, ${connectionCount} connections` 
    };
  } catch (error) {
    sseTest.tests.broadcaster = { 
      status: 'error', 
      details: error instanceof Error ? error.message : 'Broadcaster error' 
    };
  }

  // Test 4: Simulate SSE endpoint URL construction
  const sseUrl = `/api/game/${testGameId}/events`;
  sseTest.tests.sseUrlConstruction = { 
    status: 'ok', 
    details: `SSE URL: ${sseUrl}` 
  };

  // Test 5: Check if we can broadcast a test event
  try {
    broadcaster.broadcast(testGameId!, {
      type: 'test',
      data: { message: 'SSE test broadcast', timestamp: Date.now() }
    });
    sseTest.tests.broadcastTest = { 
      status: 'ok', 
      details: 'Test broadcast sent successfully' 
    };
  } catch (error) {
    sseTest.tests.broadcastTest = { 
      status: 'error', 
      details: error instanceof Error ? error.message : 'Broadcast failed' 
    };
  }

  // Overall status
  const allTestsOk = Object.values(sseTest.tests).every(test => test.status === 'ok');
  
  return NextResponse.json({
    ...sseTest,
    status: allTestsOk ? 'ready' : 'issues_detected',
    recommendations: allTestsOk ? 
      ['SSE endpoint should work correctly'] : 
      ['Check failing tests above', 'Verify game exists before SSE connection', 'Check server logs for errors']
  });
}