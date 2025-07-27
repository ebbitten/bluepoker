/**
 * Join Lobby Game API
 * POST /api/lobby/games/:gameId/join - Join an existing lobby game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLobbyManager, createGame } from '@bluepoker/shared';
import { randomUUID } from 'crypto';
import { gameStore } from '../../../../../../lib/game-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerName } = body;

    // Validation
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    if (playerName.trim().length > 50) {
      return NextResponse.json(
        { error: 'Player name must be 50 characters or less' },
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

    // Generate unique player ID
    const playerId = randomUUID();
    
    // Attempt to join the game
    const result = lobbyManager.joinGame(gameId, playerId, playerName.trim());
    
    if (!result.success) {
      const statusCode = result.error?.includes('full') ? 409 : 
                        result.error?.includes('started') ? 409 : 400;
      
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    // Get updated game state
    const updatedGame = lobbyManager.getGame(gameId);
    
    // Update the poker game with real player names as they join
    if (updatedGame) {
      try {
        // Get existing poker game (should exist from lobby creation)
        const existingPokerGame = gameStore.get(gameId);
        
        if (existingPokerGame) {
          // Update player names in the poker game based on lobby players
          const playerNames: [string, string] = [
            updatedGame.players[0]?.name || 'Waiting for Player 1',
            updatedGame.players[1]?.name || 'Waiting for Player 2'
          ];
          
          // Create updated poker game with real player names
          const updatedPokerGameState = createGame(gameId, playerNames);
          
          // Preserve any existing game state (chips, etc.) if the game has started
          if (existingPokerGame.phase !== 'waiting') {
            // Game has started, preserve state but update player names
            updatedPokerGameState.players[0].name = playerNames[0];
            updatedPokerGameState.players[1].name = playerNames[1];
          }
          
          // Store the updated poker game
          gameStore.set(gameId, updatedPokerGameState);
          
          console.log(`Updated poker game ${gameId} with players:`, playerNames);
        } else {
          console.warn(`No existing poker game found for ${gameId}, this shouldn't happen`);
        }
      } catch (error) {
        console.error('Failed to update poker game:', error);
        // Continue anyway - lobby game join was successful
      }
    }
    
    return NextResponse.json({
      success: true,
      playerId,
      gameState: updatedGame
    });

  } catch (error) {
    console.error('Error joining lobby game:', error);
    return NextResponse.json(
      { error: 'Failed to join game' },
      { status: 500 }
    );
  }
}