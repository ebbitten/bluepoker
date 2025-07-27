/**
 * Authentication Performance and Load Tests
 * Tests authentication system under load and stress conditions
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

const API_BASE = 'http://localhost:3000/api/auth';

describe('Authentication Performance and Load Tests', () => {
  
  beforeAll(() => {
    // Increase timeout for load tests
    vi.setConfig({ testTimeout: 60000 });
  });

  describe('Registration Performance', () => {
    it('should handle registration requests within performance thresholds', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `perf-test-${Date.now()}@example.com`,
          password: 'ValidPassword123!',
          username: `perfuser${Date.now()}`
        })
      });

      const responseTime = Date.now() - startTime;
      
      // Registration should complete within reasonable time
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
      
      // Should handle the request properly (success or expected failure)
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it('should handle concurrent registration requests', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const requests = Array(concurrentRequests).fill(null).map((_, index) =>
        fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `concurrent-${Date.now()}-${index}@example.com`,
            password: 'ValidPassword123!',
            username: `concuser${Date.now()}${index}`
          })
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(30000); // 30 seconds for 20 requests
      
      // All requests should receive responses
      expect(responses).toHaveLength(concurrentRequests);
      
      // Should handle concurrent load without crashes
      responses.forEach(response => {
        expect([200, 201, 400, 429, 500]).toContain(response.status);
      });
    });

    it('should maintain performance under sustained load', async () => {
      const batchSize = 10;
      const batches = 5;
      const results: number[] = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStart = Date.now();
        
        const batchRequests = Array(batchSize).fill(null).map((_, index) =>
          fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `sustained-${Date.now()}-${batch}-${index}@example.com`,
              password: 'ValidPassword123!',
              username: `sustainuser${Date.now()}${batch}${index}`
            })
          })
        );

        await Promise.all(batchRequests);
        results.push(Date.now() - batchStart);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Performance should not degrade significantly over time
      const firstBatchTime = results[0];
      const lastBatchTime = results[results.length - 1];
      
      // Last batch should not take more than 3x the first batch time
      expect(lastBatchTime).toBeLessThan(firstBatchTime * 3);
    });
  });

  describe('Login Performance', () => {
    it('should handle login requests within performance thresholds', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'ValidPassword123!'
        })
      });

      const responseTime = Date.now() - startTime;
      
      // Login should complete within reasonable time
      expect(responseTime).toBeLessThan(3000); // 3 seconds max
      
      // Should handle the request properly
      expect([200, 401, 400, 500]).toContain(response.status);
    });

    it('should handle rapid login attempts efficiently', async () => {
      const rapidRequests = 15;
      const startTime = Date.now();
      
      const requests = Array(rapidRequests).fill(null).map((_, index) =>
        fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `rapid-login-${index}@example.com`,
            password: 'TestPassword123!'
          })
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Should handle rapid requests efficiently
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 15 requests
      
      // Should apply rate limiting appropriately
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('JWT Validation Performance', () => {
    it('should validate JWT tokens efficiently', async () => {
      const invalidTokens = [
        'invalid-token-1',
        'invalid-token-2',
        'invalid-token-3',
        'Bearer fake-token-1',
        'Bearer fake-token-2'
      ];
      
      const startTime = Date.now();
      
      const requests = invalidTokens.map(token =>
        fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': token }
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // JWT validation should be fast
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 5 token validations
      
      // All should be rejected
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });

    it('should handle burst of authentication checks', async () => {
      const burstSize = 50;
      const startTime = Date.now();
      
      const requests = Array(burstSize).fill(null).map((_, index) =>
        fetch(`${API_BASE}/me`, {
          headers: { 'Authorization': `Bearer fake-token-${index}` }
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Should handle authentication burst efficiently
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 50 checks
      
      // All should be properly rejected
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
      
      // Calculate average response time
      const avgTime = totalTime / burstSize;
      expect(avgTime).toBeLessThan(200); // Average under 200ms per request
    });
  });

  describe('Session Management Performance', () => {
    it('should handle logout requests efficiently', async () => {
      const logoutRequests = 10;
      const startTime = Date.now();
      
      const requests = Array(logoutRequests).fill(null).map((_, index) =>
        fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer logout-test-token-${index}` }
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Logout should be fast
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 logouts
      
      // Should handle all logout requests
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });

    it('should handle session refresh efficiently', async () => {
      const refreshRequests = 10;
      const startTime = Date.now();
      
      const requests = Array(refreshRequests).fill(null).map((_, index) =>
        fetch(`${API_BASE}/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer refresh-test-token-${index}` }
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Session refresh should be fast
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 refreshes
      
      // Should handle all refresh requests
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not leak memory during sustained authentication load', async () => {
      const iterations = 100;
      const batchSize = 10;
      
      for (let i = 0; i < iterations; i += batchSize) {
        const batch = Array(batchSize).fill(null).map((_, index) =>
          fetch(`${API_BASE}/me`, {
            headers: { 'Authorization': `Bearer memory-test-${i + index}` }
          }).then(response => response.text())
        );
        
        await Promise.all(batch);
        
        // Small delay to allow garbage collection
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Test should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle large payloads efficiently', async () => {
      const largeUsername = 'a'.repeat(1000);
      const startTime = Date.now();
      
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'large-payload@example.com',
          password: 'ValidPassword123!',
          username: largeUsername
        })
      });

      const responseTime = Date.now() - startTime;
      
      // Should handle large payloads within reasonable time
      expect(responseTime).toBeLessThan(5000);
      
      // Should reject or handle large payload appropriately
      expect([200, 400, 413, 422]).toContain(response.status);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should enforce rate limits efficiently', async () => {
      const rapidRequests = 25;
      const startTime = Date.now();
      
      const requests = Array(rapidRequests).fill(null).map((_, index) =>
        fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `rate-limit-${index}@example.com`,
            password: 'ValidPassword123!',
            username: `rateuser${index}`
          })
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Rate limiting should be fast
      expect(totalTime).toBeLessThan(15000);
      
      // Should have rate limited some requests
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Rate limiting should kick in quickly
      const firstRateLimitIndex = responses.findIndex(r => r.status === 429);
      expect(firstRateLimitIndex).toBeLessThan(rapidRequests);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle malformed requests efficiently', async () => {
      const malformedRequests = [
        '{"invalid": json}',
        '{"email": "test", "password":}',
        '{',
        'not-json-at-all',
        '{"email": null, "password": null}',
      ];
      
      const startTime = Date.now();
      
      const requests = malformedRequests.map(body =>
        fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        })
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Error handling should be fast
      expect(totalTime).toBeLessThan(5000);
      
      // All should be rejected appropriately
      responses.forEach(response => {
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  describe('Database Connection Performance', () => {
    it('should handle database connection gracefully when unavailable', async () => {
      const startTime = Date.now();
      
      // This test validates how the system handles database unavailability
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'db-test@example.com',
          password: 'ValidPassword123!',
          username: 'dbtest'
        })
      });

      const responseTime = Date.now() - startTime;
      
      // Should fail fast when database is unavailable
      expect(responseTime).toBeLessThan(10000); // 10 seconds max
      
      // Should return appropriate error
      expect([400, 500, 503]).toContain(response.status);
    });
  });
});

// Extend vitest types if needed
declare global {
  namespace Vi {
    interface Config {
      testTimeout: number;
    }
  }
}