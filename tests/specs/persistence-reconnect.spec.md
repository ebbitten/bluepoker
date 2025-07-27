# Persistence & Reconnect System

## Purpose
Enable durable game state storage and reconnection flows so that games survive server restarts and players can seamlessly reconnect to ongoing games, maintaining their position and game state.

## API Contract

### Endpoints
- `POST /api/game/:gameId/persist` - Persist current game state to durable storage
- `GET /api/game/:gameId/restore` - Restore game state from durable storage
- `POST /api/game/:gameId/reconnect` - Player reconnection with token validation
- `GET /api/game/:gameId/connection-token` - Generate reconnection token for player
- `DELETE /api/game/:gameId/persist` - Clean up persisted game data after completion

### Request/Response Format
```typescript
// Persist Request
interface PersistGameRequest {
  gameId: string;
  forceOverwrite?: boolean;
}

// Persist Response
interface PersistGameResponse {
  success: boolean;
  persistedAt: string; // ISO timestamp
  version: number;
}

// Reconnect Request
interface ReconnectRequest {
  gameId: string;
  playerId: string;
  reconnectToken: string;
}

// Reconnect Response
interface ReconnectResponse {
  success: boolean;
  gameState: GameState;
  reconnectedAt: string;
  missedEvents?: GameEvent[];
}

// Connection Token Response
interface ConnectionTokenResponse {
  token: string;
  expiresAt: string;
  playerId: string;
}
```

## Behavior Specification

### Happy Path
1. Game is running normally with in-memory state
2. Game state is automatically persisted at key moments (after each action, phase change)
3. If server restarts, game state can be restored from persistence layer
4. Players attempting to access game receive reconnection flow
5. Players use connection tokens to resume their seat in the game
6. Game continues seamlessly from where it left off

### Error Conditions
- **Persistence Failure**: When storage is unavailable, continue with in-memory state and retry
- **Restore Failure**: When persisted state is corrupted, return clear error message
- **Invalid Token**: When reconnection token is invalid/expired, require new game creation
- **Player Conflict**: When multiple players try to claim same seat, first wins
- **Storage Full**: When persistence storage is full, clean up old games first

### Edge Cases
- Server restart during critical game action (mid-betting round)
- Multiple concurrent reconnection attempts
- Persistence layer temporarily unavailable
- Very old persisted games (cleanup policy)
- Player tries to reconnect to completed game

## Acceptance Criteria

### Must Have
- [ ] Games survive server restart with complete state preservation
- [ ] Players can reconnect within 2 seconds of server restart
- [ ] All game state is accurately restored (cards, chips, phase, actions)
- [ ] Reconnection tokens prevent unauthorized access
- [ ] Automatic persistence at key game moments
- [ ] Clean error messages for failed reconnections

### Should Have
- [ ] Missed events replay for players who were disconnected
- [ ] Graceful degradation when persistence is unavailable
- [ ] Old game cleanup to prevent storage bloat
- [ ] Performance impact < 10ms per game action

### Could Have
- [ ] Game state versioning for rollback capability
- [ ] Persistence analytics and monitoring
- [ ] Configurable persistence intervals
- [ ] Cross-server game migration

## Test Scenarios

### Unit Tests
- Game state serialization/deserialization
- Reconnection token generation and validation
- Persistence layer error handling
- Game state restoration logic
- Event replay functionality

### Integration Tests
- End-to-end persistence workflow
- Database operations under load
- Concurrent reconnection attempts
- Persistence failure recovery
- Token expiration handling

### End-to-End Tests
- **Critical Test**: Kill server mid-hand, restart, clients resume within 2s
- Player reconnects after network interruption
- Multiple players reconnect simultaneously
- Game completion triggers cleanup
- Invalid reconnection attempts are rejected

## Performance Requirements
- Game state persistence: < 50ms per operation
- Game state restoration: < 100ms
- Reconnection flow: < 500ms total
- Storage overhead: < 1KB per game state
- Cleanup operations: < 1s per old game

## Security Considerations
- Reconnection tokens expire after reasonable time (30 minutes)
- Tokens are cryptographically secure (UUID v4 minimum)
- Player can only reconnect to games they participated in
- Persisted data is stored securely
- No sensitive data in connection tokens

## Dependencies
- Existing game state management system
- Database/storage layer (PostgreSQL via Supabase)
- Current SSE real-time system
- Player authentication from existing system
- Event broadcasting system

## Implementation Notes

### Key Technical Decisions
- Use PostgreSQL for persistence (leveraging existing Supabase setup)
- Store game state as JSONB for flexibility and querying
- Implement automatic persistence triggers on game state changes
- Use time-based token expiration for security
- Keep in-memory state as primary, persistence as backup

### Architectural Considerations
- Persistence should be non-blocking to game performance
- Restore operation should validate state integrity
- Event sourcing approach for reliable state reconstruction
- Connection tokens stored separately from game state
- Cleanup jobs run periodically to manage storage

### Known Limitations
- Initial implementation supports single-server deployment only
- No real-time persistence sync (eventual consistency acceptable)
- Reconnection requires player to know game URL
- Limited to PostgreSQL storage backend

## Migration Strategy
- Existing games continue to work with in-memory state
- New games automatically get persistence capability
- Gradual rollout with feature flag support
- Backward compatibility with current real-time system