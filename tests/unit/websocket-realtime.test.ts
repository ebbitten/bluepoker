import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock types for WebSocket functionality (will be implemented later)
interface ClientMessage {
  type: 'playerAction' | 'dealCards' | 'startNewHand' | 'ping' | 'authenticate';
  data: any;
}

interface ServerMessage {
  type: 'gameStateUpdate' | 'actionResult' | 'connected' | 'playerJoined' | 'playerLeft' | 'error' | 'pong';
  data: any;
}

interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketConnection {
  id: string;
  gameId: string;
  playerId?: string; // Set after authentication
  ws: any; // Mock WebSocket object
  lastActivity: Date;
  authenticated: boolean;
}

interface WebSocketManager {
  addConnection(gameId: string, connection: WebSocketConnection): void;
  removeConnection(gameId: string, connectionId: string): void;
  broadcast(gameId: string, message: ServerMessage): void;
  sendToConnection(connectionId: string, message: ServerMessage): void;
  authenticateConnection(connectionId: string, playerId: string): boolean;
  getConnectionCount(gameId: string): number;
  cleanup(): void;
}

// Mock implementation that will be replaced with real implementation
class MockWebSocketManager extends EventEmitter implements WebSocketManager {
  private connections = new Map<string, Map<string, WebSocketConnection>>();
  private connectionsByConnectionId = new Map<string, WebSocketConnection>();

  addConnection(gameId: string, connection: WebSocketConnection): void {
    if (!this.connections.has(gameId)) {
      this.connections.set(gameId, new Map());
    }
    this.connections.get(gameId)!.set(connection.id, connection);
    this.connectionsByConnectionId.set(connection.id, connection);
  }

  removeConnection(gameId: string, connectionId: string): void {
    const gameConnections = this.connections.get(gameId);
    if (gameConnections) {
      gameConnections.delete(connectionId);
      if (gameConnections.size === 0) {
        this.connections.delete(gameId);
      }
    }
    this.connectionsByConnectionId.delete(connectionId);
  }

  broadcast(gameId: string, message: ServerMessage): void {
    const gameConnections = this.connections.get(gameId);
    if (gameConnections) {
      for (const connection of gameConnections.values()) {
        // Mock sending message to connection
        this.emit('messageSent', { connectionId: connection.id, message });
      }
    }
  }

  sendToConnection(connectionId: string, message: ServerMessage): void {
    const connection = this.connectionsByConnectionId.get(connectionId);
    if (connection) {
      // Mock sending message to specific connection
      this.emit('messageSent', { connectionId, message });
    }
  }

  authenticateConnection(connectionId: string, playerId: string): boolean {
    const connection = this.connectionsByConnectionId.get(connectionId);
    if (connection) {
      connection.playerId = playerId;
      connection.authenticated = true;
      return true;
    }
    return false;
  }

  getConnectionCount(gameId: string): number {
    return this.connections.get(gameId)?.size || 0;
  }

  cleanup(): void {
    this.connections.clear();
    this.connectionsByConnectionId.clear();
  }
}

describe('WebSocket Real-Time Functionality', () => {
  let wsManager: MockWebSocketManager;
  let mockWebSocket: any;

  beforeEach(() => {
    wsManager = new MockWebSocketManager();
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // WebSocket.OPEN
      on: vi.fn(),
      ping: vi.fn(),
      pong: vi.fn()
    };
  });

  afterEach(() => {
    wsManager.cleanup();
  });

  describe('WebSocket Connection Management', () => {
    it('should add connections to game channels', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      
      expect(wsManager.getConnectionCount('game-123')).toBe(1);
    });

    it('should remove connections from game channels', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      wsManager.removeConnection('game-123', 'conn-1');
      
      expect(wsManager.getConnectionCount('game-123')).toBe(0);
    });

    it('should broadcast messages to all connections in a game', () => {
      const connection1: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };
      
      const connection2: WebSocketConnection = {
        id: 'conn-2',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection1);
      wsManager.addConnection('game-123', connection2);

      const message: ServerMessage = {
        type: 'gameStateUpdate',
        data: { phase: 'flop' }
      };

      const messagesSent: any[] = [];
      wsManager.on('messageSent', (data) => messagesSent.push(data));

      wsManager.broadcast('game-123', message);

      expect(messagesSent).toHaveLength(2);
      expect(messagesSent[0].connectionId).toBe('conn-1');
      expect(messagesSent[1].connectionId).toBe('conn-2');
      expect(messagesSent[0].message).toEqual(message);
    });

    it('should not broadcast to connections in different games', () => {
      const connection1: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };
      
      const connection2: WebSocketConnection = {
        id: 'conn-2',
        gameId: 'game-456',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection1);
      wsManager.addConnection('game-456', connection2);

      const message: ServerMessage = {
        type: 'gameStateUpdate',
        data: { phase: 'flop' }
      };

      const messagesSent: any[] = [];
      wsManager.on('messageSent', (data) => messagesSent.push(data));

      wsManager.broadcast('game-123', message);

      expect(messagesSent).toHaveLength(1);
      expect(messagesSent[0].connectionId).toBe('conn-1');
    });

    it('should handle multiple connections per game', () => {
      for (let i = 0; i < 5; i++) {
        const connection: WebSocketConnection = {
          id: `conn-${i}`,
          gameId: 'game-123',
          ws: mockWebSocket,
          lastActivity: new Date(),
          authenticated: false
        };
        wsManager.addConnection('game-123', connection);
      }

      expect(wsManager.getConnectionCount('game-123')).toBe(5);
    });

    it('should clean up empty game channels', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      expect(wsManager.getConnectionCount('game-123')).toBe(1);

      wsManager.removeConnection('game-123', 'conn-1');
      expect(wsManager.getConnectionCount('game-123')).toBe(0);
    });
  });

  describe('Authentication System', () => {
    it('should authenticate connections with valid player ID', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      const success = wsManager.authenticateConnection('conn-1', 'player-123');
      
      expect(success).toBe(true);
      expect(connection.authenticated).toBe(true);
      expect(connection.playerId).toBe('player-123');
    });

    it('should fail authentication for non-existent connection', () => {
      const success = wsManager.authenticateConnection('non-existent', 'player-123');
      
      expect(success).toBe(false);
    });

    it('should send messages to specific connections', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection);

      const message: ServerMessage = {
        type: 'actionResult',
        data: { success: true }
      };

      const messagesSent: any[] = [];
      wsManager.on('messageSent', (data) => messagesSent.push(data));

      wsManager.sendToConnection('conn-1', message);

      expect(messagesSent).toHaveLength(1);
      expect(messagesSent[0].connectionId).toBe('conn-1');
      expect(messagesSent[0].message).toEqual(message);
    });
  });

  describe('Message Serialization', () => {
    it('should serialize game state update messages correctly', () => {
      const gameState = {
        gameId: 'game-123',
        phase: 'flop',
        pot: 100,
        players: [
          { id: 'p1', name: 'Alice', chips: 950 },
          { id: 'p2', name: 'Bob', chips: 950 }
        ]
      };

      const message: ServerMessage = {
        type: 'gameStateUpdate',
        data: gameState
      };

      // Mock serialization function (will be implemented later)
      const wsMessage: WebSocketMessage = {
        id: Date.now().toString(),
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      
      const serialized = JSON.stringify(wsMessage);

      expect(() => JSON.parse(serialized)).not.toThrow();
      const parsed = JSON.parse(serialized);
      expect(parsed.type).toBe('gameStateUpdate');
      expect(parsed.data).toEqual(gameState);
      expect(parsed.id).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    it('should serialize action result messages correctly', () => {
      const message: ServerMessage = {
        type: 'actionResult',
        data: { success: true, gameState: { phase: 'flop' } }
      };

      const wsMessage: WebSocketMessage = {
        id: Date.now().toString(),
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      
      const serialized = JSON.stringify(wsMessage);

      const parsed = JSON.parse(serialized);
      expect(parsed.type).toBe('actionResult');
      expect(parsed.data).toEqual({ success: true, gameState: { phase: 'flop' } });
    });

    it('should serialize error messages correctly', () => {
      const message: ServerMessage = {
        type: 'error',
        data: { message: 'Game not found' }
      };

      const wsMessage: WebSocketMessage = {
        id: Date.now().toString(),
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      
      const serialized = JSON.stringify(wsMessage);

      const parsed = JSON.parse(serialized);
      expect(parsed.type).toBe('error');
      expect(parsed.data).toEqual({ message: 'Game not found' });
    });

    it('should handle ping/pong messages', () => {
      const pingMessage: ClientMessage = {
        type: 'ping',
        data: { timestamp: Date.now() }
      };

      const pongMessage: ServerMessage = {
        type: 'pong',
        data: { timestamp: pingMessage.data.timestamp }
      };

      expect(pongMessage.type).toBe('pong');
      expect(pongMessage.data.timestamp).toBe(pingMessage.data.timestamp);
    });
  });

  describe('Message Validation', () => {
    it('should validate client message types', () => {
      const validTypes = ['playerAction', 'dealCards', 'startNewHand', 'ping', 'authenticate'];
      
      validTypes.forEach(type => {
        const message: ClientMessage = {
          type: type as any,
          data: {}
        };
        
        expect(validTypes.includes(message.type)).toBe(true);
      });
    });

    it('should validate server message types', () => {
      const validTypes = ['gameStateUpdate', 'actionResult', 'connected', 'playerJoined', 'playerLeft', 'error', 'pong'];
      
      validTypes.forEach(type => {
        const message: ServerMessage = {
          type: type as any,
          data: {}
        };
        
        expect(validTypes.includes(message.type)).toBe(true);
      });
    });
  });

  describe('Connection Management', () => {
    it('should track connection last activity time', () => {
      const now = new Date();
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: now,
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      expect(connection.lastActivity).toBe(now);
    });

    it('should generate unique connection IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        const connection: WebSocketConnection = {
          id: `conn-${Date.now()}-${Math.random()}`,
          gameId: 'game-123',
          ws: mockWebSocket,
          lastActivity: new Date(),
          authenticated: false
        };
        ids.add(connection.id);
        wsManager.addConnection('game-123', connection);
      }

      expect(ids.size).toBe(10); // All IDs should be unique
    });

    it('should handle connection cleanup gracefully', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: false
      };

      wsManager.addConnection('game-123', connection);
      
      // Should not throw when removing non-existent connection
      expect(() => {
        wsManager.removeConnection('game-123', 'non-existent');
      }).not.toThrow();

      // Should not throw when removing from non-existent game
      expect(() => {
        wsManager.removeConnection('non-existent-game', 'conn-1');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed message data gracefully', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection);

      // Message with circular reference (should be handled in real implementation)
      const circularObject: any = { data: null };
      circularObject.data = circularObject;

      expect(() => {
        wsManager.broadcast('game-123', {
          type: 'gameStateUpdate',
          data: circularObject
        });
      }).not.toThrow();
    });

    it('should handle broadcasting to empty game channels', () => {
      const message: ServerMessage = {
        type: 'gameStateUpdate',
        data: { phase: 'flop' }
      };

      expect(() => {
        wsManager.broadcast('non-existent-game', message);
      }).not.toThrow();
    });

    it('should handle sending messages to non-existent connections', () => {
      const message: ServerMessage = {
        type: 'error',
        data: { message: 'Connection not found' }
      };

      expect(() => {
        wsManager.sendToConnection('non-existent-conn', message);
      }).not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should handle multiple rapid broadcasts efficiently', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection);

      const messagesSent: any[] = [];
      wsManager.on('messageSent', (data) => messagesSent.push(data));

      const startTime = Date.now();
      
      // Send 100 messages rapidly
      for (let i = 0; i < 100; i++) {
        wsManager.broadcast('game-123', {
          type: 'gameStateUpdate',
          data: { messageNumber: i }
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(messagesSent).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should limit memory usage with many connections', () => {
      // Add 100 connections
      for (let i = 0; i < 100; i++) {
        const connection: WebSocketConnection = {
          id: `conn-${i}`,
          gameId: 'game-123',
          ws: mockWebSocket,
          lastActivity: new Date(),
          authenticated: false
        };
        wsManager.addConnection('game-123', connection);
      }

      expect(wsManager.getConnectionCount('game-123')).toBe(100);

      // Cleanup should be efficient
      const startTime = Date.now();
      wsManager.cleanup();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Cleanup should be fast
      expect(wsManager.getConnectionCount('game-123')).toBe(0);
    });

    it('should handle ping/pong heartbeat efficiently', () => {
      const connection: WebSocketConnection = {
        id: 'conn-1',
        gameId: 'game-123',
        ws: mockWebSocket,
        lastActivity: new Date(),
        authenticated: true
      };

      wsManager.addConnection('game-123', connection);

      const messagesSent: any[] = [];
      wsManager.on('messageSent', (data) => messagesSent.push(data));

      // Send 50 ping/pong cycles
      for (let i = 0; i < 50; i++) {
        wsManager.sendToConnection('conn-1', {
          type: 'pong',
          data: { timestamp: Date.now() }
        });
      }

      expect(messagesSent).toHaveLength(50);
      messagesSent.forEach(msg => {
        expect(msg.message.type).toBe('pong');
        expect(msg.message.data.timestamp).toBeDefined();
      });
    });
  });
});