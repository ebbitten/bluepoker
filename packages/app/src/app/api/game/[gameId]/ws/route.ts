import { NextRequest } from 'next/server';
import { gameStore } from '../../../../../lib/game-store';

// WebSocket connection info endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    
    // Validate game exists
    const gameState = gameStore.get(gameId);
    if (!gameState) {
      return new Response('Game not found', { status: 404 });
    }
    
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade');
    if (upgrade === 'websocket') {
      // For Next.js App Router, direct WebSocket upgrade isn't supported
      // Return connection instructions
      return new Response(JSON.stringify({
        error: 'Direct WebSocket upgrade not supported in Next.js App Router',
        alternatives: {
          sse: `/api/game/${gameId}/events`,
          polling: `/api/game/${gameId}`,
          message: 'Use Server-Sent Events for real-time updates'
        }
      }), {
        status: 426,
        headers: {
          'Content-Type': 'application/json',
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
    }
    
    // Return WebSocket connection information
    return new Response(JSON.stringify({
      gameId,
      status: 'WebSocket info endpoint',
      realTimeOptions: {
        sse: `/api/game/${gameId}/events`,
        polling: `/api/game/${gameId}`,
        websocket: 'Not supported in this configuration'
      },
      currentGameState: gameState
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('WebSocket route error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

