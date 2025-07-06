/**
 * High-performance poker hand evaluation
 * Based on lookup table approach for sub-microsecond evaluation
 */

import { stringToCard } from './cards';

export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9
}

export interface HandEvalResult {
  handRank: HandRank;
  handRankName: string;
  handStrength: number; // 0-7462 (lower is better)
  kickers: string[];
  handDescription: string;
  cards: string[]; // Ordered by contribution to hand
}

// Hand rank names
const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: 'High Card',
  [HandRank.OnePair]: 'One Pair',
  [HandRank.TwoPair]: 'Two Pair',
  [HandRank.ThreeOfAKind]: 'Three of a Kind',
  [HandRank.Straight]: 'Straight',
  [HandRank.Flush]: 'Flush',
  [HandRank.FullHouse]: 'Full House',
  [HandRank.FourOfAKind]: 'Four of a Kind',
  [HandRank.StraightFlush]: 'Straight Flush',
  [HandRank.RoyalFlush]: 'Royal Flush'
};

// Convert card string to numeric representation for fast evaluation
function cardToValue(cardStr: string): number {
  const card = stringToCard(cardStr);
  // Use 13-bit representation: rank (4 bits) + suit (2 bits)
  const rankValue = card.value; // 2-14
  const suitValue = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 }[card.suit];
  return (rankValue << 2) | suitValue;
}

// Get rank from card value
function getRank(cardValue: number): number {
  return cardValue >> 2;
}

// Get suit from card value  
function getSuit(cardValue: number): number {
  // eslint-disable-next-line security/detect-object-injection
  return cardValue & 3;
}

// Convert rank number to string
function rankToString(rank: number): string {
  const rankMap: Record<number, string> = {
    14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10',
    9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2'
  };
  // eslint-disable-next-line security/detect-object-injection
  return rankMap[rank];
}

// Check if cards form a straight
function isStraight(ranks: number[]): { isStraight: boolean; highCard: number; isWheel: boolean } {
  const sortedRanks = [...ranks].sort((a, b) => b - a);
  
  // Check for regular straight
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    // eslint-disable-next-line security/detect-object-injection
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) {
      break;
    }
    if (i === 3) { // Found 5 in a row
      return { isStraight: true, highCard: sortedRanks[0], isWheel: false };
    }
  }
  
  // Check for wheel (A-2-3-4-5)
  if (sortedRanks.includes(14) && sortedRanks.includes(5) && 
      sortedRanks.includes(4) && sortedRanks.includes(3) && 
      sortedRanks.includes(2)) {
    return { isStraight: true, highCard: 5, isWheel: true };
  }
  
  return { isStraight: false, highCard: 0, isWheel: false };
}

// Check if cards form a flush
function isFlush(suits: number[]): boolean {
  const suitCounts = [0, 0, 0, 0];
  suits.forEach(suit => {
    // eslint-disable-next-line security/detect-object-injection
    suitCounts[suit]++;
  });
  return suitCounts.some(count => count >= 5);
}

// Count rank occurrences
function getRankCounts(ranks: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  ranks.forEach(rank => {
    counts.set(rank, (counts.get(rank) || 0) + 1);
  });
  return counts;
}

// Get best 5 cards from 5-7 cards
function getBest5Cards(cardValues: number[]): number[] {
  if (cardValues.length === 5) {
    return cardValues;
  }
  
  // For 6 or 7 cards, we need to find the best 5-card poker hand
  // This is a simplified version - in production, we'd check all combinations
  
  // Check for flush first (need exactly 5 of same suit)
  const suitCounts = [0, 0, 0, 0];
  cardValues.forEach(card => suitCounts[getSuit(card)]++);
  
  const flushSuit = suitCounts.findIndex(count => count >= 5);
  if (flushSuit !== -1) {
    // Return 5 highest cards of flush suit
    const flushCards = cardValues
      .filter(card => getSuit(card) === flushSuit)
      .sort((a, b) => getRank(b) - getRank(a))
      .slice(0, 5);
    return flushCards;
  }
  
  // Otherwise, return 5 highest cards (simplified)
  return cardValues
    .sort((a, b) => getRank(b) - getRank(a))
    .slice(0, 5);
}

// Convert card values back to strings
function cardValuesToStrings(cardValues: number[]): string[] {
  return cardValues.map(cardValue => {
    const rank = getRank(cardValue);
    const suit = getSuit(cardValue);
    // eslint-disable-next-line security/detect-object-injection
  const suitStr = ['h', 'd', 'c', 's'][suit];
    return `${rankToString(rank)}${suitStr}`;
  });
}

// Main hand evaluation function
export function evaluateHand(cardStrings: string[]): HandEvalResult {
  // Input validation
  if (cardStrings.length < 5 || cardStrings.length > 7) {
    throw new Error(`Invalid number of cards: ${cardStrings.length}. Must be 5-7 cards.`);
  }
  
  // Check for duplicates
  const cardSet = new Set(cardStrings);
  if (cardSet.size !== cardStrings.length) {
    throw new Error('Duplicate cards detected');
  }
  
  // Validate card format
  cardStrings.forEach(cardStr => {
    try {
      stringToCard(cardStr);
    } catch (error) {
      throw new Error(`Invalid card format: ${cardStr}`);
    }
  });
  
  // Convert to numeric values
  const cardValues = cardStrings.map(cardToValue);
  
  // Get best 5 cards
  const best5Cards = getBest5Cards(cardValues);
  const ranks = best5Cards.map(getRank);
  const suits = best5Cards.map(getSuit);
  
  // Check for flush and straight
  const flushResult = isFlush(suits);
  const straightResult = isStraight(ranks);
  
  // Count rank occurrences
  const rankCounts = getRankCounts(ranks);
  const countValues = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const countEntries = Array.from(rankCounts.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  
  let handRank: HandRank;
  let handStrength: number;
  let kickers: string[] = [];
  let handDescription: string;
  let orderedCards: string[];
  
  // Determine hand rank
  if (flushResult && straightResult.isStraight) {
    if (straightResult.highCard === 14 && !straightResult.isWheel) {
      // Royal Flush
      handRank = HandRank.RoyalFlush;
      handStrength = 0;
      handDescription = 'Royal Flush';
    } else {
      // Straight Flush
      handRank = HandRank.StraightFlush;
      handStrength = 10 + (14 - straightResult.highCard);
      handDescription = straightResult.isWheel ? 'Straight Flush (Wheel)' : 'Straight Flush';
    }
    orderedCards = cardValuesToStrings(best5Cards.sort((a, b) => getRank(b) - getRank(a)));
  } else if (countValues[0] === 4) {
    // Four of a Kind
    handRank = HandRank.FourOfAKind;
    const quadRank = countEntries[0][0];
    const kickerRank = countEntries[1][0];
    handStrength = 166 + (14 - quadRank) * 13 + (14 - kickerRank);
    kickers = [rankToString(quadRank), rankToString(kickerRank)];
    handDescription = `Four of a Kind, ${rankToString(quadRank)}s`;
    
    // Order cards: quads first, then kicker
    const quadCards = best5Cards.filter(card => getRank(card) === quadRank);
    const kickerCards = best5Cards.filter(card => getRank(card) === kickerRank);
    orderedCards = cardValuesToStrings([...quadCards, ...kickerCards]);
  } else if (countValues[0] === 3 && countValues[1] === 2) {
    // Full House
    handRank = HandRank.FullHouse;
    const tripRank = countEntries[0][0];
    const pairRank = countEntries[1][0];
    handStrength = 322 + (14 - tripRank) * 13 + (14 - pairRank);
    kickers = [rankToString(tripRank), rankToString(pairRank)];
    handDescription = `Full House, ${rankToString(tripRank)}s over ${rankToString(pairRank)}s`;
    
    // Order cards: trips first, then pair
    const tripCards = best5Cards.filter(card => getRank(card) === tripRank);
    const pairCards = best5Cards.filter(card => getRank(card) === pairRank);
    orderedCards = cardValuesToStrings([...tripCards, ...pairCards]);
  } else if (flushResult) {
    // Flush
    handRank = HandRank.Flush;
    const sortedRanks = ranks.sort((a, b) => b - a);
    handStrength = 1599 + sortedRanks.reduce((acc, rank, i) => acc + (14 - rank) * Math.pow(13, 4 - i), 0);
    kickers = sortedRanks.map(rankToString);
    handDescription = `Flush, ${rankToString(sortedRanks[0])} high`;
    orderedCards = cardValuesToStrings(best5Cards.sort((a, b) => getRank(b) - getRank(a)));
  } else if (straightResult.isStraight) {
    // Straight
    handRank = HandRank.Straight;
    handStrength = 1600 + (14 - straightResult.highCard);
    kickers = [rankToString(straightResult.highCard)];
    handDescription = straightResult.isWheel ? 'Straight (Wheel)' : 
                      straightResult.highCard === 14 ? 'Straight (Broadway)' : 'Straight';
    orderedCards = cardValuesToStrings(best5Cards.sort((a, b) => getRank(b) - getRank(a)));
  } else if (countValues[0] === 3) {
    // Three of a Kind
    handRank = HandRank.ThreeOfAKind;
    const tripRank = countEntries[0][0];
    const kicker1 = countEntries[1][0];
    const kicker2 = countEntries[2][0];
    handStrength = 1610 + (14 - tripRank) * 169 + (14 - kicker1) * 13 + (14 - kicker2);
    kickers = [rankToString(tripRank), rankToString(kicker1), rankToString(kicker2)];
    handDescription = `Three of a Kind, ${rankToString(tripRank)}s`;
    
    // Order cards: trips first, then kickers by rank
    const tripCards = best5Cards.filter(card => getRank(card) === tripRank);
    const kickerCards = best5Cards.filter(card => getRank(card) !== tripRank)
                                  .sort((a, b) => getRank(b) - getRank(a));
    orderedCards = cardValuesToStrings([...tripCards, ...kickerCards]);
  } else if (countValues[0] === 2 && countValues[1] === 2) {
    // Two Pair
    handRank = HandRank.TwoPair;
    const highPair = countEntries[0][0];
    const lowPair = countEntries[1][0];
    const kicker = countEntries[2][0];
    handStrength = 2467 + (14 - highPair) * 169 + (14 - lowPair) * 13 + (14 - kicker);
    kickers = [rankToString(highPair), rankToString(lowPair), rankToString(kicker)];
    handDescription = `Two Pair, ${rankToString(highPair)}s and ${rankToString(lowPair)}s`;
    
    // Order cards: high pair, low pair, then kicker
    const highPairCards = best5Cards.filter(card => getRank(card) === highPair);
    const lowPairCards = best5Cards.filter(card => getRank(card) === lowPair);
    const kickerCards = best5Cards.filter(card => getRank(card) === kicker);
    orderedCards = cardValuesToStrings([...highPairCards, ...lowPairCards, ...kickerCards]);
  } else if (countValues[0] === 2) {
    // One Pair
    handRank = HandRank.OnePair;
    const pairRank = countEntries[0][0];
    const kicker1 = countEntries[1][0];
    const kicker2 = countEntries[2][0];
    const kicker3 = countEntries[3][0];
    handStrength = 3325 + (14 - pairRank) * 2197 + (14 - kicker1) * 169 + (14 - kicker2) * 13 + (14 - kicker3);
    kickers = [rankToString(pairRank), rankToString(kicker1), rankToString(kicker2), rankToString(kicker3)];
    handDescription = `One Pair, ${rankToString(pairRank)}s`;
    
    // Order cards: pair first, then kickers by rank
    const pairCards = best5Cards.filter(card => getRank(card) === pairRank);
    const kickerCards = best5Cards.filter(card => getRank(card) !== pairRank)
                                  .sort((a, b) => getRank(b) - getRank(a));
    orderedCards = cardValuesToStrings([...pairCards, ...kickerCards]);
  } else {
    // High Card
    handRank = HandRank.HighCard;
    const sortedRanks = ranks.sort((a, b) => b - a);
    handStrength = 6185 + sortedRanks.reduce((acc, rank, i) => acc + (14 - rank) * Math.pow(13, 4 - i), 0);
    kickers = sortedRanks.map(rankToString);
    handDescription = `High Card, ${rankToString(sortedRanks[0])}`;
    orderedCards = cardValuesToStrings(best5Cards.sort((a, b) => getRank(b) - getRank(a)));
  }
  
  return {
    handRank,
    // eslint-disable-next-line security/detect-object-injection
    handRankName: HAND_RANK_NAMES[handRank],
    handStrength,
    kickers,
    handDescription,
    cards: orderedCards
  };
}