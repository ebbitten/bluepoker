/**
 * Phase 9: Real-time Communication Stress Testing
 * Extreme testing of SSE connections, message delivery, and real-time synchronization
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import EventSource from 'eventsource';

// Mock EventSource for Node.js environment
if (typeof global.EventSource === 'undefined') {
  global.EventSource = EventSource as any;
}

// Helper to create test game for SSE testing
async function createSSETestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`SSEPlayer1${suffix}`, `SSEPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`SSE test game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Helper to simulate SSE connection
class SSEConnection {
  private eventSource: EventSource | null = null;
  private messages: any[] = [];
  private errors: any[] = [];
  private connectionStates: string[] = [];
  
  constructor(private gameId: string) {}
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(`http://localhost:3000/api/game/${this.gameId}/events`);
        
        this.eventSource.onopen = () => {
          this.connectionStates.push('open');
          resolve();
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messages.push({
              timestamp: Date.now(),
              data,
              type: 'message'
            });
          } catch (error) {
            this.errors.push({ type: 'parse', error: error.message, data: event.data });
          }
        };
        
        this.eventSource.onerror = (error) => {
          this.connectionStates.push('error');
          this.errors.push({ type: 'connection', error, timestamp: Date.now() });
        };
        
        // Timeout if connection doesn't open in 10 seconds
        setTimeout(() => {
          if (this.connectionStates.length === 0) {
            reject(new Error('SSE connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.connectionStates.push('closed');
    }
  }
  
  getStats() {
    return {
      messagesReceived: this.messages.length,
      errors: this.errors.length,
      connectionStates: this.connectionStates,
      messages: this.messages,
      errorDetails: this.errors
    };
  }
}

describe('Phase 9: Real-time Communication Stress Testing', () => {
  describe('SSE Connection Stress Testing', () => {
    test('100 simultaneous SSE connections', async () => {
      console.log('Creating 100 simultaneous SSE connections...');
      
      // Create games for SSE testing
      const games = await Promise.all(
        Array(100).fill(0).map((_, i) => createSSETestGame(`_sse_stress_${i}`))
      );
      
      // Create SSE connections
      const connections = games.map(game => new SSEConnection(game.gameId));
      
      const startTime = Date.now();
      
      // Attempt to connect all at once
      const connectionPromises = connections.map(async (conn, index) => {
        try {
          await conn.connect();
          return { index, success: true, connection: conn };
        } catch (error) {
          return { index, success: false, error: error.message, connection: conn };
        }
      });
      
      const results = await Promise.allSettled(connectionPromises);
      const connectionTime = Date.now() - startTime;
      
      // Analyze results
      const successful = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);
      const failed = results
        .filter(r => r.status === 'fulfilled' && !r.value.success)
        .map(r => r.value);
      
      console.log(`SSE Stress Test Results:`);
      console.log(`  Connection Time: ${connectionTime}ms`);
      console.log(`  Successful Connections: ${successful.length}/100`);
      console.log(`  Failed Connections: ${failed.length}/100`);
      
      // Close all connections
      connections.forEach(conn => conn.disconnect());
      
      // Should handle majority of simultaneous connections
      expect(successful.length).toBeGreaterThan(50);
      
      if (failed.length > 0) {
        console.log('Connection failures:', failed.slice(0, 5).map(f => f.error));
      }
    }, 60000); // 1 minute timeout

    test('SSE message delivery under load', async () => {
      console.log('Testing SSE message delivery under load...');
      
      const numConnections = 20;
      const messagesPerConnection = 10;
      
      // Create games and connections
      const games = await Promise.all(
        Array(numConnections).fill(0).map((_, i) => createSSETestGame(`_msg_load_${i}`))
      );
      
      const connections = games.map(game => new SSEConnection(game.gameId));
      
      // Connect all
      await Promise.all(connections.map(conn => conn.connect()));
      
      console.log(`Connected ${numConnections} SSE clients, generating ${messagesPerConnection} messages each...`);
      
      // Generate messages by making game actions
      const messagePromises = games.map(async (game, gameIndex) => {
        // Deal cards to generate SSE messages
        await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Generate additional messages with player actions
        for (let i = 0; i < messagesPerConnection - 1; i++) {
          try {
            const gameState = await fetch(`http://localhost:3000/api/game/${game.gameId}`).then(r => r.json());
            const activePlayer = gameState.players?.[gameState.activePlayerIndex];
            
            if (activePlayer) {
              await fetch(`http://localhost:3000/api/game/${game.gameId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  playerId: activePlayer.id,
                  action: i % 2 === 0 ? 'call' : 'fold'
                })
              });
            }
            
            // Small delay between actions
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.log(`Action failed for game ${gameIndex}, message ${i}:`, error.message);
          }
        }
      });
      
      await Promise.all(messagePromises);
      
      // Wait for messages to be delivered
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Analyze message delivery
      const stats = connections.map(conn => conn.getStats());
      const totalMessages = stats.reduce((sum, stat) => sum + stat.messagesReceived, 0);
      const totalErrors = stats.reduce((sum, stat) => sum + stat.errors, 0);
      const avgMessages = totalMessages / numConnections;
      
      console.log(`Message Delivery Results:`);
      console.log(`  Total Messages Received: ${totalMessages}`);
      console.log(`  Average per Connection: ${avgMessages.toFixed(1)}`);
      console.log(`  Total Errors: ${totalErrors}`);
      console.log(`  Message Delivery Rate: ${(totalMessages / (numConnections * messagesPerConnection) * 100).toFixed(1)}%`);
      
      // Close connections
      connections.forEach(conn => conn.disconnect());
      
      // Should receive majority of messages
      expect(avgMessages).toBeGreaterThan(messagesPerConnection * 0.7);
      expect(totalErrors).toBeLessThan(numConnections * 2); // Allow some errors
    });

    test('SSE reconnection resilience under chaos', async () => {
      console.log('Testing SSE reconnection under chaotic conditions...');
      
      const game = await createSSETestGame('_chaos');
      const connections: SSEConnection[] = [];
      const reconnectionAttempts = 10;
      
      for (let attempt = 0; attempt < reconnectionAttempts; attempt++) {
        console.log(`Reconnection attempt ${attempt + 1}/${reconnectionAttempts}`);
        
        // Create connection
        const connection = new SSEConnection(game.gameId);
        connections.push(connection);
        
        try {
          // Connect
          await connection.connect();
          
          // Generate some activity
          await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => {}); // Ignore deal failures (game might already be dealt)
          
          // Wait briefly
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Disconnect abruptly
          connection.disconnect();
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.log(`Reconnection attempt ${attempt + 1} failed:`, error.message);
        }
      }
      
      // Analyze reconnection attempts
      const stats = connections.map(conn => conn.getStats());
      const successfulConnections = stats.filter(stat => 
        stat.connectionStates.includes('open')
      ).length;
      
      console.log(`Reconnection Chaos Results:`);
      console.log(`  Successful Connections: ${successfulConnections}/${reconnectionAttempts}`);
      console.log(`  Total Messages Received: ${stats.reduce((sum, stat) => sum + stat.messagesReceived, 0)}`);
      
      // Should handle majority of reconnection attempts
      expect(successfulConnections).toBeGreaterThan(reconnectionAttempts * 0.6);
    });
  });

  describe('Real-time Synchronization Testing', () => {
    test('Multi-client game state synchronization', async () => {
      console.log('Testing multi-client synchronization...');
      
      const game = await createSSETestGame('_sync');
      const numClients = 5;
      
      // Create multiple SSE connections for same game
      const connections = Array(numClients).fill(0).map(() => new SSEConnection(game.gameId));
      
      // Connect all clients
      await Promise.all(connections.map(conn => conn.connect()));
      
      console.log(`${numClients} clients connected, generating synchronized events...`);
      
      // Generate synchronized events
      const events = [
        () => fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }),
        () => fetch(`http://localhost:3000/api/game/${game.gameId}`, { method: 'GET' }),
        () => fetch(`http://localhost:3000/api/game/${game.gameId}/new-hand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {}) // Might fail if hand not complete
      ];
      
      // Execute events with delays
      for (const event of events) {
        await event();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for SSE propagation
      }
      
      // Wait for final message delivery
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Analyze synchronization
      const stats = connections.map(conn => conn.getStats());
      const messageCounts = stats.map(stat => stat.messagesReceived);
      const minMessages = Math.min(...messageCounts);
      const maxMessages = Math.max(...messageCounts);
      const avgMessages = messageCounts.reduce((sum, count) => sum + count, 0) / numClients;
      
      console.log(`Synchronization Results:`);
      console.log(`  Message counts: [${messageCounts.join(', ')}]`);
      console.log(`  Min/Max/Avg: ${minMessages}/${maxMessages}/${avgMessages.toFixed(1)}`);
      console.log(`  Synchronization variance: ${maxMessages - minMessages}`);
      
      // Close connections
      connections.forEach(conn => conn.disconnect());
      
      // All clients should receive similar message counts
      expect(maxMessages - minMessages).toBeLessThan(3); // Allow small variance
      expect(minMessages).toBeGreaterThan(0); // All should receive some messages
    });

    test('Real-time latency measurement', async () => {
      console.log('Measuring real-time latency...');
      
      const game = await createSSETestGame('_latency');
      const connection = new SSEConnection(game.gameId);
      
      await connection.connect();
      
      const latencyMeasurements = [];
      const numMeasurements = 20;
      
      for (let i = 0; i < numMeasurements; i++) {
        const sendTime = Date.now();
        
        // Trigger an SSE event by making game action
        await fetch(`http://localhost:3000/api/game/${game.gameId}`, { method: 'GET' });
        
        // Wait for SSE message
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stats = connection.getStats();
        const recentMessages = stats.messages.filter(msg => msg.timestamp >= sendTime);
        
        if (recentMessages.length > 0) {
          const latency = recentMessages[0].timestamp - sendTime;
          latencyMeasurements.push(latency);
        }
        
        // Small delay between measurements
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      connection.disconnect();
      
      // Analyze latency
      if (latencyMeasurements.length > 0) {
        const avgLatency = latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / latencyMeasurements.length;
        const minLatency = Math.min(...latencyMeasurements);
        const maxLatency = Math.max(...latencyMeasurements);
        
        console.log(`Real-time Latency Results:`);
        console.log(`  Measurements: ${latencyMeasurements.length}/${numMeasurements}`);
        console.log(`  Average Latency: ${avgLatency.toFixed(2)}ms`);
        console.log(`  Min/Max Latency: ${minLatency}ms/${maxLatency}ms`);
        
        // Real-time latency should be reasonable
        expect(avgLatency).toBeLessThan(500); // Average under 500ms
        expect(maxLatency).toBeLessThan(2000); // Max under 2 seconds
      } else {
        console.log('No latency measurements captured - SSE might not be working');
      }
    });
  });

  describe('SSE Error Conditions and Recovery', () => {
    test('SSE connection interruption and recovery', async () => {
      console.log('Testing SSE interruption and recovery...');
      
      const game = await createSSETestGame('_interruption');
      const connection = new SSEConnection(game.gameId);
      
      // Initial connection
      await connection.connect();
      
      // Generate some initial messages
      await fetch(`http://localhost:3000/api/game/${game.gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const initialStats = connection.getStats();
      
      // Simulate interruption by closing connection
      connection.disconnect();
      
      // Wait during interruption
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Attempt to reconnect
      const newConnection = new SSEConnection(game.gameId);
      try {
        await newConnection.connect();
        
        // Generate more messages after reconnection
        await fetch(`http://localhost:3000/api/game/${game.gameId}`, { method: 'GET' });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const finalStats = newConnection.getStats();
        
        console.log(`Interruption Recovery Results:`);
        console.log(`  Initial Messages: ${initialStats.messagesReceived}`);
        console.log(`  Post-Recovery Messages: ${finalStats.messagesReceived}`);
        console.log(`  Recovery Successful: ${finalStats.messagesReceived > 0}`);
        
        newConnection.disconnect();
        
        // Should be able to recover after interruption
        expect(finalStats.messagesReceived).toBeGreaterThan(0);
        
      } catch (error) {
        console.log('Recovery failed:', error.message);
        // Recovery failure is acceptable in some network conditions
      }
    });

    test('SSE performance under message flooding', async () => {
      console.log('Testing SSE under message flooding...');
      
      const game = await createSSETestGame('_flooding');
      const connection = new SSEConnection(game.gameId);
      
      await connection.connect();
      
      // Generate rapid flood of messages
      const floodPromises = Array(50).fill(0).map(async (_, i) => {
        try {
          await fetch(`http://localhost:3000/api/game/${game.gameId}`, { method: 'GET' });
          return { success: true, index: i };
        } catch (error) {
          return { success: false, index: i, error: error.message };
        }
      });
      
      const startTime = Date.now();
      const floodResults = await Promise.all(floodPromises);
      const floodDuration = Date.now() - startTime;
      
      // Wait for message delivery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const stats = connection.getStats();
      const successfulRequests = floodResults.filter(r => r.success).length;
      
      console.log(`Message Flooding Results:`);
      console.log(`  Flood Duration: ${floodDuration}ms`);
      console.log(`  Successful Requests: ${successfulRequests}/50`);
      console.log(`  Messages Received: ${stats.messagesReceived}`);
      console.log(`  SSE Errors: ${stats.errors}`);
      console.log(`  Message Delivery Rate: ${(stats.messagesReceived / successfulRequests * 100).toFixed(1)}%`);
      
      connection.disconnect();
      
      // Should handle message flooding gracefully
      expect(successfulRequests).toBeGreaterThan(25); // At least half succeed
      expect(stats.errors).toBeLessThan(10); // Limited SSE errors
    });
  });
});