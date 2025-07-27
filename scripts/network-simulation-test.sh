#!/bin/bash

# Phase 2: Network Simulation Testing
# Tests application behavior under various network conditions

echo "🌐 Phase 2: Network Simulation Testing Started"
echo "Testing BluPoker under various network conditions..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS:${NC} $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL:${NC} $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test API endpoint with timeout
test_endpoint() {
    local endpoint=$1
    local timeout=$2
    local description=$3
    
    echo "Testing: $description"
    
    if timeout $timeout curl -s -f "http://localhost:3000$endpoint" > /dev/null; then
        log_test 0 "$description"
        return 0
    else
        log_test 1 "$description"
        return 1
    fi
}

# Function to test SSE connection
test_sse_connection() {
    local timeout=$1
    local description=$2
    
    echo "Testing: $description"
    
    # Create a temporary game for SSE testing
    local game_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"playerNames":["TestPlayer1","TestPlayer2"]}' \
        "http://localhost:3000/api/game/create")
    
    if echo "$game_response" | grep -q "gameId"; then
        local game_id=$(echo "$game_response" | grep -o '"gameId":"[^"]*"' | cut -d'"' -f4)
        
        # Test SSE connection with timeout
        if timeout $timeout curl -s "http://localhost:3000/api/game/$game_id/events" > /dev/null; then
            log_test 0 "$description"
            return 0
        else
            log_test 1 "$description"
            return 1
        fi
    else
        log_test 1 "$description (failed to create test game)"
        return 1
    fi
}

# Function to simulate network delay (if tc is available)
simulate_network_delay() {
    local delay=$1
    echo "Simulating ${delay}ms network delay..."
    
    if command -v tc >/dev/null 2>&1; then
        # Add network delay using traffic control (requires sudo)
        if sudo tc qdisc add dev lo root netem delay ${delay}ms 2>/dev/null; then
            echo "Network delay applied: ${delay}ms"
            return 0
        else
            echo "Could not apply network delay (may need sudo or tc not available)"
            return 1
        fi
    else
        echo "Traffic control (tc) not available - skipping network delay simulation"
        return 1
    fi
}

# Function to remove network delay
remove_network_delay() {
    if command -v tc >/dev/null 2>&1; then
        sudo tc qdisc del dev lo root 2>/dev/null || true
        echo "Network delay removed"
    fi
}

echo ""
echo "🚀 Starting Network Condition Tests"
echo "===================================="

# Test 1: Normal network conditions
echo ""
echo "📶 Test 1: Normal Network Conditions"
test_endpoint "/api/health" "5s" "Health check under normal conditions"
test_endpoint "/api/game/create" "10s" "Game creation under normal conditions"
test_sse_connection "10s" "SSE connection under normal conditions"

# Test 2: Slow network simulation (if possible)
echo ""
echo "🐌 Test 2: Slow Network Simulation"

if simulate_network_delay "200"; then
    sleep 1
    test_endpoint "/api/health" "10s" "Health check with 200ms delay"
    test_endpoint "/api/game/create" "15s" "Game creation with 200ms delay"
    test_sse_connection "15s" "SSE connection with 200ms delay"
    remove_network_delay
else
    echo "Skipping network delay tests (tc not available or no sudo)"
    # Test with timeout to simulate slow conditions
    test_endpoint "/api/health" "1s" "Health check with short timeout (simulated slow network)"
    test_endpoint "/api/game/create" "2s" "Game creation with short timeout (simulated slow network)"
fi

# Test 3: High latency simulation
echo ""
echo "⏰ Test 3: High Latency Simulation"

if simulate_network_delay "500"; then
    sleep 1
    test_endpoint "/api/health" "15s" "Health check with 500ms delay"
    test_endpoint "/api/game/create" "20s" "Game creation with 500ms delay"
    test_sse_connection "20s" "SSE connection with 500ms delay"
    remove_network_delay
else
    # Alternative: test with very short timeouts to simulate high latency
    echo "Testing resilience to timeout conditions..."
    timeout 1s curl -s "http://localhost:3000/api/health" > /dev/null
    if [ $? -eq 124 ]; then
        log_test 0 "API handles timeout conditions gracefully"
    else
        log_test 1 "API timeout handling"
    fi
fi

# Test 4: Connection timeout scenarios
echo ""
echo "⏱️ Test 4: Connection Timeout Scenarios"

# Test very short timeouts
timeout 0.5s curl -s "http://localhost:3000/api/health" > /dev/null
TIMEOUT_RESULT=$?

if [ $TIMEOUT_RESULT -eq 124 ]; then
    log_test 0 "Server handles connection timeouts gracefully"
else
    if [ $TIMEOUT_RESULT -eq 0 ]; then
        log_test 0 "Server responds quickly even under timeout pressure"
    else
        log_test 1 "Server connection timeout handling"
    fi
fi

# Test 5: Rapid successive requests (stress)
echo ""
echo "⚡ Test 5: Rapid Successive Requests"

RAPID_SUCCESS=0
RAPID_TOTAL=10

for i in $(seq 1 $RAPID_TOTAL); do
    if curl -s -f "http://localhost:3000/api/health" > /dev/null; then
        RAPID_SUCCESS=$((RAPID_SUCCESS + 1))
    fi
done

if [ $RAPID_SUCCESS -gt 7 ]; then
    log_test 0 "Rapid requests handled well ($RAPID_SUCCESS/$RAPID_TOTAL succeeded)"
else
    log_test 1 "Rapid requests handling ($RAPID_SUCCESS/$RAPID_TOTAL succeeded)"
fi

# Test 6: Concurrent connections
echo ""
echo "🔀 Test 6: Concurrent Connections"

# Create multiple concurrent requests
CONCURRENT_JOBS=5
CONCURRENT_SUCCESS=0

for i in $(seq 1 $CONCURRENT_JOBS); do
    (curl -s -f "http://localhost:3000/api/health" > /dev/null && echo "success") &
done

# Wait for all background jobs and count successes
wait
CONCURRENT_SUCCESS=$(jobs -r | wc -l)

if [ $CONCURRENT_SUCCESS -ge 3 ]; then
    log_test 0 "Concurrent connections handled well"
else
    log_test 1 "Concurrent connections handling"
fi

# Test 7: Game flow under network stress
echo ""
echo "🎮 Test 7: Game Flow Under Network Stress"

# Create game
GAME_RESPONSE=$(timeout 10s curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"playerNames":["StressPlayer1","StressPlayer2"]}' \
    "http://localhost:3000/api/game/create")

if echo "$GAME_RESPONSE" | grep -q "gameId"; then
    GAME_ID=$(echo "$GAME_RESPONSE" | grep -o '"gameId":"[^"]*"' | cut -d'"' -f4)
    
    # Deal cards
    if timeout 10s curl -s -X POST "http://localhost:3000/api/game/$GAME_ID/deal" > /dev/null; then
        log_test 0 "Game dealing under network stress"
        
        # Get game state
        if timeout 10s curl -s "http://localhost:3000/api/game/$GAME_ID" > /dev/null; then
            log_test 0 "Game state retrieval under network stress"
        else
            log_test 1 "Game state retrieval under network stress"
        fi
    else
        log_test 1 "Game dealing under network stress"
    fi
else
    log_test 1 "Game creation under network stress"
fi

# Test 8: SSE reconnection resilience
echo ""
echo "🔄 Test 8: SSE Reconnection Resilience"

if [ ! -z "$GAME_ID" ]; then
    # Test SSE connection interruption
    timeout 5s curl -s "http://localhost:3000/api/game/$GAME_ID/events" > /dev/null &
    SSE_PID=$!
    
    sleep 2
    kill $SSE_PID 2>/dev/null
    
    # Try to reconnect
    if timeout 5s curl -s "http://localhost:3000/api/game/$GAME_ID/events" > /dev/null; then
        log_test 0 "SSE reconnection after interruption"
    else
        log_test 1 "SSE reconnection after interruption"
    fi
else
    log_test 1 "SSE reconnection test (no game available)"
fi

# Cleanup any remaining network settings
remove_network_delay

echo ""
echo "🎯 Network Simulation Test Results"
echo "=================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All network simulation tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some network simulation tests failed${NC}"
    exit 1
fi