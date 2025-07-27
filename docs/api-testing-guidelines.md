# API Testing Guidelines

## 🎯 **MANDATORY: Use api-test.sh First**

**ALWAYS use `./scripts/api-test.sh` for API debugging and testing. Only use individual bash commands as a last resort.**

## When to Use Each Approach

### ✅ **Use api-test.sh for:**
- **All API debugging** - Use `debug`, `trace_error`, `test_sse` operations
- **Health checks** - Use `health_check`, `validate_all`  
- **Game flow testing** - Use scenarios and game operations
- **Endpoint validation** - Use comprehensive validation operations
- **SSE testing** - Use `test_sse` for real-time functionality
- **Quick setup** - Use `quick` for rapid game creation

### ⚠️ **Only use individual bash commands when:**
- api-test.sh doesn't have the required functionality
- You need very specific curl options not supported by the script
- Testing non-API functionality (file operations, etc.)
- **MUST ask permission first** - explain why api-test.sh is insufficient

## Common Debugging Workflows

### 🔍 **Debugging Unknown Issues**
```bash
# 1. Start with health check
./scripts/api-test.sh health_check

# 2. Comprehensive validation
./scripts/api-test.sh validate_all

# 3. Test specific endpoint that's failing
./scripts/api-test.sh debug "/api/problematic/endpoint"
```

### 🎮 **Game Flow Issues**
```bash
# 1. Test complete game flow
./scripts/api-test.sh scenario basic_flow

# 2. Test specific action scenarios
./scripts/api-test.sh scenario all_in_raise

# 3. Debug specific game operation
eval $(./scripts/api-test.sh quick TestPlayer1 TestPlayer2)
./scripts/api-test.sh debug "/api/game/$GAME_ID/action" -X POST -H "Content-Type: application/json" -d '{"playerId":"'$PLAYER1_ID'","action":"call"}'
```

### 🔄 **SSE/Real-time Issues**
```bash
# 1. Test SSE endpoint specifically
./scripts/api-test.sh test_sse

# 2. Test with specific game
eval $(./scripts/api-test.sh quick)
./scripts/api-test.sh test_sse $GAME_ID

# 3. Trace SSE errors
./scripts/api-test.sh trace_error "/api/game/$GAME_ID/events"
```

### 🚨 **Internal Server Errors**
```bash
# 1. Validate all endpoints first
./scripts/api-test.sh validate_all

# 2. Debug the specific failing endpoint
./scripts/api-test.sh debug "/api/failing/endpoint"

# 3. Get full error trace
./scripts/api-test.sh trace_error "/api/failing/endpoint"
```

## Available Operations

### **Core Operations**
- `create_game` - Create test games
- `deal` - Deal cards to games  
- `get_game` - Retrieve game state
- `player_action` - Execute game actions
- `quick` - Rapid game setup with env vars

### **Debugging Operations**
- `debug <endpoint>` - Full endpoint debugging with timing/status
- `health_check` - Basic endpoint health verification
- `test_sse [game_id]` - SSE endpoint testing and validation
- `validate_all` - Comprehensive endpoint validation
- `trace_error <endpoint>` - Maximum verbosity error tracing
- `verbose <operation>` - Run any operation with debug output

### **Scenarios**
- `scenario basic_flow` - Complete game flow testing
- `scenario all_in_raise` - All-in scenarios
- `scenario betting_round` - Betting logic testing

## Error Resolution Process

### 1. **Identify the Issue**
```bash
./scripts/api-test.sh validate_all
```

### 2. **Debug Specific Endpoint**
```bash
./scripts/api-test.sh debug "/api/problematic/endpoint"
```

### 3. **Get Detailed Error Info**
```bash
./scripts/api-test.sh trace_error "/api/problematic/endpoint"
```

### 4. **Test Game Flow (if game-related)**
```bash
./scripts/api-test.sh scenario basic_flow
```

### 5. **Fix and Verify**
```bash
# After making fixes
./scripts/api-test.sh health_check
./scripts/api-test.sh validate_all
```

## Benefits of Using api-test.sh

✅ **No permission prompts** - Runs without interrupting debugging flow  
✅ **Consistent testing** - Standardized approach across all debugging  
✅ **Rich output** - Detailed timing, status, and error information  
✅ **Game context** - Built-in game creation and setup utilities  
✅ **SSE support** - Specialized real-time testing capabilities  
✅ **Comprehensive validation** - Full endpoint and flow testing  
✅ **Reusable scenarios** - Pre-built test cases for common issues  

## Migration from Individual Commands

### ❌ **Instead of:**
```bash
curl -v http://localhost:3000/api/game/create
```

### ✅ **Use:**
```bash
./scripts/api-test.sh debug "/api/game/create" -X POST -H "Content-Type: application/json" -d '{"playerNames":["Test1","Test2"]}'
```

### ❌ **Instead of:**
```bash
curl -s http://localhost:3000/api/game/$GAME_ID/events
```

### ✅ **Use:**
```bash
./scripts/api-test.sh test_sse $GAME_ID
```

This approach eliminates permission prompts and provides much richer debugging information.