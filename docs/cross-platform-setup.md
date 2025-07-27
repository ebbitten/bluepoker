# Cross-Platform Development Setup Guide

This guide covers setting up the bluepoker project for seamless development between Ubuntu and Windows WSL2.

## Prerequisites

### Required Software
- **Node.js 20+**: Use `nvm` for version management (project uses Node 20 per `.nvmrc`)
- **pnpm 8+**: Package manager (install after Node setup)
- **Supabase CLI**: For local database stack management
- **PostgreSQL client tools**: For database operations
- **Git**: With proper line ending configuration

### System Requirements
- Windows 10/11 with WSL2 enabled
- Ubuntu 20.04+ (or similar Linux distribution)

## Initial WSL2 Setup

### 1. Git Configuration
```bash
git config --global core.autocrlf false
git config --global core.eol lf
```
*Required: Project uses LF line endings as specified in `.prettierrc`*

### 2. Node.js Setup
```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Use project's Node version
nvm use 20
nvm alias default 20
```

### 3. Package Manager
```bash
# Install pnpm
npm install -g pnpm@latest
```

### 4. Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase@latest
```

## Project Setup on WSL2

### 1. Clone Repository
```bash
# Clone in WSL2 filesystem (NOT /mnt/c/...)
cd ~
git clone <your-repo-url> bluepoker
cd bluepoker
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
Copy your `.env.local` file from the Ubuntu machine to WSL2:
```bash
# This file contains your Supabase configuration
# Copy contents from Ubuntu machine's .env.local
```

### 4. Database Setup
```bash
# Start local Supabase stack
supabase start
```

### 5. Verify Setup
```bash
# Run quality checks
pnpm typecheck
pnpm lint
pnpm test

# Start development server
pnpm dev
```

## Development Workflow

### Daily Startup
```bash
cd ~/bluepoker
supabase start  # If not already running
pnpm dev        # Starts on localhost:3000
```

### Available Commands
```bash
# Development
pnpm dev                    # Start dev server
pnpm test                   # Run all tests
pnpm lint                   # ESLint validation
pnpm typecheck             # TypeScript validation
pnpm build                 # Build application

# Testing
./scripts/test-all-comprehensive.sh  # Full system validation
./scripts/api-test.sh help           # API testing operations
```

## WSL2-Specific Considerations

### Performance Optimization
- **Use WSL2 filesystem**: Store project in `/home/...` not `/mnt/c/...`
- **Install tools in WSL2**: Node, pnpm, Supabase CLI should be installed inside WSL2, not Windows

### Network Access
- **Localhost works**: Development server on `localhost:3000` accessible from Windows browsers
- **Supabase local**: Database runs on WSL2 but accessible from Windows applications

### File System
- **Line endings**: Already configured for LF via `.prettierrc`
- **Case sensitivity**: WSL2 filesystem is case-sensitive like Linux

## Cross-Platform Synchronization

### Files to Keep in Sync
1. **Environment variables**: `.env.local` (contains database credentials)
2. **Database schema**: `supabase/` directory (if making schema changes)
3. **IDE settings**: For consistent code formatting

### Git Workflow
```bash
# Standard git workflow works seamlessly
git pull origin master
git checkout -b feature-branch
# ... make changes ...
git add .
git commit -m "feat: your changes"
git push origin feature-branch
```

## Troubleshooting

### Common Issues
1. **Permission errors**: Ensure using WSL2 filesystem, not Windows mounts
2. **Node version**: Verify `node --version` shows 20.x
3. **Database connection**: Check `supabase status` shows all services running
4. **Port conflicts**: Ensure no other applications using port 3000

### Verification Commands
```bash
# Check versions
node --version      # Should be 20.x
pnpm --version      # Should be 8.x+
supabase --version  # Should be latest

# Check project health
pnpm validate       # Runs typecheck, lint, test, build
```

## Production Readiness

This project is production-ready with:
- ✅ Comprehensive testing (50+ tests)
- ✅ Real-time multiplayer functionality
- ✅ Authentication system
- ✅ Bulletproof core APIs

See `docs/production-readiness.md` for deployment details.

---

*Last updated: 2025-07-27*
*Compatible with: Ubuntu 24.04, Windows 10/11 WSL2*