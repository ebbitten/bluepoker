/**
 * Lobby Events SSE API
 * GET /api/lobby/events - Server-Sent Events stream for real-time lobby updates
 */

import { NextRequest } from 'next/server';
import { getLobbyManager } from '@bluepoker/shared';

export async function GET(request: NextRequest) {
  console.log('SSE request for lobby events');

  const lobbyManager = getLobbyManager();
  const connectionId = `lobby-conn-${Date.now()}-${Math.random()}`;
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Send initial connection event
        const welcomeEvent = `id: ${Date.now()}\nevent: connected\ndata: ${JSON.stringify({ connectionId, type: 'lobby' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeEvent));

        // Send current lobby state
        const games = lobbyManager.getGames();
        const initialState = `id: ${Date.now()}\nevent: lobbyState\ndata: ${JSON.stringify({ 
          games, 
          totalGames: lobbyManager.getTotalGames(),
          activePlayers: lobbyManager.getPlayerCount()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialState));

        // Send immediate keep-alive to confirm stream is working
        const immediateKeepAlive = `id: ${Date.now()}\nevent: keepAlive\ndata: ${JSON.stringify({ timestamp: Date.now(), status: 'connected' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(immediateKeepAlive));

        // Set up keep-alive ping every 15 seconds
        const keepAliveInterval = setInterval(() => {
          try {
            const keepAlive = `id: ${Date.now()}\nevent: keepAlive\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
            controller.enqueue(new TextEncoder().encode(keepAlive));
          } catch (error) {
            console.error('Lobby SSE keep-alive error:', error);
            clearInterval(keepAliveInterval);
          }
        }, 15000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`Lobby SSE client disconnected: ${connectionId}`);
          clearInterval(keepAliveInterval);
          try {
            controller.close();
          } catch (error) {
            // Controller already closed
          }
        });

        console.log(`Lobby SSE connection established: ${connectionId}`);
      } catch (error) {
        console.error('Lobby SSE stream setup error:', error);
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