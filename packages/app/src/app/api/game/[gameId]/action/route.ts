import { NextRequest, NextResponse } from 'next/server';
import { executePlayerAction } from '@bluepoker/shared';
import { gameStore } from '../../../../../lib/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
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
}