/**
 * Phase 6: Performance Benchmarking Tests
 * Validates response times and performance characteristics
 */

import { describe, test, expect } from 'vitest';

// Performance benchmarks (in milliseconds)
const PERFORMANCE_TARGETS = {
  healthCheck: 100,      // Health check should be very fast
  gameCreation: 200,     // Game creation should be fast
  gameState: 100,        // Game state retrieval should be fast
  playerAction: 200,     // Player actions should be responsive
  cardDealing: 300,      // Card dealing involves more logic
  sseConnection: 500     // SSE connection establishment
};

// Helper function to measure endpoint performance
async function measureEndpointPerformance(endpoint: string, method: string = 'GET', body?: any): Promise<{
  responseTime: number;
  success: boolean;
  status: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
      body: method !== 'GET' && body ? JSON.stringify(body) : undefined
    });
    
    const endTime = performance.now();
    
    return {
      responseTime: endTime - startTime,
      success: response.ok,
      status: response.status
    };
  } catch (error) {
    const endTime = performance.now();
    
    return {
      responseTime: endTime - startTime,
      success: false,
      status: 0,
      error: error.message
    };
  }
}

// Helper function to run performance test suite
async function runPerformanceTestSuite(endpoint: string, method: string, body: any, iterations: number = 100) {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await measureEndpointPerformance(endpoint, method, body);
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    if (i % 10 === 9) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Calculate statistics
  const responseTimes = results.map(r => r.responseTime);
  const successfulRequests = results.filter(r => r.success);
  
  responseTimes.sort((a, b) => a - b);
  
  return {
    iterations,
    successCount: successfulRequests.length,
    successRate: (successfulRequests.length / iterations) * 100,
    responseTimes: {
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      mean: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)]
    },
    errors: results.filter(r => !r.success).map(r => r.error || `Status ${r.status}`)
  };
}

// Helper to create test game for performance testing
async function createPerformanceTestGame() {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: ['PerfPlayer1', 'PerfPlayer2']
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create test game: ${response.status}`);
  }
  
  return await response.json();
}

describe('Phase 6: Performance Benchmarking', () => {
  describe('API Response Time Validation', () => {
    test('Health check endpoint performance', async () => {
      console.log('Benchmarking health check endpoint...');
      
      const results = await runPerformanceTestSuite('/api/health', 'GET', null, 200);
      
      console.log('Health Check Performance Results:');
      console.log(`  Success Rate: ${results.successRate.toFixed(1)}%`);
      console.log(`  Mean Response Time: ${results.responseTimes.mean.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${results.responseTimes.p95.toFixed(2)}ms`);
      console.log(`  99th Percentile: ${results.responseTimes.p99.toFixed(2)}ms`);
      
      // Health check should be very fast and reliable
      expect(results.successRate).toBeGreaterThan(95);
      expect(results.responseTimes.p95).toBeLessThan(PERFORMANCE_TARGETS.healthCheck);
      expect(results.responseTimes.mean).toBeLessThan(PERFORMANCE_TARGETS.healthCheck / 2);
    });

    test('Game creation endpoint performance', async () => {
      console.log('Benchmarking game creation endpoint...');
      
      const gamePayload = {
        playerNames: ['BenchPlayer1', 'BenchPlayer2']
      };
      
      const results = await runPerformanceTestSuite('/api/game/create', 'POST', gamePayload, 100);
      
      console.log('Game Creation Performance Results:');
      console.log(`  Success Rate: ${results.successRate.toFixed(1)}%`);
      console.log(`  Mean Response Time: ${results.responseTimes.mean.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${results.responseTimes.p95.toFixed(2)}ms`);
      console.log(`  Max Response Time: ${results.responseTimes.max.toFixed(2)}ms`);
      
      if (results.errors.length > 0) {
        console.log(`  Errors: ${results.errors.slice(0, 5).join(', ')}`);
      }
      
      // Game creation should be fast and reliable
      expect(results.successRate).toBeGreaterThan(90);
      expect(results.responseTimes.p95).toBeLessThan(PERFORMANCE_TARGETS.gameCreation);
    });

    test('Game state retrieval performance', async () => {
      console.log('Benchmarking game state retrieval...');
      
      // Create a test game first
      const testGame = await createPerformanceTestGame();
      const gameId = testGame.gameId;
      
      const results = await runPerformanceTestSuite(`/api/game/${gameId}`, 'GET', null, 150);
      
      console.log('Game State Retrieval Performance Results:');
      console.log(`  Success Rate: ${results.successRate.toFixed(1)}%`);
      console.log(`  Mean Response Time: ${results.responseTimes.mean.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${results.responseTimes.p95.toFixed(2)}ms`);
      console.log(`  Min/Max: ${results.responseTimes.min.toFixed(2)}ms / ${results.responseTimes.max.toFixed(2)}ms`);
      
      // Game state retrieval should be very fast
      expect(results.successRate).toBeGreaterThan(95);
      expect(results.responseTimes.p95).toBeLessThan(PERFORMANCE_TARGETS.gameState);
      expect(results.responseTimes.mean).toBeLessThan(PERFORMANCE_TARGETS.gameState / 2);
    });

    test('Card dealing performance', async () => {
      console.log('Benchmarking card dealing...');
      
      // Create multiple games for dealing tests
      const games = await Promise.all(
        Array(50).fill(0).map(() => createPerformanceTestGame())
      );
      
      const dealingResults = [];
      
      for (const game of games) {
        const result = await measureEndpointPerformance(`/api/game/${game.gameId}/deal`, 'POST');
        dealingResults.push(result);
      }
      
      const responseTimes = dealingResults.map(r => r.responseTime).sort((a, b) => a - b);
      const successCount = dealingResults.filter(r => r.success).length;
      
      const stats = {
        successRate: (successCount / games.length) * 100,
        mean: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        p95: responseTimes[Math.floor(responseTimes.length * 0.95)]
      };
      
      console.log('Card Dealing Performance Results:');
      console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`  Mean Response Time: ${stats.mean.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${stats.p95.toFixed(2)}ms`);
      
      // Card dealing involves more computation but should still be responsive
      expect(stats.successRate).toBeGreaterThan(90);
      expect(stats.p95).toBeLessThan(PERFORMANCE_TARGETS.cardDealing);
    });
  });

  describe('Concurrent Performance Testing', () => {
    test('Concurrent game creation performance', async () => {
      console.log('Testing concurrent game creation performance...');
      
      const concurrency = 25;
      const startTime = performance.now();
      
      const promises = Array(concurrency).fill(0).map(async (_, i) => {
        const gameStart = performance.now();
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: [`ConcurrentPlayer1_${i}`, `ConcurrentPlayer2_${i}`]
            })
          });
          
          return {
            success: response.ok,
            responseTime: performance.now() - gameStart,
            index: i
          };
        } catch (error) {
          return {
            success: false,
            responseTime: performance.now() - gameStart,
            index: i,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = results.filter(r => r.success);
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      
      console.log('Concurrent Game Creation Results:');
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Successful: ${successful.length}/${concurrency}`);
      console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${(successful.length / (totalTime / 1000)).toFixed(2)} games/second`);
      
      // Concurrent operations should maintain reasonable performance
      expect(successful.length).toBeGreaterThan(concurrency * 0.8);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGETS.gameCreation * 2); // Allow 2x slower under concurrency
    });

    test('Mixed workload performance', async () => {
      console.log('Testing mixed workload performance...');
      
      // Create some base games
      const baseGames = await Promise.all(
        Array(5).fill(0).map(() => createPerformanceTestGame())
      );
      
      // Deal cards to prepare for actions
      await Promise.all(
        baseGames.map(game => 
          fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );
      
      // Mixed workload: health checks, game creation, state retrieval, actions
      const mixedOperations = [
        ...Array(20).fill(0).map(() => ({ type: 'health', endpoint: '/api/health', method: 'GET' })),
        ...Array(10).fill(0).map((_, i) => ({ 
          type: 'create', 
          endpoint: '/api/game/create', 
          method: 'POST',
          body: { playerNames: [`MixedPlayer1_${i}`, `MixedPlayer2_${i}`] }
        })),
        ...Array(30).fill(0).map(() => {
          const randomGame = baseGames[Math.floor(Math.random() * baseGames.length)];
          return { type: 'state', endpoint: `/api/game/${randomGame.gameId}`, method: 'GET' };
        })
      ];
      
      // Shuffle operations for realistic mixed load
      const shuffledOps = mixedOperations.sort(() => Math.random() - 0.5);
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        shuffledOps.map(async (op, i) => {
          const opStart = performance.now();
          try {
            const response = await fetch(`http://localhost:3000${op.endpoint}`, {
              method: op.method,
              headers: op.method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
              body: op.method !== 'GET' && op.body ? JSON.stringify(op.body) : undefined
            });
            
            return {
              type: op.type,
              success: response.ok,
              responseTime: performance.now() - opStart
            };
          } catch (error) {
            return {
              type: op.type,
              success: false,
              responseTime: performance.now() - opStart,
              error: error.message
            };
          }
        })
      );
      
      const totalTime = performance.now() - startTime;
      
      // Analyze results by operation type
      const resultsByType = {
        health: results.filter(r => r.type === 'health'),
        create: results.filter(r => r.type === 'create'),
        state: results.filter(r => r.type === 'state')
      };
      
      console.log('Mixed Workload Performance Results:');
      console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Total Operations: ${results.length}`);
      console.log(`  Overall Throughput: ${(results.length / (totalTime / 1000)).toFixed(2)} ops/second`);
      
      Object.entries(resultsByType).forEach(([type, typeResults]) => {
        const successful = typeResults.filter(r => r.success);
        const avgTime = typeResults.reduce((sum, r) => sum + r.responseTime, 0) / typeResults.length;
        
        console.log(`  ${type}: ${successful.length}/${typeResults.length} success, ${avgTime.toFixed(2)}ms avg`);
      });
      
      // Mixed workload should maintain good performance across all operation types
      const overallSuccess = results.filter(r => r.success).length;
      expect(overallSuccess).toBeGreaterThan(results.length * 0.9);
    });
  });

  describe('Performance Under Load', () => {
    test('Performance degradation under sustained load', async () => {
      console.log('Testing performance under sustained load...');
      
      const testDuration = 60000; // 1 minute
      const batchSize = 10;
      const batchInterval = 2000; // 2 seconds
      
      const startTime = Date.now();
      const performanceData = [];
      
      while (Date.now() - startTime < testDuration) {
        const batchStart = performance.now();
        
        // Create batch of health check requests
        const batchPromises = Array(batchSize).fill(0).map(() => 
          measureEndpointPerformance('/api/health')
        );
        
        const batchResults = await Promise.all(batchPromises);
        const batchEnd = performance.now();
        
        const batchStats = {
          timestamp: Date.now() - startTime,
          batchDuration: batchEnd - batchStart,
          successCount: batchResults.filter(r => r.success).length,
          avgResponseTime: batchResults.reduce((sum, r) => sum + r.responseTime, 0) / batchResults.length,
          maxResponseTime: Math.max(...batchResults.map(r => r.responseTime))
        };
        
        performanceData.push(batchStats);
        
        // Wait before next batch
        await new Promise(resolve => setTimeout(resolve, batchInterval));
      }
      
      // Analyze performance degradation
      const firstQuarter = performanceData.slice(0, Math.floor(performanceData.length / 4));
      const lastQuarter = performanceData.slice(-Math.floor(performanceData.length / 4));
      
      const firstQuarterAvg = firstQuarter.reduce((sum, d) => sum + d.avgResponseTime, 0) / firstQuarter.length;
      const lastQuarterAvg = lastQuarter.reduce((sum, d) => sum + d.avgResponseTime, 0) / lastQuarter.length;
      const degradation = ((lastQuarterAvg - firstQuarterAvg) / firstQuarterAvg) * 100;
      
      const overallSuccessRate = performanceData.reduce((sum, d) => sum + d.successCount, 0) / 
                                (performanceData.length * batchSize) * 100;
      
      console.log('Sustained Load Performance Results:');
      console.log(`  Test Duration: ${testDuration / 1000} seconds`);
      console.log(`  Batches Completed: ${performanceData.length}`);
      console.log(`  Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
      console.log(`  First Quarter Avg: ${firstQuarterAvg.toFixed(2)}ms`);
      console.log(`  Last Quarter Avg: ${lastQuarterAvg.toFixed(2)}ms`);
      console.log(`  Performance Degradation: ${degradation.toFixed(1)}%`);
      
      // Performance should not degrade significantly over time
      expect(overallSuccessRate).toBeGreaterThan(95);
      expect(degradation).toBeLessThan(50); // Less than 50% degradation acceptable
    }, 70000); // 70 second timeout for 60 second test

    test('Memory usage performance impact', async () => {
      console.log('Testing memory usage impact on performance...');
      
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const heavyOperations = Array(100).fill(0).map(async (_, i) => {
        // Create game
        const game = await createPerformanceTestGame();
        
        // Deal cards
        await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Measure performance
        return await measureEndpointPerformance(`/api/game/${game.gameId}`);
      });
      
      const results = await Promise.all(heavyOperations);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      const responseTimes = results.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const successCount = results.filter(r => r.success).length;
      
      console.log('Memory Usage Performance Results:');
      console.log(`  Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Success Rate: ${(successCount / results.length * 100).toFixed(1)}%`);
      console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      
      // Performance should remain good even with memory pressure
      expect(successCount).toBeGreaterThan(results.length * 0.9);
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGETS.gameState * 2);
    });
  });
});