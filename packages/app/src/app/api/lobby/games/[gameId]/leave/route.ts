/**
 * Leave Lobby Game API  
 * DELETE /api/lobby/games/:gameId/leave - Leave a lobby game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLobbyManager } from '@bluepoker/shared';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId } = body;

    // Validation
    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    const lobbyManager = getLobbyManager();
    
    // Check if game exists
    const game = lobbyManager.getGame(gameId);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Attempt to leave the game
    const result = lobbyManager.leaveGame(gameId, playerId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get updated game state
    const updatedGame = lobbyManager.getGame(gameId);
    
    return NextResponse.json({
      success: true,
      gameState: updatedGame
    });

  } catch (error) {
    console.error('Error leaving lobby game:', error);
    return NextResponse.json(
      { error: 'Failed to leave game' },
      { status: 500 }
    );
  }
}