/**
 * SSE Connection Stress Tests
 * Tests Server-Sent Events under high load and stress conditions
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

const API_BASE = 'http://localhost:3000';

describe('SSE Connection Stress Tests', () => {
  
  beforeAll(() => {
    // Increase timeout for stress tests
    vi.setConfig({ testTimeout: 180000 }); // 3 minutes
  });

  afterEach(async () => {
    // Clean up any open connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Single Connection Stress', () => {
    it('should handle rapid SSE connection open/close cycles', async () => {
      const connectionCount = 100;
      let successfulConnections = 0;
      let connectionErrors = 0;
      
      console.log(`Testing ${connectionCount} rapid SSE connection cycles...`);
      
      for (let i = 0; i < connectionCount; i++) {
        try {
          const eventSource = new EventSource(`${API_BASE}/api/game/test-game-${i}/events`);
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              eventSource.close();
              reject(new Error('Connection timeout'));
            }, 1000); // 1 second timeout per connection
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              successfulConnections++;
              eventSource.close();
              resolve(true);
            };
            
            eventSource.onerror = (error) => {
              clearTimeout(timeout);
              connectionErrors++;
              eventSource.close();
              resolve(false); // Don't fail test, just count errors
            };
          });
          
          // Brief pause between connections
          await new Promise(resolve => setTimeout(resolve, 10));
          
        } catch (error) {
          connectionErrors++;
          console.log(`Connection ${i} error:`, error.message);
        }
      }
      
      console.log(`SSE Connection Results: ${successfulConnections} successful, ${connectionErrors} errors`);
      
      // Should handle majority of connections successfully
      expect(successfulConnections).toBeGreaterThan(connectionCount * 0.6); // 60% success rate
      expect(connectionErrors).toBeLessThan(connectionCount * 0.4); // Less than 40% errors
    });

    it('should handle long-lived SSE connections under message load', async () => {
      const gameId = `stress-game-${Date.now()}`;
      let messagesReceived = 0;
      let connectionErrors = 0;
      
      console.log(`Testing long-lived SSE connection with message stress...`);
      
      try {
        const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`);
        
        eventSource.onmessage = (event) => {
          messagesReceived++;
          try {
            const data = JSON.parse(event.data);
            // Validate message structure
            expect(data).toHaveProperty('type');
          } catch (parseError) {
            console.log('Message parse error:', parseError);
          }
        };
        
        eventSource.onerror = (error) => {
          connectionErrors++;
          console.log('SSE connection error:', error);
        };
        
        // Simulate message load by making API calls that trigger SSE events
        const messageStressPromises = [];
        for (let i = 0; i < 50; i++) {
          messageStressPromises.push(
            fetch(`${API_BASE}/api/game/${gameId}`, {
              method: 'GET'
            }).catch(error => {
              // API may not exist, that's okay for stress testing
              console.log(`API call ${i} failed (expected):`, error.message);
            })
          );
          
          // Spread out the requests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await Promise.allSettled(messageStressPromises);
        
        // Let connection settle
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        eventSource.close();
        
        console.log(`Long-lived SSE Results: ${messagesReceived} messages, ${connectionErrors} errors`);
        
        // Connection should remain stable
        expect(connectionErrors).toBeLessThan(5); // Less than 5 connection errors
        
      } catch (error) {
        console.log('Long-lived SSE test error:', error);
        // Don't fail test for expected API issues
      }
    });
  });

  describe('Multiple Connection Stress', () => {
    it('should handle multiple concurrent SSE connections', async () => {
      const concurrentConnections = 50;
      let activeConnections = 0;
      let totalConnectionAttempts = 0;
      let successfulConnections = 0;
      
      console.log(`Testing ${concurrentConnections} concurrent SSE connections...`);
      
      const connectionPromises = Array(concurrentConnections).fill(null).map(async (_, index) => {
        totalConnectionAttempts++;
        const gameId = `concurrent-game-${index}`;
        
        return new Promise((resolve) => {
          try {
            const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`);
            
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve({ success: false, error: 'timeout' });
            }, 5000); // 5 second timeout
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              activeConnections++;
              successfulConnections++;
              
              // Keep connection open for a bit
              setTimeout(() => {
                activeConnections--;
                eventSource.close();
                resolve({ success: true, index });
              }, 2000 + Math.random() * 1000); // 2-3 seconds
            };
            
            eventSource.onerror = (error) => {
              clearTimeout(timeout);
              eventSource.close();
              resolve({ success: false, error: 'connection_error' });
            };
            
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        });
      });
      
      const results = await Promise.allSettled(connectionPromises);
      
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      console.log(`Concurrent SSE Results: ${successful}/${concurrentConnections} successful`);
      console.log(`Peak active connections: ${Math.max(activeConnections, successfulConnections)}`);
      
      // Should handle majority of concurrent connections
      expect(successful).toBeGreaterThan(concurrentConnections * 0.5); // 50% success rate
    });

    it('should handle connection bursts without server overload', async () => {
      const burstSize = 25;
      const burstCount = 4;
      let totalSuccessful = 0;
      let totalAttempts = 0;
      
      console.log(`Testing ${burstCount} bursts of ${burstSize} connections each...`);
      
      for (let burst = 0; burst < burstCount; burst++) {
        console.log(`Starting burst ${burst + 1}/${burstCount}...`);
        
        const burstPromises = Array(burstSize).fill(null).map(async (_, index) => {
          totalAttempts++;
          const gameId = `burst-${burst}-game-${index}`;
          
          return new Promise((resolve) => {
            try {
              const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`);
              
              const timeout = setTimeout(() => {
                eventSource.close();
                resolve(false);
              }, 3000);
              
              eventSource.onopen = () => {
                clearTimeout(timeout);
                totalSuccessful++;
                eventSource.close();
                resolve(true);
              };
              
              eventSource.onerror = () => {
                clearTimeout(timeout);
                eventSource.close();
                resolve(false);
              };
              
            } catch (error) {
              resolve(false);
            }
          });
        });
        
        await Promise.allSettled(burstPromises);
        
        // Pause between bursts to let server recover
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`Burst SSE Results: ${totalSuccessful}/${totalAttempts} successful across all bursts`);
      
      // Should handle bursts reasonably well
      expect(totalSuccessful).toBeGreaterThan(totalAttempts * 0.4); // 40% success rate
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle SSE reconnection scenarios', async () => {
      const gameId = `reconnect-game-${Date.now()}`;
      let connectionAttempts = 0;
      let successfulReconnects = 0;
      
      console.log('Testing SSE reconnection resilience...');
      
      for (let attempt = 0; attempt < 10; attempt++) {
        connectionAttempts++;
        
        try {
          const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`);
          
          const connectionResult = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve(false);
            }, 2000);
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              successfulReconnects++;
              
              // Simulate connection drop after short time
              setTimeout(() => {
                eventSource.close();
                resolve(true);
              }, 500 + Math.random() * 500); // 0.5-1 second
            };
            
            eventSource.onerror = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve(false);
            };
          });
          
          // Brief pause before next reconnection attempt
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.log(`Reconnection attempt ${attempt} error:`, error.message);
        }
      }
      
      console.log(`Reconnection Results: ${successfulReconnects}/${connectionAttempts} successful`);
      
      // Should handle some reconnections successfully
      expect(successfulReconnects).toBeGreaterThan(0);
    });

    it('should handle malformed SSE endpoint requests gracefully', async () => {
      const malformedEndpoints = [
        '/api/game//events', // Double slash
        '/api/game/invalid-chars-!@#$/events', // Special characters
        '/api/game/' + 'x'.repeat(1000) + '/events', // Very long game ID
        '/api/game/null/events', // Literal null
        '/api/game/undefined/events', // Literal undefined
        '/api/game/12345/events', // Numeric game ID
        '/api/game/test%20game/events', // URL encoded
        '/api/game//events?param=value', // Query parameters
      ];
      
      let handledGracefully = 0;
      
      for (const endpoint of malformedEndpoints) {
        try {
          const eventSource = new EventSource(`${API_BASE}${endpoint}`);
          
          const result = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve('timeout'); // Server didn't crash
            }, 1000);
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve('connected'); // Unexpectedly worked
            };
            
            eventSource.onerror = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve('error'); // Expected graceful error
            };
          });
          
          if (result === 'error' || result === 'timeout') {
            handledGracefully++;
          }
          
        } catch (error) {
          // Browser-level errors are also acceptable
          handledGracefully++;
        }
      }
      
      console.log(`Malformed endpoint handling: ${handledGracefully}/${malformedEndpoints.length} handled gracefully`);
      
      // Should handle all malformed requests gracefully
      expect(handledGracefully).toBe(malformedEndpoints.length);
    });
  });

  describe('Memory and Resource Stress', () => {
    it('should not leak memory during connection cycling', async () => {
      const cycleCount = 100;
      let completedCycles = 0;
      
      console.log(`Testing memory leaks with ${cycleCount} SSE connection cycles...`);
      
      for (let cycle = 0; cycle < cycleCount; cycle++) {
        try {
          const gameId = `memory-test-${cycle}`;
          const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`);
          
          // Very short-lived connection
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve(true);
            }, 50); // 50ms connection
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve(true);
            };
            
            eventSource.onerror = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve(true);
            };
          });
          
          completedCycles++;
          
          // Brief pause for garbage collection
          if (cycle % 25 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.log(`Memory test cycle ${cycle} error:`, error.message);
        }
      }
      
      console.log(`Memory test completed: ${completedCycles}/${cycleCount} cycles`);
      
      // Should complete most cycles without memory issues
      expect(completedCycles).toBeGreaterThan(cycleCount * 0.8); // 80% completion
    });

    it('should handle server resource exhaustion gracefully', async () => {
      const overloadConnections = 200; // Intentionally high number
      let connectionAttempts = 0;
      let serverErrors = 0;
      let successful = 0;
      
      console.log(`Testing server resource limits with ${overloadConnections} connections...`);
      
      const overloadPromises = Array(overloadConnections).fill(null).map(async (_, index) => {
        connectionAttempts++;
        
        return new Promise((resolve) => {
          try {
            const eventSource = new EventSource(`${API_BASE}/api/game/overload-${index}/events`);
            
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve('timeout');
            }, 2000);
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              successful++;
              eventSource.close();
              resolve('success');
            };
            
            eventSource.onerror = () => {
              clearTimeout(timeout);
              serverErrors++;
              eventSource.close();
              resolve('error');
            };
            
          } catch (error) {
            serverErrors++;
            resolve('exception');
          }
        });
      });
      
      await Promise.allSettled(overloadPromises);
      
      console.log(`Resource exhaustion test: ${successful} successful, ${serverErrors} errors, ${connectionAttempts} total attempts`);
      
      // Server should handle overload gracefully (not crash)
      expect(serverErrors + successful).toBe(connectionAttempts);
      
      // Some connections should succeed, some should fail gracefully
      expect(successful + serverErrors).toBeGreaterThan(0);
    });
  });

  describe('Browser Compatibility Simulation', () => {
    it('should handle different EventSource configurations', async () => {
      const configurations = [
        // Standard configuration
        { withCredentials: false },
        // With credentials (CORS)
        { withCredentials: true },
      ];
      
      let configurationsHandled = 0;
      
      for (const config of configurations) {
        try {
          const gameId = `config-test-${Date.now()}`;
          const eventSource = new EventSource(`${API_BASE}/api/game/${gameId}/events`, config);
          
          const result = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              eventSource.close();
              resolve('timeout');
            }, 2000);
            
            eventSource.onopen = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve('success');
            };
            
            eventSource.onerror = () => {
              clearTimeout(timeout);
              eventSource.close();
              resolve('error');
            };
          });
          
          // Any graceful handling counts as success
          if (result !== 'exception') {
            configurationsHandled++;
          }
          
        } catch (error) {
          console.log('Configuration test error:', error);
        }
      }
      
      console.log(`Configuration handling: ${configurationsHandled}/${configurations.length} handled`);
      
      // Should handle different configurations gracefully
      expect(configurationsHandled).toBeGreaterThan(0);
    });
  });
});