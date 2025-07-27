# Testing Guidelines: NEVER Trigger Permission Prompts (P0 PRIORITY)

## PURPOSE - P0 PRIORITY
This document establishes mandatory restrictions for bash commands to **NEVER TRIGGER USER PERMISSION PROMPTS**. This is the highest priority rule for all development work.

## ABSOLUTE FORBIDDEN PATTERNS

### ❌ NEVER USE: Command Substitution
```bash
# FORBIDDEN - Causes permission prompts
gameId=$(curl -s http://localhost:3000/api/game/create | jq -r '.gameId')
url=$(echo "http://localhost:3000/table/$gameId")
```

### ❌ NEVER USE: Command Chaining
```bash
# FORBIDDEN - Causes permission prompts  
curl -s http://localhost:3000/api/game/create && echo "Success"
curl -s http://localhost:3000/api/game/create -X POST && curl -s http://localhost:3000/table/test
```

### ❌ NEVER USE: Complex Piping with jq
```bash
# FORBIDDEN - Causes permission prompts
curl -s http://localhost:3000/api/game/create | jq -r '.gameId'
curl -s http://localhost:3000/api/game/create | grep -o '"gameId":"[^"]*"'
```

### ❌ NEVER USE: Variable Assignments
```bash
# FORBIDDEN - Causes permission prompts
gameId="test-123"
response=$(curl -s http://localhost:3000/table/$gameId)
```

### ❌ NEVER USE: Multi-line Commands
```bash
# FORBIDDEN - Causes permission prompts
curl -s http://localhost:3000/api/game/create \
  -X POST \
  -H "Content-Type: application/json"
```

## ✅ APPROVED PATTERNS

### ✅ Simple HTTP Status Checks
```bash
# APPROVED - Simple, single purpose using temp files
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/table > /tmp/status.txt
read status_code < /tmp/status.txt
```

### ✅ Basic Content Retrieval  
```bash
# APPROVED - Simple response viewing with temp files
curl -s http://localhost:3000/api/health > /tmp/response.txt
cat /tmp/response.txt
```

### ✅ Safe File Operations
```bash
# APPROVED - All data through temp files, no command substitution
echo '{"playerNames":["Test1","Test2"]}' > /tmp/request.json
curl -s http://localhost:3000/api/game/create -X POST -H "Content-Type: application/json" -d @/tmp/request.json > /tmp/game.json
grep '"gameId"' /tmp/game.json > /tmp/found.txt
if [ -s /tmp/found.txt ]; then echo "Game created"; fi
```

### ✅ API Testing via Scripts ONLY
```bash
# APPROVED - Use bulletproof api-test.sh for ALL API operations
./scripts/api-test.sh create_game "Test1" "Test2"
./scripts/api-test.sh hand_eval_simple royal_flush
./scripts/api-test.sh health_check
./scripts/api-test.sh debug "/api/game/create"
```

### ✅ Safe Variable Reading
```bash
# APPROVED - Read variables from files, not command substitution
echo "test-value" > /tmp/var.txt
read MY_VAR < /tmp/var.txt
echo "Variable: $MY_VAR"
```

### ❌ FORBIDDEN - Direct curl Commands
```bash
# FORBIDDEN - Use api-test.sh instead
curl -s http://localhost:3000/api/game/create -X POST -H "Content-Type: application/json" -d '{"playerNames":["Test1","Test2"]}'
```

### ❌ FORBIDDEN - Piping Operations
```bash
# FORBIDDEN - Any piping triggers permission prompts
curl -s http://localhost:3000/table | head -5
curl -s http://localhost:3000/api/health | tail -1
```

### ✅ Simple Status Checks Only
```bash
# APPROVED - Simple status check without piping
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/table
```

### ✅ Using Built-in Scripts
```bash
# APPROVED - Use existing scripts instead of complex commands
./scripts/quick-test.sh
./scripts/api-test.sh debug
./scripts/pre-test-validation.sh
```

## ENFORCEMENT PROTOCOL

### Pre-Command Checklist (P0 PRIORITY)
Before EVERY bash command, verify:
- [ ] No $( ) command substitution
- [ ] No && command chaining  
- [ ] No | (pipe) operators AT ALL
- [ ] No jq usage
- [ ] No variable assignments
- [ ] No curl commands with complex args (use api-test.sh instead)
- [ ] No redirects > or >>
- [ ] No backticks `
- [ ] No semicolons ;
- [ ] Single line, single purpose
- [ ] Simple and readable
- [ ] Will NOT trigger permission prompt

### If You Need Complex Testing:
1. **MANDATORY: Use api-test.sh first**: ALL API testing must go through `./scripts/api-test.sh`
2. **For non-API operations**: Break into multiple separate bash tool calls
3. **Keep it simple**: Each command should do one thing only
4. **When in doubt**: Create a new script in ./scripts/ rather than use complex bash

### Examples of Bulletproof Testing:
```bash
# Step 1: Use built-in health check (SAFE)
./scripts/api-test.sh health_check

# Step 2: Test specific API endpoints (SAFE)
./scripts/api-test.sh debug "/api/game/create"

# Step 3: Test game creation (SAFE)
./scripts/api-test.sh create_game "Test1" "Test2"

# Step 4: Test hand evaluation (SAFE)
./scripts/api-test.sh hand_eval_simple royal_flush

# Step 5: Quick pre-test validation (SAFE)
./scripts/quick-test.sh

# Step 6: Comprehensive validation (SAFE)
./scripts/pre-test-validation.sh
```

### Validation Tools:
```bash
# Validate bash scripts for forbidden patterns
./scripts/validate-bash-patterns.sh --all-scripts

# Validate a single command
./scripts/validate-bash-patterns.sh --command "curl -s http://localhost:3000"

# Validate specific script file
./scripts/validate-bash-patterns.sh --file scripts/my-script.sh
```

## EMERGENCY PROCEDURES

### If You Catch Yourself About to Use Forbidden Pattern:
1. **STOP** - Do not execute the command
2. **ANALYZE** - What is the simplest way to achieve the goal?
3. **BREAK DOWN** - Split into multiple simple commands
4. **EXECUTE** - Use approved patterns only

### If Permission Prompt Appears:
1. **IMMEDIATE STOP** - Do not proceed with that command pattern
2. **ANALYZE ROOT CAUSE** - Which forbidden pattern was used?
3. **REDESIGN** - Create simple alternative approach
4. **UPDATE GUIDELINES** - If new pattern found, add to forbidden list

## SUCCESS METRICS

### You Are Following Guidelines When:
- ✅ No user permission prompts occur
- ✅ Each bash command has a single, clear purpose
- ✅ Commands are readable and understandable
- ✅ Testing is accomplished through multiple simple steps
- ✅ Built-in scripts are used when available

### You Are Violating Guidelines When:
- ❌ User permission prompts appear
- ❌ Commands are complex or hard to read
- ❌ Multiple operations are chained together
- ❌ You're parsing or manipulating output in bash
- ❌ You're creating variables or using substitution

Remember: **Simple and separate is always better than complex and combined.**