# WebSocket Real-Time Updates

## Purpose
Enable bidirectional real-time communication between poker clients and server. Players can take actions through WebSocket messages while receiving immediate game state updates. This replaces the previous SSE + HTTP approach with a unified WebSocket solution.

## API Contract

### Endpoints
- `GET /api/game/[gameId]/ws` - WebSocket connection endpoint for real-time game communication

### Message Protocol
```typescript
// Client → Server Messages
type ClientMessage = 
  | { type: 'playerAction'; data: { playerId: string; action: 'fold' | 'call' | 'raise'; amount?: number } }
  | { type: 'dealCards'; data: {} }
  | { type: 'startNewHand'; data: {} }
  | { type: 'ping'; data: { timestamp: number } }
  | { type: 'authenticate'; data: { playerId: string; gameId: string } };

// Server → Client Messages  
type ServerMessage = 
  | { type: 'gameStateUpdate'; data: GameState }
  | { type: 'actionResult'; data: { success: boolean; error?: string; gameState?: GameState } }
  | { type: 'connected'; data: { gameId: string; connectionId: string } }
  | { type: 'playerJoined'; data: { playerId: string; playerName: string } }
  | { type: 'playerLeft'; data: { playerId: string } }
  | { type: 'error'; data: { message: string } }
  | { type: 'pong'; data: { timestamp: number } };

// WebSocket Message Envelope
interface WebSocketMessage {
  id: string;           // Unique message ID
  type: string;         // Message type
  data: any;            // Message payload
  timestamp: number;    // Message timestamp
}
```

### Client Integration
```typescript
// WebSocket usage
const ws = new WebSocket(`ws://localhost:3000/api/game/${gameId}/ws`);
ws.send(JSON.stringify({
  id: generateId(),
  type: 'playerAction',
  data: { playerId: 'p1', action: 'call' },
  timestamp: Date.now()
}));
```

## Behavior Specification

### Happy Path
1. Client connects to WebSocket endpoint with valid gameId
2. Server upgrades connection and sends 'connected' message with connectionId
3. Client sends 'authenticate' message with playerId and gameId
4. Server validates authentication and sends initial 'gameStateUpdate'
5. Player actions sent via WebSocket messages receive immediate 'actionResult' responses
6. Game state changes broadcast to all connected clients via 'gameStateUpdate'
7. Connection maintained with periodic ping/pong heartbeat

### Bidirectional Communication Flow
```
Client                    Server
  |                        |
  |-- WebSocket Connect -->|
  |<-- connected message --|
  |-- authenticate ------->|
  |<-- gameStateUpdate ----|
  |-- playerAction ------->|
  |<-- actionResult -------|
  |<-- gameStateUpdate ----| (broadcast to all)
  |-- ping --------------->|
  |<-- pong ---------------|
```

### Error Conditions
- **Game Not Found**: Send error message and close connection with code 4004
- **Authentication Failed**: Send error message and close connection with code 4001
- **Invalid Message Format**: Send error message, maintain connection
- **Connection Lost**: Client automatically reconnects with exponential backoff
- **Server Overload**: Close new connections with code 4003, send error to existing
- **Action Validation Failed**: Send actionResult with success: false and error message

### Edge Cases
- Multiple browser tabs for same game (separate WebSocket connections)
- Client connects mid-game (receives current state after authentication)
- Client disconnects during action (action completes, state broadcasted to remaining clients)
- Rapid successive actions (message queuing with order preservation)
- Network intermittency (automatic reconnection with message replay)
- Message acknowledgment for critical actions (fold, all-in)
- Duplicate message handling (idempotency via message IDs)

## Acceptance Criteria

### Must Have
- [ ] Bidirectional communication (client actions via WebSocket, not HTTP)
- [ ] Game state updates broadcast to all connected clients within 100ms
- [ ] Connection automatically reconnects on network failure with exponential backoff
- [ ] Multiple clients can view same game simultaneously
- [ ] Message ordering preserved for critical game actions
- [ ] No memory leaks from abandoned connections
- [ ] Authentication and authorization for player actions
- [ ] Action acknowledgment with success/error responses

### Should Have
- [ ] Connection health monitoring with ping/pong heartbeat
- [ ] Graceful degradation when WebSocket not supported (fallback to HTTP polling)
- [ ] Connection cleanup when game ends
- [ ] Rate limiting per connection to prevent abuse
- [ ] Message deduplication using unique message IDs
- [ ] Connection state persistence across brief disconnections

### Could Have
- [ ] Connection analytics and performance monitoring
- [ ] Message compression for large game state objects
- [ ] Selective message subscriptions (filter message types)
- [ ] Message replay for reconnecting clients
- [ ] Connection authentication via JWT tokens

## Test Scenarios

### Unit Tests
- WebSocket connection management tracks active connections per game
- Message routing system delivers messages to correct recipients
- Message serialization/deserialization maintains data integrity
- Authentication and authorization validation
- Connection cleanup removes inactive connections
- Error handling for malformed messages
- Message ID generation and deduplication
- Ping/pong heartbeat mechanism

### Integration Tests
- WebSocket endpoint upgrades connections correctly
- Player actions via WebSocket trigger game state updates
- Action results sent back to requesting client
- Game state updates broadcast to all connected clients
- Connection cleanup on game completion
- Message ordering preservation under load
- Authentication flow with valid/invalid credentials

### End-to-End Tests
- Two browser windows communicate via WebSocket in real-time
- Player actions taken in one window immediately reflected in another
- Network disconnection triggers automatic reconnection
- Game completion closes connections gracefully
- Multiple games run independently without message cross-contamination
- Rapid successive actions processed in correct order

## Performance Requirements
- Message delivery latency: < 100ms under normal conditions
- Support: 50+ concurrent connections per game
- Memory usage: < 2MB per active connection (including message buffers)
- CPU overhead: < 5% for message broadcasting and routing
- Automatic connection cleanup within 30 seconds of client disconnect
- Message throughput: 1000+ messages/second per server instance

## Security Considerations
- Player authentication required for game actions
- Rate limiting: Max 10 messages per second per connection
- Input sanitization for all incoming messages
- Memory limits to prevent DoS via connection flooding
- WebSocket origin validation
- Message size limits (max 1MB per message)
- Connection timeout after 5 minutes of inactivity

## Dependencies
- Existing game state management system
- Node.js `ws` library for WebSocket implementation
- WebSocket API (client-side, native browser support)
- Next.js API route handlers for WebSocket upgrade
- TypeScript for message type safety

## Implementation Notes

### Architecture Decision: WebSockets vs SSE
- **Chosen**: WebSockets
- **Rationale**: 
  - Bidirectional communication enables consolidated action handling
  - Lower latency and overhead compared to SSE + HTTP
  - Better performance for real-time gaming applications
  - Native browser support with excellent compatibility
  - More flexible message protocols and compression options

### Technical Approach
- Use Node.js `ws` library for server-side WebSocket handling
- Custom WebSocket connection manager for game-based routing
- TypeScript interfaces for type-safe message handling
- Message ID system for deduplication and acknowledgment
- Ping/pong heartbeat for connection health monitoring

### Connection Management
- Store connections in Map<gameId, Set<WebSocketConnection>>
- Track authenticated player ID per connection
- Clean up connections on client disconnect
- Periodic cleanup of stale connections
- Memory usage monitoring and connection limits

### Message Flow
1. Client WebSocket action → Message validation → Game state update
2. Game state update → Broadcast to all game connections
3. Action result → Send back to originating connection
4. Message acknowledgment for critical actions

### Authentication Flow
1. WebSocket connection established
2. Client sends authenticate message with playerId
3. Server validates player exists in game
4. Server sends connected confirmation
5. Subsequent actions authenticated via stored playerId

### Error Handling
- Invalid message format: Send error, maintain connection
- Authentication failure: Send error, close connection (code 4001)
- Game not found: Send error, close connection (code 4004)
- Rate limit exceeded: Send error, temporarily throttle connection
- Server overload: Close new connections (code 4003)

### Known Limitations
- WebSocket connections don't survive server restarts (future: add persistence)
- Message replay not implemented (future enhancement)
- No connection clustering for horizontal scaling (future enhancement)
- Memory usage scales with active connections and message buffers