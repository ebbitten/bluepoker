#!/bin/bash

# BULLETPROOF server management script  
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
echo "🚀 Ensuring dev server is running..."

# Kill any existing dev servers
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start server in background
echo "📡 Starting dev server..."
pnpm dev > /tmp/next-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready (max 30 seconds)
echo "⏱️  Waiting for server to be ready..."
for i in {1..30}; do
    # Use temp file instead of pipe with grep
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ > /tmp/server_status.txt
    if grep -q "200" /tmp/server_status.txt; then
        echo "✅ Server is ready on http://localhost:3000"
        rm -f /tmp/server_status.txt
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo "❌ Server failed to start within 30 seconds"
echo "📋 Server logs:"
tail -20 /tmp/next-server.log
rm -f /tmp/server_status.txt
exit 1