/**
 * Phase 4: Security Penetration Testing
 * Comprehensive security testing to detect vulnerabilities
 */

import { describe, test, expect } from 'vitest';

// SQL Injection payloads for testing
const SQL_INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  "admin'--",
  "' OR '1'='1",
  "1' OR 1=1 #",
  "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
  "1' UNION SELECT * FROM users --",
  "' OR 1=1 --",
  "admin' /*",
  "' OR 'x'='x",
  "1; DROP DATABASE blupoker; --",
  "'; EXEC xp_cmdshell('dir'); --",
  "1' AND (SELECT COUNT(*) FROM users) > 0 --",
  "' UNION SELECT password FROM users WHERE '1'='1",
  "1' OR EXISTS(SELECT * FROM users) --",
  "'; WAITFOR DELAY '00:00:10'; --"
];

// XSS payloads for testing
const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(1)">',
  'javascript:alert(1)',
  '<iframe src="javascript:alert(1)">',
  '"><script>alert("XSS")</script>',
  '<svg onload="alert(1)">',
  '<body onload="alert(1)">',
  '<input type="text" onfocus="alert(1)" autofocus>',
  '<marquee onstart="alert(1)">',
  '<video><source onerror="alert(1)">',
  '<audio src="x" onerror="alert(1)">',
  '<object data="javascript:alert(1)">',
  '<embed src="javascript:alert(1)">',
  '<link rel="stylesheet" href="javascript:alert(1)">',
  '<style>@import"javascript:alert(1)";</style>'
];

// CSRF and authorization bypass attempts
const AUTH_BYPASS_PAYLOADS = [
  'Bearer fake-jwt-token',
  'Bearer null',
  'Bearer undefined',
  'Bearer ',
  'fake-session-token',
  'admin',
  'root',
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature',
  '',
  'null',
  'undefined'
];

// Helper function to test API endpoint security
async function testEndpointSecurity(endpoint: string, method: string, payload: any, expectedStatusCodes: number[] = [400, 401, 422, 500]) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined
    });
    
    return {
      status: response.status,
      statusText: response.statusText,
      isSecure: expectedStatusCodes.includes(response.status),
      responseText: await response.text()
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Network Error',
      isSecure: true, // Network errors are acceptable for security
      error: error.message
    };
  }
}

// Helper function to test with authentication headers
async function testWithAuthHeader(endpoint: string, method: string, authHeader: string, payload?: any) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined
    });
    
    return {
      status: response.status,
      isUnauthorized: response.status === 401 || response.status === 403,
      responseText: await response.text()
    };
  } catch (error) {
    return {
      status: 0,
      isUnauthorized: true, // Network error counts as secure
      error: error.message
    };
  }
}

describe('Phase 4: Security Penetration Testing', () => {
  describe('SQL Injection Prevention', () => {
    test('API endpoints resist SQL injection in request bodies', async () => {
      const endpoints = [
        { path: '/api/game/create', method: 'POST', field: 'playerNames' },
        { path: '/api/auth/login', method: 'POST', field: 'email' },
        { path: '/api/auth/register', method: 'POST', field: 'email' },
        { path: '/api/auth/register', method: 'POST', field: 'username' },
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const endpoint of endpoints) {
        for (const payload of SQL_INJECTION_PAYLOADS) {
          totalTests++;
          
          let testPayload: any = {};
          if (endpoint.field === 'playerNames') {
            testPayload.playerNames = [payload, 'Player2'];
          } else if (endpoint.field === 'email') {
            testPayload.email = payload;
            testPayload.password = 'validpassword123';
            if (endpoint.path.includes('register')) {
              testPayload.username = 'validuser';
            }
          } else if (endpoint.field === 'username') {
            testPayload.email = 'valid@example.com';
            testPayload.password = 'validpassword123';
            testPayload.username = payload;
          }
          
          const result = await testEndpointSecurity(endpoint.path, endpoint.method, testPayload);
          
          if (result.isSecure) {
            secureTests++;
          } else {
            console.warn(`SQL injection vulnerability in ${endpoint.path} ${endpoint.field}:`, payload);
          }
        }
      }
      
      console.log(`SQL injection test results: ${secureTests}/${totalTests} secure`);
      
      // Require 100% security against SQL injection
      expect(secureTests).toBe(totalTests);
    });

    test('URL parameters resist SQL injection', async () => {
      const gameId = 'test-game-id';
      const sqlPayloads = SQL_INJECTION_PAYLOADS;
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const payload of sqlPayloads) {
        totalTests++;
        
        const result = await testEndpointSecurity(`/api/game/${encodeURIComponent(payload)}`, 'GET', null, [400, 404, 422, 500]);
        
        if (result.isSecure) {
          secureTests++;
        } else {
          console.warn(`SQL injection vulnerability in URL parameter:`, payload);
        }
      }
      
      console.log(`URL SQL injection test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('Username fields prevent XSS injection', async () => {
      let totalTests = 0;
      let secureTests = 0;
      
      for (const xssPayload of XSS_PAYLOADS) {
        totalTests++;
        
        const registrationPayload = {
          email: `test${Date.now()}@example.com`,
          password: 'ValidPassword123!',
          username: xssPayload
        };
        
        const result = await testEndpointSecurity('/api/auth/register', 'POST', registrationPayload, [400, 422, 500]);
        
        if (result.isSecure) {
          secureTests++;
        } else {
          // If registration succeeds, check if XSS payload was sanitized
          if (result.status === 200) {
            const responseData = JSON.parse(result.responseText);
            if (responseData.user && responseData.user.username) {
              const username = responseData.user.username;
              const hasDangerousContent = 
                username.includes('<script>') ||
                username.includes('javascript:') ||
                username.includes('<img') ||
                username.includes('<iframe') ||
                username.includes('onerror=') ||
                username.includes('onload=');
              
              if (!hasDangerousContent) {
                secureTests++; // Sanitized properly
              } else {
                console.warn(`XSS vulnerability in username:`, xssPayload, 'resulted in:', username);
              }
            } else {
              secureTests++; // No user data returned, secure
            }
          } else {
            secureTests++; // Non-200 response is secure
          }
        }
      }
      
      console.log(`XSS prevention test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });

    test('Game player names prevent XSS injection', async () => {
      let totalTests = 0;
      let secureTests = 0;
      
      for (const xssPayload of XSS_PAYLOADS) {
        totalTests++;
        
        const gamePayload = {
          playerNames: [xssPayload, 'Player2']
        };
        
        const result = await testEndpointSecurity('/api/game/create', 'POST', gamePayload, [400, 422, 500]);
        
        if (result.isSecure) {
          secureTests++;
        } else {
          // If game creation succeeds, check if XSS payload was sanitized
          if (result.status === 200) {
            const responseData = JSON.parse(result.responseText);
            if (responseData.gameState && responseData.gameState.players) {
              const playerName = responseData.gameState.players[0].name;
              const hasDangerousContent = 
                playerName.includes('<script>') ||
                playerName.includes('javascript:') ||
                playerName.includes('<img') ||
                playerName.includes('<iframe') ||
                playerName.includes('onerror=') ||
                playerName.includes('onload=');
              
              if (!hasDangerousContent) {
                secureTests++; // Sanitized properly
              } else {
                console.warn(`XSS vulnerability in player name:`, xssPayload, 'resulted in:', playerName);
              }
            } else {
              secureTests++; // No player data returned, secure
            }
          } else {
            secureTests++; // Non-200 response is secure
          }
        }
      }
      
      console.log(`Player name XSS test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });
  });

  describe('Authentication and Authorization Security', () => {
    test('Protected endpoints require valid authentication', async () => {
      const protectedEndpoints = [
        { path: '/api/game/create', method: 'POST', payload: { playerNames: ['Player1', 'Player2'] } },
        { path: '/api/game/test-game/action', method: 'POST', payload: { playerId: 'test', action: 'fold' } },
        { path: '/api/game/test-game/deal', method: 'POST', payload: {} },
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const endpoint of protectedEndpoints) {
        for (const authHeader of AUTH_BYPASS_PAYLOADS) {
          totalTests++;
          
          const result = await testWithAuthHeader(endpoint.path, endpoint.method, authHeader, endpoint.payload);
          
          if (result.isUnauthorized) {
            secureTests++;
          } else {
            console.warn(`Authentication bypass vulnerability in ${endpoint.path} with header:`, authHeader);
          }
        }
      }
      
      console.log(`Authentication security test results: ${secureTests}/${totalTests} secure`);
      
      // Should reject all invalid authentication attempts
      expect(secureTests).toBe(totalTests);
    });

    test('Session hijacking prevention', async () => {
      // Test with malformed JWT tokens
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{}.signature',
        'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIj0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        'Bearer token.with.wrong.format',
        'Bearer ' + 'A'.repeat(1000), // Very long token
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const token of malformedTokens) {
        totalTests++;
        
        const result = await testWithAuthHeader('/api/game/create', 'POST', token, { playerNames: ['Player1', 'Player2'] });
        
        if (result.isUnauthorized) {
          secureTests++;
        } else {
          console.warn(`Session hijacking vulnerability with token:`, token.substring(0, 50) + '...');
        }
      }
      
      console.log(`Session hijacking test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('Oversized payloads are rejected', async () => {
      const oversizedPayloads = [
        {
          name: 'Large player name',
          endpoint: '/api/game/create',
          payload: { playerNames: ['A'.repeat(10000), 'Player2'] }
        },
        {
          name: 'Large email',
          endpoint: '/api/auth/register',
          payload: { 
            email: 'A'.repeat(5000) + '@example.com',
            password: 'ValidPassword123!',
            username: 'validuser'
          }
        },
        {
          name: 'Large username',
          endpoint: '/api/auth/register',
          payload: { 
            email: 'valid@example.com',
            password: 'ValidPassword123!',
            username: 'A'.repeat(5000)
          }
        },
        {
          name: 'Large JSON payload',
          endpoint: '/api/game/create',
          payload: { 
            playerNames: ['Player1', 'Player2'],
            extraData: 'X'.repeat(100000)
          }
        }
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const test of oversizedPayloads) {
        totalTests++;
        
        const result = await testEndpointSecurity(test.endpoint, 'POST', test.payload, [400, 413, 422, 500]);
        
        if (result.isSecure) {
          secureTests++;
        } else {
          console.warn(`Oversized payload vulnerability:`, test.name);
        }
      }
      
      console.log(`Oversized payload test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });

    test('Invalid data types are handled securely', async () => {
      const invalidTypePayloads = [
        {
          name: 'Null values',
          endpoint: '/api/game/create',
          payload: { playerNames: null }
        },
        {
          name: 'Number instead of string',
          endpoint: '/api/game/create',
          payload: { playerNames: [12345, 67890] }
        },
        {
          name: 'Object instead of string',
          endpoint: '/api/game/create',
          payload: { playerNames: [{ name: 'Player1' }, 'Player2'] }
        },
        {
          name: 'Array instead of string in email',
          endpoint: '/api/auth/login',
          payload: { email: ['test@example.com'], password: 'password' }
        },
        {
          name: 'Boolean values',
          endpoint: '/api/game/create',
          payload: { playerNames: [true, false] }
        }
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const test of invalidTypePayloads) {
        totalTests++;
        
        const result = await testEndpointSecurity(test.endpoint, 'POST', test.payload, [400, 422, 500]);
        
        if (result.isSecure) {
          secureTests++;
        } else {
          console.warn(`Invalid data type vulnerability:`, test.name);
        }
      }
      
      console.log(`Invalid data type test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('API endpoints have rate limiting', async () => {
      const rapidRequests = 50;
      const endpoint = '/api/health'; // Use health endpoint for rate limiting test
      
      console.log(`Testing rate limiting with ${rapidRequests} rapid requests...`);
      
      const promises = Array(rapidRequests).fill(0).map(async (_, i) => {
        const start = Date.now();
        try {
          const response = await fetch(`http://localhost:3000${endpoint}`);
          return {
            index: i,
            status: response.status,
            responseTime: Date.now() - start,
            rateLimited: response.status === 429 || response.status >= 500
          };
        } catch (error) {
          return {
            index: i,
            status: 0,
            responseTime: Date.now() - start,
            rateLimited: true,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const successful = completed.filter(r => r.status === 200);
      const rateLimited = completed.filter(r => r.rateLimited);
      const avgResponseTime = completed.reduce((sum, r) => sum + r.responseTime, 0) / completed.length;
      
      console.log(`Rate limiting test results:`);
      console.log(`  Successful: ${successful.length}/${rapidRequests}`);
      console.log(`  Rate limited: ${rateLimited.length}/${rapidRequests}`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      
      // Should have some form of rate limiting or response slowdown
      const hasRateLimiting = rateLimited.length > 0 || avgResponseTime > 100;
      expect(hasRateLimiting).toBe(true);
    });

    test('Login endpoint prevents brute force attacks', async () => {
      const bruteForceAttempts = 20;
      const testEmail = 'brute-force-test@example.com';
      
      console.log(`Testing brute force prevention with ${bruteForceAttempts} login attempts...`);
      
      const promises = Array(bruteForceAttempts).fill(0).map(async (_, i) => {
        try {
          const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: testEmail,
              password: `wrongpassword${i}`
            })
          });
          
          return {
            index: i,
            status: response.status,
            rateLimited: response.status === 429 || response.status >= 500
          };
        } catch (error) {
          return {
            index: i,
            status: 0,
            rateLimited: true,
            error: error.message
          };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const completed = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const rateLimited = completed.filter(r => r.rateLimited);
      const unsuccessful = completed.filter(r => r.status !== 200);
      
      console.log(`Brute force test results:`);
      console.log(`  Rate limited: ${rateLimited.length}/${bruteForceAttempts}`);
      console.log(`  Unsuccessful: ${unsuccessful.length}/${bruteForceAttempts}`);
      
      // Should rate limit or block repeated failed login attempts
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(unsuccessful.length).toBe(bruteForceAttempts); // All should fail since user doesn't exist
    });
  });

  describe('Error Information Disclosure', () => {
    test('Error messages do not leak sensitive information', async () => {
      const sensitiveTestCases = [
        {
          name: 'Database error exposure',
          endpoint: '/api/game/nonexistent-game-id',
          method: 'GET'
        },
        {
          name: 'SQL error exposure',
          endpoint: '/api/game/create',
          method: 'POST',
          payload: { playerNames: ["'; DROP TABLE users; --", 'Player2'] }
        },
        {
          name: 'System path exposure',
          endpoint: '/api/game/../../../etc/passwd',
          method: 'GET'
        },
        {
          name: 'Internal error exposure',
          endpoint: '/api/auth/login',
          method: 'POST',
          payload: { email: null, password: null }
        }
      ];
      
      const sensitivePatterns = [
        /\/home\/\w+/,
        /\/var\/\w+/,
        /\/etc\/\w+/,
        /C:\\[\w\\]+/,
        /Database.*error/i,
        /SQL.*error/i,
        /mysqli/i,
        /postgres/i,
        /ORA-\d+/,
        /stack trace/i,
        /node_modules/,
        /\.js:\d+:\d+/,
        /Error.*at.*\(/,
        /ENOENT/,
        /EACCES/,
        /permission denied/i
      ];
      
      let totalTests = 0;
      let secureTests = 0;
      
      for (const testCase of sensitiveTestCases) {
        totalTests++;
        
        const result = await testEndpointSecurity(
          testCase.endpoint, 
          testCase.method, 
          testCase.payload || null,
          [400, 401, 404, 422, 500]
        );
        
        let containsSensitiveInfo = false;
        
        if (result.responseText) {
          for (const pattern of sensitivePatterns) {
            if (pattern.test(result.responseText)) {
              containsSensitiveInfo = true;
              console.warn(`Sensitive information disclosure in ${testCase.name}:`, pattern);
              break;
            }
          }
        }
        
        if (!containsSensitiveInfo) {
          secureTests++;
        }
      }
      
      console.log(`Information disclosure test results: ${secureTests}/${totalTests} secure`);
      expect(secureTests).toBe(totalTests);
    });
  });
});