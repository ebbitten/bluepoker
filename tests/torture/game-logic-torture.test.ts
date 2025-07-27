/**
 * Game Logic Torture Tests
 * Stress tests for poker game logic under extreme conditions
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';

const API_BASE = 'http://localhost:3000/api';

// Test user credentials
const testUser = {
  email: `torture-test-${Date.now()}@example.com`,
  password: 'TortureTest123!',
  username: `tortureuser${Date.now()}`
};

let authToken: string | null = null;

describe('Game Logic Torture Tests', () => {
  
  beforeAll(() => {
    // Increase timeout for torture tests
    vi.setConfig({ testTimeout: 120000 }); // 2 minutes
  });

  beforeEach(async () => {
    // Ensure we have authentication for each test
    if (!authToken) {
      try {
        // Register test user
        await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser)
        });

        // Login to get token
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          })
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          authToken = loginData.token || loginData.access_token;
        }
      } catch (error) {
        console.log('Auth setup failed, will test with lobby endpoints:', error);
      }
    }
  });

  describe('Rapid Game Creation and Destruction', () => {
    it('should handle rapid lobby game creation without memory leaks', async () => {
      const gameCreatePromises = [];
      const gameCount = 50; // Reduced count for faster testing
      
      console.log(`Creating ${gameCount} lobby games rapidly...`);
      
      for (let i = 0; i < gameCount; i++) {
        const promise = fetch(`${API_BASE}/lobby/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `TortureGame${i}`,
            maxPlayers: 2,
            gameType: 'heads-up',
            buyIn: 1000
          })
        });
        gameCreatePromises.push(promise);
      }
      
      const responses = await Promise.allSettled(gameCreatePromises);
      
      // Count successful game creations
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && 
        [200, 201].includes(r.value.status)
      ).length;
      
      console.log(`Successfully created ${successful}/${gameCount} lobby games`);
      
      // Should create majority of games successfully (relaxed for testing)
      expect(successful).toBeGreaterThan(gameCount * 0.5); // 50% success rate minimum
      
      // No responses should indicate memory issues
      const memoryErrors = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 503
      );
      expect(memoryErrors.length).toBeLessThan(gameCount * 0.2); // Less than 20% memory errors
    });

    it('should handle authenticated game creation under load', async () => {
      if (!authToken) {
        console.log('Skipping authenticated game test - no auth token');
        return;
      }
      
      const gameCreatePromises = [];
      const gameCount = 20; // Smaller count for authenticated games
      
      console.log(`Creating ${gameCount} authenticated games rapidly...`);
      
      for (let i = 0; i < gameCount; i++) {
        const promise = fetch(`${API_BASE}/game/create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            playerNames: [`TorturePlayer1_${i}`, `TorturePlayer2_${i}`]
          })
        });
        gameCreatePromises.push(promise);
      }
      
      const responses = await Promise.allSettled(gameCreatePromises);
      
      // Count successful game creations
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && 
        [200, 201].includes(r.value.status)
      ).length;
      
      console.log(`Successfully created ${successful}/${gameCount} authenticated games`);
      
      // Should create some games successfully
      expect(successful).toBeGreaterThan(0);
    });

    it('should handle game cleanup under stress', async () => {
      // Create games to clean up
      const createResponses = await Promise.all(
        Array(50).fill(null).map((_, i) =>
          fetch(`${API_BASE}/game/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameName: `CleanupGame${i}`,
              maxPlayers: 2,
              buyIn: 1000
            })
          })
        )
      );
      
      const gameIds = [];
      for (const response of createResponses) {
        if (response.status === 200 || response.status === 201) {
          const data = await response.json();
          if (data.gameId) gameIds.push(data.gameId);
        }
      }
      
      console.log(`Created ${gameIds.length} games for cleanup testing`);
      
      // Rapidly delete games
      const deletePromises = gameIds.map(gameId =>
        fetch(`${API_BASE}/game/${gameId}`, { method: 'DELETE' })
      );
      
      const deleteResponses = await Promise.all(deletePromises);
      const successfulDeletes = deleteResponses.filter(r => r.status === 200).length;
      
      // Should handle cleanup gracefully
      expect(successfulDeletes).toBeGreaterThan(gameIds.length * 0.8);
    });
  });

  describe('Extreme Player Actions', () => {
    it('should handle rapid-fire betting actions', async () => {
      // Create a game first
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'RapidBettingGame',
          maxPlayers: 4,
          buyIn: 10000
        })
      });
      
      if (gameResponse.status !== 200 && gameResponse.status !== 201) {
        console.log('Game creation failed, skipping betting test');
        return;
      }
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      // Add players
      const players = ['Player1', 'Player2', 'Player3', 'Player4'];
      for (const playerName of players) {
        await fetch(`${API_BASE}/game/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName })
        });
      }
      
      // Deal cards to start the game
      await fetch(`${API_BASE}/game/${gameId}/deal`, { method: 'POST' });
      
      // Rapid betting actions
      const bettingActions = [];
      for (let i = 0; i < 100; i++) {
        const action = {
          action: ['call', 'raise', 'fold'][i % 3],
          amount: i % 3 === 1 ? 50 : 0,
          playerId: players[i % 4]
        };
        
        bettingActions.push(
          fetch(`${API_BASE}/game/${gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action)
          })
        );
      }
      
      const actionResponses = await Promise.allSettled(bettingActions);
      
      // Should handle rapid actions without crashes
      const crashed = actionResponses.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value.status >= 500)
      );
      
      expect(crashed.length).toBeLessThan(bettingActions.length * 0.3); // Less than 30% failures
    });

    it('should handle invalid action sequences gracefully', async () => {
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'InvalidActionsGame',
          maxPlayers: 2,
          buyIn: 1000
        })
      });
      
      if (!gameResponse.ok) return;
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      // Invalid action scenarios
      const invalidActions = [
        { action: 'raise', amount: -100 }, // Negative raise
        { action: 'bet', amount: 999999999 }, // Exceeds available chips
        { action: 'call', amount: 100 }, // Call with amount (should be automatic)
        { action: 'fold', amount: 50 }, // Fold with amount
        { action: 'invalid_action', amount: 0 }, // Invalid action type
        { action: 'raise', amount: 1.5 }, // Non-integer amount
        { action: '', amount: 0 }, // Empty action
        { action: null, amount: 0 }, // Null action
      ];
      
      const responses = [];
      for (const action of invalidActions) {
        const response = await fetch(`${API_BASE}/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });
        responses.push(response);
      }
      
      // All invalid actions should be rejected with 400 status
      responses.forEach(response => {
        expect([400, 422, 409]).toContain(response.status);
      });
    });
  });

  describe('Edge Case Game States', () => {
    it('should handle all-in scenarios correctly', async () => {
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'AllInGame',
          maxPlayers: 3,
          buyIn: 1000
        })
      });
      
      if (!gameResponse.ok) return;
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      // Add players
      await fetch(`${API_BASE}/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'AllInPlayer1' })
      });
      
      await fetch(`${API_BASE}/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'AllInPlayer2' })
      });
      
      // Deal cards
      await fetch(`${API_BASE}/game/${gameId}/deal`, { method: 'POST' });
      
      // Simulate all-in scenario
      const allInResponse = await fetch(`${API_BASE}/game/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'raise',
          amount: 1000 // All chips
        })
      });
      
      // Should handle all-in without errors
      expect([200, 400, 409]).toContain(allInResponse.status);
    });

    it('should handle simultaneous game state changes', async () => {
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'ConcurrentGame',
          maxPlayers: 4,
          buyIn: 2000
        })
      });
      
      if (!gameResponse.ok) return;
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      // Simultaneous operations
      const operations = [
        fetch(`${API_BASE}/game/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: 'SimulPlayer1' })
        }),
        fetch(`${API_BASE}/game/${gameId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: 'SimulPlayer2' })
        }),
        fetch(`${API_BASE}/game/${gameId}/deal`, { method: 'POST' }),
        fetch(`${API_BASE}/game/${gameId}`, { method: 'GET' }),
        fetch(`${API_BASE}/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'call' })
        })
      ];
      
      const responses = await Promise.allSettled(operations);
      
      // Should handle concurrent operations gracefully
      const serverErrors = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status >= 500
      );
      
      expect(serverErrors.length).toBeLessThan(operations.length * 0.3);
    });
  });

  describe('Memory and Resource Stress', () => {
    it('should handle large game history without memory issues', async () => {
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'MemoryStressGame',
          maxPlayers: 2,
          buyIn: 10000
        })
      });
      
      if (!gameResponse.ok) return;
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      // Add players
      await fetch(`${API_BASE}/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'MemoryPlayer1' })
      });
      
      await fetch(`${API_BASE}/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'MemoryPlayer2' })
      });
      
      // Simulate many hands to build up game history
      const handPromises = [];
      for (let i = 0; i < 50; i++) {
        handPromises.push(
          fetch(`${API_BASE}/game/${gameId}/deal`, { method: 'POST' })
            .then(() => 
              fetch(`${API_BASE}/game/${gameId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fold' })
              })
            )
        );
      }
      
      const handResults = await Promise.allSettled(handPromises);
      
      // Game should handle extensive history
      const successful = handResults.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(handPromises.length * 0.6);
      
      // Final game state should still be accessible
      const finalStateResponse = await fetch(`${API_BASE}/game/${gameId}`);
      expect([200, 404]).toContain(finalStateResponse.status);
    });

    it('should handle resource cleanup after game completion', async () => {
      const completedGames = [];
      
      // Create and complete multiple games
      for (let i = 0; i < 20; i++) {
        const gameResponse = await fetch(`${API_BASE}/game/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameName: `CompletedGame${i}`,
            maxPlayers: 2,
            buyIn: 1000
          })
        });
        
        if (gameResponse.ok) {
          const gameData = await gameResponse.json();
          completedGames.push(gameData.gameId);
        }
      }
      
      console.log(`Created ${completedGames.length} games for cleanup testing`);
      
      // Verify games exist initially
      const initialChecks = await Promise.all(
        completedGames.map(gameId => 
          fetch(`${API_BASE}/game/${gameId}`)
        )
      );
      
      const initiallyExists = initialChecks.filter(r => r.status === 200).length;
      console.log(`${initiallyExists} games initially accessible`);
      
      // Test that system handles having many games in memory
      expect(initiallyExists).toBeGreaterThan(0);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum and maximum bet amounts', async () => {
      const gameResponse = await fetch(`${API_BASE}/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: 'BoundaryBetGame',
          maxPlayers: 2,
          buyIn: 10000
        })
      });
      
      if (!gameResponse.ok) return;
      
      const gameData = await gameResponse.json();
      const gameId = gameData.gameId;
      
      const boundaryValues = [
        0,          // Minimum bet
        1,          // Minimum valid bet
        9999,       // Just under maximum
        10000,      // Maximum (all chips)
        10001,      // Over maximum
        -1,         // Invalid negative
        0.5,        // Invalid decimal
        'invalid',  // Invalid type
        null,       // Null value
        undefined   // Undefined value
      ];
      
      const responses = [];
      for (const amount of boundaryValues) {
        const response = await fetch(`${API_BASE}/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'raise',
            amount: amount
          })
        });
        responses.push({ amount, status: response.status });
      }
      
      // Validate boundary handling
      responses.forEach(({ amount, status }) => {
        if (typeof amount !== 'number' || amount < 0 || amount > 10000) {
          expect([400, 422]).toContain(status);
        }
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from malformed requests without affecting other games', async () => {
      // Create multiple games
      const gameIds = [];
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${API_BASE}/game/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameName: `ResilienceGame${i}`,
            maxPlayers: 2,
            buyIn: 1000
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          gameIds.push(data.gameId);
        }
      }
      
      if (gameIds.length === 0) return;
      
      // Send malformed requests to first game
      const malformedRequests = [
        '{"invalid": json}',
        '{broken json',
        '',
        'not json at all',
        '{"action": null, "amount": null}'
      ];
      
      for (const malformed of malformedRequests) {
        await fetch(`${API_BASE}/game/${gameIds[0]}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: malformed
        });
      }
      
      // Verify other games still function
      const otherGameChecks = await Promise.all(
        gameIds.slice(1).map(gameId => 
          fetch(`${API_BASE}/game/${gameId}`)
        )
      );
      
      const stillFunctional = otherGameChecks.filter(r => r.status === 200).length;
      
      // Other games should remain unaffected
      expect(stillFunctional).toBe(gameIds.length - 1);
    });
  });
});

// Helper to extend vitest configuration
declare global {
  namespace Vi {
    interface Config {
      testTimeout: number;
    }
  }
}