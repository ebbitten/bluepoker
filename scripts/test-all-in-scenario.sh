#!/bin/bash

# BULLETPROOF Test the all-in scenario  
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
echo "🧪 Testing all-in scenario..."

# Create temp directory for safe operations
TEMP_DIR="/tmp/test-all-in-$$"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Create game and deal using temp files
echo '{"playerNames":["Alice","Bob"]}' > "$TEMP_DIR/create_game.json"
curl -s http://localhost:3000/api/game/create -X POST -H "Content-Type: application/json" -d @"$TEMP_DIR/create_game.json" > "$TEMP_DIR/game_response.json"

# Extract game ID safely
sed -n 's/.*"gameId":"\([^"]*\)".*/\1/p' "$TEMP_DIR/game_response.json" > "$TEMP_DIR/game_id.txt"
read GAME_ID < "$TEMP_DIR/game_id.txt"
echo "Game ID: $GAME_ID"

# Deal cards
curl -s "http://localhost:3000/api/game/$GAME_ID/deal" -X POST > /dev/null

# Get player IDs using temp files
curl -s "http://localhost:3000/api/game/$GAME_ID" > "$TEMP_DIR/game_state.json"

# Extract player IDs safely using sed
sed -n '1s/.*"players":\[{"id":"\([^"]*\)".*/\1/p' "$TEMP_DIR/game_state.json" > "$TEMP_DIR/player1_id.txt"
read PLAYER1_ID < "$TEMP_DIR/player1_id.txt"

sed -n 's/.*"players":\[{"id":"[^"]*","name":"[^"]*"},{"id":"\([^"]*\)".*/\1/p' "$TEMP_DIR/game_state.json" > "$TEMP_DIR/player2_id.txt"
read PLAYER2_ID < "$TEMP_DIR/player2_id.txt"

# Player 1 calls
echo "Player 1 calls..."
echo "{\"playerId\":\"$PLAYER1_ID\",\"action\":\"call\"}" > "$TEMP_DIR/p1_call.json"
curl -s "http://localhost:3000/api/game/$GAME_ID/action" -X POST -H "Content-Type: application/json" -d @"$TEMP_DIR/p1_call.json" > /dev/null

# Player 2 goes all-in
echo "Player 2 goes all-in..."
echo "{\"playerId\":\"$PLAYER2_ID\",\"action\":\"raise\",\"amount\":1000}" > "$TEMP_DIR/p2_allin.json"
curl -s "http://localhost:3000/api/game/$GAME_ID/action" -X POST -H "Content-Type: application/json" -d @"$TEMP_DIR/p2_allin.json" > /dev/null

# Player 1 tries to raise to 2000 (should fail gracefully)
echo "Player 1 tries to raise to 2000..."
echo "{\"playerId\":\"$PLAYER1_ID\",\"action\":\"raise\",\"amount\":2000}" > "$TEMP_DIR/p1_raise.json"
curl -s "http://localhost:3000/api/game/$GAME_ID/action" -X POST -H "Content-Type: application/json" -d @"$TEMP_DIR/p1_raise.json" > "$TEMP_DIR/raise_result.json"

echo "Result:"
cat "$TEMP_DIR/raise_result.json"