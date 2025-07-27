import { NextRequest, NextResponse } from 'next/server'
import { gameStore } from '../../../../../lib/game-store'
import { gamePersistenceService } from '../../../../../lib/persistence-service'

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

    // Get current game state from memory
    const gameState = gameStore.get(gameId)
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Parse request body for options (future use)
    // const body = await request.json().catch(() => ({}))
    // const { forceOverwrite } = body

    try {
      // Persist the game state
      const result = await gamePersistenceService.persistGame(gameId, gameState)
      
      return NextResponse.json({
        success: true,
        persistedAt: result.persistedAt,
        version: result.version,
        gameId: result.gameId
      })
    } catch (persistError) {
      console.error('Persistence failed:', persistError)
      
      // Return error but don't fail the game
      return NextResponse.json(
        { 
          error: 'Persistence failed', 
          details: persistError instanceof Error ? persistError.message : 'Unknown error',
          // Game continues in memory even if persistence fails
          gameState: gameState
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Persist endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Cleanup persisted game data
    const cleaned = await gamePersistenceService.cleanupGame(gameId)
    
    return NextResponse.json({
      success: cleaned,
      gameId: gameId
    })
  } catch (error) {
    console.error('Cleanup endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}