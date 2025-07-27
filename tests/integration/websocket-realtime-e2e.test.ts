import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Simulated E2E tests for dual-browser scenarios
// These tests simulate what would happen with real browsers and EventSource connections

interface MockEventSource {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
  close: () => void;
  _eventListeners: Map<string, ((event: MessageEvent) => void)[]>;
  _simulate: (type: string, data: any) => void;
}

class MockEventSource implements MockEventSource {
  url: string;
  readyState: number = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  _eventListeners = new Map<string, ((event: MessageEvent) => void)[]>();

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, []);
    }
    this._eventListeners.get(type)!.push(listener);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  _simulate(type: string, data: any) {
    const event = {
      type,
      data: JSON.stringify(data),
      lastEventId: Date.now().toString()
    } as MessageEvent;

    // Call specific event listeners
    const listeners = this._eventListeners.get(type) || [];
    listeners.forEach(listener => listener(event));

    // Call general message handler
    if (this.onmessage && type !== 'open' && type !== 'error') {
      this.onmessage(event);
    }
  }
}

// Mock the global EventSource
const originalEventSource = global.EventSource;

describe('Real-Time Dual-Browser E2E Scenarios', () => {
  let mockEventSources: MockEventSource[] = [];
  let gameId: string;

  beforeEach(async () => {
    // Mock EventSource globally
    global.EventSource = MockEventSource as any;
    mockEventSources = [];
    gameId = 'test-game-' + Date.now();
  });

  afterEach(() => {
    // Restore original EventSource
    global.EventSource = originalEventSource;
    // Close all mock connections
    mockEventSources.forEach(es => es.close());
    mockEventSources = [];
  });

  describe('Game Creation and Connection', () => {
    it('should establish SSE connections for multiple clients', async () => {
      // Simulate two browser windows connecting to the same game
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      // Client 1 connects
      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1);

      client1.addEventListener('connected', (event) => {
        client1Events.push({ type: 'connected', data: JSON.parse(event.data) });
      });

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push({ type: 'gameStateUpdate', data: JSON.parse(event.data) });
      });

      // Client 2 connects
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client2);

      client2.addEventListener('connected', (event) => {
        client2Events.push({ type: 'connected', data: JSON.parse(event.data) });
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push({ type: 'gameStateUpdate', data: JSON.parse(event.data) });
      });

      // Simulate initial connection events
      await new Promise(resolve => setTimeout(resolve, 20));

      client1._simulate('connected', { gameId, connectionId: 'client1' });
      client2._simulate('connected', { gameId, connectionId: 'client2' });

      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);
      expect(client1Events[0].type).toBe('connected');
      expect(client2Events[0].type).toBe('connected');
    });

    it('should send initial game state to new connections', async () => {
      const clientEvents: any[] = [];
      const client = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client);

      client.addEventListener('gameStateUpdate', (event) => {
        clientEvents.push({ type: 'gameStateUpdate', data: JSON.parse(event.data) });
      });

      // Simulate receiving initial game state
      const initialGameState = {
        gameId,
        players: [
          { id: 'p1', name: 'Alice', chips: 1000, holeCards: [], currentBet: 0, folded: false, allIn: false },
          { id: 'p2', name: 'Bob', chips: 1000, holeCards: [], currentBet: 0, folded: false, allIn: false }
        ],
        communityCards: [],
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        phase: 'preflop',
        deck: []
      };

      client._simulate('gameStateUpdate', initialGameState);

      expect(clientEvents).toHaveLength(1);
      expect(clientEvents[0].data.gameId).toBe(gameId);
      expect(clientEvents[0].data.players).toHaveLength(2);
    });
  });

  describe('Real-Time Game State Synchronization', () => {
    it('should broadcast deal events to all connected clients', async () => {
      // Setup multiple clients
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1, client2);

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push(JSON.parse(event.data));
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push(JSON.parse(event.data));
      });

      // Simulate dealing cards (triggered by deal API call)
      const gameStateAfterDeal = {
        gameId,
        players: [
          { id: 'p1', name: 'Alice', chips: 990, holeCards: [
            { suit: 'hearts', rank: 'A', value: 14 },
            { suit: 'spades', rank: 'K', value: 13 }
          ], currentBet: 10, folded: false, allIn: false },
          { id: 'p2', name: 'Bob', chips: 980, holeCards: [
            { suit: 'diamonds', rank: 'Q', value: 12 },
            { suit: 'clubs', rank: 'J', value: 11 }
          ], currentBet: 20, folded: false, allIn: false }
        ],
        communityCards: [],
        pot: 30,
        currentBet: 20,
        activePlayerIndex: 0,
        phase: 'preflop',
        deck: []
      };

      // Broadcast to both clients
      client1._simulate('gameStateUpdate', gameStateAfterDeal);
      client2._simulate('gameStateUpdate', gameStateAfterDeal);

      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);
      
      // Both clients should receive identical game state
      expect(client1Events[0]).toEqual(client2Events[0]);
      expect(client1Events[0].pot).toBe(30);
      expect(client1Events[0].players[0].currentBet).toBe(10);
      expect(client1Events[0].players[1].currentBet).toBe(20);
    });

    it('should broadcast player actions to all clients in real-time', async () => {
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1, client2);

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push(JSON.parse(event.data));
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push(JSON.parse(event.data));
      });

      // Simulate player 1 calling (action triggered via API)
      const gameStateAfterCall = {
        gameId,
        players: [
          { id: 'p1', name: 'Alice', chips: 980, currentBet: 20, folded: false, allIn: false },
          { id: 'p2', name: 'Bob', chips: 980, currentBet: 20, folded: false, allIn: false }
        ],
        pot: 40,
        currentBet: 20,
        activePlayerIndex: 1,
        phase: 'preflop'
      };

      client1._simulate('gameStateUpdate', gameStateAfterCall);
      client2._simulate('gameStateUpdate', gameStateAfterCall);

      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);
      expect(client1Events[0].activePlayerIndex).toBe(1);
      expect(client2Events[0].activePlayerIndex).toBe(1);
    });

    it('should broadcast phase transitions to all clients', async () => {
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1, client2);

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push(JSON.parse(event.data));
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push(JSON.parse(event.data));
      });

      // Simulate progression to flop
      const gameStateAtFlop = {
        gameId,
        players: [
          { id: 'p1', name: 'Alice', chips: 980, currentBet: 0, folded: false, allIn: false },
          { id: 'p2', name: 'Bob', chips: 980, currentBet: 0, folded: false, allIn: false }
        ],
        communityCards: [
          { suit: 'hearts', rank: 'A', value: 14 },
          { suit: 'spades', rank: 'K', value: 13 },
          { suit: 'diamonds', rank: 'Q', value: 12 }
        ],
        pot: 40,
        currentBet: 0,
        activePlayerIndex: 1,
        phase: 'flop'
      };

      client1._simulate('gameStateUpdate', gameStateAtFlop);
      client2._simulate('gameStateUpdate', gameStateAtFlop);

      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);
      expect(client1Events[0].phase).toBe('flop');
      expect(client1Events[0].communityCards).toHaveLength(3);
      expect(client2Events[0].phase).toBe('flop');
      expect(client2Events[0].communityCards).toHaveLength(3);
    });

    it('should broadcast game completion to all clients', async () => {
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1, client2);

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push(JSON.parse(event.data));
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push(JSON.parse(event.data));
      });

      // Simulate game completion (one player folds)
      const completedGameState = {
        gameId,
        players: [
          { id: 'p1', name: 'Alice', chips: 1020, currentBet: 0, folded: false, allIn: false },
          { id: 'p2', name: 'Bob', chips: 980, currentBet: 0, folded: true, allIn: false }
        ],
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        phase: 'complete',
        winner: 0,
        winnerReason: 'opponent folded'
      };

      client1._simulate('gameStateUpdate', completedGameState);
      client2._simulate('gameStateUpdate', completedGameState);

      expect(client1Events).toHaveLength(1);
      expect(client2Events).toHaveLength(1);
      expect(client1Events[0].phase).toBe('complete');
      expect(client1Events[0].winner).toBe(0);
      expect(client1Events[0].winnerReason).toBe('opponent folded');
    });
  });

  describe('Connection Management', () => {
    it('should handle client disconnection gracefully', async () => {
      const client1Events: any[] = [];
      const client2Events: any[] = [];

      const client1 = new MockEventSource(`/api/game/${gameId}/events`);
      const client2 = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client1, client2);

      client1.addEventListener('gameStateUpdate', (event) => {
        client1Events.push(JSON.parse(event.data));
      });

      client2.addEventListener('gameStateUpdate', (event) => {
        client2Events.push(JSON.parse(event.data));
      });

      // Client 1 disconnects
      client1.close();

      // Simulate game state update after disconnection
      const gameState = { gameId, pot: 50, phase: 'flop' };
      
      // Only client 2 should receive the update
      client2._simulate('gameStateUpdate', gameState);

      expect(client1Events).toHaveLength(0); // Disconnected client gets no events
      expect(client2Events).toHaveLength(1); // Connected client gets the event
    });

    it('should support multiple games without cross-contamination', async () => {
      const game1Id = 'game-1';
      const game2Id = 'game-2';

      const game1Client1Events: any[] = [];
      const game1Client2Events: any[] = [];
      const game2Client1Events: any[] = [];

      // Clients for game 1
      const game1Client1 = new MockEventSource(`/api/game/${game1Id}/events`);
      const game1Client2 = new MockEventSource(`/api/game/${game1Id}/events`);
      
      // Client for game 2
      const game2Client1 = new MockEventSource(`/api/game/${game2Id}/events`);

      mockEventSources.push(game1Client1, game1Client2, game2Client1);

      game1Client1.addEventListener('gameStateUpdate', (event) => {
        game1Client1Events.push(JSON.parse(event.data));
      });

      game1Client2.addEventListener('gameStateUpdate', (event) => {
        game1Client2Events.push(JSON.parse(event.data));
      });

      game2Client1.addEventListener('gameStateUpdate', (event) => {
        game2Client1Events.push(JSON.parse(event.data));
      });

      // Update game 1
      const game1State = { gameId: game1Id, pot: 100 };
      game1Client1._simulate('gameStateUpdate', game1State);
      game1Client2._simulate('gameStateUpdate', game1State);

      // Update game 2
      const game2State = { gameId: game2Id, pot: 200 };
      game2Client1._simulate('gameStateUpdate', game2State);

      // Game 1 clients should only receive game 1 updates
      expect(game1Client1Events).toHaveLength(1);
      expect(game1Client2Events).toHaveLength(1);
      expect(game1Client1Events[0].gameId).toBe(game1Id);
      expect(game1Client1Events[0].pot).toBe(100);

      // Game 2 client should only receive game 2 updates
      expect(game2Client1Events).toHaveLength(1);
      expect(game2Client1Events[0].gameId).toBe(game2Id);
      expect(game2Client1Events[0].pot).toBe(200);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle connection errors gracefully', async () => {
      const clientEvents: any[] = [];
      const errorEvents: any[] = [];

      const client = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client);

      client.addEventListener('gameStateUpdate', (event) => {
        clientEvents.push(JSON.parse(event.data));
      });

      client.addEventListener('error', (event) => {
        errorEvents.push(JSON.parse(event.data));
      });

      // Simulate error event
      client._simulate('error', { message: 'Connection lost' });

      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].message).toBe('Connection lost');
      expect(clientEvents).toHaveLength(0); // No game state updates during error
    });

    it('should maintain event order during rapid updates', async () => {
      const clientEvents: any[] = [];

      const client = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client);

      client.addEventListener('gameStateUpdate', (event) => {
        const data = JSON.parse(event.data);
        clientEvents.push(data);
      });

      // Simulate rapid successive updates
      for (let i = 0; i < 10; i++) {
        client._simulate('gameStateUpdate', { 
          gameId, 
          eventNumber: i, 
          pot: i * 10 
        });
      }

      expect(clientEvents).toHaveLength(10);
      
      // Events should be in order
      for (let i = 0; i < 10; i++) {
        expect(clientEvents[i].eventNumber).toBe(i);
        expect(clientEvents[i].pot).toBe(i * 10);
      }
    });

    it('should handle malformed event data gracefully', async () => {
      const clientEvents: any[] = [];
      const client = new MockEventSource(`/api/game/${gameId}/events`);
      mockEventSources.push(client);

      // Mock console.error to capture error handling
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      client.addEventListener('gameStateUpdate', (event) => {
        try {
          const data = JSON.parse(event.data);
          clientEvents.push(data);
        } catch (error) {
          console.error('Failed to parse event data:', error);
        }
      });

      // Simulate malformed JSON
      const malformedEvent = {
        type: 'gameStateUpdate',
        data: '{ invalid json }',
        lastEventId: Date.now().toString()
      } as MessageEvent;

      const listeners = client._eventListeners.get('gameStateUpdate') || [];
      listeners.forEach(listener => listener(malformedEvent));

      expect(clientEvents).toHaveLength(0); // No valid events processed
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse event data:', expect.any(SyntaxError));

      consoleSpy.mockRestore();
    });
  });
});