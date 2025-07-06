# Game State Management

## Purpose
Manage the state of a two-player Texas Hold'em poker game including player hands, community cards, betting rounds, and game progression. This provides the foundation for real-time multiplayer poker gameplay.

## API Contract

### Endpoints
- `POST /api/game/create` - Create a new game session
- `GET /api/game/:gameId` - Get current game state
- `POST /api/game/:gameId/action` - Execute player action (fold, call, raise)
- `POST /api/game/:gameId/deal` - Deal new hand (for testing)

### Request/Response Format
```typescript
// Game Creation
interface CreateGameRequest {
  playerNames: [string, string]; // Two player names
}

interface CreateGameResponse {
  gameId: string;
  gameState: GameState;
}

// Game State
interface GameState {
  gameId: string;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  activePlayerIndex: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete';
  winner?: number; // Player index
  winnerReason?: string;
}

interface Player {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  folded: boolean;
  allIn: boolean;
}

// Player Actions
interface PlayerActionRequest {
  playerId: string;
  action: 'fold' | 'call' | 'raise';
  amount?: number; // Required for raise
}

interface PlayerActionResponse {
  success: boolean;
  gameState: GameState;
  error?: string;
}
```

## Behavior Specification

### Happy Path
1. Create game with two players, each starting with 1000 chips
2. Deal hole cards to each player (2 cards each)
3. Start with preflop betting (small blind 10, big blind 20)
4. Players can fold, call, or raise
5. Progress through betting rounds: preflop → flop → turn → river → showdown
6. Determine winner and award pot

### Error Conditions
- **Invalid Game ID**: Return 404 when game doesn't exist
- **Invalid Player**: Return 400 when player not in game
- **Invalid Action**: Return 400 when action not allowed (wrong turn, insufficient chips)
- **Invalid Bet Amount**: Return 400 when raise amount is invalid

### Edge Cases
- All-in scenarios
- Both players fold
- Equal hands (split pot)
- Player disconnect/timeout

## Acceptance Criteria

### Must Have
- [ ] Create two-player game with initial chip stacks
- [ ] Deal hole cards and community cards correctly
- [ ] Handle basic actions: fold, call, raise
- [ ] Track pot and betting correctly
- [ ] Progress through all betting rounds
- [ ] Determine winner using hand evaluation
- [ ] Handle all-in scenarios
- [ ] Validate player actions and turn order

### Should Have
- [ ] Blind structure (small blind, big blind)
- [ ] Minimum raise validation
- [ ] Side pot calculation for all-ins
- [ ] Game state persistence across requests

### Could Have
- [ ] Hand history tracking
- [ ] Player statistics
- [ ] Tournament mode

## Test Scenarios

### Unit Tests
- Game state initialization
- Player action validation
- Betting logic (pot, current bet tracking)
- Phase transitions
- Winner determination
- All-in scenarios

### Integration Tests
- API endpoint functionality
- Game creation and state retrieval
- Player action execution
- Error handling for invalid requests
- Complete game flow from deal to showdown

### End-to-End Tests
- Complete game workflow through UI
- Two-player game simulation
- Error recovery scenarios

## Performance Requirements
- Response time: < 50ms for game state operations
- Memory usage: < 1MB per game session
- Support 100+ concurrent games

## Security Considerations
- Player authentication/authorization
- Input sanitization for player actions
- Rate limiting for API endpoints
- Hide opponent hole cards until showdown

## Dependencies
- Card and deck system (existing)
- Hand evaluation system (existing)
- In-memory state storage (new)

## Implementation Notes
- Use in-memory storage for MVP (no database persistence yet)
- Game state stored in Map<gameId, GameState>
- Each game isolated from others
- Stateless API design - all state passed in requests/responses
- Future: Add WebSocket support for real-time updates