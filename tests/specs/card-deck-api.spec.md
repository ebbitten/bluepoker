# Card and Deck API

## Purpose
Provide deterministic card model and deck operations (shuffle, draw) through Next.js Route Handlers with a UI harness for testing and demonstration.

## API Contract

### Endpoints
- `GET /api/deck/shuffle?seed=123` - Returns a shuffled 52-card deck
- `POST /api/deck/draw` - Draws specified number of cards from a deck

### Request/Response Format

#### Shuffle Endpoint
```typescript
// Request
GET /api/deck/shuffle?seed=123

// Response
interface ShuffleResponse {
  deck: Card[];
  seed: number;
  timestamp: number;
}

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  value: number; // 2-14, where J=11, Q=12, K=13, A=14
}
```

#### Draw Endpoint
```typescript
// Request
interface DrawRequest {
  count: number;
  deck: Card[];
}

// Response
interface DrawResponse {
  drawnCards: Card[];
  remainingDeck: Card[];
  count: number;
}
```

## Behavior Specification

### Happy Path - Shuffle
1. Client requests `GET /api/deck/shuffle?seed=123`
2. Server generates deterministic shuffled deck using seed
3. Server returns 52-card array in shuffled order
4. Same seed always produces same shuffle order

### Happy Path - Draw
1. Client sends POST with count and deck
2. Server removes specified number of cards from deck start
3. Server returns drawn cards and remaining deck
4. Total cards (drawn + remaining) equals original deck size

### Error Conditions
- **Invalid Seed**: Non-numeric seed defaults to timestamp
- **Invalid Count**: Count < 1 or > deck.length returns 400 error
- **Invalid Deck**: Malformed deck data returns 400 error
- **Empty Deck**: Drawing from empty deck returns empty drawnCards array

### Edge Cases
- Seed = 0 (valid)
- Count = deck.length (draw all cards)
- Very large seed numbers
- Fractional count (should round down or error)

## Acceptance Criteria

### Must Have
- [ ] Shuffle produces exactly 52 unique cards
- [ ] Same seed produces identical shuffle every time
- [ ] Draw removes correct number of cards from deck
- [ ] Draw maintains card uniqueness (no duplicates)
- [ ] All API responses match specified format
- [ ] Error handling for invalid inputs

### Should Have
- [ ] Shuffle uniformity: each card has ~equal probability at each position
- [ ] Performance: shuffle completes in < 10ms
- [ ] Performance: draw completes in < 5ms
- [ ] Seed parameter is optional (defaults to timestamp)

### Could Have
- [ ] Multiple shuffle algorithms available
- [ ] Deck persistence between requests
- [ ] Deck validation endpoint

## Test Scenarios

### Unit Tests
- Test card model creation and validation
- Test shuffle algorithm with known seeds
- Test draw function with various counts
- Test error handling for edge cases
- Test shuffle uniformity over multiple iterations

### Integration Tests
- Test GET /api/deck/shuffle endpoint
- Test POST /api/deck/draw endpoint
- Test API error responses
- Test request/response format compliance

### End-to-End Tests
- Test UI: click Shuffle button, verify cards displayed
- Test UI: click Draw 5 button, verify 5 cards shown
- Test UI: verify drawn cards are distinct
- Test workflow: Shuffle → Draw → Display

## Performance Requirements
- Shuffle operation: < 10ms
- Draw operation: < 5ms  
- API response time: < 100ms
- Memory usage: < 1MB per operation

## Security Considerations
- Input validation for count parameter
- Deck data validation to prevent injection
- Rate limiting to prevent API abuse
- No sensitive data in shuffle seeds

## Dependencies
- No external dependencies for core logic
- shadcn/ui components for card rendering
- Next.js Route Handlers for API endpoints

## Implementation Notes

### Shuffle Algorithm
- Use seeded random number generator for determinism
- Fisher-Yates shuffle for uniform distribution
- Seed should be stored with shuffled deck for reproducibility

### Card Representation
- String format: "Ah" (Ace of hearts), "Kd" (King of diamonds)
- Object format for internal processing with suit, rank, value
- SVG rendering for UI display

### UI Components
- Deck display showing remaining card count
- Card grid for displaying drawn cards
- Shuffle button with optional seed input
- Draw button with count input (default 5)

### Known Limitations
- Deck state not persisted between requests
- No multi-user deck sharing
- UI optimized for desktop (mobile considerations for later)