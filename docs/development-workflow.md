# Development Workflow

## Pre-Work Checklist

1. **Always read `docs/current-state.md`** - Understand current project status
2. **Check working directory** - Should be `/home/adamh/VSCodeProjects/bluepoker`
3. **Verify development server** - Run `pnpm dev` to start on `localhost:3000`

## Test-Driven Development (TDD) Flow

### For Each New Feature

1. **Write Specification** (`tests/specs/`)
   - Copy `tests/specs/TEMPLATE.spec.md` to `{feature-name}.spec.md`
   - Document purpose, API contract, behavior, and acceptance criteria
   - Define test scenarios for unit, integration, and E2E tests

2. **Write Tests** (`tests/unit/`, `tests/integration/`, `tests/e2e/`)
   - Create test files based on specification
   - Write failing tests first (Red phase)
   - Use test helpers from `tests/utils/test-helpers.ts`

3. **Run Tests** (Should fail initially)
   ```bash
   pnpm test
   ```

4. **Implement Feature** 
   - Write minimal code to make tests pass (Green phase)
   - Focus on making tests pass, not perfection

5. **Refactor Code** (Refactor phase)
   - Improve code quality while keeping tests green
   - Extract reusable components/utilities

6. **Regression Testing** (Critical!)
   ```bash
   # Run ALL tests to ensure no existing functionality is broken
   pnpm test
   
   # Run specific test suites
   pnpm test unit
   pnpm test integration
   pnpm test e2e
   ```

### Daily Development Flow

#### Starting Development
```bash
# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev

# Run existing tests to ensure clean starting state
pnpm test
```

#### Continuous Testing (Run after EVERY change)
```bash
# Run all tests (unit, integration, regression)
pnpm test

# Run tests with UI for interactive development
pnpm test:ui

# Run specific feature tests
pnpm test {feature-name}

# Run tests in watch mode during development
pnpm test --watch
```

#### Quality Checks (Run frequently)
```bash
# Lint all packages
pnpm lint

# Type check all packages  
pnpm typecheck

# Run full test suite
pnpm test

# Performance testing
pnpm test:perf
```

### Pre-Commit (Automated via Husky)
The following commands run automatically on git commit:
- `pnpm lint`
- `pnpm typecheck` 
- `pnpm test --run`
- Supabase type generation (if migrations changed)

### Production Build
```bash
# Build Next.js application
pnpm build

# Test production build locally
pnpm start
```

## Project Structure

```
bluepoker/
├── docs/                    # Documentation
│   ├── current-state.md     # Current project status
│   └── development-workflow.md
├── packages/
│   ├── app/                 # Next.js 15 application
│   │   ├── src/app/         # App Router structure
│   │   ├── package.json     # App-specific dependencies
│   │   └── ...
│   └── shared/              # Shared TypeScript utilities
│       ├── src/
│       │   ├── db.ts        # Generated Supabase types
│       │   ├── types.ts     # Shared type definitions
│       │   └── utils.ts     # Utility functions
│       └── package.json
├── tests/                   # Test-Driven Development
│   ├── specs/               # Feature specifications
│   │   ├── TEMPLATE.spec.md # Specification template
│   │   └── {feature}.spec.md # Individual feature specs
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   ├── fixtures/            # Test data and mock objects
│   └── utils/               # Test utilities and helpers
│       └── test-helpers.ts  # Common test utilities
├── supabase/                # Supabase configuration
├── .husky/                  # Git hooks
├── .github/workflows/       # CI/CD pipelines
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # Workspace configuration
└── CLAUDE.md               # AI agent instructions
```

## Increment Development Process (TDD)

1. **Read Requirements** - Understand increment objectives from `CLAUDE.md`
2. **Plan Implementation** - Use TodoWrite tool to track tasks
3. **Write Specifications** - Document each feature in `tests/specs/`
4. **Write Tests** - Create failing tests based on specifications
5. **Implement Features** - Write code to make tests pass
6. **Regression Testing** - Run ALL tests to ensure no breaking changes
7. **Refactor & Optimize** - Improve code while keeping tests green
8. **Quality Gates** - Lint, typecheck, test, build
9. **Update Documentation** - Update `docs/current-state.md`
10. **Commit & Push** - Automated quality checks via Husky

### Critical Testing Points

- **After every feature implementation**: Run full test suite
- **Before committing**: All tests must pass (enforced by Husky)
- **During development**: Use watch mode for immediate feedback
- **Before moving to next increment**: Complete regression testing

## Testing Strategy

- **Unit Tests** - Vitest for business logic
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Playwright for user flows
- **Performance Tests** - Benchmark critical paths (e.g., hand evaluation)

## CI/CD Pipeline

GitHub Actions automatically:
1. Install dependencies
2. Start Supabase (PostgreSQL)
3. Run lint, typecheck, test
4. Build Next.js application
5. Report results

## Common Issues & Solutions

**ESLint Configuration:**
- Use `plugin:@typescript-eslint/recommended` not `@typescript-eslint/recommended`

**Node Version:**
- Project requires Node 20+, may see warnings on older versions

**Supabase Types:**
- Generated automatically on schema changes via pre-commit hook
- Located at `packages/shared/src/db.ts`

**Turbopack:**
- Enabled by default with `--turbo` flag
- Provides instant reloads during development