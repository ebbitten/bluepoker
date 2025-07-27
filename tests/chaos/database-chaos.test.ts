/**
 * Phase 10: Database Transaction Chaos Engineering
 * Extreme database failure scenarios and transaction integrity testing
 */

import { describe, test, expect } from 'vitest';

// Helper to create chaos test game
async function createChaosTestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`ChaosPlayer1${suffix}`, `ChaosPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Chaos game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Helper to check database health
async function checkDatabaseHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const health = await response.json();
    return {
      healthy: response.ok && health.database?.connected,
      responseTime: health.database?.responseTime,
      status: health.status,
      error: health.database?.error
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      status: 'error'
    };
  }
}

// Helper to perform rapid database operations
async function performRapidOperations(gameId: string, operationCount: number) {
  const operations = [];
  const results = [];
  
  // Create mix of database operations
  for (let i = 0; i < operationCount; i++) {
    const opType = i % 4;
    let operation;
    
    switch (opType) {
      case 0: // Game state read
        operation = () => fetch(`http://localhost:3000/api/game/${gameId}`);
        break;
      case 1: // Health check (database read)
        operation = () => fetch('http://localhost:3000/api/health');
        break;
      case 2: // Game creation (database write)
        operation = () => fetch('http://localhost:3000/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNames: [`RapidPlayer1_${i}`, `RapidPlayer2_${i}`]
          })
        });
        break;
      case 3: // Game action (database update)
        operation = async () => {
          try {
            const gameState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
            if (gameState.players && gameState.activePlayerIndex !== undefined) {
              const activePlayer = gameState.players[gameState.activePlayerIndex];
              return fetch(`http://localhost:3000/api/game/${gameId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  playerId: activePlayer.id,
                  action: 'fold'
                })
              });
            }
            return { ok: false, status: 400 };
          } catch (error) {
            return { ok: false, status: 500, error: error.message };
          }
        };
        break;
    }
    
    operations.push({ type: opType, operation, index: i });
  }
  
  // Execute operations rapidly
  const startTime = Date.now();
  const promises = operations.map(async (op) => {
    const opStart = Date.now();
    try {
      const result = await op.operation();
      return {
        index: op.index,
        type: op.type,
        success: result.ok,
        status: result.status,
        duration: Date.now() - opStart
      };
    } catch (error) {
      return {
        index: op.index,
        type: op.type,
        success: false,
        status: 0,
        duration: Date.now() - opStart,
        error: error.message
      };
    }
  });
  
  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startTime;
  
  return {
    totalTime,
    operations: operationCount,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
  };
}

describe('Phase 10: Database Transaction Chaos Engineering', () => {
  describe('Database Connection Chaos', () => {
    test('Database connection pool exhaustion', async () => {
      console.log('Testing database connection pool exhaustion...');
      
      const simultaneousConnections = 200;
      const startTime = Date.now();
      
      // Create massive number of simultaneous database requests
      const connectionPromises = Array(simultaneousConnections).fill(0).map(async (_, i) => {
        const requestStart = Date.now();
        try {
          const response = await fetch('http://localhost:3000/api/health');
          return {
            index: i,
            success: response.ok,
            status: response.status,
            duration: Date.now() - requestStart
          };
        } catch (error) {
          return {
            index: i,
            success: false,
            status: 0,
            duration: Date.now() - requestStart,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(connectionPromises);
      const totalTime = Date.now() - startTime;
      
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      const avgDuration = completed.reduce((sum, r) => sum + r.duration, 0) / completed.length;
      
      console.log(`Connection Pool Exhaustion Results:`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Successful Connections: ${successful.length}/${simultaneousConnections}`);
      console.log(`  Failed Connections: ${failed.length}/${simultaneousConnections}`);
      console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
      
      // System should handle connection pressure gracefully
      expect(successful.length).toBeGreaterThan(simultaneousConnections * 0.5);
      
      // Verify system recovers after connection storm
      await new Promise(resolve => setTimeout(resolve, 2000));
      const healthAfter = await checkDatabaseHealth();
      expect(healthAfter.healthy).toBe(true);
    });

    test('Rapid sequential database operations', async () => {
      console.log('Testing rapid sequential database operations...');
      
      const game = await createChaosTestGame('_sequential');
      const operationCount = 500;
      
      const results = await performRapidOperations(game.gameId, operationCount);
      
      const successful = results.results.filter(r => r.success);
      const failed = results.results.filter(r => !r.success);
      const avgDuration = results.results.reduce((sum, r) => sum + r.duration, 0) / results.results.length;
      
      // Analyze by operation type
      const byType = {
        reads: results.results.filter(r => r.type === 0 || r.type === 1),
        writes: results.results.filter(r => r.type === 2),
        updates: results.results.filter(r => r.type === 3)
      };
      
      console.log(`Rapid Operations Results:`);
      console.log(`  Total Time: ${results.totalTime}ms`);
      console.log(`  Operations/Second: ${(operationCount / (results.totalTime / 1000)).toFixed(2)}`);
      console.log(`  Successful: ${successful.length}/${operationCount}`);
      console.log(`  Failed: ${failed.length}/${operationCount}`);
      console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Reads: ${byType.reads.filter(r => r.success).length}/${byType.reads.length}`);
      console.log(`  Writes: ${byType.writes.filter(r => r.success).length}/${byType.writes.length}`);
      console.log(`  Updates: ${byType.updates.filter(r => r.success).length}/${byType.updates.length}`);
      
      // Should handle rapid operations with reasonable success rate
      expect(successful.length).toBeGreaterThan(operationCount * 0.7);
      expect(avgDuration).toBeLessThan(1000); // Average under 1 second
    });
  });

  describe('Transaction Integrity Chaos', () => {
    test('Concurrent transaction collision testing', async () => {
      console.log('Testing concurrent transaction collisions...');
      
      const numGames = 10;
      const actionsPerGame = 20;
      
      // Create multiple games for concurrent testing
      const games = await Promise.all(
        Array(numGames).fill(0).map((_, i) => createChaosTestGame(`_collision_${i}`))
      );
      
      // Deal cards to all games to enable actions
      await Promise.all(games.map(game => 
        fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      ));
      
      console.log(`Created ${numGames} games, generating ${actionsPerGame} concurrent actions per game...`);
      
      // Generate concurrent actions across all games
      const allActionPromises = games.flatMap((game, gameIndex) => 
        Array(actionsPerGame).fill(0).map(async (_, actionIndex) => {
          try {
            const gameState = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
            
            if (gameState.players && gameState.activePlayerIndex !== undefined) {
              const activePlayer = gameState.players[gameState.activePlayerIndex];
              
              const response = await fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  playerId: activePlayer.id,
                  action: actionIndex % 3 === 0 ? 'call' : actionIndex % 3 === 1 ? 'fold' : 'check'
                })
              });
              
              return {
                gameIndex,
                actionIndex,
                success: response.ok,
                status: response.status,
                gameId: game.gameId
              };
            } else {
              return {
                gameIndex,
                actionIndex,
                success: false,
                status: 400,
                error: 'Invalid game state'
              };
            }
          } catch (error) {
            return {
              gameIndex,
              actionIndex,
              success: false,
              status: 0,
              error: error.message
            };
          }
        })
      );
      
      const startTime = Date.now();
      const actionResults = await Promise.allSettled(allActionPromises);
      const totalTime = Date.now() - startTime;
      
      const completed = actionResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      
      // Verify final game states are consistent
      const finalStates = await Promise.all(games.map(async game => {
        try {
          const state = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
          return { gameId: game.gameId, valid: state.players && state.players.length === 2 };
        } catch (error) {
          return { gameId: game.gameId, valid: false, error: error.message };
        }
      }));
      
      const validStates = finalStates.filter(s => s.valid).length;
      
      console.log(`Concurrent Transaction Results:`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Total Actions: ${numGames * actionsPerGame}`);
      console.log(`  Successful Actions: ${successful.length}`);
      console.log(`  Failed Actions: ${failed.length}`);
      console.log(`  Success Rate: ${(successful.length / (numGames * actionsPerGame) * 100).toFixed(1)}%`);
      console.log(`  Valid Final States: ${validStates}/${numGames}`);
      
      // Should maintain transaction integrity
      expect(validStates).toBe(numGames); // All game states should remain valid
      expect(successful.length).toBeGreaterThan((numGames * actionsPerGame) * 0.5);
    });

    test('Database deadlock simulation and recovery', async () => {
      console.log('Testing database deadlock scenarios...');
      
      const numConcurrentOperations = 50;
      const game1 = await createChaosTestGame('_deadlock_1');
      const game2 = await createChaosTestGame('_deadlock_2');
      
      // Create operations that could potentially cause deadlocks
      const deadlockOperations = Array(numConcurrentOperations).fill(0).map(async (_, i) => {
        const isEven = i % 2 === 0;
        const gameId = isEven ? game1.gameId : game2.gameId;
        const otherGameId = isEven ? game2.gameId : game1.gameId;
        
        const operationStart = Date.now();
        
        try {
          // Perform operations that access multiple resources
          const results = await Promise.all([
            fetch(`http://localhost:3000/api/game/${gameId}`),
            fetch(`http://localhost:3000/api/game/${otherGameId}`),
            fetch('http://localhost:3000/api/health')
          ]);
          
          return {
            index: i,
            success: results.every(r => r.ok),
            duration: Date.now() - operationStart,
            results: results.map(r => r.status)
          };
        } catch (error) {
          return {
            index: i,
            success: false,
            duration: Date.now() - operationStart,
            error: error.message
          };
        }
      });
      
      const startTime = Date.now();
      const results = await Promise.allSettled(deadlockOperations);
      const totalTime = Date.now() - startTime;
      
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      const avgDuration = completed.reduce((sum, r) => sum + r.duration, 0) / completed.length;
      
      console.log(`Deadlock Simulation Results:`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Successful Operations: ${successful.length}/${numConcurrentOperations}`);
      console.log(`  Failed Operations: ${failed.length}/${numConcurrentOperations}`);
      console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
      
      // System should handle potential deadlocks gracefully
      expect(successful.length).toBeGreaterThan(numConcurrentOperations * 0.7);
      
      // Verify system remains responsive after deadlock test
      const healthAfter = await checkDatabaseHealth();
      expect(healthAfter.healthy).toBe(true);
    });
  });

  describe('Data Corruption Scenarios', () => {
    test('Malformed data injection and recovery', async () => {
      console.log('Testing malformed data injection scenarios...');
      
      const malformedPayloads = [
        // Oversized data
        { 
          playerNames: [
            'A'.repeat(10000), 
            'B'.repeat(10000)
          ]
        },
        // Special characters that might cause issues
        {
          playerNames: [
            "Player\x00\x01\x02", 
            "Player\uFFFD"
          ]
        },
        // Unicode extremes
        {
          playerNames: [
            "Player🎮🃏🎯🚀💥", 
            "Player\u200B\u200C\u200D"
          ]
        },
        // JSON injection attempts
        {
          playerNames: [
            '{"injected": "value"}',
            '</script><script>alert(1)</script>'
          ]
        },
        // Buffer overflow attempts
        {
          playerNames: Array(1000).fill("BufferOverflow")
        }
      ];
      
      const injectionResults = [];
      
      for (const [index, payload] of malformedPayloads.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          injectionResults.push({
            index,
            success: response.ok,
            status: response.status,
            payloadType: `malformed_${index}`
          });
          
          // If successful, verify data integrity
          if (response.ok) {
            const gameData = await response.json();
            injectionResults[injectionResults.length - 1].dataIntegrity = 
              gameData.gameState && 
              gameData.gameState.players && 
              gameData.gameState.players.length === 2;
          }
          
        } catch (error) {
          injectionResults.push({
            index,
            success: false,
            status: 0,
            error: error.message,
            payloadType: `malformed_${index}`
          });
        }
      }
      
      const acceptedPayloads = injectionResults.filter(r => r.success);
      const rejectedPayloads = injectionResults.filter(r => !r.success);
      const integrityIssues = acceptedPayloads.filter(r => r.dataIntegrity === false);
      
      console.log(`Malformed Data Injection Results:`);
      console.log(`  Accepted Payloads: ${acceptedPayloads.length}/${malformedPayloads.length}`);
      console.log(`  Rejected Payloads: ${rejectedPayloads.length}/${malformedPayloads.length}`);
      console.log(`  Data Integrity Issues: ${integrityIssues.length}`);
      
      // System should reject most malformed data
      expect(rejectedPayloads.length).toBeGreaterThan(malformedPayloads.length * 0.5);
      
      // No data integrity issues should occur
      expect(integrityIssues.length).toBe(0);
      
      // Verify system remains healthy after injection attempts
      const healthAfter = await checkDatabaseHealth();
      expect(healthAfter.healthy).toBe(true);
    });

    test('Game state corruption recovery', async () => {
      console.log('Testing game state corruption recovery...');
      
      const game = await createChaosTestGame('_corruption');
      
      // Deal cards to establish valid state
      await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Verify initial valid state
      const initialState = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
      expect(initialState.players).toHaveLength(2);
      expect(initialState.phase).toBeDefined();
      
      // Attempt to corrupt state through various means
      const corruptionAttempts = [
        // Invalid player actions
        {
          type: 'invalid_action',
          request: () => fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: 'nonexistent-player',
              action: 'fold'
            })
          })
        },
        // Invalid action type
        {
          type: 'invalid_action_type',
          request: () => fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: initialState.players[0].id,
              action: 'invalid_action'
            })
          })
        },
        // Invalid bet amount
        {
          type: 'invalid_bet',
          request: () => fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: initialState.players[0].id,
              action: 'raise',
              amount: -1000000
            })
          })
        }
      ];
      
      const corruptionResults = [];
      
      for (const attempt of corruptionAttempts) {
        try {
          const response = await attempt.request();
          corruptionResults.push({
            type: attempt.type,
            blocked: !response.ok,
            status: response.status
          });
        } catch (error) {
          corruptionResults.push({
            type: attempt.type,
            blocked: true,
            error: error.message
          });
        }
        
        // Verify state integrity after each attempt
        const currentState = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
        corruptionResults[corruptionResults.length - 1].stateIntact = 
          currentState.players && 
          currentState.players.length === 2 &&
          currentState.phase !== undefined;
      }
      
      const blockedAttempts = corruptionResults.filter(r => r.blocked);
      const integrityMaintained = corruptionResults.filter(r => r.stateIntact);
      
      console.log(`State Corruption Recovery Results:`);
      console.log(`  Corruption Attempts: ${corruptionAttempts.length}`);
      console.log(`  Blocked Attempts: ${blockedAttempts.length}/${corruptionAttempts.length}`);
      console.log(`  State Integrity Maintained: ${integrityMaintained.length}/${corruptionAttempts.length}`);
      
      // All corruption attempts should be blocked
      expect(blockedAttempts.length).toBe(corruptionAttempts.length);
      
      // State integrity should be maintained
      expect(integrityMaintained.length).toBe(corruptionAttempts.length);
      
      // Final state should still be valid
      const finalState = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
      expect(finalState.players).toHaveLength(2);
      expect(finalState.phase).toBeDefined();
    });
  });

  describe('System Recovery Under Extreme Load', () => {
    test('Database recovery after extreme stress', async () => {
      console.log('Testing database recovery after extreme stress...');
      
      const stressOperations = 1000;
      const batchSize = 50;
      
      console.log(`Applying extreme stress: ${stressOperations} operations in batches of ${batchSize}...`);
      
      const stressResults = [];
      
      // Apply stress in batches
      for (let batch = 0; batch < stressOperations / batchSize; batch++) {
        const batchPromises = Array(batchSize).fill(0).map(async (_, i) => {
          const operationIndex = batch * batchSize + i;
          try {
            // Mix of heavy operations
            if (operationIndex % 3 === 0) {
              return await createChaosTestGame(`_stress_${operationIndex}`);
            } else if (operationIndex % 3 === 1) {
              return await fetch('http://localhost:3000/api/health').then(r => r.json());
            } else {
              return await fetch('http://localhost:3000/api/game/nonexistent').then(r => ({ status: r.status }));
            }
          } catch (error) {
            return { error: error.message };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
        
        stressResults.push({
          batch,
          successful: batchSuccessful,
          total: batchSize
        });
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Measure recovery
      console.log('Stress applied, measuring recovery...');
      
      const recoveryTests = [];
      for (let i = 0; i < 10; i++) {
        const recoveryStart = Date.now();
        try {
          const health = await checkDatabaseHealth();
          recoveryTests.push({
            attempt: i,
            healthy: health.healthy,
            responseTime: Date.now() - recoveryStart
          });
        } catch (error) {
          recoveryTests.push({
            attempt: i,
            healthy: false,
            responseTime: Date.now() - recoveryStart,
            error: error.message
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const totalSuccessful = stressResults.reduce((sum, batch) => sum + batch.successful, 0);
      const healthyRecoveries = recoveryTests.filter(r => r.healthy).length;
      const avgRecoveryTime = recoveryTests.reduce((sum, r) => sum + r.responseTime, 0) / recoveryTests.length;
      
      console.log(`Extreme Stress Recovery Results:`);
      console.log(`  Stress Operations: ${totalSuccessful}/${stressOperations}`);
      console.log(`  Recovery Success Rate: ${(healthyRecoveries / recoveryTests.length * 100).toFixed(1)}%`);
      console.log(`  Average Recovery Time: ${avgRecoveryTime.toFixed(2)}ms`);
      
      // System should recover after extreme stress
      expect(healthyRecoveries).toBeGreaterThan(recoveryTests.length * 0.8);
      expect(avgRecoveryTime).toBeLessThan(2000); // Recovery under 2 seconds
    });
  });
});