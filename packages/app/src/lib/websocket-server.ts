/**
 * WebSocket Server for Real-Time Poker Communication
 * Runs alongside Next.js server to handle WebSocket connections
 */

import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import next from 'next';
import { 
  createWebSocketConnection,
  handleWebSocketMessage 
} from './websocket-handlers';
import { wsManager } from './websocket-manager';
import { gameStore } from './game-store';
import { createConnectedMessage, createErrorMessage } from '@bluepoker/shared';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

export async function startWebSocketServer() {
  try {
    await app.prepare();
    
    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    });
    
    // Create WebSocket server
    const wss = new WebSocketServer({
      server,
      verifyClient: (info: { req: IncomingMessage & { gameId?: string } }) => {
        // Extract gameId from URL path
        const url = info.req.url;
        const gameIdMatch = url?.match(/\/api\/game\/([^\/]+)\/ws/);
        
        if (!gameIdMatch) {
          console.log('WebSocket connection rejected: invalid path');
          return false;
        }
        
        const gameId = gameIdMatch[1];
        
        // Verify game exists
        const gameExists = gameStore.has(gameId);
        if (!gameExists) {
          console.log(`WebSocket connection rejected: game ${gameId} not found`);
          return false;
        }
        
        // Store gameId for later use
        (info.req as IncomingMessage & { gameId: string }).gameId = gameId;
        return true;
      }
    });
    
    // Handle WebSocket connections
    wss.on('connection', (ws: WebSocket, request: IncomingMessage & { gameId: string }) => {
      const gameId = request.gameId;
      
      console.log(`New WebSocket connection for game ${gameId}`);
      
      // Create connection object
      const connection = createWebSocketConnection(gameId, ws);
      
      // Add to connection manager
      wsManager.addConnection(gameId, connection);
      
      // Send initial connected message
      const connectedMsg = createConnectedMessage(gameId, connection.id);
      wsManager.sendToConnection(connection.id, connectedMsg);
      
      // Handle incoming messages
      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const message = data.toString();
          handleWebSocketMessage(ws, connection, message);
        } catch (error) {
          console.error(`Error handling message from ${connection.id}:`, error);
          const errorMsg = createErrorMessage('Invalid message format');
          wsManager.sendToConnection(connection.id, errorMsg);
        }
      });
      
      // Handle connection close
      ws.on('close', (code: number, reason: Buffer) => {
        console.log(`WebSocket connection ${connection.id} closed: ${code} ${reason.toString()}`);
        wsManager.removeConnection(gameId, connection.id);
      });
      
      // Handle connection errors
      ws.on('error', (error: Error) => {
        console.error(`WebSocket connection ${connection.id} error:`, error);
        wsManager.removeConnection(gameId, connection.id);
      });
    });
    
    // Handle server errors
    wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
    
    // Start the server
    server.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket server ready for connections`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      wsManager.cleanup();
      server.close(() => {
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      wsManager.cleanup();
      server.close(() => {
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start WebSocket server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startWebSocketServer();
}