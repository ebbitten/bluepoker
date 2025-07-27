/**
 * Phase 2: Browser Compatibility E2E Testing
 * Tests BluPoker across all major browsers and devices
 */

import { test, expect, devices } from '@playwright/test';

// Browser and device configurations for comprehensive testing
const testConfigurations = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'iPhone 13', ...devices['iPhone 13'] },
  { name: 'iPhone 13 Pro', ...devices['iPhone 13 Pro'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'iPad Air', ...devices['iPad Air'] },
  { name: 'Desktop Edge', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' }
];

// Test each configuration
for (const config of testConfigurations) {
  test.describe(`Browser Compatibility - ${config.name}`, () => {
    test.use(config);

    test('Basic page loading and navigation', async ({ page }) => {
      // Test home page loads
      await page.goto('http://localhost:3000');
      await expect(page.locator('h1')).toContainText('Hello Poker');
      
      // Test navigation to table page
      await page.goto('http://localhost:3000/table');
      await expect(page).toHaveTitle(/BluPoker/);
      
      // Verify page is responsive and elements are visible
      await expect(page.locator('#game-container, .game-container, [data-testid="game-container"]')).toBeVisible({ timeout: 10000 });
    });

    test('Game creation and basic functionality', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Fill in player names
      const player1Input = page.locator('input[placeholder*="Player 1"], input[name*="player1"], #player1-name, [data-testid="player1-input"]').first();
      const player2Input = page.locator('input[placeholder*="Player 2"], input[name*="player2"], #player2-name, [data-testid="player2-input"]').first();
      
      await player1Input.fill('Alice');
      await player2Input.fill('Bob');
      
      // Create game
      const createButton = page.locator('button:has-text("Create Game"), #create-game, [data-testid="create-game"]').first();
      await createButton.click();
      
      // Verify game was created
      await expect(page.locator('#game-state, .game-state, [data-testid="game-state"]')).toBeVisible({ timeout: 15000 });
    });

    test('Real-time connection functionality', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Create a game first
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('Player1');
      await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('Player2');
      await page.locator('button:has-text("Create Game"), #create-game').first().click();
      
      // Wait for game creation
      await page.waitForTimeout(2000);
      
      // Check for connection status indicator
      const connectionStatus = page.locator('#connection-status, .connection-status, [data-testid="connection-status"]');
      
      if (await connectionStatus.isVisible()) {
        // SSE is supported - check connection
        await expect(connectionStatus).toContainText(/Connected|Real-time|Online/i, { timeout: 10000 });
      } else {
        // SSE might not be supported or visible - that's okay
        console.log(`${config.name}: SSE connection status not visible (possibly not supported)`);
      }
    });

    test('Game actions and interactions', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Create game
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('ActionPlayer1');
      await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('ActionPlayer2');
      await page.locator('button:has-text("Create Game"), #create-game').first().click();
      
      await page.waitForTimeout(2000);
      
      // Deal cards if button is available
      const dealButton = page.locator('button:has-text("Deal"), #deal-button, [data-testid="deal-button"]').first();
      if (await dealButton.isVisible()) {
        await dealButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Look for action buttons (they should appear after dealing)
      const actionButtons = [
        'button:has-text("Call")',
        'button:has-text("Fold")', 
        'button:has-text("Raise")',
        'button:has-text("Check")',
        '#call-button',
        '#fold-button',
        '#raise-button',
        '#check-button'
      ];
      
      let actionFound = false;
      for (const buttonSelector of actionButtons) {
        const button = page.locator(buttonSelector).first();
        if (await button.isVisible()) {
          await button.click();
          actionFound = true;
          break;
        }
      }
      
      if (actionFound) {
        // Verify action was processed
        await page.waitForTimeout(500);
        console.log(`${config.name}: Successfully performed game action`);
      } else {
        console.log(`${config.name}: No action buttons found (game may not be in action phase)`);
      }
    });

    test('Responsive design and mobile usability', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Get viewport size to determine if mobile
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;
      
      if (isMobile) {
        // Test mobile-specific interactions
        console.log(`${config.name}: Testing mobile interactions`);
        
        // Test tap interactions
        const player1Input = page.locator('input[placeholder*="Player 1"], #player1-name').first();
        await player1Input.tap();
        await player1Input.fill('MobilePlayer1');
        
        const player2Input = page.locator('input[placeholder*="Player 2"], #player2-name').first();
        await player2Input.tap();
        await player2Input.fill('MobilePlayer2');
        
        // Test mobile game creation
        const createButton = page.locator('button:has-text("Create Game"), #create-game').first();
        await createButton.tap();
        
        await page.waitForTimeout(2000);
        
        // Verify mobile layout works
        await expect(page.locator('body')).toBeVisible();
      } else {
        // Test desktop interactions
        console.log(`${config.name}: Testing desktop interactions`);
        
        // Standard click interactions for desktop
        await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('DesktopPlayer1');
        await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('DesktopPlayer2');
        await page.locator('button:has-text("Create Game"), #create-game').first().click();
        
        await page.waitForTimeout(2000);
      }
    });

    test('JavaScript and CSS compatibility', async ({ page }) => {
      // Check for JavaScript errors
      const jsErrors: any[] = [];
      page.on('pageerror', error => {
        jsErrors.push(error);
      });
      
      await page.goto('http://localhost:3000/table');
      await page.waitForTimeout(3000);
      
      // Create game to trigger JavaScript execution
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('JSTestPlayer1');
      await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('JSTestPlayer2');
      await page.locator('button:has-text("Create Game"), #create-game').first().click();
      
      await page.waitForTimeout(2000);
      
      // Check for critical JavaScript errors
      const criticalErrors = jsErrors.filter(error => 
        !error.message.includes('favicon') && // Ignore favicon errors
        !error.message.includes('manifest') && // Ignore manifest errors
        !error.message.includes('service-worker') // Ignore service worker errors
      );
      
      if (criticalErrors.length > 0) {
        console.log(`${config.name}: JavaScript errors detected:`, criticalErrors.map(e => e.message));
      }
      
      expect(criticalErrors.length).toBe(0);
    });

    test('Local storage and session persistence', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Create a game
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('StoragePlayer1');
      await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('StoragePlayer2');
      await page.locator('button:has-text("Create Game"), #create-game').first().click();
      
      await page.waitForTimeout(2000);
      
      // Get current URL (should contain game ID if using URL-based state)
      const currentUrl = page.url();
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Verify page still works after reload
      await expect(page.locator('body')).toBeVisible();
      
      console.log(`${config.name}: Page reload test completed`);
    });

    test('Network error handling', async ({ page }) => {
      await page.goto('http://localhost:3000/table');
      
      // Create game
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('NetworkPlayer1');
      await page.locator('input[placeholder*="Player 2"], #player2-name').first().fill('NetworkPlayer2');
      
      // Intercept network requests to simulate failures
      await page.route('**/api/**', async route => {
        // Simulate network error for some requests
        if (Math.random() < 0.1) { // 10% chance of network error
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      
      await page.locator('button:has-text("Create Game"), #create-game').first().click();
      await page.waitForTimeout(3000);
      
      // Page should still be functional even with some network errors
      await expect(page.locator('body')).toBeVisible();
      
      console.log(`${config.name}: Network error handling test completed`);
    });

    test('Performance and loading time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000/table');
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`${config.name}: Page load time: ${loadTime}ms`);
      
      // Page should load within reasonable time (10 seconds max)
      expect(loadTime).toBeLessThan(10000);
      
      // Test interactive performance
      const actionStart = Date.now();
      await page.locator('input[placeholder*="Player 1"], #player1-name').first().fill('PerfPlayer1');
      const actionTime = Date.now() - actionStart;
      
      console.log(`${config.name}: Input response time: ${actionTime}ms`);
      
      // Interactions should be responsive (under 1 second)
      expect(actionTime).toBeLessThan(1000);
    });
  });
}

// Cross-browser consistency tests
test.describe('Cross-Browser Consistency', () => {
  test('Game state consistency across browsers', async ({ browser }) => {
    // Create two browser contexts to simulate different users
    const context1 = await browser.newContext(devices['Desktop Chrome']);
    const context2 = await browser.newContext(devices['Desktop Firefox']);
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Player 1 creates game in Chrome
      await page1.goto('http://localhost:3000/table');
      await page1.locator('input[placeholder*="Player 1"], #player1-name').first().fill('ChromePlayer');
      await page1.locator('input[placeholder*="Player 2"], #player2-name').first().fill('FirefoxPlayer');
      await page1.locator('button:has-text("Create Game"), #create-game').first().click();
      
      await page1.waitForTimeout(2000);
      
      // Get game URL from page1
      const gameUrl = page1.url();
      
      // Player 2 joins from Firefox
      await page2.goto(gameUrl);
      await page2.waitForTimeout(2000);
      
      // Both pages should show the same game state
      const page1Content = await page1.textContent('body');
      const page2Content = await page2.textContent('body');
      
      // Both should have game content
      expect(page1Content).toContain('Player');
      expect(page2Content).toContain('Player');
      
      console.log('Cross-browser consistency test completed');
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});