import { NextRequest, NextResponse } from 'next/server';
import { dealNewHand } from '@bluepoker/shared';
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

    // Deal new hand
    const newGameState = dealNewHand(gameState);
    
    // Update stored game state
    gameStore.set(gameId, newGameState);

    // Broadcast game state update to SSE connections
    broadcaster.broadcast(gameId, {
      type: 'gameStateUpdate',
      data: newGameState
    });

    return NextResponse.json(newGameState);
  } catch (error) {
    console.error('Error dealing new hand:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});