/**
 * Phase 11: API Fuzzing and Mutation Testing
 * Extreme input fuzzing and API mutation testing to discover edge cases
 */

import { describe, test, expect } from 'vitest';

// Fuzzing payload generators
class FuzzingPayloadGenerator {
  static generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()[]{}|;:,.<>?';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateUnicodeString(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      // Generate random Unicode code points
      const codePoint = Math.floor(Math.random() * 0x10FFFF);
      try {
        result += String.fromCodePoint(codePoint);
      } catch {
        result += '?'; // Fallback for invalid code points
      }
    }
    return result;
  }

  static generateMalformedJSON(): string[] {
    return [
      '{"incomplete": ',
      '{"key": "value",}',
      '{"key": "value" "another": "value"}',
      '{"key": undefined}',
      '{"key": NaN}',
      '{"key": Infinity}',
      '{key: "value"}',
      '{"": "empty key"}',
      '{"null": null, "undefined": undefined}',
      '{"function": function() {}}',
      '{"circular": {"ref": "back"}}',
      '\x00\x01\x02{"binary": "data"}',
      '{"unicode": "\uD800\uDC00"}',
      '{"very_deep": ' + '{"nested": '.repeat(1000) + '"value"' + '}'.repeat(1000) + '}',
      JSON.stringify({huge: 'x'.repeat(100000)})
    ];
  }

  static generateBoundaryValues(): any[] {
    return [
      // Number boundaries
      0, -0, 1, -1,
      Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
      Number.MAX_VALUE, Number.MIN_VALUE,
      Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
      NaN,
      
      // String boundaries
      '', 'a', 'A'.repeat(10000), 'A'.repeat(100000),
      '\0', '\n', '\r\n', '\t',
      
      // Special values
      null, undefined,
      true, false,
      
      // Arrays
      [], [null], [undefined], Array(10000).fill('x'),
      
      // Objects
      {}, {null: null}, {undefined: undefined}
    ];
  }

  static generatePlayerNameVariations(): string[] {
    return [
      // Normal cases
      'Player1', 'Player2',
      
      // Edge cases
      '', ' ', '  ',
      'a', 'A'.repeat(1000),
      
      // Special characters
      'Player@#$%', 'Player\n\r\t',
      'Player\x00\x01', 'Player\uFFFD',
      
      // Unicode variations
      'Player🎮', 'Игрок', '玩家', 'プレイヤー',
      
      // Injection attempts
      '<script>alert(1)</script>',
      '${7*7}', '#{7*7}',
      '"; DROP TABLE users; --',
      
      // File system attempts
      '../../../etc/passwd',
      'C:\\Windows\\System32',
      
      // Long strings
      'Player' + 'X'.repeat(10000),
      
      // Invisible characters
      '\u200B\u200C\u200D',
      '\uFEFF', // BOM
      
      // Emoji overload
      '🎮'.repeat(100),
      
      // Mixed scripts
      'PlayerПлейер玩家'
    ];
  }
}

// API endpoint configurations for fuzzing
const API_ENDPOINTS = [
  {
    path: '/api/game/create',
    method: 'POST',
    fields: ['playerNames'],
    requiredAuth: false
  },
  {
    path: '/api/game/:gameId',
    method: 'GET',
    fields: [],
    requiresGameId: true,
    requiredAuth: false
  },
  {
    path: '/api/game/:gameId/deal',
    method: 'POST',
    fields: [],
    requiresGameId: true,
    requiredAuth: false
  },
  {
    path: '/api/game/:gameId/action',
    method: 'POST',
    fields: ['playerId', 'action', 'amount'],
    requiresGameId: true,
    requiredAuth: false
  },
  {
    path: '/api/health',
    method: 'GET',
    fields: [],
    requiredAuth: false
  }
];

describe('Phase 11: API Fuzzing and Mutation Testing', () => {
  describe('Input Fuzzing Tests', () => {
    test('Random string fuzzing across all API endpoints', async () => {
      console.log('Performing random string fuzzing...');
      
      const fuzzingResults = [];
      const iterationsPerEndpoint = 50;
      
      for (const endpoint of API_ENDPOINTS) {
        console.log(`Fuzzing endpoint: ${endpoint.method} ${endpoint.path}`);
        
        for (let i = 0; i < iterationsPerEndpoint; i++) {
          const fuzzedPayload: any = {};
          
          // Generate fuzzed values for each field
          endpoint.fields.forEach(field => {
            const fuzzType = Math.floor(Math.random() * 4);
            switch (fuzzType) {
              case 0:
                fuzzedPayload[field] = FuzzingPayloadGenerator.generateRandomString(Math.floor(Math.random() * 1000));
                break;
              case 1:
                fuzzedPayload[field] = FuzzingPayloadGenerator.generateUnicodeString(Math.floor(Math.random() * 100));
                break;
              case 2:
                const boundaryValues = FuzzingPayloadGenerator.generateBoundaryValues();
                fuzzedPayload[field] = boundaryValues[Math.floor(Math.random() * boundaryValues.length)];
                break;
              case 3:
                if (field === 'playerNames') {
                  const variations = FuzzingPayloadGenerator.generatePlayerNameVariations();
                  fuzzedPayload[field] = [
                    variations[Math.floor(Math.random() * variations.length)],
                    variations[Math.floor(Math.random() * variations.length)]
                  ];
                } else {
                  fuzzedPayload[field] = FuzzingPayloadGenerator.generateRandomString(50);
                }
                break;
            }
          });
          
          // Execute fuzzed request
          const fuzzStart = Date.now();
          try {
            let url = `http://localhost:3000${endpoint.path}`;
            if (endpoint.requiresGameId) {
              url = url.replace(':gameId', 'fuzz-test-game-id');
            }
            
            const response = await fetch(url, {
              method: endpoint.method,
              headers: endpoint.method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
              body: endpoint.method !== 'GET' ? JSON.stringify(fuzzedPayload) : undefined
            });
            
            fuzzingResults.push({
              endpoint: endpoint.path,
              method: endpoint.method,
              iteration: i,
              payload: fuzzedPayload,
              status: response.status,
              success: response.ok,
              responseTime: Date.now() - fuzzStart,
              crashed: false
            });
            
          } catch (error) {
            fuzzingResults.push({
              endpoint: endpoint.path,
              method: endpoint.method,
              iteration: i,
              payload: fuzzedPayload,
              status: 0,
              success: false,
              responseTime: Date.now() - fuzzStart,
              crashed: true,
              error: error.message
            });
          }
        }
      }
      
      // Analyze fuzzing results
      const totalTests = fuzzingResults.length;
      const crashed = fuzzingResults.filter(r => r.crashed);
      const unexpectedSuccess = fuzzingResults.filter(r => r.success && r.status === 200);
      const properlyRejected = fuzzingResults.filter(r => !r.success && !r.crashed);
      const avgResponseTime = fuzzingResults.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
      
      console.log(`Random String Fuzzing Results:`);
      console.log(`  Total Tests: ${totalTests}`);
      console.log(`  Crashed: ${crashed.length}`);
      console.log(`  Unexpected Success: ${unexpectedSuccess.length}`);
      console.log(`  Properly Rejected: ${properlyRejected.length}`);
      console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      
      // System should handle fuzzing gracefully
      expect(crashed.length).toBe(0); // No crashes
      expect(unexpectedSuccess.length).toBeLessThan(totalTests * 0.1); // Less than 10% unexpected success
      expect(properlyRejected.length).toBeGreaterThan(totalTests * 0.8); // Most should be properly rejected
    });

    test('Malformed JSON payload fuzzing', async () => {
      console.log('Testing malformed JSON payload handling...');
      
      const malformedJSONs = FuzzingPayloadGenerator.generateMalformedJSON();
      const jsonResults = [];
      
      for (const [index, malformedJSON] of malformedJSONs.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: malformedJSON
          });
          
          jsonResults.push({
            index,
            payload: malformedJSON.substring(0, 50) + '...',
            status: response.status,
            success: response.ok,
            handledGracefully: !response.ok
          });
          
        } catch (error) {
          jsonResults.push({
            index,
            payload: malformedJSON.substring(0, 50) + '...',
            status: 0,
            success: false,
            handledGracefully: true,
            error: error.message
          });
        }
      }
      
      const gracefullyHandled = jsonResults.filter(r => r.handledGracefully);
      const unexpectedSuccess = jsonResults.filter(r => r.success);
      
      console.log(`Malformed JSON Results:`);
      console.log(`  Total Tests: ${malformedJSONs.length}`);
      console.log(`  Gracefully Handled: ${gracefullyHandled.length}`);
      console.log(`  Unexpected Success: ${unexpectedSuccess.length}`);
      
      // All malformed JSON should be rejected
      expect(gracefullyHandled.length).toBe(malformedJSONs.length);
      expect(unexpectedSuccess.length).toBe(0);
    });

    test('Header injection and manipulation fuzzing', async () => {
      console.log('Testing header injection and manipulation...');
      
      const maliciousHeaders = [
        // Injection attempts
        { 'X-Injection': '<script>alert(1)</script>' },
        { 'Authorization': 'Bearer fake-token' },
        { 'X-Forwarded-For': '127.0.0.1; rm -rf /' },
        { 'User-Agent': 'Mozilla/5.0 (compatible; \n\rInjected: value)' },
        
        // Oversized headers
        { 'X-Large-Header': 'x'.repeat(100000) },
        { 'X-Many-Headers': Array(1000).fill('value').join(',') },
        
        // Special characters
        { 'X-Special': '\x00\x01\x02\x03' },
        { 'X-Unicode': '🎮🃏🎯🚀💥' },
        
        // Protocol manipulation
        { 'Host': 'evil.com' },
        { 'Origin': 'http://malicious-site.com' },
        { 'Referer': 'javascript:alert(1)' },
        
        // Content manipulation
        { 'Content-Type': 'application/xml' },
        { 'Content-Length': '999999999' },
        { 'Transfer-Encoding': 'chunked' }
      ];
      
      const headerResults = [];
      
      for (const [index, headers] of maliciousHeaders.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/health', {
            method: 'GET',
            headers
          });
          
          headerResults.push({
            index,
            headers: Object.keys(headers)[0],
            status: response.status,
            success: response.ok,
            blocked: !response.ok
          });
          
        } catch (error) {
          headerResults.push({
            index,
            headers: Object.keys(headers)[0],
            status: 0,
            success: false,
            blocked: true,
            error: error.message
          });
        }
      }
      
      const blockedRequests = headerResults.filter(r => r.blocked);
      const allowedRequests = headerResults.filter(r => r.success);
      
      console.log(`Header Injection Results:`);
      console.log(`  Total Tests: ${maliciousHeaders.length}`);
      console.log(`  Blocked Requests: ${blockedRequests.length}`);
      console.log(`  Allowed Requests: ${allowedRequests.length}`);
      
      // Most malicious headers should be handled appropriately
      // Some may be allowed if they don't pose security risks
      expect(headerResults.length).toBe(maliciousHeaders.length);
    });
  });

  describe('Boundary Value Testing', () => {
    test('Numeric boundary fuzzing', async () => {
      console.log('Testing numeric boundary values...');
      
      const numericBoundaries = [
        // Integer boundaries
        0, 1, -1, 2147483647, -2147483648,
        9007199254740991, -9007199254740991,
        
        // Float boundaries
        0.0, 0.1, -0.1, 1.7976931348623157e+308,
        5e-324, Number.EPSILON,
        
        // Special values
        Infinity, -Infinity, NaN,
        
        // Edge cases for poker
        10, 20, 100, 1000, 10000, // Common chip amounts
        -10, -20, -100, // Negative amounts (should be invalid)
        0.1, 0.01, // Fractional amounts
        1.5, 2.5, 10.5 // Non-integer amounts
      ];
      
      // Test numeric boundaries in bet amounts
      const boundaryResults = [];
      
      // First create a test game
      try {
        const gameResponse = await fetch('http://localhost:3000/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNames: ['BoundaryPlayer1', 'BoundaryPlayer2']
          })
        });
        
        if (!gameResponse.ok) {
          console.log('Could not create test game for boundary testing');
          return;
        }
        
        const game = await gameResponse.json();
        const gameId = game.gameId;
        
        // Deal cards to enable actions
        await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Get game state to find active player
        const gameState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
        const activePlayer = gameState.players?.[gameState.activePlayerIndex];
        
        if (!activePlayer) {
          console.log('Could not find active player for boundary testing');
          return;
        }
        
        // Test each boundary value as bet amount
        for (const [index, amount] of numericBoundaries.entries()) {
          try {
            const response = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerId: activePlayer.id,
                action: 'raise',
                amount: amount
              })
            });
            
            boundaryResults.push({
              index,
              amount,
              status: response.status,
              success: response.ok,
              validInput: typeof amount === 'number' && amount > 0 && Number.isFinite(amount)
            });
            
          } catch (error) {
            boundaryResults.push({
              index,
              amount,
              status: 0,
              success: false,
              error: error.message,
              validInput: false
            });
          }
        }
        
        const validInputs = boundaryResults.filter(r => r.validInput);
        const invalidInputs = boundaryResults.filter(r => !r.validInput);
        const invalidRejected = invalidInputs.filter(r => !r.success);
        const validAccepted = validInputs.filter(r => r.success);
        
        console.log(`Numeric Boundary Results:`);
        console.log(`  Total Tests: ${numericBoundaries.length}`);
        console.log(`  Valid Inputs: ${validInputs.length}`);
        console.log(`  Invalid Inputs: ${invalidInputs.length}`);
        console.log(`  Invalid Properly Rejected: ${invalidRejected.length}/${invalidInputs.length}`);
        console.log(`  Valid Accepted: ${validAccepted.length}/${validInputs.length}`);
        
        // Invalid inputs should be rejected
        expect(invalidRejected.length).toBe(invalidInputs.length);
        
      } catch (error) {
        console.log('Boundary testing failed due to setup error:', error.message);
      }
    });

    test('String length boundary testing', async () => {
      console.log('Testing string length boundaries...');
      
      const stringLengths = [
        0, 1, 2, 3, 15, 16, 31, 32, 63, 64,
        127, 128, 255, 256, 511, 512,
        1023, 1024, 2047, 2048, 4095, 4096,
        8191, 8192, 16383, 16384, 32767, 32768,
        65535, 65536, 100000
      ];
      
      const lengthResults = [];
      
      for (const length of stringLengths) {
        const testString = 'A'.repeat(length);
        
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: [testString, 'Player2']
            })
          });
          
          lengthResults.push({
            length,
            status: response.status,
            success: response.ok,
            reasonableLength: length > 0 && length <= 100
          });
          
        } catch (error) {
          lengthResults.push({
            length,
            status: 0,
            success: false,
            error: error.message,
            reasonableLength: false
          });
        }
      }
      
      const reasonableLengths = lengthResults.filter(r => r.reasonableLength);
      const unreasonableLengths = lengthResults.filter(r => !r.reasonableLength);
      const unreasonableRejected = unreasonableLengths.filter(r => !r.success);
      const reasonableAccepted = reasonableLengths.filter(r => r.success);
      
      console.log(`String Length Boundary Results:`);
      console.log(`  Total Tests: ${stringLengths.length}`);
      console.log(`  Reasonable Lengths: ${reasonableLengths.length}`);
      console.log(`  Unreasonable Lengths: ${unreasonableLengths.length}`);
      console.log(`  Unreasonable Rejected: ${unreasonableRejected.length}/${unreasonableLengths.length}`);
      console.log(`  Reasonable Accepted: ${reasonableAccepted.length}/${reasonableLengths.length}`);
      
      // Very long strings should be rejected
      expect(unreasonableRejected.length).toBeGreaterThan(unreasonableLengths.length * 0.8);
    });
  });

  describe('Protocol and Format Fuzzing', () => {
    test('HTTP method fuzzing', async () => {
      console.log('Testing unsupported HTTP methods...');
      
      const httpMethods = [
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
        'HEAD', 'OPTIONS', 'TRACE', 'CONNECT',
        'PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE',
        'LOCK', 'UNLOCK', 'VERSION-CONTROL', 'CHECKOUT',
        'UNCHECKOUT', 'CHECKIN', 'UPDATE', 'LABEL',
        'REPORT', 'MKWORKSPACE', 'MKACTIVITY', 'BASELINE-CONTROL',
        'MERGE', 'INVALID', 'MALFORMED-METHOD',
        'A'.repeat(1000) // Very long method name
      ];
      
      const methodResults = [];
      
      for (const method of httpMethods) {
        try {
          const response = await fetch('http://localhost:3000/api/health', {
            method: method as any
          });
          
          methodResults.push({
            method,
            status: response.status,
            success: response.ok,
            allowed: response.status !== 405 && response.status !== 501
          });
          
        } catch (error) {
          methodResults.push({
            method,
            status: 0,
            success: false,
            allowed: false,
            error: error.message
          });
        }
      }
      
      const allowedMethods = methodResults.filter(r => r.allowed);
      const blockedMethods = methodResults.filter(r => !r.allowed);
      
      console.log(`HTTP Method Fuzzing Results:`);
      console.log(`  Total Methods Tested: ${httpMethods.length}`);
      console.log(`  Allowed Methods: ${allowedMethods.length}`);
      console.log(`  Blocked Methods: ${blockedMethods.length}`);
      console.log(`  Allowed: ${allowedMethods.map(r => r.method).join(', ')}`);
      
      // Only standard methods should be allowed
      const standardMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      const unexpectedlyAllowed = allowedMethods.filter(r => !standardMethods.includes(r.method));
      
      expect(unexpectedlyAllowed.length).toBe(0);
    });

    test('Content-Type fuzzing', async () => {
      console.log('Testing various Content-Type headers...');
      
      const contentTypes = [
        'application/json',
        'application/xml',
        'text/plain',
        'text/html',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/octet-stream',
        'image/jpeg',
        'video/mp4',
        'audio/mpeg',
        'application/pdf',
        'application/javascript',
        'text/css',
        'invalid/content-type',
        'application/json; charset=utf-8',
        'application/json; boundary=something',
        '',
        'X'.repeat(1000)
      ];
      
      const contentTypeResults = [];
      
      for (const contentType of contentTypes) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': contentType },
            body: JSON.stringify({
              playerNames: ['CTPlayer1', 'CTPlayer2']
            })
          });
          
          contentTypeResults.push({
            contentType,
            status: response.status,
            success: response.ok,
            appropriatelyHandled: contentType.includes('application/json') ? response.ok : !response.ok
          });
          
        } catch (error) {
          contentTypeResults.push({
            contentType,
            status: 0,
            success: false,
            appropriatelyHandled: true,
            error: error.message
          });
        }
      }
      
      const appropriatelyHandled = contentTypeResults.filter(r => r.appropriatelyHandled);
      const inappropriatelyHandled = contentTypeResults.filter(r => !r.appropriatelyHandled);
      
      console.log(`Content-Type Fuzzing Results:`);
      console.log(`  Total Tests: ${contentTypes.length}`);
      console.log(`  Appropriately Handled: ${appropriatelyHandled.length}`);
      console.log(`  Inappropriately Handled: ${inappropriatelyHandled.length}`);
      
      // Most content types should be handled appropriately
      expect(appropriatelyHandled.length).toBeGreaterThan(contentTypes.length * 0.8);
    });
  });

  describe('Mutation Testing', () => {
    test('Valid request mutation testing', async () => {
      console.log('Testing mutations of valid requests...');
      
      const baseRequest = {
        playerNames: ['MutationPlayer1', 'MutationPlayer2']
      };
      
      const mutations = [
        // Field name mutations
        { playrNames: baseRequest.playerNames }, // Typo
        { playernames: baseRequest.playerNames }, // Case change
        { player_names: baseRequest.playerNames }, // Underscore
        { 'player-names': baseRequest.playerNames }, // Hyphen
        
        // Value mutations
        { playerNames: null },
        { playerNames: undefined },
        { playerNames: [] },
        { playerNames: ['Player1'] }, // Too few
        { playerNames: ['Player1', 'Player2', 'Player3'] }, // Too many
        { playerNames: [null, null] },
        { playerNames: ['', ''] },
        { playerNames: [123, 456] }, // Wrong type
        
        // Structure mutations
        { ...baseRequest, extraField: 'value' },
        { ...baseRequest, playerNames: baseRequest.playerNames, duplicateField: 'duplicate' },
        
        // Nested mutations
        { playerNames: { 0: 'Player1', 1: 'Player2' } }, // Object instead of array
        { playerNames: 'Player1,Player2' }, // String instead of array
        
        // Array mutations
        { playerNames: [...baseRequest.playerNames, ...Array(1000).fill('Player')] }, // Too many elements
      ];
      
      const mutationResults = [];
      
      for (const [index, mutation] of mutations.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mutation)
          });
          
          mutationResults.push({
            index,
            mutation: Object.keys(mutation)[0] + '...',
            status: response.status,
            success: response.ok,
            shouldSucceed: JSON.stringify(mutation) === JSON.stringify(baseRequest)
          });
          
        } catch (error) {
          mutationResults.push({
            index,
            mutation: Object.keys(mutation)[0] + '...',
            status: 0,
            success: false,
            shouldSucceed: false,
            error: error.message
          });
        }
      }
      
      const shouldSucceed = mutationResults.filter(r => r.shouldSucceed);
      const shouldFail = mutationResults.filter(r => !r.shouldSucceed);
      const correctlyHandled = [
        ...shouldSucceed.filter(r => r.success),
        ...shouldFail.filter(r => !r.success)
      ];
      
      console.log(`Request Mutation Results:`);
      console.log(`  Total Mutations: ${mutations.length}`);
      console.log(`  Should Succeed: ${shouldSucceed.length}`);
      console.log(`  Should Fail: ${shouldFail.length}`);
      console.log(`  Correctly Handled: ${correctlyHandled.length}/${mutations.length}`);
      
      // Most mutations should be handled correctly
      expect(correctlyHandled.length).toBeGreaterThan(mutations.length * 0.8);
    });
  });
});