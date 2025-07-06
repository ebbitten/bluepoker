# BluPoker - Current State

## Increment 0 - Build & Tooling Skeleton ✅ COMPLETED
## Testing Infrastructure Setup ✅ COMPLETED

### What's Working

**Development Server:**
- Next.js 15 with React 19 running on `http://localhost:3000`
- Turbopack enabled for fast development
- Landing page displays "Hello Poker" with subtitle

**Available Commands:**
```bash
pnpm dev           # Start development server with Turbopack
pnpm test          # Run Vitest tests
pnpm test:ui       # Open Vitest UI
pnpm lint          # Run ESLint across all packages
pnpm typecheck     # Run TypeScript checks
pnpm build         # Build Next.js application for production
```

**Project Structure:**
```
packages/
├── app/           # Next.js 15 application
│   ├── src/app/   # App Router structure
│   └── package.json
└── shared/        # TypeScript utilities and types
    ├── src/
    └── package.json

tests/             # Test-Driven Development
├── specs/         # Feature specifications
├── unit/          # Unit tests
├── integration/   # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test data
└── utils/         # Test utilities
```

**Testing Infrastructure:**
- ✅ TDD workflow established (Spec → Test → Code)
- ✅ Test directory structure with unit/integration/e2e separation
- ✅ Specification templates for documenting features
- ✅ Test utilities and helper functions
- ✅ Example tests for next increment (Card & Deck API)
- ✅ Continuous regression testing workflow

**Quality Gates:**
- ✅ ESLint with TypeScript and security rules
- ✅ TypeScript strict type checking
- ✅ Vitest testing framework
- ✅ Husky pre-commit hooks (lint, typecheck, test)
- ✅ GitHub Actions CI pipeline
- ✅ Prettier code formatting

### What You Can See

Navigate to `http://localhost:3000` to see:
- Large green "Hello Poker" heading (text-6xl font-bold text-green-600)
- Subtitle: "Play-money Texas Hold'em poker server + browser client"
- Clean, centered layout with Tailwind CSS
- Dark mode support (text adapts to theme)

### Next Steps

Ready to begin **Increment 1 - Card and Deck API + UI Harness** using TDD approach:

**1. Specification Complete** ✅
- `tests/specs/card-deck-api.spec.md` - Full feature specification documented

**2. Tests Written** ✅  
- `tests/unit/card-deck-api.test.ts` - Unit tests (currently failing)
- `tests/integration/card-deck-api.test.ts` - API endpoint tests (currently failing)

**3. Ready to Implement:**
- Deterministic card model in `packages/shared/src/`
- Deck shuffle & draw API endpoints in `packages/app/src/app/api/`
- Card rendering with SVG using shadcn/ui
- UI harness at `/deck` route

**4. TDD Process:**
1. Run tests (should fail) - `pnpm test`
2. Implement features to make tests pass
3. Run regression tests after each feature
4. Refactor while keeping tests green

### Environment Setup

**Prerequisites:**
- Node.js 20+ (use nvm for version management)
- pnpm 8+ package manager
- Git

**Initial Setup:**
1. **Install Node 20:**
   ```bash
   # If using nvm (recommended)
   nvm install 20
   nvm use 20
   # Or use the .nvmrc file
   nvm use
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start development:**
   ```bash
   pnpm dev  # Starts Next.js on http://localhost:3000
   ```

**Available Commands:**
```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm test          # Run tests
pnpm test:ui       # Open Vitest UI
pnpm lint          # Run ESLint
pnpm typecheck     # Run TypeScript checks
```

**Environment Recreation:**
- All dependencies are locked in `pnpm-lock.yaml`
- Node version specified in `.nvmrc`
- Build artifacts are git-ignored and will be regenerated
- No manual setup steps required beyond installing dependencies

**Technical Notes:**
- **Turbopack:** Experimental.turbo config deprecated, should move to config.turbopack
- **Node Warnings:** pnpm may show Node version warnings - functionality works correctly