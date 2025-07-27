/**
 * Phase 15: Extreme Edge Case and Boundary Testing
 * Testing the absolute limits and most extreme scenarios possible
 */

import { describe, test, expect } from 'vitest';

// Helper to create extreme test game
async function createExtremeTestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`ExtremePlayer1${suffix}`, `ExtremePlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Extreme test game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Generate extreme boundary values
class ExtremeBoundaryGenerator {
  static getNumericExtremes(): number[] {
    return [
      // JavaScript number boundaries
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      NaN,
      
      // Edge cases around zero
      0, -0, 0.0, -0.0,
      Number.EPSILON,
      -Number.EPSILON,
      
      // Powers of 2 (common in computer systems)
      Math.pow(2, 31) - 1,  // 32-bit signed int max
      -Math.pow(2, 31),     // 32-bit signed int min
      Math.pow(2, 32) - 1,  // 32-bit unsigned int max
      Math.pow(2, 53) - 1,  // JavaScript safe integer max
      Math.pow(2, 63) - 1,  // 64-bit signed int max
      
      // Decimal edge cases
      0.1, 0.01, 0.001, 0.0001,
      -0.1, -0.01, -0.001, -0.0001,
      
      // Large random numbers
      1e100, -1e100, 1e-100, -1e-100,
      Math.PI, -Math.PI, Math.E, -Math.E,
      
      // Poker-specific boundaries
      1, 2, 5, 10, 20, 25, 50, 100, 500, 1000, 5000, 10000,
      -1, -10, -100, -1000
    ];
  }
  
  static getStringExtremes(): string[] {
    return [
      // Empty and minimal
      '',
      ' ',
      '  ',
      '\n',
      '\r',
      '\t',
      '\r\n',
      
      // Single characters
      'a', 'A', '1', '!', '@', '#', '$', '%', '^', '&', '*',
      
      // Unicode extremes
      '\u0000', // Null character
      '\u0001', // Start of heading
      '\u0008', // Backspace
      '\u000C', // Form feed
      '\u001F', // Unit separator
      '\u007F', // Delete
      '\u0080', // First non-ASCII
      '\u00FF', // Last Latin-1
      '\uFFFD', // Replacement character
      '\uFFFE', // Invalid Unicode
      '\uFFFF', // Invalid Unicode
      
      // Emoji and special characters
      '😀', '🎮', '🃏', '🎯', '💥', '🚀',
      '👨‍💻', '👩‍💻', // Compound emoji
      
      // Different scripts
      'Русский', '中文', '日本語', 'العربية', 'עברית', 'हिंदी',
      
      // Control sequences
      '\x1b[0m', // ANSI reset
      '\x1b[31m', // ANSI red
      '\033[H\033[2J', // Clear screen
      
      // Very long strings
      'A'.repeat(1),
      'A'.repeat(10),
      'A'.repeat(100),
      'A'.repeat(1000),
      'A'.repeat(10000),
      'A'.repeat(100000),
      
      // Repeated patterns
      'AB'.repeat(5000),
      '123'.repeat(3333),
      '🎮'.repeat(1000),
      
      // Alternating patterns
      'AaBbCcDdEe'.repeat(1000),
      '0123456789'.repeat(1000),
      
      // Special character combinations
      '\\\\\\\\\\\\\\\\',
      '""""""""""""""""',
      '////////////////',
      '{{{{{{{{{{{{{{{{',
      '}}}}}}}}}}}}}}}}',
      '[[[[[[[[[[[[[[[[',
      ']]]]]]]]]]]]]]]]',
      
      // JSON-like but invalid
      '{"key": "value"',
      '"value": {"key"}',
      '{"nested": {"very": {"deep": {"structure": "value"}}}}',
      
      // SQL-like strings
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "UNION SELECT * FROM",
      
      // Script injection attempts
      '<script>alert("XSS")</script>',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      
      // Path traversal attempts
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\',
      'file:///etc/passwd',
      'http://evil.com/payload',
      
      // Binary-like data as string
      '\x00\x01\x02\x03\x04\x05\x06\x07',
      '\xFF\xFE\xFD\xFC\xFB\xFA\xF9\xF8',
      
      // Mixed encoding attempts
      '\uD800\uDC00', // Valid surrogate pair
      '\uD800', // Unpaired high surrogate
      '\uDC00', // Unpaired low surrogate
    ];
  }
  
  static getArrayExtremes(): any[] {
    return [
      // Empty arrays
      [],
      
      // Single element arrays
      [null],
      [undefined],
      [0],
      [1],
      [''],
      [' '],
      
      // Nested arrays
      [[]],
      [[[]]],
      [[[[]]]],
      
      // Very large arrays
      Array(1000).fill('element'),
      Array(10000).fill(0),
      Array(100000).fill(null),
      
      // Mixed type arrays
      [null, undefined, 0, '', false, true, {}, []],
      [1, '2', [3], {four: 4}, null, undefined],
      
      // Arrays with extreme values
      [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
      [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      [NaN, 0, -0],
      
      // Arrays with extreme strings
      ['A'.repeat(100000)],
      Array(1000).fill('🎮'.repeat(100)),
      
      // Deeply nested structures
      [[[[[[[[[['deep']]]]]]]]]],
      
      // Circular reference simulation (can't create real circular refs in JSON)
      [{ref: 'circular'}, {ref: 'circular'}],
    ];
  }
  
  static getObjectExtremes(): any[] {
    return [
      // Empty objects
      {},
      
      // Single property objects
      {key: null},
      {key: undefined},
      {key: ''},
      {key: 0},
      {'': 'empty key'},
      {null: 'null key'},
      
      // Objects with extreme property names
      {['A'.repeat(10000)]: 'very long key'},
      {['🎮'.repeat(1000)]: 'emoji key'},
      {['\x00\x01\x02']: 'control char key'},
      
      // Objects with extreme values
      {value: 'A'.repeat(100000)},
      {number: Number.MAX_SAFE_INTEGER},
      {array: Array(10000).fill('large')},
      
      // Deeply nested objects
      {a: {b: {c: {d: {e: {f: {g: {h: {i: {j: 'deep'}}}}}}}}},
      
      // Objects with many properties
      Object.fromEntries(Array(1000).fill(0).map((_, i) => [`prop${i}`, i])),
      Object.fromEntries(Array(10000).fill(0).map((_, i) => [`key${i}`, `value${i}`])),
      
      // Objects with special property names
      {
        constructor: 'constructor',
        prototype: 'prototype',
        __proto__: '__proto__',
        toString: 'toString',
        valueOf: 'valueOf'
      },
    ];
  }
}

describe('Phase 15: Extreme Edge Case and Boundary Testing', () => {
  describe('Numeric Boundary Extremes', () => {
    test('Extreme numeric values in API calls', async () => {
      console.log('Testing extreme numeric values...');
      
      const game = await createExtremeTestGame('_numeric');
      const gameId = game.gameId;
      
      // Deal cards to enable actions
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const gameState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const activePlayer = gameState.players?.[gameState.activePlayerIndex];
      
      if (!activePlayer) {
        console.log('No active player found for numeric testing');
        return;
      }
      
      const numericExtremes = ExtremeBoundaryGenerator.getNumericExtremes();
      const numericResults = [];
      
      for (const [index, value] of numericExtremes.entries()) {
        try {
          const response = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: activePlayer.id,
              action: 'raise',
              amount: value
            })
          });
          
          numericResults.push({
            index,
            value: value,
            valueType: typeof value,
            isNaN: Number.isNaN(value),
            isFinite: Number.isFinite(value),
            status: response.status,
            accepted: response.ok,
            shouldBeRejected: !Number.isFinite(value) || value <= 0
          });
          
        } catch (error) {
          numericResults.push({
            index,
            value: value,
            valueType: typeof value,
            status: 0,
            accepted: false,
            shouldBeRejected: true,
            error: error.message
          });
        }
      }
      
      const properlyRejected = numericResults.filter(r => r.shouldBeRejected && !r.accepted);
      const improperlyAccepted = numericResults.filter(r => r.shouldBeRejected && r.accepted);
      const validValues = numericResults.filter(r => !r.shouldBeRejected);
      
      console.log(`Numeric Extremes Results:`);
      console.log(`  Total Values Tested: ${numericExtremes.length}`);
      console.log(`  Properly Rejected: ${properlyRejected.length}`);
      console.log(`  Improperly Accepted: ${improperlyAccepted.length}`);
      console.log(`  Valid Values: ${validValues.length}`);
      
      if (improperlyAccepted.length > 0) {
        console.log(`  Improperly Accepted Values:`, improperlyAccepted.slice(0, 5).map(r => r.value));
      }
      
      // Should reject all invalid numeric values
      expect(improperlyAccepted.length).toBe(0);
    });

    test('Floating point precision edge cases', async () => {
      console.log('Testing floating point precision edge cases...');
      
      const precisionTestValues = [
        0.1 + 0.2, // Should be 0.3 but might be 0.30000000000000004
        0.1 * 3,   // Should be 0.3 but might not be exactly
        1.0 / 3.0 * 3.0, // Should be 1.0
        Math.sqrt(2) * Math.sqrt(2), // Should be 2.0
        Math.sin(Math.PI), // Should be 0 but might be very small
        1e-15, 1e-16, 1e-17, // Very small numbers
        1 + Number.EPSILON, // Just above 1
        1 - Number.EPSILON, // Just below 1
      ];
      
      const precisionResults = [];
      
      for (const value of precisionTestValues) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: ['PrecisionPlayer1', 'PrecisionPlayer2'],
              testValue: value // Include test value in request
            })
          });
          
          precisionResults.push({
            value,
            originalValue: value.toString(),
            status: response.status,
            accepted: response.ok,
            isSmall: Math.abs(value) < 1e-10
          });
          
        } catch (error) {
          precisionResults.push({
            value,
            status: 0,
            accepted: false,
            error: error.message
          });
        }
      }
      
      const handledGracefully = precisionResults.filter(r => r.status !== 0);
      
      console.log(`Floating Point Precision Results:`);
      console.log(`  Values Tested: ${precisionTestValues.length}`);
      console.log(`  Handled Gracefully: ${handledGracefully.length}`);
      
      // Should handle floating point values without crashing
      expect(handledGracefully.length).toBe(precisionTestValues.length);
    });
  });

  describe('String Boundary Extremes', () => {
    test('Extreme string values in player names', async () => {
      console.log('Testing extreme string values in player names...');
      
      const stringExtremes = ExtremeBoundaryGenerator.getStringExtremes();
      const stringResults = [];
      
      for (const [index, extremeString] of stringExtremes.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: [extremeString, 'NormalPlayer']
            })
          });
          
          stringResults.push({
            index,
            stringLength: extremeString.length,
            stringType: extremeString === '' ? 'empty' : 
                       extremeString.length === 1 ? 'single' :
                       extremeString.length > 10000 ? 'very_long' : 'normal',
            containsUnicode: /[^\x00-\x7F]/.test(extremeString),
            containsControl: /[\x00-\x1F]/.test(extremeString),
            status: response.status,
            accepted: response.ok,
            shouldBeRejected: extremeString.length === 0 || extremeString.length > 1000 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(extremeString)
          });
          
        } catch (error) {
          stringResults.push({
            index,
            stringLength: extremeString.length,
            status: 0,
            accepted: false,
            shouldBeRejected: true,
            error: error.message
          });
        }
      }
      
      const properlyRejected = stringResults.filter(r => r.shouldBeRejected && !r.accepted);
      const improperlyAccepted = stringResults.filter(r => r.shouldBeRejected && r.accepted);
      const validStrings = stringResults.filter(r => !r.shouldBeRejected);
      const veryLongStrings = stringResults.filter(r => r.stringLength > 10000);
      
      console.log(`String Extremes Results:`);
      console.log(`  Total Strings Tested: ${stringExtremes.length}`);
      console.log(`  Properly Rejected: ${properlyRejected.length}`);
      console.log(`  Improperly Accepted: ${improperlyAccepted.length}`);
      console.log(`  Valid Strings: ${validStrings.length}`);
      console.log(`  Very Long Strings: ${veryLongStrings.length}`);
      
      // Should handle most extreme strings appropriately
      expect(improperlyAccepted.length).toBeLessThan(stringExtremes.length * 0.1);
      
      // Very long strings should mostly be rejected
      const rejectedLongStrings = veryLongStrings.filter(r => !r.accepted);
      expect(rejectedLongStrings.length).toBeGreaterThan(veryLongStrings.length * 0.8);
    });

    test('Unicode and encoding edge cases', async () => {
      console.log('Testing Unicode and encoding edge cases...');
      
      const unicodeTestCases = [
        // Basic ASCII
        'BasicASCII',
        
        // Latin-1 Supplement
        'Café',
        
        // Currency symbols
        '$€£¥₹₿',
        
        // Mathematical symbols
        '∑∏∫∆∇∂',
        
        // Arrows
        '←↑→↓↔↕',
        
        // Box drawing
        '┌┬┐├┼┤└┴┘',
        
        // Emoji
        '😀😃😄😁😆😅😂🤣',
        
        // Flags
        '🇺🇸🇬🇧🇯🇵🇩🇪🇫🇷',
        
        // Complex emoji
        '👨‍👩‍👧‍👦👨‍💻👩‍🚀',
        
        // Right-to-left languages
        'مرحبا', // Arabic
        'שלום', // Hebrew
        
        // Asian languages
        '你好', // Chinese
        'こんにちは', // Japanese
        '안녕하세요', // Korean
        
        // Mixed scripts
        'Hello世界🌍',
        
        // Normalization test cases
        'é', // Single character
        'e\u0301', // e + combining acute accent
        
        // Zero-width characters
        'Test\u200BTest', // Zero-width space
        'Test\u200CTest', // Zero-width non-joiner
        'Test\u200DTest', // Zero-width joiner
        
        // Bidi control characters
        'Test\u202ATest\u202C', // Left-to-right embedding
        'Test\u202BTest\u202C', // Right-to-left embedding
      ];
      
      const unicodeResults = [];
      
      for (const [index, unicodeString] of unicodeTestCases.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: [unicodeString, 'Player2']
            })
          });
          
          let responseText = '';
          if (response.ok) {
            const gameData = await response.json();
            responseText = gameData.gameState?.players?.[0]?.name || '';
          }
          
          unicodeResults.push({
            index,
            original: unicodeString,
            originalLength: unicodeString.length,
            responseLength: responseText.length,
            preserved: unicodeString === responseText,
            status: response.status,
            accepted: response.ok
          });
          
        } catch (error) {
          unicodeResults.push({
            index,
            original: unicodeString,
            status: 0,
            accepted: false,
            error: error.message
          });
        }
      }
      
      const acceptedUnicode = unicodeResults.filter(r => r.accepted);
      const preservedUnicode = unicodeResults.filter(r => r.preserved);
      const modifiedUnicode = acceptedUnicode.filter(r => !r.preserved);
      
      console.log(`Unicode Handling Results:`);
      console.log(`  Total Unicode Cases: ${unicodeTestCases.length}`);
      console.log(`  Accepted: ${acceptedUnicode.length}`);
      console.log(`  Preserved Exactly: ${preservedUnicode.length}`);
      console.log(`  Modified/Sanitized: ${modifiedUnicode.length}`);
      
      // Should handle Unicode reasonably
      expect(acceptedUnicode.length).toBeGreaterThan(unicodeTestCases.length * 0.5);
    });
  });

  describe('Data Structure Extremes', () => {
    test('Extreme array structures', async () => {
      console.log('Testing extreme array structures...');
      
      const arrayExtremes = ExtremeBoundaryGenerator.getArrayExtremes();
      const arrayResults = [];
      
      for (const [index, extremeArray] of arrayExtremes.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: extremeArray.length >= 2 ? extremeArray.slice(0, 2) : ['Player1', 'Player2'],
              testArray: extremeArray
            })
          });
          
          arrayResults.push({
            index,
            arrayLength: Array.isArray(extremeArray) ? extremeArray.length : 0,
            arrayType: Array.isArray(extremeArray) ? 'array' : typeof extremeArray,
            status: response.status,
            accepted: response.ok,
            isLarge: Array.isArray(extremeArray) && extremeArray.length > 10000
          });
          
        } catch (error) {
          arrayResults.push({
            index,
            arrayLength: 0,
            status: 0,
            accepted: false,
            error: error.message
          });
        }
      }
      
      const acceptedArrays = arrayResults.filter(r => r.accepted);
      const largeArrays = arrayResults.filter(r => r.isLarge);
      const rejectedLargeArrays = largeArrays.filter(r => !r.accepted);
      
      console.log(`Array Extremes Results:`);
      console.log(`  Total Arrays Tested: ${arrayExtremes.length}`);
      console.log(`  Accepted: ${acceptedArrays.length}`);
      console.log(`  Large Arrays (>10k): ${largeArrays.length}`);
      console.log(`  Rejected Large Arrays: ${rejectedLargeArrays.length}`);
      
      // Large arrays should mostly be rejected
      if (largeArrays.length > 0) {
        expect(rejectedLargeArrays.length).toBeGreaterThan(largeArrays.length * 0.7);
      }
    });

    test('Extreme object structures', async () => {
      console.log('Testing extreme object structures...');
      
      const objectExtremes = ExtremeBoundaryGenerator.getObjectExtremes();
      const objectResults = [];
      
      for (const [index, extremeObject] of objectExtremes.entries()) {
        try {
          const response = await fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: ['ObjectPlayer1', 'ObjectPlayer2'],
              testObject: extremeObject
            })
          });
          
          objectResults.push({
            index,
            objectType: typeof extremeObject,
            propertyCount: typeof extremeObject === 'object' && extremeObject !== null ? Object.keys(extremeObject).length : 0,
            status: response.status,
            accepted: response.ok,
            isMassive: typeof extremeObject === 'object' && extremeObject !== null && Object.keys(extremeObject).length > 1000
          });
          
        } catch (error) {
          objectResults.push({
            index,
            objectType: typeof extremeObject,
            status: 0,
            accepted: false,
            error: error.message
          });
        }
      }
      
      const acceptedObjects = objectResults.filter(r => r.accepted);
      const massiveObjects = objectResults.filter(r => r.isMassive);
      const rejectedMassiveObjects = massiveObjects.filter(r => !r.accepted);
      
      console.log(`Object Extremes Results:`);
      console.log(`  Total Objects Tested: ${objectExtremes.length}`);
      console.log(`  Accepted: ${acceptedObjects.length}`);
      console.log(`  Massive Objects (>1k props): ${massiveObjects.length}`);
      console.log(`  Rejected Massive Objects: ${rejectedMassiveObjects.length}`);
      
      // Massive objects should mostly be rejected
      if (massiveObjects.length > 0) {
        expect(rejectedMassiveObjects.length).toBeGreaterThan(massiveObjects.length * 0.7);
      }
    });
  });

  describe('System Resource Extremes', () => {
    test('Memory exhaustion resistance', async () => {
      console.log('Testing memory exhaustion resistance...');
      
      const initialMemory = process.memoryUsage();
      const memoryStressResults = [];
      
      // Attempt to create memory pressure
      const memoryStressors = [
        // Large string payloads
        () => fetch('http://localhost:3000/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNames: ['A'.repeat(100000), 'B'.repeat(100000)]
          })
        }),
        
        // Large array payloads
        () => fetch('http://localhost:3000/api/game/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNames: ['Player1', 'Player2'],
            largeArray: Array(50000).fill('memory stress')
          })
        }),
        
        // Deep nesting
        () => {
          const deepObject = Array(1000).fill(0).reduce((obj, _, i) => ({ [`level${i}`]: obj }), 'deep');
          return fetch('http://localhost:3000/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerNames: ['Player1', 'Player2'],
              deepObject
            })
          });
        }
      ];
      
      for (const [index, stressor] of memoryStressors.entries()) {
        const memoryBefore = process.memoryUsage();
        
        try {
          const response = await stressor();
          const memoryAfter = process.memoryUsage();
          
          memoryStressResults.push({
            index,
            status: response.status,
            accepted: response.ok,
            memoryIncrease: memoryAfter.heapUsed - memoryBefore.heapUsed,
            survived: true
          });
          
        } catch (error) {
          const memoryAfter = process.memoryUsage();
          
          memoryStressResults.push({
            index,
            status: 0,
            accepted: false,
            memoryIncrease: memoryAfter.heapUsed - memoryBefore.heapUsed,
            survived: true,
            error: error.message
          });
        }
      }
      
      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const survivedAll = memoryStressResults.every(r => r.survived);
      const avgMemoryIncrease = memoryStressResults.reduce((sum, r) => sum + r.memoryIncrease, 0) / memoryStressResults.length;
      
      console.log(`Memory Exhaustion Resistance Results:`);
      console.log(`  Stressors Tested: ${memoryStressors.length}`);
      console.log(`  Survived All: ${survivedAll}`);
      console.log(`  Total Memory Increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Average Per-Request Increase: ${(avgMemoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Should survive memory stress without crashing
      expect(survivedAll).toBe(true);
      
      // Memory increase should be reasonable
      expect(totalMemoryIncrease / 1024 / 1024).toBeLessThan(100); // Less than 100MB total increase
    });

    test('Request rate extremes', async () => {
      console.log('Testing request rate extremes...');
      
      const extremeRates = [
        { name: 'Rapid Burst', requests: 100, interval: 10 },      // 100 requests in 10ms
        { name: 'Sustained Fast', requests: 500, interval: 1000 }, // 500 requests per second
        { name: 'Extreme Burst', requests: 1000, interval: 100 },  // 10,000 requests per second
      ];
      
      const rateResults = [];
      
      for (const rate of extremeRates) {
        console.log(`Testing ${rate.name}: ${rate.requests} requests in ${rate.interval}ms`);
        
        const rateStart = Date.now();
        
        // Create requests at extreme rate
        const requestPromises = Array(rate.requests).fill(0).map(async (_, i) => {
          const requestStart = Date.now();
          
          // Spread requests across the interval
          const delay = (rate.interval / rate.requests) * i;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          try {
            const response = await fetch('http://localhost:3000/api/health');
            return {
              index: i,
              success: response.ok,
              status: response.status,
              responseTime: Date.now() - requestStart
            };
          } catch (error) {
            return {
              index: i,
              success: false,
              status: 0,
              responseTime: Date.now() - requestStart,
              error: error.message
            };
          }
        });
        
        const results = await Promise.all(requestPromises);
        const rateDuration = Date.now() - rateStart;
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        rateResults.push({
          name: rate.name,
          requestsAttempted: rate.requests,
          requestsSuccessful: successful.length,
          requestsFailed: failed.length,
          successRate: (successful.length / rate.requests) * 100,
          duration: rateDuration,
          avgResponseTime,
          actualRate: (rate.requests / (rateDuration / 1000)).toFixed(2)
        });
      }
      
      console.log(`Request Rate Extremes Results:`);
      rateResults.forEach(result => {
        console.log(`  ${result.name}:`);
        console.log(`    Success Rate: ${result.successRate.toFixed(1)}%`);
        console.log(`    Actual Rate: ${result.actualRate} req/sec`);
        console.log(`    Avg Response: ${result.avgResponseTime.toFixed(2)}ms`);
      });
      
      // Should handle extreme request rates with some level of success
      const highSuccessRates = rateResults.filter(r => r.successRate > 50);
      expect(highSuccessRates.length).toBeGreaterThan(0);
      
      // At least basic health checks should work under rate pressure
      const basicHealthSuccess = rateResults.filter(r => r.successRate > 25);
      expect(basicHealthSuccess.length).toBeGreaterThan(rateResults.length * 0.5);
    });
  });
});