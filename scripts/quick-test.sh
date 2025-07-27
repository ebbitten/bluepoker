#!/bin/bash

# BULLETPROOF Quick validation script for immediate human testing
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
echo "🔥 QUICK PRE-TEST VALIDATION"
echo "============================="

./scripts/ensure-server.sh

echo ""
echo "🎯 API Checks:"

# Safe status checks using temp files instead of command substitution
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ > /tmp/server_status.txt
echo -n "✅ Server: "
cat /tmp/server_status.txt

curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/table > /tmp/table_status.txt
echo -n "✅ Table:  "
cat /tmp/table_status.txt

# Create simple JSON file for API test
echo '{"playerNames":["Test1","Test2"]}' > /tmp/test_game.json
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/game/create -X POST -H 'Content-Type: application/json' -d @/tmp/test_game.json > /tmp/api_status.txt
echo -n "✅ API:    "
cat /tmp/api_status.txt

echo ""
echo ""
echo "🎯 Critical E2E Validation:"
echo "📋 Running browser tests..."

# Run only the most critical E2E test to catch "No game data available" errors
npx playwright test tests/e2e/game-creation-and-join.spec.ts --project=chromium --timeout=30000 --quiet

E2E_EXIT_CODE=$?

echo ""
if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E: User journey works"
    echo ""
    echo "🎮 READY FOR HUMAN TESTING!"
    echo "   → Table UI: http://localhost:3000/table"
    echo "   → Deck UI:  http://localhost:3000/deck"
    echo ""
    echo "🔍 For comprehensive testing, run: ./scripts/pre-test-validation.sh"
else
    echo "❌ E2E: Critical user journey FAILED"
    echo ""
    echo "🚨 NOT READY FOR HUMAN TESTING!"
    echo "   Fix E2E test failures before proceeding"
    echo "   Run 'pnpm test:e2e' for detailed results"
    exit 1
fi

# Clean up temp files
rm -f /tmp/server_status.txt /tmp/table_status.txt /tmp/api_status.txt /tmp/test_game.json