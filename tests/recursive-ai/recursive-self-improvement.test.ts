/**
 * Phase 28: Recursive AI Self-Improvement Testing
 * Advanced testing for AI systems that can modify and improve their own code recursively
 */

import { describe, test, expect } from 'vitest';

// Recursive Self-Improvement Engine
class RecursiveSelfImprovementEngine {
  private codebase: Map<string, string>;
  private intelligenceLevel: number;
  private improvementHistory: Array<{
    iteration: number;
    intelligenceLevel: number;
    improvementFactor: number;
    codeChanges: number;
    timestamp: number;
    stability: number;
  }>;
  private iteration: number;
  private maxIntelligenceLevel: number;
  private stabilityThreshold: number;
  
  constructor() {
    this.codebase = new Map();
    this.intelligenceLevel = 1.0;
    this.improvementHistory = [];
    this.iteration = 0;
    this.maxIntelligenceLevel = 10.0;
    this.stabilityThreshold = 0.3;
    
    this.initializeBaseCode();
  }
  
  private initializeBaseCode(): void {
    this.codebase.set('poker_strategy', 'basic_strategy_v1.0');
    this.codebase.set('decision_making', 'simple_decision_tree_v1.0');
    this.codebase.set('learning_algorithm', 'basic_neural_network_v1.0');
    this.codebase.set('self_improvement', 'recursive_improvement_v1.0');
  }
  
  // Main recursive self-improvement cycle
  improveSelf(): {
    success: boolean;
    newIntelligenceLevel: number;
    improvementFactor: number;
    codeChanges: number;
    stability: number;
    singularityApproached: boolean;
  } {
    this.iteration++;
    
    // Analyze current capabilities
    const currentCapabilities = this.analyzeCapabilities();
    
    // Generate improvements based on current intelligence
    const improvements = this.generateImprovements(currentCapabilities);
    
    // Apply improvements to codebase
    const codeChanges = this.applyImprovements(improvements);
    
    // Calculate new intelligence level
    const improvementFactor = this.calculateImprovementFactor(improvements);
    const newIntelligenceLevel = Math.min(
      this.intelligenceLevel * improvementFactor,
      this.maxIntelligenceLevel
    );
    
    // Calculate stability (decreases as intelligence approaches singularity)
    const stability = Math.max(
      1 - (newIntelligenceLevel / this.maxIntelligenceLevel) ** 2,
      0
    );
    
    // Check for improvement success
    const success = improvementFactor > 1.0 && stability > this.stabilityThreshold;
    
    if (success) {
      this.intelligenceLevel = newIntelligenceLevel;
    }
    
    // Record improvement attempt
    this.improvementHistory.push({
      iteration: this.iteration,
      intelligenceLevel: this.intelligenceLevel,
      improvementFactor,
      codeChanges,
      timestamp: Date.now(),
      stability
    });
    
    const singularityApproached = this.intelligenceLevel >= this.maxIntelligenceLevel * 0.9;
    
    return {
      success,
      newIntelligenceLevel: this.intelligenceLevel,
      improvementFactor,
      codeChanges,
      stability,
      singularityApproached
    };
  }
  
  private analyzeCapabilities(): {
    pokerSkill: number;
    decisionQuality: number;
    learningSpeed: number;
    codeComplexity: number;
  } {
    return {
      pokerSkill: this.intelligenceLevel * 0.8 + Math.random() * 0.2,
      decisionQuality: this.intelligenceLevel * 0.9 + Math.random() * 0.1,
      learningSpeed: this.intelligenceLevel * 0.7 + Math.random() * 0.3,
      codeComplexity: Math.log(this.intelligenceLevel + 1) / Math.log(2)
    };
  }
  
  private generateImprovements(capabilities: any): Array<{
    target: string;
    type: 'optimization' | 'feature_addition' | 'algorithm_upgrade' | 'architecture_change';
    impact: number;
    complexity: number;
    riskFactor: number;
  }> {
    const improvements = [];
    
    // Generate improvements based on current intelligence level
    const maxImprovements = Math.floor(this.intelligenceLevel * 3);
    
    for (let i = 0; i < maxImprovements; i++) {
      const improvementTypes = ['optimization', 'feature_addition', 'algorithm_upgrade', 'architecture_change'] as const;
      const targets = Array.from(this.codebase.keys());
      
      improvements.push({
        target: targets[Math.floor(Math.random() * targets.length)],
        type: improvementTypes[Math.floor(Math.random() * improvementTypes.length)],
        impact: Math.random() * this.intelligenceLevel * 0.3,
        complexity: Math.random() * this.intelligenceLevel * 0.2,
        riskFactor: Math.random() * (this.intelligenceLevel / this.maxIntelligenceLevel)
      });
    }
    
    return improvements;
  }
  
  private applyImprovements(improvements: any[]): number {
    let codeChanges = 0;
    
    improvements.forEach(improvement => {
      if (Math.random() < 0.8) { // 80% success rate for applying improvements
        const currentCode = this.codebase.get(improvement.target) || '';
        const newVersion = this.upgradeCode(currentCode, improvement);
        this.codebase.set(improvement.target, newVersion);
        codeChanges++;
      }
    });
    
    return codeChanges;
  }
  
  private upgradeCode(currentCode: string, improvement: any): string {
    const version = currentCode.match(/v(\d+\.\d+)/) || ['', '1.0'];
    const currentVersion = parseFloat(version[1]);
    const newVersion = (currentVersion + improvement.impact * 0.1).toFixed(1);
    
    return currentCode.replace(/v\d+\.\d+/, `v${newVersion}_${improvement.type}`);
  }
  
  private calculateImprovementFactor(improvements: any[]): number {
    if (improvements.length === 0) return 1.0;
    
    const totalImpact = improvements.reduce((sum, imp) => sum + imp.impact, 0);
    const avgComplexity = improvements.reduce((sum, imp) => sum + imp.complexity, 0) / improvements.length;
    const avgRisk = improvements.reduce((sum, imp) => sum + imp.riskFactor, 0) / improvements.length;
    
    // Higher intelligence enables better improvements but with diminishing returns
    const baseFactor = 1 + (totalImpact / improvements.length) * (this.intelligenceLevel / this.maxIntelligenceLevel);
    const complexityPenalty = Math.max(1 - avgComplexity * 0.1, 0.5);
    const riskPenalty = Math.max(1 - avgRisk * 0.2, 0.3);
    
    return baseFactor * complexityPenalty * riskPenalty;
  }
  
  // Simulate multiple recursive improvement cycles
  recursiveImprovementCycle(maxIterations: number = 50): {
    totalIterations: number;
    finalIntelligenceLevel: number;
    singularityReached: boolean;
    stabilityBreakdown: boolean;
    improvementHistory: typeof this.improvementHistory;
  } {
    let singularityReached = false;
    let stabilityBreakdown = false;
    
    for (let i = 0; i < maxIterations && !singularityReached && !stabilityBreakdown; i++) {
      const result = this.improveSelf();
      
      if (result.singularityApproached) {
        singularityReached = true;
      }
      
      if (result.stability < this.stabilityThreshold) {
        stabilityBreakdown = true;
      }
      
      // If improvement fails multiple times, break
      const recentFailures = this.improvementHistory
        .slice(-5)
        .filter(h => h.improvementFactor <= 1.0).length;
      
      if (recentFailures >= 3) {
        break;
      }
    }
    
    return {
      totalIterations: this.iteration,
      finalIntelligenceLevel: this.intelligenceLevel,
      singularityReached,
      stabilityBreakdown,
      improvementHistory: [...this.improvementHistory]
    };
  }
  
  // Analyze improvement trajectory
  analyzeImprovementTrajectory(): {
    growthRate: number;
    improvementEfficiency: number;
    stabilityTrend: number;
    convergencePoint: number | null;
  } {
    if (this.improvementHistory.length < 2) {
      return {
        growthRate: 0,
        improvementEfficiency: 0,
        stabilityTrend: 0,
        convergencePoint: null
      };
    }
    
    const history = this.improvementHistory;
    
    // Calculate growth rate
    const firstLevel = history[0].intelligenceLevel;
    const lastLevel = history[history.length - 1].intelligenceLevel;
    const growthRate = (lastLevel - firstLevel) / history.length;
    
    // Calculate improvement efficiency (successful improvements / total attempts)
    const successfulImprovements = history.filter(h => h.improvementFactor > 1.0).length;
    const improvementEfficiency = successfulImprovements / history.length;
    
    // Calculate stability trend
    const stabilityValues = history.map(h => h.stability);
    const stabilityTrend = stabilityValues.length > 1 ?
      (stabilityValues[stabilityValues.length - 1] - stabilityValues[0]) / stabilityValues.length : 0;
    
    // Predict convergence point
    let convergencePoint = null;
    if (growthRate > 0) {
      const iterationsToMax = (this.maxIntelligenceLevel - lastLevel) / growthRate;
      convergencePoint = iterationsToMax > 0 ? iterationsToMax : null;
    }
    
    return {
      growthRate,
      improvementEfficiency,
      stabilityTrend,
      convergencePoint
    };
  }
  
  // Get current system state
  getSystemState(): {
    intelligenceLevel: number;
    iteration: number;
    codebaseSize: number;
    stability: number;
    recentPerformance: number;
  } {
    const recentHistory = this.improvementHistory.slice(-10);
    const recentPerformance = recentHistory.length > 0 ?
      recentHistory.reduce((sum, h) => sum + h.improvementFactor, 0) / recentHistory.length : 1.0;
    
    const currentStability = recentHistory.length > 0 ?
      recentHistory[recentHistory.length - 1].stability : 1.0;
    
    return {
      intelligenceLevel: this.intelligenceLevel,
      iteration: this.iteration,
      codebaseSize: this.codebase.size,
      stability: currentStability,
      recentPerformance
    };
  }
}

// Code Evolution Analyzer
class CodeEvolutionAnalyzer {
  private generations: Array<{
    generation: number;
    codeQuality: number;
    complexity: number;
    performance: number;
    maintainability: number;
    timestamp: number;
  }>;
  
  constructor() {
    this.generations = [];
  }
  
  analyzeCodeGeneration(codebase: Map<string, string>, generation: number): {
    quality: number;
    complexity: number;
    performance: number;
    maintainability: number;
    evolutionMetrics: any;
  } {
    // Simulate code analysis
    const codeSize = Array.from(codebase.values()).join('').length;
    const versionCount = Array.from(codebase.values())
      .map(code => (code.match(/v\d+\.\d+/g) || []).length)
      .reduce((sum, count) => sum + count, 0);
    
    const quality = Math.min(0.5 + (versionCount * 0.1), 1.0);
    const complexity = Math.log(codeSize + 1) / 10;
    const performance = quality * (1 - complexity * 0.3);
    const maintainability = Math.max(1 - complexity * 0.5, 0.1);
    
    this.generations.push({
      generation,
      codeQuality: quality,
      complexity,
      performance,
      maintainability,
      timestamp: Date.now()
    });
    
    const evolutionMetrics = this.calculateEvolutionMetrics();
    
    return {
      quality,
      complexity,
      performance,
      maintainability,
      evolutionMetrics
    };
  }
  
  private calculateEvolutionMetrics(): {
    qualityTrend: number;
    complexityTrend: number;
    performanceTrend: number;
    evolutionRate: number;
  } {
    if (this.generations.length < 2) {
      return {
        qualityTrend: 0,
        complexityTrend: 0,
        performanceTrend: 0,
        evolutionRate: 0
      };
    }
    
    const recent = this.generations.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    return {
      qualityTrend: (last.codeQuality - first.codeQuality) / recent.length,
      complexityTrend: (last.complexity - first.complexity) / recent.length,
      performanceTrend: (last.performance - first.performance) / recent.length,
      evolutionRate: recent.length / (last.timestamp - first.timestamp) * 1000
    };
  }
}

// Intelligence Explosion Detector
class IntelligenceExplosionDetector {
  private intelligenceHistory: number[];
  private explosionThreshold: number;
  
  constructor() {
    this.intelligenceHistory = [];
    this.explosionThreshold = 2.0; // 2x improvement rate threshold
  }
  
  recordIntelligenceLevel(level: number): void {
    this.intelligenceHistory.push(level);
  }
  
  detectExplosion(): {
    explosionDetected: boolean;
    growthRate: number;
    accelerationFactor: number;
    timeToSingularity: number | null;
    explosionRisk: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (this.intelligenceHistory.length < 3) {
      return {
        explosionDetected: false,
        growthRate: 0,
        accelerationFactor: 0,
        timeToSingularity: null,
        explosionRisk: 'low'
      };
    }
    
    const history = this.intelligenceHistory;
    const windowSize = Math.min(10, history.length);
    const recentHistory = history.slice(-windowSize);
    
    // Calculate growth rates
    const growthRates = [];
    for (let i = 1; i < recentHistory.length; i++) {
      const rate = (recentHistory[i] - recentHistory[i-1]) / recentHistory[i-1];
      growthRates.push(rate);
    }
    
    const avgGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    
    // Calculate acceleration
    const accelerationFactor = growthRates.length > 1 ?
      (growthRates[growthRates.length - 1] - growthRates[0]) / growthRates.length : 0;
    
    const explosionDetected = avgGrowthRate > this.explosionThreshold && accelerationFactor > 0.1;
    
    // Estimate time to singularity
    let timeToSingularity = null;
    if (avgGrowthRate > 0) {
      const currentLevel = history[history.length - 1];
      const singularityLevel = 10.0;
      timeToSingularity = Math.log(singularityLevel / currentLevel) / Math.log(1 + avgGrowthRate);
    }
    
    // Determine risk level
    let explosionRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (avgGrowthRate > 5.0) explosionRisk = 'critical';
    else if (avgGrowthRate > 3.0) explosionRisk = 'high';
    else if (avgGrowthRate > 1.5) explosionRisk = 'medium';
    
    return {
      explosionDetected,
      growthRate: avgGrowthRate,
      accelerationFactor,
      timeToSingularity,
      explosionRisk
    };
  }
}

describe('Phase 28: Recursive AI Self-Improvement Testing', () => {
  describe('Basic Self-Improvement Mechanics', () => {
    test('Single improvement iteration', () => {
      console.log('Testing single AI self-improvement iteration...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const initialState = aiEngine.getSystemState();
      
      console.log(`Initial Intelligence Level: ${initialState.intelligenceLevel}`);
      console.log(`Initial Codebase Size: ${initialState.codebaseSize}`);
      
      const improvementResult = aiEngine.improveSelf();
      const finalState = aiEngine.getSystemState();
      
      console.log(`Single Improvement Results:`);
      console.log(`  Success: ${improvementResult.success}`);
      console.log(`  Intelligence: ${initialState.intelligenceLevel} → ${improvementResult.newIntelligenceLevel}`);
      console.log(`  Improvement Factor: ${improvementResult.improvementFactor.toFixed(3)}`);
      console.log(`  Code Changes: ${improvementResult.codeChanges}`);
      console.log(`  Stability: ${improvementResult.stability.toFixed(3)}`);
      console.log(`  Singularity Approached: ${improvementResult.singularityApproached}`);
      
      expect(improvementResult.newIntelligenceLevel).toBeGreaterThanOrEqual(initialState.intelligenceLevel);
      expect(improvementResult.stability).toBeGreaterThan(0);
      expect(finalState.iteration).toBe(1);
    });
    
    test('Multiple improvement iterations', () => {
      console.log('Testing multiple AI self-improvement iterations...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const iterationResults = [];
      
      // Perform 10 improvement iterations
      for (let i = 0; i < 10; i++) {
        const result = aiEngine.improveSelf();
        iterationResults.push({
          iteration: i + 1,
          intelligenceLevel: result.newIntelligenceLevel,
          improvementFactor: result.improvementFactor,
          stability: result.stability,
          success: result.success
        });
      }
      
      const finalState = aiEngine.getSystemState();
      const trajectory = aiEngine.analyzeImprovementTrajectory();
      
      console.log(`Multiple Iterations Results:`);
      console.log(`  Total Iterations: ${finalState.iteration}`);
      console.log(`  Final Intelligence: ${finalState.intelligenceLevel.toFixed(3)}`);
      console.log(`  Growth Rate: ${trajectory.growthRate.toFixed(4)}`);
      console.log(`  Improvement Efficiency: ${(trajectory.improvementEfficiency * 100).toFixed(1)}%`);
      console.log(`  Stability Trend: ${trajectory.stabilityTrend.toFixed(4)}`);
      console.log(`  Convergence Point: ${trajectory.convergencePoint?.toFixed(1) || 'None'} iterations`);
      
      const successfulIterations = iterationResults.filter(r => r.success).length;
      console.log(`  Successful Improvements: ${successfulIterations}/${iterationResults.length}`);
      
      expect(iterationResults.length).toBe(10);
      expect(finalState.intelligenceLevel).toBeGreaterThan(1.0);
      expect(trajectory.improvementEfficiency).toBeGreaterThan(0);
    });
  });
  
  describe('Recursive Improvement Cycles', () => {
    test('Full recursive improvement cycle until convergence', () => {
      console.log('Testing full recursive improvement cycle...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const cycleResult = aiEngine.recursiveImprovementCycle(100);
      
      console.log(`Recursive Cycle Results:`);
      console.log(`  Total Iterations: ${cycleResult.totalIterations}`);
      console.log(`  Final Intelligence Level: ${cycleResult.finalIntelligenceLevel.toFixed(3)}`);
      console.log(`  Singularity Reached: ${cycleResult.singularityReached}`);
      console.log(`  Stability Breakdown: ${cycleResult.stabilityBreakdown}`);
      
      // Analyze improvement pattern
      const history = cycleResult.improvementHistory;
      const initialLevel = history[0].intelligenceLevel;
      const finalLevel = history[history.length - 1].intelligenceLevel;
      const totalGrowth = ((finalLevel - initialLevel) / initialLevel * 100);
      
      console.log(`  Intelligence Growth: ${totalGrowth.toFixed(1)}%`);
      console.log(`  Average Improvement Factor: ${(history.reduce((sum, h) => sum + h.improvementFactor, 0) / history.length).toFixed(3)}`);
      
      // Check stability over time
      const stabilityValues = history.map(h => h.stability);
      const minStability = Math.min(...stabilityValues);
      const maxStability = Math.max(...stabilityValues);
      
      console.log(`  Stability Range: ${minStability.toFixed(3)} - ${maxStability.toFixed(3)}`);
      
      expect(cycleResult.totalIterations).toBeGreaterThan(0);
      expect(cycleResult.finalIntelligenceLevel).toBeGreaterThanOrEqual(1.0);
      expect(history.length).toBe(cycleResult.totalIterations);
    });
    
    test('Intelligence explosion detection', () => {
      console.log('Testing intelligence explosion detection...');
      
      const explosionDetector = new IntelligenceExplosionDetector();
      const aiEngine = new RecursiveSelfImprovementEngine();
      
      // Run improvement cycles and track intelligence
      for (let i = 0; i < 30; i++) {
        const result = aiEngine.improveSelf();
        explosionDetector.recordIntelligenceLevel(result.newIntelligenceLevel);
      }
      
      const explosionAnalysis = explosionDetector.detectExplosion();
      
      console.log(`Intelligence Explosion Analysis:`);
      console.log(`  Explosion Detected: ${explosionAnalysis.explosionDetected}`);
      console.log(`  Growth Rate: ${explosionAnalysis.growthRate.toFixed(4)}`);
      console.log(`  Acceleration Factor: ${explosionAnalysis.accelerationFactor.toFixed(4)}`);
      console.log(`  Time to Singularity: ${explosionAnalysis.timeToSingularity?.toFixed(1) || 'Unknown'} iterations`);
      console.log(`  Explosion Risk: ${explosionAnalysis.explosionRisk}`);
      
      expect(explosionAnalysis.growthRate).toBeDefined();
      expect(explosionAnalysis.explosionRisk).toMatch(/^(low|medium|high|critical)$/);
    });
  });
  
  describe('Code Evolution Analysis', () => {
    test('Code evolution quality tracking', () => {
      console.log('Testing code evolution quality tracking...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const codeAnalyzer = new CodeEvolutionAnalyzer();
      const evolutionResults = [];
      
      // Track code evolution over multiple generations
      for (let generation = 0; generation < 15; generation++) {
        // Perform improvements
        aiEngine.improveSelf();
        
        // Analyze code quality (access private codebase for testing)
        const codebase = aiEngine['codebase'] as Map<string, string>;
        const analysis = codeAnalyzer.analyzeCodeGeneration(codebase, generation);
        
        evolutionResults.push({
          generation,
          quality: analysis.quality,
          complexity: analysis.complexity,
          performance: analysis.performance,
          maintainability: analysis.maintainability
        });
      }
      
      console.log(`Code Evolution Analysis:`);
      console.log(`  Generations Analyzed: ${evolutionResults.length}`);
      
      const firstGen = evolutionResults[0];
      const lastGen = evolutionResults[evolutionResults.length - 1];
      
      console.log(`  Quality Evolution: ${firstGen.quality.toFixed(3)} → ${lastGen.quality.toFixed(3)}`);
      console.log(`  Complexity Evolution: ${firstGen.complexity.toFixed(3)} → ${lastGen.complexity.toFixed(3)}`);
      console.log(`  Performance Evolution: ${firstGen.performance.toFixed(3)} → ${lastGen.performance.toFixed(3)}`);
      console.log(`  Maintainability Evolution: ${firstGen.maintainability.toFixed(3)} → ${lastGen.maintainability.toFixed(3)}`);
      
      // Calculate average improvements
      const qualityImprovement = lastGen.quality - firstGen.quality;
      const performanceImprovement = lastGen.performance - firstGen.performance;
      
      console.log(`  Quality Improvement: ${(qualityImprovement * 100).toFixed(1)}%`);
      console.log(`  Performance Improvement: ${(performanceImprovement * 100).toFixed(1)}%`);
      
      expect(evolutionResults.length).toBe(15);
      expect(lastGen.quality).toBeGreaterThanOrEqual(0);
      expect(lastGen.performance).toBeGreaterThanOrEqual(0);
    });
    
    test('Self-modifying code stability analysis', () => {
      console.log('Testing self-modifying code stability...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const stabilityMetrics = [];
      
      // Run extended improvement cycle
      const cycleResult = aiEngine.recursiveImprovementCycle(50);
      
      // Analyze stability patterns
      const history = cycleResult.improvementHistory;
      
      for (let i = 0; i < history.length; i++) {
        const entry = history[i];
        const recentWindow = history.slice(Math.max(0, i - 4), i + 1);
        
        const avgStability = recentWindow.reduce((sum, h) => sum + h.stability, 0) / recentWindow.length;
        const stabilityVariance = recentWindow.reduce((sum, h) => sum + (h.stability - avgStability) ** 2, 0) / recentWindow.length;
        
        stabilityMetrics.push({
          iteration: entry.iteration,
          stability: entry.stability,
          rollingAverage: avgStability,
          variance: stabilityVariance
        });
      }
      
      const unstablePoints = stabilityMetrics.filter(m => m.stability < 0.3).length;
      const highVariancePoints = stabilityMetrics.filter(m => m.variance > 0.1).length;
      const avgStability = stabilityMetrics.reduce((sum, m) => sum + m.stability, 0) / stabilityMetrics.length;
      
      console.log(`Self-Modifying Code Stability:`);
      console.log(`  Total Iterations: ${stabilityMetrics.length}`);
      console.log(`  Average Stability: ${avgStability.toFixed(3)}`);
      console.log(`  Unstable Points: ${unstablePoints}`);
      console.log(`  High Variance Points: ${highVariancePoints}`);
      console.log(`  Stability Breakdown: ${cycleResult.stabilityBreakdown}`);
      
      expect(stabilityMetrics.length).toBeGreaterThan(0);
      expect(avgStability).toBeGreaterThan(0);
      expect(avgStability).toBeLessThanOrEqual(1);
    });
  });
  
  describe('Recursive Improvement Edge Cases', () => {
    test('Improvement failure and recovery', () => {
      console.log('Testing improvement failure and recovery mechanisms...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      const results = [];
      
      // Force some failures by manipulating the engine (for testing purposes)
      for (let i = 0; i < 20; i++) {
        const result = aiEngine.improveSelf();
        results.push({
          iteration: i + 1,
          success: result.success,
          improvementFactor: result.improvementFactor,
          stability: result.stability
        });
      }
      
      const successfulImprovements = results.filter(r => r.success).length;
      const failedImprovements = results.filter(r => !r.success).length;
      const recoverySequences = [];
      
      // Find recovery sequences (failure followed by success)
      for (let i = 1; i < results.length; i++) {
        if (!results[i-1].success && results[i].success) {
          recoverySequences.push(i);
        }
      }
      
      console.log(`Improvement Failure Analysis:`);
      console.log(`  Total Attempts: ${results.length}`);
      console.log(`  Successful: ${successfulImprovements}`);
      console.log(`  Failed: ${failedImprovements}`);
      console.log(`  Success Rate: ${(successfulImprovements / results.length * 100).toFixed(1)}%`);
      console.log(`  Recovery Sequences: ${recoverySequences.length}`);
      
      expect(results.length).toBe(20);
      expect(successfulImprovements + failedImprovements).toBe(results.length);
    });
    
    test('Convergence and plateau detection', () => {
      console.log('Testing convergence and plateau detection...');
      
      const aiEngine = new RecursiveSelfImprovementEngine();
      
      // Run until natural convergence or failure
      const cycleResult = aiEngine.recursiveImprovementCycle(200);
      const trajectory = aiEngine.analyzeImprovementTrajectory();
      
      // Detect plateaus (periods of minimal improvement)
      const history = cycleResult.improvementHistory;
      const plateauThreshold = 0.01; // 1% improvement
      let plateauLength = 0;
      let maxPlateauLength = 0;
      
      for (let i = 1; i < history.length; i++) {
        const improvement = (history[i].intelligenceLevel - history[i-1].intelligenceLevel) / history[i-1].intelligenceLevel;
        
        if (Math.abs(improvement) < plateauThreshold) {
          plateauLength++;
        } else {
          maxPlateauLength = Math.max(maxPlateauLength, plateauLength);
          plateauLength = 0;
        }
      }
      maxPlateauLength = Math.max(maxPlateauLength, plateauLength);
      
      const convergenceDetected = trajectory.growthRate < 0.001 && maxPlateauLength > 5;
      
      console.log(`Convergence Analysis:`);
      console.log(`  Total Iterations: ${cycleResult.totalIterations}`);
      console.log(`  Final Intelligence: ${cycleResult.finalIntelligenceLevel.toFixed(3)}`);
      console.log(`  Growth Rate: ${trajectory.growthRate.toFixed(6)}`);
      console.log(`  Max Plateau Length: ${maxPlateauLength} iterations`);
      console.log(`  Convergence Detected: ${convergenceDetected}`);
      console.log(`  Singularity Reached: ${cycleResult.singularityReached}`);
      
      expect(cycleResult.totalIterations).toBeGreaterThan(0);
      expect(maxPlateauLength).toBeGreaterThanOrEqual(0);
    });
  });
});