# Lobby System - Increment 5

## Purpose
Multi-game lobby system that allows players to browse, create, and join poker games. Transforms the app from a single-table demo into a full multiplayer poker platform supporting many concurrent games with player discovery and matchmaking.

## API Contract

### Endpoints
- `GET /api/lobby/games` - List all available games in the lobby
- `POST /api/lobby/games` - Create a new game in the lobby
- `POST /api/lobby/games/:gameId/join` - Join an existing game
- `DELETE /api/lobby/games/:gameId/leave` - Leave a game
- `GET /api/lobby/games/:gameId/status` - Get detailed game status
- `GET /api/lobby/events` - SSE stream for real-time lobby updates

### Request/Response Format
```typescript
// Lobby Game Info
interface LobbyGame {
  gameId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  players: Array<{
    id: string;
    name: string;
    isReady: boolean;
  }>;
  gameType: 'heads-up' | 'multi-table';
  buyIn?: number;
}

// Create Game Request
interface CreateGameRequest {
  name: string;
  maxPlayers: number;
  gameType: 'heads-up' | 'multi-table';
  buyIn?: number;
}

// Join Game Request
interface JoinGameRequest {
  playerName: string;
}

// Lobby List Response
interface LobbyListResponse {
  games: LobbyGame[];
  totalGames: number;
  activePlayers: number;
}

// Lobby Events (SSE)
interface LobbyEvent {
  type: 'gameCreated' | 'gameUpdated' | 'gameRemoved' | 'playerJoined' | 'playerLeft';
  gameId: string;
  data: LobbyGame | { playerId: string; playerName: string };
}
```

## Behavior Specification

### Happy Path
1. Player opens lobby page and sees list of available games
2. Player can create new game with custom settings
3. Player can join existing games with open slots
4. Game starts automatically when minimum players join
5. Players see real-time updates as others join/leave
6. Completed games are removed from lobby automatically

### Error Conditions
- **Game Full**: When trying to join a full game, return 409 error
- **Game Not Found**: When game doesn't exist, return 404 error  
- **Invalid Player Name**: When name is empty/invalid, return 400 error
- **Already In Game**: When player tries to join multiple games, return 409 error
- **Permission Denied**: When trying to join private/started game, return 403 error

### Edge Cases
- Player disconnects while in lobby
- Game fills up exactly as player tries to join
- Network interruption during join process
- Multiple players trying to join last slot simultaneously
- Game creator leaves before game starts

## Acceptance Criteria

### Must Have
- [ ] Display list of all available games with player counts
- [ ] Create new games with customizable settings
- [ ] Join existing games with open slots
- [ ] Real-time updates when players join/leave
- [ ] Automatic game removal when completed
- [ ] Prevent joining full or started games
- [ ] Handle player disconnections gracefully

### Should Have  
- [ ] Game filtering (by status, player count, type)
- [ ] Player readiness system before game starts
- [ ] Lobby chat or messaging
- [ ] Game spectating capability
- [ ] Performance handles 50+ concurrent games

### Could Have
- [ ] Private game creation with passwords
- [ ] Tournament bracket system
- [ ] Player statistics and rankings
- [ ] Game replay system
- [ ] Advanced matchmaking by skill level

## Test Scenarios

### Unit Tests
- Test lobby game creation and validation
- Test player join/leave logic
- Test game status transitions
- Test concurrent player operations
- Test lobby event broadcasting

### Integration Tests  
- Test lobby API endpoints with real database
- Test SSE event streaming for lobby updates
- Test game lifecycle from lobby to completion
- Test player session management
- Test concurrent game operations

### End-to-End Tests
- Test complete lobby browsing workflow
- Test game creation → joining → playing flow
- Test multiple browser tabs with different players
- Test lobby updates in real-time across sessions
- Test error recovery for network issues

## Performance Requirements
- Lobby list response: < 200ms for 100+ games
- Join game operation: < 100ms
- SSE lobby updates: < 50ms latency
- Support 50+ concurrent games with 200+ players
- Memory usage: < 50MB for lobby data

## Security Considerations
- Validate all player names for XSS prevention
- Rate limit game creation (max 5 games per IP per hour)
- Prevent game name injection attacks
- Sanitize all lobby display data
- Session validation for join operations

## Dependencies
- Existing game state management system
- SSE broadcasting infrastructure  
- Player session management
- Game store for active games
- UI components for lobby interface

## Implementation Notes
- Extend existing gameStore to include lobby metadata
- Reuse SSE broadcaster for lobby events
- Lobby games transition to regular games when started
- Game cleanup removes from both game store and lobby
- Consider using Redis for lobby state in production

## Database Schema Extensions
```sql
-- Lobby games table (in-memory for now, database later)
CREATE TABLE lobby_games (
  game_id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  max_players INTEGER NOT NULL,
  game_type VARCHAR(20) NOT NULL,
  buy_in INTEGER,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lobby players table  
CREATE TABLE lobby_players (
  game_id UUID REFERENCES lobby_games(game_id),
  player_id UUID NOT NULL,
  player_name VARCHAR(50) NOT NULL,
  is_ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (game_id, player_id)
);
```