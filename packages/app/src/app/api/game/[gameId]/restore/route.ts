import { NextRequest, NextResponse } from 'next/server'
import { gameStore } from '../../../../../lib/game-store'
import { gamePersistenceService } from '../../../../../lib/persistence-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      )
    }

    // First check if game exists in memory (faster)
    const memoryGameState = gameStore.get(gameId)
    if (memoryGameState) {
      return NextResponse.json(memoryGameState)
    }

    // Try to restore from persistence
    const restoredGameState = await gamePersistenceService.restoreGame(gameId)
    
    if (!restoredGameState) {
      return NextResponse.json(
        { error: 'No persisted state found for this game' },
        { status: 404 }
      )
    }

    // Restore to memory for future requests
    gameStore.set(gameId, restoredGameState)
    
    return NextResponse.json(restoredGameState)
  } catch (error) {
    console.error('Restore endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to restore game state' },
      { status: 500 }
    )
  }
}