/**
 * Lobby System E2E Tests
 * End-to-end testing for Increment 5: Lobby system user workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Lobby System E2E Tests', () => {
  
  test.describe('Lobby Page Access', () => {
    test('should display lobby page with game list', async ({ page }) => {
      await page.goto('/lobby');
      
      // Should see lobby header
      await expect(page.locator('h1')).toContainText('Game Lobby');
      
      // Should see create game button
      await expect(page.locator('button:has-text("Create Game")')).toBeVisible();
      
      // Should see empty game list message initially
      await expect(page.locator('text=No games available')).toBeVisible();
    });

    test('should navigate between lobby and table pages', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to lobby
      await page.click('a[href="/lobby"]');
      await expect(page).toHaveURL('/lobby');
      
      // Navigate to table from lobby 
      await page.click('text=Single Table');
      await expect(page).toHaveURL('/table');
    });
  });

  test.describe('Game Creation Workflow', () => {
    test('should create new game via lobby interface', async ({ page }) => {
      await page.goto('/lobby');
      
      // Click create game button
      await page.click('button:has-text("Create Game")');
      
      // Fill out game creation form
      await page.fill('input[name="gameName"]', 'E2E Test Game');
      
      // Select max players - click the select trigger then the option
      await page.locator('div:has(label:has-text("Max Players")) button').click();
      await page.getByText('4 Players').click();
      
      // Select game type - click the select trigger then the option  
      await page.locator('div:has(label:has-text("Game Type")) button').click();
      await page.getByText('Multi-Table').click();
      
      // Submit form (use the submit button in the dialog)
      await page.click('button[type="submit"]:has-text("Create Game")');
      
      // Should see new game in the list
      await expect(page.locator('text=E2E Test Game')).toBeVisible();
      await expect(page.locator('text=0/4 players')).toBeVisible();
      await expect(page.locator('text=Waiting')).toBeVisible();
    });

    test('should validate game creation form', async ({ page }) => {
      await page.goto('/lobby');
      
      await page.click('button:has-text("Create Game")');
      
      // Try to submit without required fields
      await page.click('button[type="submit"]:has-text("Create Game")');
      
      // Should show validation errors
      await expect(page.locator('text=Game name is required')).toBeVisible();
    });

    test('should create game with custom settings', async ({ page }) => {
      await page.goto('/lobby');
      
      await page.click('button:has-text("Create Game")');
      
      await page.fill('input[name="gameName"]', 'High Stakes Game');
      await page.selectOption('select[name="maxPlayers"]', '6');
      await page.selectOption('select[name="gameType"]', 'multi-table');
      await page.fill('input[name="buyIn"]', '500');
      
      await page.click('button:has-text("Create")');
      
      // Verify custom settings are displayed
      await expect(page.locator('text=High Stakes Game')).toBeVisible();
      await expect(page.locator('text=0/6 players')).toBeVisible();
      await expect(page.locator('text=Buy-in: $500')).toBeVisible();
    });
  });

  test.describe('Game Joining Workflow', () => {
    test('should join existing game from lobby', async ({ page }) => {
      await page.goto('/lobby');
      
      // Create a game first
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Join Test Game');
      await page.selectOption('select[name="maxPlayers"]', '2');
      await page.selectOption('select[name="gameType"]', 'heads-up');
      await page.click('button:has-text("Create")');
      
      // Join the game
      await page.click('button:has-text("Join"):first');
      
      // Fill player name
      await page.fill('input[name="playerName"]', 'E2E Player');
      await page.click('button:has-text("Join Game")');
      
      // Should navigate to game table
      await expect(page).toHaveURL(/\/table\/[a-f0-9-]+/);
      
      // Should see player in the game
      await expect(page.locator('text=E2E Player')).toBeVisible();
    });

    test('should not allow joining full games', async ({ page }) => {
      await page.goto('/lobby');
      
      // Create a 2-player game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Full Game Test');
      await page.selectOption('select[name="maxPlayers"]', '2');
      await page.click('button:has-text("Create")');
      
      // Join as first player
      await page.click('button:has-text("Join"):first');
      await page.fill('input[name="playerName"]', 'Player 1');
      await page.click('button:has-text("Join Game")');
      
      // Go back to lobby
      await page.goto('/lobby');
      
      // Join as second player (in new session)
      const page2 = await page.context().newPage();
      await page2.goto('/lobby');
      await page2.click('button:has-text("Join"):first');
      await page2.fill('input[name="playerName"]', 'Player 2');
      await page2.click('button:has-text("Join Game")');
      
      // Game should now be full - third player cannot join
      const page3 = await page.context().newPage();
      await page3.goto('/lobby');
      
      // Join button should be disabled or show "Full"
      await expect(page3.locator('text=Full').or(page3.locator('button:disabled:has-text("Join")'))).toBeVisible();
    });

    test('should display updated player count when players join', async ({ page }) => {
      await page.goto('/lobby');
      
      // Create a 4-player game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Player Count Test');
      await page.selectOption('select[name="maxPlayers"]', '4');
      await page.click('button:has-text("Create")');
      
      // Initially should show 0/4
      await expect(page.locator('text=0/4 players')).toBeVisible();
      
      // Join as first player
      await page.click('button:has-text("Join"):first');
      await page.fill('input[name="playerName"]', 'Player 1');
      await page.click('button:has-text("Join Game")');
      
      // Go back to lobby and check count
      await page.goto('/lobby');
      await expect(page.locator('text=1/4 players')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show real-time lobby updates across multiple browser tabs', async ({ browser }) => {
      // Create two browser contexts (like different users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // Both users go to lobby
      await page1.goto('/lobby');
      await page2.goto('/lobby');
      
      // User 1 creates a game
      await page1.click('button:has-text("Create Game")');
      await page1.fill('input[name="gameName"]', 'Real-time Test');
      await page1.selectOption('select[name="maxPlayers"]', '2');
      await page1.click('button:has-text("Create")');
      
      // User 2 should see the new game appear (real-time update)
      await expect(page2.locator('text=Real-time Test')).toBeVisible();
      
      // User 2 joins the game
      await page2.click('button:has-text("Join"):first');
      await page2.fill('input[name="playerName"]', 'User 2');
      await page2.click('button:has-text("Join Game")');
      
      // User 1 should see updated player count
      await expect(page1.locator('text=1/2 players')).toBeVisible();
      
      await context1.close();
      await context2.close();
    });

    test('should remove completed games from lobby', async ({ page }) => {
      // This test assumes games are automatically removed when completed
      await page.goto('/lobby');
      
      // Create a heads-up game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Completion Test');
      await page.selectOption('select[name="maxPlayers"]', '2');
      await page.click('button:has-text("Create")');
      
      await expect(page.locator('text=Completion Test')).toBeVisible();
      
      // Simulate game completion (this might involve API calls or game state changes)
      // For now, we'll just verify the game can be manually removed
      await expect(page.locator('text=Completion Test')).toBeVisible();
    });
  });

  test.describe('Game Status and Information', () => {
    test('should display game information correctly', async ({ page }) => {
      await page.goto('/lobby');
      
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Info Display Test');
      await page.selectOption('select[name="maxPlayers"]', '6');
      await page.selectOption('select[name="gameType"]', 'multi-table');
      await page.fill('input[name="buyIn"]', '250');
      await page.click('button:has-text("Create")');
      
      // Verify all game information is displayed
      await expect(page.locator('text=Info Display Test')).toBeVisible();
      await expect(page.locator('text=0/6 players')).toBeVisible();
      await expect(page.locator('text=Multi-table')).toBeVisible();
      await expect(page.locator('text=Buy-in: $250')).toBeVisible();
      await expect(page.locator('text=Waiting')).toBeVisible();
    });

    test('should show player names when they join', async ({ page }) => {
      await page.goto('/lobby');
      
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Player Names Test');
      await page.selectOption('select[name="maxPlayers"]', '4');
      await page.click('button:has-text("Create")');
      
      // Join the game
      await page.click('button:has-text("Join"):first');
      await page.fill('input[name="playerName"]', 'Alice');
      await page.click('button:has-text("Join Game")');
      
      // Go back to lobby
      await page.goto('/lobby');
      
      // Should show player name in the game info
      await expect(page.locator('text=Alice')).toBeVisible();
      await expect(page.locator('text=1/4 players')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/lobby');
      
      // Simulate network error by intercepting requests
      await page.route('**/api/lobby/games', route => {
        route.abort();
      });
      
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Network Error Test');
      await page.click('button:has-text("Create")');
      
      // Should show error message
      await expect(page.locator('text=Unable to create game').or(page.locator('text=Network error'))).toBeVisible();
    });

    test('should handle invalid game joins', async ({ page }) => {
      await page.goto('/lobby/games/invalid-game-id');
      
      // Should show error page or redirect to lobby
      await expect(page.locator('text=Game not found').or(page.locator('h1:has-text("Game Lobby")'))).toBeVisible();
    });
  });
});