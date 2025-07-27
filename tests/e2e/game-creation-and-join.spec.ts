import { test, expect } from '@playwright/test';

test.describe('Game Creation and Join Flow', () => {
  test('complete user journey: create game → join via URL → see game data', async ({ page }) => {
    // Step 1: Navigate to table page
    await page.goto('/table');
    
    // Step 2: Verify table page loads correctly
    await expect(page.locator('h1')).toContainText('Poker Table');
    await expect(page.locator('h2')).toContainText('Create New Game');
    
    // Step 3: Fill in player names
    await page.fill('input[placeholder="Enter player 1 name"]', 'Alice');
    await page.fill('input[placeholder="Enter player 2 name"]', 'Bob');
    
    // Step 4: Create game
    await page.click('button:has-text("Create Game & Get Shareable Link")');
    
    // Step 5: Verify redirect to game page
    await expect(page).toHaveURL(/\/table\/[a-f0-9-]+/);
    
    // Step 6: CRITICAL - Verify game data loads (not "No game data available")
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Step 7: Verify game elements are present
    await expect(page.locator('h1')).toContainText('Poker Table');
    await expect(page.locator('text=Game ID:')).toBeVisible();
    await expect(page.locator('text=Hand #')).toBeVisible();
    await expect(page.locator('text=Phase: waiting')).toBeVisible();
    await expect(page.locator('text=Pot: $0')).toBeVisible();
    
    // Step 8: Verify player names are displayed
    await expect(page.locator('text=Alice')).toBeVisible();
    await expect(page.locator('text=Bob')).toBeVisible();
    
    // Step 9: Verify players have correct starting chips
    await expect(page.locator('text=Chips: $1000')).toHaveCount(2);
    
    // Step 10: Verify game controls are present
    await expect(page.locator('text=Game Controls')).toBeVisible();
    await expect(page.locator('button:has-text("Deal Cards")')).toBeVisible();
  });

  test('direct game URL access works correctly', async ({ page }) => {
    // Create a game via API first
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['TestPlayer1', 'TestPlayer2']
      }
    });
    
    const gameData = await response.json();
    const gameId = gameData.gameId;
    
    // Navigate directly to game URL
    await page.goto(`/table/${gameId}`);
    
    // CRITICAL - Verify no "No game data available" error
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Verify game loads correctly
    await expect(page.locator('h1')).toContainText('Poker Table');
    await expect(page.locator(`text=Game ID: ${gameId}`)).toBeVisible();
    await expect(page.locator('text=TestPlayer1')).toBeVisible();
    await expect(page.locator('text=TestPlayer2')).toBeVisible();
  });

  test('game not found shows proper error', async ({ page }) => {
    // Navigate to non-existent game
    await page.goto('/table/non-existent-game-id');
    
    // Verify proper error handling
    await expect(page.locator('text=Game Not Found')).toBeVisible();
    await expect(page.locator('text=does not exist')).toBeVisible();
    await expect(page.locator('button:has-text("Create New Game")')).toBeVisible();
  });

  test('connection status indicator shows correct state', async ({ page }) => {
    // Create and navigate to game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['Player1', 'Player2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    // Wait for game to load
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Verify connection status indicator exists
    await expect(page.locator('text=Connection:')).toBeVisible();
    
    // Should show some connection state (Real-time, Fallback Mode, etc.)
    const connectionStatus = page.locator('text=Connection:').locator('..').locator('span').nth(1);
    await expect(connectionStatus).toBeVisible();
    
    // Should not show "Disconnected" initially
    await expect(connectionStatus).not.toContainText('Disconnected');
  });
});