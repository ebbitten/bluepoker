/**
 * Lobby Games API
 * GET /api/lobby/games - List all lobby games
 * POST /api/lobby/games - Create new lobby game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLobbyManager, createGame } from '@bluepoker/shared';
import { gameStore } from '../../../../lib/game-store';

export async function GET(request: NextRequest) {
  try {
    const lobbyManager = getLobbyManager();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as 'waiting' | 'playing' | 'finished' | null;

    let games = lobbyManager.getGames();
    
    // Filter by status if provided
    if (statusFilter) {
      games = games.filter(game => game.status === statusFilter);
    }

    // Sort by creation time (newest first)
    games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response = {
      games,
      totalGames: lobbyManager.getTotalGames(),
      activePlayers: lobbyManager.getPlayerCount()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching lobby games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lobby games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, maxPlayers, gameType, buyIn } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Game name is required' },
        { status: 400 }
      );
    }

    if (!maxPlayers || typeof maxPlayers !== 'number' || maxPlayers < 2 || maxPlayers > 10) {
      return NextResponse.json(
        { error: 'Max players must be between 2 and 10' },
        { status: 400 }
      );
    }

    if (!gameType || !['heads-up', 'multi-table'].includes(gameType)) {
      return NextResponse.json(
        { error: 'Game type must be "heads-up" or "multi-table"' },
        { status: 400 }
      );
    }

    if (buyIn !== undefined && (typeof buyIn !== 'number' || buyIn < 0)) {
      return NextResponse.json(
        { error: 'Buy-in must be a positive number' },
        { status: 400 }
      );
    }

    const lobbyManager = getLobbyManager();
    const game = lobbyManager.createGame(name.trim(), maxPlayers, gameType, buyIn);

    // Immediately create corresponding poker game with placeholder players
    try {
      const placeholderNames: [string, string] = ['Waiting for Player 1', 'Waiting for Player 2'];
      const pokerGameState = createGame(game.gameId, placeholderNames);
      
      // Store the poker game
      gameStore.set(game.gameId, pokerGameState);
      
      console.log(`Created poker game ${game.gameId} with placeholder players`);
    } catch (error) {
      console.error('Failed to create initial poker game:', error);
      // Continue anyway - lobby game creation was successful
    }

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error('Error creating lobby game:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create lobby game' },
      { status: 500 }
    );
  }
}