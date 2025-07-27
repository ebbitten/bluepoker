#!/bin/bash

# PERSISTENCE PERFORMANCE BENCHMARKING
# Tests performance requirements for Increment 4 persistence functionality
# Requirements from specification:
# - Game state persistence: < 50ms per operation
# - Game state restoration: < 100ms
# - Reconnection flow: < 500ms total

set -e

echo "⚡ PERSISTENCE PERFORMANCE BENCHMARKING"
echo "======================================"
echo ""
echo "Testing performance requirements:"
echo "📊 Persistence: < 50ms per operation"
echo "📊 Restoration: < 100ms per operation"
echo "📊 Reconnection: < 500ms total"
echo "📊 Token generation: < 100ms per operation"
echo ""

# Performance test results
PERSIST_TIMES=()
RESTORE_TIMES=()
TOKEN_TIMES=()
RECONNECT_TIMES=()

# Test configuration
NUM_TESTS=10
TEST_GAME_ID=""

# Helper functions
benchmark_operation() {
    local operation_name="$1"
    local operation_command="$2"
    local expected_max_time="$3"
    
    echo -n "Testing $operation_name performance... "
    
    local start_time=$(date +%s%3N)
    eval "$operation_command" > /dev/null 2>&1
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    echo "${duration}ms"
    
    if [ $duration -lt $expected_max_time ]; then
        echo "  ✅ PASS (< ${expected_max_time}ms)"
        return 0
    else
        echo "  ⚠️  SLOW (> ${expected_max_time}ms)"
        return 1
    fi
}

create_test_game() {
    echo "🎮 Creating test game for performance testing..."
    ./scripts/api-test.sh create_game "PerfTest1" "PerfTest2" > /tmp/perf_game.json
    
    if grep -q '"gameId"' /tmp/perf_game.json; then
        TEST_GAME_ID=$(grep '"gameId"' /tmp/perf_game.json | sed 's/.*"gameId":"\([^"]*\)".*/\1/')
        echo "✅ Test game created: $TEST_GAME_ID"
        return 0
    else
        echo "❌ Failed to create test game"
        return 1
    fi
}

benchmark_persistence() {
    echo ""
    echo "💾 PERSISTENCE PERFORMANCE TESTING"
    echo "=================================="
    
    if [ -z "$TEST_GAME_ID" ]; then
        echo "❌ No test game available"
        return 1
    fi
    
    local total_time=0
    local passed_tests=0
    
    echo "Running $NUM_TESTS persistence operations..."
    
    for i in $(seq 1 $NUM_TESTS); do
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh persist_game "$TEST_GAME_ID" > /tmp/perf_persist_$i.json 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        PERSIST_TIMES+=($duration)
        total_time=$((total_time + duration))
        
        echo -n "  Test $i: ${duration}ms"
        if [ $duration -lt 50 ]; then
            echo " ✅"
            passed_tests=$((passed_tests + 1))
        else
            echo " ⚠️"
        fi
    done
    
    local avg_time=$((total_time / NUM_TESTS))
    echo ""
    echo "📊 Persistence Performance Results:"
    echo "   Average time: ${avg_time}ms"
    echo "   Passed tests: $passed_tests/$NUM_TESTS"
    echo "   Target: < 50ms per operation"
    
    if [ $avg_time -lt 50 ]; then
        echo "   ✅ PERFORMANCE TARGET MET"
        return 0
    else
        echo "   ⚠️  PERFORMANCE NEEDS OPTIMIZATION"
        return 1
    fi
}

benchmark_restoration() {
    echo ""
    echo "📥 RESTORATION PERFORMANCE TESTING"
    echo "=================================="
    
    if [ -z "$TEST_GAME_ID" ]; then
        echo "❌ No test game available"
        return 1
    fi
    
    local total_time=0
    local passed_tests=0
    
    echo "Running $NUM_TESTS restoration operations..."
    
    for i in $(seq 1 $NUM_TESTS); do
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh restore_game "$TEST_GAME_ID" > /tmp/perf_restore_$i.json 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        RESTORE_TIMES+=($duration)
        total_time=$((total_time + duration))
        
        echo -n "  Test $i: ${duration}ms"
        if [ $duration -lt 100 ]; then
            echo " ✅"
            passed_tests=$((passed_tests + 1))
        else
            echo " ⚠️"
        fi
    done
    
    local avg_time=$((total_time / NUM_TESTS))
    echo ""
    echo "📊 Restoration Performance Results:"
    echo "   Average time: ${avg_time}ms"
    echo "   Passed tests: $passed_tests/$NUM_TESTS"
    echo "   Target: < 100ms per operation"
    
    if [ $avg_time -lt 100 ]; then
        echo "   ✅ PERFORMANCE TARGET MET"
        return 0
    else
        echo "   ⚠️  PERFORMANCE NEEDS OPTIMIZATION"
        return 1
    fi
}

benchmark_token_generation() {
    echo ""
    echo "🔐 TOKEN GENERATION PERFORMANCE TESTING"
    echo "======================================="
    
    if [ -z "$TEST_GAME_ID" ]; then
        echo "❌ No test game available"
        return 1
    fi
    
    local total_time=0
    local passed_tests=0
    
    echo "Running $NUM_TESTS token generation operations..."
    
    for i in $(seq 1 $NUM_TESTS); do
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh connection_token "$TEST_GAME_ID" "player-1" > /tmp/perf_token_$i.json 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        TOKEN_TIMES+=($duration)
        total_time=$((total_time + duration))
        
        echo -n "  Test $i: ${duration}ms"
        if [ $duration -lt 100 ]; then
            echo " ✅"
            passed_tests=$((passed_tests + 1))
        else
            echo " ⚠️"
        fi
    done
    
    local avg_time=$((total_time / NUM_TESTS))
    echo ""
    echo "📊 Token Generation Performance Results:"
    echo "   Average time: ${avg_time}ms"
    echo "   Passed tests: $passed_tests/$NUM_TESTS"
    echo "   Target: < 100ms per operation"
    
    if [ $avg_time -lt 100 ]; then
        echo "   ✅ PERFORMANCE TARGET MET"
        return 0
    else
        echo "   ⚠️  PERFORMANCE NEEDS OPTIMIZATION"
        return 1
    fi
}

benchmark_reconnection() {
    echo ""
    echo "🔌 RECONNECTION PERFORMANCE TESTING"
    echo "==================================="
    
    if [ -z "$TEST_GAME_ID" ]; then
        echo "❌ No test game available"
        return 1
    fi
    
    local total_time=0
    local passed_tests=0
    
    echo "Running $NUM_TESTS reconnection operations..."
    
    for i in $(seq 1 $NUM_TESTS); do
        local start_time=$(date +%s%3N)
        ./scripts/api-test.sh reconnect_player "$TEST_GAME_ID" "player-1" "test-token-$i" > /tmp/perf_reconnect_$i.json 2>&1
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        RECONNECT_TIMES+=($duration)
        total_time=$((total_time + duration))
        
        echo -n "  Test $i: ${duration}ms"
        if [ $duration -lt 500 ]; then
            echo " ✅"
            passed_tests=$((passed_tests + 1))
        else
            echo " ⚠️"
        fi
    done
    
    local avg_time=$((total_time / NUM_TESTS))
    echo ""
    echo "📊 Reconnection Performance Results:"
    echo "   Average time: ${avg_time}ms"
    echo "   Passed tests: $passed_tests/$NUM_TESTS"
    echo "   Target: < 500ms per operation"
    
    if [ $avg_time -lt 500 ]; then
        echo "   ✅ PERFORMANCE TARGET MET"
        return 0
    else
        echo "   ⚠️  PERFORMANCE NEEDS OPTIMIZATION"
        return 1
    fi
}

benchmark_complete_workflow() {
    echo ""
    echo "🔄 COMPLETE WORKFLOW PERFORMANCE TESTING"
    echo "========================================"
    
    if [ -z "$TEST_GAME_ID" ]; then
        echo "❌ No test game available"
        return 1
    fi
    
    echo "Testing complete persist → restore → reconnect workflow..."
    
    local workflow_start=$(date +%s%3N)
    
    # Step 1: Persistence
    local persist_start=$(date +%s%3N)
    ./scripts/api-test.sh persist_game "$TEST_GAME_ID" > /tmp/workflow_persist.json 2>&1
    local persist_end=$(date +%s%3N)
    local persist_time=$((persist_end - persist_start))
    
    # Step 2: Token generation
    local token_start=$(date +%s%3N)
    ./scripts/api-test.sh connection_token "$TEST_GAME_ID" "player-1" > /tmp/workflow_token.json 2>&1
    local token_end=$(date +%s%3N)
    local token_time=$((token_end - token_start))
    
    # Step 3: Restoration
    local restore_start=$(date +%s%3N)
    ./scripts/api-test.sh restore_game "$TEST_GAME_ID" > /tmp/workflow_restore.json 2>&1
    local restore_end=$(date +%s%3N)
    local restore_time=$((restore_end - restore_start))
    
    # Step 4: Reconnection
    local reconnect_start=$(date +%s%3N)
    ./scripts/api-test.sh reconnect_player "$TEST_GAME_ID" "player-1" "workflow-token" > /tmp/workflow_reconnect.json 2>&1
    local reconnect_end=$(date +%s%3N)
    local reconnect_time=$((reconnect_end - reconnect_start))
    
    local workflow_end=$(date +%s%3N)
    local total_workflow_time=$((workflow_end - workflow_start))
    
    echo ""
    echo "📊 Complete Workflow Performance:"
    echo "   Persist:    ${persist_time}ms"
    echo "   Token Gen:  ${token_time}ms"
    echo "   Restore:    ${restore_time}ms"
    echo "   Reconnect:  ${reconnect_time}ms"
    echo "   Total:      ${total_workflow_time}ms"
    echo ""
    
    # Check individual targets
    local issues=0
    if [ $persist_time -gt 50 ]; then
        echo "   ⚠️  Persistence time exceeded target (${persist_time}ms > 50ms)"
        issues=$((issues + 1))
    fi
    
    if [ $restore_time -gt 100 ]; then
        echo "   ⚠️  Restoration time exceeded target (${restore_time}ms > 100ms)"
        issues=$((issues + 1))
    fi
    
    if [ $reconnect_time -gt 500 ]; then
        echo "   ⚠️  Reconnection time exceeded target (${reconnect_time}ms > 500ms)"
        issues=$((issues + 1))
    fi
    
    if [ $total_workflow_time -gt 1000 ]; then
        echo "   ⚠️  Total workflow time high (${total_workflow_time}ms > 1000ms)"
        issues=$((issues + 1))
    fi
    
    if [ $issues -eq 0 ]; then
        echo "   ✅ ALL WORKFLOW PERFORMANCE TARGETS MET"
        return 0
    else
        echo "   ⚠️  $issues PERFORMANCE ISSUES DETECTED"
        return 1
    fi
}

generate_performance_report() {
    echo ""
    echo "📈 PERFORMANCE BENCHMARKING REPORT"
    echo "=================================="
    echo ""
    
    # Calculate statistics
    local persist_avg=0
    local restore_avg=0
    local token_avg=0
    local reconnect_avg=0
    
    if [ ${#PERSIST_TIMES[@]} -gt 0 ]; then
        local persist_total=0
        for time in "${PERSIST_TIMES[@]}"; do
            persist_total=$((persist_total + time))
        done
        persist_avg=$((persist_total / ${#PERSIST_TIMES[@]}))
    fi
    
    if [ ${#RESTORE_TIMES[@]} -gt 0 ]; then
        local restore_total=0
        for time in "${RESTORE_TIMES[@]}"; do
            restore_total=$((restore_total + time))
        done
        restore_avg=$((restore_total / ${#RESTORE_TIMES[@]}))
    fi
    
    if [ ${#TOKEN_TIMES[@]} -gt 0 ]; then
        local token_total=0
        for time in "${TOKEN_TIMES[@]}"; do
            token_total=$((token_total + time))
        done
        token_avg=$((token_total / ${#TOKEN_TIMES[@]}))
    fi
    
    if [ ${#RECONNECT_TIMES[@]} -gt 0 ]; then
        local reconnect_total=0
        for time in "${RECONNECT_TIMES[@]}"; do
            reconnect_total=$((reconnect_total + time))
        done
        reconnect_avg=$((reconnect_total / ${#RECONNECT_TIMES[@]}))
    fi
    
    echo "📊 PERFORMANCE SUMMARY:"
    echo "========================"
    echo "Operation               | Average | Target  | Status"
    echo "------------------------|---------|---------|--------"
    printf "Persistence             | %4dms  | < 50ms  | " $persist_avg
    if [ $persist_avg -lt 50 ]; then echo "✅ PASS"; else echo "⚠️ SLOW"; fi
    
    printf "Restoration             | %4dms  | <100ms  | " $restore_avg
    if [ $restore_avg -lt 100 ]; then echo "✅ PASS"; else echo "⚠️ SLOW"; fi
    
    printf "Token Generation        | %4dms  | <100ms  | " $token_avg
    if [ $token_avg -lt 100 ]; then echo "✅ PASS"; else echo "⚠️ SLOW"; fi
    
    printf "Reconnection            | %4dms  | <500ms  | " $reconnect_avg
    if [ $reconnect_avg -lt 500 ]; then echo "✅ PASS"; else echo "⚠️ SLOW"; fi
    
    echo ""
    echo "📝 RECOMMENDATIONS:"
    echo "==================="
    
    if [ $persist_avg -gt 50 ]; then
        echo "⚠️  Persistence performance needs optimization"
        echo "   - Consider database connection pooling"
        echo "   - Optimize JSONB serialization"
        echo "   - Review database indexes"
    fi
    
    if [ $restore_avg -gt 100 ]; then
        echo "⚠️  Restoration performance needs optimization"
        echo "   - Consider caching strategies"
        echo "   - Optimize database queries"
        echo "   - Review JSONB deserialization"
    fi
    
    if [ $token_avg -gt 100 ]; then
        echo "⚠️  Token generation performance needs optimization"
        echo "   - Consider token caching"
        echo "   - Optimize cryptographic operations"
        echo "   - Review database insert performance"
    fi
    
    if [ $reconnect_avg -gt 500 ]; then
        echo "⚠️  Reconnection performance needs optimization"
        echo "   - Combine token validation and game restoration"
        echo "   - Optimize state synchronization"
        echo "   - Consider connection pooling"
    fi
    
    local all_targets_met=true
    if [ $persist_avg -gt 50 ] || [ $restore_avg -gt 100 ] || [ $token_avg -gt 100 ] || [ $reconnect_avg -gt 500 ]; then
        all_targets_met=false
    fi
    
    echo ""
    if [ "$all_targets_met" = true ]; then
        echo "🎉 ALL PERFORMANCE TARGETS MET!"
        echo "✅ System ready for production deployment"
    else
        echo "⚠️  Some performance targets not met"
        echo "📈 Performance optimization recommended before production"
    fi
}

# Main execution
main() {
    echo "Starting persistence performance benchmarking..."
    echo ""
    
    # Create test game
    if ! create_test_game; then
        echo "❌ Cannot proceed without test game"
        exit 1
    fi
    
    # Run performance tests
    local failed_tests=0
    
    if ! benchmark_persistence; then
        failed_tests=$((failed_tests + 1))
    fi
    
    if ! benchmark_restoration; then
        failed_tests=$((failed_tests + 1))
    fi
    
    if ! benchmark_token_generation; then
        failed_tests=$((failed_tests + 1))
    fi
    
    if ! benchmark_reconnection; then
        failed_tests=$((failed_tests + 1))
    fi
    
    if ! benchmark_complete_workflow; then
        failed_tests=$((failed_tests + 1))
    fi
    
    # Generate final report
    generate_performance_report
    
    echo ""
    if [ $failed_tests -eq 0 ]; then
        echo "🏆 ALL PERFORMANCE BENCHMARKS PASSED!"
        exit 0
    else
        echo "⚠️  $failed_tests performance benchmark(s) failed"
        echo "📊 See report above for optimization recommendations"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up performance test files..."
    rm -f /tmp/perf_*.json /tmp/workflow_*.json
    echo "✅ Cleanup completed"
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main benchmarking
main "$@"