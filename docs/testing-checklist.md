# Testing Checklist - Human Validation Protocol

## General Testing Setup

### Prerequisites
```bash
# Ensure development server is running
pnpm dev

# Navigate to testing URL (typically http://localhost:3000)
# Note: Claude will provide specific URL and port
```

### Quality Pre-Checks (Claude Completed)
✅ TypeScript compilation passed  
✅ ESLint validation passed  
✅ All unit tests passed  
✅ Production build successful  
✅ Basic smoke test completed  

---

## Increment 0 - Build & Tooling Testing

### Landing Page Test
**URL:** `http://localhost:3000`

**Expected Results:**
- [ ] Page loads without errors
- [ ] "Hello Poker" heading displays prominently
- [ ] Subtitle shows "Play-money Texas Hold'em poker server + browser client"
- [ ] Clean layout with Tailwind CSS styling
- [ ] No console errors in browser dev tools

---

## Increment 1 - Card and Deck API Testing

### Deck Harness Test
**URL:** `http://localhost:3000/deck`

**Test Scenarios:**

#### 1. Deck Shuffle Test
- [ ] Click "Shuffle" button
- [ ] Verify deck contains 52 cards
- [ ] Verify seed is displayed
- [ ] Repeat with custom seed (e.g., "12345")
- [ ] Verify same seed produces identical deck order

#### 2. Card Draw Test  
- [ ] Set draw count to 5
- [ ] Click "Draw Cards"
- [ ] Verify 5 cards are visually displayed
- [ ] Verify remaining deck shows 47 cards
- [ ] Verify drawn cards have suits and ranks

#### 3. API Endpoint Tests
```bash
# Test shuffle endpoint
curl "http://localhost:3000/api/deck/shuffle?seed=123"

# Test draw endpoint
curl -X POST http://localhost:3000/api/deck/draw \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "deck": [DECK_FROM_SHUFFLE]}'
```

**Expected API Results:**
- [ ] Shuffle returns 52-card array with seed
- [ ] Draw returns drawnCards and remainingDeck arrays
- [ ] No 500 errors in API responses

---

## Increment 2 - Hand Evaluation Testing

### Hand Evaluation UI Test
**URL:** `http://localhost:3000/deck`

**Test Scenarios:**

#### 1. Basic Hand Evaluation
- [ ] Shuffle deck
- [ ] Draw 5 cards
- [ ] Click "Evaluate Hand" button
- [ ] Verify hand rank appears (e.g., "One Pair", "High Card")
- [ ] Verify hand description is detailed
- [ ] Verify hand strength number is shown

#### 2. Specific Hand Types Test
Test with these card combinations via API:

```bash
# Royal Flush Test
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As", "Ks", "Qs", "Js", "10s"]}'

# Expected: handRank=9, handRankName="Royal Flush"

# Straight Flush Test  
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["9h", "8h", "7h", "6h", "5h"]}'

# Expected: handRank=8, handRankName="Straight Flush"

# Four of a Kind Test
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As", "Ah", "Ad", "Ac", "Ks"]}'

# Expected: handRank=7, handRankName="Four of a Kind"

# Wheel Straight Test (A-2-3-4-5)
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As", "2h", "3d", "4s", "5c"]}'

# Expected: handRank=4, handDescription contains "Wheel"
```

#### 3. 7-Card Hand Test
- [ ] Draw 7 cards from deck
- [ ] Click "Evaluate Hand"  
- [ ] Verify best 5-card hand is identified
- [ ] Verify hand evaluation ignores weakest 2 cards

#### 4. Error Handling Test
```bash
# Test invalid card count
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As"]}'

# Expected: 400 error, "Invalid number of cards"

# Test duplicate cards
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As", "As", "Ks", "Qs", "Js"]}'

# Expected: 400 error, "Duplicate cards detected"

# Test invalid card format
curl -X POST http://localhost:3000/api/hand/eval \
  -H "Content-Type: application/json" \
  -d '{"cards": ["As", "Invalid", "Ks", "Qs", "Js"]}'

# Expected: 400 error, "Invalid card format"
```

**Expected Results:**
- [ ] All hand ranks correctly identified
- [ ] Wheel and Broadway straights work
- [ ] Error responses are proper 400 status
- [ ] Hand strength scoring works for tie-breaking
- [ ] Performance is sub-second for evaluation

---

## Increment 3 - Heads-Up Engine Testing (Future)

### Multi-Session Test
**URL:** `http://localhost:3000/table`

**Test Scenarios:**
- [ ] Guest authentication works
- [ ] Table joining assigns seats correctly  
- [ ] WebSocket connection establishes
- [ ] Game state updates in real-time
- [ ] Two browser windows can play against each other

### Game Logic Test
- [ ] Blinds are posted correctly
- [ ] Betting rounds work properly
- [ ] Showdown evaluates hands correctly
- [ ] Pot distribution is accurate

---

## Error Scenarios to Always Test

### Network Errors
- [ ] API returns proper error codes (400, 500)
- [ ] UI shows user-friendly error messages
- [ ] Application doesn't crash on network failures

### Input Validation
- [ ] Invalid inputs are rejected with clear messages
- [ ] XSS attempts are prevented
- [ ] SQL injection attempts fail safely

### Performance
- [ ] Page loads within 2 seconds
- [ ] API responses under 100ms for simple operations
- [ ] Hand evaluation under 1ms
- [ ] No memory leaks in long sessions

---

## Test Environment Notes

### Browser Support
Test in at least:
- [ ] Chrome/Chromium (primary)
- [ ] Firefox (secondary)
- [ ] Safari (if available)

### Screen Sizes
- [ ] Desktop (1920x1080)
- [ ] Tablet (768px width)
- [ ] Mobile (375px width)

### Development Tools
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] Performance tab shows acceptable metrics

---

## Reporting Test Results

### Success Criteria
- [ ] All UI components render correctly
- [ ] All API endpoints return expected responses
- [ ] No console errors or warnings
- [ ] Performance meets requirements
- [ ] Error handling works properly

### Failure Reporting
When tests fail, provide:
1. **Error Description:** What went wrong
2. **Steps to Reproduce:** Exact sequence that caused error
3. **Expected vs Actual:** What should happen vs what happened
4. **Browser/Environment:** Browser, screen size, etc.
5. **Console Logs:** Any errors in browser developer tools

### Common Issues
- **500 Internal Server Error:** Usually missing function exports or TypeScript errors
- **404 Not Found:** Route not properly configured or typo in URL
- **Type Errors:** Import/export mismatches between packages
- **Performance Issues:** Algorithm inefficiencies or infinite loops