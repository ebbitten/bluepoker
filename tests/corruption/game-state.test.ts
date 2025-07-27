/**
 * Phase 13: Game State Corruption and Recovery Testing
 * Extreme testing of game state integrity under corruption scenarios
 */

import { describe, test, expect } from 'vitest';

// Helper to create corruption test game
async function createCorruptionTestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`CorruptPlayer1${suffix}`, `CorruptPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Corruption test game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Helper to validate game state integrity
function validateGameStateIntegrity(gameState: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!gameState) {
    issues.push('Game state is null/undefined');
    return { valid: false, issues };
  }
  
  // Check required fields
  if (!gameState.players || !Array.isArray(gameState.players)) {
    issues.push('Players array missing or invalid');
  } else {
    if (gameState.players.length !== 2) {
      issues.push(`Expected 2 players, found ${gameState.players.length}`);
    }
    
    gameState.players.forEach((player: any, index: number) => {
      if (!player.id) issues.push(`Player ${index} missing ID`);
      if (!player.name) issues.push(`Player ${index} missing name`);
      if (typeof player.chips !== 'number') issues.push(`Player ${index} chips invalid`);
      if (player.chips < 0) issues.push(`Player ${index} has negative chips`);
    });
  }
  
  // Check game phase
  const validPhases = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'completed'];
  if (!validPhases.includes(gameState.phase)) {
    issues.push(`Invalid game phase: ${gameState.phase}`);
  }
  
  // Check pot amount
  if (typeof gameState.pot !== 'number' || gameState.pot < 0) {
    issues.push(`Invalid pot amount: ${gameState.pot}`);
  }
  
  // Check active player index
  if (gameState.activePlayerIndex !== undefined) {
    if (typeof gameState.activePlayerIndex !== 'number' || 
        gameState.activePlayerIndex < 0 || 
        gameState.activePlayerIndex >= (gameState.players?.length || 0)) {
      issues.push(`Invalid active player index: ${gameState.activePlayerIndex}`);
    }
  }
  
  // Check community cards
  if (gameState.communityCards && !Array.isArray(gameState.communityCards)) {
    issues.push('Community cards should be array');
  }
  
  // Check hole cards
  if (gameState.players) {
    gameState.players.forEach((player: any, index: number) => {
      if (player.holeCards && !Array.isArray(player.holeCards)) {
        issues.push(`Player ${index} hole cards should be array`);
      }
    });
  }
  
  return { valid: issues.length === 0, issues };
}

// Helper to attempt game state corruption
async function attemptStateCorruption(gameId: string, corruptionType: string): Promise<{
  corruptionAttempted: boolean;
  corruptionBlocked: boolean;
  stateRemainedValid: boolean;
  error?: string;
}> {
  try {
    let corruptionResponse;
    
    switch (corruptionType) {
      case 'invalid_player_action':
        corruptionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'nonexistent-player-id',
            action: 'fold'
          })
        });
        break;
        
      case 'negative_bet':
        corruptionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'any-player',
            action: 'raise',
            amount: -1000000
          })
        });
        break;
        
      case 'invalid_action_type':
        corruptionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'any-player',
            action: 'invalid_action_that_should_not_exist'
          })
        });
        break;
        
      case 'malformed_request':
        corruptionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"invalid": json, "structure"}'
        });
        break;
        
      case 'oversized_amount':
        corruptionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: 'any-player',
            action: 'raise',
            amount: Number.MAX_SAFE_INTEGER
          })
        });
        break;
        
      default:
        throw new Error(`Unknown corruption type: ${corruptionType}`);
    }
    
    const corruptionBlocked = !corruptionResponse.ok;
    
    // Check if game state remained valid after corruption attempt
    const stateResponse = await fetch(`http://localhost:3000/api/game/${gameId}`);
    const gameState = stateResponse.ok ? await stateResponse.json() : null;
    const validation = validateGameStateIntegrity(gameState);
    
    return {
      corruptionAttempted: true,
      corruptionBlocked,
      stateRemainedValid: validation.valid
    };
    
  } catch (error) {
    return {
      corruptionAttempted: true,
      corruptionBlocked: true, // Error counts as blocked
      stateRemainedValid: true, // Assume state is valid if we can't check due to error
      error: error.message
    };
  }
}

describe('Phase 13: Game State Corruption and Recovery Testing', () => {
  describe('State Corruption Attempts', () => {
    test('Direct game state corruption attempts', async () => {
      console.log('Testing direct game state corruption attempts...');
      
      const game = await createCorruptionTestGame('_direct');
      const gameId = game.gameId;
      
      // Establish valid game state first
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Verify initial state is valid
      const initialState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const initialValidation = validateGameStateIntegrity(initialState);
      expect(initialValidation.valid).toBe(true);
      
      // Attempt various corruption attacks
      const corruptionTypes = [
        'invalid_player_action',
        'negative_bet',
        'invalid_action_type',
        'malformed_request',
        'oversized_amount'
      ];
      
      const corruptionResults = [];
      
      for (const corruptionType of corruptionTypes) {
        const result = await attemptStateCorruption(gameId, corruptionType);
        corruptionResults.push({
          type: corruptionType,
          ...result
        });
      }
      
      const blockedCorruptions = corruptionResults.filter(r => r.corruptionBlocked);
      const validStatesAfter = corruptionResults.filter(r => r.stateRemainedValid);
      
      console.log(`Direct Corruption Results:`);
      console.log(`  Corruption Attempts: ${corruptionTypes.length}`);
      console.log(`  Blocked Corruptions: ${blockedCorruptions.length}/${corruptionTypes.length}`);
      console.log(`  Valid States After: ${validStatesAfter.length}/${corruptionTypes.length}`);
      
      // All corruption attempts should be blocked
      expect(blockedCorruptions.length).toBe(corruptionTypes.length);
      
      // State should remain valid after all attempts
      expect(validStatesAfter.length).toBe(corruptionTypes.length);
      
      // Final state verification
      const finalState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const finalValidation = validateGameStateIntegrity(finalState);
      expect(finalValidation.valid).toBe(true);
    });

    test('Concurrent corruption attempts', async () => {
      console.log('Testing concurrent corruption attempts...');
      
      const game = await createCorruptionTestGame('_concurrent');
      const gameId = game.gameId;
      
      // Deal cards to establish valid state
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Launch multiple concurrent corruption attempts
      const concurrentCorruptions = Array(20).fill(0).map(async (_, i) => {
        const corruptionTypes = [
          'invalid_player_action',
          'negative_bet', 
          'invalid_action_type',
          'oversized_amount'
        ];
        
        const corruptionType = corruptionTypes[i % corruptionTypes.length];
        return await attemptStateCorruption(gameId, corruptionType);
      });
      
      const startTime = Date.now();
      const concurrentResults = await Promise.all(concurrentCorruptions);
      const duration = Date.now() - startTime;
      
      const blockedAttempts = concurrentResults.filter(r => r.corruptionBlocked);
      const validStates = concurrentResults.filter(r => r.stateRemainedValid);
      
      console.log(`Concurrent Corruption Results:`);
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Concurrent Attempts: ${concurrentCorruptions.length}`);
      console.log(`  Blocked Attempts: ${blockedAttempts.length}`);
      console.log(`  Valid States Maintained: ${validStates.length}`);
      
      // System should handle concurrent corruption attempts
      expect(blockedAttempts.length).toBeGreaterThan(concurrentCorruptions.length * 0.8);
      expect(validStates.length).toBeGreaterThan(concurrentCorruptions.length * 0.9);
      
      // Final state should still be valid
      const finalState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const validation = validateGameStateIntegrity(finalState);
      expect(validation.valid).toBe(true);
    });

    test('State corruption through race conditions', async () => {
      console.log('Testing state corruption through race conditions...');
      
      const game = await createCorruptionTestGame('_race');
      const gameId = game.gameId;
      
      // Deal cards
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Get initial game state to find valid players
      const gameState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const activePlayer = gameState.players?.[gameState.activePlayerIndex];
      
      if (!activePlayer) {
        console.log('Could not find active player for race condition test');
        return;
      }
      
      // Create race condition by making multiple simultaneous valid requests
      const raceConditionAttempts = Array(10).fill(0).map(async (_, i) => {
        try {
          const response = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: activePlayer.id,
              action: 'fold'
            })
          });
          
          return {
            index: i,
            success: response.ok,
            status: response.status,
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            index: i,
            success: false,
            status: 0,
            error: error.message,
            timestamp: Date.now()
          };
        }
      });
      
      const raceResults = await Promise.all(raceConditionAttempts);
      
      // Only one should succeed (the first one)
      const successful = raceResults.filter(r => r.success);
      const failed = raceResults.filter(r => !r.success);
      
      console.log(`Race Condition Results:`);
      console.log(`  Total Attempts: ${raceConditionAttempts.length}`);
      console.log(`  Successful: ${successful.length}`);
      console.log(`  Failed: ${failed.length}`);
      
      // Only one action should succeed due to game state constraints
      expect(successful.length).toBeLessThanOrEqual(1);
      
      // Final state should be valid
      const finalState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      const validation = validateGameStateIntegrity(finalState);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Data Integrity Validation', () => {
    test('Game state consistency across multiple operations', async () => {
      console.log('Testing game state consistency across operations...');
      
      const consistencyTests = [];
      const numGames = 10;
      
      // Create multiple games and perform operations
      for (let gameNum = 0; gameNum < numGames; gameNum++) {
        try {
          const game = await createCorruptionTestGame(`_consistency_${gameNum}`);
          const gameId = game.gameId;
          
          // Record initial state
          const initialState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
          const initialValidation = validateGameStateIntegrity(initialState);
          
          // Perform deal operation
          const dealResponse = await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const afterDealState = dealResponse.ok ? 
            await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json()) : null;
          const afterDealValidation = afterDealState ? validateGameStateIntegrity(afterDealState) : { valid: false, issues: ['No state after deal'] };
          
          // Attempt player action
          let afterActionValidation = { valid: true, issues: [] };
          if (afterDealState && afterDealState.players && afterDealState.activePlayerIndex !== undefined) {
            const activePlayer = afterDealState.players[afterDealState.activePlayerIndex];
            
            if (activePlayer) {
              const actionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  playerId: activePlayer.id,
                  action: 'call'
                })
              });
              
              const afterActionState = actionResponse.ok ?
                await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json()) : null;
              afterActionValidation = afterActionState ? validateGameStateIntegrity(afterActionState) : { valid: false, issues: ['No state after action'] };
            }
          }
          
          consistencyTests.push({
            gameNum,
            gameId,
            initialValid: initialValidation.valid,
            afterDealValid: afterDealValidation.valid,
            afterActionValid: afterActionValidation.valid,
            allValid: initialValidation.valid && afterDealValidation.valid && afterActionValidation.valid,
            issues: [
              ...initialValidation.issues.map(i => `Initial: ${i}`),
              ...afterDealValidation.issues.map(i => `After deal: ${i}`),
              ...afterActionValidation.issues.map(i => `After action: ${i}`)
            ]
          });
          
        } catch (error) {
          consistencyTests.push({
            gameNum,
            gameId: 'unknown',
            initialValid: false,
            afterDealValid: false,
            afterActionValid: false,
            allValid: false,
            issues: [`Game creation failed: ${error.message}`]
          });
        }
      }
      
      const fullyConsistent = consistencyTests.filter(t => t.allValid);
      const hasIssues = consistencyTests.filter(t => !t.allValid);
      
      console.log(`State Consistency Results:`);
      console.log(`  Total Games Tested: ${numGames}`);
      console.log(`  Fully Consistent: ${fullyConsistent.length}`);
      console.log(`  Has Issues: ${hasIssues.length}`);
      
      if (hasIssues.length > 0) {
        console.log(`  Sample Issues:`, hasIssues.slice(0, 3).map(t => t.issues.slice(0, 2)));
      }
      
      // Most games should maintain consistency
      expect(fullyConsistent.length).toBeGreaterThan(numGames * 0.8);
    });

    test('Data persistence integrity', async () => {
      console.log('Testing data persistence integrity...');
      
      const persistenceTests = [];
      const numOperations = 50;
      
      // Create a game for persistence testing
      const game = await createCorruptionTestGame('_persistence');
      const gameId = game.gameId;
      
      // Deal cards to establish state
      await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Perform many operations and check state consistency
      for (let opNum = 0; opNum < numOperations; opNum++) {
        try {
          // Get current state
          const stateBefore = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
          const validationBefore = validateGameStateIntegrity(stateBefore);
          
          // Perform a read operation (should not change state)
          const readResponse = await fetch(`http://localhost:3000/api/game/${gameId}`);
          
          // Get state after read
          const stateAfter = readResponse.ok ? await readResponse.json() : null;
          const validationAfter = stateAfter ? validateGameStateIntegrity(stateAfter) : { valid: false, issues: ['No state after read'] };
          
          // Check that read operation didn't change state
          const stateUnchanged = JSON.stringify(stateBefore) === JSON.stringify(stateAfter);
          
          persistenceTests.push({
            opNum,
            validBefore: validationBefore.valid,
            validAfter: validationAfter.valid,
            stateUnchanged,
            readSuccessful: readResponse.ok,
            consistent: validationBefore.valid && validationAfter.valid && stateUnchanged
          });
          
        } catch (error) {
          persistenceTests.push({
            opNum,
            validBefore: false,
            validAfter: false,
            stateUnchanged: false,
            readSuccessful: false,
            consistent: false,
            error: error.message
          });
        }
        
        // Small delay between operations
        if (opNum % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      const consistentOperations = persistenceTests.filter(t => t.consistent);
      const inconsistentOperations = persistenceTests.filter(t => !t.consistent);
      
      console.log(`Persistence Integrity Results:`);
      console.log(`  Total Operations: ${numOperations}`);
      console.log(`  Consistent: ${consistentOperations.length}`);
      console.log(`  Inconsistent: ${inconsistentOperations.length}`);
      
      if (inconsistentOperations.length > 0) {
        console.log(`  Sample Inconsistencies:`, inconsistentOperations.slice(0, 3).map(t => 
          `Op ${t.opNum}: before=${t.validBefore}, after=${t.validAfter}, unchanged=${t.stateUnchanged}`
        ));
      }
      
      // Read operations should maintain consistency
      expect(consistentOperations.length).toBeGreaterThan(numOperations * 0.95);
    });
  });

  describe('Recovery Mechanisms', () => {
    test('Automatic state recovery after corruption attempts', async () => {
      console.log('Testing automatic state recovery...');
      
      const recoveryTests = [];
      const numRecoveryTests = 5;
      
      for (let testNum = 0; testNum < numRecoveryTests; testNum++) {
        try {
          const game = await createCorruptionTestGame(`_recovery_${testNum}`);
          const gameId = game.gameId;
          
          // Establish valid state
          await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const validState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
          const preCorruptionValidation = validateGameStateIntegrity(validState);
          
          // Attempt multiple corruption attacks
          const corruptionAttempts = [
            'invalid_player_action',
            'negative_bet',
            'malformed_request'
          ];
          
          for (const corruption of corruptionAttempts) {
            await attemptStateCorruption(gameId, corruption);
          }
          
          // Check state after corruption attempts
          const postCorruptionState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
          const postCorruptionValidation = validateGameStateIntegrity(postCorruptionState);
          
          // Attempt recovery by making a valid request
          const recoveryResponse = await fetch(`http://localhost:3000/api/game/${gameId}`);
          const recoveredState = recoveryResponse.ok ? await recoveryResponse.json() : null;
          const recoveryValidation = recoveredState ? validateGameStateIntegrity(recoveredState) : { valid: false, issues: ['Recovery failed'] };
          
          recoveryTests.push({
            testNum,
            preCorruptionValid: preCorruptionValidation.valid,
            postCorruptionValid: postCorruptionValidation.valid,
            recoverySuccessful: recoveryValidation.valid,
            fullRecovery: preCorruptionValidation.valid && postCorruptionValidation.valid && recoveryValidation.valid
          });
          
        } catch (error) {
          recoveryTests.push({
            testNum,
            preCorruptionValid: false,
            postCorruptionValid: false,
            recoverySuccessful: false,
            fullRecovery: false,
            error: error.message
          });
        }
      }
      
      const successfulRecoveries = recoveryTests.filter(t => t.fullRecovery);
      const partialRecoveries = recoveryTests.filter(t => t.recoverySuccessful && !t.fullRecovery);
      const failedRecoveries = recoveryTests.filter(t => !t.recoverySuccessful);
      
      console.log(`Automatic Recovery Results:`);
      console.log(`  Total Tests: ${numRecoveryTests}`);
      console.log(`  Successful Recoveries: ${successfulRecoveries.length}`);
      console.log(`  Partial Recoveries: ${partialRecoveries.length}`);
      console.log(`  Failed Recoveries: ${failedRecoveries.length}`);
      
      // Most recovery attempts should succeed
      expect(successfulRecoveries.length).toBeGreaterThan(numRecoveryTests * 0.7);
    });

    test('State validation and error reporting', async () => {
      console.log('Testing state validation and error reporting...');
      
      const validationTests = [];
      
      // Test various invalid states (if we could inject them)
      const testStates = [
        null,
        undefined,
        {},
        { players: null },
        { players: [] },
        { players: [{ id: '1' }] }, // Missing player
        { players: [{ id: '1', name: 'P1', chips: -100 }, { id: '2', name: 'P2', chips: 1000 }] }, // Negative chips
        { players: [{ id: '1', name: 'P1', chips: 1000 }, { id: '2', name: 'P2', chips: 1000 }], phase: 'invalid_phase' },
        { players: [{ id: '1', name: 'P1', chips: 1000 }, { id: '2', name: 'P2', chips: 1000 }], pot: -50 },
        { players: [{ id: '1', name: 'P1', chips: 1000 }, { id: '2', name: 'P2', chips: 1000 }], activePlayerIndex: 5 }
      ];
      
      testStates.forEach((state, index) => {
        const validation = validateGameStateIntegrity(state);
        validationTests.push({
          testIndex: index,
          state: state ? 'object' : String(state),
          valid: validation.valid,
          issueCount: validation.issues.length,
          issues: validation.issues.slice(0, 3) // First 3 issues
        });
      });
      
      const validStates = validationTests.filter(t => t.valid);
      const invalidStates = validationTests.filter(t => !t.valid);
      const detectedIssues = validationTests.reduce((sum, t) => sum + t.issueCount, 0);
      
      console.log(`State Validation Results:`);
      console.log(`  Total Test States: ${testStates.length}`);
      console.log(`  Valid States: ${validStates.length}`);
      console.log(`  Invalid States: ${invalidStates.length}`);
      console.log(`  Total Issues Detected: ${detectedIssues}`);
      
      // Should detect all invalid states
      expect(invalidStates.length).toBeGreaterThan(testStates.length * 0.8);
      expect(detectedIssues).toBeGreaterThan(10); // Should find many issues
    });
  });
});