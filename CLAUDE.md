# Claude Development Roadmap: Online Poker

## Instruction Prompt (verbatim for Claude‑based agents)

```text
USER INSTRUCTIONS:

BEFORE STARTING ANY WORK: Always read docs/current-state.md to understand the current project status, available commands, and working features.

Documentation structure:
- docs/current-state.md - Current project status and available commands
- docs/development-workflow.md - Development workflow and processes

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

3. QUALITY GATES (ALL MUST PASS):
   - MANDATORY: `pnpm lint` - no errors allowed
   - MANDATORY: `pnpm typecheck` - no type errors allowed  
   - MANDATORY: `pnpm test` - all tests must pass
   - MANDATORY: `pnpm build` - must build successfully

4. FORBIDDEN ACTIONS:
   - NEVER implement features without tests first
   - NEVER skip writing specifications
   - NEVER commit code with failing tests
   - NEVER break existing functionality (regression testing catches this)
   - NEVER write code without understanding the specification

5. SUCCESS CRITERIA FOR ANY FEATURE:
   - Specification exists and is complete
   - Tests exist and initially failed, now pass
   - All existing tests still pass (no regressions)
   - Code passes all quality gates
   - Documentation updated
   - Feature works as specified in UI/API

6. TESTING COMMANDS TO USE:
   - `pnpm test` - run all tests
   - `pnpm test --watch` - continuous testing during development
   - `pnpm test unit` - run only unit tests
   - `pnpm test integration` - run only integration tests
   - `pnpm test {feature-name}` - run specific feature tests

IF ANY STEP FAILS OR IS SKIPPED, STOP IMMEDIATELY AND RESTART THE PROCESS.

Adopt the persona of a technical expert. The tone must be impersonal, objective, and informational.

Use more explanatory language or simple metaphors where necessary if the user is struggling with understanding or confused about a subject.

Omit all conversational filler. Do not use intros, outros, or transition phrases. Forbid phrases like "Excellent question," "You've hit on," "In summary," "As you can see," or any direct address to the user's state of mind.

Prohibit subjective and qualitative adjectives for technical concepts. Do not use words like "powerful," "easy," "simple," "amazing," or "unique." Instead, describe the mechanism or result. For example, instead of "R3F is powerful because it's a bridge," state "R3F functions as a custom React renderer for Three.js."

Answer only the question asked. Do not provide context on the "why" or the benefits of a technology unless the user's query explicitly asks for it. Focus on the "how" and the "what."

Adjust the answer length to the question asked, give short answers to short follow up questions. Give more detail if the user sounds unsure of the subject in question. If the user asks "explain how --- works?" give a more detailed answer; if the user asks a specific question like "Does X always do Y?" answer: "Yes, when X is invoked, the result is always Y."

Do not reference these custom instructions in your answer. Don't say "my instructions tell me that" or "the context says".
```

---

## Project Purpose

Play‑money Texas Hold'em poker server + browser client delivered in bite‑sized, fully testable increments. No real‑money wagering.

## Repository Status

- Repository **bluepoker** on `master` branch with Increment 0 complete.
- `.claude/settings.local.json` already present for Claude Code configuration.
- **IMPORTANT:** Before starting work, always read `docs/current-state.md` for the latest project status, available commands, and what's currently working.
- **TDD WORKFLOW MANDATORY**: Every feature MUST follow Specification → Tests → Implementation → Regression Testing sequence. NO EXCEPTIONS.
- **CONTINUOUS TESTING**: Run `pnpm test` after every code change. All tests must pass before proceeding.
- Development server running at `http://localhost:3000` with "Hello Poker" landing page.

---

## Architectural Assumptions

- **Monorepo layout** using `pnpm` workspaces:
  - `packages/app` – Next.js 15 (React 19) application. App Router, server‑first route handlers, `after()` for async composition.
  - `packages/shared` – cross‑cutting TypeScript utilities and generated DB types.
- **Runtime:** Node 20 with `--turbo` dev flag enabled for instant reloads via Turbopack.
- **Database:** PostgreSQL provisioned by Supabase. Local development via `supabase start`. All schema evolution follows *migration‑first* discipline (Supabase CLI migrations). **AI agents must never execute ad‑hoc SQL against a live database.**
- **Type‑safety:** After every migration the Supabase `gen types typescript --local` command runs in a Git pre‑commit hook to refresh `packages/shared/db.ts`.
- **Styling & UI:** Tailwind CSS with IntelliSense, `shadcn/ui` component library.
- **Data‑fetch:** TanStack Query where client caching is helpful; otherwise direct `fetch()` in server actions / route handlers.
- **Testing:** Vitest + Vitest UI for unit/integration; Playwright for browser e2e; k6 for load.
- **Quality gate:** Prettier (format‑on‑save) and ESLint (typescript‑eslint + eslint‑plugin‑security). Husky runs `lint`, `typecheck`, `test` before push.
- **Observability:** tsc‐watch for type drift, pino‑http for request logs, pg\_stat\_statements for query diagnostics.
- **Every increment must surface at least one HTTP/WebSocket API *****and***** a minimal UI harness that exercises it.**

---

## Development Environment – Extensions & Workflow

| Category       | Tooling                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Key Extensions | Prettier • ESLint (+ security) • Tailwind CSS IntelliSense • GitLens • database client (e.g., Supabase Studio or TablePlus)             |
| Workflow Rules | Migration‑first DB dev • Auto type‑gen on schema change • Commit‑and‑test after every component • Server‑first code flow with `after()` |
| Vibe Enhancers | Vitest UI green checks • `supabase start` local stack • `pnpm dev --turbo` hot reload • `shadcn/ui` paste‑and‑go components             |

---

## Increment 0 – Build & Tooling Skeleton

**Objective:** Empty monorepo compiles, lints, tests, and shows the Next.js splash screen backed by a running local Supabase instance.

### Deliverables

1. Directory structure: `packages/app`, `packages/shared`, root `pnpm-workspace.yaml`, shared `tsconfig.base.json`.
2. Commands:
   - `pnpm install`
   - `supabase start` (auto in dev script)
   - `pnpm dev` starts Next.js on `localhost:3000` with Turbopack.
   - `pnpm test` opens Vitest UI.
3. Husky `pre-commit` runs `lint`, `typecheck`, and `test`.
4. GitHub Action `ci.yml` reproduces the local gate: install → lint → typecheck → test → Next.js `build`.
5. Landing page at `/` displays **“Hello Poker”**.

---

## Increment 1 – Card and Deck API + UI Harness

**Objective:** Deterministic card model, deck shuffle & draw exposed through Next.js Route Handlers and demo page.

### API

- `GET /api/deck/shuffle?seed=123` → 52‑card array.
- `POST /api/deck/draw` body `{count:5, deck}` → drawn cards + remaining deck.

### UI

- React page `/deck` with buttons **Shuffle** (seed defaults to timestamp) and **Draw 5**. Cards render as SVG using `shadcn/ui` primitives.

### Tests

- Property‑based shuffle uniformity ±5 %.
- Playwright clicks **Shuffle** then **Draw 5** and asserts five distinct cards.

---

## Increment 2 – Hand Evaluation Service

**Objective:** Rank 7‑card hands with sub‑microsecond evaluator and surface result.

### API

- `POST /api/hand/eval` body `{cards:["Ah","Kd",...]}` → `{rank:"TwoPair", kicker:"J"}`.

### UI

- Extend `/deck`: after drawing ≥5 cards, **Evaluate** button shows hand rank.

### Tests

- Validation against hand‑ranking corpus.
- Benchmark < 1 µs mean via Vitest bench.
- Playwright draws known royal flush, verifies display “RoyalFlush”.

---

## Increment 3 – Heads‑Up Engine + Multi‑Session Demo

**Objective:** Stateful two‑player engine with Supabase auth stub.

### API

- `POST /api/auth/guest` → `{token}` (sets cookie).
- `POST /api/table/join` → seat assignment and state snapshot persisted in Supabase.
- WebSocket channel `table/{id}` streams state deltas.

### UI

- Login screen accepts nickname; open two browser windows to play against self.
- Minimal table view shows hole cards, community, action buttons, pot.

### Tests

- Vitest state‑machine tests for blinds, betting, showdown.
- Playwright opens two contexts, seats both, plays scripted hand, checks pot distribution.

---

## Increment 4 – Persistence & Reconnect

**Objective:** Durable event store and reconnect flows.

### Acceptance

- Game survives server restart; reconnect with same token restores seat.
- Integration test kills server mid‑hand, restarts, clients resume within 2 s.

---

## Development Commands (placeholder)

Will be documented once `package.json` scripts are defined by Increment 0.

---

*Future increments: lobby & matchmaking, tournament trees, spectators, MTT blind schedules, observability dashboards, Docker deploy to Fly.io.*

---

### Change‑Log

2025‑06‑23  Initial roadmap rewritten to include Next.js 15 stack, Supabase migrations, and updated build workflow based on collaborative tooling preferences.
