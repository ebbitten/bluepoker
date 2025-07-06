# Testing Strategy - TDD with Specifications

## Test-Driven Development Workflow

For each new feature, follow this process:

1. **Write Specification** - Document how the feature should work
2. **Write Tests** - Create tests based on the specification
3. **Implement Feature** - Write code to make tests pass
4. **Refactor** - Improve code while keeping tests green

## Directory Structure

```
tests/
├── specs/           # Feature specifications (documentation)
├── unit/            # Unit tests (business logic)
├── integration/     # Integration tests (API endpoints)
├── e2e/             # End-to-end tests (user flows)
├── fixtures/        # Test data and mock objects
└── utils/           # Test utilities and helpers
```

## Specification Format

Each feature should have a specification file in `tests/specs/` that documents:
- **Purpose** - What the feature does
- **API Contract** - Input/output specifications
- **Behavior** - How the feature should behave
- **Edge Cases** - Error conditions and boundary cases
- **Acceptance Criteria** - Testable requirements

## Test Types

### Unit Tests (`tests/unit/`)
- Test individual functions and classes
- Fast execution, isolated from external dependencies
- Mock external services and databases
- Framework: Vitest

### Integration Tests (`tests/integration/`)
- Test API endpoints and database interactions
- Test component integration
- Use test database or mocked services
- Framework: Vitest

### End-to-End Tests (`tests/e2e/`)
- Test complete user workflows
- Test in real browser environment
- Test critical user paths
- Framework: Playwright

## Naming Conventions

### Specification Files
- Format: `{feature-name}.spec.md`
- Example: `card-deck.spec.md`, `hand-evaluation.spec.md`

### Test Files
- Format: `{feature-name}.test.ts`
- Example: `card-deck.test.ts`, `hand-evaluation.test.ts`

### Test Cases
- Use descriptive names: `should shuffle deck with deterministic seed`
- Group related tests with `describe()` blocks
- Use `it()` or `test()` for individual test cases

## Example Workflow

```bash
# 1. Create specification
echo "# Card Deck Feature" > tests/specs/card-deck.spec.md

# 2. Write tests based on spec
touch tests/unit/card-deck.test.ts

# 3. Run tests (they should fail initially)
pnpm test

# 4. Implement feature to make tests pass
# ... implement code ...

# 5. Verify tests pass
pnpm test

# 6. Refactor if needed
# ... improve code while keeping tests green ...
```

## Test Data Management

### Fixtures (`tests/fixtures/`)
- Static test data (JSON files, sample cards, etc.)
- Reusable across multiple tests
- Version controlled for consistency

### Factories
- Generate test data dynamically
- Located in `tests/utils/`
- Useful for creating variations of test objects

## Best Practices

1. **Red-Green-Refactor** - Write failing test, make it pass, then refactor
2. **One Assertion Per Test** - Each test should verify one specific behavior
3. **Descriptive Test Names** - Test names should explain what's being tested
4. **Test Edge Cases** - Don't just test happy paths
5. **Keep Tests Independent** - Tests should not depend on each other
6. **Mock External Dependencies** - Use mocks for databases, APIs, etc.
7. **Test Behavior, Not Implementation** - Focus on what the code does, not how

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test card-deck.test.ts

# Run tests in watch mode
pnpm test --watch

# Run E2E tests
pnpm test:e2e
```