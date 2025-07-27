import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@bluepoker/shared';
import { randomUUID } from 'crypto';
import { gameStore } from '../../../../lib/game-store';
import { withAuth } from '../../../../lib/auth-middleware';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { playerNames } = body;

    // Validate input
    if (!playerNames || !Array.isArray(playerNames) || playerNames.length !== 2) {
      return NextResponse.json(
        { error: 'Two player names required' },
        { status: 400 }
      );
    }

    if (playerNames.some(name => !name || typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Player names cannot be empty' },
        { status: 400 }
      );
    }

    // Verify that the authenticated user is one of the players
    if (!playerNames.includes(user.username)) {
      return NextResponse.json(
        { error: 'You can only create games where you are a player' },
        { status: 403 }
      );
    }

    // Create new game
    const gameId = randomUUID();
    const gameState = createGame(gameId, playerNames as [string, string]);
    
    // Add user IDs to players for authentication
    gameState.players.forEach(player => {
      if (player.name === user.username) {
        player.userId = user.id;
      }
    });
    
    // Store game
    gameStore.set(gameId, gameState);

    return NextResponse.json({
      gameId,
      gameState
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});