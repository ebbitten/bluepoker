/**
 * Phase 14: Multi-Table Tournament Simulation
 * Advanced testing of multiple concurrent games and tournament-style scenarios
 */

import { describe, test, expect } from 'vitest';

// Helper to create tournament test game
async function createTournamentGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`TourneyPlayer1${suffix}`, `TourneyPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Tournament game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Helper to simulate a complete game
async function simulateCompleteGame(gameId: string): Promise<{
  completed: boolean;
  winner?: string;
  duration: number;
  actions: number;
}> {
  const startTime = Date.now();
  let actions = 0;
  
  try {
    // Deal cards
    const dealResponse = await fetch(`http://localhost:3000/api/game/${gameId}/deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!dealResponse.ok) {
      return { completed: false, duration: Date.now() - startTime, actions };
    }
    
    actions++;
    
    // Play until game is complete
    let gameComplete = false;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loops
    
    while (!gameComplete && attempts < maxAttempts) {
      const gameState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
      
      if (gameState.phase === 'completed') {
        gameComplete = true;
        break;
      }
      
      if (gameState.players && gameState.activePlayerIndex !== undefined) {
        const activePlayer = gameState.players[gameState.activePlayerIndex];
        
        if (activePlayer) {
          // Make a random action (weighted towards folding to end games quickly)
          const actionChoice = Math.random();
          const action = actionChoice < 0.6 ? 'fold' : actionChoice < 0.8 ? 'call' : 'check';
          
          const actionResponse = await fetch(`http://localhost:3000/api/game/${gameId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: activePlayer.id,
              action
            })
          });
          
          actions++;
          
          if (actionResponse.ok) {
            const updatedState = await actionResponse.json();
            if (updatedState.gameState?.phase === 'completed') {
              gameComplete = true;
            }
          }
        }
      }
      
      attempts++;
    }
    
    // Get final state
    const finalState = await fetch(`http://localhost:3000/api/game/${gameId}`).then(r => r.json());
    
    return {
      completed: finalState.phase === 'completed',
      winner: finalState.winner,
      duration: Date.now() - startTime,
      actions
    };
    
  } catch (error) {
    return {
      completed: false,
      duration: Date.now() - startTime,
      actions
    };
  }
}

// Tournament bracket simulation
class TournamentBracket {
  private games: Array<{ gameId: string; players: string[]; completed: boolean; winner?: string }> = [];
  
  async createTournament(numTables: number): Promise<void> {
    for (let i = 0; i < numTables; i++) {
      try {
        const game = await createTournamentGame(`_bracket_${i}`);
        this.games.push({
          gameId: game.gameId,
          players: [`Player${i}A`, `Player${i}B`],
          completed: false
        });
      } catch (error) {
        console.log(`Failed to create tournament table ${i}:`, error.message);
      }
    }
  }
  
  async simulateTournament(): Promise<{
    totalGames: number;
    completedGames: number;
    duration: number;
    winners: string[];
  }> {
    const startTime = Date.now();
    const simulationPromises = this.games.map(async (game, index) => {
      const result = await simulateCompleteGame(game.gameId);
      
      this.games[index].completed = result.completed;
      this.games[index].winner = result.winner;
      
      return result;
    });
    
    const results = await Promise.all(simulationPromises);
    const duration = Date.now() - startTime;
    
    const completedGames = results.filter(r => r.completed).length;
    const winners = this.games.filter(g => g.winner).map(g => g.winner!);
    
    return {
      totalGames: this.games.length,
      completedGames,
      duration,
      winners
    };
  }
  
  getGameStats() {
    return {
      totalTables: this.games.length,
      completedTables: this.games.filter(g => g.completed).length,
      activeTables: this.games.filter(g => !g.completed).length,
      winners: this.games.filter(g => g.winner).map(g => g.winner)
    };
  }
}

describe('Phase 14: Multi-Table Tournament Simulation', () => {
  describe('Multiple Concurrent Games', () => {
    test('50 simultaneous poker games', async () => {
      console.log('Creating and running 50 simultaneous poker games...');
      
      const numGames = 50;
      const startTime = Date.now();
      
      // Create all games concurrently
      const gameCreationPromises = Array(numGames).fill(0).map((_, i) => 
        createTournamentGame(`_concurrent_${i}`)
      );
      
      const games = await Promise.allSettled(gameCreationPromises);
      const successfulGames = games
        .filter(g => g.status === 'fulfilled')
        .map(g => g.value);
      
      const creationTime = Date.now() - startTime;
      
      console.log(`Game creation: ${successfulGames.length}/${numGames} successful in ${creationTime}ms`);
      
      // Run all games concurrently
      const gameSimulationPromises = successfulGames.map(game => 
        simulateCompleteGame(game.gameId)
      );
      
      const gameResults = await Promise.all(gameSimulationPromises);
      const totalTime = Date.now() - startTime;
      
      const completedGames = gameResults.filter(r => r.completed);
      const avgDuration = gameResults.reduce((sum, r) => sum + r.duration, 0) / gameResults.length;
      const totalActions = gameResults.reduce((sum, r) => sum + r.actions, 0);
      
      console.log(`Multi-Game Results:`);
      console.log(`  Total Time: ${totalTime}ms`);
      console.log(`  Games Created: ${successfulGames.length}/${numGames}`);
      console.log(`  Games Completed: ${completedGames.length}/${successfulGames.length}`);
      console.log(`  Average Game Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Total Actions Performed: ${totalActions}`);
      console.log(`  Throughput: ${(totalActions / (totalTime / 1000)).toFixed(2)} actions/second`);
      
      // Should successfully handle many concurrent games
      expect(successfulGames.length).toBeGreaterThan(numGames * 0.8);
      expect(completedGames.length).toBeGreaterThan(successfulGames.length * 0.7);
    }, 300000); // 5 minute timeout for large test

    test('Tournament bracket simulation', async () => {
      console.log('Simulating tournament bracket with multiple tables...');
      
      const tournament = new TournamentBracket();
      await tournament.createTournament(16); // 16 tables
      
      const initialStats = tournament.getGameStats();
      console.log(`Tournament created: ${initialStats.totalTables} tables`);
      
      const tournamentResult = await tournament.simulateTournament();
      const finalStats = tournament.getGameStats();
      
      console.log(`Tournament Results:`);
      console.log(`  Total Tables: ${tournamentResult.totalGames}`);
      console.log(`  Completed: ${tournamentResult.completedGames}`);
      console.log(`  Duration: ${tournamentResult.duration}ms`);
      console.log(`  Winners: ${tournamentResult.winners.length}`);
      console.log(`  Completion Rate: ${(tournamentResult.completedGames / tournamentResult.totalGames * 100).toFixed(1)}%`);
      
      // Tournament should run successfully
      expect(tournamentResult.totalGames).toBe(16);
      expect(tournamentResult.completedGames).toBeGreaterThan(12); // At least 75% completion
      expect(tournamentResult.winners.length).toBeGreaterThan(10);
    });

    test('Scalability stress test with 100 tables', async () => {
      console.log('Testing scalability with 100 concurrent tables...');
      
      const numTables = 100;
      const scalabilityStart = Date.now();
      
      // Create games in batches to avoid overwhelming the system
      const batchSize = 25;
      const allGames = [];
      
      for (let batch = 0; batch < numTables / batchSize; batch++) {
        console.log(`Creating batch ${batch + 1}/${numTables / batchSize}...`);
        
        const batchPromises = Array(batchSize).fill(0).map((_, i) => 
          createTournamentGame(`_scale_${batch}_${i}`)
        );
        
        const batchGames = await Promise.allSettled(batchPromises);
        const successfulBatch = batchGames
          .filter(g => g.status === 'fulfilled')
          .map(g => g.value);
        
        allGames.push(...successfulBatch);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const creationTime = Date.now() - scalabilityStart;
      console.log(`Created ${allGames.length}/${numTables} games in ${creationTime}ms`);
      
      // Test concurrent operations on all games
      const operationPromises = allGames.map(async (game, index) => {
        try {
          // Perform a simple operation (get game state)
          const response = await fetch(`http://localhost:3000/api/game/${game.gameId}`);
          return {
            index,
            success: response.ok,
            status: response.status,
            gameId: game.gameId
          };
        } catch (error) {
          return {
            index,
            success: false,
            status: 0,
            error: error.message,
            gameId: game.gameId
          };
        }
      });
      
      const operationResults = await Promise.all(operationPromises);
      const totalScalabilityTime = Date.now() - scalabilityStart;
      
      const successfulOperations = operationResults.filter(r => r.success);
      const failedOperations = operationResults.filter(r => !r.success);
      
      console.log(`Scalability Test Results:`);
      console.log(`  Total Time: ${totalScalabilityTime}ms`);
      console.log(`  Games Created: ${allGames.length}/${numTables}`);
      console.log(`  Successful Operations: ${successfulOperations.length}/${allGames.length}`);
      console.log(`  Failed Operations: ${failedOperations.length}/${allGames.length}`);
      console.log(`  System Scalability: ${(successfulOperations.length / allGames.length * 100).toFixed(1)}%`);
      
      // Should handle large scale reasonably well
      expect(allGames.length).toBeGreaterThan(numTables * 0.7); // At least 70% creation success
      expect(successfulOperations.length).toBeGreaterThan(allGames.length * 0.8); // At least 80% operation success
    }, 600000); // 10 minute timeout for scale test
  });

  describe('Tournament Management Simulation', () => {
    test('Multi-round tournament progression', async () => {
      console.log('Simulating multi-round tournament progression...');
      
      const rounds = [
        { name: 'First Round', tables: 8 },
        { name: 'Quarter Finals', tables: 4 },
        { name: 'Semi Finals', tables: 2 },
        { name: 'Final', tables: 1 }
      ];
      
      const tournamentResults = [];
      
      for (const round of rounds) {
        console.log(`Starting ${round.name} with ${round.tables} tables...`);
        
        const roundStart = Date.now();
        const tournament = new TournamentBracket();
        
        // Create round
        await tournament.createTournament(round.tables);
        
        // Simulate round
        const roundResult = await tournament.simulateTournament();
        const roundDuration = Date.now() - roundStart;
        
        tournamentResults.push({
          round: round.name,
          tables: round.tables,
          completed: roundResult.completedGames,
          winners: roundResult.winners.length,
          duration: roundDuration,
          success: roundResult.completedGames === round.tables
        });
      }
      
      const successfulRounds = tournamentResults.filter(r => r.success);
      const totalDuration = tournamentResults.reduce((sum, r) => sum + r.duration, 0);
      const totalTables = tournamentResults.reduce((sum, r) => sum + r.tables, 0);
      
      console.log(`Multi-Round Tournament Results:`);
      console.log(`  Total Rounds: ${rounds.length}`);
      console.log(`  Successful Rounds: ${successfulRounds.length}`);
      console.log(`  Total Tables: ${totalTables}`);
      console.log(`  Total Duration: ${totalDuration}ms`);
      
      tournamentResults.forEach(r => {
        console.log(`  ${r.round}: ${r.completed}/${r.tables} completed in ${r.duration}ms`);
      });
      
      // Most rounds should complete successfully
      expect(successfulRounds.length).toBeGreaterThan(rounds.length * 0.75);
    });

    test('Concurrent tournament management', async () => {
      console.log('Testing concurrent tournament management...');
      
      const numTournaments = 5;
      const tablesPerTournament = 4;
      
      // Create multiple concurrent tournaments
      const tournamentPromises = Array(numTournaments).fill(0).map(async (_, tourneyIndex) => {
        const tournament = new TournamentBracket();
        
        try {
          await tournament.createTournament(tablesPerTournament);
          const result = await tournament.simulateTournament();
          
          return {
            tourneyIndex,
            success: true,
            ...result
          };
        } catch (error) {
          return {
            tourneyIndex,
            success: false,
            error: error.message,
            totalGames: 0,
            completedGames: 0,
            duration: 0,
            winners: []
          };
        }
      });
      
      const concurrentStart = Date.now();
      const tournamentResults = await Promise.all(tournamentPromises);
      const concurrentDuration = Date.now() - concurrentStart;
      
      const successfulTourneys = tournamentResults.filter(t => t.success);
      const totalGames = tournamentResults.reduce((sum, t) => sum + t.totalGames, 0);
      const totalCompleted = tournamentResults.reduce((sum, t) => sum + t.completedGames, 0);
      const totalWinners = tournamentResults.reduce((sum, t) => sum + t.winners.length, 0);
      
      console.log(`Concurrent Tournament Results:`);
      console.log(`  Concurrent Tournaments: ${numTournaments}`);
      console.log(`  Successful Tournaments: ${successfulTourneys.length}`);
      console.log(`  Total Duration: ${concurrentDuration}ms`);
      console.log(`  Total Games: ${totalGames}`);
      console.log(`  Total Completed: ${totalCompleted}`);
      console.log(`  Total Winners: ${totalWinners}`);
      console.log(`  Concurrent Efficiency: ${(totalCompleted / totalGames * 100).toFixed(1)}%`);
      
      // Should handle concurrent tournaments well
      expect(successfulTourneys.length).toBeGreaterThan(numTournaments * 0.6);
      expect(totalCompleted).toBeGreaterThan(totalGames * 0.7);
    });
  });

  describe('Resource Management Under Tournament Load', () => {
    test('Memory usage during large tournament', async () => {
      console.log('Testing memory usage during large tournament...');
      
      const initialMemory = process.memoryUsage();
      
      // Create large tournament
      const largeTournament = new TournamentBracket();
      await largeTournament.createTournament(30); // 30 tables
      
      const afterCreationMemory = process.memoryUsage();
      
      // Simulate tournament
      const tournamentResult = await largeTournament.simulateTournament();
      
      const afterSimulationMemory = process.memoryUsage();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      const creationMemoryIncrease = afterCreationMemory.heapUsed - initialMemory.heapUsed;
      const simulationMemoryIncrease = afterSimulationMemory.heapUsed - afterCreationMemory.heapUsed;
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Tournament Memory Usage:`);
      console.log(`  Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  After Creation: ${(afterCreationMemory.heapUsed / 1024 / 1024).toFixed(2)} MB (+${(creationMemoryIncrease / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  After Simulation: ${(afterSimulationMemory.heapUsed / 1024 / 1024).toFixed(2)} MB (+${(simulationMemoryIncrease / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Total Increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Tournament Success: ${tournamentResult.completedGames}/${tournamentResult.totalGames}`);
      
      // Memory usage should be reasonable
      const totalIncreasePercent = (totalMemoryIncrease / initialMemory.heapUsed) * 100;
      expect(totalIncreasePercent).toBeLessThan(50); // Less than 50% memory increase
      expect(tournamentResult.completedGames).toBeGreaterThan(tournamentResult.totalGames * 0.7);
    });

    test('System stability under sustained tournament load', async () => {
      console.log('Testing system stability under sustained tournament load...');
      
      const sustainedDuration = 60000; // 1 minute
      const tournamentInterval = 10000; // New tournament every 10 seconds
      
      const sustainedStart = Date.now();
      const sustainedResults = [];
      
      while (Date.now() - sustainedStart < sustainedDuration) {
        const iterationStart = Date.now();
        
        try {
          // Create small tournament
          const tournament = new TournamentBracket();
          await tournament.createTournament(3); // 3 tables
          
          // Quick simulation
          const result = await tournament.simulateTournament();
          
          sustainedResults.push({
            iteration: sustainedResults.length,
            success: true,
            duration: Date.now() - iterationStart,
            completed: result.completedGames,
            total: result.totalGames
          });
          
        } catch (error) {
          sustainedResults.push({
            iteration: sustainedResults.length,
            success: false,
            duration: Date.now() - iterationStart,
            error: error.message,
            completed: 0,
            total: 0
          });
        }
        
        // Wait for next interval
        const remainingTime = tournamentInterval - (Date.now() - iterationStart);
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }
      
      const totalSustainedTime = Date.now() - sustainedStart;
      const successfulIterations = sustainedResults.filter(r => r.success);
      const avgDuration = sustainedResults.reduce((sum, r) => sum + r.duration, 0) / sustainedResults.length;
      const totalGames = sustainedResults.reduce((sum, r) => sum + r.total, 0);
      const totalCompleted = sustainedResults.reduce((sum, r) => sum + r.completed, 0);
      
      console.log(`Sustained Load Results:`);
      console.log(`  Duration: ${totalSustainedTime}ms`);
      console.log(`  Tournament Iterations: ${sustainedResults.length}`);
      console.log(`  Successful Iterations: ${successfulIterations.length}`);
      console.log(`  Average Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  Total Games: ${totalGames}`);
      console.log(`  Total Completed: ${totalCompleted}`);
      console.log(`  System Stability: ${(successfulIterations.length / sustainedResults.length * 100).toFixed(1)}%`);
      
      // System should remain stable under sustained load
      expect(successfulIterations.length).toBeGreaterThan(sustainedResults.length * 0.8);
      expect(totalCompleted).toBeGreaterThan(totalGames * 0.7);
    }, 90000); // 1.5 minute timeout
  });
});