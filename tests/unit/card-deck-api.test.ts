/**
 * Unit tests for Card and Deck API
 * 
 * These tests should be written BEFORE implementing the feature.
 * Initially, all tests should FAIL until the feature is implemented.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestFactories, TestAssertions, TestPerformance } from '../utils/test-helpers';
import { createDeck, shuffleDeck, drawCards, Card } from '@bluepoker/shared';

describe('Card Model', () => {
  it('should create a valid card with suit and rank', () => {
    // This test will fail until Card interface is implemented
    const card = TestFactories.createCard('hearts', 'A');
    
    expect(card.suit).toBe('hearts');
    expect(card.rank).toBe('A');
    expect(card.value).toBe(14);
  });

  it('should assign correct values to face cards', () => {
    expect(TestFactories.createCard('spades', 'J').value).toBe(11);
    expect(TestFactories.createCard('spades', 'Q').value).toBe(12);
    expect(TestFactories.createCard('spades', 'K').value).toBe(13);
    expect(TestFactories.createCard('spades', 'A').value).toBe(14);
  });

  it('should assign correct values to number cards', () => {
    expect(TestFactories.createCard('hearts', '2').value).toBe(2);
    expect(TestFactories.createCard('hearts', '10').value).toBe(10);
  });
});

describe('Deck Creation', () => {
  it('should create a standard 52-card deck', () => {
    const deck = createDeck();
    
    expect(deck.length).toBe(52);
    expect(TestAssertions.isValidDeck(deck)).toBe(true);
  });

  it('should contain exactly 13 cards of each suit', () => {
    const deck = createDeck();
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    
    suits.forEach(suit => {
      const suitCards = deck.filter(card => card.suit === suit);
      expect(suitCards.length).toBe(13);
    });
  });

  it('should contain exactly 4 cards of each rank', () => {
    const deck = createDeck();
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    ranks.forEach(rank => {
      const rankCards = deck.filter(card => card.rank === rank);
      expect(rankCards.length).toBe(4);
    });
  });
});

describe('Deck Shuffling', () => {
  it('should shuffle deck deterministically with same seed', () => {
    const deck = createDeck();
    const deck1 = shuffleDeck(deck, 123);
    const deck2 = shuffleDeck(deck, 123);
    
    expect(deck1).toEqual(deck2);
  });

  it('should produce different shuffles with different seeds', () => {
    const deck = createDeck();
    const deck1 = shuffleDeck(deck, 123);
    const deck2 = shuffleDeck(deck, 456);
    
    expect(deck1).not.toEqual(deck2);
  });

  it('should maintain deck integrity after shuffle', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck, 123);
    
    expect(TestAssertions.isValidDeck(shuffled)).toBe(true);
  });

  it('should produce different card orders for different seeds', () => {
    const deck = createDeck();
    const shuffles = [];
    
    // Generate 10 different shuffles
    for (let i = 0; i < 10; i++) {
      shuffles.push(shuffleDeck(deck, i));
    }
    
    // Verify they are all different from each other
    for (let i = 0; i < shuffles.length; i++) {
      for (let j = i + 1; j < shuffles.length; j++) {
        expect(shuffles[i]).not.toEqual(shuffles[j]);
      }
    }
    
    // Verify each shuffle is different from the original deck
    shuffles.forEach(shuffled => {
      expect(shuffled).not.toEqual(deck);
    });
  });
});

describe('Card Drawing', () => {
  it('should draw specified number of cards', () => {
    const deck = createDeck();
    const result = drawCards(deck, 5);
    
    expect(result.drawnCards.length).toBe(5);
    expect(result.remainingDeck.length).toBe(47);
  });

  it('should maintain card uniqueness when drawing', () => {
    const deck = createDeck();
    const result = drawCards(deck, 10);
    
    expect(TestAssertions.areDistinct(result.drawnCards)).toBe(true);
    expect(TestAssertions.areDistinct(result.remainingDeck)).toBe(true);
  });

  it('should handle drawing all cards', () => {
    const deck = createDeck();
    const result = drawCards(deck, 52);
    
    expect(result.drawnCards.length).toBe(52);
    expect(result.remainingDeck.length).toBe(0);
  });

  it('should handle invalid draw count', () => {
    const deck = createDeck();
    
    expect(() => drawCards(deck, -1)).toThrow();
    expect(() => drawCards(deck, 53)).toThrow();
  });
});

describe('Performance Requirements', () => {
  it('should shuffle deck within time limit', async () => {
    const deck = createDeck();
    
    await TestPerformance.assertExecutionTime(() => {
      shuffleDeck(deck, Date.now());
    }, 10); // Must complete within 10ms
  });

  it('should draw cards within time limit', async () => {
    const deck = createDeck();
    
    await TestPerformance.assertExecutionTime(() => {
      drawCards(deck, 5);
    }, 5); // Must complete within 5ms
  });
});