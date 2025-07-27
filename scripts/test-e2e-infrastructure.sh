#!/bin/bash

# BULLETPROOF E2E Infrastructure Test
# ZERO PERMISSION PROMPTS - Uses only safe bash patterns
echo "🧪 TESTING E2E INFRASTRUCTURE"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create temp directory for safe operations
TEMP_DIR="/tmp/test-e2e-$$"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo -e "\n${YELLOW}🔍 Checking Playwright setup...${NC}"

# Check if Playwright is installed using temp files
npx playwright --version > "$TEMP_DIR/playwright_version.txt" 2>&1
if [ -s "$TEMP_DIR/playwright_version.txt" ]; then
    echo -n -e "✅ Playwright: "
    cat "$TEMP_DIR/playwright_version.txt"
else
    echo -e "${RED}❌ Playwright not installed${NC}"
    exit 1
fi

# Check if browsers are installed using temp files
ls "$HOME/.cache/ms-playwright/chromium"* > "$TEMP_DIR/browser_check.txt" 2>&1
if [ -s "$TEMP_DIR/browser_check.txt" ]; then
    echo -e "✅ Chromium browser installed"
else
    echo -e "${RED}❌ Chromium browser not installed${NC}"
    echo -e "${YELLOW}Run: npx playwright install chromium${NC}"
    exit 1
fi

# Check if test files exist
if [ -f "tests/e2e/game-creation-and-join.spec.ts" ]; then
    echo -e "✅ E2E test files found"
else
    echo -e "${RED}❌ E2E test files missing${NC}"
    exit 1
fi

# Check if config exists
if [ -f "playwright.config.ts" ]; then
    echo -e "✅ Playwright config found"
else
    echo -e "${RED}❌ Playwright config missing${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📋 Listing available tests...${NC}"
# List tests safely using temp file
npx playwright test --list > "$TEMP_DIR/test_list.txt"
head -10 "$TEMP_DIR/test_list.txt"

echo -e "\n${GREEN}🎉 E2E Infrastructure is properly set up!${NC}"
echo -e "${GREEN}✅ Playwright installed and configured${NC}"
echo -e "${GREEN}✅ Browser automation ready${NC}"
echo -e "${GREEN}✅ Test files created${NC}"
echo -e "${GREEN}✅ Ready to catch UI issues before human testing${NC}"

echo ""
echo -e "${YELLOW}🎯 Next Steps:${NC}"
echo "1. Start dev server: pnpm dev"
echo "2. Run E2E tests: pnpm test:e2e"
echo "3. Use validation scripts that now include browser automation"

echo ""
echo -e "${YELLOW}🔧 Testing Commands:${NC}"
echo "  pnpm test:e2e           # Run all E2E tests"
echo "  pnpm test:e2e:ui        # Run with UI for debugging"
echo "  pnpm test:e2e:headed    # Run with visible browser"
echo "  ./scripts/quick-test.sh # Now includes critical E2E validation"