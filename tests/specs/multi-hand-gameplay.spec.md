# Multi-Hand Gameplay Specification

## Purpose
Enable continuous gameplay where players can play multiple hands in sequence within the same game session, maintaining chip counts and game state between hands.

## API Contract

### POST /api/game/[gameId]/new-hand
**Purpose**: Start a new hand after the current hand is complete

**Request**: 
- Method: POST
- Path: `/api/game/[gameId]/new-hand`
- Body: None

**Response**:
- Success (200): Returns updated GameState with new hand automatically dealt
- Error (400): "Current hand is not complete" | "Not enough players have chips to continue"  
- Error (404): "Game not found"
- Error (500): "Failed to start new hand"

**Behavior**:
- Only works when current hand phase is 'complete'
- Automatically deals pocket cards and advances to 'preflop' phase
- Rotates dealer position to next player
- Maintains player chip counts from previous hand (minus new blinds)
- Increments hand number
- Clears community cards and previous betting state
- Broadcasts real-time update to all connected clients

## Game State Changes

### New GameState Fields
- `handNumber: number` - Tracks which hand this is (starts at 0, increments with each deal)
- `dealerIndex: number` - Tracks who the dealer is (rotates each hand)

### Phase Flow (Heads-Up Poker Rules)
1. **Game Creation**: `phase: 'waiting'`, `handNumber: 0`, `dealerIndex: 0`
2. **Deal Cards**: `phase: 'preflop'`, `handNumber: 1`, `dealerIndex: 1` (rotated)
   - Dealer (index 1) = Big Blind ($20)
   - Non-dealer (index 0) = Small Blind ($10) 
   - Small blind acts first preflop
3. **Hand Complete**: `phase: 'complete'`, `handNumber: 1`
4. **Start New Hand**: `phase: 'preflop'`, `handNumber: 2`, `dealerIndex: 0` (rotated again, cards auto-dealt)
   - Dealer (index 0) = Big Blind ($20)
   - Non-dealer (index 1) = Small Blind ($10)
   - Small blind acts first preflop

## UI Components

### Game Controls
- **Deal Cards Button**: Shown when `phase === 'waiting'` (backward compatibility)
- **Start New Hand Button**: Shown when `phase === 'complete'` (automatically deals cards)
- **Hand Number Display**: Shows current hand number in game info
- **Dealer Button**: Shows red "D" indicator next to dealer's name

### Winner Display
- Updated to show hand number: "Hand #X - Player wins!"
- Includes instruction text about continuing gameplay

## Validation Rules

### Pre-Deal Betting Prevention
- Players cannot take actions when `phase === 'waiting'`
- Error message: "Hand has not been dealt yet"
- `activePlayerIndex: -1` when in waiting phase

### New Hand Requirements
- Current hand must be in 'complete' phase
- At least 2 players must have enough chips for big blind
- Game must exist in store

## Test Scenarios

### Unit Tests
- `startNewHand()` function resets game state correctly
- `executePlayerAction()` blocks actions in 'waiting' phase
- `dealNewHand()` increments hand number properly
- Error handling for insufficient chips scenario

### Integration Tests
- POST /api/game/[gameId]/new-hand endpoint functionality
- Game state persistence across hand transitions
- Real-time broadcasting of new hand state

### E2E Tests
- Complete multi-hand gameplay flow
- UI button visibility and functionality
- Hand number display updates
- Chip counts maintained across hands

## Acceptance Criteria

### ✅ **Core Multi-Hand Functionality**
- Players can play multiple hands in sequence
- Chip counts are maintained between hands
- Hand numbers increment correctly
- Game state resets properly for each new hand

### ✅ **Pre-Deal Betting Fix**
- Players cannot take actions before cards are dealt
- Clear error messages for invalid actions
- Proper phase management

### ✅ **User Experience**
- Intuitive UI with appropriate buttons for each phase
- Clear indication of current hand number
- Instructions for continuing gameplay

### ✅ **Real-Time Updates**
- New hand state broadcasts to all connected clients
- Seamless multiplayer experience across hand transitions
- Consistent state synchronization

## Performance Requirements
- New hand initialization: < 100ms
- UI state updates: < 50ms
- Real-time broadcast: < 200ms

## Error Handling
- Graceful handling of network errors during hand transitions
- Clear error messages for invalid operations
- Fallback to game recreation if state corruption occurs