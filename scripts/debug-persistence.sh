#!/bin/bash

# PERSISTENCE & RECONNECT DEBUGGING TOOLS
# Specialized debugging utilities for Increment 4 persistence functionality
# Uses BULLETPROOF safe bash patterns - ZERO permission prompts

set -e

echo "🔍 PERSISTENCE & RECONNECT DEBUGGING TOOLS"
echo "=========================================="
echo ""

# Helper functions for safe debugging
debug_persistence_api() {
    local game_id="$1"
    
    echo "🎮 DEBUGGING PERSISTENCE API FOR GAME: $game_id"
    echo "================================================"
    
    # Test persistence endpoint
    echo ""
    echo "📝 Testing POST /api/game/$game_id/persist"
    echo "-------------------------------------------"
    ./scripts/api-test.sh debug "/api/game/$game_id/persist" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"gameId\":\"$game_id\"}"
    
    echo ""
    echo "📥 Testing GET /api/game/$game_id/restore"
    echo "-----------------------------------------"
    ./scripts/api-test.sh debug "/api/game/$game_id/restore"
    
    echo ""
    echo "🗑️ Testing DELETE /api/game/$game_id/persist"
    echo "--------------------------------------------"
    ./scripts/api-test.sh debug "/api/game/$game_id/persist" -X DELETE
}

debug_connection_token_api() {
    local game_id="$1"
    local player_id="${2:-player-1}"
    
    echo ""
    echo "🔐 DEBUGGING CONNECTION TOKEN API"
    echo "================================="
    echo ""
    
    echo "🎫 Testing GET /api/game/$game_id/connection-token?playerId=$player_id"
    echo "--------------------------------------------------------------------"
    ./scripts/api-test.sh debug "/api/game/$game_id/connection-token?playerId=$player_id"
}

debug_reconnection_api() {
    local game_id="$1"
    local player_id="${2:-player-1}"
    local token="${3:-test-debug-token}"
    
    echo ""
    echo "🔌 DEBUGGING RECONNECTION API"
    echo "============================="
    echo ""
    
    echo "🔗 Testing POST /api/game/$game_id/reconnect"
    echo "--------------------------------------------"
    ./scripts/api-test.sh debug "/api/game/$game_id/reconnect" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"playerId\":\"$player_id\",\"reconnectToken\":\"$token\"}"
}

debug_complete_workflow() {
    local game_id="$1"
    
    echo ""
    echo "🔄 DEBUGGING COMPLETE PERSISTENCE WORKFLOW"
    echo "=========================================="
    echo ""
    
    echo "Step 1: Create test game for debugging..."
    ./scripts/api-test.sh create_game "DebugPlayer1" "DebugPlayer2" > /tmp/debug_game.json
    
    if grep -q '"gameId"' /tmp/debug_game.json; then
        local created_game_id=$(grep '"gameId"' /tmp/debug_game.json | sed 's/.*"gameId":"\([^"]*\)".*/\1/')
        echo "✅ Created game: $created_game_id"
        
        echo ""
        echo "Step 2: Deal cards to advance game state..."
        ./scripts/api-test.sh deal "$created_game_id" > /tmp/debug_deal.json
        
        echo ""
        echo "Step 3: Test persistence workflow..."
        debug_persistence_api "$created_game_id"
        debug_connection_token_api "$created_game_id" "player-1"
        debug_reconnection_api "$created_game_id" "player-1" "debug-token-123"
        
        echo ""
        echo "Step 4: Cleanup test game..."
        ./scripts/api-test.sh cleanup_game "$created_game_id" > /tmp/debug_cleanup.json
        echo "✅ Workflow debugging completed"
    else
        echo "❌ Failed to create test game for debugging"
        return 1
    fi
}

debug_persistence_status() {
    echo ""
    echo "📊 PERSISTENCE SYSTEM STATUS CHECK"
    echo "=================================="
    echo ""
    
    # Check if APIs are responding
    echo "🔍 Checking API endpoints availability..."
    echo ""
    
    # Create a test game for status checks
    ./scripts/api-test.sh create_game "StatusTest1" "StatusTest2" > /tmp/status_game.json
    
    if grep -q '"gameId"' /tmp/status_game.json; then
        local test_game_id=$(grep '"gameId"' /tmp/status_game.json | sed 's/.*"gameId":"\([^"]*\)".*/\1/')
        echo "✅ Test game created: $test_game_id"
        
        # Test each persistence endpoint
        echo ""
        echo "🔍 Persistence Endpoint Status:"
        ./scripts/api-test.sh status_check "/api/game/$test_game_id/persist" > /tmp/persist_status.txt
        local persist_status=$(cat /tmp/persist_status.txt)
        echo "   POST /api/game/:gameId/persist - HTTP $persist_status"
        
        echo ""
        echo "🔍 Restoration Endpoint Status:"
        ./scripts/api-test.sh status_check "/api/game/$test_game_id/restore" > /tmp/restore_status.txt
        local restore_status=$(cat /tmp/restore_status.txt)
        echo "   GET /api/game/:gameId/restore - HTTP $restore_status"
        
        echo ""
        echo "🔍 Connection Token Endpoint Status:"
        ./scripts/api-test.sh status_check "/api/game/$test_game_id/connection-token?playerId=player-1" > /tmp/token_status.txt
        local token_status=$(cat /tmp/token_status.txt)
        echo "   GET /api/game/:gameId/connection-token - HTTP $token_status"
        
        echo ""
        echo "🔍 Reconnection Endpoint Status:"
        ./scripts/api-test.sh status_check "/api/game/$test_game_id/reconnect" > /tmp/reconnect_status.txt
        local reconnect_status=$(cat /tmp/reconnect_status.txt)
        echo "   POST /api/game/:gameId/reconnect - HTTP $reconnect_status"
        
        echo ""
        echo "📊 Status Summary:"
        echo "=================="
        
        if [ "$persist_status" = "404" ]; then
            echo "❌ Persistence API not found"
        elif [ "$persist_status" = "405" ]; then
            echo "⚠️  Persistence API exists but method not allowed (check implementation)"
        elif [ "$persist_status" = "200" ]; then
            echo "✅ Persistence API working"
        else
            echo "⚠️  Persistence API responding (HTTP $persist_status)"
        fi
        
        if [ "$restore_status" = "404" ]; then
            echo "❌ Restoration API not found"
        elif [ "$restore_status" = "200" ]; then
            echo "✅ Restoration API working"
        else
            echo "⚠️  Restoration API responding (HTTP $restore_status)"
        fi
        
        if [ "$token_status" = "404" ]; then
            echo "❌ Connection Token API not found"
        elif [ "$token_status" = "200" ]; then
            echo "✅ Connection Token API working"
        else
            echo "⚠️  Connection Token API responding (HTTP $token_status)"
        fi
        
        if [ "$reconnect_status" = "404" ]; then
            echo "❌ Reconnection API not found"
        elif [ "$reconnect_status" = "405" ]; then
            echo "⚠️  Reconnection API exists but method not allowed (check implementation)"
        elif [ "$reconnect_status" = "200" ]; then
            echo "✅ Reconnection API working"
        else
            echo "⚠️  Reconnection API responding (HTTP $reconnect_status)"
        fi
        
    else
        echo "❌ Cannot check persistence status - game creation failed"
        return 1
    fi
}

debug_performance_quick() {
    echo ""
    echo "⚡ QUICK PERSISTENCE PERFORMANCE CHECK"
    echo "====================================="
    echo ""
    
    # Create test game for performance check
    ./scripts/api-test.sh create_game "PerfCheck1" "PerfCheck2" > /tmp/perf_check_game.json
    
    if grep -q '"gameId"' /tmp/perf_check_game.json; then
        local perf_game_id=$(grep '"gameId"' /tmp/perf_check_game.json | sed 's/.*"gameId":"\([^"]*\)".*/\1/')
        
        echo "🎮 Testing with game: $perf_game_id"
        echo ""
        
        # Quick persistence performance test
        echo "📝 Testing persistence performance..."
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh persist_game "$perf_game_id" > /tmp/perf_persist.json 2>&1
        local end_time=$(date +%s%3N)
        local persist_duration=$((end_time - start_time))
        
        echo "   Persistence time: ${persist_duration}ms"
        if [ $persist_duration -lt 100 ]; then
            echo "   ✅ Good performance"
        else
            echo "   ⚠️  May need optimization"
        fi
        
        # Quick restoration performance test
        echo ""
        echo "📥 Testing restoration performance..."
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh restore_game "$perf_game_id" > /tmp/perf_restore.json 2>&1
        local end_time=$(date +%s%3N)
        local restore_duration=$((end_time - start_time))
        
        echo "   Restoration time: ${restore_duration}ms"
        if [ $restore_duration -lt 200 ]; then
            echo "   ✅ Good performance"
        else
            echo "   ⚠️  May need optimization"
        fi
        
        # Quick token generation performance test
        echo ""
        echo "🔐 Testing token generation performance..."
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh connection_token "$perf_game_id" "player-1" > /tmp/perf_token.json 2>&1
        local end_time=$(date +%s%3N)
        local token_duration=$((end_time - start_time))
        
        echo "   Token generation time: ${token_duration}ms"
        if [ $token_duration -lt 150 ]; then
            echo "   ✅ Good performance"
        else
            echo "   ⚠️  May need optimization"
        fi
        
        echo ""
        echo "📊 Quick Performance Summary:"
        echo "   Persistence: ${persist_duration}ms (target: <50ms production)"
        echo "   Restoration: ${restore_duration}ms (target: <100ms production)"
        echo "   Token Gen:   ${token_duration}ms (target: <100ms production)"
        
    else
        echo "❌ Cannot run performance check - game creation failed"
        return 1
    fi
}

debug_database_connection() {
    echo ""
    echo "🗄️ DATABASE CONNECTION DEBUGGING"
    echo "==============================="
    echo ""
    
    echo "🔍 Testing database connection through persistence layer..."
    
    # Try a simple persistence operation to test database connectivity
    ./scripts/api-test.sh create_game "DBTest1" "DBTest2" > /tmp/db_test_game.json
    
    if grep -q '"gameId"' /tmp/db_test_game.json; then
        local db_test_game_id=$(grep '"gameId"' /tmp/db_test_game.json | sed 's/.*"gameId":"\([^"]*\)".*/\1/')
        
        echo "🎮 Testing database operations with game: $db_test_game_id"
        echo ""
        
        # Test database write (persistence)
        echo "📝 Testing database write (persistence)..."
        ./scripts/api-test.sh persist_game "$db_test_game_id" > /tmp/db_persist_test.json 2>&1
        
        if grep -q '"error"' /tmp/db_persist_test.json; then
            echo "   ⚠️  Database write test shows errors:"
            cat /tmp/db_persist_test.json | head -3 | sed 's/^/      /'
            
            if grep -q "Persistence service unavailable" /tmp/db_persist_test.json; then
                echo "   ✅ Graceful degradation working (expected when Supabase not configured)"
            else
                echo "   ❌ Unexpected database error"
            fi
        else
            echo "   ✅ Database write operation completed"
        fi
        
        # Test database read (restoration)
        echo ""
        echo "📥 Testing database read (restoration)..."
        ./scripts/api-test.sh restore_game "$db_test_game_id" > /tmp/db_restore_test.json 2>&1
        
        if grep -q '"error"' /tmp/db_restore_test.json; then
            echo "   ⚠️  Database read test shows errors:"
            cat /tmp/db_restore_test.json | head -3 | sed 's/^/      /'
        else
            echo "   ✅ Database read operation completed"
        fi
        
        echo ""
        echo "📊 Database Connection Summary:"
        echo "==============================="
        echo ""
        
        if grep -q "Persistence service unavailable" /tmp/db_persist_test.json; then
            echo "📌 STATUS: Persistence service running in graceful degradation mode"
            echo "   ✅ Core game functionality unaffected"
            echo "   ⚠️  Persistence features disabled (Supabase not configured)"
            echo "   📝 To enable: Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
        else
            echo "📌 STATUS: Persistence service attempting database operations"
            echo "   🔍 Check logs above for detailed connection status"
        fi
        
    else
        echo "❌ Cannot test database connection - game creation failed"
        return 1
    fi
}

show_debug_help() {
    cat << EOF
🔍 PERSISTENCE & RECONNECT DEBUGGING TOOLS
==========================================

USAGE:
    ./scripts/debug-persistence.sh <command> [args...]

AVAILABLE COMMANDS:
    status                      Check all persistence API endpoints status
    quick-perf                  Quick performance check for all operations
    database                    Test database connection and operations
    workflow [game-id]          Debug complete persistence workflow
    persist <game-id>           Debug persistence API for specific game
    tokens <game-id> [player]   Debug connection token API
    reconnect <game-id> [player] [token]
                               Debug reconnection API

EXAMPLES:
    # Check overall system status
    ./scripts/debug-persistence.sh status
    
    # Quick performance validation
    ./scripts/debug-persistence.sh quick-perf
    
    # Test database connectivity
    ./scripts/debug-persistence.sh database
    
    # Debug complete workflow
    ./scripts/debug-persistence.sh workflow
    
    # Debug specific game persistence
    ./scripts/debug-persistence.sh persist game-123
    
    # Debug token generation
    ./scripts/debug-persistence.sh tokens game-123 player-1

NOTE: All debugging uses safe bash patterns - no permission prompts expected.

EOF
}

# Main command dispatch
main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        "status")
            debug_persistence_status
            ;;
        "quick-perf")
            debug_performance_quick
            ;;
        "database")
            debug_database_connection
            ;;
        "workflow")
            local game_id="${1:-}"
            if [ -n "$game_id" ]; then
                debug_persistence_api "$game_id"
                debug_connection_token_api "$game_id"
                debug_reconnection_api "$game_id"
            else
                debug_complete_workflow
            fi
            ;;
        "persist")
            local game_id="$1"
            if [ -z "$game_id" ]; then
                echo "❌ Game ID required for persistence debugging"
                echo "Usage: $0 persist <game-id>"
                exit 1
            fi
            debug_persistence_api "$game_id"
            ;;
        "tokens")
            local game_id="$1"
            local player_id="${2:-player-1}"
            if [ -z "$game_id" ]; then
                echo "❌ Game ID required for token debugging"
                echo "Usage: $0 tokens <game-id> [player-id]"
                exit 1
            fi
            debug_connection_token_api "$game_id" "$player_id"
            ;;
        "reconnect")
            local game_id="$1"
            local player_id="${2:-player-1}"
            local token="${3:-test-debug-token}"
            if [ -z "$game_id" ]; then
                echo "❌ Game ID required for reconnection debugging"
                echo "Usage: $0 reconnect <game-id> [player-id] [token]"
                exit 1
            fi
            debug_reconnection_api "$game_id" "$player_id" "$token"
            ;;
        "help"|"--help"|"-h")
            show_debug_help
            ;;
        *)
            echo "❌ Unknown command: $command"
            echo "Use 'help' for available commands"
            exit 1
            ;;
    esac
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up debug files..."
    rm -f /tmp/debug_*.json /tmp/status_*.txt /tmp/perf_*.json
    rm -f /tmp/db_*.json /tmp/*_status.txt
    echo "✅ Debug cleanup completed"
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main command
main "$@"