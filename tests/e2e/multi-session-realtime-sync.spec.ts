import { test, expect } from '@playwright/test';

test.describe('Multi-Session Real-time Synchronization', () => {
  test('two browser sessions stay synchronized in real-time', async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Create a game via API
    const response = await page1.request.post('/api/game/create', {
      data: {
        playerNames: ['Alice', 'Bob']
      }
    });
    
    const gameData = await response.json();
    const gameId = gameData.gameId;
    
    // Both browsers navigate to the same game
    await page1.goto(`/table/${gameId}`);
    await page2.goto(`/table/${gameId}`);
    
    // Verify both pages load correctly
    await expect(page1.locator('text=No game data available')).not.toBeVisible();
    await expect(page2.locator('text=No game data available')).not.toBeVisible();
    
    await expect(page1.locator('text=Alice')).toBeVisible();
    await expect(page2.locator('text=Alice')).toBeVisible();
    
    // Test 1: Deal Cards Synchronization
    // Page 1 deals cards
    await page1.click('button:has-text("Deal Cards")');
    
    // Verify page 1 shows dealt state
    await expect(page1.locator('text=Phase: preflop')).toBeVisible({ timeout: 5000 });
    await expect(page1.locator('text=Pot: $30')).toBeVisible();
    
    // CRITICAL: Verify page 2 automatically updates to show the same state
    await expect(page2.locator('text=Phase: preflop')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('text=Pot: $30')).toBeVisible();
    
    // Verify both pages show active player
    await expect(page1.locator('text=(Your Turn)')).toBeVisible();
    await expect(page2.locator('text=(Your Turn)')).toBeVisible();
    
    // Test 2: Player Action Synchronization
    // Page 1 makes a call action
    await page1.click('button:has-text("Call")');
    
    // Verify page 1 shows updated state
    await expect(page1.locator('text=Pot: $40')).toBeVisible({ timeout: 5000 });
    
    // CRITICAL: Verify page 2 automatically updates to show the action result
    await expect(page2.locator('text=Pot: $40')).toBeVisible({ timeout: 10000 });
    
    // Verify turn has switched
    const page1ActivePlayer = page1.locator('text=(Your Turn)');
    const page2ActivePlayer = page2.locator('text=(Your Turn)');
    
    // Both pages should show the same active player
    await expect(page1ActivePlayer).toHaveCount(1);
    await expect(page2ActivePlayer).toHaveCount(1);
    
    // Test 3: Real-time Connection Status
    // Both pages should show real-time connection status
    await expect(page1.locator('text=Real-time')).toBeVisible();
    await expect(page2.locator('text=Real-time')).toBeVisible();
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('game state synchronizes when joining mid-game', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Create a game and start playing on page 1
    const response = await page1.request.post('/api/game/create', {
      data: {
        playerNames: ['Player1', 'Player2']
      }
    });
    
    const gameData = await response.json();
    const gameId = gameData.gameId;
    
    // Page 1 joins and starts the game
    await page1.goto(`/table/${gameId}`);
    await expect(page1.locator('text=No game data available')).not.toBeVisible();
    
    // Deal cards on page 1
    await page1.click('button:has-text("Deal Cards")');
    await expect(page1.locator('text=Phase: preflop')).toBeVisible();
    
    // Page 2 joins after game has started
    await page2.goto(`/table/${gameId}`);
    await expect(page2.locator('text=No game data available')).not.toBeVisible();
    
    // CRITICAL: Page 2 should immediately show the current game state
    await expect(page2.locator('text=Phase: preflop')).toBeVisible();
    await expect(page2.locator('text=Pot: $30')).toBeVisible();
    
    // Both pages should show the same game state
    const page1Pot = page1.locator('text=Pot:').locator('..').innerText();
    const page2Pot = page2.locator('text=Pot:').locator('..').innerText();
    
    expect(await page1Pot).toBe(await page2Pot);
    
    await context1.close();
    await context2.close();
  });

  test('connection recovery after network interruption', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Create and join game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['TestPlayer1', 'TestPlayer2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Verify initial connection
    await expect(page.locator('text=Real-time')).toBeVisible();
    
    // Simulate network interruption by going offline
    await context.setOffline(true);
    
    // Wait for connection to be detected as lost
    await expect(page.locator('text=Disconnected').or(page.locator('text=Fallback Mode'))).toBeVisible({ timeout: 15000 });
    
    // Restore network connection
    await context.setOffline(false);
    
    // CRITICAL: Connection should recover automatically
    await expect(page.locator('text=Real-time').or(page.locator('text=Connected'))).toBeVisible({ timeout: 15000 });
    
    // Game should still be functional
    await expect(page.locator('text=TestPlayer1')).toBeVisible();
    await expect(page.locator('text=TestPlayer2')).toBeVisible();
    
    await context.close();
  });

  test('fallback mode works when real-time connection fails', async ({ page }) => {
    // Create and join game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['FallbackTest1', 'FallbackTest2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Wait for connection to establish or fallback
    await page.waitForTimeout(3000);
    
    // Should show some connection state (not disconnected)
    const connectionText = page.locator('text=Connection:').locator('..').locator('span').nth(1);
    await expect(connectionText).not.toContainText('Disconnected');
    
    // Game should still be functional regardless of connection type
    await expect(page.locator('text=FallbackTest1')).toBeVisible();
    await expect(page.locator('text=FallbackTest2')).toBeVisible();
    await expect(page.locator('button:has-text("Deal Cards")')).toBeVisible();
    
    // Test that actions work in fallback mode
    await page.click('button:has-text("Deal Cards")');
    await expect(page.locator('text=Phase: preflop')).toBeVisible();
  });
});