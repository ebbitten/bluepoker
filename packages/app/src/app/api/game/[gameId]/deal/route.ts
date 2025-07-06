import { NextRequest, NextResponse } from 'next/server';
import { dealNewHand } from '@bluepoker/shared';
import { gameStore } from '../../../../../lib/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;

    const gameState = gameStore.get(gameId);
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Deal new hand
    const newGameState = dealNewHand(gameState);
    
    // Update stored game state
    gameStore.set(gameId, newGameState);

    return NextResponse.json(newGameState);
  } catch (error) {
    console.error('Error dealing new hand:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}