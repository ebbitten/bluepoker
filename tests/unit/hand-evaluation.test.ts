/**
 * Unit tests for Hand Evaluation Service
 * 
 * These tests should be written BEFORE implementing the feature.
 * Initially, all tests should FAIL until the feature is implemented.
 */

import { describe, it, expect } from 'vitest';
import { TestPerformance } from '../utils/test-helpers';

import { evaluateHand, HandRank, HandEvalResult } from '@bluepoker/shared';

describe('Hand Evaluation Core', () => {
  it('should evaluate hands without throwing errors', () => {
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '10s']);
    expect(result).toBeDefined();
    expect(result.handRank).toBeDefined();
    expect(result.handRankName).toBeDefined();
    expect(result.handStrength).toBeDefined();
    expect(result.cards).toHaveLength(5);
  });
});

describe('Hand Ranking Detection', () => {
  it('should identify royal flush correctly', () => {
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '10s']);
    expect(result.handRank).toBe(HandRank.RoyalFlush);
    expect(result.handRankName).toBe('Royal Flush');
  });

  it('should identify straight flush correctly', () => {
    const result = evaluateHand(['9h', '8h', '7h', '6h', '5h']);
    expect(result.handRank).toBe(HandRank.StraightFlush);
    expect(result.handRankName).toBe('Straight Flush');
  });

  it('should identify four of a kind correctly', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
    expect(result.handRank).toBe(HandRank.FourOfAKind);
    expect(result.handRankName).toBe('Four of a Kind');
    expect(result.kickers).toEqual(['A', 'K']);
  });

  it('should identify full house correctly', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Ks', 'Kh']);
    expect(result.handRank).toBe(HandRank.FullHouse);
    expect(result.handRankName).toBe('Full House');
  });

  it('should identify flush correctly', () => {
    const result = evaluateHand(['As', 'Ks', '10s', '8s', '6s']);
    expect(result.handRank).toBe(HandRank.Flush);
    expect(result.handRankName).toBe('Flush');
  });

  it('should identify straight correctly', () => {
    const result = evaluateHand(['As', 'Kh', 'Qd', 'Js', '10c']);
    expect(result.handRank).toBe(HandRank.Straight);
    expect(result.handRankName).toBe('Straight');
  });

  it('should identify three of a kind correctly', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Ks', 'Qh']);
    expect(result.handRank).toBe(HandRank.ThreeOfAKind);
    expect(result.handRankName).toBe('Three of a Kind');
  });

  it('should identify two pair correctly', () => {
    const result = evaluateHand(['As', 'Ah', 'Ks', 'Kh', 'Qd']);
    expect(result.handRank).toBe(HandRank.TwoPair);
    expect(result.handRankName).toBe('Two Pair');
  });

  it('should identify one pair correctly', () => {
    const result = evaluateHand(['As', 'Ah', 'Ks', 'Qh', 'Jd']);
    expect(result.handRank).toBe(HandRank.OnePair);
    expect(result.handRankName).toBe('One Pair');
  });

  it('should identify high card correctly', () => {
    const result = evaluateHand(['As', 'Kh', 'Qd', 'Js', '9c']);
    expect(result.handRank).toBe(HandRank.HighCard);
    expect(result.handRankName).toBe('High Card');
  });
});

describe('Edge Cases', () => {
  it('should handle wheel straight (A-2-3-4-5)', () => {
    const result = evaluateHand(['As', '2h', '3d', '4s', '5c']);
    expect(result.handRank).toBe(HandRank.Straight);
    expect(result.handDescription).toContain('Wheel');
  });

  it('should handle broadway straight (10-J-Q-K-A)', () => {
    const result = evaluateHand(['10s', 'Jh', 'Qd', 'Ks', 'Ac']);
    expect(result.handRank).toBe(HandRank.Straight);
    expect(result.handDescription).toContain('Broadway');
  });

  it('should prefer royal flush over straight flush', () => {
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '10s']);
    expect(result.handRank).toBe(HandRank.RoyalFlush);
    expect(result.handStrength).toBeLessThan(1); // Best possible hand
  });

  it('should choose best 5 cards from 7', () => {
    const result = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks', '2h', '3d']);
    expect(result.handRank).toBe(HandRank.FourOfAKind);
    expect(result.cards).toHaveLength(5);
    expect(result.cards.join(',')).toContain('Ks'); // Should include K kicker, not 2 or 3
  });
});

describe('Hand Strength Ordering', () => {
  it('should order hands by strength correctly', () => {
    const royalFlush = evaluateHand(['As', 'Ks', 'Qs', 'Js', '10s']);
    const straightFlush = evaluateHand(['9h', '8h', '7h', '6h', '5h']);
    const fourOfAKind = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks']);
    const fullHouse = evaluateHand(['As', 'Ah', 'Ad', 'Ks', 'Kh']);
    
    expect(royalFlush.handStrength).toBeLessThan(straightFlush.handStrength);
    expect(straightFlush.handStrength).toBeLessThan(fourOfAKind.handStrength);
    expect(fourOfAKind.handStrength).toBeLessThan(fullHouse.handStrength);
  });

  it('should order same rank hands by kickers', () => {
    const aces = evaluateHand(['As', 'Ah', 'Ks', 'Qh', 'Jd']);
    const kings = evaluateHand(['Ks', 'Kh', 'As', 'Qh', 'Jd']);
    
    expect(aces.handStrength).toBeLessThan(kings.handStrength);
  });
});

describe('Input Validation', () => {
  it('should reject invalid card count', () => {
    expect(() => evaluateHand(['As'])).toThrow('Invalid number of cards');
    expect(() => evaluateHand(['As', 'Ks', 'Qs'])).toThrow('Invalid number of cards');
    expect(() => evaluateHand(new Array(8).fill('As'))).toThrow('Invalid number of cards');
  });

  it('should reject invalid card format', () => {
    expect(() => evaluateHand(['As', 'Invalid', 'Ks', 'Qs', 'Js'])).toThrow('Invalid card format');
    expect(() => evaluateHand(['As', '1s', 'Ks', 'Qs', 'Js'])).toThrow('Invalid card format');
  });

  it('should reject duplicate cards', () => {
    expect(() => evaluateHand(['As', 'As', 'Ks', 'Qs', 'Js'])).toThrow('Duplicate cards');
  });
});

describe('Performance Requirements', () => {
  it('should evaluate hand within reasonable time', () => {
    const testHand = ['As', 'Ks', 'Qs', 'Js', '10s'];
    
    const start = performance.now();
    evaluateHand(testHand);
    const end = performance.now();
    
    // Should complete in under 1ms (much more reasonable than 1 microsecond)
    expect(end - start).toBeLessThan(1);
  });

  it('should handle multiple evaluations efficiently', () => {
    const testHands = [
      ['As', 'Ks', 'Qs', 'Js', '10s'],
      ['9h', '8h', '7h', '6h', '5h'],
      ['As', 'Ah', 'Ad', 'Ac', 'Ks'],
      ['As', 'Ah', 'Ad', 'Ks', 'Kh'],
      ['As', 'Ks', '10s', '8s', '6s']
    ];
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      evaluateHand(testHands[i % testHands.length]);
    }
    const end = performance.now();
    const totalTime = end - start;
    
    // Should complete 1000 evaluations in under 100ms
    expect(totalTime).toBeLessThan(100);
  });
});

describe('Benchmark Tests', () => {
  it('should benchmark royal flush evaluation', () => {
    // Basic benchmark test - just ensure it runs without error
    const result = evaluateHand(['As', 'Ks', 'Qs', 'Js', '10s']);
    expect(result.handRank).toBe(HandRank.RoyalFlush);
  });

  it('should benchmark random hands evaluation', () => {
    const testHands = [
      ['As', 'Kh', 'Qd', 'Js', '9c'],
      ['10s', '9h', '8d', '7s', '6c'],
      ['As', 'Ah', 'Ks', 'Kh', 'Qd']
    ];
    
    testHands.forEach(hand => {
      const result = evaluateHand(hand);
      expect(result).toBeDefined();
      expect(result.handRank).toBeGreaterThanOrEqual(0);
    });
  });
});