import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '../../../../lib/game-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId');

  if (!gameId) {
    return NextResponse.json({
      error: 'gameId parameter required',
      usage: '/api/debug/validate-game?gameId=<gameId>'
    }, { status: 400 });
  }

  const validation = {
    gameId,
    timestamp: Date.now(),
    exists: false,
    details: {} as Record<string, unknown>,
    issues: [] as string[],
    recommendations: [] as string[]
  };

  // Check if game exists
  const game = gameStore.get(gameId);
  validation.exists = !!game;

  if (!game) {
    validation.issues.push('Game not found in game store');
    validation.recommendations.push('Verify game was created successfully');
    validation.recommendations.push('Check if game expired or was cleaned up');
    
    // Check all games in store
    const allGames = gameStore.size();
    validation.details.totalGamesInStore = allGames;
    if (allGames === 0) {
      validation.issues.push('No games in store at all');
      validation.recommendations.push('Server may have restarted, clearing in-memory storage');
    }
  } else {
    // Include full game state for game page loading
    validation.details = game as unknown as Record<string, unknown>;

    // Validate game structure
    if (game.players.length !== 2) {
      validation.issues.push(`Expected 2 players, found ${game.players.length}`);
    }

    if (!game.players.every(p => p.id && p.name)) {
      validation.issues.push('Players missing required id or name');
    }

    if (game.deck.length + game.communityCards.length + (game.players[0].holeCards.length + game.players[1].holeCards.length) !== 52) {
      validation.issues.push('Card count doesn\'t add up to 52');
    }

    if (validation.issues.length === 0) {
      validation.recommendations.push('Game structure looks valid');
      validation.recommendations.push('SSE endpoint should work with this game');
    }
  }

  return NextResponse.json({
    ...validation,
    status: validation.exists && validation.issues.length === 0 ? 'valid' : 'invalid'
  });
}