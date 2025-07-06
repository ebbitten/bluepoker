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
}

export interface GameState {
  gameId: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  activePlayerIndex: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';
  winner?: number;
  winnerReason?: string;
  deck: Card[];
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
    activePlayerIndex: 0,
    phase: 'preflop',
    deck: createDeck()
  };
}

/**
 * Deal a new hand - reset game state and deal hole cards
 */
export function dealNewHand(gameState: GameState): GameState {
  const seed = Date.now();
  const shuffledDeck = shuffleDeck(createDeck(), seed);
  
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

  // Post blinds
  players[0].currentBet = SMALL_BLIND;
  players[0].chips -= SMALL_BLIND;
  players[1].currentBet = BIG_BLIND;
  players[1].chips -= BIG_BLIND;

  return {
    ...gameState,
    players,
    communityCards: [] as Card[],
    pot: SMALL_BLIND + BIG_BLIND,
    currentBet: BIG_BLIND,
    activePlayerIndex: 0, // Small blind acts first preflop
    phase: 'preflop',
    winner: undefined,
    winnerReason: undefined,
    deck: remainingDeck
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

  // Validate turn
  if (gameState.activePlayerIndex !== playerIndex) {
    return { success: false, gameState, error: 'not your turn' };
  }

  // Validate player can act
  if (player.folded) {
    return { success: false, gameState, error: 'Player already folded' };
  }

  if (gameState.phase === 'complete') {
    return { success: false, gameState, error: 'Hand is complete' };
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

  // Check if opponent folded - if so, they win
  const opponent = gameState.players[1 - playerIndex];
  if (!opponent.folded) {
    opponent.chips += gameState.pot;
    gameState.winner = 1 - playerIndex;
    gameState.winnerReason = 'opponent folded';
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

  // Check if player has enough chips
  if (callAmount > player.chips) {
    // All-in
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

  const player = gameState.players[playerIndex];
  
  // Check minimum raise (must be at least current bet + big blind, or double current bet if current bet > 0)
  const minRaise = gameState.currentBet > 0 ? gameState.currentBet * 2 : BIG_BLIND;
  if (amount < minRaise) {
    return { success: false, gameState, error: 'minimum raise' };
  }

  // Total amount to put in pot for this raise
  let totalAmountNeeded = amount - player.currentBet;
  let finalAmount = amount;
  
  // Check if player has enough chips for this raise - if not, treat as all-in
  if (totalAmountNeeded > player.chips) {
    // Treat as all-in instead of rejecting
    finalAmount = player.currentBet + player.chips;
    totalAmountNeeded = player.chips;
  }
  
  // Handle all-in scenario
  if (totalAmountNeeded === player.chips) {
    // Player goes all-in
    gameState.pot += player.chips;
    player.currentBet += player.chips;
    gameState.currentBet = Math.max(gameState.currentBet, player.currentBet);
    player.chips = 0;
    player.allIn = true;
  } else {
    // Regular raise
    player.chips -= totalAmountNeeded;
    gameState.pot += totalAmountNeeded;
    player.currentBet = finalAmount;
    gameState.currentBet = finalAmount;
  }

  // Move to next player
  gameState.activePlayerIndex = getNextActivePlayer(gameState, playerIndex);

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

  // For preflop, small blind must have acted to match big blind
  if (gameState.phase === 'preflop') {
    const smallBlind = gameState.players[0];
    // Small blind has acted if they called/raised or folded
    const smallBlindActed = smallBlind.currentBet >= BIG_BLIND || smallBlind.folded;
    return { bettingComplete: smallBlindActed && allMatched };
  }

  return { bettingComplete: allMatched };
}

/**
 * Get next active player index
 */
function getNextActivePlayer(gameState: GameState, currentIndex: number): number {
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
  // Big blind is player 1, but if they folded, go to next active player
  if (!gameState.players[1].folded && !gameState.players[1].allIn) {
    return 1;
  }
  if (!gameState.players[0].folded && !gameState.players[0].allIn) {
    return 0;
  }
  return 0; // Fallback
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

  gameState.phase = 'complete';
}