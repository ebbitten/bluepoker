/**
 * Test utilities and helpers for BluPoker testing
 */

// Common test data factories
export const TestFactories = {
  /**
   * Create a mock card object
   */
  createCard: (suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', rank: string) => ({
    suit,
    rank,
    value: rank === 'A' ? 14 : rank === 'K' ? 13 : rank === 'Q' ? 12 : rank === 'J' ? 11 : parseInt(rank)
  }),

  /**
   * Create a full deck of cards
   */
  createDeck: () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    return suits.flatMap(suit => 
      ranks.map(rank => TestFactories.createCard(suit, rank))
    );
  },

  /**
   * Create test user data
   */
  createUser: (overrides = {}) => ({
    id: 'test-user-123',
    nickname: 'TestPlayer',
    chips: 1000,
    ...overrides
  }),

  /**
   * Create test game state
   */
  createGameState: (overrides = {}) => ({
    id: 'test-game-123',
    players: [],
    pot: 0,
    communityCards: [],
    currentPlayer: null,
    phase: 'waiting',
    ...overrides
  })
};

// Test assertion helpers
export const TestAssertions = {
  /**
   * Assert that a deck is properly shuffled (not in original order)
   */
  isShuffled: (deck: any[]) => {
    const originalOrder = TestFactories.createDeck();
    return !deck.every((card, index) => 
      card.suit === originalOrder[index].suit && 
      card.rank === originalOrder[index].rank
    );
  },

  /**
   * Assert that a deck contains exactly 52 unique cards
   */
  isValidDeck: (deck: any[]) => {
    if (deck.length !== 52) return false;
    
    const cardStrings = deck.map(card => `${card.rank}-${card.suit}`);
    const uniqueCards = new Set(cardStrings);
    
    return uniqueCards.size === 52;
  },

  /**
   * Assert that cards are distinct (no duplicates)
   */
  areDistinct: (cards: any[]) => {
    const cardStrings = cards.map(card => `${card.rank}-${card.suit}`);
    const uniqueCards = new Set(cardStrings);
    
    return uniqueCards.size === cards.length;
  }
};

// Mock utilities
export const TestMocks = {
  /**
   * Mock fetch for API testing
   */
  createMockFetch: (responses: Record<string, any>) => {
    return jest.fn().mockImplementation((url: string) => {
      const response = responses[url] || { status: 404, json: () => Promise.resolve({}) };
      return Promise.resolve({
        ok: response.status < 400,
        status: response.status,
        json: () => Promise.resolve(response.json || response.data || {}),
        text: () => Promise.resolve(response.text || '')
      });
    });
  },

  /**
   * Mock WebSocket for real-time testing
   */
  createMockWebSocket: () => {
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      readyState: 1 // OPEN
    };
    
    return mockWs;
  }
};

// Test lifecycle helpers
export const TestLifecycle = {
  /**
   * Setup test environment
   */
  setup: async () => {
    // Clear any test data
    // Reset mocks
    // Initialize test database
  },

  /**
   * Cleanup after tests
   */
  teardown: async () => {
    // Clean up test data
    // Close database connections
    // Reset global state
  },

  /**
   * Wait for async operations to complete
   */
  waitFor: (condition: () => boolean, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }
};

// Performance testing helpers
export const TestPerformance = {
  /**
   * Measure execution time of a function
   */
  measureTime: async (fn: () => Promise<any> | any) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },

  /**
   * Assert that function executes within time limit
   */
  assertExecutionTime: async (fn: () => Promise<any> | any, maxTime: number) => {
    const time = await TestPerformance.measureTime(fn);
    if (time > maxTime) {
      throw new Error(`Function took ${time}ms, expected < ${maxTime}ms`);
    }
    return time;
  }
};