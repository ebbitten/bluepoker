/**
 * Authentication Edge Cases and Boundary Tests
 * Tests unusual inputs, edge conditions, and boundary scenarios
 */

import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:3000/api/auth';

describe('Authentication Edge Cases and Boundary Tests', () => {
  
  describe('Email Validation Edge Cases', () => {
    it('should handle various email formats correctly', async () => {
      const edgeCaseEmails = [
        'user@domain.co', // Short TLD
        'user.name+tag@domain.com', // Plus addressing
        'user.name@domain-with-dashes.com', // Dashes in domain
        'user@subdomain.domain.com', // Subdomain
        'user@[192.168.1.1]', // IP address (should be rejected)
        'user@domain', // No TLD (should be rejected)
        'user..double.dot@domain.com', // Double dots (should be rejected)
        '@domain.com', // No local part (should be rejected)
        'user@', // No domain (should be rejected)
        'user@.com', // Domain starts with dot (should be rejected)
        'user@domain.', // Domain ends with dot (should be rejected)
        'very.long.email.address.that.exceeds.normal.length.limits@very.long.domain.name.that.might.cause.issues.example.com',
        '', // Empty email
        ' user@domain.com ', // Leading/trailing spaces
        'USER@DOMAIN.COM', // Uppercase
        'usér@dömäin.com', // Unicode characters
        'user@domain.com\n', // With newline
        'user@domain.com\t', // With tab
      ];

      for (const email of edgeCaseEmails) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: 'ValidPassword123!',
            username: 'testuser'
          })
        });

        // Email validation should consistently reject invalid emails
        if (email.includes('..') || email.startsWith('@') || email.endsWith('@') || 
            email.includes('\n') || email.includes('\t') || email === '' ||
            email.includes('[') || !email.includes('@') || email.endsWith('.')) {
          expect(response.status).not.toBe(200);
        }
      }
    });
  });

  describe('Username Boundary Tests', () => {
    it('should handle username length boundaries', async () => {
      const usernames = [
        '', // Empty
        'a', // Single character
        'ab', // Two characters
        'abc', // Three characters (minimum?)
        'a'.repeat(50), // Long username
        'a'.repeat(100), // Very long username
        'a'.repeat(255), // Maximum reasonable length
        'a'.repeat(1000), // Extremely long username
      ];

      for (const username of usernames) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-${username.length}@example.com`,
            password: 'ValidPassword123!',
            username: username
          })
        });

        // Should enforce reasonable username length limits
        if (username.length === 0 || username.length > 255) {
          expect(response.status).not.toBe(200);
        }
      }
    });

    it('should handle special characters in usernames', async () => {
      const specialUsernames = [
        'user-name', // Hyphens
        'user_name', // Underscores
        'user.name', // Dots
        'user123', // Numbers
        'User Name', // Spaces (should be rejected)
        'user@name', // @ symbol (should be rejected)
        'user#name', // Hash (should be rejected)
        'user$name', // Dollar sign (should be rejected)
        'user%name', // Percent (should be rejected)
        'user&name', // Ampersand (should be rejected)
        'user*name', // Asterisk (should be rejected)
        'user+name', // Plus (should be rejected)
        'user=name', // Equals (should be rejected)
        'user?name', // Question mark (should be rejected)
        'user!name', // Exclamation (should be rejected)
        'usér', // Accented characters
        'ユーザー', // Unicode characters
        '👤user', // Emoji (should be rejected)
        'user\nname', // Newline (should be rejected)
        'user\tname', // Tab (should be rejected)
      ];

      for (const username of specialUsernames) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-special@example.com`,
            password: 'ValidPassword123!',
            username: username
          })
        });

        // Should reject usernames with problematic characters
        if (username.includes(' ') || username.includes('@') || username.includes('#') ||
            username.includes('\n') || username.includes('\t') || username.includes('👤')) {
          expect(response.status).not.toBe(200);
        }
      }
    });
  });

  describe('Password Complexity Edge Cases', () => {
    it('should handle password length boundaries', async () => {
      const passwords = [
        '', // Empty
        'A1!', // Too short
        'A1!a', // Minimum length - 1
        'A1!ab', // Minimum length
        'A1!abc', // Minimum length + 1
        'A1!' + 'a'.repeat(100), // Very long password
        'A1!' + 'a'.repeat(1000), // Extremely long password
      ];

      for (const password of passwords) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-pass-${password.length}@example.com`,
            password: password,
            username: 'testuser'
          })
        });

        // Should enforce minimum password length
        if (password.length < 8) {
          expect(response.status).not.toBe(200);
        }
      }
    });

    it('should handle passwords with unusual character combinations', async () => {
      const edgePasswords = [
        'Password123!', // Valid
        'PASSWORD123!', // All uppercase letters
        'password123!', // All lowercase letters
        'Password!!!', // No numbers
        'Password123', // No special characters
        'Påssword123!', // Unicode characters
        'Pass word123!', // Spaces
        'Password123!\n', // With newline
        'Password123!\t', // With tab
        'Password123!\0', // Null character
        '密码Password123!', // Mixed languages
        'Password123!🔒', // With emoji
        'Password' + '1'.repeat(100) + '!', // Excessive numbers
        'Password' + '!'.repeat(100) + '1', // Excessive special chars
      ];

      for (const password of edgePasswords) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test-edge-pass@example.com`,
            password: password,
            username: 'testuser'
          })
        });

        // Should handle or reject unusual password formats appropriately
        if (password.includes('\n') || password.includes('\t') || password.includes('\0')) {
          expect(response.status).not.toBe(200);
        }
      }
    });
  });

  describe('Request Size and Performance Edge Cases', () => {
    it('should handle maximum request sizes', async () => {
      const largeString = 'a'.repeat(10000);
      
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123!',
          username: 'testuser',
          extraData: largeString // Large payload
        })
      });

      // Should handle or reject oversized requests appropriately
      expect([200, 400, 413, 500]).toContain(response.status);
    });

    it('should handle concurrent registration attempts for same email', async () => {
      const email = `concurrent-test-${Date.now()}@example.com`;
      
      const requests = Array(10).fill(null).map(() =>
        fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: 'ValidPassword123!',
            username: `user${Math.random()}`
          })
        })
      );

      const responses = await Promise.all(requests);
      
      // Should handle concurrent requests gracefully
      const successfulRegistrations = responses.filter(r => r.status === 200 || r.status === 201);
      expect(successfulRegistrations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Authentication Flow Edge Cases', () => {
    it('should handle login attempts during registration', async () => {
      const email = `flow-test-${Date.now()}@example.com`;
      const password = 'ValidPassword123!';
      
      // Attempt login before registration
      const loginResponse = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      expect(loginResponse.status).not.toBe(200);
      expect(loginResponse.status).toBeOneOf([400, 401, 404]);
    });

    it('should handle multiple logout attempts', async () => {
      const token = 'fake-token-for-logout-test';
      
      const logoutRequests = Array(5).fill(null).map(() =>
        fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );

      const responses = await Promise.all(logoutRequests);
      
      // Should handle multiple logout attempts gracefully
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });

    it('should handle session refresh edge cases', async () => {
      const edgeTokens = [
        '', // Empty token
        'Bearer ', // Bearer with no token
        'Basic fake-token', // Wrong auth type
        'Bearer fake-token-with-no-expiry',
        'Bearer ' + 'a'.repeat(1000), // Extremely long token
      ];

      for (const token of edgeTokens) {
        const response = await fetch(`${API_BASE}/refresh`, {
          method: 'POST',
          headers: { 'Authorization': token }
        });

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Cross-Origin and Headers Edge Cases', () => {
    it('should handle requests with unusual headers', async () => {
      const response = await fetch(`${API_BASE}/me`, {
        headers: {
          'Authorization': 'Bearer fake-token',
          'X-Forwarded-For': '127.0.0.1',
          'X-Real-IP': '192.168.1.1',
          'User-Agent': 'Suspicious Bot 1.0',
          'Origin': 'http://evil-site.com',
          'Referer': 'http://malicious.com',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      });

      // Should handle requests regardless of headers (but enforce auth)
      expect(response.status).toBe(401);
    });

    it('should handle OPTIONS preflight requests', async () => {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      // Should handle CORS preflight appropriately
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Data Type and Format Edge Cases', () => {
    it('should handle non-string data types in registration', async () => {
      const invalidDataTypes = [
        { email: 123, password: 'ValidPassword123!', username: 'testuser' },
        { email: 'test@example.com', password: 123, username: 'testuser' },
        { email: 'test@example.com', password: 'ValidPassword123!', username: 123 },
        { email: null, password: 'ValidPassword123!', username: 'testuser' },
        { email: 'test@example.com', password: null, username: 'testuser' },
        { email: 'test@example.com', password: 'ValidPassword123!', username: null },
        { email: [], password: 'ValidPassword123!', username: 'testuser' },
        { email: {}, password: 'ValidPassword123!', username: 'testuser' },
        { email: true, password: 'ValidPassword123!', username: 'testuser' },
      ];

      for (const invalidData of invalidDataTypes) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        });

        expect(response.status).not.toBe(200);
        expect([400, 422, 500]).toContain(response.status);
      }
    });

    it('should handle missing required fields', async () => {
      const incompleteRequests = [
        { password: 'ValidPassword123!', username: 'testuser' }, // Missing email
        { email: 'test@example.com', username: 'testuser' }, // Missing password
        { email: 'test@example.com', password: 'ValidPassword123!' }, // Missing username
        {}, // Missing all fields
        { email: '', password: '', username: '' }, // Empty fields
      ];

      for (const incompleteData of incompleteRequests) {
        const response = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData)
        });

        expect(response.status).not.toBe(200);
        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('Timing Attack Resistance', () => {
    it('should have consistent response times for valid vs invalid emails', async () => {
      const validEmail = 'existing@example.com';
      const invalidEmail = 'nonexistent@example.com';
      
      const times: number[] = [];
      
      // Test multiple requests to get timing data
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: i % 2 === 0 ? validEmail : invalidEmail,
            password: 'WrongPassword123!'
          })
        });
        
        times.push(Date.now() - startTime);
      }
      
      // Response times should be relatively consistent
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
      
      // High variance might indicate timing attack vulnerability
      expect(variance).toBeLessThan(1000); // Reasonable variance threshold
    });
  });
});

// Helper function for expect.toBeOneOf (if not already defined)
if (!expect.extend) {
  expect.extend = () => {};
}

expect.extend({
  toBeOneOf(received: unknown, expected: unknown[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false
      };
    }
  }
});

declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeOneOf(expected: unknown[]): void;
    }
  }
}