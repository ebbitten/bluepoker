#!/bin/bash

# Automated Authentication Testing Script
# Tests all authentication flows automatically without user interaction

set -e

echo "🔐 AUTOMATED AUTHENTICATION TESTING"
echo "===================================="

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"
TEST_PASSWORD="TestPass123!"
TEST_USERNAME="testuser${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Make HTTP request and return response using safe patterns
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth_token="$4"
    
    # Create safe temp file
    local response_file="/tmp/auth_test_response_$$_$(date +%s).json"
    
    # Build curl command using safe patterns
    if [[ "$method" == "GET" ]]; then
        if [[ -n "$auth_token" ]]; then
            curl -s -w "%{http_code}" -o "$response_file" \
                -H "Authorization: Bearer $auth_token" \
                "${BASE_URL}${endpoint}"
        else
            curl -s -w "%{http_code}" -o "$response_file" \
                "${BASE_URL}${endpoint}"
        fi
    else
        if [[ -n "$data" && -n "$auth_token" ]]; then
            curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_token" \
                -d "$data" \
                "${BASE_URL}${endpoint}"
        elif [[ -n "$data" ]]; then
            curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "${BASE_URL}${endpoint}"
        elif [[ -n "$auth_token" ]]; then
            curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                -H "Authorization: Bearer $auth_token" \
                "${BASE_URL}${endpoint}"
        else
            curl -s -w "%{http_code}" -o "$response_file" \
                -X "$method" \
                "${BASE_URL}${endpoint}"
        fi
    fi
    
    # Copy to standard location for other functions
    cp "$response_file" /tmp/auth_test_response.json
    rm -f "$response_file"
}

# Extract field from JSON response
extract_json_field() {
    local field="$1"
    python3 -c "
import json, sys
try:
    with open('/tmp/auth_test_response.json', 'r') as f:
        data = json.load(f)
    print(data.get('$field', ''))
except:
    print('')
"
}

# Global variables for test data
AUTH_TOKEN=""
USER_ID=""
REFRESH_TOKEN=""
GAME_ID=""

echo ""
log_info "Starting authentication tests with user: $TEST_USERNAME"
echo ""

# Test 1: User Registration
log_test "User Registration"
status_code=$(make_request "POST" "/api/auth/register" "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"$TEST_USERNAME\"
}")

if [[ "$status_code" == "201" ]]; then
    AUTH_TOKEN=$(extract_json_field "token")
    USER_ID=$(extract_json_field "user.id")
    if [[ -n "$AUTH_TOKEN" && -n "$USER_ID" ]]; then
        log_pass "User registration successful, token received"
    else
        log_fail "Registration successful but missing token or user ID"
    fi
else
    log_fail "User registration failed with status: $status_code"
fi

# Test 2: Duplicate Registration Prevention
log_test "Duplicate Registration Prevention"
status_code=$(make_request "POST" "/api/auth/register" "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"different_user\"
}")

if [[ "$status_code" == "400" ]]; then
    log_pass "Duplicate email registration properly rejected"
else
    log_fail "Duplicate email registration should be rejected with 400, got: $status_code"
fi

# Test 3: User Profile Access with Token
log_test "Authenticated Profile Access"
status_code=$(make_request "GET" "/api/auth/me" "" "$AUTH_TOKEN")

if [[ "$status_code" == "200" ]]; then
    username=$(extract_json_field "user.username")
    if [[ "$username" == "$TEST_USERNAME" ]]; then
        log_pass "Profile access successful with correct user data"
    else
        log_fail "Profile access returned wrong username: $username"
    fi
else
    log_fail "Profile access failed with status: $status_code"
fi

# Test 4: Protected Endpoint Without Token
log_test "Protected Endpoint Without Authentication"
status_code=$(make_request "GET" "/api/auth/me" "")

if [[ "$status_code" == "401" ]]; then
    log_pass "Protected endpoint properly rejects unauthenticated requests"
else
    log_fail "Protected endpoint should reject unauthenticated requests with 401, got: $status_code"
fi

# Test 5: Game Creation with Authentication
log_test "Authenticated Game Creation"
status_code=$(make_request "POST" "/api/game/create" "{
    \"playerNames\": [\"$TEST_USERNAME\", \"TestPlayer2\"]
}" "$AUTH_TOKEN")

if [[ "$status_code" == "200" ]]; then
    GAME_ID=$(extract_json_field "gameId")
    if [[ -n "$GAME_ID" ]]; then
        log_pass "Game creation successful with authentication"
    else
        log_fail "Game creation successful but no gameId returned"
    fi
else
    log_fail "Authenticated game creation failed with status: $status_code"
fi

# Test 6: Game Creation Without Authentication
log_test "Game Creation Without Authentication"
status_code=$(make_request "POST" "/api/game/create" "{
    \"playerNames\": [\"Player1\", \"Player2\"]
}")

if [[ "$status_code" == "401" ]]; then
    log_pass "Game creation properly requires authentication"
else
    log_fail "Game creation should require authentication, got status: $status_code"
fi

# Test 7: Game Action with Authentication
if [[ -n "$GAME_ID" ]]; then
    log_test "Authenticated Game Action"
    
    # First get the current game state to find player ID
    status_code=$(make_request "GET" "/api/game/$GAME_ID" "" "$AUTH_TOKEN")
    if [[ "$status_code" == "200" ]]; then
        # Extract the first player's ID (should be our user)
        player_id=$(python3 -c "
import json
try:
    with open('/tmp/auth_test_response.json', 'r') as f:
        data = json.load(f)
    players = data.get('players', [])
    for player in players:
        if player.get('name') == '$TEST_USERNAME':
            print(player.get('id', ''))
            break
except:
    print('')
")
        
        if [[ -n "$player_id" ]]; then
            # Try to perform a game action
            status_code=$(make_request "POST" "/api/game/$GAME_ID/action" "{
                \"playerId\": \"$player_id\",
                \"action\": \"call\"
            }" "$AUTH_TOKEN")
            
            if [[ "$status_code" == "200" ]]; then
                log_pass "Authenticated game action successful"
            else
                log_fail "Authenticated game action failed with status: $status_code"
            fi
        else
            log_fail "Could not find player ID for authenticated user"
        fi
    else
        log_fail "Could not retrieve game state for action test"
    fi
else
    log_fail "Skipping game action test - no game ID available"
fi

# Test 8: Game Action Without Authentication
if [[ -n "$GAME_ID" ]]; then
    log_test "Game Action Without Authentication"
    status_code=$(make_request "POST" "/api/game/$GAME_ID/action" "{
        \"playerId\": \"any-player-id\",
        \"action\": \"call\"
    }")

    if [[ "$status_code" == "401" ]]; then
        log_pass "Game actions properly require authentication"
    else
        log_fail "Game actions should require authentication, got status: $status_code"
    fi
fi

# Test 9: Invalid Token Rejection
log_test "Invalid Token Rejection"
status_code=$(make_request "GET" "/api/auth/me" "" "invalid-token-123")

if [[ "$status_code" == "401" ]]; then
    log_pass "Invalid tokens properly rejected"
else
    log_fail "Invalid tokens should be rejected with 401, got: $status_code"
fi

# Test 10: User Logout
log_test "User Logout"
status_code=$(make_request "POST" "/api/auth/logout" "" "$AUTH_TOKEN")

if [[ "$status_code" == "200" ]]; then
    log_pass "User logout successful"
    
    # Verify token is invalidated
    log_test "Token Invalidation After Logout"
    status_code=$(make_request "GET" "/api/auth/me" "" "$AUTH_TOKEN")
    
    if [[ "$status_code" == "401" ]]; then
        log_pass "Token properly invalidated after logout"
    else
        log_fail "Token should be invalidated after logout, got: $status_code"
    fi
else
    log_fail "User logout failed with status: $status_code"
fi

# Test 11: User Login
log_test "User Login"
status_code=$(make_request "POST" "/api/auth/login" "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
}")

if [[ "$status_code" == "200" ]]; then
    NEW_AUTH_TOKEN=$(extract_json_field "token")
    if [[ -n "$NEW_AUTH_TOKEN" ]]; then
        log_pass "User login successful, new token received"
        AUTH_TOKEN="$NEW_AUTH_TOKEN"
    else
        log_fail "Login successful but no token returned"
    fi
else
    log_fail "User login failed with status: $status_code"
fi

# Test 12: Invalid Login Credentials
log_test "Invalid Login Credentials"
status_code=$(make_request "POST" "/api/auth/login" "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"wrongpassword\"
}")

if [[ "$status_code" == "401" ]]; then
    log_pass "Invalid login credentials properly rejected"
else
    log_fail "Invalid login credentials should be rejected with 401, got: $status_code"
fi

# Test 13: Email Validation
log_test "Email Format Validation"
status_code=$(make_request "POST" "/api/auth/register" "{
    \"email\": \"invalid-email\",
    \"password\": \"$TEST_PASSWORD\",
    \"username\": \"testuser2\"
}")

if [[ "$status_code" == "400" ]]; then
    log_pass "Invalid email format properly rejected"
else
    log_fail "Invalid email format should be rejected with 400, got: $status_code"
fi

# Test 14: Password Validation
log_test "Password Strength Validation"
status_code=$(make_request "POST" "/api/auth/register" "{
    \"email\": \"test2@example.com\",
    \"password\": \"weak\",
    \"username\": \"testuser2\"
}")

if [[ "$status_code" == "400" ]]; then
    log_pass "Weak password properly rejected"
else
    log_fail "Weak password should be rejected with 400, got: $status_code"
fi

# Clean up temporary files
rm -f /tmp/auth_test_response.json

echo ""
echo "🔐 AUTHENTICATION TEST SUMMARY"
echo "=============================="
echo -e "Total Tests: ${BLUE}$TESTS_RUN${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✅ ALL AUTHENTICATION TESTS PASSED!${NC}"
    echo "The authentication system is working correctly."
    exit 0
else
    echo -e "\n${RED}❌ SOME AUTHENTICATION TESTS FAILED!${NC}"
    echo "Please review the failed tests and fix the authentication system."
    exit 1
fi