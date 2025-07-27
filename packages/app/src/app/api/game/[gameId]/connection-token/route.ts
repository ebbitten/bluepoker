import { NextRequest, NextResponse } from 'next/server'
import { gameStore } from '../../../../../lib/game-store'
import { reconnectionService } from '../../../../../lib/persistence-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }
    
    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Check if game exists
    const gameState = gameStore.get(gameId)
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Check if player exists in the game
    const player = gameState.players.find(p => p.id === playerId)
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found in this game' },
        { status: 404 }
      )
    }

    // Generate connection token
    const tokenData = reconnectionService.generateToken(gameId, playerId)
    
    // Store token in database
    const stored = await reconnectionService.storeToken(tokenData)
    if (!stored) {
      return NextResponse.json(
        { error: 'Failed to generate connection token' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token: tokenData.token,
      playerId: tokenData.playerId,
      expiresAt: tokenData.expiresAt,
      gameId: tokenData.gameId
    })
  } catch (error) {
    console.error('Connection token endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}