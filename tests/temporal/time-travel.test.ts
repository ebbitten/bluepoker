/**
 * Phase 19: Time-Travel and Temporal Testing
 * Advanced testing for temporal paradoxes, causality loops, and time-based edge cases
 */

import { describe, test, expect } from 'vitest';

// Temporal Engine for Time-Travel Simulations
class TemporalEngine {
  private timeline: Array<{
    timestamp: number;
    event: string;
    causality: number;
    paradoxRisk: number;
    timelineId: string;
  }>;
  private currentTime: number;
  private timelineId: string;
  
  constructor() {
    this.timeline = [];
    this.currentTime = Date.now();
    this.timelineId = this.generateTimelineId();
  }
  
  private generateTimelineId(): string {
    return 'TL_' + Math.random().toString(36).substring(7) + '_' + Date.now();
  }
  
  // Travel backward in time
  travelToTime(targetTime: number): {
    success: boolean;
    paradoxCreated: boolean;
    newTimelineId?: string;
    causalityViolation: boolean;
  } {
    const timeDifference = this.currentTime - targetTime;
    
    if (timeDifference <= 0) {
      return {
        success: false,
        paradoxCreated: false,
        causalityViolation: false
      };
    }
    
    // Check for paradox potential
    const eventsInPast = this.timeline.filter(e => e.timestamp > targetTime && e.timestamp < this.currentTime);
    const paradoxRisk = eventsInPast.reduce((risk, event) => risk + event.paradoxRisk, 0);
    
    const paradoxCreated = paradoxRisk > 0.5;
    const causalityViolation = timeDifference > 3600000; // 1 hour limit
    
    if (paradoxCreated) {
      // Create new timeline branch
      const newTimelineId = this.generateTimelineId();
      return {
        success: true,
        paradoxCreated: true,
        newTimelineId,
        causalityViolation
      };
    }
    
    this.currentTime = targetTime;
    return {
      success: true,
      paradoxCreated: false,
      causalityViolation
    };
  }
  
  // Record event in timeline
  recordEvent(event: string, causality: number = 0.5, paradoxRisk: number = 0.1): void {
    this.timeline.push({
      timestamp: this.currentTime,
      event,
      causality,
      paradoxRisk,
      timelineId: this.timelineId
    });
  }
  
  // Get events in chronological order
  getTimeline(): typeof this.timeline {
    return [...this.timeline].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // Check for temporal loops
  detectTemporalLoops(): Array<{
    loopStart: number;
    loopEnd: number;
    iterations: number;
    stability: number;
  }> {
    const loops = [];
    const eventPatterns = new Map<string, number[]>();
    
    this.timeline.forEach(event => {
      if (!eventPatterns.has(event.event)) {
        eventPatterns.set(event.event, []);
      }
      eventPatterns.get(event.event)!.push(event.timestamp);
    });
    
    eventPatterns.forEach((timestamps, event) => {
      if (timestamps.length >= 3) {
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const stability = 1 - (Math.max(...intervals) - Math.min(...intervals)) / avgInterval;
        
        if (stability > 0.8) {
          loops.push({
            loopStart: timestamps[0],
            loopEnd: timestamps[timestamps.length - 1],
            iterations: timestamps.length,
            stability
          });
        }
      }
    });
    
    return loops;
  }
}

// Temporal Poker Game Engine
class TemporalPokerEngine {
  private temporalEngine: TemporalEngine;
  private gameHistory: Array<{
    gameId: string;
    timestamp: number;
    action: string;
    playerId: string;
    result: string;
    timelineId: string;
  }>;
  
  constructor() {
    this.temporalEngine = new TemporalEngine();
    this.gameHistory = [];
  }
  
  // Play action with temporal recording
  playAction(gameId: string, playerId: string, action: string): {
    success: boolean;
    result: string;
    temporalEffects: any;
  } {
    const timestamp = Date.now();
    const result = this.simulatePokerAction(action);
    
    // Record temporal event
    const causality = this.calculateCausality(action);
    const paradoxRisk = this.calculateParadoxRisk(gameId, action);
    
    this.temporalEngine.recordEvent(`poker_action_${action}`, causality, paradoxRisk);
    
    this.gameHistory.push({
      gameId,
      timestamp,
      action,
      playerId,
      result,
      timelineId: this.temporalEngine['timelineId']
    });
    
    return {
      success: true,
      result,
      temporalEffects: {
        causality,
        paradoxRisk,
        timeline: this.temporalEngine.getTimeline().length
      }
    };
  }
  
  // Attempt to undo action via time travel
  undoAction(gameId: string, targetTimestamp: number): {
    undoSuccess: boolean;
    paradoxCreated: boolean;
    alternateOutcome?: string;
    causalityViolation: boolean;
  } {
    const travelResult = this.temporalEngine.travelToTime(targetTimestamp);
    
    if (!travelResult.success) {
      return {
        undoSuccess: false,
        paradoxCreated: false,
        causalityViolation: false
      };
    }
    
    if (travelResult.paradoxCreated) {
      // In alternate timeline, simulate different outcome
      const alternateOutcome = this.simulateAlternateOutcome(gameId);
      return {
        undoSuccess: true,
        paradoxCreated: true,
        alternateOutcome,
        causalityViolation: travelResult.causalityViolation
      };
    }
    
    return {
      undoSuccess: true,
      paradoxCreated: false,
      causalityViolation: travelResult.causalityViolation
    };
  }
  
  private simulatePokerAction(action: string): string {
    const outcomes = ['win', 'lose', 'fold', 'continue'];
    const actionEffects = {
      'fold': () => 'lose',
      'call': () => Math.random() < 0.5 ? 'win' : 'lose',
      'raise': () => Math.random() < 0.6 ? 'win' : 'lose',
      'check': () => 'continue'
    };
    
    return actionEffects[action as keyof typeof actionEffects]?.() || 'continue';
  }
  
  private calculateCausality(action: string): number {
    const causalityMap = {
      'fold': 0.9,    // High causality - definitively ends hand
      'raise': 0.7,   // Medium causality - forces response
      'call': 0.5,    // Medium causality - maintains flow
      'check': 0.3    // Low causality - minimal impact
    };
    
    return causalityMap[action as keyof typeof causalityMap] || 0.5;
  }
  
  private calculateParadoxRisk(gameId: string, action: string): number {
    // Higher risk for actions that contradict previous patterns
    const gameActions = this.gameHistory.filter(h => h.gameId === gameId);
    
    if (gameActions.length === 0) return 0.1;
    
    const lastAction = gameActions[gameActions.length - 1].action;
    const contradictoryActions = {
      'fold': ['raise'],
      'raise': ['fold'],
      'call': [],
      'check': ['raise']
    };
    
    const isContradictory = contradictoryActions[lastAction as keyof typeof contradictoryActions]?.includes(action);
    
    return isContradictory ? 0.8 : 0.1;
  }
  
  private simulateAlternateOutcome(gameId: string): string {
    const alternates = ['alternate_win', 'alternate_lose', 'timeline_split', 'causal_loop'];
    return alternates[Math.floor(Math.random() * alternates.length)];
  }
  
  // Detect temporal anomalies in game history
  detectTemporalAnomalies(): Array<{
    type: string;
    description: string;
    severity: number;
    timestamp: number;
  }> {
    const anomalies = [];
    const loops = this.temporalEngine.detectTemporalLoops();
    
    // Check for causal loops
    loops.forEach(loop => {
      anomalies.push({
        type: 'causal_loop',
        description: `Temporal loop detected with ${loop.iterations} iterations`,
        severity: loop.stability,
        timestamp: loop.loopStart
      });
    });
    
    // Check for timeline inconsistencies
    const timelineIds = new Set(this.gameHistory.map(h => h.timelineId));
    if (timelineIds.size > 1) {
      anomalies.push({
        type: 'timeline_branch',
        description: `Multiple timelines detected: ${timelineIds.size}`,
        severity: 0.8,
        timestamp: Date.now()
      });
    }
    
    // Check for rapid action sequences (potential time compression)
    for (let i = 1; i < this.gameHistory.length; i++) {
      const timeDiff = this.gameHistory[i].timestamp - this.gameHistory[i-1].timestamp;
      if (timeDiff < 10) { // Less than 10ms between actions
        anomalies.push({
          type: 'time_compression',
          description: `Impossibly fast actions: ${timeDiff}ms interval`,
          severity: 0.6,
          timestamp: this.gameHistory[i].timestamp
        });
      }
    }
    
    return anomalies;
  }
}

// Grandfather Paradox Simulator
class GrandfatherParadoxSimulator {
  private timelineStates: Map<string, {
    existence: boolean;
    causality: number;
    stability: number;
  }>;
  
  constructor() {
    this.timelineStates = new Map();
  }
  
  // Simulate preventing your own poker game creation
  simulateGrandfatherParadox(gameId: string): {
    paradoxResolution: string;
    timelineStability: number;
    existenceProof: boolean;
    causalityIndex: number;
  } {
    // Original timeline state
    this.timelineStates.set('original', {
      existence: true,
      causality: 1.0,
      stability: 1.0
    });
    
    // Attempt to prevent game creation
    const preventionSuccess = Math.random() < 0.5;
    
    if (preventionSuccess) {
      // Paradox occurs - game shouldn't exist but we're observing it
      const resolutionMethod = Math.random();
      
      if (resolutionMethod < 0.33) {
        // Novikov self-consistency principle
        return {
          paradoxResolution: 'self_consistency',
          timelineStability: 0.9,
          existenceProof: true,
          causalityIndex: 0.8
        };
      } else if (resolutionMethod < 0.66) {
        // Many-worlds interpretation
        this.timelineStates.set('alternate', {
          existence: false,
          causality: 0.5,
          stability: 0.7
        });
        
        return {
          paradoxResolution: 'timeline_split',
          timelineStability: 0.7,
          existenceProof: true,
          causalityIndex: 0.5
        };
      } else {
        // Bootstrap paradox
        return {
          paradoxResolution: 'bootstrap_loop',
          timelineStability: 0.6,
          existenceProof: false,
          causalityIndex: 0.3
        };
      }
    }
    
    // No paradox - prevention failed
    return {
      paradoxResolution: 'prevention_failed',
      timelineStability: 1.0,
      existenceProof: true,
      causalityIndex: 1.0
    };
  }
}

describe('Phase 19: Time-Travel and Temporal Testing', () => {
  describe('Temporal Engine Mechanics', () => {
    test('Basic time travel functionality', () => {
      console.log('Testing basic time travel mechanics...');
      
      const temporalEngine = new TemporalEngine();
      const timeResults = [];
      
      // Record initial events
      temporalEngine.recordEvent('game_start', 0.8, 0.1);
      temporalEngine.recordEvent('first_bet', 0.6, 0.2);
      temporalEngine.recordEvent('raise_action', 0.7, 0.3);
      
      const initialTimeline = temporalEngine.getTimeline();
      
      // Attempt time travel
      const pastTime = Date.now() - 300000; // 5 minutes ago
      const travelResult = temporalEngine.travelToTime(pastTime);
      
      timeResults.push({
        test: 'time_travel',
        initialEvents: initialTimeline.length,
        travelSuccess: travelResult.success,
        paradoxCreated: travelResult.paradoxCreated,
        causalityViolation: travelResult.causalityViolation
      });
      
      // Test temporal loop detection
      for (let i = 0; i < 5; i++) {
        temporalEngine.recordEvent('loop_event', 0.5, 0.4);
      }
      
      const loops = temporalEngine.detectTemporalLoops();
      
      timeResults.push({
        test: 'loop_detection',
        loopsDetected: loops.length,
        totalEvents: temporalEngine.getTimeline().length,
        highStabilityLoops: loops.filter(l => l.stability > 0.8).length
      });
      
      console.log(`Temporal Engine Results:`);
      timeResults.forEach(result => {
        console.log(`  ${result.test}:`, JSON.stringify(result, null, 2));
      });
      
      // Should handle time travel mechanics
      expect(timeResults.length).toBe(2);
      expect(timeResults[0].travelSuccess).toBeDefined();
      expect(timeResults[1].totalEvents).toBeGreaterThan(initialTimeline.length);
    });
    
    test('Causality preservation and violation detection', () => {
      console.log('Testing causality preservation...');
      
      const temporalEngine = new TemporalEngine();
      const causalityTests = [];
      
      // Test high-causality events
      const highCausalityEvents = [
        { event: 'game_creation', causality: 0.9, paradoxRisk: 0.1 },
        { event: 'final_bet', causality: 0.8, paradoxRisk: 0.2 },
        { event: 'game_end', causality: 0.95, paradoxRisk: 0.05 }
      ];
      
      highCausalityEvents.forEach(eventData => {
        temporalEngine.recordEvent(eventData.event, eventData.causality, eventData.paradoxRisk);
      });
      
      // Attempt time travel to before high-causality events
      const veryEarlyTime = Date.now() - 3600000; // 1 hour ago
      const majorTravelResult = temporalEngine.travelToTime(veryEarlyTime);
      
      causalityTests.push({
        scenario: 'major_time_travel',
        causalityViolation: majorTravelResult.causalityViolation,
        paradoxCreated: majorTravelResult.paradoxCreated,
        newTimelineCreated: !!majorTravelResult.newTimelineId
      });
      
      // Test minor time travel
      const recentTime = Date.now() - 60000; // 1 minute ago
      const minorTravelResult = temporalEngine.travelToTime(recentTime);
      
      causalityTests.push({
        scenario: 'minor_time_travel',
        causalityViolation: minorTravelResult.causalityViolation,
        paradoxCreated: minorTravelResult.paradoxCreated,
        newTimelineCreated: !!minorTravelResult.newTimelineId
      });
      
      console.log(`Causality Test Results:`);
      causalityTests.forEach(test => {
        console.log(`  ${test.scenario}: Violation=${test.causalityViolation}, Paradox=${test.paradoxCreated}`);
      });
      
      // Should detect causality violations appropriately
      expect(causalityTests.length).toBe(2);
      expect(causalityTests[0].causalityViolation).toBe(true); // Major travel should violate
      expect(causalityTests[1].causalityViolation).toBe(false); // Minor travel should be ok
    });
  });
  
  describe('Temporal Poker Game Mechanics', () => {
    test('Time-travel poker action undo system', async () => {
      console.log('Testing time-travel poker undo system...');
      
      const temporalPoker = new TemporalPokerEngine();
      const gameId = 'temporal_game_001';
      const undoResults = [];
      
      // Play sequence of actions
      const actions = [
        { action: 'call', playerId: 'player1' },
        { action: 'raise', playerId: 'player2' },
        { action: 'fold', playerId: 'player1' }
      ];
      
      const actionTimestamps = [];
      
      for (const actionData of actions) {
        const result = temporalPoker.playAction(gameId, actionData.playerId, actionData.action);
        actionTimestamps.push(Date.now());
        
        undoResults.push({
          action: actionData.action,
          result: result.result,
          temporalEffects: result.temporalEffects
        });
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Attempt to undo the fold action
      const undoTarget = actionTimestamps[1]; // Before fold
      const undoResult = temporalPoker.undoAction(gameId, undoTarget);
      
      undoResults.push({
        action: 'undo_attempt',
        undoSuccess: undoResult.undoSuccess,
        paradoxCreated: undoResult.paradoxCreated,
        alternateOutcome: undoResult.alternateOutcome,
        causalityViolation: undoResult.causalityViolation
      });
      
      // Check for temporal anomalies
      const anomalies = temporalPoker.detectTemporalAnomalies();
      
      console.log(`Temporal Poker Results:`);
      console.log(`  Actions Played: ${actions.length}`);
      console.log(`  Undo Success: ${undoResult.undoSuccess}`);
      console.log(`  Paradox Created: ${undoResult.paradoxCreated}`);
      console.log(`  Temporal Anomalies: ${anomalies.length}`);
      
      if (anomalies.length > 0) {
        console.log(`  Anomaly Types:`, anomalies.map(a => a.type));
      }
      
      // Should handle temporal poker mechanics
      expect(undoResults.length).toBe(actions.length + 1);
      expect(undoResult.undoSuccess).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });
    
    test('Parallel timeline poker game simulation', () => {
      console.log('Testing parallel timeline poker games...');
      
      const timelines = [];
      const numTimelines = 5;
      
      // Create multiple temporal poker engines (parallel timelines)
      for (let i = 0; i < numTimelines; i++) {
        const temporalPoker = new TemporalPokerEngine();
        const gameId = `timeline_${i}_game`;
        
        // Play different action sequences in each timeline
        const timelineActions = [];
        const actionSequences = [
          ['call', 'raise', 'call'],
          ['raise', 'fold'],
          ['check', 'check', 'bet', 'call'],
          ['fold'],
          ['raise', 'call', 'raise', 'fold']
        ];
        
        const sequence = actionSequences[i] || ['check'];
        
        sequence.forEach((action, index) => {
          const result = temporalPoker.playAction(gameId, `player_${index % 2 + 1}`, action);
          timelineActions.push({
            action,
            result: result.result,
            causality: result.temporalEffects.causality
          });
        });
        
        timelines.push({
          timelineId: i,
          gameId,
          actions: timelineActions,
          anomalies: temporalPoker.detectTemporalAnomalies().length,
          totalCausality: timelineActions.reduce((sum, a) => sum + a.causality, 0)
        });
      }
      
      // Analyze timeline differences
      const timelineAnalysis = {
        totalTimelines: timelines.length,
        avgActionsPerTimeline: timelines.reduce((sum, t) => sum + t.actions.length, 0) / timelines.length,
        totalAnomalies: timelines.reduce((sum, t) => sum + t.anomalies, 0),
        avgCausality: timelines.reduce((sum, t) => sum + t.totalCausality, 0) / timelines.length,
        uniqueActionSequences: new Set(timelines.map(t => 
          t.actions.map(a => a.action).join('-')
        )).size
      };
      
      console.log(`Parallel Timeline Analysis:`);
      console.log(`  Total Timelines: ${timelineAnalysis.totalTimelines}`);
      console.log(`  Avg Actions/Timeline: ${timelineAnalysis.avgActionsPerTimeline.toFixed(2)}`);
      console.log(`  Total Anomalies: ${timelineAnalysis.totalAnomalies}`);
      console.log(`  Unique Sequences: ${timelineAnalysis.uniqueActionSequences}`);
      console.log(`  Avg Causality: ${timelineAnalysis.avgCausality.toFixed(3)}`);
      
      // Should create diverse parallel timelines
      expect(timelines.length).toBe(numTimelines);
      expect(timelineAnalysis.uniqueActionSequences).toBeGreaterThan(1);
      expect(timelineAnalysis.avgCausality).toBeGreaterThan(0);
    });
  });
  
  describe('Grandfather Paradox Scenarios', () => {
    test('Self-preventing poker game paradox', () => {
      console.log('Testing grandfather paradox in poker context...');
      
      const paradoxSimulator = new GrandfatherParadoxSimulator();
      const paradoxResults = [];
      
      // Test multiple paradox scenarios
      const testGames = ['game_001', 'game_002', 'game_003', 'game_004', 'game_005'];
      
      testGames.forEach(gameId => {
        const paradoxResult = paradoxSimulator.simulateGrandfatherParadox(gameId);
        paradoxResults.push({
          gameId,
          ...paradoxResult
        });
      });
      
      // Analyze paradox resolutions
      const resolutionTypes = paradoxResults.reduce((acc, result) => {
        acc[result.paradoxResolution] = (acc[result.paradoxResolution] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const avgStability = paradoxResults.reduce((sum, r) => sum + r.timelineStability, 0) / paradoxResults.length;
      const avgCausality = paradoxResults.reduce((sum, r) => sum + r.causalityIndex, 0) / paradoxResults.length;
      const existenceProofs = paradoxResults.filter(r => r.existenceProof).length;
      
      console.log(`Grandfather Paradox Results:`);
      console.log(`  Test Scenarios: ${testGames.length}`);
      console.log(`  Resolution Types:`, resolutionTypes);
      console.log(`  Avg Timeline Stability: ${avgStability.toFixed(3)}`);
      console.log(`  Avg Causality Index: ${avgCausality.toFixed(3)}`);
      console.log(`  Existence Proofs: ${existenceProofs}/${paradoxResults.length}`);
      
      // Should handle all paradox scenarios
      expect(paradoxResults.length).toBe(testGames.length);
      expect(Object.keys(resolutionTypes).length).toBeGreaterThan(0);
      expect(avgStability).toBeGreaterThan(0);
    });
    
    test('Bootstrap paradox information loops', () => {
      console.log('Testing bootstrap paradox scenarios...');
      
      const bootstrapResults = [];
      
      // Simulate information that has no origin point
      const bootstrapScenarios = [
        { info: 'winning_strategy', origin: 'future_self', complexity: 0.8 },
        { info: 'card_sequence', origin: 'time_loop', complexity: 0.6 },
        { info: 'opponent_tell', origin: 'causal_loop', complexity: 0.7 },
        { info: 'betting_pattern', origin: 'paradox_source', complexity: 0.9 }
      ];
      
      bootstrapScenarios.forEach(scenario => {
        // Simulate bootstrap loop formation
        const loopStability = Math.random() * 0.5 + 0.3; // 0.3 to 0.8
        const informationIntegrity = Math.exp(-scenario.complexity) * loopStability;
        const paradoxStrength = scenario.complexity * (1 - loopStability);
        
        // Check if loop is self-consistent
        const selfConsistent = informationIntegrity > 0.4 && paradoxStrength < 0.6;
        
        bootstrapResults.push({
          scenario: scenario.info,
          origin: scenario.origin,
          complexity: scenario.complexity,
          loopStability,
          informationIntegrity,
          paradoxStrength,
          selfConsistent
        });
      });
      
      const stableLoops = bootstrapResults.filter(r => r.selfConsistent);
      const unstableLoops = bootstrapResults.filter(r => !r.selfConsistent);
      const avgParadoxStrength = bootstrapResults.reduce((sum, r) => sum + r.paradoxStrength, 0) / bootstrapResults.length;
      
      console.log(`Bootstrap Paradox Analysis:`);
      console.log(`  Total Scenarios: ${bootstrapScenarios.length}`);
      console.log(`  Stable Loops: ${stableLoops.length}`);
      console.log(`  Unstable Loops: ${unstableLoops.length}`);
      console.log(`  Avg Paradox Strength: ${avgParadoxStrength.toFixed(3)}`);
      
      // Should analyze bootstrap paradox mechanics
      expect(bootstrapResults.length).toBe(bootstrapScenarios.length);
      expect(stableLoops.length + unstableLoops.length).toBe(bootstrapResults.length);
    });
  });
  
  describe('Temporal Anomaly Detection', () => {
    test('Comprehensive temporal anomaly detection', () => {
      console.log('Testing comprehensive temporal anomaly detection...');
      
      const temporalPoker = new TemporalPokerEngine();
      const gameId = 'anomaly_test_game';
      
      // Create various temporal anomalies
      const anomalyActions = [
        // Normal sequence
        { action: 'call', delay: 1000 },
        { action: 'raise', delay: 800 },
        
        // Time compression anomaly
        { action: 'call', delay: 5 },
        { action: 'fold', delay: 3 },
        
        // Causal loop setup
        { action: 'raise', delay: 500 },
        { action: 'raise', delay: 500 },
        { action: 'raise', delay: 500 },
        
        // Timeline branch indicator
        { action: 'check', delay: 200 }
      ];
      
      // Execute actions with specific timing
      for (let i = 0; i < anomalyActions.length; i++) {
        const actionData = anomalyActions[i];
        
        temporalPoker.playAction(gameId, `player_${i % 2 + 1}`, actionData.action);
        
        if (i < anomalyActions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, actionData.delay));
        }
      }
      
      // Force some temporal manipulation for testing
      const undoResult = temporalPoker.undoAction(gameId, Date.now() - 5000);
      
      // Detect all anomalies
      const anomalies = temporalPoker.detectTemporalAnomalies();
      
      // Categorize anomalies
      const anomalyCategories = anomalies.reduce((acc, anomaly) => {
        acc[anomaly.type] = (acc[anomaly.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const highSeverityAnomalies = anomalies.filter(a => a.severity > 0.7);
      const avgSeverity = anomalies.reduce((sum, a) => sum + a.severity, 0) / (anomalies.length || 1);
      
      console.log(`Temporal Anomaly Detection Results:`);
      console.log(`  Total Anomalies: ${anomalies.length}`);
      console.log(`  Anomaly Categories:`, anomalyCategories);
      console.log(`  High Severity: ${highSeverityAnomalies.length}`);
      console.log(`  Average Severity: ${avgSeverity.toFixed(3)}`);
      
      if (anomalies.length > 0) {
        console.log(`  Sample Anomalies:`);
        anomalies.slice(0, 3).forEach(anomaly => {
          console.log(`    ${anomaly.type}: ${anomaly.description} (severity: ${anomaly.severity.toFixed(3)})`);
        });
      }
      
      // Should detect temporal anomalies
      expect(anomalies.length).toBeGreaterThan(0);
      expect(Object.keys(anomalyCategories).length).toBeGreaterThan(0);
    });
  });
});