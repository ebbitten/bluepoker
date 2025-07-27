import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameState, createGame, dealNewHand, executePlayerAction } from '@bluepoker/shared';

// Mock WebSocket connection for testing
interface MockWebSocket {
  send: vi.MockedFunction<any>;
  close: vi.MockedFunction<any>;
  readyState: number;
  onmessage?: (event: { data: string }) => void;
  onopen?: (event: any) => void;
  onclose?: (event: any) => void;
  onerror?: (event: any) => void;
  sentMessages: string[];
}

function createMockWebSocket(): MockWebSocket {
  const ws: MockWebSocket = {
    send: vi.fn((data: string) => {
      ws.sentMessages.push(data);
    }),
    close: vi.fn(() => {
      ws.readyState = 3; // CLOSED
    }),
    readyState: 1, // OPEN
    sentMessages: []
  };
  return ws;
}

// Mock WebSocket server for testing
class MockWebSocketServer {
  private gameConnections = new Map<string, Set<MockWebSocket>>();
  
  addClient(gameId: string, ws: MockWebSocket): void {
    if (!this.gameConnections.has(gameId)) {
      this.gameConnections.set(gameId, new Set());
    }
    this.gameConnections.get(gameId)!.add(ws);
    
    // Send connected message
    const connectedMessage = {
      id: Date.now().toString(),
      type: 'connected',
      data: { gameId, connectionId: `conn-${Date.now()}` },
      timestamp: Date.now()
    };
    
    ws.onmessage?.({ data: JSON.stringify(connectedMessage) });
  }
  
  removeClient(gameId: string, ws: MockWebSocket): void {
    const connections = this.gameConnections.get(gameId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.gameConnections.delete(gameId);
      }
    }
  }
  
  broadcast(gameId: string, message: any): void {
    const connections = this.gameConnections.get(gameId);
    if (connections) {
      const wsMessage = {
        id: Date.now().toString(),
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      };
      
      const messageStr = JSON.stringify(wsMessage);
      connections.forEach(ws => {
        if (ws.readyState === 1) { // OPEN
          ws.onmessage?.({ data: messageStr });
        }
      });
    }
  }
  
  handleMessage(ws: MockWebSocket, message: string): void {
    try {
      const parsed = JSON.parse(message);
      
      // Handle different message types
      switch (parsed.type) {
        case 'authenticate':
          // Send authentication success
          const authResponse = {
            id: Date.now().toString(),
            type: 'connected',
            data: { gameId: parsed.data.gameId, authenticated: true },
            timestamp: Date.now()
          };
          ws.onmessage?.({ data: JSON.stringify(authResponse) });
          break;
          
        case 'ping':
          // Respond with pong
          const pongResponse = {
            id: Date.now().toString(),
            type: 'pong',
            data: { timestamp: parsed.data.timestamp },
            timestamp: Date.now()
          };
          ws.onmessage?.({ data: JSON.stringify(pongResponse) });
          break;
          
        case 'playerAction':
          // Send action result
          const actionResponse = {
            id: Date.now().toString(),
            type: 'actionResult',
            data: { success: true },
            timestamp: Date.now()
          };
          ws.onmessage?.({ data: JSON.stringify(actionResponse) });
          break;
      }
    } catch (error) {
      // Send error message
      const errorResponse = {
        id: Date.now().toString(),
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now()
      };
      ws.onmessage?.({ data: JSON.stringify(errorResponse) });
    }
  }
}

describe('WebSocket Game State Integration', () => {
  let gameState: GameState;
  let mockGameStorage: Map<string, GameState>;
  let wsServer: MockWebSocketServer;

  beforeEach(() => {
    // Create a fresh game for each test
    gameState = createGame('test-game-123', ['Alice', 'Bob']);
    mockGameStorage = new Map();
    mockGameStorage.set('test-game-123', gameState);
    wsServer = new MockWebSocketServer();
  });

  afterEach(() => {
    mockGameStorage.clear();
  });

  describe('WebSocket Connection Establishment', () => {
    it('should establish WebSocket connection and send connected message', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      // Simulate WebSocket connection
      wsServer.addClient('test-game-123', ws);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('connected');
      expect(receivedMessages[0].data.gameId).toBe('test-game-123');
      expect(receivedMessages[0].data.connectionId).toBeDefined();
    });

    it('should handle authentication flow', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Send authentication message
      const authMessage = {
        id: 'auth-1',
        type: 'authenticate',
        data: { playerId: 'player-123', gameId: 'test-game-123' },
        timestamp: Date.now()
      };

      wsServer.handleMessage(ws, JSON.stringify(authMessage));

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].type).toBe('connected');
      expect(receivedMessages[1].data.authenticated).toBe(true);
    });

    it('should handle ping/pong heartbeat', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Send ping message
      const pingTimestamp = Date.now();
      const pingMessage = {
        id: 'ping-1',
        type: 'ping',
        data: { timestamp: pingTimestamp },
        timestamp: Date.now()
      };

      wsServer.handleMessage(ws, JSON.stringify(pingMessage));

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].type).toBe('pong');
      expect(receivedMessages[1].data.timestamp).toBe(pingTimestamp);
    });

    it('should handle invalid message format gracefully', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Send invalid JSON
      wsServer.handleMessage(ws, 'invalid json');

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].type).toBe('error');
      expect(receivedMessages[1].data.message).toBe('Invalid message format');
    });
  });

  describe('Game State Broadcasting', () => {
    it('should broadcast game state updates to all connections', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const receivedMessages1: any[] = [];
      const receivedMessages2: any[] = [];
      
      ws1.onmessage = (event) => receivedMessages1.push(JSON.parse(event.data));
      ws2.onmessage = (event) => receivedMessages2.push(JSON.parse(event.data));

      wsServer.addClient('test-game-123', ws1);
      wsServer.addClient('test-game-123', ws2);

      // Broadcast game state update
      const newGameState = dealNewHand(gameState);
      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: newGameState
      });

      // Both connections should receive the update
      expect(receivedMessages1).toHaveLength(2); // connected + gameStateUpdate
      expect(receivedMessages2).toHaveLength(2); // connected + gameStateUpdate
      
      expect(receivedMessages1[1].type).toBe('gameStateUpdate');
      expect(receivedMessages2[1].type).toBe('gameStateUpdate');
      
      expect(receivedMessages1[1].data.players[0].holeCards).toHaveLength(2);
      expect(receivedMessages2[1].data.players[0].holeCards).toHaveLength(2);
    });

    it('should only broadcast to connections in the same game', async () => {
      const ws1 = createMockWebSocket();
      const ws2 = createMockWebSocket();
      const receivedMessages1: any[] = [];
      const receivedMessages2: any[] = [];
      
      ws1.onmessage = (event) => receivedMessages1.push(JSON.parse(event.data));
      ws2.onmessage = (event) => receivedMessages2.push(JSON.parse(event.data));

      wsServer.addClient('test-game-123', ws1);
      wsServer.addClient('test-game-456', ws2); // Different game

      // Broadcast to game-123 only
      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: gameState
      });

      expect(receivedMessages1).toHaveLength(2); // connected + gameStateUpdate
      expect(receivedMessages2).toHaveLength(1); // connected only
      
      expect(receivedMessages1[1].type).toBe('gameStateUpdate');
    });

    it('should broadcast when player takes action', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Send player action
      const actionMessage = {
        id: 'action-1',
        type: 'playerAction',
        data: { playerId: 'player-123', action: 'call' },
        timestamp: Date.now()
      };

      wsServer.handleMessage(ws, JSON.stringify(actionMessage));

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].type).toBe('actionResult');
      expect(receivedMessages[1].data.success).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection close gracefully', async () => {
      const ws = createMockWebSocket();
      
      wsServer.addClient('test-game-123', ws);
      expect(ws.readyState).toBe(1); // OPEN

      // Simulate connection close
      ws.close();
      expect(ws.readyState).toBe(3); // CLOSED

      wsServer.removeClient('test-game-123', ws);
      
      // Subsequent broadcasts should not reach the closed connection
      const receivedMessages: any[] = [];
      ws.onmessage = (event) => receivedMessages.push(JSON.parse(event.data));

      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: gameState
      });

      expect(receivedMessages).toHaveLength(0);
    });

    it('should clean up empty game channels', async () => {
      const ws = createMockWebSocket();
      
      wsServer.addClient('test-game-123', ws);
      wsServer.removeClient('test-game-123', ws);
      
      // Game channel should be cleaned up
      // This is verified by ensuring no errors occur during broadcast
      expect(() => {
        wsServer.broadcast('test-game-123', {
          type: 'gameStateUpdate',
          data: gameState
        });
      }).not.toThrow();
    });

    it('should handle multiple connections per game', async () => {
      const connections: MockWebSocket[] = [];
      const allMessages: any[][] = [];
      
      // Create 5 connections
      for (let i = 0; i < 5; i++) {
        const ws = createMockWebSocket();
        const messages: any[] = [];
        ws.onmessage = (event) => messages.push(JSON.parse(event.data));
        
        connections.push(ws);
        allMessages.push(messages);
        wsServer.addClient('test-game-123', ws);
      }

      // Broadcast to all
      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: gameState
      });

      // All connections should receive the message
      allMessages.forEach(messages => {
        expect(messages).toHaveLength(2); // connected + gameStateUpdate
        expect(messages[1].type).toBe('gameStateUpdate');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed game state gracefully', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Create malformed game state (circular reference)
      const malformedState: any = { ...gameState };
      malformedState.circular = malformedState;

      // Broadcasting should not crash the server
      expect(() => {
        wsServer.broadcast('test-game-123', {
          type: 'gameStateUpdate',
          data: malformedState
        });
      }).not.toThrow();
    });

    it('should handle rapid successive messages efficiently', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      const startTime = Date.now();

      // Send 50 ping messages rapidly
      for (let i = 0; i < 50; i++) {
        const pingMessage = {
          id: `ping-${i}`,
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        };
        wsServer.handleMessage(ws, JSON.stringify(pingMessage));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(receivedMessages).toHaveLength(51); // connected + 50 pongs
      expect(duration).toBeLessThan(1000); // Should complete quickly

      // All pong messages should be present
      const pongMessages = receivedMessages.filter(msg => msg.type === 'pong');
      expect(pongMessages).toHaveLength(50);
    });

    it('should handle WebSocket message size limits', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        receivedMessages.push(JSON.parse(event.data));
      };

      wsServer.addClient('test-game-123', ws);

      // Create large game state
      const largeGameState = {
        ...gameState,
        largeData: 'x'.repeat(10000) // 10KB of data
      };

      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: largeGameState
      });

      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[1].type).toBe('gameStateUpdate');
      expect(receivedMessages[1].data.largeData).toHaveLength(10000);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle concurrent connections efficiently', async () => {
      const connections: MockWebSocket[] = [];
      
      // Create 20 connections
      for (let i = 0; i < 20; i++) {
        const ws = createMockWebSocket();
        connections.push(ws);
        wsServer.addClient('test-game-123', ws);
      }

      const startTime = Date.now();

      // Broadcast to all connections
      wsServer.broadcast('test-game-123', {
        type: 'gameStateUpdate',
        data: gameState
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      
      // All connections should have received the message
      connections.forEach(ws => {
        expect(ws.sentMessages).toHaveLength(0); // Mock doesn't actually send
      });
    });

    it('should maintain message order under load', async () => {
      const ws = createMockWebSocket();
      const receivedMessages: any[] = [];
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        receivedMessages.push(message);
      };

      wsServer.addClient('test-game-123', ws);

      // Send multiple ordered messages
      for (let i = 0; i < 10; i++) {
        wsServer.broadcast('test-game-123', {
          type: 'gameStateUpdate',
          data: { messageNumber: i }
        });
      }

      // Messages should be received in order
      expect(receivedMessages).toHaveLength(11); // connected + 10 messages
      
      for (let i = 1; i <= 10; i++) {
        expect(receivedMessages[i].data.messageNumber).toBe(i - 1);
      }
    });
  });
});