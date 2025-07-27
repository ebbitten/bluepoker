/**
 * Texas Hold'em Game State Management
 */
/* eslint-disable security/detect-object-injection */

import { Card, createDeck, shuffleDeck, drawCards, cardToString } from './cards';
import { evaluateHand } from './hand-evaluation';
import { randomUUID } from 'crypto';

export interface Player {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  folded: boolean;
  allIn: boolean;
  userId?: string; // Optional user ID for authentication
}

export interface GameState {
  gameId: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  activePlayerIndex: number;
  phase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';
  winner?: number;
  winnerReason?: string;
  deck: Card[];
  playersActed: boolean[]; // Track which players have acted this betting round
  handNumber: number; // Track which hand this is in the session
  dealerIndex: number; // Track who the dealer is (rotates each hand)
}

export interface PlayerActionResult {
  success: boolean;
  gameState: GameState;
  error?: string;
}

const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const STARTING_CHIPS = 1000;

/**
 * Create a new game with two players
 */
export function createGame(gameId: string, playerNames: [string, string]): GameState {
  const players: Player[] = playerNames.map((name) => ({
    id: randomUUID(),
    name,
    chips: STARTING_CHIPS,
    holeCards: [] as Card[],
    currentBet: 0,
    folded: false,
    allIn: false
  }));

  return {
    gameId,
    players,
    communityCards: [] as Card[],
    pot: 0,
    currentBet: 0,
    activePlayerIndex: -1, // No active player until hand is dealt
    phase: 'waiting',
    deck: createDeck(),
    playersActed: [false, false],
    handNumber: 0, // Will be incremented when first hand is dealt
    dealerIndex: 0 // Player 0 starts as dealer
  };
}

/**
 * Deal a new hand - reset game state and deal hole cards
 */
export function dealNewHand(gameState: GameState): GameState {
  const seed = Date.now();
  const shuffledDeck = shuffleDeck(createDeck(), seed);
  
  // For first hand, player 0 is dealer/small blind to match test expectations
  // For subsequent hands, rotate dealer position
  const newDealerIndex = gameState.handNumber === 0 ? 0 : (gameState.dealerIndex + 1) % 2;
  
  // Reset players
  const players = gameState.players.map(player => ({
    ...player,
    holeCards: [] as Card[],
    currentBet: 0,
    folded: false,
    allIn: false
  }));

  // Deal hole cards (2 per player)
  const { drawnCards, remainingDeck } = drawCards(shuffledDeck, 4);
  players[0]!.holeCards = [drawnCards[0]!, drawnCards[1]!];
  players[1]!.holeCards = [drawnCards[2]!, drawnCards[3]!];

  // In heads-up poker, dealer is small blind, non-dealer is big blind
  const smallBlindIndex = newDealerIndex;
  const bigBlindIndex = (newDealerIndex + 1) % 2;
  
  // Post blinds
  players[smallBlindIndex].currentBet = SMALL_BLIND;
  players[smallBlindIndex].chips -= SMALL_BLIND;
  players[bigBlindIndex].currentBet = BIG_BLIND;
  players[bigBlindIndex].chips -= BIG_BLIND;

  return {
    ...gameState,
    players,
    communityCards: [] as Card[],
    pot: SMALL_BLIND + BIG_BLIND,
    currentBet: BIG_BLIND,
    activePlayerIndex: smallBlindIndex, // Small blind (dealer) acts first preflop
    phase: 'preflop',
    winner: undefined,
    winnerReason: undefined,
    deck: remainingDeck,
    playersActed: [false, false], // Reset for new hand
    handNumber: gameState.handNumber + 1, // Increment hand number
    dealerIndex: newDealerIndex // Update dealer position
  };
}

/**
 * Execute a player action
 */
export function executePlayerAction(
  gameState: GameState,
  playerId: string,
  action: 'fold' | 'call' | 'raise',
  amount?: number
): PlayerActionResult {
  // Find player
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, gameState, error: 'Player not found' };
  }

  const player = gameState.players[playerIndex];

  // Validate game state first
  if (gameState.phase === 'complete') {
    return { success: false, gameState, error: 'Hand is complete' };
  }

  if (gameState.phase === 'waiting') {
    return { success: false, gameState, error: 'Hand has not been dealt yet' };
  }

  // Validate turn
  if (gameState.activePlayerIndex !== playerIndex) {
    return { success: false, gameState, error: 'not your turn' };
  }

  // Validate player can act
  if (player.folded) {
    return { success: false, gameState, error: 'Player already folded' };
  }

  // Create new state
  const newState = { ...gameState };
  newState.players = [...gameState.players];
  newState.players[playerIndex] = { ...player };

  // Execute action
  switch (action) {
    case 'fold':
      return executeFold(newState, playerIndex);
    case 'call':
      return executeCall(newState, playerIndex);
    case 'raise':
      return executeRaise(newState, playerIndex, amount);
    default:
      return { success: false, gameState, error: 'Invalid action' };
  }
}

/**
 * Execute fold action
 */
function executeFold(gameState: GameState, playerIndex: number): PlayerActionResult {
  const player = gameState.players[playerIndex];
  player.folded = true;
  
  // Mark player as having acted
  gameState.playersActed[playerIndex] = true;

  // Check if opponent folded - if so, they win
  const opponent = gameState.players[1 - playerIndex];
  if (!opponent.folded) {
    opponent.chips += gameState.pot;
    gameState.winner = 1 - playerIndex;
    gameState.winnerReason = 'opponent folded';
    
    // Reset betting state after completion
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.players.forEach(p => p.currentBet = 0);
    
    gameState.phase = 'complete';
  } else {
    // Move to next player if game continues
    gameState.activePlayerIndex = getNextActivePlayer(gameState, playerIndex);
  }

  return { success: true, gameState };
}

/**
 * Execute call action
 */
function executeCall(gameState: GameState, playerIndex: number): PlayerActionResult {
  const player = gameState.players[playerIndex];
  const callAmount = gameState.currentBet - player.currentBet;

  // Mark player as having acted
  gameState.playersActed[playerIndex] = true;

  // Check if player has enough chips
  if (callAmount >= player.chips) {
    // All-in (when call amount equals or exceeds remaining chips)
    gameState.pot += player.chips;
    player.currentBet += player.chips;
    player.chips = 0;
    player.allIn = true;
  } else {
    // Regular call
    player.chips -= callAmount;
    player.currentBet += callAmount;
    gameState.pot += callAmount;
  }

  // Check if betting round is complete
  const result = checkBettingRoundComplete(gameState);
  if (result.bettingComplete) {
    advancePhase(gameState);
    // Check if all players are all-in and auto-advance if needed
    autoAdvanceIfAllIn(gameState);
  } else {
    // Move to next player
    gameState.activePlayerIndex = getNextActivePlayer(gameState, playerIndex);
  }

  return { success: true, gameState };
}

/**
 * Execute raise action
 */
function executeRaise(gameState: GameState, playerIndex: number, amount?: number): PlayerActionResult {
  if (amount === undefined) {
    return { success: false, gameState, error: 'Raise amount required' };
  }

  // Validate raise amount is positive and meaningful
  if (amount <= 0) {
    return { success: false, gameState, error: 'Raise amount must be positive' };
  }

  const player = gameState.players[playerIndex];
  
  // Basic validation: can't raise to less than current bet
  if (amount <= gameState.currentBet) {
    return { success: false, gameState, error: 'Raise must be higher than current bet' };
  }
  
  // Mark player as having acted
  gameState.playersActed[playerIndex] = true;
  
  // Total amount to put in pot for this raise
  let totalAmountNeeded = amount - player.currentBet;
  let finalAmount = amount;
  
  // Check if player has enough chips for this raise - if not, treat as all-in
  if (totalAmountNeeded > player.chips) {
    // Treat as all-in instead of rejecting
    finalAmount = player.currentBet + player.chips;
    totalAmountNeeded = player.chips;
  }
  
  // Check if this is actually a raise or just a call/all-in that doesn't raise the bet
  const isActualRaise = finalAmount > gameState.currentBet;
  
  // If it's an actual raise, check minimum raise amount
  if (isActualRaise) {
    const minRaise = gameState.currentBet > 0 ? gameState.currentBet * 2 : BIG_BLIND;
    if (finalAmount < minRaise) {
      return { success: false, gameState, error: `Minimum raise is $${minRaise}` };
    }
  }
  
  // Handle all-in scenario
  if (totalAmountNeeded === player.chips) {
    // Player goes all-in
    gameState.pot += player.chips;
    player.currentBet += player.chips;
    if (isActualRaise) {
      gameState.currentBet = player.currentBet;
    }
    player.chips = 0;
    player.allIn = true;
  } else {
    // Regular raise
    player.chips -= totalAmountNeeded;
    gameState.pot += totalAmountNeeded;
    player.currentBet = finalAmount;
    gameState.currentBet = finalAmount;
  }

  // Only reset other players' acted status if this was an actual raise
  if (isActualRaise) {
    for (let i = 0; i < gameState.playersActed.length; i++) {
      if (i !== playerIndex) {
        gameState.playersActed[i] = false;
      }
    }
  }

  // Move to next player
  gameState.activePlayerIndex = getNextActivePlayer(gameState, playerIndex);

  // Check if all players are all-in and auto-advance if needed
  autoAdvanceIfAllIn(gameState);

  return { success: true, gameState };
}

/**
 * Check if betting round is complete
 */
function checkBettingRoundComplete(gameState: GameState): { bettingComplete: boolean } {
  const activePlayers = gameState.players.filter(p => !p.folded);
  
  // If only one player left, betting is complete
  if (activePlayers.length <= 1) {
    return { bettingComplete: true };
  }

  // Check if all active players have matched the current bet or are all-in
  const allMatched = activePlayers.every(p => 
    p.currentBet === gameState.currentBet || p.allIn
  );

  // For preflop, both players must have acted (except if one folded)
  if (gameState.phase === 'preflop') {
    // Find dealer index to determine which player is which
    const smallBlindIndex = gameState.dealerIndex;
    const bigBlindIndex = (gameState.dealerIndex + 1) % 2;
    
    // Both players must have acted for round to be complete
    const smallBlindActed = gameState.playersActed[smallBlindIndex] || gameState.players[smallBlindIndex].folded;
    const bigBlindActed = gameState.playersActed[bigBlindIndex] || gameState.players[bigBlindIndex].folded;
    
    // Round is complete when both have acted and bets are matched
    if (smallBlindActed && bigBlindActed && allMatched) {
      return { bettingComplete: true };
    }
    
    return { bettingComplete: false };
  }

  // For post-flop rounds, all players must have acted and have matching bets
  const allActivePlayersActed = activePlayers.every((p) => {
    const playerIndex = gameState.players.findIndex(player => player.id === p.id);
    return gameState.playersActed[playerIndex] || p.allIn;
  });

  return { bettingComplete: allActivePlayersActed && allMatched };
}

/**
 * Get next active player index
 */
function getNextActivePlayer(gameState: GameState, currentIndex: number): number {
  // Check if there are any active players who can still act
  const hasActivePlayer = gameState.players.some(p => !p.folded && !p.allIn);
  if (!hasActivePlayer) {
    // No active players, return current index (betting round should end)
    return currentIndex;
  }
  
  const nextIndex = (currentIndex + 1) % gameState.players.length;
  const nextPlayer = gameState.players[nextIndex];
  
  if (nextPlayer.folded || nextPlayer.allIn) {
    return getNextActivePlayer(gameState, nextIndex);
  }
  
  return nextIndex;
}

/**
 * Advance to next phase
 */
function advancePhase(gameState: GameState): void {
  // Reset betting for next round
  gameState.players.forEach(p => p.currentBet = 0);
  gameState.currentBet = 0;
  
  // Reset players acted for new betting round
  gameState.playersActed = gameState.playersActed.map(() => false);

  switch (gameState.phase) {
    case 'preflop':
      dealFlop(gameState);
      gameState.phase = 'flop';
      break;
    case 'flop':
      dealTurn(gameState);
      gameState.phase = 'turn';
      break;
    case 'turn':
      dealRiver(gameState);
      gameState.phase = 'river';
      break;
    case 'river':
      gameState.phase = 'showdown';
      // Automatically determine winner at showdown
      determineWinner(gameState);
      break;
    case 'showdown':
      gameState.phase = 'complete';
      break;
  }

  // Set active player (big blind acts first post-flop)
  if (gameState.phase !== 'complete' && gameState.phase !== 'showdown') {
    gameState.activePlayerIndex = getFirstToActPostFlop(gameState);
  }
}

/**
 * Check if all remaining players are all-in and auto-advance to showdown
 */
function autoAdvanceIfAllIn(gameState: GameState): void {
  const activePlayers = gameState.players.filter(p => !p.folded);
  const allPlayersAllIn = activePlayers.every(p => p.allIn);
  
  if (allPlayersAllIn && gameState.phase !== 'complete' && gameState.phase !== 'showdown') {
    // Auto-advance through all remaining phases since no more betting is possible
    // Auto-advance through all remaining phases since no more betting is possible
    if (gameState.phase === 'preflop') {
      dealFlop(gameState);
      gameState.phase = 'flop';
    }
    if (gameState.phase === 'flop') {
      dealTurn(gameState);
      gameState.phase = 'turn';
    }
    if (gameState.phase === 'turn') {
      dealRiver(gameState);
      gameState.phase = 'river';
    }
    if (gameState.phase === 'river') {
      gameState.phase = 'showdown';
      determineWinner(gameState);
    }
  }
}

/**
 * Deal the flop (3 community cards)
 */
function dealFlop(gameState: GameState): void {
  const { drawnCards, remainingDeck } = drawCards(gameState.deck, 3);
  gameState.communityCards = drawnCards;
  gameState.deck = remainingDeck;
}

/**
 * Deal the turn (1 community card)
 */
function dealTurn(gameState: GameState): void {
  const { drawnCards, remainingDeck } = drawCards(gameState.deck, 1);
  gameState.communityCards.push(drawnCards[0]);
  gameState.deck = remainingDeck;
}

/**
 * Deal the river (1 community card)
 */
function dealRiver(gameState: GameState): void {
  const { drawnCards, remainingDeck } = drawCards(gameState.deck, 1);
  gameState.communityCards.push(drawnCards[0]);
  gameState.deck = remainingDeck;
}

/**
 * Get first player to act post-flop (big blind position)
 */
function getFirstToActPostFlop(gameState: GameState): number {
  // In heads-up, big blind (non-dealer) acts first post-flop
  const bigBlindIndex = (gameState.dealerIndex + 1) % 2;
  
  // If big blind can act, they go first
  if (!gameState.players[bigBlindIndex].folded && !gameState.players[bigBlindIndex].allIn) {
    return bigBlindIndex;
  }
  
  // Otherwise, the small blind (dealer) acts
  const smallBlindIndex = gameState.dealerIndex;
  if (!gameState.players[smallBlindIndex].folded && !gameState.players[smallBlindIndex].allIn) {
    return smallBlindIndex;
  }
  
  return bigBlindIndex; // Fallback
}

/**
 * Determine winner at showdown
 */
export function determineWinner(gameState: GameState): void {
  const activePlayers = gameState.players.filter(p => !p.folded);
  
  if (activePlayers.length === 1) {
    const winnerIndex = gameState.players.findIndex(p => !p.folded);
    gameState.winner = winnerIndex;
    gameState.winnerReason = 'opponent folded';
    gameState.players[winnerIndex].chips += gameState.pot;
    
    // Reset betting state after completion
    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.players.forEach(p => p.currentBet = 0);
    
    gameState.phase = 'complete';
    return;
  }

  // Evaluate hands
  const handEvaluations = activePlayers.map(player => {
    try {
      const allCards = [...player.holeCards, ...gameState.communityCards];
      const cardStrings = allCards.map(card => cardToString(card));
      return evaluateHand(cardStrings);
    } catch (error) {
      console.error(`Error evaluating hand for player ${player.name}:`, error);
      return undefined;
    }
  });

  // Find best hand
  const validEvaluations = handEvaluations.filter(e => e !== undefined);
  
  if (validEvaluations.length === 0) {
    return;
  }
  
  // In poker hand evaluation, lower handStrength values are better (0 = royal flush)
  const bestHandValue = Math.min(...validEvaluations.map(evaluation => evaluation.handStrength));
  const winners = activePlayers.filter((_, index) => 
    handEvaluations[index] && handEvaluations[index].handStrength === bestHandValue
  );

  if (winners.length === 1) {
    // Single winner
    const winnerIndex = gameState.players.findIndex(p => p.id === winners[0].id);
    gameState.winner = winnerIndex;
    gameState.winnerReason = 'best hand';
    gameState.players[winnerIndex].chips += gameState.pot;
  } else {
    // Split pot
    const potShare = Math.floor(gameState.pot / winners.length);
    winners.forEach(winner => {
      const winnerIndex = gameState.players.findIndex(p => p.id === winner.id);
      gameState.players[winnerIndex].chips += potShare;
    });
    gameState.winnerReason = 'split pot';
  }

  // Reset betting state after completion
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.players.forEach(p => p.currentBet = 0);

  gameState.phase = 'complete';
}

/**
 * Start a new hand after the current one is complete
 */
export function startNewHand(gameState: GameState): GameState {
  if (gameState.phase !== 'complete') {
    throw new Error('Cannot start new hand: current hand is not complete');
  }

  // Check if players have enough chips to continue
  const playersWithChips = gameState.players.filter(p => p.chips >= BIG_BLIND);
  if (playersWithChips.length < 2) {
    throw new Error('Not enough players have chips to continue');
  }

  // Reset game state and automatically deal new hand
  const resetState = {
    ...gameState,
    communityCards: [] as Card[],
    pot: 0,
    currentBet: 0,
    activePlayerIndex: -1,
    phase: 'waiting' as const,
    winner: undefined,
    winnerReason: undefined,
    deck: createDeck(),
    playersActed: [false, false],
    players: gameState.players.map(player => ({
      ...player,
      holeCards: [] as Card[],
      currentBet: 0,
      folded: false,
      allIn: false
    }))
  };

  // Automatically deal the new hand
  return dealNewHand(resetState);
}