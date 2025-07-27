/**
 * Phase 5: Data Recovery and Failure Simulation Testing
 * Tests system behavior during database failures and recovery scenarios
 */

import { describe, test, expect, beforeEach } from 'vitest';

// Helper function to simulate database connectivity issues
async function testDatabaseConnectivity() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const healthData = await response.json();
    return {
      connected: response.ok && healthData.database?.connected,
      responseTime: healthData.database?.responseTime,
      status: healthData.status
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      status: 'error'
    };
  }
}

// Helper function to create test game
async function createTestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`RecoveryPlayer1${suffix}`, `RecoveryPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Game creation failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Helper function to get game state
async function getGameState(gameId: string) {
  const response = await fetch(`http://localhost:3000/api/game/${gameId}`);
  if (!response.ok) {
    throw new Error(`Failed to get game state: ${response.status}`);
  }
  return await response.json();
}

// Helper function to perform player action
async function performPlayerAction(gameId: string, playerId: string, action: string, amount?: number) {
  const body: any = { playerId, action };
  if (amount !== undefined) {
    body.amount = amount;
  }
  
  const response = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? await response.json() : null,
    error: !response.ok ? await response.text() : null
  };
}

describe('Phase 5: Data Recovery and Failure Simulation', () => {
  describe('Database Connectivity Testing', () => {
    test('Database health monitoring', async () => {
      const healthCheck = await testDatabaseConnectivity();
      
      console.log('Database connectivity test:', healthCheck);
      
      // Database should be connected for recovery tests
      expect(healthCheck.connected).toBe(true);
      expect(healthCheck.status).toBe('ok');
      
      if (healthCheck.responseTime) {
        const responseTime = parseInt(healthCheck.responseTime.replace('ms', ''));
        expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      }
    });

    test('Database connection timeout handling', async () => {
      console.log('Testing database connection timeout handling...');
      
      // Test with very short timeout by making rapid requests
      const rapidRequests = 20;
      const results = [];
      
      for (let i = 0; i < rapidRequests; i++) {
        const start = Date.now();
        const health = await testDatabaseConnectivity();
        const duration = Date.now() - start;
        
        results.push({
          connected: health.connected,
          duration,
          status: health.status
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const successfulConnections = results.filter(r => r.connected).length;
      
      console.log(`Database timeout test results:`);
      console.log(`  Average response time: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Successful connections: ${successfulConnections}/${rapidRequests}`);
      
      // Should maintain reasonable connection rate even under pressure
      expect(successfulConnections).toBeGreaterThan(rapidRequests * 0.8);
    });
  });

  describe('Game State Persistence and Recovery', () => {
    test('Game state consistency during high load', async () => {
      console.log('Testing game state consistency...');
      
      // Create a game and establish baseline state
      const game = await createTestGame('_consistency');
      const gameId = game.gameId;
      
      // Deal cards to establish game state
      const dealResponse = await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(dealResponse.ok).toBe(true);
      const dealtGame = await dealResponse.json();
      const initialState = dealtGame.gameState;
      
      // Verify initial state is valid
      expect(initialState.phase).toBe('preflop');
      expect(initialState.pot).toBeGreaterThan(0);
      expect(initialState.players).toHaveLength(2);
      
      // Make multiple rapid state queries to test consistency
      const stateQueries = Array(10).fill(0).map(() => getGameState(gameId));
      const states = await Promise.all(stateQueries);
      
      // All states should be identical
      states.forEach((state, index) => {
        expect(state.phase).toBe(initialState.phase);
        expect(state.pot).toBe(initialState.pot);
        expect(state.players[0].chips).toBe(initialState.players[0].chips);
        expect(state.players[1].chips).toBe(initialState.players[1].chips);
      });
      
      console.log('Game state consistency verified across multiple queries');
    });

    test('Transaction integrity during concurrent actions', async () => {
      console.log('Testing transaction integrity...');
      
      // Create multiple games for concurrent testing
      const gamePromises = Array(5).fill(0).map((_, i) => createTestGame(`_transaction_${i}`));
      const games = await Promise.all(gamePromises);
      
      // Deal cards to all games
      const dealPromises = games.map(game => 
        fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      const dealResults = await Promise.all(dealPromises);
      const validDeals = dealResults.filter(r => r.ok);
      
      expect(validDeals.length).toBe(games.length);
      
      // Attempt concurrent actions on different games
      const actionPromises = games.map(async (game, index) => {
        const gameState = await getGameState(game.gameId);
        const activePlayer = gameState.players[gameState.activePlayerIndex];
        
        return await performPlayerAction(game.gameId, activePlayer.id, 'fold');
      });
      
      const actionResults = await Promise.all(actionPromises);
      const successfulActions = actionResults.filter(r => r.ok);
      
      console.log(`Transaction integrity results: ${successfulActions.length}/${games.length} successful`);
      
      // Should handle concurrent transactions properly
      expect(successfulActions.length).toBeGreaterThan(games.length * 0.8);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('Recovery from invalid game operations', async () => {
      console.log('Testing recovery from invalid operations...');
      
      const game = await createTestGame('_recovery');
      const gameId = game.gameId;
      
      // Deal cards
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const gameState = await getGameState(gameId);
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      
      // Attempt various invalid operations
      const invalidOperations = [
        { action: 'invalid-action', expected: false },
        { action: 'raise', amount: -100, expected: false },
        { action: 'raise', amount: 999999, expected: false },
        { action: 'call', expected: true }, // This should work
      ];
      
      for (const operation of invalidOperations) {
        const result = await performPlayerAction(
          gameId, 
          activePlayer.id, 
          operation.action, 
          operation.amount
        );
        
        if (operation.expected) {
          expect(result.ok).toBe(true);
        } else {
          expect(result.ok).toBe(false);
          
          // Game should still be in valid state after invalid operation
          const postOpState = await getGameState(gameId);
          expect(postOpState.players).toHaveLength(2);
          expect(postOpState.phase).toBeDefined();
        }
      }
      
      console.log('Error recovery test completed - game state remains valid');
    });

    test('Graceful handling of corrupted requests', async () => {
      console.log('Testing corrupted request handling...');
      
      const corruptedRequests = [
        {
          name: 'Malformed JSON',
          body: '{"playerNames": ["Player1", "Player2"',
          contentType: 'application/json'
        },
        {
          name: 'Invalid content type',
          body: JSON.stringify({ playerNames: ['Player1', 'Player2'] }),
          contentType: 'text/plain'
        },
        {
          name: 'Empty body',
          body: '',
          contentType: 'application/json'
        },
        {
          name: 'Binary data',
          body: '\x00\x01\x02\x03\x04\x05',
          contentType: 'application/json'
        },
        {
          name: 'Extremely large request',
          body: JSON.stringify({ 
            playerNames: ['Player1', 'Player2'],
            junk: 'x'.repeat(100000)
          }),
          contentType: 'application/json'
        }
      ];
      
      let handledCorrectly = 0;
      
      for (const request of corruptedRequests) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': request.contentType },
            body: request.body
          });
          
          // Should return error status for corrupted requests
          if (!response.ok) {
            handledCorrectly++;
            console.log(`✓ ${request.name}: Properly rejected (${response.status})`);
          } else {
            console.log(`✗ ${request.name}: Unexpectedly accepted`);
          }
        } catch (error) {
          // Network errors are acceptable for corrupted requests
          handledCorrectly++;
          console.log(`✓ ${request.name}: Network error (expected for corrupted data)`);
        }
      }
      
      console.log(`Corrupted request handling: ${handledCorrectly}/${corruptedRequests.length} handled correctly`);
      expect(handledCorrectly).toBe(corruptedRequests.length);
    });

    test('System stability after error conditions', async () => {
      console.log('Testing system stability after errors...');
      
      // Generate multiple error conditions
      const errorOperations = [
        () => fetch('http://localhost:3000/api/game/nonexistent', { method: 'GET' }),
        () => fetch('http://localhost:3000/api/game/create', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: '{"invalid": "json"'
        }),
        () => fetch('http://localhost:3000/api/game/fake-id/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: 'fake', action: 'invalid' })
        }),
        () => fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'invalid', password: 'fake' })
        })
      ];
      
      // Execute error operations
      const errorPromises = errorOperations.map(op => 
        op().catch(error => ({ error: error.message }))
      );
      
      await Promise.all(errorPromises);
      
      // System should still be responsive after errors
      const healthAfterErrors = await testDatabaseConnectivity();
      expect(healthAfterErrors.connected).toBe(true);
      
      // Should be able to create valid games after error conditions
      const testGame = await createTestGame('_post_error');
      expect(testGame.gameId).toBeDefined();
      
      console.log('System stability verified after error conditions');
    });
  });

  describe('Resource Cleanup and Memory Management', () => {
    test('Memory cleanup after failed operations', async () => {
      console.log('Testing memory cleanup...');
      
      const initialMemory = process.memoryUsage();
      
      // Perform operations that might create memory leaks
      const operations = Array(50).fill(0).map(async (_, i) => {
        try {
          // Create game
          const game = await createTestGame(`_cleanup_${i}`);
          
          // Attempt invalid operations
          await performPlayerAction(game.gameId, 'fake-player', 'invalid-action');
          
          // Try to corrupt game state
          await fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"invalid": json}'
          }).catch(() => {});
          
          return game.gameId;
        } catch (error) {
          return null;
        }
      });
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Check memory usage after operations
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const percentIncrease = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      console.log(`Memory usage after cleanup test:`);
      console.log(`  Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${percentIncrease.toFixed(1)}%)`);
      
      // Memory increase should be reasonable after failed operations
      expect(percentIncrease).toBeLessThan(30);
    });

    test('Cleanup of abandoned games', async () => {
      console.log('Testing abandoned game cleanup...');
      
      // Create games and abandon them (don't complete)
      const abandonedGames = [];
      
      for (let i = 0; i < 10; i++) {
        try {
          const game = await createTestGame(`_abandoned_${i}`);
          abandonedGames.push(game.gameId);
          
          // Start the game but don't finish
          await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          // Don't complete the game - simulate abandonment
        } catch (error) {
          console.log(`Failed to create abandoned game ${i}:`, error.message);
        }
      }
      
      console.log(`Created ${abandonedGames.length} abandoned games`);
      
      // System should handle having multiple abandoned games
      const healthAfterAbandonment = await testDatabaseConnectivity();
      expect(healthAfterAbandonment.connected).toBe(true);
      
      // Should still be able to create new games
      const newGame = await createTestGame('_after_abandonment');
      expect(newGame.gameId).toBeDefined();
      
      console.log('System handles abandoned games correctly');
    });
  });
});