import { NextRequest, NextResponse } from 'next/server';
import { startNewHand } from '@bluepoker/shared';
import { gameStore } from '../../../../../lib/game-store';
import { broadcaster } from '../../../../../lib/event-broadcaster';
import { withAuth } from '../../../../../lib/auth-middleware';

export const POST = withAuth(async (
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

    // Check if current hand is complete
    if (gameState.phase !== 'complete') {
      return NextResponse.json(
        { error: 'Current hand is not complete' },
        { status: 400 }
      );
    }

    // Start new hand
    const newGameState = startNewHand(gameState);
    gameStore.set(gameId, newGameState);

    // Broadcast update to all connected clients
    broadcaster.broadcast(gameId, {
      type: 'gameStateUpdate',
      data: newGameState
    });

    return NextResponse.json(newGameState);
  } catch (error) {
    console.error('Error starting new hand:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to start new hand' },
      { status: 500 }
    );
  }
});