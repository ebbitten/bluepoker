import { NextRequest, NextResponse } from 'next/server';
import { executePlayerAction } from '@bluepoker/shared';
import { gameStore } from '../../../../../lib/game-store';
import { broadcaster } from '../../../../../lib/event-broadcaster';
import { withAuth, verifyGameAction } from '../../../../../lib/auth-middleware';

export const POST = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ gameId: string }> }
) => {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId, action, amount } = body;

    const gameState = gameStore.get(gameId);
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!playerId || !action) {
      return NextResponse.json(
        { error: 'playerId and action are required' },
        { status: 400 }
      );
    }

    // Verify that the authenticated user is authorized to perform this action
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.name !== user.username) {
      return NextResponse.json(
        { error: 'You can only perform actions for your own player' },
        { status: 403 }
      );
    }

    // Additional game action verification
    const isAuthorized = await verifyGameAction(gameId, user.id, action);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You are not authorized to perform this action' },
        { status: 403 }
      );
    }

    // Validate action type
    if (!['fold', 'call', 'raise'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Validate raise amount
    if (action === 'raise' && (amount === undefined || amount === null)) {
      return NextResponse.json(
        { success: false, error: 'amount required' },
        { status: 400 }
      );
    }

    // Execute player action
    const result = executePlayerAction(gameState, playerId, action, amount);
    
    if (result.success) {
      // Update stored game state
      gameStore.set(gameId, result.gameState);

      // Broadcast game state update to SSE connections
      broadcaster.broadcast(gameId, {
        type: 'gameStateUpdate',
        data: result.gameState
      });

      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error executing player action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});