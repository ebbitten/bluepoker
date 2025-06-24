# Claude Development Roadmap: Online Poker

## Instruction Prompt (verbatim for Claude‑based agents)

```text
USER INSTRUCTIONS:

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

- New repository **bluepoker** on `master` branch; zero commits at time‑zero.
- `.claude/settings.local.json` already present for Claude Code configuration.
- No application code; roadmap and scaffolding tasks defined below establish initial structure.

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
