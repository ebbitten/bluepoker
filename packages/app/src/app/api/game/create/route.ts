import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@bluepoker/shared';
import { randomUUID } from 'crypto';
import { gameStore } from '../../../../lib/game-store';

export async function POST(request: NextRequest) {
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

    // Create new game
    const gameId = randomUUID();
    const gameState = createGame(gameId, playerNames as [string, string]);
    
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
}