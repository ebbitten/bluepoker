import { NextRequest, NextResponse } from 'next/server'
import { gameStore } from '../../../../../lib/game-store'
import { reconnectionService } from '../../../../../lib/persistence-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { playerId, reconnectToken } = body
    
    if (!playerId || !reconnectToken) {
      return NextResponse.json(
        { error: 'Player ID and reconnect token are required' },
        { status: 400 }
      )
    }

    try {
      // Handle the reconnection
      const gameState = await reconnectionService.handleReconnection(
        gameId,
        playerId,
        reconnectToken
      )

      // Restore game to memory if it's not already there
      if (!gameStore.has(gameId)) {
        gameStore.set(gameId, gameState)
      }

      // TODO: Could add missed events replay here
      const missedEvents: any[] = []

      const reconnectedAt = new Date().toISOString()

      return NextResponse.json({
        success: true,
        gameState,
        reconnectedAt,
        missedEvents,
        playerId
      })
    } catch (reconnectionError) {
      console.error('Reconnection failed:', reconnectionError)
      
      if (reconnectionError instanceof Error) {
        if (reconnectionError.message.includes('Invalid reconnection token')) {
          return NextResponse.json(
            { error: 'Invalid or expired reconnection token' },
            { status: 401 }
          )
        }
        
        if (reconnectionError.message.includes('Game not found')) {
          return NextResponse.json(
            { error: 'Game not found or could not be restored' },
            { status: 404 }
          )
        }
        
        if (reconnectionError.message.includes('Player not found')) {
          return NextResponse.json(
            { error: 'Player not found in this game' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json(
        { error: 'Reconnection failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Reconnect endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}