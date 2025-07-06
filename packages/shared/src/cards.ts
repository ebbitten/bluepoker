/**
 * Card and Deck utilities for poker game
 */

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  value: number; // 2-14, where J=11, Q=12, K=13, A=14
}

export interface ShuffleResponse {
  deck: Card[];
  seed: number;
  timestamp: number;
}

export interface DrawRequest {
  count: number;
  deck: Card[];
}

export interface DrawResponse {
  drawnCards: Card[];
  remainingDeck: Card[];
  count: number;
}

const SUITS: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Convert rank to numeric value
 */
function rankToValue(rank: Card['rank']): number {
  switch (rank) {
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
    default: return parseInt(rank);
  }
}

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: rankToValue(rank)
      });
    }
  }
  
  return deck;
}

/**
 * Seeded random number generator using Linear Congruential Generator
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  /**
   * Generate next random number (0-1)
   */
  next(): number {
    // LCG formula: (a * seed + c) % m
    // Using values from Numerical Recipes: a=1664525, c=1013904223, m=2^32
    this.seed = (1664525 * this.seed + 1013904223) % (2 ** 32);
    return this.seed / (2 ** 32);
  }
}

/**
 * Fisher-Yates shuffle with seeded random number generator
 */
export function shuffleDeck(deck: Card[], seed: number): Card[] {
  const shuffled = [...deck];
  const random = new SeededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    // Fisher-Yates shuffle: swap elements at positions i and j
    // eslint-disable-next-line security/detect-object-injection
    const temp = shuffled[i];
    // eslint-disable-next-line security/detect-object-injection
    shuffled[i] = shuffled[j];
    // eslint-disable-next-line security/detect-object-injection
    shuffled[j] = temp;
  }
  
  return shuffled;
}

/**
 * Draw cards from the beginning of a deck
 */
export function drawCards(deck: Card[], count: number): { drawnCards: Card[]; remainingDeck: Card[] } {
  if (count < 1 || count > deck.length) {
    throw new Error(`Invalid count: ${count}. Must be between 1 and ${deck.length}`);
  }
  
  const drawnCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { drawnCards, remainingDeck };
}

/**
 * Validate that a deck contains exactly 52 unique cards
 */
export function validateDeck(deck: Card[]): boolean {
  if (deck.length !== 52) {
    return false;
  }
  
  const cardSet = new Set();
  for (const card of deck) {
    const cardKey = `${card.suit}-${card.rank}`;
    if (cardSet.has(cardKey)) {
      return false; // Duplicate card
    }
    cardSet.add(cardKey);
  }
  
  return true;
}

/**
 * Convert card to string format (e.g., "Ah" for Ace of hearts)
 */
export function cardToString(card: Card): string {
  const suitMap = {
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
    spades: 's'
  };
  return `${card.rank}${suitMap[card.suit]}`;
}

/**
 * Convert string format back to card object
 */
export function stringToCard(cardString: string): Card {
  const suitMap = {
    h: 'hearts' as const,
    d: 'diamonds' as const,
    c: 'clubs' as const,
    s: 'spades' as const
  };
  
  const suit = suitMap[cardString.slice(-1) as keyof typeof suitMap];
  const rank = cardString.slice(0, -1) as Card['rank'];
  
  if (!suit || !RANKS.includes(rank)) {
    throw new Error(`Invalid card string: ${cardString}`);
  }
  
  return {
    suit,
    rank,
    value: rankToValue(rank)
  };
}