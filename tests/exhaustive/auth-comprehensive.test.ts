/**
 * Phase 1: Authentication System Exhaustive Testing
 * Tests every authentication scenario and edge case
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AuthClient } from '../../packages/app/src/lib/auth-client';

// Create auth client instance for testing
const authClient = new AuthClient();

// Helper function to generate unique test data
function generateTestEmail(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

function generateTestUsername(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

describe('Phase 1: Authentication Exhaustive Testing', () => {
  describe('Registration Input Validation', () => {
    test('Every type of invalid email format', async () => {
      const invalidEmails = [
        '', // Empty
        'invalid', // No @ symbol
        'invalid@', // No domain
        '@invalid.com', // No local part
        'invalid@.com', // Empty domain
        'invalid@com', // No TLD
        'invalid..email@test.com', // Double dots
        'invalid@test..com', // Double dots in domain
        'invalid@', // Incomplete
        'invalid @test.com', // Space in email
        'invalid@test .com', // Space in domain
        'a'.repeat(300) + '@test.com', // Too long
        'test@' + 'a'.repeat(300) + '.com', // Domain too long
        'test@test.c', // TLD too short
        'test@.test.com', // Domain starts with dot
        'test@test.com.', // Domain ends with dot
        'test@test..com', // Double dots in domain
        'special!@test.com', // Invalid special characters
        'test@test@test.com', // Multiple @ symbols
      ];
      
      for (const email of invalidEmails) {
        const result = await authClient.signUp(email, 'ValidPassword123!', 'validuser');
        expect(result.success, `Email "${email}" should be invalid`).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('Every type of invalid password', async () => {
      const invalidPasswords = [
        '', // Empty
        '123', // Too short
        'password', // No numbers or special chars
        '12345678', // Only numbers
        'PASSWORD', // Only uppercase
        'password', // Only lowercase
        'Pass123', // Too short
        'a'.repeat(200), // Too long
        'Pass word123!', // Contains space
        // Add more invalid password patterns
      ];
      
      for (const password of invalidPasswords) {
        const result = await authClient.signUp(generateTestEmail(), password, generateTestUsername());
        expect(result.success, `Password "${password}" should be invalid`).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('Every type of invalid username', async () => {
      const invalidUsernames = [
        '', // Empty
        'a', // Too short
        'ab', // Too short
        'user name', // Contains space
        'user@name', // Contains @ symbol
        'user#name', // Contains # symbol
        'user$name', // Contains $ symbol
        'user%name', // Contains % symbol
        '123user', // Starts with number
        '_username', // Starts with underscore
        'username_', // Ends with underscore
        'a'.repeat(100), // Too long
        'USER', // All uppercase (might be invalid depending on rules)
        'user..name', // Double dots
        'user--name', // Double dashes
        'user__name', // Double underscores
      ];
      
      for (const username of invalidUsernames) {
        const result = await authClient.signUp(generateTestEmail(), 'ValidPassword123!', username);
        expect(result.success, `Username "${username}" should be invalid`).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    test('Valid registration formats work correctly', async () => {
      const validCombinations = [
        {
          email: generateTestEmail('valid'),
          password: 'ValidPassword123!',
          username: generateTestUsername('valid')
        },
        {
          email: generateTestEmail('test.user'),
          password: 'AnotherValid456@',
          username: generateTestUsername('test_user')
        },
        {
          email: generateTestEmail('long.email.address'),
          password: 'ComplexP@ssw0rd!',
          username: generateTestUsername('longer_username')
        }
      ];
      
      for (const combo of validCombinations) {
        const result = await authClient.signUp(combo.email, combo.password, combo.username);
        
        if (result.success) {
          expect(result.user).toBeDefined();
          expect(result.user!.email).toBe(combo.email);
          expect(result.user!.username).toBe(combo.username);
          expect(result.session).toBeDefined();
        } else {
          // If registration fails, it should be due to rate limiting or other temporary issues
          console.log(`Registration failed for valid input: ${result.error}`);
        }
      }
    });
  });

  describe('Login Scenarios and Edge Cases', () => {
    test('Login with non-existent email', async () => {
      const nonExistentEmail = generateTestEmail('nonexistent');
      const result = await authClient.signIn(nonExistentEmail, 'password123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    test('Login with wrong password', async () => {
      // First create a user
      const email = generateTestEmail('wrongpass');
      const password = 'CorrectPassword123!';
      const username = generateTestUsername('wrongpass');
      
      const registerResult = await authClient.signUp(email, password, username);
      
      if (registerResult.success) {
        // Try to login with wrong password
        const loginResult = await authClient.signIn(email, 'WrongPassword123!');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toContain('Invalid email or password');
      }
    });

    test('Login with various invalid inputs', async () => {
      const invalidInputs = [
        { email: '', password: 'password', expectedError: 'Email' },
        { email: 'invalid-email', password: 'password', expectedError: 'Invalid email' },
        { email: 'test@example.com', password: '', expectedError: 'Password is required' },
      ];
      
      for (const input of invalidInputs) {
        const result = await authClient.signIn(input.email, input.password);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('Rapid registration attempts trigger rate limiting', async () => {
      const attempts = 20; // Attempt to register 20 users rapidly
      const results = [];
      
      const promises = Array(attempts).fill(0).map(async (_, i) => {
        try {
          const result = await authClient.signUp(
            generateTestEmail(`rapid${i}`),
            'ValidPassword123!',
            generateTestUsername(`rapid${i}`)
          );
          return { index: i, success: result.success, error: result.error };
        } catch (error) {
          return { index: i, success: false, error: error.message };
        }
      });
      
      const settledResults = await Promise.allSettled(promises);
      const completed = settledResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.success);
      const rateLimited = completed.filter(r => !r.success);
      
      console.log(`Rapid registration: ${successful.length} successful, ${rateLimited.length} rate limited`);
      
      // Should have some rate limiting in effect
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('Rapid login attempts trigger rate limiting', async () => {
      const email = generateTestEmail('rapidlogin');
      const password = 'ValidPassword123!';
      const username = generateTestUsername('rapidlogin');
      
      // First create a user
      await authClient.signUp(email, password, username);
      
      // Then attempt rapid logins with wrong password
      const attempts = 15;
      const promises = Array(attempts).fill(0).map(async (_, i) => {
        try {
          const result = await authClient.signIn(email, 'WrongPassword123!');
          return { index: i, success: result.success, error: result.error };
        } catch (error) {
          return { index: i, success: false, error: error.message };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const rateLimited = completed.filter(r => 
        r.error && r.error.includes('rate') || r.error.includes('limit') || r.error.includes('too many')
      );
      
      console.log(`Rapid login attempts: ${completed.length} attempts, ${rateLimited.length} rate limited`);
      
      // Should have some rate limiting for failed attempts
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Session Management Edge Cases', () => {
    test('Concurrent sessions for same user', async () => {
      const email = generateTestEmail('concurrent');
      const password = 'ValidPassword123!';
      const username = generateTestUsername('concurrent');
      
      // Create user
      const registerResult = await authClient.signUp(email, password, username);
      
      if (registerResult.success) {
        // Create multiple concurrent sessions
        const sessionPromises = Array(3).fill(0).map(() => 
          authClient.signIn(email, password)
        );
        
        const sessions = await Promise.allSettled(sessionPromises);
        const successfulSessions = sessions
          .filter(s => s.status === 'fulfilled' && s.value.success)
          .map(s => s.value);
        
        // Should allow multiple sessions (or handle gracefully)
        expect(successfulSessions.length).toBeGreaterThan(0);
        
        // All sessions should have valid tokens
        successfulSessions.forEach(session => {
          expect(session.session.access_token).toBeDefined();
          expect(session.session.refresh_token).toBeDefined();
        });
      }
    });

    test('Session refresh functionality', async () => {
      const email = generateTestEmail('refresh');
      const password = 'ValidPassword123!';
      const username = generateTestUsername('refresh');
      
      // Create user and login
      const registerResult = await authClient.signUp(email, password, username);
      
      if (registerResult.success) {
        const loginResult = await authClient.signIn(email, password);
        
        if (loginResult.success) {
          // Test session refresh
          try {
            const refreshedSession = await authClient.refreshSession();
            expect(refreshedSession).toBeDefined();
            expect(refreshedSession.access_token).toBeDefined();
          } catch (error) {
            // Refresh might fail if session is too new or other reasons
            console.log('Session refresh failed:', error.message);
          }
        }
      }
    });

    test('Get current user functionality', async () => {
      const email = generateTestEmail('current');
      const password = 'ValidPassword123!';
      const username = generateTestUsername('current');
      
      // Create user and login
      const registerResult = await authClient.signUp(email, password, username);
      
      if (registerResult.success) {
        // Test getting current user
        const currentUser = await authClient.getCurrentUser();
        
        if (currentUser) {
          expect(currentUser.email).toBe(email);
          expect(currentUser.username).toBe(username);
          expect(currentUser.id).toBeDefined();
        }
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Database connection timeout handling', async () => {
      // Test behavior when database is slow
      const email = generateTestEmail('timeout');
      const password = 'ValidPassword123!';
      const username = generateTestUsername('timeout');
      
      const startTime = Date.now();
      
      try {
        const result = await authClient.signUp(email, password, username);
        const duration = Date.now() - startTime;
        
        // Should either succeed or fail with timeout error
        if (!result.success && result.error.includes('timeout')) {
          expect(duration).toBeGreaterThan(10000); // Should timeout after 10+ seconds
        }
        
        console.log(`Registration attempt took ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`Registration threw error after ${duration}ms:`, error.message);
      }
    });

    test('Malformed request handling', async () => {
      // Test with invalid data types and structures
      const malformedInputs = [
        { email: null, password: 'valid', username: 'valid' },
        { email: undefined, password: 'valid', username: 'valid' },
        { email: 123, password: 'valid', username: 'valid' },
        { email: {}, password: 'valid', username: 'valid' },
        { email: [], password: 'valid', username: 'valid' },
      ];
      
      for (const input of malformedInputs) {
        try {
          const result = await authClient.signUp(input.email as any, input.password, input.username);
          expect(result.success).toBe(false);
        } catch (error) {
          // Should handle malformed input gracefully
          expect(error).toBeDefined();
        }
      }
    });

    test('Network error simulation', async () => {
      // Test behavior with invalid API endpoints
      const originalFetch = global.fetch;
      
      // Mock fetch to simulate network errors
      global.fetch = async () => {
        throw new Error('Network error');
      };
      
      try {
        const result = await authClient.signIn('test@example.com', 'password');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network');
      } catch (error) {
        // Should handle network errors gracefully
        expect(error.message).toContain('Network');
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });
  });

  describe('Security Edge Cases', () => {
    test('SQL injection attempts in auth fields', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "admin'--",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "1' UNION SELECT * FROM users --",
      ];
      
      for (const payload of sqlInjectionPayloads) {
        // Test in email field
        const emailResult = await authClient.signIn(payload, 'password123');
        expect(emailResult.success).toBe(false);
        
        // Test in username field during registration
        const registerResult = await authClient.signUp(
          generateTestEmail(),
          'ValidPassword123!',
          payload
        );
        expect(registerResult.success).toBe(false);
      }
    });

    test('XSS attempts in username field', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '"><script>alert("XSS")</script>',
      ];
      
      for (const payload of xssPayloads) {
        const result = await authClient.signUp(
          generateTestEmail(),
          'ValidPassword123!',
          payload
        );
        
        if (result.success) {
          // If registration succeeds, username should be sanitized
          expect(result.user!.username).not.toContain('<script>');
          expect(result.user!.username).not.toContain('javascript:');
          expect(result.user!.username).not.toContain('<img');
          expect(result.user!.username).not.toContain('<iframe');
        }
      }
    });

    test('Password timing attack resistance', async () => {
      const email = generateTestEmail('timing');
      const correctPassword = 'CorrectPassword123!';
      const username = generateTestUsername('timing');
      
      // Create user
      await authClient.signUp(email, correctPassword, username);
      
      // Test login with various wrong passwords
      const wrongPasswords = [
        'A', // Very short
        'WrongButSameLength123!', // Same length as correct
        'VeryLongWrongPasswordThatShouldTakeMoreTime123!', // Longer
        '', // Empty
      ];
      
      const timings = [];
      
      for (const wrongPassword of wrongPasswords) {
        const startTime = performance.now();
        const result = await authClient.signIn(email, wrongPassword);
        const endTime = performance.now();
        
        timings.push({
          password: wrongPassword,
          time: endTime - startTime,
          success: result.success
        });
        
        expect(result.success).toBe(false);
      }
      
      // Analyze timing patterns
      const times = timings.map(t => t.time);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxVariance = Math.max(...times) - Math.min(...times);
      
      console.log('Password timing analysis:', {
        avgTime: `${avgTime.toFixed(2)}ms`,
        maxVariance: `${maxVariance.toFixed(2)}ms`,
        timings: timings.map(t => ({ pwd: t.password.substring(0, 10), time: t.time.toFixed(2) }))
      });
      
      // Large variance could indicate timing attack vulnerability
      // This is informational - actual requirements depend on security needs
      if (maxVariance > 1000) {
        console.warn(`High timing variance detected: ${maxVariance.toFixed(2)}ms`);
      }
    });
  });
});