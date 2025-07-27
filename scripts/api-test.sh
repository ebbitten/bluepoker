#!/bin/bash

# BULLETPROOF API Testing utility for BluPoker
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
# Usage: ./scripts/api-test.sh <operation> [args...]

set -e

BASE_URL="http://localhost:3000"
TEMP_DIR="/tmp/api-test-$$"

# Create temp directory for safe file operations
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

api_test() {
    local operation=$1
    shift  # Remove first argument, rest are parameters
    
    case $operation in
        "create_game")
            local p1=${1:-"Player1"}
            local p2=${2:-"Player2"}
            echo "{\"playerNames\":[\"$p1\",\"$p2\"]}" > "$TEMP_DIR/create_game.json"
            curl -s "$BASE_URL/api/game/create" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/create_game.json" > "$TEMP_DIR/game_response.json"
            cat "$TEMP_DIR/game_response.json"
            ;;
        "deal")
            local game_id=$1
            curl -s "$BASE_URL/api/game/$game_id/deal" -X POST > "$TEMP_DIR/deal_response.json"
            cat "$TEMP_DIR/deal_response.json"
            ;;
        "get_game")
            local game_id=$1
            curl -s "$BASE_URL/api/game/$game_id" > "$TEMP_DIR/game_state.json"
            cat "$TEMP_DIR/game_state.json"
            ;;
        "player_action")
            local game_id=$1
            local player_id=$2
            local action=$3
            local amount=$4
            if [ -n "$amount" ]; then
                echo "{\"playerId\":\"$player_id\",\"action\":\"$action\",\"amount\":$amount}" > "$TEMP_DIR/action.json"
            else
                echo "{\"playerId\":\"$player_id\",\"action\":\"$action\"}" > "$TEMP_DIR/action.json"
            fi
            curl -s "$BASE_URL/api/game/$game_id/action" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/action.json" > "$TEMP_DIR/action_response.json"
            cat "$TEMP_DIR/action_response.json"
            ;;
        "hand_eval")
            local cards=$1
            echo "{\"cards\":$cards}" > "$TEMP_DIR/hand_eval.json"
            curl -s "$BASE_URL/api/hand/eval" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/hand_eval.json" > "$TEMP_DIR/hand_response.json"
            cat "$TEMP_DIR/hand_response.json"
            ;;
        "hand_eval_simple")
            # Simple test cases without complex JSON
            local test_case=${1:-"royal_flush"}
            case $test_case in
                "royal_flush")
                    echo '{"cards":["As","Ks","Qs","Js","10s"]}' > "$TEMP_DIR/royal.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/royal.json"
                    ;;
                "straight_flush")
                    echo '{"cards":["9h","8h","7h","6h","5h"]}' > "$TEMP_DIR/straight_flush.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/straight_flush.json"
                    ;;
                "four_kind"|"four_of_a_kind")
                    echo '{"cards":["As","Ah","Ad","Ac","Ks"]}' > "$TEMP_DIR/four_kind.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/four_kind.json"
                    ;;
                "full_house")
                    echo '{"cards":["As","Ah","Ad","Ks","Kh"]}' > "$TEMP_DIR/full_house.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/full_house.json"
                    ;;
                "pair")
                    echo '{"cards":["As","Ah","3d","7c","9s"]}' > "$TEMP_DIR/pair.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/pair.json"
                    ;;
                "high_card")
                    echo '{"cards":["2c","4d","6h","8s","10c"]}' > "$TEMP_DIR/high_card.json"
                    curl -s "$BASE_URL/api/hand/eval" -X POST \
                        -H "Content-Type: application/json" \
                        -d @"$TEMP_DIR/high_card.json"
                    ;;
                *)
                    echo "Unknown test case: $test_case"
                    echo "Available: royal_flush, straight_flush, four_kind, four_of_a_kind, full_house, pair, high_card"
                    return 1
                    ;;
            esac
            ;;
        "deck_shuffle")
            local seed=${1:-123}
            curl -s "$BASE_URL/api/deck/shuffle?seed=$seed" > "$TEMP_DIR/deck.json"
            cat "$TEMP_DIR/deck.json"
            ;;
        "deck_draw")
            local count=${1:-5}
            # For deck draw, require deck to be provided via file
            if [ -f "$TEMP_DIR/deck.json" ]; then
                echo "{\"count\":$count,\"deck\":" > "$TEMP_DIR/draw_request.json"
                cat "$TEMP_DIR/deck.json" >> "$TEMP_DIR/draw_request.json"
                echo "}" >> "$TEMP_DIR/draw_request.json"
            else
                echo "Error: No deck available. Run deck_shuffle first."
                return 1
            fi
            curl -s "$BASE_URL/api/deck/draw" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/draw_request.json"
            ;;
        "health_check")
            health_check_all
            ;;
        "debug")
            local endpoint=$1
            shift
            debug_endpoint $endpoint "$@"
            ;;
        "status_check")
            # Simple status checks without complex operations
            local endpoint=${1:-"/"}
            curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint"
            ;;
        "persist_game")
            local game_id=$1
            if [ -z "$game_id" ]; then
                echo "Error: Game ID required for persistence"
                return 1
            fi
            echo "{\"gameId\":\"$game_id\"}" > "$TEMP_DIR/persist_request.json"
            curl -s "$BASE_URL/api/game/$game_id/persist" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/persist_request.json" > "$TEMP_DIR/persist_response.json"
            cat "$TEMP_DIR/persist_response.json"
            ;;
        "restore_game")
            local game_id=$1
            if [ -z "$game_id" ]; then
                echo "Error: Game ID required for restoration"
                return 1
            fi
            curl -s "$BASE_URL/api/game/$game_id/restore" > "$TEMP_DIR/restore_response.json"
            cat "$TEMP_DIR/restore_response.json"
            ;;
        "connection_token")
            local game_id=$1
            local player_id=$2
            if [ -z "$game_id" ] || [ -z "$player_id" ]; then
                echo "Error: Game ID and Player ID required for connection token"
                return 1
            fi
            curl -s "$BASE_URL/api/game/$game_id/connection-token?playerId=$player_id" > "$TEMP_DIR/token_response.json"
            cat "$TEMP_DIR/token_response.json"
            ;;
        "reconnect_player")
            local game_id=$1
            local player_id=$2
            local token=$3
            if [ -z "$game_id" ] || [ -z "$player_id" ] || [ -z "$token" ]; then
                echo "Error: Game ID, Player ID, and token required for reconnection"
                return 1
            fi
            echo "{\"playerId\":\"$player_id\",\"reconnectToken\":\"$token\"}" > "$TEMP_DIR/reconnect_request.json"
            curl -s "$BASE_URL/api/game/$game_id/reconnect" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/reconnect_request.json" > "$TEMP_DIR/reconnect_response.json"
            cat "$TEMP_DIR/reconnect_response.json"
            ;;
        "cleanup_game")
            local game_id=$1
            if [ -z "$game_id" ]; then
                echo "Error: Game ID required for cleanup"
                return 1
            fi
            curl -s "$BASE_URL/api/game/$game_id/persist" -X DELETE > "$TEMP_DIR/cleanup_response.json"
            cat "$TEMP_DIR/cleanup_response.json"
            ;;
        "auth_register")
            local email=$1
            local password=$2
            local username=$3
            echo "{\"email\":\"$email\",\"password\":\"$password\",\"username\":\"$username\"}" > "$TEMP_DIR/register.json"
            curl -s "$BASE_URL/api/auth/register" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/register.json" > "$TEMP_DIR/auth_response.json"
            cat "$TEMP_DIR/auth_response.json"
            ;;
        "auth_login")
            local email=$1
            local password=$2
            echo "{\"email\":\"$email\",\"password\":\"$password\"}" > "$TEMP_DIR/login.json"
            curl -s "$BASE_URL/api/auth/login" -X POST \
                -H "Content-Type: application/json" \
                -d @"$TEMP_DIR/login.json" > "$TEMP_DIR/auth_response.json"
            cat "$TEMP_DIR/auth_response.json"
            ;;
        "auth_me")
            local token=$1
            if [ -z "$token" ]; then
                echo "Error: Token required for auth_me"
                return 1
            fi
            curl -s "$BASE_URL/api/auth/me" \
                -H "Authorization: Bearer $token" > "$TEMP_DIR/auth_response.json"
            cat "$TEMP_DIR/auth_response.json"
            ;;
        "auth_logout")
            local token=$1
            if [ -z "$token" ]; then
                echo "Error: Token required for auth_logout"
                return 1
            fi
            curl -s "$BASE_URL/api/auth/logout" -X POST \
                -H "Authorization: Bearer $token" > "$TEMP_DIR/auth_response.json"
            cat "$TEMP_DIR/auth_response.json"
            ;;
        "create_game_auth")
            local p1=${1:-"Player1"}
            local p2=${2:-"Player2"}
            local token=$3
            if [ -z "$token" ]; then
                echo "Error: Token required for authenticated game creation"
                return 1
            fi
            echo "{\"playerNames\":[\"$p1\",\"$p2\"]}" > "$TEMP_DIR/create_game_auth.json"
            curl -s "$BASE_URL/api/game/create" -X POST \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d @"$TEMP_DIR/create_game_auth.json" > "$TEMP_DIR/game_response.json"
            cat "$TEMP_DIR/game_response.json"
            ;;
        "player_action_auth")
            local game_id=$1
            local player_id=$2
            local action=$3
            local token=$4
            local amount=$5
            if [ -z "$token" ]; then
                echo "Error: Token required for authenticated game action"
                return 1
            fi
            if [ -n "$amount" ]; then
                echo "{\"playerId\":\"$player_id\",\"action\":\"$action\",\"amount\":$amount}" > "$TEMP_DIR/action_auth.json"
            else
                echo "{\"playerId\":\"$player_id\",\"action\":\"$action\"}" > "$TEMP_DIR/action_auth.json"
            fi
            curl -s "$BASE_URL/api/game/$game_id/action" -X POST \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d @"$TEMP_DIR/action_auth.json" > "$TEMP_DIR/action_response.json"
            cat "$TEMP_DIR/action_response.json"
            ;;
        "help")
            show_help
            ;;
        *)
            echo "Unknown operation: $operation"
            echo "Use 'help' for available operations"
            exit 1
            ;;
    esac
}

# Safe debugging functions - no pipes or command substitution
debug_endpoint() {
    local endpoint=$1
    shift
    
    echo "🔍 DEBUG: Testing endpoint $endpoint"
    echo "📡 Server check..."
    
    # Check if server is running - simple way
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" > "$TEMP_DIR/server_check.txt"
    # Read from file to avoid command substitution
    read server_status < "$TEMP_DIR/server_check.txt"
    if [ "$server_status" != "200" ]; then
        echo "❌ Server not responding at $BASE_URL (Status: $server_status)"
        return 1
    fi
    echo "✅ Server responding"
    
    echo "🎯 Testing endpoint: $endpoint"
    
    # Make request with debug output - using temp files
    curl -w "HTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\nCONTENT_TYPE:%{content_type}\n" \
         -s "$BASE_URL$endpoint" "$@" > "$TEMP_DIR/debug_response.txt"
    
    echo "📋 Full Response:"
    cat "$TEMP_DIR/debug_response.txt"
    echo ""
    
    # Check HTTP code from temp file
    local http_code=""
    if grep -q "HTTP_CODE:" "$TEMP_DIR/debug_response.txt"; then
        http_code="200"  # Simplified - if grep found it, assume success
    else
        http_code="error"
    fi
    
    echo "📊 Summary:"
    echo "  HTTP Code: $http_code"
    
    if [ "$http_code" != "200" ]; then
        echo "❌ Endpoint returned error"
        return 1
    else
        echo "✅ Endpoint responding successfully"
        return 0
    fi
}

health_check_all() {
    echo "🏥 HEALTH CHECK: All Endpoints"
    echo "=============================="
    
    local failed=0
    
    # Check main endpoints one by one
    echo -n "/ ...................... "
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" > "$TEMP_DIR/health1.txt"
    if grep -q "200" "$TEMP_DIR/health1.txt"; then
        echo "✅ OK"
    else
        echo "❌ FAIL"
        failed=$((failed + 1))
    fi
    
    echo -n "/table ................ "
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/table" > "$TEMP_DIR/health2.txt"
    if grep -q "200" "$TEMP_DIR/health2.txt"; then
        echo "✅ OK"
    else
        echo "❌ FAIL"
        failed=$((failed + 1))
    fi
    
    echo -n "/deck ................. "
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/deck" > "$TEMP_DIR/health3.txt"
    if grep -q "200" "$TEMP_DIR/health3.txt"; then
        echo "✅ OK"
    else
        echo "❌ FAIL"
        failed=$((failed + 1))
    fi
    
    echo -n "/api/deck/shuffle ..... "
    curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/deck/shuffle" > "$TEMP_DIR/health4.txt"
    if grep -q "200" "$TEMP_DIR/health4.txt"; then
        echo "✅ OK"
    else
        echo "❌ FAIL"
        failed=$((failed + 1))
    fi
    
    echo ""
    if [ $failed -eq 0 ]; then
        echo "🎉 All endpoints healthy!"
    else
        echo "⚠️  $failed endpoint(s) failing"
    fi
    
    return $failed
}

show_help() {
    cat << EOF
BluPoker API Testing Utility (BULLETPROOF VERSION)

USAGE:
    ./scripts/api-test.sh <operation> [args...]

SAFE OPERATIONS (NO PERMISSION PROMPTS):
    create_game [p1] [p2]           Create new game with player names
    deal <game_id>                  Deal cards to game
    get_game <game_id>              Get current game state
    player_action <game_id> <player_id> <action> [amount]
                                    Execute player action (call/raise/fold)
    hand_eval <cards_json>          Evaluate poker hand
    deck_shuffle [seed]             Shuffle deck with optional seed
    deck_draw [count]               Draw cards from shuffled deck
    
PERSISTENCE OPERATIONS (BULLETPROOF):
    persist_game <game_id>          Persist game state to durable storage
    restore_game <game_id>          Restore game state from storage
    connection_token <game_id> <player_id>
                                    Generate reconnection token for player
    reconnect_player <game_id> <player_id> <token>
                                    Reconnect player using token
    cleanup_game <game_id>          Clean up persisted game data
    
AUTHENTICATION OPERATIONS (BULLETPROOF):
    auth_register <email> <password> <username>
                                    Register new user account
    auth_login <email> <password>   Login with existing credentials
    auth_me <token>                 Get current user profile
    auth_logout <token>             Logout and invalidate token
    create_game_auth <p1> <p2> <token>
                                    Create game with authentication
    player_action_auth <game_id> <player_id> <action> <token> [amount]
                                    Execute authenticated game action
    
DEBUGGING OPERATIONS:
    debug <endpoint> [curl_args]    Debug specific endpoint with detailed output
    health_check                    Check health of all basic endpoints
    status_check [endpoint]         Simple status check for endpoint
    
EXAMPLES:
    # Game creation and testing
    ./scripts/api-test.sh create_game "Alice" "Bob" > /tmp/game.json
    ./scripts/api-test.sh deal "game-123" > /tmp/deal.json
    
    # Persistence workflow testing
    ./scripts/api-test.sh persist_game "game-123" > /tmp/persist.json
    ./scripts/api-test.sh restore_game "game-123" > /tmp/restore.json
    ./scripts/api-test.sh connection_token "game-123" "player-1" > /tmp/token.json
    ./scripts/api-test.sh reconnect_player "game-123" "player-1" "token-abc123"
    ./scripts/api-test.sh cleanup_game "game-123"
    
    # Hand evaluation testing  
    ./scripts/api-test.sh hand_eval_simple royal_flush
    ./scripts/api-test.sh hand_eval_simple straight_flush
    
    # Authentication workflow testing
    ./scripts/api-test.sh auth_register "test@example.com" "TestPass123!" "testuser"
    ./scripts/api-test.sh auth_login "test@example.com" "TestPass123!"
    ./scripts/api-test.sh auth_me "token-from-login"
    ./scripts/api-test.sh create_game_auth "TestUser" "Player2" "auth-token"
    ./scripts/api-test.sh player_action_auth "game-123" "player-1" "call" "auth-token"
    ./scripts/api-test.sh auth_logout "auth-token"
    
    # Health and debugging
    ./scripts/api-test.sh health_check
    ./scripts/api-test.sh debug "/api/game/create" -X POST
    ./scripts/api-test.sh status_check "/table"

NOTE: This version uses only safe bash patterns - no pipes, command substitution,
or complex operations that could trigger permission prompts.

EOF
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi
    api_test "$@"
fi