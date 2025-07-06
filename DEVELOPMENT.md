# Development Commands & Setup

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev                    # Next.js at localhost:3000 with Turbopack
export PATH="$HOME/.local/bin:$PATH" && supabase start  # Supabase local stack

# Run tests
pnpm test                   # Open Vitest UI
pnpm test --run             # Run tests in CI mode

# Code quality
pnpm lint                   # Run ESLint
pnpm typecheck              # Run TypeScript checks
pnpm format                 # Format with Prettier
```

## Essential File Locations

### Configuration Files
- `pnpm-workspace.yaml` - Monorepo workspace configuration
- `tsconfig.base.json` - Shared TypeScript configuration
- `.prettierrc` - Code formatting rules
- `.husky/pre-commit` - Pre-commit hooks
- `supabase/config.toml` - Supabase local development settings

### Application Structure
```
packages/
├── app/                    # Next.js 15 application
│   ├── src/app/           # App Router pages
│   ├── package.json       # App dependencies & scripts
│   ├── tailwind.config.ts # Tailwind CSS configuration
│   ├── vitest.config.ts   # Test configuration
│   └── .eslintrc.json     # App-specific ESLint rules
└── shared/                # Cross-cutting utilities
    ├── src/
    │   ├── db.ts          # Auto-generated Supabase types
    │   ├── types.ts       # Shared TypeScript types
    │   └── utils.ts       # Shared utility functions
    └── package.json       # Shared package dependencies
```

### CI/CD
- `.github/workflows/ci.yml` - GitHub Actions pipeline

## Development Workflow

1. **Start Development**:
   ```bash
   pnpm dev                # Start Next.js with Turbopack
   supabase start          # Start local Supabase stack
   ```

2. **Make Changes**: 
   - Edit files in `packages/app/src/` or `packages/shared/src/`
   - Hot reload automatically updates the browser

3. **Run Tests**:
   ```bash
   pnpm test               # Interactive test runner
   ```

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat: your change"  # Pre-commit hooks run automatically
   ```

## Supabase Development

- **Local Dashboard**: http://localhost:54323 (Supabase Studio)
- **API URL**: http://localhost:54321
- **Database URL**: postgresql://postgres:postgres@localhost:54322/postgres

### Type Generation
```bash
# Generate types after schema changes
supabase gen types typescript --local > packages/shared/src/db.ts
```

## Port Usage

| Service | Port | URL |
|---------|------|-----|
| Next.js Dev Server | 3000 | http://localhost:3000 |
| Supabase API | 54321 | http://localhost:54321 |
| Supabase DB | 54322 | postgresql://localhost:54322 |
| Supabase Studio | 54323 | http://localhost:54323 |
| Email Testing | 54324 | http://localhost:54324 |

## Troubleshooting

### Common Issues

1. **pnpm not found**: Install pnpm first
   ```bash
   curl https://get.pnpm.io/install.sh | sh -
   source ~/.zshrc
   ```

2. **supabase not found**: Install Supabase CLI
   ```bash
   curl -L https://github.com/supabase/cli/releases/download/v1.200.3/supabase_linux_amd64.tar.gz | tar -xz
   mkdir -p ~/.local/bin && mv supabase ~/.local/bin/supabase
   export PATH="$HOME/.local/bin:$PATH"
   ```

3. **React is not defined**: Make sure React imports are present in test files

4. **PostCSS errors**: Ensure `autoprefixer` is installed in app dependencies

### Node Version
- **Required**: Node.js 20+
- **Current Environment**: Node.js 18.19.1 (upgrade recommended)

## VS Code Extensions

Recommended extensions for optimal development experience:
- Prettier - Code formatter
- ESLint - JavaScript/TypeScript linting
- Tailwind CSS IntelliSense - CSS class suggestions
- GitLens - Git integration
- Database client (TablePlus or similar) for Supabase