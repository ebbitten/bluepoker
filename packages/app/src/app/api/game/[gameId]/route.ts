import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '../../../../lib/game-store';
import { withAuth } from '../../../../lib/auth-middleware';

export const GET = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ gameId: string }> }
) => {
  try {
    const { gameId } = await params;

    const gameState = gameStore.get(gameId);
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Verify that the authenticated user is a player in this game
    const userPlayer = gameState.players.find(p => p.name === user.username);
    if (!userPlayer) {
      return NextResponse.json(
        { error: 'You are not a player in this game' },
        { status: 403 }
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
});