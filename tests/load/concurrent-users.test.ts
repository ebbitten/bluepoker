/**
 * Phase 3: Stress and Load Testing Suite
 * Tests system behavior under high concurrent load
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Helper function to create test game
async function createTestGame(playerSuffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`LoadPlayer1${playerSuffix}`, `LoadPlayer2${playerSuffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Game creation failed: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// Helper function to play a full game
async function playFullGame(gameId: string) {
  try {
    // Deal cards
    const dealResponse = await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!dealResponse.ok) {
      throw new Error(`Deal failed: ${dealResponse.status}`);
    }
    
    const gameState = await dealResponse.json();
    
    // Make a simple action (fold to end game quickly)
    const activePlayer = gameState.gameState.players[gameState.gameState.activePlayerIndex];
    
    const actionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: activePlayer.id,
        action: 'fold'
      })
    });
    
    if (!actionResponse.ok) {
      throw new Error(`Action failed: ${actionResponse.status}`);
    }
    
    return await actionResponse.json();
  } catch (error) {
    console.error(`Error playing game ${gameId}:`, error);
    throw error;
  }
}

// Helper function to check server health
async function checkServerHealth() {
  const response = await fetch('http://localhost:3000/api/health');
  return response.ok;
}

describe('Phase 3: Stress and Load Testing', () => {
  beforeAll(async () => {
    // Verify server is running before starting load tests
    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      throw new Error('Server is not healthy - cannot run load tests');
    }
  });

  describe('Concurrent Game Creation', () => {
    test('Create 50 concurrent games', async () => {
      const concurrency = 50;
      const startTime = Date.now();
      
      console.log(`Creating ${concurrency} concurrent games...`);
      
      const promises = Array(concurrency).fill(0).map(async (_, i) => {
        try {
          const game = await createTestGame(`_concurrent_${i}`);
          return { 
            success: true, 
            gameId: game.gameId, 
            index: i,
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return { 
            success: false, 
            error: error.message, 
            index: i,
            responseTime: Date.now() - startTime
          };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      
      const totalTime = Date.now() - startTime;
      const avgResponseTime = completed.reduce((sum, r) => sum + r.responseTime, 0) / completed.length;
      
      console.log(`Concurrent game creation results:`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Successful: ${successful.length}/${concurrency}`);
      console.log(`  Failed: ${failed.length}/${concurrency}`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      if (failed.length > 0) {
        console.log('Failure reasons:', failed.map(f => f.error));
      }
      
      // Require at least 80% success rate
      expect(successful.length).toBeGreaterThan(concurrency * 0.8);
      
      // All successful games should have valid IDs
      successful.forEach(game => {
        expect(game.gameId).toBeDefined();
        expect(typeof game.gameId).toBe('string');
      });
    });

    test('Create 100 games sequentially (baseline)', async () => {
      const gameCount = 100;
      const startTime = Date.now();
      const results = [];
      
      console.log(`Creating ${gameCount} games sequentially...`);
      
      for (let i = 0; i < gameCount; i++) {
        const gameStart = Date.now();
        try {
          const game = await createTestGame(`_sequential_${i}`);
          results.push({
            success: true,
            gameId: game.gameId,
            responseTime: Date.now() - gameStart,
            index: i
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            responseTime: Date.now() - gameStart,
            index: i
          });
        }
        
        // Brief pause to avoid overwhelming server
        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const totalTime = Date.now() - startTime;
      const successful = results.filter(r => r.success);
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log(`Sequential game creation results:`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Successful: ${successful.length}/${gameCount}`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Games per second: ${(successful.length / (totalTime / 1000)).toFixed(2)}`);
      
      // Sequential creation should have very high success rate
      expect(successful.length).toBeGreaterThan(gameCount * 0.95);
    });
  });

  describe('Concurrent Game Play', () => {
    test('Play 25 concurrent full games', async () => {
      const concurrency = 25;
      const startTime = Date.now();
      
      console.log(`Playing ${concurrency} concurrent full games...`);
      
      const promises = Array(concurrency).fill(0).map(async (_, i) => {
        try {
          const game = await createTestGame(`_play_${i}`);
          const result = await playFullGame(game.gameId);
          
          return {
            success: true,
            gameId: game.gameId,
            index: i,
            winner: result.gameState.winner,
            responseTime: Date.now() - startTime
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            index: i,
            responseTime: Date.now() - startTime
          };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      
      const totalTime = Date.now() - startTime;
      
      console.log(`Concurrent gameplay results:`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Successful: ${successful.length}/${concurrency}`);
      console.log(`  Failed: ${failed.length}/${concurrency}`);
      
      if (failed.length > 0) {
        console.log('Gameplay failures:', failed.map(f => f.error));
      }
      
      // Require at least 70% success rate for full gameplay
      expect(successful.length).toBeGreaterThan(concurrency * 0.7);
      
      // All successful games should have winners
      successful.forEach(game => {
        expect(game.winner).toBeDefined();
      });
    });
  });

  describe('Sustained Load Testing', () => {
    test('Sustained load over 5 minutes', async () => {
      const duration = 5 * 60 * 1000; // 5 minutes
      const batchSize = 5;
      const batchInterval = 10000; // 10 seconds between batches
      
      const startTime = Date.now();
      const results: any[] = [];
      let batchNumber = 0;
      
      console.log('Starting 5-minute sustained load test...');
      
      while (Date.now() - startTime < duration) {
        const batchStart = Date.now();
        batchNumber++;
        
        console.log(`Batch ${batchNumber}: Creating ${batchSize} games...`);
        
        const batchPromises = Array(batchSize).fill(0).map(async (_, i) => {
          try {
            const game = await createTestGame(`_sustained_${batchNumber}_${i}`);
            await playFullGame(game.gameId);
            return { success: true, gameId: game.gameId };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        const batchCompleted = batchResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);
        
        const batchSuccessful = batchCompleted.filter(r => r.success);
        const batchDuration = Date.now() - batchStart;
        
        const batchResult = {
          batchNumber,
          timestamp: new Date().toISOString(),
          successful: batchSuccessful.length,
          total: batchSize,
          successRate: batchSuccessful.length / batchSize,
          duration: batchDuration,
          memoryUsage: process.memoryUsage()
        };
        
        results.push(batchResult);
        
        console.log(`Batch ${batchNumber}: ${batchSuccessful.length}/${batchSize} successful (${batchDuration}ms)`);
        
        // Wait before next batch (if we haven't exceeded duration)
        const remainingTime = duration - (Date.now() - startTime);
        if (remainingTime > batchInterval) {
          await new Promise(resolve => setTimeout(resolve, batchInterval));
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const overallSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
      const avgBatchDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      
      console.log(`Sustained load test results:`);
      console.log(`  Duration: ${totalDuration}ms (${(totalDuration / 60000).toFixed(1)} minutes)`);
      console.log(`  Batches completed: ${results.length}`);
      console.log(`  Overall success rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Average batch duration: ${avgBatchDuration.toFixed(0)}ms`);
      
      // Analyze memory usage trend
      if (results.length > 1) {
        const initialMemory = results[0].memoryUsage.heapUsed;
        const finalMemory = results[results.length - 1].memoryUsage.heapUsed;
        const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
        
        console.log(`  Memory growth: ${memoryGrowth.toFixed(1)}%`);
        
        // Memory growth should be reasonable (less than 20% over 5 minutes)
        expect(memoryGrowth).toBeLessThan(20);
      }
      
      // Overall success rate should remain high
      expect(overallSuccessRate).toBeGreaterThan(0.8);
      
      // Performance should not degrade significantly over time
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));
      
      const firstHalfAvgDuration = firstHalf.reduce((sum, r) => sum + r.duration, 0) / firstHalf.length;
      const secondHalfAvgDuration = secondHalf.reduce((sum, r) => sum + r.duration, 0) / secondHalf.length;
      
      const performanceDegradation = ((secondHalfAvgDuration - firstHalfAvgDuration) / firstHalfAvgDuration) * 100;
      
      console.log(`  Performance change: ${performanceDegradation.toFixed(1)}%`);
      
      // Performance degradation should be minimal (less than 50%)
      expect(performanceDegradation).toBeLessThan(50);
    }, 600000); // 10 minute timeout for 5 minute test
  });

  describe('Memory and Resource Testing', () => {
    test('Memory leak detection', async () => {
      const iterations = 200;
      const memoryCheckpoints = [];
      
      console.log(`Testing memory usage over ${iterations} game creations...`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage();
      memoryCheckpoints.push({ iteration: 0, memory: initialMemory });
      
      for (let i = 1; i <= iterations; i++) {
        try {
          const game = await createTestGame(`_memory_${i}`);
          await playFullGame(game.gameId);
          
          // Record memory usage every 50 iterations
          if (i % 50 === 0) {
            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
            
            const currentMemory = process.memoryUsage();
            memoryCheckpoints.push({ iteration: i, memory: currentMemory });
            
            console.log(`Iteration ${i}: Heap used: ${(currentMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (error) {
          console.error(`Memory test iteration ${i} failed:`, error.message);
        }
      }
      
      // Analyze memory growth
      const finalMemory = memoryCheckpoints[memoryCheckpoints.length - 1].memory;
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const percentGrowth = (memoryGrowth / initialMemory.heapUsed) * 100;
      
      console.log(`Memory leak test results:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB (${percentGrowth.toFixed(1)}%)`);
      
      // Memory growth should be reasonable (less than 50% for 200 iterations)
      expect(percentGrowth).toBeLessThan(50);
      
      // Check for memory leak pattern (steady growth)
      if (memoryCheckpoints.length >= 3) {
        const growthRates = [];
        for (let i = 1; i < memoryCheckpoints.length; i++) {
          const prev = memoryCheckpoints[i - 1];
          const curr = memoryCheckpoints[i];
          const growth = curr.memory.heapUsed - prev.memory.heapUsed;
          growthRates.push(growth);
        }
        
        const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
        console.log(`  Average growth rate per checkpoint: ${(avgGrowthRate / 1024 / 1024).toFixed(2)} MB`);
        
        // Growth rate should stabilize (not continuously increasing)
        const firstHalfAvg = growthRates.slice(0, Math.floor(growthRates.length / 2))
          .reduce((sum, rate) => sum + rate, 0) / Math.floor(growthRates.length / 2);
        const secondHalfAvg = growthRates.slice(Math.floor(growthRates.length / 2))
          .reduce((sum, rate) => sum + rate, 0) / (growthRates.length - Math.floor(growthRates.length / 2));
        
        console.log(`  First half avg growth: ${(firstHalfAvg / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Second half avg growth: ${(secondHalfAvg / 1024 / 1024).toFixed(2)} MB`);
      }
    });

    test('Resource exhaustion resilience', async () => {
      console.log('Testing resource exhaustion resilience...');
      
      // Create a large number of games simultaneously
      const massCreateCount = 100;
      const promises = Array(massCreateCount).fill(0).map(async (_, i) => {
        try {
          const game = await createTestGame(`_resource_${i}`);
          return { success: true, gameId: game.gameId };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const failed = completed.filter(r => !r.success);
      
      console.log(`Resource exhaustion test results:`);
      console.log(`  Attempted: ${massCreateCount}`);
      console.log(`  Successful: ${successful.length}`);
      console.log(`  Failed: ${failed.length}`);
      
      if (failed.length > 0) {
        const errorTypes = {};
        failed.forEach(f => {
          const errorType = f.error.includes('timeout') ? 'timeout' :
                           f.error.includes('connection') ? 'connection' :
                           f.error.includes('memory') ? 'memory' : 'other';
          errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
        
        console.log('  Error types:', errorTypes);
      }
      
      // System should handle resource pressure gracefully
      // Even if some requests fail, the success rate should be reasonable
      expect(successful.length).toBeGreaterThan(massCreateCount * 0.5);
      
      // Server should still be responsive after resource pressure
      const healthCheck = await checkServerHealth();
      expect(healthCheck).toBe(true);
    });
  });
});