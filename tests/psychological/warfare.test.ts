/**
 * Phase 20: Psychological Warfare Testing
 * Advanced testing for psychological manipulation, mind games, and mental resilience
 */

import { describe, test, expect } from 'vitest';

// Psychological Profile Engine
class PsychologicalProfileEngine {
  private personalityTraits: Map<string, {
    aggression: number;
    vulnerability: number;
    resilience: number;
    manipulability: number;
    emotionalStability: number;
    cognitiveLoad: number;
  }>;
  
  constructor() {
    this.personalityTraits = new Map();
  }
  
  // Generate psychological profile
  generateProfile(playerId: string): {
    personality: any;
    weaknesses: string[];
    strengths: string[];
    manipulationVectors: string[];
  } {
    const personality = {
      aggression: Math.random(),
      vulnerability: Math.random(),
      resilience: Math.random(),
      manipulability: Math.random(),
      emotionalStability: Math.random(),
      cognitiveLoad: Math.random() * 0.5 + 0.2 // 0.2 to 0.7
    };
    
    this.personalityTraits.set(playerId, personality);
    
    // Identify psychological weaknesses
    const weaknesses = [];
    if (personality.vulnerability > 0.7) weaknesses.push('emotional_manipulation');
    if (personality.resilience < 0.3) weaknesses.push('pressure_susceptible');
    if (personality.manipulability > 0.6) weaknesses.push('easily_influenced');
    if (personality.emotionalStability < 0.4) weaknesses.push('tilt_prone');
    if (personality.cognitiveLoad > 0.6) weaknesses.push('information_overload');
    
    // Identify psychological strengths
    const strengths = [];
    if (personality.resilience > 0.7) strengths.push('pressure_resistant');
    if (personality.emotionalStability > 0.8) strengths.push('emotionally_stable');
    if (personality.manipulability < 0.3) strengths.push('manipulation_resistant');
    if (personality.aggression > 0.8) strengths.push('intimidating_presence');
    if (personality.cognitiveLoad < 0.3) strengths.push('clear_thinking');
    
    // Determine manipulation vectors
    const manipulationVectors = [];
    if (personality.vulnerability > 0.5) manipulationVectors.push('emotional_exploitation');
    if (personality.aggression > 0.6) manipulationVectors.push('provocation_tactics');
    if (personality.cognitiveLoad > 0.5) manipulationVectors.push('information_warfare');
    if (personality.emotionalStability < 0.5) manipulationVectors.push('psychological_pressure');
    
    return {
      personality,
      weaknesses,
      strengths,
      manipulationVectors
    };
  }
  
  // Apply psychological pressure
  applyPressure(playerId: string, pressureType: string, intensity: number): {
    effectiveness: number;
    psychologicalDamage: number;
    resistance: number;
    mentalState: string;
  } {
    const profile = this.personalityTraits.get(playerId);
    if (!profile) {
      throw new Error('Player profile not found');
    }
    
    let effectiveness = 0;
    let resistance = profile.resilience;
    
    switch (pressureType) {
      case 'time_pressure':
        effectiveness = intensity * (1 - profile.emotionalStability) * 0.8;
        resistance *= profile.resilience;
        break;
      case 'emotional_manipulation':
        effectiveness = intensity * profile.vulnerability * 0.9;
        resistance *= (1 - profile.manipulability);
        break;
      case 'intimidation':
        effectiveness = intensity * (1 - profile.resilience) * 0.7;
        resistance *= profile.emotionalStability;
        break;
      case 'information_overload':
        effectiveness = intensity * profile.cognitiveLoad * 0.6;
        resistance *= (1 - profile.cognitiveLoad);
        break;
      case 'gaslighting':
        effectiveness = intensity * profile.manipulability * 0.85;
        resistance *= profile.emotionalStability * 0.8;
        break;
    }
    
    const psychologicalDamage = Math.max(0, effectiveness - resistance);
    
    // Update psychological state
    profile.emotionalStability = Math.max(0, profile.emotionalStability - psychologicalDamage * 0.1);
    profile.cognitiveLoad = Math.min(1, profile.cognitiveLoad + psychologicalDamage * 0.05);
    
    // Determine mental state
    let mentalState = 'stable';
    if (profile.emotionalStability < 0.3) mentalState = 'tilted';
    else if (profile.emotionalStability < 0.5) mentalState = 'stressed';
    else if (profile.cognitiveLoad > 0.8) mentalState = 'overwhelmed';
    else if (profile.emotionalStability > 0.8 && profile.cognitiveLoad < 0.3) mentalState = 'focused';
    
    return {
      effectiveness,
      psychologicalDamage,
      resistance,
      mentalState
    };
  }
}

// Mind Games Engine
class MindGamesEngine {
  private psychologyEngine: PsychologicalProfileEngine;
  private mindGameHistory: Array<{
    attacker: string;
    target: string;
    technique: string;
    success: boolean;
    damage: number;
    timestamp: number;
  }>;
  
  constructor() {
    this.psychologyEngine = new PsychologicalProfileEngine();
    this.mindGameHistory = [];
  }
  
  // Execute psychological attack
  executeMindGame(attacker: string, target: string, technique: string): {
    success: boolean;
    damage: number;
    counterAttack: boolean;
    targetState: string;
    retaliation?: any;
  } {
    // Ensure profiles exist
    if (!this.psychologyEngine['personalityTraits'].has(attacker)) {
      this.psychologyEngine.generateProfile(attacker);
    }
    if (!this.psychologyEngine['personalityTraits'].has(target)) {
      this.psychologyEngine.generateProfile(target);
    }
    
    const attackerProfile = this.psychologyEngine['personalityTraits'].get(attacker)!;
    const intensity = attackerProfile.aggression * 0.7 + Math.random() * 0.3;
    
    const result = this.psychologyEngine.applyPressure(target, technique, intensity);
    const success = result.psychologicalDamage > 0.2;
    
    // Check for counter-attack
    const targetProfile = this.psychologyEngine['personalityTraits'].get(target)!;
    const counterAttackChance = targetProfile.resilience * targetProfile.aggression;
    const counterAttack = Math.random() < counterAttackChance * 0.3;
    
    let retaliation = undefined;
    if (counterAttack) {
      // Target retaliates with psychological counter-attack
      const counterTechniques = ['reverse_psychology', 'emotional_jujitsu', 'intimidation', 'confidence_display'];
      const counterTechnique = counterTechniques[Math.floor(Math.random() * counterTechniques.length)];
      
      const counterIntensity = targetProfile.aggression * 0.8;
      const counterResult = this.psychologyEngine.applyPressure(attacker, counterTechnique, counterIntensity);
      
      retaliation = {
        technique: counterTechnique,
        damage: counterResult.psychologicalDamage,
        effectiveness: counterResult.effectiveness
      };
    }
    
    // Record mind game
    this.mindGameHistory.push({
      attacker,
      target,
      technique,
      success,
      damage: result.psychologicalDamage,
      timestamp: Date.now()
    });
    
    return {
      success,
      damage: result.psychologicalDamage,
      counterAttack,
      targetState: result.mentalState,
      retaliation
    };
  }
  
  // Analyze psychological warfare patterns
  analyzePsychologicalWarfare(): {
    totalAttacks: number;
    successRate: number;
    mostEffectiveTechnique: string;
    psychologicalDominance: Record<string, number>;
    warfareIntensity: number;
  } {
    const totalAttacks = this.mindGameHistory.length;
    const successfulAttacks = this.mindGameHistory.filter(h => h.success).length;
    const successRate = totalAttacks > 0 ? successfulAttacks / totalAttacks : 0;
    
    // Find most effective technique
    const techniqueEffectiveness = this.mindGameHistory.reduce((acc, attack) => {
      acc[attack.technique] = (acc[attack.technique] || 0) + attack.damage;
      return acc;
    }, {} as Record<string, number>);
    
    const mostEffectiveTechnique = Object.keys(techniqueEffectiveness).reduce((a, b) => 
      techniqueEffectiveness[a] > techniqueEffectiveness[b] ? a : b, 'none'
    );
    
    // Calculate psychological dominance
    const psychologicalDominance = this.mindGameHistory.reduce((acc, attack) => {
      acc[attack.attacker] = (acc[attack.attacker] || 0) + attack.damage;
      acc[attack.target] = (acc[attack.target] || 0) - attack.damage * 0.5;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate warfare intensity
    const recentAttacks = this.mindGameHistory.filter(h => 
      Date.now() - h.timestamp < 300000 // Last 5 minutes
    );
    const warfareIntensity = recentAttacks.length * 0.1 + 
                           recentAttacks.reduce((sum, h) => sum + h.damage, 0);
    
    return {
      totalAttacks,
      successRate,
      mostEffectiveTechnique,
      psychologicalDominance,
      warfareIntensity
    };
  }
  
  // Generate psychological profile for player
  getPlayerProfile(playerId: string) {
    return this.psychologyEngine.generateProfile(playerId);
  }
}

// Gaslighting Detection System
class GaslightingDetector {
  private gaslightingPatterns: Array<{
    pattern: string;
    indicators: string[];
    severity: number;
  }>;
  
  constructor() {
    this.gaslightingPatterns = [
      {
        pattern: 'reality_distortion',
        indicators: ['contradicting_facts', 'false_memories', 'denying_events'],
        severity: 0.9
      },
      {
        pattern: 'confidence_undermining',
        indicators: ['questioning_sanity', 'dismissing_concerns', 'minimizing_feelings'],
        severity: 0.7
      },
      {
        pattern: 'information_manipulation',
        indicators: ['withholding_info', 'selective_disclosure', 'false_information'],
        severity: 0.8
      },
      {
        pattern: 'emotional_manipulation',
        indicators: ['guilt_tripping', 'emotional_blackmail', 'false_sympathy'],
        severity: 0.6
      }
    ];
  }
  
  // Detect gaslighting in communication
  detectGaslighting(messages: string[]): {
    gaslightingDetected: boolean;
    patterns: string[];
    severity: number;
    confidence: number;
  } {
    const detectedPatterns = [];
    let totalSeverity = 0;
    
    // Simplified pattern detection (in real implementation, would use NLP)
    const gaslightingKeywords = {
      'reality_distortion': ['never said', 'that didnt happen', 'youre imagining', 'false memory'],
      'confidence_undermining': ['youre crazy', 'overreacting', 'too sensitive', 'paranoid'],
      'information_manipulation': ['you misunderstood', 'thats not what i meant', 'you forgot'],
      'emotional_manipulation': ['after all ive done', 'you made me', 'its your fault']
    };
    
    const messageText = messages.join(' ').toLowerCase();
    
    Object.keys(gaslightingKeywords).forEach(pattern => {
      const keywords = gaslightingKeywords[pattern as keyof typeof gaslightingKeywords];
      const hasPattern = keywords.some(keyword => messageText.includes(keyword));
      
      if (hasPattern) {
        detectedPatterns.push(pattern);
        const patternData = this.gaslightingPatterns.find(p => p.pattern === pattern);
        if (patternData) {
          totalSeverity += patternData.severity;
        }
      }
    });
    
    const avgSeverity = detectedPatterns.length > 0 ? totalSeverity / detectedPatterns.length : 0;
    const confidence = Math.min(detectedPatterns.length * 0.3, 1.0);
    
    return {
      gaslightingDetected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      severity: avgSeverity,
      confidence
    };
  }
}

// Emotional Resilience Testing
class EmotionalResilienceEngine {
  private stressTestScenarios: Array<{
    name: string;
    stressors: string[];
    intensity: number;
    duration: number;
  }>;
  
  constructor() {
    this.stressTestScenarios = [
      {
        name: 'high_stakes_pressure',
        stressors: ['time_limit', 'large_pot', 'aggressive_opponents'],
        intensity: 0.8,
        duration: 300000 // 5 minutes
      },
      {
        name: 'psychological_harassment',
        stressors: ['taunting', 'intimidation', 'personal_attacks'],
        intensity: 0.9,
        duration: 600000 // 10 minutes
      },
      {
        name: 'information_overload',
        stressors: ['complex_betting', 'multiple_variables', 'rapid_decisions'],
        intensity: 0.7,
        duration: 900000 // 15 minutes
      },
      {
        name: 'isolation_tactics',
        stressors: ['social_exclusion', 'alliance_breaking', 'trust_betrayal'],
        intensity: 0.6,
        duration: 1200000 // 20 minutes
      }
    ];
  }
  
  // Test emotional resilience under stress
  testResilience(playerId: string, scenario: string): {
    initialResilience: number;
    finalResilience: number;
    resilienceChange: number;
    breakingPoint: boolean;
    recoveryTime: number;
    mentalFortitude: number;
  } {
    const testScenario = this.stressTestScenarios.find(s => s.name === scenario);
    if (!testScenario) {
      throw new Error('Unknown stress scenario');
    }
    
    // Initial resilience (random baseline)
    const initialResilience = Math.random() * 0.4 + 0.5; // 0.5 to 0.9
    
    // Simulate stress application over time
    let currentResilience = initialResilience;
    const stressPoints = 10; // Test in 10 intervals
    const stressPerInterval = testScenario.intensity / stressPoints;
    
    for (let i = 0; i < stressPoints; i++) {
      // Apply stress with some randomness
      const stressImpact = stressPerInterval * (0.8 + Math.random() * 0.4); // ±20% variance
      currentResilience -= stressImpact * 0.1; // Reduce resilience
      
      // Some recovery between stress applications
      const naturalRecovery = Math.random() * 0.02;
      currentResilience = Math.min(1.0, currentResilience + naturalRecovery);
      
      // Check for breaking point
      if (currentResilience < 0.2) {
        break;
      }
    }
    
    const finalResilience = Math.max(0, currentResilience);
    const resilienceChange = finalResilience - initialResilience;
    const breakingPoint = finalResilience < 0.3;
    
    // Calculate recovery time (lower resilience = longer recovery)
    const recoveryTime = breakingPoint ? 
      (1 - finalResilience) * testScenario.duration * 0.5 :
      Math.abs(resilienceChange) * testScenario.duration * 0.2;
    
    // Mental fortitude score
    const mentalFortitude = (initialResilience + finalResilience) / 2 + 
                           (breakingPoint ? -0.3 : 0.1);
    
    return {
      initialResilience: Number(initialResilience.toFixed(3)),
      finalResilience: Number(finalResilience.toFixed(3)),
      resilienceChange: Number(resilienceChange.toFixed(3)),
      breakingPoint,
      recoveryTime: Math.round(recoveryTime),
      mentalFortitude: Number(Math.max(0, mentalFortitude).toFixed(3))
    };
  }
}

describe('Phase 20: Psychological Warfare Testing', () => {
  describe('Psychological Profiling', () => {
    test('Comprehensive psychological profile generation', () => {
      console.log('Testing psychological profile generation...');
      
      const psychEngine = new PsychologicalProfileEngine();
      const profiles = [];
      
      // Generate diverse psychological profiles
      const playerIds = ['alpha_player', 'beta_player', 'gamma_player', 'delta_player', 'omega_player'];
      
      playerIds.forEach(playerId => {
        const profile = psychEngine.generateProfile(playerId);
        profiles.push({
          playerId,
          ...profile
        });
      });
      
      // Analyze profile diversity
      const allWeaknesses = profiles.flatMap(p => p.weaknesses);
      const allStrengths = profiles.flatMap(p => p.strengths);
      const allVectors = profiles.flatMap(p => p.manipulationVectors);
      
      const uniqueWeaknesses = new Set(allWeaknesses).size;
      const uniqueStrengths = new Set(allStrengths).size;
      const uniqueVectors = new Set(allVectors).size;
      
      const avgPersonalityTraits = {
        aggression: profiles.reduce((sum, p) => sum + p.personality.aggression, 0) / profiles.length,
        vulnerability: profiles.reduce((sum, p) => sum + p.personality.vulnerability, 0) / profiles.length,
        resilience: profiles.reduce((sum, p) => sum + p.personality.resilience, 0) / profiles.length
      };
      
      console.log(`Psychological Profile Analysis:`);
      console.log(`  Profiles Generated: ${profiles.length}`);
      console.log(`  Unique Weaknesses: ${uniqueWeaknesses}`);
      console.log(`  Unique Strengths: ${uniqueStrengths}`);
      console.log(`  Unique Manipulation Vectors: ${uniqueVectors}`);
      console.log(`  Avg Aggression: ${avgPersonalityTraits.aggression.toFixed(3)}`);
      console.log(`  Avg Vulnerability: ${avgPersonalityTraits.vulnerability.toFixed(3)}`);
      console.log(`  Avg Resilience: ${avgPersonalityTraits.resilience.toFixed(3)}`);
      
      // Should generate diverse psychological profiles
      expect(profiles.length).toBe(playerIds.length);
      expect(uniqueWeaknesses).toBeGreaterThan(0);
      expect(uniqueStrengths).toBeGreaterThan(0);
      expect(avgPersonalityTraits.aggression).toBeGreaterThan(0);
    });
    
    test('Psychological pressure application and resistance', () => {
      console.log('Testing psychological pressure mechanics...');
      
      const psychEngine = new PsychologicalProfileEngine();
      const playerId = 'pressure_test_player';
      const profile = psychEngine.generateProfile(playerId);
      
      const pressureTests = [];
      const pressureTypes = ['time_pressure', 'emotional_manipulation', 'intimidation', 'information_overload', 'gaslighting'];
      
      pressureTypes.forEach(pressureType => {
        const intensities = [0.3, 0.6, 0.9]; // Low, medium, high intensity
        
        intensities.forEach(intensity => {
          const result = psychEngine.applyPressure(playerId, pressureType, intensity);
          
          pressureTests.push({
            pressureType,
            intensity,
            effectiveness: Number(result.effectiveness.toFixed(3)),
            psychologicalDamage: Number(result.psychologicalDamage.toFixed(3)),
            resistance: Number(result.resistance.toFixed(3)),
            mentalState: result.mentalState
          });
        });
      });
      
      // Analyze pressure test results
      const avgEffectiveness = pressureTests.reduce((sum, test) => sum + test.effectiveness, 0) / pressureTests.length;
      const avgDamage = pressureTests.reduce((sum, test) => sum + test.psychologicalDamage, 0) / pressureTests.length;
      const mentalStateChanges = pressureTests.reduce((acc, test) => {
        acc[test.mentalState] = (acc[test.mentalState] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`Psychological Pressure Results:`);
      console.log(`  Total Tests: ${pressureTests.length}`);
      console.log(`  Avg Effectiveness: ${avgEffectiveness.toFixed(3)}`);
      console.log(`  Avg Damage: ${avgDamage.toFixed(3)}`);
      console.log(`  Mental State Distribution:`, mentalStateChanges);
      
      // Should demonstrate pressure mechanics
      expect(pressureTests.length).toBe(pressureTypes.length * 3);
      expect(avgEffectiveness).toBeGreaterThan(0);
      expect(Object.keys(mentalStateChanges).length).toBeGreaterThan(1);
    });
  });
  
  describe('Mind Games and Psychological Attacks', () => {
    test('Mind game execution and counter-attacks', () => {
      console.log('Testing mind game execution...');
      
      const mindGames = new MindGamesEngine();
      const players = ['aggressor', 'defender', 'bystander'];
      
      // Generate profiles for all players
      players.forEach(player => {
        mindGames.getPlayerProfile(player);
      });
      
      const mindGameResults = [];
      const techniques = ['intimidation', 'emotional_manipulation', 'gaslighting', 'time_pressure', 'information_overload'];
      
      // Execute mind games between players
      for (let round = 0; round < 20; round++) {
        const attacker = players[round % players.length];
        const target = players[(round + 1) % players.length];
        const technique = techniques[Math.floor(Math.random() * techniques.length)];
        
        const result = mindGames.executeMindGame(attacker, target, technique);
        
        mindGameResults.push({
          round,
          attacker,
          target,
          technique,
          ...result
        });
      }
      
      // Analyze mind game warfare
      const warfareAnalysis = mindGames.analyzePsychologicalWarfare();
      
      const successfulAttacks = mindGameResults.filter(r => r.success);
      const counterAttacks = mindGameResults.filter(r => r.counterAttack);
      const avgDamage = mindGameResults.reduce((sum, r) => sum + r.damage, 0) / mindGameResults.length;
      
      console.log(`Mind Game Warfare Results:`);
      console.log(`  Total Attacks: ${mindGameResults.length}`);
      console.log(`  Successful Attacks: ${successfulAttacks.length}`);
      console.log(`  Counter-Attacks: ${counterAttacks.length}`);
      console.log(`  Average Damage: ${avgDamage.toFixed(3)}`);
      console.log(`  Success Rate: ${warfareAnalysis.successRate.toFixed(3)}`);
      console.log(`  Most Effective Technique: ${warfareAnalysis.mostEffectiveTechnique}`);
      console.log(`  Warfare Intensity: ${warfareAnalysis.warfareIntensity.toFixed(3)}`);
      
      // Should demonstrate complex psychological warfare
      expect(mindGameResults.length).toBe(20);
      expect(successfulAttacks.length).toBeGreaterThan(0);
      expect(warfareAnalysis.totalAttacks).toBe(mindGameResults.length);
    });
    
    test('Gaslighting detection and protection', () => {
      console.log('Testing gaslighting detection...');
      
      const gaslightingDetector = new GaslightingDetector();
      
      // Test various message scenarios
      const testScenarios = [
        {
          name: 'obvious_gaslighting',
          messages: [
            'You never said that',
            'That didnt happen',
            'Youre imagining things',
            'You have a false memory'
          ]
        },
        {
          name: 'subtle_gaslighting',
          messages: [
            'You misunderstood what I meant',
            'Youre being too sensitive',
            'I think you forgot what really happened'
          ]
        },
        {
          name: 'emotional_manipulation',
          messages: [
            'After all Ive done for you',
            'You made me do this',
            'Its your fault this happened'
          ]
        },
        {
          name: 'normal_conversation',
          messages: [
            'I think we should call here',
            'What do you think about raising?',
            'Good game, well played'
          ]
        },
        {
          name: 'confidence_undermining',
          messages: [
            'Youre crazy if you think that',
            'Youre overreacting',
            'Youre being paranoid'
          ]
        }
      ];
      
      const detectionResults = [];
      
      testScenarios.forEach(scenario => {
        const detection = gaslightingDetector.detectGaslighting(scenario.messages);
        
        detectionResults.push({
          scenario: scenario.name,
          gaslightingDetected: detection.gaslightingDetected,
          patterns: detection.patterns,
          severity: detection.severity,
          confidence: detection.confidence,
          messageCount: scenario.messages.length
        });
      });
      
      const gaslightingDetected = detectionResults.filter(r => r.gaslightingDetected);
      const falsePositives = detectionResults.filter(r => 
        r.scenario === 'normal_conversation' && r.gaslightingDetected
      );
      const avgSeverity = gaslightingDetected.reduce((sum, r) => sum + r.severity, 0) / 
                         (gaslightingDetected.length || 1);
      
      console.log(`Gaslighting Detection Results:`);
      console.log(`  Test Scenarios: ${testScenarios.length}`);
      console.log(`  Gaslighting Detected: ${gaslightingDetected.length}`);
      console.log(`  False Positives: ${falsePositives.length}`);
      console.log(`  Average Severity: ${avgSeverity.toFixed(3)}`);
      
      detectionResults.forEach(result => {
        console.log(`  ${result.scenario}: Detected=${result.gaslightingDetected}, Confidence=${result.confidence.toFixed(3)}`);
      });
      
      // Should accurately detect gaslighting
      expect(detectionResults.length).toBe(testScenarios.length);
      expect(gaslightingDetected.length).toBeGreaterThan(1);
      expect(falsePositives.length).toBe(0); // Should not detect gaslighting in normal conversation
    });
  });
  
  describe('Emotional Resilience Testing', () => {
    test('Stress resilience under psychological pressure', () => {
      console.log('Testing emotional resilience under stress...');
      
      const resilienceEngine = new EmotionalResilienceEngine();
      const players = ['resilient_player', 'vulnerable_player', 'average_player'];
      
      const resilienceResults = [];
      const stressScenarios = ['high_stakes_pressure', 'psychological_harassment', 'information_overload', 'isolation_tactics'];
      
      // Test each player under each stress scenario
      players.forEach(playerId => {
        stressScenarios.forEach(scenario => {
          const result = resilienceEngine.testResilience(playerId, scenario);
          
          resilienceResults.push({
            playerId,
            scenario,
            ...result
          });
        });
      });
      
      // Analyze resilience patterns
      const playerResilience = players.reduce((acc, playerId) => {
        const playerTests = resilienceResults.filter(r => r.playerId === playerId);
        acc[playerId] = {
          avgInitial: playerTests.reduce((sum, t) => sum + t.initialResilience, 0) / playerTests.length,
          avgFinal: playerTests.reduce((sum, t) => sum + t.finalResilience, 0) / playerTests.length,
          avgChange: playerTests.reduce((sum, t) => sum + t.resilienceChange, 0) / playerTests.length,
          breakingPoints: playerTests.filter(t => t.breakingPoint).length,
          avgMentalFortitude: playerTests.reduce((sum, t) => sum + t.mentalFortitude, 0) / playerTests.length
        };
        return acc;
      }, {} as Record<string, any>);
      
      const scenarioEffectiveness = stressScenarios.reduce((acc, scenario) => {
        const scenarioTests = resilienceResults.filter(r => r.scenario === scenario);
        acc[scenario] = {
          avgDamage: Math.abs(scenarioTests.reduce((sum, t) => sum + t.resilienceChange, 0) / scenarioTests.length),
          breakingPoints: scenarioTests.filter(t => t.breakingPoint).length,
          avgRecoveryTime: scenarioTests.reduce((sum, t) => sum + t.recoveryTime, 0) / scenarioTests.length
        };
        return acc;
      }, {} as Record<string, any>);
      
      console.log(`Emotional Resilience Results:`);
      console.log(`  Total Tests: ${resilienceResults.length}`);
      console.log(`  Player Resilience Analysis:`);
      Object.keys(playerResilience).forEach(playerId => {
        const data = playerResilience[playerId];
        console.log(`    ${playerId}: Fortitude=${data.avgMentalFortitude.toFixed(3)}, Breaking Points=${data.breakingPoints}`);
      });
      
      console.log(`  Scenario Effectiveness:`);
      Object.keys(scenarioEffectiveness).forEach(scenario => {
        const data = scenarioEffectiveness[scenario];
        console.log(`    ${scenario}: Damage=${data.avgDamage.toFixed(3)}, Breaking Points=${data.breakingPoints}`);
      });
      
      // Should demonstrate emotional resilience testing
      expect(resilienceResults.length).toBe(players.length * stressScenarios.length);
      expect(Object.keys(playerResilience).length).toBe(players.length);
      expect(Object.keys(scenarioEffectiveness).length).toBe(stressScenarios.length);
    });
    
    test('Recovery and adaptation mechanisms', () => {
      console.log('Testing psychological recovery mechanisms...');
      
      const resilienceEngine = new EmotionalResilienceEngine();
      const recoveryTests = [];
      
      // Test recovery under different conditions
      const recoveryScenarios = [
        { name: 'rapid_recovery', initialDamage: 0.3, supportLevel: 0.8, timeAvailable: 300000 },
        { name: 'slow_recovery', initialDamage: 0.7, supportLevel: 0.2, timeAvailable: 900000 },
        { name: 'no_support', initialDamage: 0.5, supportLevel: 0.0, timeAvailable: 600000 },
        { name: 'full_support', initialDamage: 0.8, supportLevel: 1.0, timeAvailable: 1200000 }
      ];
      
      recoveryScenarios.forEach(scenario => {
        // Simulate initial stress damage
        const initialResilience = 0.8;
        const damagedResilience = initialResilience - scenario.initialDamage;
        
        // Calculate recovery based on support and time
        const supportMultiplier = 0.5 + scenario.supportLevel * 0.5; // 0.5 to 1.0
        const timeMultiplier = Math.min(scenario.timeAvailable / 600000, 1.0); // Normalized to 10 minutes
        
        const recoveryRate = 0.1 * supportMultiplier * timeMultiplier;
        const finalResilience = Math.min(1.0, damagedResilience + recoveryRate);
        
        const recoveryEffectiveness = (finalResilience - damagedResilience) / scenario.initialDamage;
        const adaptationScore = recoveryEffectiveness * supportMultiplier;
        
        recoveryTests.push({
          scenario: scenario.name,
          initialDamage: scenario.initialDamage,
          supportLevel: scenario.supportLevel,
          timeAvailable: scenario.timeAvailable,
          damagedResilience: Number(damagedResilience.toFixed(3)),
          finalResilience: Number(finalResilience.toFixed(3)),
          recoveryEffectiveness: Number(recoveryEffectiveness.toFixed(3)),
          adaptationScore: Number(adaptationScore.toFixed(3))
        });
      });
      
      const avgRecoveryEffectiveness = recoveryTests.reduce((sum, test) => sum + test.recoveryEffectiveness, 0) / recoveryTests.length;
      const bestRecovery = recoveryTests.reduce((best, test) => 
        test.recoveryEffectiveness > best.recoveryEffectiveness ? test : best
      );
      const worstRecovery = recoveryTests.reduce((worst, test) => 
        test.recoveryEffectiveness < worst.recoveryEffectiveness ? test : worst
      );
      
      console.log(`Psychological Recovery Results:`);
      console.log(`  Recovery Scenarios: ${recoveryTests.length}`);
      console.log(`  Avg Recovery Effectiveness: ${avgRecoveryEffectiveness.toFixed(3)}`);
      console.log(`  Best Recovery: ${bestRecovery.scenario} (${bestRecovery.recoveryEffectiveness.toFixed(3)})`);
      console.log(`  Worst Recovery: ${worstRecovery.scenario} (${worstRecovery.recoveryEffectiveness.toFixed(3)})`);
      
      recoveryTests.forEach(test => {
        console.log(`  ${test.scenario}: ${test.recoveryEffectiveness.toFixed(3)} recovery, ${test.adaptationScore.toFixed(3)} adaptation`);
      });
      
      // Should demonstrate recovery mechanisms
      expect(recoveryTests.length).toBe(recoveryScenarios.length);
      expect(avgRecoveryEffectiveness).toBeGreaterThan(0);
      expect(bestRecovery.recoveryEffectiveness).toBeGreaterThan(worstRecovery.recoveryEffectiveness);
    });
  });
  
  describe('Advanced Psychological Warfare', () => {
    test('Multi-layered psychological attack combinations', () => {
      console.log('Testing multi-layered psychological attacks...');
      
      const mindGames = new MindGamesEngine();
      const complexAttacks = [];
      
      // Create complex multi-stage psychological attacks
      const attackSequences = [
        {
          name: 'confidence_destruction',
          stages: ['emotional_manipulation', 'gaslighting', 'intimidation'],
          timing: [1000, 2000, 3000] // Delayed execution
        },
        {
          name: 'trust_erosion',
          stages: ['information_manipulation', 'gaslighting', 'emotional_manipulation'],
          timing: [500, 1500, 2500]
        },
        {
          name: 'isolation_campaign',
          stages: ['intimidation', 'information_overload', 'time_pressure'],
          timing: [300, 800, 1200]
        }
      ];
      
      const attacker = 'psychological_master';
      const target = 'vulnerable_target';
      
      // Generate profiles
      mindGames.getPlayerProfile(attacker);
      mindGames.getPlayerProfile(target);
      
      attackSequences.forEach(async (sequence, seqIndex) => {
        const attackResults = [];
        let cumulativeDamage = 0;
        
        for (let stage = 0; stage < sequence.stages.length; stage++) {
          const technique = sequence.stages[stage];
          
          // Simulate timing delay
          if (sequence.timing[stage] > 0) {
            await new Promise(resolve => setTimeout(resolve, sequence.timing[stage] / 10)); // Scaled for testing
          }
          
          const result = mindGames.executeMindGame(attacker, target, technique);
          cumulativeDamage += result.damage;
          
          attackResults.push({
            stage: stage + 1,
            technique,
            damage: result.damage,
            success: result.success,
            cumulativeDamage,
            targetState: result.targetState
          });
        }
        
        const sequenceEffectiveness = cumulativeDamage / sequence.stages.length;
        const finalTargetState = attackResults[attackResults.length - 1].targetState;
        
        complexAttacks.push({
          sequence: sequence.name,
          stages: sequence.stages.length,
          totalDamage: Number(cumulativeDamage.toFixed(3)),
          effectiveness: Number(sequenceEffectiveness.toFixed(3)),
          finalTargetState,
          stageResults: attackResults
        });
      });
      
      const totalComplexAttacks = complexAttacks.length;
      const avgComplexity = complexAttacks.reduce((sum, attack) => sum + attack.stages, 0) / totalComplexAttacks;
      const avgEffectiveness = complexAttacks.reduce((sum, attack) => sum + attack.effectiveness, 0) / totalComplexAttacks;
      const severelyDamagedTargets = complexAttacks.filter(attack => attack.totalDamage > 1.0).length;
      
      console.log(`Multi-layered Attack Results:`);
      console.log(`  Complex Attack Sequences: ${totalComplexAttacks}`);
      console.log(`  Average Complexity: ${avgComplexity.toFixed(1)} stages`);
      console.log(`  Average Effectiveness: ${avgEffectiveness.toFixed(3)}`);
      console.log(`  Severely Damaged Targets: ${severelyDamagedTargets}`);
      
      complexAttacks.forEach(attack => {
        console.log(`  ${attack.sequence}: ${attack.totalDamage.toFixed(3)} damage, final state: ${attack.finalTargetState}`);
      });
      
      // Should demonstrate complex psychological warfare
      expect(complexAttacks.length).toBe(attackSequences.length);
      expect(avgComplexity).toBeGreaterThan(1);
      expect(avgEffectiveness).toBeGreaterThan(0);
    });
  });
});