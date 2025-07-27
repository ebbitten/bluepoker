import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '../../../../../lib/game-store';
import { broadcaster } from '../../../../../lib/event-broadcaster';
import { requireAuth } from '../../../../../lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  console.log(`SSE request for game: ${gameId}`);
  console.log(`Games in store: ${gameStore.size()}`);
  
  // Authenticate the request (supports query param token for SSE)
  try {
    const user = await requireAuth(request);
    console.log(`Authenticated SSE request from user: ${user.username}`);
    
    // Check if game exists
    const gameState = gameStore.get(gameId);
    if (!gameState) {
      console.log(`Game ${gameId} not found in store`);
      console.log(`Available games:`, gameStore.getAllGameIds());
      return NextResponse.json({ 
        error: 'Game not found',
        gameId,
        availableGames: gameStore.size(),
        debug: true
      }, { status: 404 });
    }

    // Verify that the authenticated user is a player in this game
    const userPlayer = gameState.players.find(p => p.name === user.username);
    if (!userPlayer) {
      console.log(`User ${user.username} not a player in game ${gameId}`);
      return NextResponse.json(
        { error: 'You are not a player in this game' },
        { status: 403 }
      );
    }

    console.log(`Game ${gameId} found, setting up SSE connection for user ${user.username}`);
  } catch (error) {
    console.error('SSE authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication required for SSE connection' },
      { status: 401 }
    );
  }

  const connectionId = `conn-${Date.now()}-${Math.random()}`;
  
  // Get game state (we know it exists from auth check above)
  const gameState = gameStore.get(gameId);
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Add connection to broadcaster
        broadcaster.addConnection(gameId, connectionId, controller);

        // Send initial connection event
        const welcomeEvent = `id: ${Date.now()}\nevent: connected\ndata: ${JSON.stringify({ gameId, connectionId })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeEvent));

        // Send current game state
        const initialState = `id: ${Date.now()}\nevent: gameStateUpdate\ndata: ${JSON.stringify(gameState)}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialState));

        // Send immediate keep-alive to confirm stream is working
        const immediateKeepAlive = `id: ${Date.now()}\nevent: keepAlive\ndata: ${JSON.stringify({ timestamp: Date.now(), status: 'connected' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(immediateKeepAlive));

        // Set up keep-alive ping every 10 seconds (reduced from 30)
        const keepAliveInterval = setInterval(() => {
          try {
            const keepAlive = `id: ${Date.now()}\nevent: keepAlive\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            // Connection closed, clean up
            console.error('SSE keep-alive error:', error);
            clearInterval(keepAliveInterval);
            broadcaster.removeConnection(gameId, connectionId);
          }
        }, 10000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`SSE client disconnected: ${connectionId}`);
          clearInterval(keepAliveInterval);
          broadcaster.removeConnection(gameId, connectionId);
          try {
            controller.close();
          } catch (error) {
            // Controller already closed
          }
        });

        console.log(`SSE connection established: ${connectionId} for game ${gameId}`);
      } catch (error) {
        console.error('SSE stream setup error:', error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}