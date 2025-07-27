/**
 * WebSocket Connection Manager for Real-Time Poker Game Communication
 */

import WebSocket from 'ws';
import { 
  WebSocketConnection, 
  WebSocketManager, 
  ServerMessage, 
  createWebSocketMessage
} from '@bluepoker/shared';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 1000; // 1 second
const RATE_LIMIT_MAX_MESSAGES = 10; // 10 messages per second per connection

interface RateLimitInfo {
  count: number;
  windowStart: number;
}

export class PokerWebSocketManager implements WebSocketManager {
  private static instance: PokerWebSocketManager;
  
  // Connection storage: gameId -> Map<connectionId, connection>
  private gameConnections = new Map<string, Map<string, WebSocketConnection>>();
  
  // Reverse lookup: connectionId -> connection
  private connectionsByConnectionId = new Map<string, WebSocketConnection>();
  
  // Rate limiting: connectionId -> rate limit info
  private rateLimits = new Map<string, RateLimitInfo>();
  
  // Connection health monitoring
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  private constructor() {
    this.startHeartbeat();
  }
  
  public static getInstance(): PokerWebSocketManager {
    if (!PokerWebSocketManager.instance) {
      PokerWebSocketManager.instance = new PokerWebSocketManager();
    }
    return PokerWebSocketManager.instance;
  }
  
  addConnection(gameId: string, connection: WebSocketConnection): void {
    console.log(`Adding WebSocket connection ${connection.id} to game ${gameId}`);
    
    // Add to game connections
    if (!this.gameConnections.has(gameId)) {
      this.gameConnections.set(gameId, new Map());
    }
    this.gameConnections.get(gameId)!.set(connection.id, connection);
    
    // Add to reverse lookup
    this.connectionsByConnectionId.set(connection.id, connection);
    
    // Initialize rate limiting
    this.rateLimits.set(connection.id, {
      count: 0,
      windowStart: Date.now()
    });
    
    // Set up WebSocket event handlers
    this.setupWebSocketHandlers(connection);
    
    console.log(`Connection count for game ${gameId}: ${this.getConnectionCount(gameId)}`);
  }
  
  removeConnection(gameId: string, connectionId: string): void {
    console.log(`Removing WebSocket connection ${connectionId} from game ${gameId}`);
    
    // Remove from game connections
    const gameConns = this.gameConnections.get(gameId);
    if (gameConns) {
      gameConns.delete(connectionId);
      if (gameConns.size === 0) {
        this.gameConnections.delete(gameId);
        console.log(`Cleaned up empty game channel: ${gameId}`);
      }
    }
    
    // Remove from reverse lookup
    this.connectionsByConnectionId.delete(connectionId);
    
    // Remove rate limiting
    this.rateLimits.delete(connectionId);
    
    console.log(`Connection count for game ${gameId}: ${this.getConnectionCount(gameId)}`);
  }
  
  broadcast(gameId: string, message: ServerMessage): void {
    const gameConns = this.gameConnections.get(gameId);
    if (!gameConns || gameConns.size === 0) {
      console.log(`No connections to broadcast to for game ${gameId}`);
      return;
    }
    
    const wsMessage = createWebSocketMessage(message.type, message.data);
    const messageStr = this.safeStringify(wsMessage);
    
    if (!messageStr) {
      console.error(`Failed to serialize broadcast message for game ${gameId}`);
      return;
    }
    
    console.log(`Broadcasting ${message.type} to ${gameConns.size} connections in game ${gameId}`);
    
    // Send to all active connections
    const deadConnections: string[] = [];
    
    gameConns.forEach((connection, connectionId) => {
      if (this.isConnectionAlive(connection)) {
        try {
          connection.ws.send(messageStr);
          connection.lastActivity = new Date();
        } catch (error) {
          console.error(`Failed to send message to connection ${connectionId}:`, error);
          deadConnections.push(connectionId);
        }
      } else {
        deadConnections.push(connectionId);
      }
    });
    
    // Clean up dead connections
    deadConnections.forEach(connectionId => {
      this.removeConnection(gameId, connectionId);
    });
  }
  
  sendToConnection(connectionId: string, message: ServerMessage): void {
    const connection = this.connectionsByConnectionId.get(connectionId);
    if (!connection) {
      console.log(`Connection ${connectionId} not found for direct message`);
      return;
    }
    
    if (!this.isConnectionAlive(connection)) {
      console.log(`Connection ${connectionId} is not alive, removing`);
      this.removeConnection(connection.gameId, connectionId);
      return;
    }
    
    const wsMessage = createWebSocketMessage(message.type, message.data);
    const messageStr = this.safeStringify(wsMessage);
    
    if (!messageStr) {
      console.error(`Failed to serialize message for connection ${connectionId}`);
      return;
    }
    
    try {
      connection.ws.send(messageStr);
      connection.lastActivity = new Date();
      console.log(`Sent ${message.type} to connection ${connectionId}`);
    } catch (error) {
      console.error(`Failed to send message to connection ${connectionId}:`, error);
      this.removeConnection(connection.gameId, connectionId);
    }
  }
  
  authenticateConnection(connectionId: string, playerId: string): boolean {
    const connection = this.connectionsByConnectionId.get(connectionId);
    if (!connection) {
      console.log(`Connection ${connectionId} not found for authentication`);
      return false;
    }
    
    connection.playerId = playerId;
    connection.authenticated = true;
    connection.lastActivity = new Date();
    
    console.log(`Authenticated connection ${connectionId} as player ${playerId}`);
    return true;
  }
  
  getConnectionCount(gameId: string): number {
    return this.gameConnections.get(gameId)?.size || 0;
  }
  
  cleanup(): void {
    console.log('Cleaning up WebSocket manager');
    
    // Close all connections
    this.connectionsByConnectionId.forEach((connection, connectionId) => {
      if (this.isConnectionAlive(connection)) {
        try {
          connection.ws.close(1000, 'Server shutdown');
        } catch (error) {
          console.error(`Error closing connection ${connectionId}:`, error);
        }
      }
    });
    
    // Clear all data structures
    this.gameConnections.clear();
    this.connectionsByConnectionId.clear();
    this.rateLimits.clear();
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    console.log('WebSocket manager cleanup complete');
  }
  
  // Rate limiting check
  isRateLimited(connectionId: string): boolean {
    const rateLimit = this.rateLimits.get(connectionId);
    if (!rateLimit) return false;
    
    const now = Date.now();
    
    // Reset window if enough time has passed
    if (now - rateLimit.windowStart >= RATE_LIMIT_WINDOW) {
      rateLimit.count = 0;
      rateLimit.windowStart = now;
    }
    
    // Check if over limit
    if (rateLimit.count >= RATE_LIMIT_MAX_MESSAGES) {
      return true;
    }
    
    // Increment counter
    rateLimit.count++;
    return false;
  }
  
  // Connection health check
  private isConnectionAlive(connection: WebSocketConnection): boolean {
    return connection.ws.readyState === WebSocket.OPEN;
  }
  
  // Safe JSON stringification with circular reference handling
  private safeStringify(obj: unknown): string | null {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.error('JSON stringify error:', error);
      
      // Try to create an error message instead
      try {
        const errorMessage = createWebSocketMessage('error', {
          message: 'Failed to serialize game state'
        });
        return JSON.stringify(errorMessage);
      } catch (fallbackError) {
        console.error('Failed to create fallback error message:', fallbackError);
        return null;
      }
    }
  }
  
  // Set up WebSocket event handlers for a connection
  private setupWebSocketHandlers(connection: WebSocketConnection): void {
    const ws = connection.ws;
    
    ws.on('close', (code: number, reason: string) => {
      console.log(`WebSocket connection ${connection.id} closed: ${code} ${reason}`);
      this.removeConnection(connection.gameId, connection.id);
    });
    
    ws.on('error', (error: Error) => {
      console.error(`WebSocket connection ${connection.id} error:`, error);
      this.removeConnection(connection.gameId, connection.id);
    });
    
    ws.on('pong', () => {
      connection.lastActivity = new Date();
    });
  }
  
  // Heartbeat mechanism to detect dead connections
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const deadConnections: Array<{ gameId: string; connectionId: string }> = [];
      
      this.connectionsByConnectionId.forEach((connection, connectionId) => {
        const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();
        
        if (timeSinceLastActivity > this.HEARTBEAT_INTERVAL * 2) {
          // Connection is stale
          deadConnections.push({ gameId: connection.gameId, connectionId });
        } else if (this.isConnectionAlive(connection)) {
          // Send ping to active connections
          try {
            connection.ws.ping();
          } catch (error) {
            console.error(`Failed to ping connection ${connectionId}:`, error);
            deadConnections.push({ gameId: connection.gameId, connectionId });
          }
        }
      });
      
      // Clean up dead connections
      deadConnections.forEach(({ gameId, connectionId }) => {
        console.log(`Removing stale connection ${connectionId} from game ${gameId}`);
        this.removeConnection(gameId, connectionId);
      });
      
      if (deadConnections.length > 0) {
        console.log(`Heartbeat cleaned up ${deadConnections.length} stale connections`);
      }
    }, this.HEARTBEAT_INTERVAL);
  }
  
  // Get all connections for a game (for debugging)
  getGameConnections(gameId: string): WebSocketConnection[] {
    const gameConns = this.gameConnections.get(gameId);
    return gameConns ? Array.from(gameConns.values()) : [];
  }
  
  // Get total connection count across all games
  getTotalConnectionCount(): number {
    return this.connectionsByConnectionId.size;
  }
  
  // Get all active game IDs
  getActiveGameIds(): string[] {
    return Array.from(this.gameConnections.keys());
  }
}

// Export singleton instance
export const wsManager = PokerWebSocketManager.getInstance();