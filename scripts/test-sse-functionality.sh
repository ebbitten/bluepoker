#!/bin/bash

# BULLETPROOF SSE Real-Time Functionality Test
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
echo "🧪 Testing SSE Real-Time Functionality..."

# Create temp directory for safe operations
TEMP_DIR="/tmp/test-sse-$$"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
    # Clean up any background processes
    pkill -f "curl.*events" 2>/dev/null || true
}
trap cleanup EXIT

# Make sure development server is running
curl -s http://localhost:3000 > "$TEMP_DIR/server_check.txt"
if [ ! -s "$TEMP_DIR/server_check.txt" ]; then
    echo "❌ Development server not running. Please start with 'pnpm dev'"
    exit 1
fi

echo "✅ Development server is running"

# Test 1: Create a game using temp files
echo "🎮 Creating a test game..."
echo '{"playerNames":["Alice","Bob"]}' > "$TEMP_DIR/create_game.json"
curl -s -X POST http://localhost:3000/api/game/create \
    -H "Content-Type: application/json" \
    -d @"$TEMP_DIR/create_game.json" > "$TEMP_DIR/game_response.json"

# Extract game ID safely
if grep -q '"gameId"' "$TEMP_DIR/game_response.json"; then
    sed -n 's/.*"gameId":"\([^"]*\)".*/\1/p' "$TEMP_DIR/game_response.json" > "$TEMP_DIR/game_id.txt"
    read GAME_ID < "$TEMP_DIR/game_id.txt"
    
    if [ -n "$GAME_ID" ] && [ "$GAME_ID" != "null" ]; then
        echo "✅ Game created: $GAME_ID"
    else
        echo "❌ Failed to create game - invalid game ID"
        cat "$TEMP_DIR/game_response.json"
        exit 1
    fi
else
    echo "❌ Failed to create game - no gameId in response"
    cat "$TEMP_DIR/game_response.json"
    exit 1
fi

# Test 2: Test SSE endpoint connection
echo "🔄 Testing SSE endpoint connection..."

# Start SSE connection and save output to temp file
timeout 5 curl -s http://localhost:3000/api/game/$GAME_ID/events > "$TEMP_DIR/sse_test.log" &
SSE_PID=$!

sleep 2

# Kill the SSE connection
kill $SSE_PID 2>/dev/null || true
wait $SSE_PID 2>/dev/null || true

if [ -f "$TEMP_DIR/sse_test.log" ] && [ -s "$TEMP_DIR/sse_test.log" ]; then
    echo "✅ SSE endpoint responding"
    
    # Check for expected SSE format
    if grep -q "event: connected" "$TEMP_DIR/sse_test.log"; then
        echo "✅ SSE connection event received"
    else
        echo "❌ SSE connection event not found"
        cat "$TEMP_DIR/sse_test.log"
    fi
    
    if grep -q "event: gameStateUpdate" "$TEMP_DIR/sse_test.log"; then
        echo "✅ SSE game state update received"
    else
        echo "❌ SSE game state update not found"
    fi
else
    echo "❌ SSE endpoint not responding"
    exit 1
fi

# Test 3: Test game action triggers SSE broadcast
echo "🎯 Testing game action SSE broadcast..."

# Deal cards first
echo "📜 Dealing cards..."
curl -s -X POST http://localhost:3000/api/game/$GAME_ID/deal > /dev/null

# Get player IDs using temp files
curl -s http://localhost:3000/api/game/$GAME_ID > "$TEMP_DIR/game_state.json"
sed -n '1s/.*"players":\[{"id":"\([^"]*\)".*/\1/p' "$TEMP_DIR/game_state.json" > "$TEMP_DIR/player1_id.txt"
read PLAYER1_ID < "$TEMP_DIR/player1_id.txt"

echo "👤 Player 1 ID: $PLAYER1_ID"

# Start SSE connection in background
timeout 10 curl -s http://localhost:3000/api/game/$GAME_ID/events > "$TEMP_DIR/sse_action_test.log" &
SSE_PID=$!

sleep 1

# Execute player action using temp file
echo "🎲 Executing player action (call)..."
echo "{\"playerId\":\"$PLAYER1_ID\",\"action\":\"call\"}" > "$TEMP_DIR/action.json"
curl -s -X POST http://localhost:3000/api/game/$GAME_ID/action \
    -H "Content-Type: application/json" \
    -d @"$TEMP_DIR/action.json" > "$TEMP_DIR/action_response.json"

# Check action success using temp file and grep
if grep -q '"success":true' "$TEMP_DIR/action_response.json"; then
    echo "✅ Player action executed successfully"
else
    echo "❌ Player action failed"
    cat "$TEMP_DIR/action_response.json"
fi

sleep 2

# Kill SSE connection
kill $SSE_PID 2>/dev/null || true
wait $SSE_PID 2>/dev/null || true

# Check if action triggered SSE broadcast
if [ -f "$TEMP_DIR/sse_action_test.log" ]; then
    # Count events safely using grep and wc
    grep "event: gameStateUpdate" "$TEMP_DIR/sse_action_test.log" > "$TEMP_DIR/sse_events.txt" || true
    wc -l < "$TEMP_DIR/sse_events.txt" > "$TEMP_DIR/event_count.txt"
    read SSE_EVENTS < "$TEMP_DIR/event_count.txt"
    
    if [ "$SSE_EVENTS" -gt 1 ]; then
        echo "✅ Player action triggered SSE broadcast (found $SSE_EVENTS gameStateUpdate events)"
    else
        echo "❌ Player action did not trigger SSE broadcast"
        echo "SSE log contents:"
        cat "$TEMP_DIR/sse_action_test.log"
    fi
fi

echo ""
echo "🎉 SSE Real-Time Functionality Test Complete!"
echo ""
echo "Next steps for human testing:"
echo "1. Open http://localhost:3000/table in two browser windows"
echo "2. Create a game in the first window"
echo "3. Copy the Game ID and manually navigate to the game in second window"
echo "4. Perform actions in one window and verify they appear in real-time in the other"
echo "5. Check the real-time connection indicator (green dot = connected)"
echo ""