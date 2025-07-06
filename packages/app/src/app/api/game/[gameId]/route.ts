import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '../../../../lib/game-store';

export async function GET(
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

    return NextResponse.json(gameState);
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}