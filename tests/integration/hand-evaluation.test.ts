/**
 * Integration tests for Hand Evaluation API endpoints
 * 
 * These tests validate the actual API endpoints work correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestAssertions } from '../utils/test-helpers';

// Test environment configuration
const BASE_URL = 'http://localhost:3000';
let serverProcess: any = null;

describe('POST /api/hand/eval', () => {
  it('should evaluate royal flush correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'Ks', 'Qs', 'Js', '10s']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.handRank).toBe(9); // RoyalFlush
    expect(data.handRankName).toBe('Royal Flush');
    expect(data.handStrength).toBe(0); // Best possible hand
  });

  it('should evaluate straight flush correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['9h', '8h', '7h', '6h', '5h']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.handRank).toBe(8); // StraightFlush
    expect(data.handRankName).toBe('Straight Flush');
  });

  it('should evaluate four of a kind correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'Ah', 'Ad', 'Ac', 'Ks']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.handRank).toBe(7); // FourOfAKind
    expect(data.handRankName).toBe('Four of a Kind');
    expect(data.kickers).toContain('A');
  });

  it('should handle 7-card input correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'Ah', 'Ad', 'Ac', 'Ks', '2h', '3d']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.handRank).toBe(7); // FourOfAKind
    expect(data.cards).toHaveLength(5); // Best 5 cards returned
    expect(data.cards).toContain('Ks'); // Should use K kicker, not 2 or 3
  });

  it('should handle wheel straight correctly', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', '2h', '3d', '4s', '5c']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.handRank).toBe(4); // Straight
    expect(data.handDescription).toContain('Wheel');
  });

  it('should return proper response structure', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'Kh', 'Qd', 'Js', '10c']
      })
    });
    
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('handRank');
    expect(data).toHaveProperty('handRankName');
    expect(data).toHaveProperty('handStrength');
    expect(data).toHaveProperty('kickers');
    expect(data).toHaveProperty('handDescription');
    expect(data).toHaveProperty('cards');
    
    expect(typeof data.handRank).toBe('number');
    expect(typeof data.handRankName).toBe('string');
    expect(typeof data.handStrength).toBe('number');
    expect(Array.isArray(data.kickers)).toBe(true);
    expect(Array.isArray(data.cards)).toBe(true);
    expect(data.cards).toHaveLength(5);
  });

  it('should complete within performance requirements', async () => {
    const start = performance.now();
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'Ks', 'Qs', 'Js', '10s']
      })
    });
    const end = performance.now();
    
    expect(response.status).toBe(200);
    expect(end - start).toBeLessThan(50); // < 50ms response time
  });
});

describe('POST /api/hand/eval - Error Handling', () => {
  it('should return 400 for invalid card count', async () => {
    const invalidCounts = [
      [],
      ['As'],
      ['As', 'Ks'],
      ['As', 'Ks', 'Qs'],
      ['As', 'Ks', 'Qs', 'Js'],
      new Array(8).fill('As')
    ];
    
    for (const cards of invalidCounts) {
      const response = await fetch(`${BASE_URL}/api/hand/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid number of cards');
    }
  });

  it('should return 400 for invalid card format', async () => {
    const invalidCards = [
      ['As', 'Invalid', 'Ks', 'Qs', 'Js'],
      ['As', '1s', 'Ks', 'Qs', 'Js'],
      ['As', 'Kx', 'Qs', 'Js', '10s'],
      ['As', 'K', 'Qs', 'Js', '10s'],
      ['A', 'Ks', 'Qs', 'Js', '10s']
    ];
    
    for (const cards of invalidCards) {
      const response = await fetch(`${BASE_URL}/api/hand/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid card');
    }
  });

  it('should return 400 for duplicate cards', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cards: ['As', 'As', 'Ks', 'Qs', 'Js']
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Duplicate cards');
  });

  it('should return 400 for malformed JSON', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    
    expect(response.status).toBe(400);
  });

  it('should return 400 for missing request body', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(400);
  });

  it('should return 400 for missing cards property', async () => {
    const response = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notCards: ['As', 'Ks', 'Qs', 'Js', '10s'] })
    });
    
    expect(response.status).toBe(400);
  });

  it('should handle unsupported HTTP methods', async () => {
    const methods = ['GET', 'PUT', 'DELETE', 'PATCH'];
    
    for (const method of methods) {
      const response = await fetch(`${BASE_URL}/api/hand/eval`, { method });
      expect([405, 404]).toContain(response.status); // Method not allowed or not found
    }
  });
});

describe('API Integration with Existing Card Model', () => {
  it('should work with cards from deck API', async () => {
    // First get cards from shuffle endpoint
    const shuffleResponse = await fetch(`${BASE_URL}/api/deck/shuffle?seed=123`);
    const shuffleData = await shuffleResponse.json();
    
    // Take first 5 cards for evaluation
    const cardsToEvaluate = shuffleData.deck.slice(0, 5).map((card: any) => 
      `${card.rank}${card.suit.charAt(0)}`
    );
    
    // Evaluate the hand
    const evalResponse = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: cardsToEvaluate })
    });
    
    expect(evalResponse.status).toBe(200);
    const evalData = await evalResponse.json();
    expect(evalData).toHaveProperty('handRank');
    expect(evalData).toHaveProperty('handRankName');
  });

  it('should handle drawn cards from deck', async () => {
    // Get shuffled deck
    const shuffleResponse = await fetch(`${BASE_URL}/api/deck/shuffle?seed=456`);
    const shuffleData = await shuffleResponse.json();
    
    // Draw 7 cards
    const drawResponse = await fetch(`${BASE_URL}/api/deck/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 7,
        deck: shuffleData.deck
      })
    });
    const drawData = await drawResponse.json();
    
    // Convert to card strings and evaluate
    const cardsToEvaluate = drawData.drawnCards.map((card: any) => 
      `${card.rank}${card.suit.charAt(0)}`
    );
    
    const evalResponse = await fetch(`${BASE_URL}/api/hand/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards: cardsToEvaluate })
    });
    
    expect(evalResponse.status).toBe(200);
    const evalData = await evalResponse.json();
    expect(evalData.cards).toHaveLength(5); // Best 5 from 7
  });
});