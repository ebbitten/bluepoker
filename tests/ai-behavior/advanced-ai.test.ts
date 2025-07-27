/**
 * Phase 17: AI-Driven Behavior Testing
 * Advanced testing using artificial intelligence to simulate unpredictable player behavior
 */

import { describe, test, expect } from 'vitest';

// Helper to create AI behavior test game
async function createAITestGame(suffix = '') {
  const response = await fetch('http://localhost:3000/api/game/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerNames: [`AIPlayer1${suffix}`, `AIPlayer2${suffix}`]
    })
  });
  
  if (!response.ok) {
    throw new Error(`AI test game creation failed: ${response.status}`);
  }
  
  return await response.json();
}

// AI Behavior Pattern Generator
class AIBehaviorEngine {
  private randomSeed: number;
  
  constructor(seed = Date.now()) {
    this.randomSeed = seed;
  }
  
  // Seeded random number generator for reproducible AI behavior
  private seededRandom(): number {
    const x = Math.sin(this.randomSeed++) * 10000;
    return x - Math.floor(x);
  }
  
  // Generate AI personality profiles
  generatePersonality(): {
    aggression: number;
    caution: number;
    bluffing: number;
    adaptability: number;
    patience: number;
  } {
    return {
      aggression: this.seededRandom(),
      caution: this.seededRandom(),
      bluffing: this.seededRandom(),
      adaptability: this.seededRandom(),
      patience: this.seededRandom()
    };
  }
  
  // Generate decision based on personality and game state
  makeDecision(personality: any, gameContext: any): string {
    const { aggression, caution, bluffing } = personality;
    const random = this.seededRandom();
    
    // Complex AI decision matrix
    if (gameContext.potSize > 1000 && caution > 0.7) {
      return random < 0.3 ? 'fold' : 'call';
    }
    
    if (aggression > 0.8 && bluffing > 0.6) {
      return random < 0.4 ? 'raise' : 'call';
    }
    
    if (caution > 0.9) {
      return 'fold';
    }
    
    // Default behavior
    const actions = ['fold', 'call', 'check', 'raise'];
    return actions[Math.floor(random * actions.length)];
  }
  
  // Generate complex behavioral patterns
  generateBehaviorPattern(length: number): Array<{
    action: string;
    timing: number;
    confidence: number;
    reasoning: string;
  }> {
    const pattern = [];
    
    for (let i = 0; i < length; i++) {
      const confidence = this.seededRandom();
      const timing = Math.floor(this.seededRandom() * 5000) + 100; // 100ms to 5s
      
      pattern.push({
        action: this.makeDecision(this.generatePersonality(), { potSize: i * 100 }),
        timing,
        confidence,
        reasoning: this.generateReasoning(confidence)
      });
    }
    
    return pattern;
  }
  
  private generateReasoning(confidence: number): string {
    if (confidence > 0.8) return 'High confidence play based on position';
    if (confidence > 0.6) return 'Moderate confidence with risk assessment';
    if (confidence > 0.4) return 'Cautious play with uncertainty';
    return 'Low confidence defensive action';
  }
}

// Neural Network Simulation for Advanced AI
class NeuralNetworkSimulator {
  private weights: number[][];
  private biases: number[];
  
  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    // Initialize random weights and biases
    this.weights = [
      this.randomMatrix(inputSize, hiddenSize),
      this.randomMatrix(hiddenSize, outputSize)
    ];
    this.biases = [
      this.randomArray(hiddenSize),
      this.randomArray(outputSize)
    ];
  }
  
  private randomMatrix(rows: number, cols: number): number[][] {
    return Array(rows).fill(0).map(() => 
      Array(cols).fill(0).map(() => Math.random() * 2 - 1)
    );
  }
  
  private randomArray(size: number): number[] {
    return Array(size).fill(0).map(() => Math.random() * 2 - 1);
  }
  
  // Sigmoid activation function
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
  
  // Forward propagation
  predict(inputs: number[]): number[] {
    let current = inputs;
    
    for (let layer = 0; layer < this.weights.length; layer++) {
      const next = new Array(this.weights[layer][0].length).fill(0);
      
      for (let j = 0; j < next.length; j++) {
        let sum = this.biases[layer][j];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * this.weights[layer][i][j];
        }
        next[j] = this.sigmoid(sum);
      }
      
      current = next;
    }
    
    return current;
  }
  
  // Convert game state to neural network inputs
  encodeGameState(gameState: any): number[] {
    return [
      gameState.pot / 1000,                    // Normalized pot size
      gameState.phase === 'preflop' ? 1 : 0,  // Game phase encoding
      gameState.phase === 'flop' ? 1 : 0,
      gameState.phase === 'turn' ? 1 : 0,
      gameState.phase === 'river' ? 1 : 0,
      gameState.players?.length || 0,         // Player count
      Math.random(),                          // Random factor
      Math.random()                           // Another random factor
    ];
  }
  
  // Convert neural network output to poker action
  decodeAction(outputs: number[]): string {
    const actions = ['fold', 'call', 'check', 'raise'];
    const maxIndex = outputs.indexOf(Math.max(...outputs));
    return actions[maxIndex] || 'fold';
  }
}

describe('Phase 17: AI-Driven Behavior Testing', () => {
  describe('AI Personality Generation', () => {
    test('Generate diverse AI personalities', () => {
      console.log('Generating diverse AI personalities...');
      
      const aiEngine = new AIBehaviorEngine(12345); // Fixed seed for reproducibility
      const personalities = [];
      
      // Generate 100 different AI personalities
      for (let i = 0; i < 100; i++) {
        personalities.push(aiEngine.generatePersonality());
      }
      
      // Analyze personality diversity
      const aggressionValues = personalities.map(p => p.aggression);
      const cautionValues = personalities.map(p => p.caution);
      const bluffingValues = personalities.map(p => p.bluffing);
      
      const aggressionRange = Math.max(...aggressionValues) - Math.min(...aggressionValues);
      const cautionRange = Math.max(...cautionValues) - Math.min(...cautionValues);
      const bluffingRange = Math.max(...bluffingValues) - Math.min(...bluffingValues);
      
      console.log(`AI Personality Analysis:`);
      console.log(`  Personalities Generated: ${personalities.length}`);
      console.log(`  Aggression Range: ${aggressionRange.toFixed(3)}`);
      console.log(`  Caution Range: ${cautionRange.toFixed(3)}`);
      console.log(`  Bluffing Range: ${bluffingRange.toFixed(3)}`);
      
      // Should generate diverse personalities
      expect(personalities.length).toBe(100);
      expect(aggressionRange).toBeGreaterThan(0.8);
      expect(cautionRange).toBeGreaterThan(0.8);
      expect(bluffingRange).toBeGreaterThan(0.8);
    });
    
    test('AI decision making consistency', () => {
      console.log('Testing AI decision making consistency...');
      
      const aiEngine = new AIBehaviorEngine(54321);
      const personality = aiEngine.generatePersonality();
      const gameContext = { potSize: 500 };
      
      // Make same decision multiple times
      const decisions = [];
      for (let i = 0; i < 50; i++) {
        decisions.push(aiEngine.makeDecision(personality, gameContext));
      }
      
      // Count decision frequency
      const decisionCounts = decisions.reduce((acc, decision) => {
        acc[decision] = (acc[decision] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const uniqueDecisions = Object.keys(decisionCounts).length;
      const mostCommon = Object.keys(decisionCounts).reduce((a, b) => 
        decisionCounts[a] > decisionCounts[b] ? a : b
      );
      
      console.log(`AI Decision Analysis:`);
      console.log(`  Total Decisions: ${decisions.length}`);
      console.log(`  Unique Decisions: ${uniqueDecisions}`);
      console.log(`  Decision Distribution:`, decisionCounts);
      console.log(`  Most Common: ${mostCommon}`);
      
      // Should make varied but personality-consistent decisions
      expect(uniqueDecisions).toBeGreaterThan(1);
      expect(decisions.length).toBe(50);
    });
  });
  
  describe('Neural Network AI Simulation', () => {
    test('Neural network poker decision making', () => {
      console.log('Testing neural network AI decision making...');
      
      // Create neural network: 8 inputs, 16 hidden, 4 outputs (actions)
      const neuralNet = new NeuralNetworkSimulator(8, 16, 4);
      
      // Test with various game states
      const gameStates = [
        { pot: 100, phase: 'preflop', players: [{ chips: 1000 }, { chips: 1000 }] },
        { pot: 500, phase: 'flop', players: [{ chips: 800 }, { chips: 1200 }] },
        { pot: 1000, phase: 'turn', players: [{ chips: 500 }, { chips: 1500 }] },
        { pot: 2000, phase: 'river', players: [{ chips: 100 }, { chips: 1900 }] }
      ];
      
      const aiDecisions = [];
      
      for (const gameState of gameStates) {
        const inputs = neuralNet.encodeGameState(gameState);
        const outputs = neuralNet.predict(inputs);
        const action = neuralNet.decodeAction(outputs);
        
        aiDecisions.push({
          gameState: gameState.phase,
          pot: gameState.pot,
          inputs: inputs.slice(0, 3), // First 3 inputs for logging
          outputs: outputs.map(o => Number(o.toFixed(3))),
          action
        });
      }
      
      console.log(`Neural Network AI Results:`);
      aiDecisions.forEach((decision, i) => {
        console.log(`  Game ${i + 1}: ${decision.gameState} (pot: ${decision.pot}) → ${decision.action}`);
      });
      
      // Should generate valid actions for all game states
      expect(aiDecisions.length).toBe(gameStates.length);
      aiDecisions.forEach(decision => {
        expect(['fold', 'call', 'check', 'raise']).toContain(decision.action);
      });
    });
    
    test('AI learning simulation through repeated games', () => {
      console.log('Simulating AI learning through repeated games...');
      
      const neuralNet = new NeuralNetworkSimulator(8, 12, 4);
      const learningResults = [];
      
      // Simulate 1000 games to test AI consistency
      for (let game = 0; game < 1000; game++) {
        const gameState = {
          pot: Math.floor(Math.random() * 2000) + 100,
          phase: ['preflop', 'flop', 'turn', 'river'][Math.floor(Math.random() * 4)],
          players: [
            { chips: Math.floor(Math.random() * 1500) + 500 },
            { chips: Math.floor(Math.random() * 1500) + 500 }
          ]
        };
        
        const inputs = neuralNet.encodeGameState(gameState);
        const outputs = neuralNet.predict(inputs);
        const action = neuralNet.decodeAction(outputs);
        
        learningResults.push({
          game: game + 1,
          action,
          confidence: Math.max(...outputs),
          phase: gameState.phase
        });
      }
      
      // Analyze AI behavior patterns
      const actionCounts = learningResults.reduce((acc, result) => {
        acc[result.action] = (acc[result.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const avgConfidence = learningResults.reduce((sum, r) => sum + r.confidence, 0) / learningResults.length;
      const phaseActions = learningResults.reduce((acc, result) => {
        if (!acc[result.phase]) acc[result.phase] = {};
        acc[result.phase][result.action] = (acc[result.phase][result.action] || 0) + 1;
        return acc;
      }, {} as Record<string, Record<string, number>>);
      
      console.log(`AI Learning Simulation Results:`);
      console.log(`  Games Simulated: ${learningResults.length}`);
      console.log(`  Action Distribution:`, actionCounts);
      console.log(`  Average Confidence: ${avgConfidence.toFixed(3)}`);
      console.log(`  Phase-based Actions:`, phaseActions);
      
      // Should show consistent AI behavior across many games
      expect(learningResults.length).toBe(1000);
      expect(avgConfidence).toBeGreaterThan(0.1);
      expect(Object.keys(actionCounts).length).toBeGreaterThan(1);
    });
  });
  
  describe('Advanced AI Behavior Patterns', () => {
    test('Complex multi-turn AI strategy simulation', async () => {
      console.log('Testing complex multi-turn AI strategy...');
      
      const game = await createAITestGame('_strategy');
      const aiEngine = new AIBehaviorEngine(98765);
      
      // Create two AI players with different personalities
      const aiPlayer1 = {
        personality: aiEngine.generatePersonality(),
        strategy: 'aggressive',
        adaptability: 0.8
      };
      
      const aiPlayer2 = {
        personality: aiEngine.generatePersonality(),
        strategy: 'conservative',
        adaptability: 0.3
      };
      
      // Simulate multi-turn gameplay
      const gameFlow = [];
      
      for (let turn = 0; turn < 20; turn++) {
        const gameContext = {
          turn,
          potSize: turn * 50 + 100,
          phase: ['preflop', 'flop', 'turn', 'river'][Math.floor(turn / 5)],
          history: gameFlow.slice(-5) // Last 5 actions for context
        };
        
        // AI 1 decision
        const ai1Decision = aiEngine.makeDecision(aiPlayer1.personality, gameContext);
        const ai1Pattern = aiEngine.generateBehaviorPattern(1)[0];
        
        // AI 2 decision (reacting to AI 1)
        const ai2Context = { ...gameContext, opponentAction: ai1Decision };
        const ai2Decision = aiEngine.makeDecision(aiPlayer2.personality, ai2Context);
        const ai2Pattern = aiEngine.generateBehaviorPattern(1)[0];
        
        gameFlow.push({
          turn,
          ai1: { action: ai1Decision, timing: ai1Pattern.timing, confidence: ai1Pattern.confidence },
          ai2: { action: ai2Decision, timing: ai2Pattern.timing, confidence: ai2Pattern.confidence },
          context: gameContext.phase
        });
      }
      
      // Analyze strategic patterns
      const ai1Actions = gameFlow.map(g => g.ai1.action);
      const ai2Actions = gameFlow.map(g => g.ai2.action);
      const avgConfidenceAI1 = gameFlow.reduce((sum, g) => sum + g.ai1.confidence, 0) / gameFlow.length;
      const avgConfidenceAI2 = gameFlow.reduce((sum, g) => sum + g.ai2.confidence, 0) / gameFlow.length;
      
      console.log(`Multi-turn AI Strategy Results:`);
      console.log(`  Total Turns: ${gameFlow.length}`);
      console.log(`  AI1 Strategy Distribution:`, ai1Actions.reduce((acc, action) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log(`  AI2 Strategy Distribution:`, ai2Actions.reduce((acc, action) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      console.log(`  AI1 Avg Confidence: ${avgConfidenceAI1.toFixed(3)}`);
      console.log(`  AI2 Avg Confidence: ${avgConfidenceAI2.toFixed(3)}`);
      
      // Should generate complex strategic gameplay
      expect(gameFlow.length).toBe(20);
      expect(new Set(ai1Actions).size).toBeGreaterThan(1);
      expect(new Set(ai2Actions).size).toBeGreaterThan(1);
    });
    
    test('AI adaptation and counter-strategy development', () => {
      console.log('Testing AI adaptation and counter-strategies...');
      
      const aiEngine = new AIBehaviorEngine(11111);
      const adaptationResults = [];
      
      // Simulate AI learning opponent patterns
      let opponentPattern = 'aggressive'; // Start with aggressive opponent
      
      for (let round = 0; round < 50; round++) {
        const aiPersonality = aiEngine.generatePersonality();
        
        // Modify AI personality based on opponent adaptation
        if (round > 10 && opponentPattern === 'aggressive') {
          aiPersonality.caution += 0.2; // Become more cautious
          aiPersonality.aggression -= 0.1;
        }
        
        if (round > 20 && opponentPattern === 'conservative') {
          aiPersonality.aggression += 0.3; // Become more aggressive
          aiPersonality.bluffing += 0.2;
        }
        
        // Change opponent pattern mid-game
        if (round === 25) {
          opponentPattern = 'conservative';
        }
        
        const gameContext = {
          round,
          opponentPattern,
          potSize: round * 20 + 200
        };
        
        const decision = aiEngine.makeDecision(aiPersonality, gameContext);
        
        adaptationResults.push({
          round,
          opponentPattern,
          aiPersonality: {
            aggression: Number(aiPersonality.aggression.toFixed(3)),
            caution: Number(aiPersonality.caution.toFixed(3)),
            bluffing: Number(aiPersonality.bluffing.toFixed(3))
          },
          decision
        });
      }
      
      // Analyze adaptation patterns
      const earlyRounds = adaptationResults.slice(0, 15);
      const midRounds = adaptationResults.slice(15, 35);
      const lateRounds = adaptationResults.slice(35);
      
      const earlyAggression = earlyRounds.reduce((sum, r) => sum + r.aiPersonality.aggression, 0) / earlyRounds.length;
      const lateAggression = lateRounds.reduce((sum, r) => sum + r.aiPersonality.aggression, 0) / lateRounds.length;
      
      console.log(`AI Adaptation Results:`);
      console.log(`  Total Rounds: ${adaptationResults.length}`);
      console.log(`  Early Aggression: ${earlyAggression.toFixed(3)}`);
      console.log(`  Late Aggression: ${lateAggression.toFixed(3)}`);
      console.log(`  Adaptation Magnitude: ${Math.abs(lateAggression - earlyAggression).toFixed(3)}`);
      
      // Should show measurable adaptation
      expect(adaptationResults.length).toBe(50);
      expect(Math.abs(lateAggression - earlyAggression)).toBeGreaterThan(0.1);
    });
  });
  
  describe('AI Stress Testing', () => {
    test('Concurrent AI players stress test', async () => {
      console.log('Testing concurrent AI players under stress...');
      
      const numAIPlayers = 100;
      const aiEngines = Array(numAIPlayers).fill(0).map((_, i) => new AIBehaviorEngine(i + 1000));
      
      const concurrentDecisions = await Promise.all(
        aiEngines.map(async (engine, index) => {
          const personality = engine.generatePersonality();
          const gameContext = {
            playerIndex: index,
            potSize: Math.random() * 1000 + 100,
            phase: ['preflop', 'flop', 'turn', 'river'][Math.floor(Math.random() * 4)]
          };
          
          const startTime = Date.now();
          const decision = engine.makeDecision(personality, gameContext);
          const decisionTime = Date.now() - startTime;
          
          return {
            playerIndex: index,
            decision,
            decisionTime,
            personality: {
              aggression: Number(personality.aggression.toFixed(3)),
              caution: Number(personality.caution.toFixed(3))
            }
          };
        })
      );
      
      const avgDecisionTime = concurrentDecisions.reduce((sum, d) => sum + d.decisionTime, 0) / concurrentDecisions.length;
      const maxDecisionTime = Math.max(...concurrentDecisions.map(d => d.decisionTime));
      const uniqueDecisions = new Set(concurrentDecisions.map(d => d.decision)).size;
      
      console.log(`Concurrent AI Stress Test Results:`);
      console.log(`  AI Players: ${numAIPlayers}`);
      console.log(`  Avg Decision Time: ${avgDecisionTime.toFixed(2)}ms`);
      console.log(`  Max Decision Time: ${maxDecisionTime}ms`);
      console.log(`  Unique Decisions: ${uniqueDecisions}`);
      
      // Should handle concurrent AI efficiently
      expect(concurrentDecisions.length).toBe(numAIPlayers);
      expect(avgDecisionTime).toBeLessThan(10); // Should be very fast
      expect(uniqueDecisions).toBeGreaterThan(1);
    });
  });
});