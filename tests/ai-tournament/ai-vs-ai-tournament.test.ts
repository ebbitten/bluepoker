/**
 * Phase 29: AI vs AI Tournament of Minds Testing
 * Advanced testing for competitive AI systems playing against each other
 */

import { describe, test, expect } from 'vitest';

// AI Personality Types
type AIPersonality = 'aggressive' | 'conservative' | 'adaptive' | 'mathematical' | 'psychological' | 'unpredictable';

// AI Player Class
class AIPlayer {
  public id: string;
  public name: string;
  public personality: AIPersonality;
  public intelligenceLevel: number;
  public adaptationRate: number;
  public chips: number;
  public gamesPlayed: number;
  public gamesWon: number;
  public totalWinnings: number;
  public strategies: Map<string, number>;
  public opponentModels: Map<string, any>;
  
  constructor(id: string, name: string, personality: AIPersonality, intelligenceLevel: number = 1.0) {
    this.id = id;
    this.name = name;
    this.personality = personality;
    this.intelligenceLevel = intelligenceLevel;
    this.adaptationRate = Math.random() * 0.3 + 0.1; // 0.1 to 0.4
    this.chips = 10000;
    this.gamesPlayed = 0;
    this.gamesWon = 0;
    this.totalWinnings = 0;
    this.strategies = new Map();
    this.opponentModels = new Map();
    
    this.initializeStrategies();
  }
  
  private initializeStrategies(): void {
    const baseStrategies = {
      'aggressive': { betting: 0.8, bluffing: 0.7, folding: 0.2 },
      'conservative': { betting: 0.3, bluffing: 0.1, folding: 0.6 },
      'adaptive': { betting: 0.5, bluffing: 0.4, folding: 0.4 },
      'mathematical': { betting: 0.6, bluffing: 0.2, folding: 0.5 },
      'psychological': { betting: 0.5, bluffing: 0.8, folding: 0.3 },
      'unpredictable': { betting: Math.random(), bluffing: Math.random(), folding: Math.random() }
    };
    
    const strategy = baseStrategies[this.personality];
    Object.entries(strategy).forEach(([key, value]) => {
      this.strategies.set(key, value);
    });
  }
  
  // Make a poker decision based on game state
  makeDecision(gameState: {
    pot: number;
    minimumBet: number;
    opponentLastAction: string;
    handStrength: number;
    position: 'early' | 'late';
    roundType: 'preflop' | 'flop' | 'turn' | 'river';
  }): {
    action: 'fold' | 'call' | 'raise' | 'check';
    amount?: number;
    confidence: number;
    reasoning: string;
  } {
    const { pot, minimumBet, opponentLastAction, handStrength, position, roundType } = gameState;
    
    // Apply personality-based decision making
    let baseDecision = this.calculateBaseDecision(handStrength, pot, minimumBet);
    
    // Adjust based on opponent modeling
    baseDecision = this.adjustForOpponent(baseDecision, opponentLastAction);
    
    // Apply intelligence and adaptation
    baseDecision = this.applyIntelligence(baseDecision, gameState);
    
    // Apply personality modifications
    baseDecision = this.applyPersonality(baseDecision, gameState);
    
    return baseDecision;
  }
  
  private calculateBaseDecision(handStrength: number, pot: number, minimumBet: number): {
    action: 'fold' | 'call' | 'raise' | 'check';
    amount?: number;
    confidence: number;
    reasoning: string;
  } {
    if (handStrength < 0.3) {
      return { action: 'fold', confidence: 0.8, reasoning: 'weak hand' };
    } else if (handStrength < 0.6) {
      return { action: 'call', confidence: 0.6, reasoning: 'moderate hand' };
    } else {
      return { 
        action: 'raise', 
        amount: minimumBet * 2, 
        confidence: 0.9, 
        reasoning: 'strong hand' 
      };
    }
  }
  
  private adjustForOpponent(decision: any, opponentLastAction: string): any {
    // Simple opponent modeling
    if (opponentLastAction === 'raise' && decision.action === 'call') {
      decision.confidence *= 0.8; // Reduce confidence when opponent raises
    } else if (opponentLastAction === 'fold' && decision.action === 'raise') {
      decision.confidence *= 1.2; // Increase confidence when opponent folds
    }
    
    return decision;
  }
  
  private applyIntelligence(decision: any, gameState: any): any {
    // Higher intelligence leads to better decision making
    const intelligenceBonus = (this.intelligenceLevel - 1.0) * 0.2;
    decision.confidence = Math.min(decision.confidence + intelligenceBonus, 1.0);
    
    return decision;
  }
  
  private applyPersonality(decision: any, gameState: any): any {
    const betting = this.strategies.get('betting') || 0.5;
    const bluffing = this.strategies.get('bluffing') || 0.5;
    const folding = this.strategies.get('folding') || 0.5;
    
    switch (this.personality) {
      case 'aggressive':
        if (decision.action === 'call' && Math.random() < betting) {
          decision.action = 'raise';
          decision.amount = gameState.minimumBet * 3;
          decision.reasoning += ' + aggressive play';
        }
        break;
        
      case 'conservative':
        if (decision.action === 'raise' && decision.confidence < 0.9) {
          decision.action = 'call';
          decision.reasoning += ' + conservative play';
        }
        break;
        
      case 'psychological':
        if (Math.random() < bluffing && gameState.handStrength < 0.4) {
          decision.action = 'raise';
          decision.amount = gameState.pot * 0.5;
          decision.reasoning = 'bluff attempt';
        }
        break;
        
      case 'unpredictable':
        if (Math.random() < 0.3) {
          const actions = ['fold', 'call', 'raise'] as const;
          decision.action = actions[Math.floor(Math.random() * actions.length)];
          decision.reasoning += ' + unpredictable';
        }
        break;
    }
    
    return decision;
  }
  
  // Learn from game results
  learnFromGame(result: 'win' | 'loss', opponentId: string, gameData: any): void {
    this.gamesPlayed++;
    
    if (result === 'win') {
      this.gamesWon++;
      this.totalWinnings += gameData.winAmount || 0;
      this.chips += gameData.winAmount || 0;
    } else {
      this.chips -= gameData.lossAmount || 0;
    }
    
    // Update opponent model
    if (!this.opponentModels.has(opponentId)) {
      this.opponentModels.set(opponentId, {
        gamesAgainst: 0,
        wins: 0,
        averageAggression: 0,
        patterns: []
      });
    }
    
    const opponentModel = this.opponentModels.get(opponentId);
    opponentModel.gamesAgainst++;
    
    if (result === 'loss') {
      opponentModel.wins++;
    }
    
    // Adapt strategies based on results
    this.adaptStrategies(result, gameData);
  }
  
  private adaptStrategies(result: 'win' | 'loss', gameData: any): void {
    const adaptationAmount = this.adaptationRate * (result === 'win' ? 1 : -1);
    
    // Adjust strategies based on what worked
    this.strategies.forEach((value, key) => {
      const newValue = Math.max(0.1, Math.min(0.9, value + adaptationAmount * Math.random() * 0.1));
      this.strategies.set(key, newValue);
    });
  }
  
  // Get player statistics
  getStats(): {
    winRate: number;
    totalEarnings: number;
    gamesPlayed: number;
    averageWinAmount: number;
    adaptationRate: number;
  } {
    return {
      winRate: this.gamesPlayed > 0 ? this.gamesWon / this.gamesPlayed : 0,
      totalEarnings: this.totalWinnings,
      gamesPlayed: this.gamesPlayed,
      averageWinAmount: this.gamesWon > 0 ? this.totalWinnings / this.gamesWon : 0,
      adaptationRate: this.adaptationRate
    };
  }
}

// Tournament Manager
class AITournamentManager {
  private players: AIPlayer[];
  private matches: Array<{
    id: string;
    player1: AIPlayer;
    player2: AIPlayer;
    result: any;
    timestamp: number;
  }>;
  private tournamentResults: any[];
  
  constructor() {
    this.players = [];
    this.matches = [];
    this.tournamentResults = [];
  }
  
  addPlayer(player: AIPlayer): void {
    this.players.push(player);
  }
  
  // Run a single match between two AI players
  runMatch(player1: AIPlayer, player2: AIPlayer): {
    winner: AIPlayer;
    loser: AIPlayer;
    winAmount: number;
    gameLength: number;
    decisions: Array<any>;
  } {
    const decisions = [];
    let pot = 200; // Starting pot
    let rounds = 0;
    const maxRounds = 10;
    
    let p1Chips = 1000;
    let p2Chips = 1000;
    
    while (rounds < maxRounds && p1Chips > 0 && p2Chips > 0) {
      rounds++;
      
      // Simulate hand strength
      const p1HandStrength = Math.random();
      const p2HandStrength = Math.random();
      
      // Player 1 decision
      const p1Decision = player1.makeDecision({
        pot,
        minimumBet: 50,
        opponentLastAction: 'check',
        handStrength: p1HandStrength,
        position: 'early',
        roundType: 'flop'
      });
      
      decisions.push({ player: player1.id, decision: p1Decision, handStrength: p1HandStrength });
      
      // Player 2 decision
      const p2Decision = player2.makeDecision({
        pot,
        minimumBet: p1Decision.action === 'raise' ? (p1Decision.amount || 50) : 50,
        opponentLastAction: p1Decision.action,
        handStrength: p2HandStrength,
        position: 'late',
        roundType: 'flop'
      });
      
      decisions.push({ player: player2.id, decision: p2Decision, handStrength: p2HandStrength });
      
      // Determine round winner (simplified)
      let roundWinner: AIPlayer;
      let roundAmount = 100;
      
      if (p1Decision.action === 'fold') {
        roundWinner = player2;
      } else if (p2Decision.action === 'fold') {
        roundWinner = player1;
      } else {
        // Compare hand strengths
        roundWinner = p1HandStrength > p2HandStrength ? player1 : player2;
        roundAmount = pot + (p1Decision.amount || 0) + (p2Decision.amount || 0);
      }
      
      if (roundWinner === player1) {
        p1Chips += roundAmount;
        p2Chips -= roundAmount / 2;
      } else {
        p2Chips += roundAmount;
        p1Chips -= roundAmount / 2;
      }
      
      pot = 200; // Reset pot for next round
    }
    
    const winner = p1Chips > p2Chips ? player1 : player2;
    const loser = winner === player1 ? player2 : player1;
    const winAmount = Math.abs(p1Chips - p2Chips);
    
    // Record match
    this.matches.push({
      id: `match_${Date.now()}`,
      player1,
      player2,
      result: {
        winner: winner.id,
        winAmount,
        gameLength: rounds,
        finalChips: { [player1.id]: p1Chips, [player2.id]: p2Chips }
      },
      timestamp: Date.now()
    });
    
    // Update player learning
    winner.learnFromGame('win', loser.id, { winAmount });
    loser.learnFromGame('loss', winner.id, { lossAmount: winAmount });
    
    return {
      winner,
      loser,
      winAmount,
      gameLength: rounds,
      decisions
    };
  }
  
  // Run round-robin tournament
  runRoundRobinTournament(): {
    results: Array<any>;
    finalRankings: Array<any>;
    matchStatistics: any;
  } {
    const results = [];
    
    // Every player plays every other player
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const matchResult = this.runMatch(this.players[i], this.players[j]);
        results.push(matchResult);
      }
    }
    
    // Calculate final rankings
    const finalRankings = this.players
      .map(player => ({
        player,
        stats: player.getStats(),
        intelligence: player.intelligenceLevel,
        personality: player.personality
      }))
      .sort((a, b) => b.stats.winRate - a.stats.winRate);
    
    const matchStatistics = this.calculateMatchStatistics(results);
    
    return {
      results,
      finalRankings,
      matchStatistics
    };
  }
  
  // Run elimination tournament
  runEliminationTournament(): {
    rounds: Array<any>;
    champion: AIPlayer;
    bracket: any;
  } {
    let currentPlayers = [...this.players];
    const rounds = [];
    const bracket = [];
    
    while (currentPlayers.length > 1) {
      const roundMatches = [];
      const winners = [];
      
      // Pair up players for this round
      for (let i = 0; i < currentPlayers.length; i += 2) {
        if (i + 1 < currentPlayers.length) {
          const match = this.runMatch(currentPlayers[i], currentPlayers[i + 1]);
          roundMatches.push(match);
          winners.push(match.winner);
        } else {
          // Odd player gets a bye
          winners.push(currentPlayers[i]);
        }
      }
      
      rounds.push(roundMatches);
      bracket.push(currentPlayers.map(p => p.id));
      currentPlayers = winners;
    }
    
    return {
      rounds,
      champion: currentPlayers[0],
      bracket
    };
  }
  
  private calculateMatchStatistics(results: any[]): {
    totalMatches: number;
    averageGameLength: number;
    personalityPerformance: Record<string, any>;
    intelligenceCorrelation: number;
  } {
    const totalMatches = results.length;
    const averageGameLength = results.reduce((sum, r) => sum + r.gameLength, 0) / totalMatches;
    
    // Analyze personality performance
    const personalityStats: Record<string, { wins: number; games: number }> = {};
    
    results.forEach(result => {
      const winnerPersonality = result.winner.personality;
      const loserPersonality = result.loser.personality;
      
      if (!personalityStats[winnerPersonality]) {
        personalityStats[winnerPersonality] = { wins: 0, games: 0 };
      }
      if (!personalityStats[loserPersonality]) {
        personalityStats[loserPersonality] = { wins: 0, games: 0 };
      }
      
      personalityStats[winnerPersonality].wins++;
      personalityStats[winnerPersonality].games++;
      personalityStats[loserPersonality].games++;
    });
    
    const personalityPerformance: Record<string, any> = {};
    Object.entries(personalityStats).forEach(([personality, stats]) => {
      personalityPerformance[personality] = {
        winRate: stats.wins / stats.games,
        totalGames: stats.games,
        totalWins: stats.wins
      };
    });
    
    // Calculate intelligence correlation with wins
    const intelligenceWinPairs = results.map(result => [
      result.winner.intelligenceLevel,
      1 // win
    ]).concat(results.map(result => [
      result.loser.intelligenceLevel,
      0 // loss
    ]));
    
    const avgIntelligence = intelligenceWinPairs.reduce((sum, pair) => sum + pair[0], 0) / intelligenceWinPairs.length;
    const avgWinRate = intelligenceWinPairs.reduce((sum, pair) => sum + pair[1], 0) / intelligenceWinPairs.length;
    
    let correlation = 0;
    if (intelligenceWinPairs.length > 1) {
      const numerator = intelligenceWinPairs.reduce((sum, pair) => 
        sum + (pair[0] - avgIntelligence) * (pair[1] - avgWinRate), 0);
      const denominator = Math.sqrt(
        intelligenceWinPairs.reduce((sum, pair) => sum + (pair[0] - avgIntelligence) ** 2, 0) *
        intelligenceWinPairs.reduce((sum, pair) => sum + (pair[1] - avgWinRate) ** 2, 0)
      );
      correlation = denominator !== 0 ? numerator / denominator : 0;
    }
    
    return {
      totalMatches,
      averageGameLength,
      personalityPerformance,
      intelligenceCorrelation: correlation
    };
  }
  
  // Get tournament leaderboard
  getLeaderboard(): Array<{
    rank: number;
    player: AIPlayer;
    winRate: number;
    totalEarnings: number;
    gamesPlayed: number;
  }> {
    return this.players
      .map(player => ({
        player,
        stats: player.getStats()
      }))
      .sort((a, b) => b.stats.winRate - a.stats.winRate)
      .map((entry, index) => ({
        rank: index + 1,
        player: entry.player,
        winRate: entry.stats.winRate,
        totalEarnings: entry.stats.totalEarnings,
        gamesPlayed: entry.stats.gamesPlayed
      }));
  }
}

describe('Phase 29: AI vs AI Tournament of Minds Testing', () => {
  describe('AI Player Behavior and Decision Making', () => {
    test('AI personality-based decision making', () => {
      console.log('Testing AI personality-based decision making...');
      
      const personalities: AIPersonality[] = ['aggressive', 'conservative', 'adaptive', 'mathematical', 'psychological', 'unpredictable'];
      const players = personalities.map((personality, index) => 
        new AIPlayer(`ai_${index}`, `${personality}_ai`, personality, 1.0 + index * 0.2)
      );
      
      const gameState = {
        pot: 500,
        minimumBet: 100,
        opponentLastAction: 'call',
        handStrength: 0.7,
        position: 'late' as const,
        roundType: 'flop' as const
      };
      
      const decisions = players.map(player => {
        const decision = player.makeDecision(gameState);
        return {
          personality: player.personality,
          intelligence: player.intelligenceLevel,
          decision: decision.action,
          confidence: decision.confidence,
          reasoning: decision.reasoning
        };
      });
      
      console.log(`AI Decision Making Results:`);
      decisions.forEach(result => {
        console.log(`  ${result.personality}: ${result.decision} (confidence: ${result.confidence.toFixed(2)}) - ${result.reasoning}`);
      });
      
      // Analyze decision diversity
      const uniqueDecisions = new Set(decisions.map(d => d.action));
      const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
      
      console.log(`  Decision Diversity: ${uniqueDecisions.size}/${decisions.length} unique decisions`);
      console.log(`  Average Confidence: ${avgConfidence.toFixed(3)}`);
      
      expect(decisions.length).toBe(personalities.length);
      expect(uniqueDecisions.size).toBeGreaterThan(1); // Should have decision diversity
      expect(avgConfidence).toBeGreaterThan(0);
    });
    
    test('AI learning and adaptation', () => {
      console.log('Testing AI learning and adaptation...');
      
      const player = new AIPlayer('adaptive_ai', 'Adaptive Player', 'adaptive', 1.5);
      const initialStats = player.getStats();
      const initialStrategies = new Map(player.strategies);
      
      // Simulate multiple games with different outcomes
      const gameResults = [
        { result: 'win' as const, opponentId: 'opponent1', data: { winAmount: 500 } },
        { result: 'loss' as const, opponentId: 'opponent1', data: { lossAmount: 300 } },
        { result: 'win' as const, opponentId: 'opponent2', data: { winAmount: 700 } },
        { result: 'win' as const, opponentId: 'opponent1', data: { winAmount: 400 } },
        { result: 'loss' as const, opponentId: 'opponent3', data: { lossAmount: 200 } }
      ];
      
      gameResults.forEach(game => {
        player.learnFromGame(game.result, game.opponentId, game.data);
      });
      
      const finalStats = player.getStats();
      const finalStrategies = new Map(player.strategies);
      
      console.log(`Learning Results:`);
      console.log(`  Games Played: ${initialStats.gamesPlayed} → ${finalStats.gamesPlayed}`);
      console.log(`  Win Rate: ${initialStats.winRate.toFixed(2)} → ${finalStats.winRate.toFixed(2)}`);
      console.log(`  Total Earnings: ${initialStats.totalEarnings} → ${finalStats.totalEarnings}`);
      
      // Check strategy adaptation
      let strategiesChanged = 0;
      initialStrategies.forEach((value, key) => {
        const newValue = finalStrategies.get(key) || 0;
        if (Math.abs(value - newValue) > 0.01) {
          strategiesChanged++;
          console.log(`  Strategy ${key}: ${value.toFixed(3)} → ${newValue.toFixed(3)}`);
        }
      });
      
      console.log(`  Strategies Adapted: ${strategiesChanged}/${initialStrategies.size}`);
      
      expect(finalStats.gamesPlayed).toBe(gameResults.length);
      expect(finalStats.winRate).toBeGreaterThan(0);
      expect(strategiesChanged).toBeGreaterThan(0); // Should adapt strategies
    });
  });
  
  describe('Tournament Mechanics', () => {
    test('Round-robin tournament execution', async () => {
      console.log('Testing round-robin tournament...');
      
      const tournament = new AITournamentManager();
      
      // Create diverse AI players
      const players = [
        new AIPlayer('ai1', 'Aggressive Alpha', 'aggressive', 1.8),
        new AIPlayer('ai2', 'Conservative Beta', 'conservative', 1.2),
        new AIPlayer('ai3', 'Adaptive Gamma', 'adaptive', 1.5),
        new AIPlayer('ai4', 'Mathematical Delta', 'mathematical', 2.0),
        new AIPlayer('ai5', 'Psychological Epsilon', 'psychological', 1.7),
        new AIPlayer('ai6', 'Unpredictable Zeta', 'unpredictable', 1.0)
      ];
      
      players.forEach(player => tournament.addPlayer(player));
      
      const tournamentResult = tournament.runRoundRobinTournament();
      
      console.log(`Round-Robin Tournament Results:`);
      console.log(`  Total Matches: ${tournamentResult.matchStatistics.totalMatches}`);
      console.log(`  Average Game Length: ${tournamentResult.matchStatistics.averageGameLength.toFixed(1)} rounds`);
      console.log(`  Intelligence-Win Correlation: ${tournamentResult.matchStatistics.intelligenceCorrelation.toFixed(3)}`);
      
      console.log(`  Final Rankings:`);
      tournamentResult.finalRankings.forEach((entry, index) => {
        console.log(`    ${index + 1}. ${entry.player.name} (${entry.personality}) - Win Rate: ${entry.stats.winRate.toFixed(2)}, Intelligence: ${entry.intelligence}`);
      });
      
      console.log(`  Personality Performance:`);
      Object.entries(tournamentResult.matchStatistics.personalityPerformance).forEach(([personality, stats]) => {
        console.log(`    ${personality}: ${stats.winRate.toFixed(2)} win rate (${stats.totalWins}/${stats.totalGames})`);
      });
      
      expect(tournamentResult.results.length).toBeGreaterThan(0);
      expect(tournamentResult.finalRankings.length).toBe(players.length);
      expect(tournamentResult.matchStatistics.totalMatches).toBe((players.length * (players.length - 1)) / 2);
    });
    
    test('Elimination tournament bracket', () => {
      console.log('Testing elimination tournament...');
      
      const tournament = new AITournamentManager();
      
      // Create 8 players for clean bracket
      const players = [];
      for (let i = 0; i < 8; i++) {
        const personalities: AIPersonality[] = ['aggressive', 'conservative', 'adaptive', 'mathematical'];
        const personality = personalities[i % personalities.length];
        players.push(new AIPlayer(`ai${i}`, `Player ${i}`, personality, 1.0 + Math.random()));
      }
      
      players.forEach(player => tournament.addPlayer(player));
      
      const eliminationResult = tournament.runEliminationTournament();
      
      console.log(`Elimination Tournament Results:`);
      console.log(`  Total Rounds: ${eliminationResult.rounds.length}`);
      console.log(`  Champion: ${eliminationResult.champion.name} (${eliminationResult.champion.personality})`);
      console.log(`  Champion Intelligence: ${eliminationResult.champion.intelligenceLevel.toFixed(2)}`);
      
      eliminationResult.rounds.forEach((round, roundIndex) => {
        console.log(`  Round ${roundIndex + 1}: ${round.length} matches`);
        round.forEach((match, matchIndex) => {
          console.log(`    Match ${matchIndex + 1}: ${match.winner.name} defeats ${match.loser.name}`);
        });
      });
      
      // Verify tournament structure
      const expectedRounds = Math.ceil(Math.log2(players.length));
      const totalMatches = eliminationResult.rounds.reduce((sum, round) => sum + round.length, 0);
      
      console.log(`  Expected Rounds: ${expectedRounds}, Actual: ${eliminationResult.rounds.length}`);
      console.log(`  Total Matches: ${totalMatches}`);
      
      expect(eliminationResult.champion).toBeDefined();
      expect(eliminationResult.rounds.length).toBeGreaterThan(0);
      expect(eliminationResult.rounds.length).toBeLessThanOrEqual(expectedRounds);
    });
  });
  
  describe('Competitive Intelligence Analysis', () => {
    test('Intelligence level impact on performance', () => {
      console.log('Testing intelligence level impact on performance...');
      
      const tournament = new AITournamentManager();
      
      // Create players with varying intelligence levels
      const intelligenceLevels = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
      const players = intelligenceLevels.map((intelligence, index) =>
        new AIPlayer(`ai_${intelligence}`, `AI Level ${intelligence}`, 'adaptive', intelligence)
      );
      
      players.forEach(player => tournament.addPlayer(player));
      
      const tournamentResult = tournament.runRoundRobinTournament();
      
      // Analyze intelligence vs performance correlation
      const performanceData = tournamentResult.finalRankings.map(entry => ({
        intelligence: entry.intelligence,
        winRate: entry.stats.winRate,
        totalEarnings: entry.stats.totalEarnings,
        rank: tournamentResult.finalRankings.indexOf(entry) + 1
      }));
      
      console.log(`Intelligence vs Performance Analysis:`);
      performanceData.forEach(data => {
        console.log(`  Intelligence ${data.intelligence}: Rank ${data.rank}, Win Rate ${data.winRate.toFixed(3)}, Earnings ${data.totalEarnings}`);
      });
      
      // Calculate correlation between intelligence and rank (lower rank is better)
      const avgIntelligence = performanceData.reduce((sum, d) => sum + d.intelligence, 0) / performanceData.length;
      const avgRank = performanceData.reduce((sum, d) => sum + d.rank, 0) / performanceData.length;
      
      const correlation = performanceData.reduce((sum, d) => 
        sum + (d.intelligence - avgIntelligence) * (d.rank - avgRank), 0) /
        Math.sqrt(
          performanceData.reduce((sum, d) => sum + (d.intelligence - avgIntelligence) ** 2, 0) *
          performanceData.reduce((sum, d) => sum + (d.rank - avgRank) ** 2, 0)
        );
      
      console.log(`  Intelligence-Rank Correlation: ${correlation.toFixed(3)} (negative is better)`);
      console.log(`  Overall Intelligence-Win Correlation: ${tournamentResult.matchStatistics.intelligenceCorrelation.toFixed(3)}`);
      
      expect(performanceData.length).toBe(intelligenceLevels.length);
      expect(Math.abs(correlation)).toBeGreaterThan(0.1); // Should show some correlation
    });
    
    test('Adaptive learning in competitive environment', () => {
      console.log('Testing adaptive learning in competitive environment...');
      
      const tournament = new AITournamentManager();
      
      // Create learning-capable players
      const players = [
        new AIPlayer('learner1', 'Fast Learner', 'adaptive', 1.5),
        new AIPlayer('learner2', 'Slow Learner', 'adaptive', 1.3),
        new AIPlayer('baseline', 'Baseline', 'mathematical', 1.4)
      ];
      
      // Set different adaptation rates
      players[0].adaptationRate = 0.4; // Fast learner
      players[1].adaptationRate = 0.1; // Slow learner
      players[2].adaptationRate = 0.0; // No adaptation
      
      players.forEach(player => tournament.addPlayer(player));
      
      // Run multiple tournament rounds to see adaptation
      const rounds = 5;
      const roundResults = [];
      
      for (let round = 0; round < rounds; round++) {
        const roundResult = tournament.runRoundRobinTournament();
        const leaderboard = tournament.getLeaderboard();
        
        roundResults.push({
          round: round + 1,
          leaderboard: leaderboard.map(entry => ({
            name: entry.player.name,
            winRate: entry.winRate,
            adaptationRate: entry.player.adaptationRate
          }))
        });
        
        console.log(`Round ${round + 1} Results:`);
        leaderboard.forEach((entry, index) => {
          console.log(`  ${index + 1}. ${entry.player.name}: ${entry.winRate.toFixed(3)} win rate`);
        });
      }
      
      // Analyze learning progression
      const learningAnalysis = players.map(player => {
        const playerResults = roundResults.map(round => {
          const playerEntry = round.leaderboard.find(entry => entry.name === player.name);
          return playerEntry ? playerEntry.winRate : 0;
        });
        
        const initialWinRate = playerResults[0];
        const finalWinRate = playerResults[playerResults.length - 1];
        const improvement = finalWinRate - initialWinRate;
        
        return {
          name: player.name,
          adaptationRate: player.adaptationRate,
          initialWinRate,
          finalWinRate,
          improvement,
          winRateProgression: playerResults
        };
      });
      
      console.log(`Learning Analysis:`);
      learningAnalysis.forEach(analysis => {
        console.log(`  ${analysis.name}: ${analysis.improvement.toFixed(3)} improvement (${analysis.adaptationRate} adaptation rate)`);
      });
      
      expect(roundResults.length).toBe(rounds);
      expect(learningAnalysis.length).toBe(players.length);
    });
  });
  
  describe('Advanced Tournament Scenarios', () => {
    test('Multi-tier intelligence tournament', () => {
      console.log('Testing multi-tier intelligence tournament...');
      
      const tournament = new AITournamentManager();
      
      // Create players in different intelligence tiers
      const tiers = [
        { name: 'Novice', range: [0.5, 1.0], count: 4 },
        { name: 'Intermediate', range: [1.0, 1.5], count: 3 },
        { name: 'Expert', range: [1.5, 2.0], count: 2 },
        { name: 'Genius', range: [2.0, 3.0], count: 1 }
      ];
      
      let playerId = 0;
      tiers.forEach(tier => {
        for (let i = 0; i < tier.count; i++) {
          const intelligence = tier.range[0] + Math.random() * (tier.range[1] - tier.range[0]);
          const personalities: AIPersonality[] = ['aggressive', 'conservative', 'adaptive', 'mathematical'];
          const personality = personalities[playerId % personalities.length];
          
          tournament.addPlayer(new AIPlayer(
            `tier_${tier.name}_${i}`,
            `${tier.name} Player ${i}`,
            personality,
            intelligence
          ));
          playerId++;
        }
      });
      
      const tournamentResult = tournament.runRoundRobinTournament();
      
      // Analyze performance by tier
      const tierAnalysis = tiers.map(tier => {
        const tierPlayers = tournamentResult.finalRankings.filter(entry => 
          entry.player.name.includes(tier.name)
        );
        
        const avgWinRate = tierPlayers.reduce((sum, entry) => sum + entry.stats.winRate, 0) / tierPlayers.length;
        const avgRank = tierPlayers.reduce((sum, entry, index) => 
          sum + (tournamentResult.finalRankings.indexOf(entry) + 1), 0) / tierPlayers.length;
        const avgIntelligence = tierPlayers.reduce((sum, entry) => sum + entry.intelligence, 0) / tierPlayers.length;
        
        return {
          tier: tier.name,
          playerCount: tierPlayers.length,
          avgWinRate,
          avgRank,
          avgIntelligence,
          topPlayer: tierPlayers[0]?.player.name || 'None'
        };
      });
      
      console.log(`Multi-Tier Tournament Analysis:`);
      tierAnalysis.forEach(analysis => {
        console.log(`  ${analysis.tier} Tier:`);
        console.log(`    Players: ${analysis.playerCount}`);
        console.log(`    Avg Intelligence: ${analysis.avgIntelligence.toFixed(2)}`);
        console.log(`    Avg Win Rate: ${analysis.avgWinRate.toFixed(3)}`);
        console.log(`    Avg Rank: ${analysis.avgRank.toFixed(1)}`);
        console.log(`    Top Player: ${analysis.topPlayer}`);
      });
      
      expect(tierAnalysis.length).toBe(tiers.length);
      expect(tournamentResult.finalRankings.length).toBe(tiers.reduce((sum, tier) => sum + tier.count, 0));
    });
    
    test('Personality clash dynamics', () => {
      console.log('Testing personality clash dynamics...');
      
      const tournament = new AITournamentManager();
      
      // Create players with contrasting personalities
      const personalityPairs = [
        ['aggressive', 'conservative'],
        ['psychological', 'mathematical'],
        ['adaptive', 'unpredictable']
      ];
      
      personalityPairs.forEach((pair, pairIndex) => {
        pair.forEach((personality, playerIndex) => {
          tournament.addPlayer(new AIPlayer(
            `${personality}_${pairIndex}`,
            `${personality} Player ${pairIndex}`,
            personality as AIPersonality,
            1.5 + Math.random() * 0.5
          ));
        });
      });
      
      const tournamentResult = tournament.runRoundRobinTournament();
      
      // Analyze personality matchups
      const matchupAnalysis: Record<string, any> = {};
      
      tournamentResult.results.forEach(match => {
        const winnerPersonality = match.winner.personality;
        const loserPersonality = match.loser.personality;
        const matchup = `${winnerPersonality} vs ${loserPersonality}`;
        const reverseMatchup = `${loserPersonality} vs ${winnerPersonality}`;
        
        if (!matchupAnalysis[matchup]) {
          matchupAnalysis[matchup] = { wins: 0, losses: 0 };
        }
        if (!matchupAnalysis[reverseMatchup]) {
          matchupAnalysis[reverseMatchup] = { wins: 0, losses: 0 };
        }
        
        matchupAnalysis[matchup].wins++;
        matchupAnalysis[reverseMatchup].losses++;
      });
      
      console.log(`Personality Matchup Analysis:`);
      Object.entries(matchupAnalysis).forEach(([matchup, stats]) => {
        if (stats.wins > 0) { // Only show winning matchups
          const winRate = stats.wins / (stats.wins + stats.losses);
          console.log(`  ${matchup}: ${stats.wins} wins, ${winRate.toFixed(2)} win rate`);
        }
      });
      
      expect(Object.keys(matchupAnalysis).length).toBeGreaterThan(0);
      expect(tournamentResult.results.length).toBeGreaterThan(0);
    });
  });
});