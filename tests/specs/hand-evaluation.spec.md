# Hand Evaluation Service

## Purpose
Provide poker hand ranking functionality that evaluates 5-7 card poker hands and returns standardized hand rankings with sub-microsecond performance. Integrates with existing card model to enable poker gameplay features.

## API Contract

### Endpoints
- `POST /api/hand/eval` - Evaluates poker hand and returns ranking information

### Request/Response Format
```typescript
// Request
interface HandEvalRequest {
  cards: string[]; // Array of card strings like ["Ah", "Kd", "Qc", "Js", "10h"]
}

// Response
interface HandEvalResponse {
  handRank: HandRank;
  handRankName: string;
  handStrength: number; // 0-7462 (lower is better)
  kickers: string[];
  handDescription: string;
  cards: string[]; // Ordered by contribution to hand (pair first, etc.)
}

enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9
}
```

## Behavior Specification

### Happy Path
1. Client sends POST request with 5-7 card array
2. Service validates cards are valid and unique
3. Service evaluates best 5-card poker hand from input
4. Service returns hand ranking, strength, and description
5. Response includes ordered cards showing hand composition

### Error Conditions
- **Invalid Cards**: Malformed card strings return 400 error
- **Duplicate Cards**: Same card appears twice returns 400 error  
- **Wrong Count**: < 5 or > 7 cards returns 400 error
- **Malformed Request**: Invalid JSON structure returns 400 error
- **Server Error**: Internal evaluation error returns 500 error

### Edge Cases
- Exactly 5 cards (no selection needed)
- Exactly 7 cards (choose best 5 from 7)
- Multiple possible straights (A-5 vs 10-A)
- Wheel straight (A-2-3-4-5)
- Royal flush detection
- Identical hands (same strength value)

## Acceptance Criteria

### Must Have
- [ ] Evaluates all standard poker hands correctly
- [ ] Handles 5, 6, and 7 card inputs
- [ ] Returns consistent hand strength ordering
- [ ] Performance < 1 microsecond average
- [ ] Validates input cards against standard deck
- [ ] Returns descriptive hand names

### Should Have
- [ ] Handles edge cases (wheel, royal) correctly
- [ ] Provides detailed kicker information
- [ ] Orders cards by hand contribution
- [ ] Memory efficient implementation
- [ ] Thread-safe evaluation

### Could Have
- [ ] Batch evaluation of multiple hands
- [ ] Hand comparison utilities
- [ ] Probability calculations
- [ ] Hand equity computation

## Test Scenarios

### Unit Tests
- Test all 10 hand types with known examples
- Test hand strength ordering consistency
- Test kicker identification accuracy
- Test 5-card vs 7-card selection
- Test edge cases (wheel, royal flush)
- Test performance benchmarks (< 1μs)
- Test input validation and error cases

### Integration Tests
- Test POST /api/hand/eval endpoint
- Test request/response format compliance
- Test error response codes and messages
- Test with cards from existing deck API
- Test performance under load

### End-to-End Tests
- Test hand evaluation in /deck UI
- Test evaluation with drawn cards
- Test display of hand results
- Test error handling in UI

## Performance Requirements
- Hand evaluation: < 1 microsecond average
- API response time: < 50ms total
- Memory usage: < 1MB for evaluation tables
- Throughput: 10,000+ evaluations per second

## Security Considerations
- Input validation for card format
- Prevent injection attacks via card strings
- Rate limiting on API endpoint
- No sensitive data in hand evaluation

## Dependencies
- Existing Card interface from @bluepoker/shared
- Next.js Route Handlers for API endpoint
- Vitest for performance benchmarking
- Integration with existing /deck UI

## Implementation Notes

### Hand Evaluation Algorithm
- Use lookup table approach for maximum speed
- Pre-compute all possible 5-card hand values
- Perfect hash function for card combinations
- Cactus Kev / Paul Senzee algorithm inspiration

### Data Structures
- Compact card representation (13-bit integers)
- Pre-computed hand rank lookup tables
- Efficient perfect hash for 5-card combinations
- Minimal memory footprint

### Integration Points
- Extend existing Card interface compatibility
- Integrate with /deck page for live evaluation
- Use existing API error handling patterns
- Follow existing TypeScript conventions

### Known Limitations
- Optimized for 5-card poker (Hold'em/Omaha)
- Does not handle wild cards or variants
- Single-threaded evaluation (thread-safe but not parallel)
- Fixed lookup tables (not configurable rules)