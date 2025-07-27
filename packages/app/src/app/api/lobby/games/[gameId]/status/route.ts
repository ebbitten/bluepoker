/**
 * Game Status API
 * GET /api/lobby/games/:gameId/status - Get detailed game status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLobbyManager } from '@bluepoker/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const lobbyManager = getLobbyManager();
    
    const game = lobbyManager.getGame(gameId);
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(game);

  } catch (error) {
    console.error('Error fetching game status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game status' },
      { status: 500 }
    );
  }
}