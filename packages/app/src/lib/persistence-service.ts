/**
 * Game Persistence Service
 * Handles durable storage of game states using PostgreSQL via Supabase
 */

import { GameState } from '@bluepoker/shared'
import { createClient } from '@supabase/supabase-js'

// Database types for persistence (future use)
// interface PersistedGameData {
//   id: string
//   game_id: string
//   game_state: GameState
//   persisted_at: string
//   version: number
//   created_at: string
//   updated_at: string
// }

// interface ReconnectionToken {
//   id: string
//   token: string
//   game_id: string
//   player_id: string
//   expires_at: string
//   created_at: string
// }

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Persistence will be disabled.')
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export class GamePersistenceService {
  private isAvailable(): boolean {
    return supabase !== null
  }

  async persistGame(gameId: string, gameState: GameState): Promise<{
    gameId: string
    gameState: GameState
    persistedAt: string
    version: number
  }> {
    if (!this.isAvailable()) {
      throw new Error('Persistence service unavailable')
    }

    try {
      // Check if game already exists to determine version
      const { data: existing, error: fetchError } = await supabase!
        .from('persisted_games')
        .select('version')
        .eq('game_id', gameId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Failed to check existing game: ${fetchError.message}`)
      }

      const version = existing ? existing.version + 1 : 1
      const persistedAt = new Date().toISOString()

      // Upsert game state
      const { error } = await supabase!
        .from('persisted_games')
        .upsert({
          game_id: gameId,
          game_state: gameState,
          persisted_at: persistedAt,
          version: version,
          updated_at: persistedAt
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to persist game: ${error.message}`)
      }

      return {
        gameId,
        gameState,
        persistedAt,
        version
      }
    } catch (error) {
      console.error('Persistence error:', error)
      throw new Error(`Game persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async restoreGame(gameId: string): Promise<GameState | null> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const { data, error } = await supabase!
        .from('persisted_games')
        .select('game_state')
        .eq('game_id', gameId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null
        }
        throw new Error(`Failed to restore game: ${error.message}`)
      }

      // Validate restored state
      const gameState = data.game_state as GameState
      if (!this.validateGameState(gameState)) {
        console.error('Restored game state failed validation:', gameState)
        return null
      }

      return gameState
    } catch (error) {
      console.error('Restoration error:', error)
      return null
    }
  }

  async cleanupGame(gameId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      // Delete persisted game data
      const { error: gameError } = await supabase!
        .from('persisted_games')
        .delete()
        .eq('game_id', gameId)

      // Delete associated reconnection tokens
      const { error: tokenError } = await supabase!
        .from('reconnection_tokens')
        .delete()
        .eq('game_id', gameId)

      if (gameError) {
        console.error('Failed to cleanup game:', gameError)
        return false
      }

      if (tokenError) {
        console.error('Failed to cleanup tokens:', tokenError)
        // Don't fail completely if token cleanup fails
      }

      return true
    } catch (error) {
      console.error('Cleanup error:', error)
      return false
    }
  }

  private validateGameState(gameState: any): gameState is GameState {
    return (
      typeof gameState === 'object' &&
      gameState !== null &&
      typeof gameState.gameId === 'string' &&
      Array.isArray(gameState.players) &&
      gameState.players.length >= 1 &&
      typeof gameState.phase === 'string' &&
      typeof gameState.pot === 'number' &&
      Array.isArray(gameState.communityCards)
    )
  }

  // Auto-persistence trigger for game state changes
  async autoPerist(gameId: string, gameState: GameState): Promise<void> {
    try {
      await this.persistGame(gameId, gameState)
    } catch (error) {
      // Auto-persistence failures should not block game operation
      console.warn('Auto-persistence failed for game', gameId, error)
    }
  }

  // Cleanup old games (called periodically)
  async cleanupOldGames(olderThanDays: number = 7): Promise<number> {
    if (!this.isAvailable()) {
      return 0
    }

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const { data, error } = await supabase!
        .from('persisted_games')
        .delete()
        .lt('updated_at', cutoffDate.toISOString())
        .select('game_id')

      if (error) {
        console.error('Failed to cleanup old games:', error)
        return 0
      }

      const cleanedCount = data?.length || 0
      console.log(`Cleaned up ${cleanedCount} old games`)
      return cleanedCount
    } catch (error) {
      console.error('Old game cleanup error:', error)
      return 0
    }
  }
}

export class ReconnectionService {
  private isAvailable(): boolean {
    return supabase !== null
  }

  generateToken(gameId: string, playerId: string): {
    token: string
    gameId: string
    playerId: string
    expiresAt: string
  } {
    // Generate cryptographically secure token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()
    
    // Set expiration 30 minutes from now
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    return {
      token,
      gameId,
      playerId,
      expiresAt: expiresAt.toISOString()
    }
  }

  async storeToken(tokenData: {
    token: string
    gameId: string
    playerId: string
    expiresAt: string
  }): Promise<boolean> {
    if (!this.isAvailable()) {
      return false
    }

    try {
      const { error } = await supabase!
        .from('reconnection_tokens')
        .insert({
          token: tokenData.token,
          game_id: tokenData.gameId,
          player_id: tokenData.playerId,
          expires_at: tokenData.expiresAt
        })

      if (error) {
        console.error('Failed to store token:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Token storage error:', error)
      return false
    }
  }

  async validateToken(token: string): Promise<{
    valid: boolean
    gameId?: string
    playerId?: string
    expired?: boolean
  }> {
    if (!this.isAvailable()) {
      return { valid: false }
    }

    try {
      const { data, error } = await supabase!
        .from('reconnection_tokens')
        .select('game_id, player_id, expires_at')
        .eq('token', token)
        .single()

      if (error || !data) {
        return { valid: false }
      }

      const now = new Date()
      const expiresAt = new Date(data.expires_at)

      if (now > expiresAt) {
        return { valid: false, expired: true }
      }

      return {
        valid: true,
        gameId: data.game_id,
        playerId: data.player_id
      }
    } catch (error) {
      console.error('Token validation error:', error)
      return { valid: false }
    }
  }

  async handleReconnection(gameId: string, playerId: string, token: string): Promise<GameState> {
    // Validate token
    const validation = await this.validateToken(token)
    if (!validation.valid) {
      throw new Error('Invalid reconnection token')
    }

    if (validation.gameId !== gameId || validation.playerId !== playerId) {
      throw new Error('Token does not match game or player')
    }

    // Restore game state
    const persistenceService = new GamePersistenceService()
    const gameState = await persistenceService.restoreGame(gameId)
    
    if (!gameState) {
      throw new Error('Game not found or could not be restored')
    }

    // Verify player exists in game
    const playerExists = gameState.players.some(p => p.id === playerId)
    if (!playerExists) {
      throw new Error('Player not found in game')
    }

    // Invalidate the used token
    await this.invalidateToken(token)

    return gameState
  }

  async invalidateToken(token: string): Promise<void> {
    if (!this.isAvailable()) {
      return
    }

    try {
      await supabase!
        .from('reconnection_tokens')
        .delete()
        .eq('token', token)
    } catch (error) {
      console.error('Token invalidation error:', error)
    }
  }

  // Cleanup expired tokens
  async cleanupExpiredTokens(): Promise<number> {
    if (!this.isAvailable()) {
      return 0
    }

    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase!
        .from('reconnection_tokens')
        .delete()
        .lt('expires_at', now)
        .select('token')

      if (error) {
        console.error('Failed to cleanup expired tokens:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Token cleanup error:', error)
      return 0
    }
  }
}

// Singleton instances
export const gamePersistenceService = new GamePersistenceService()
export const reconnectionService = new ReconnectionService()