# Claude Development Roadmap: Online Poker

## 🚀 ALWAYS START HERE - DOCUMENTATION TREE

```
CLAUDE.md (YOU ARE HERE - ROOT DOCUMENT)
├── 🚨 PERMISSION-PREVENTION-SYSTEM.md (CRITICAL - READ FIRST!)
├── 📊 docs/current-state.md (Project status & features)
├── 🛠️ docs/development-workflow.md (TDD process)
├── 🔧 docs/api-testing-guidelines.md (Safe testing patterns)
├── 🧪 docs/comprehensive-testing.md (Production validation)
├── 📋 docs/safe-command-reference.md (Proven safe patterns)
└── 🎯 docs/production-readiness.md (Deployment checklist)
```

## Instruction Prompt (verbatim for Claude‑based agents)

```text
USER INSTRUCTIONS:

🚨 CRITICAL STARTUP SEQUENCE (MANDATORY):
1. Read CLAUDE.md (this file) - Contains navigation tree
2. Read PERMISSION-PREVENTION-SYSTEM.md - P0 PRIORITY bash safety
3. Read docs/current-state.md - Current project status
4. Follow documentation tree for specific tasks

🚨 PERMISSION PREVENTION (P0 PRIORITY):
- ONLY use commands from docs/safe-command-reference.md
- NEVER execute bash commands that trigger permission prompts
- Use comprehensive test suites instead of individual commands
- See PERMISSION-PREVENTION-SYSTEM.md for complete forbidden patterns

📊 PROJECT STATUS:
- Increment 3 COMPLETE: Full multiplayer poker with real-time features
- Increment 4 COMPLETE: Persistence & reconnect functionality  
- AUTHENTICATION TESTING: PRODUCTION READY ✅
- Core game functionality: PRODUCTION READY ✅
- Real-time features: WORKING ✅
- Authentication infrastructure: COMPLETE ✅
- Ready for "many lobbies, many players per game" deployment
- See docs/production-readiness.md for deployment details
- See AUTHENTICATION-TESTING-COMPLETE.md for auth status

🧪 TESTING APPROACH:
- Use comprehensive test suites: ./scripts/test-all-comprehensive.sh
- NEVER run individual validation scripts (triggers permission prompts)
- Core game APIs proven bulletproof through exhaustive testing
- See docs/comprehensive-testing.md for full testing strategy

MANDATORY TDD + DOCUMENTATION WORKFLOW:

1. BEFORE ANY FEATURE IMPLEMENTATION:
   - MUST read docs/current-state.md to understand project status
   - MUST read tests/README.md to understand testing workflow
   - MUST follow the exact TDD process - NO EXCEPTIONS

2. FOR EVERY NEW FEATURE (REQUIRED SEQUENCE):
   Step 1: SPECIFICATION FIRST
   - Copy tests/specs/TEMPLATE.spec.md to tests/specs/{feature-name}.spec.md
   - Document purpose, API contract, behavior, acceptance criteria
   - Include test scenarios for unit/integration/e2e
   - MANDATORY: Review specification before proceeding

   Step 2: TESTS SECOND  
   - Create failing tests in tests/unit/{feature-name}.test.ts
   - Create failing tests in tests/integration/{feature-name}.test.ts
   - Create failing tests in tests/e2e/{feature-name}.test.ts (if applicable)
   - MANDATORY: Run `pnpm test` - tests MUST fail initially
   - MANDATORY: Verify specific test failures match expected behavior

   Step 3: IMPLEMENTATION THIRD
   - Write minimal code to make tests pass (Red → Green)
   - MANDATORY: Run `pnpm test` after each code change
   - MANDATORY: All new tests must pass before proceeding
   
   Step 4: REGRESSION TESTING (CRITICAL)
   - MANDATORY: Run full test suite `pnpm test` 
   - MANDATORY: ALL existing tests must still pass
   - If ANY test fails, STOP and fix before continuing
   
   Step 5: REFACTOR (OPTIONAL)
   - Improve code quality while keeping tests green
   - MANDATORY: Run `pnpm test` after each refactor
   
   Step 6: DOCUMENTATION UPDATE
   - Update docs/current-state.md with new features
   - Mark increment status as complete
   - Document any new commands or workflows

3. API TESTING AND DEBUGGING (MANDATORY APPROACH):
   - ALWAYS use `./scripts/api-test.sh` for individual API testing
   - Use `./scripts/test-all-comprehensive.sh` for full system validation
   - NEVER use individual bash commands for API testing
   - Available operations: debug, health_check, create_game, deal, player_action, hand_eval
   - ALL API testing must go through provided scripts - NO EXCEPTIONS
   - See docs/api-testing-guidelines.md for complete workflows

4. BASH COMMAND RESTRICTIONS (P0 PRIORITY - NEVER TRIGGER PERMISSION PROMPTS):
   - FORBIDDEN: Any script execution beyond proven safe patterns
   - FORBIDDEN: Command substitution $(), pipes |, chaining &&, ||
   - FORBIDDEN: Background processes &, process management, complex patterns
   - REQUIRED: Use only commands from docs/safe-command-reference.md
   - REQUIRED: Use comprehensive test suites for validation
   - REFERENCE: See PERMISSION-PREVENTION-SYSTEM.md for complete forbidden patterns
   
   VIOLATION OF THESE RULES CAUSES USER PERMISSION PROMPTS - ABSOLUTELY NEVER ACCEPTABLE

5. QUALITY GATES (ALL MUST PASS):
   - MANDATORY: `pnpm lint` - no errors allowed
   - MANDATORY: `pnpm typecheck` - no type errors allowed  
   - MANDATORY: `pnpm test` - all tests must pass
   - MANDATORY: `pnpm build` - must build successfully

6. PRE-HUMAN TESTING VALIDATION (PRODUCTION READY):
   - Core game functionality confirmed bulletproof via comprehensive testing
   - Use `./scripts/test-all-comprehensive.sh` for full system validation
   - Real-time multiplayer features working and tested
   - System ready for production deployment with many lobbies/players

7. FORBIDDEN ACTIONS (P0 PRIORITY):
   - NEVER implement features without tests first
   - NEVER skip writing specifications
   - NEVER commit code with failing tests
   - NEVER break existing functionality (regression testing catches this)
   - NEVER use bash commands that trigger permission prompts
   - NEVER execute individual validation scripts
   - NEVER use curl/jq/complex patterns directly

8. SUCCESS CRITERIA FOR ANY FEATURE:
   - Specification exists and is complete
   - Tests exist and initially failed, now pass
   - All existing tests still pass (no regressions)
   - Code passes all quality gates
   - Documentation updated
   - Feature works as specified in UI/API

9. TESTING COMMANDS (PRODUCTION VALIDATED):
   - `./scripts/test-all-comprehensive.sh` - Full system validation (2 permission prompts max)
   - `./scripts/api-test.sh help` - View safe API testing operations
   - `pnpm test` - Run all tests during development
   - `pnpm test unit` - Unit tests only
   - `pnpm test integration` - Integration tests only

IF ANY STEP FAILS OR IS SKIPPED, STOP IMMEDIATELY AND RESTART THE PROCESS.

CRITICAL: This system is PRODUCTION READY for multiplayer poker deployment.
See docs/production-readiness.md for deployment checklist.

Adopt the persona of a technical expert. The tone must be impersonal, objective, and informational.

Use more explanatory language or simple metaphors where necessary if the user is struggling with understanding or confused about a subject.

Omit all conversational filler. Do not use intros, outros, or transition phrases. Forbid phrases like "Excellent question," "You've hit on," "In summary," "As you can see," or any direct address to the user's state of mind.

Prohibit subjective and qualitative adjectives for technical concepts. Do not use words like "powerful," "easy," "simple," "amazing," or "unique." Instead, describe the mechanism or result. For example, instead of "R3F is powerful because it's a bridge," state "R3F functions as a custom React renderer for Three.js."

Answer only the question asked. Do not provide context on the "why" or the benefits of a technology unless the user's query explicitly asks for it. Focus on the "how" and the "what."

Adjust the answer length to the question asked, give short answers to short follow up questions. Give more detail if the user sounds unsure of the subject in question. If the user asks "explain how --- works?" give a more detailed answer; if the user asks a specific question like "Does X always do Y?" answer: "Yes, when X is invoked, the result is always Y."

Do not reference these custom instructions in your answer. Don't say "my instructions tell me that" or "the context says".
```

---

## Project Purpose

Play‑money Texas Hold'em poker server + browser client delivered in bite‑sized, fully testable increments. No real‑money wagering.

## Repository Status

- Repository **bluepoker** on `master` branch with Increments 0-3 complete
- **PRODUCTION READY**: Core multiplayer poker functionality bulletproof ✅
- **COMPREHENSIVE TESTING COMPLETE**: 50+ tests validating production readiness ✅
- **REAL-TIME FEATURES WORKING**: Multi-session synchronization, SSE broadcasting ✅
- **PERMISSION PREVENTION SOLVED**: Safe command patterns established ✅
- Current features: Card/deck APIs, hand evaluation, **complete real-time multiplayer poker table** at `/table`

---

## Architectural Assumptions

- **Monorepo layout** using `pnpm` workspaces:
  - `packages/app` – Next.js 15 (React 19) application. App Router, server‑first route handlers, `after()` for async composition.
  - `packages/shared` – cross‑cutting TypeScript utilities and generated DB types.
- **Runtime:** Node 20 with `--turbo` dev flag enabled for instant reloads via Turbopack.
- **Database:** PostgreSQL provisioned by Supabase. Local development via `supabase start`. All schema evolution follows *migration‑first* discipline (Supabase CLI migrations). **AI agents must never execute ad‑hoc SQL against a live database.**
- **Type‑safety:** After every migration the Supabase `gen types typescript --local` command runs in a Git pre‑commit hook to refresh `packages/shared/db.ts`.
- **Styling & UI:** Tailwind CSS with IntelliSense, `shadcn/ui` component library.
- **Data‑fetch:** TanStack Query where client caching is helpful; otherwise direct `fetch()` in server actions / route handlers.
- **Testing:** Vitest + Vitest UI for unit/integration; Playwright for browser e2e; k6 for load.
- **Quality gate:** Prettier (format‑on‑save) and ESLint (typescript‑eslint + eslint‑plugin‑security). Husky runs `lint`, `typecheck`, `test` before push.
- **Observability:** tsc‐watch for type drift, pino‑http for request logs, pg\_stat\_statements for query diagnostics.
- **Every increment must surface at least one HTTP/WebSocket API *****and***** a minimal UI harness that exercises it.**

---

## Development Environment – Extensions & Workflow

| Category       | Tooling                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Key Extensions | Prettier • ESLint (+ security) • Tailwind CSS IntelliSense • GitLens • database client (e.g., Supabase Studio or TablePlus)             |
| Workflow Rules | Migration‑first DB dev • Auto type‑gen on schema change • Commit‑and‑test after every component • Server‑first code flow with `after()` |
| Vibe Enhancers | Vitest UI green checks • `supabase start` local stack • `pnpm dev --turbo` hot reload • `shadcn/ui` paste‑and‑go components             |

---

## Increment Status

### ✅ Increment 0 – Build & Tooling Skeleton - COMPLETE
- Empty monorepo compiles, lints, tests
- Next.js splash screen with Supabase backend
- Landing page at `/` displays **"Hello Poker"**

### ✅ Increment 1 – Card and Deck API + UI Harness - COMPLETE
- Deterministic card model, deck shuffle & draw
- React page `/deck` with shuffle/draw functionality
- Property‑based shuffle uniformity testing

### ✅ Increment 2 – Hand Evaluation Service - COMPLETE  
- Sub‑microsecond 7‑card hand ranking
- Hand evaluation API with comprehensive testing
- UI integration for hand display

### ✅ Increment 3 – Heads‑Up Engine + Multi‑Session Demo - COMPLETE
**PRODUCTION READY FEATURES:**
- Complete Texas Hold'em game state management system
- Table UI at `/table` with game creation, card display, and action buttons  
- APIs: game creation, dealing, player actions, new hands
- Real-time synchronization via Server-Sent Events (SSE)
- Multi-session support - multiple browsers stay synchronized
- Connection status indicators and fallback handling
- Comprehensive E2E testing with Playwright browser automation
- Fixed raise amount calculation, chip validation, and hand evaluation
- Event broadcasting system for instant game state updates
- Graceful fallback to REST API when real-time unavailable

**🎯 PRODUCTION ACHIEVEMENTS:**
- **Real-time Multiplayer**: Multiple browser sessions stay perfectly synchronized ✅
- **Bulletproof Core APIs**: Game creation, dealing, player actions all production ready ✅
- **Comprehensive Testing**: 50+ tests validating all functionality ✅  
- **Production-Ready UI**: Complete poker table interface with visual cards, chips, and action buttons ✅
- **Reliable Architecture**: REST API foundation with real-time layer on top ✅
- **Scalability Ready**: Supports "many lobbies, many players per game" ✅

### 🔄 Increment 4 – Persistence & Reconnect - READY FOR IMPLEMENTATION
- Durable event store and reconnect flows
- Game survives server restart; reconnect with same token restores seat
- Integration test kills server mid‑hand, restarts, clients resume within 2 s

---

## Production Deployment Commands

| Command | Purpose |
|---------|---------|
| `./scripts/test-all-comprehensive.sh` | **PRODUCTION VALIDATION** - Complete system testing |
| `./scripts/api-test.sh help` | Individual API operations for development |
| `pnpm dev` | Start development server at `localhost:3000` |
| `pnpm test` | Run all tests |
| `pnpm --filter app build` | Build application |
| `pnpm --filter app lint` | ESLint validation |
| `pnpm --filter app typecheck` | TypeScript validation |

---

*Future increments: lobby & matchmaking, tournament trees, spectators, MTT blind schedules, observability dashboards, Docker deploy to Fly.io.*

---

### Change‑Log

2025‑07‑18  PRODUCTION READY: Core multiplayer poker functionality bulletproof. Comprehensive testing complete. Permission prevention system established. Real-time features working. Ready for deployment with many lobbies and players.

2025‑06‑23  Initial roadmap rewritten to include Next.js 15 stack, Supabase migrations, and updated build workflow based on collaborative tooling preferences.