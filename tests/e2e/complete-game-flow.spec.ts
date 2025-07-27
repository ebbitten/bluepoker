import { test, expect } from '@playwright/test';

test.describe('Complete Game Flow', () => {
  test('full game from creation to completion', async ({ page }) => {
    // Step 1: Create game
    await page.goto('/table');
    
    await page.fill('input[placeholder="Enter player 1 name"]', 'Alice');
    await page.fill('input[placeholder="Enter player 2 name"]', 'Bob');
    await page.click('button:has-text("Create Game & Get Shareable Link")');
    
    // Verify game creation
    await expect(page).toHaveURL(/\/table\/[a-f0-9-]+/);
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Step 2: Deal first hand
    await page.click('button:has-text("Deal Cards")');
    
    // Verify hand is dealt
    await expect(page.locator('text=Phase: preflop')).toBeVisible();
    await expect(page.locator('text=Hand #1')).toBeVisible();
    await expect(page.locator('text=Pot: $30')).toBeVisible();
    
    // Verify players have hole cards
    await expect(page.locator('text=Hole Cards:').first()).toBeVisible();
    
    // Step 3: Complete betting round (preflop)
    // First player action
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Call")');
    
    // Verify pot updated
    await expect(page.locator('text=Pot: $40')).toBeVisible();
    
    // Second player action (should progress to flop)
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    // Step 4: Verify flop
    await expect(page.locator('text=Phase: flop')).toBeVisible();
    
    // Should have 3 community cards
    const communityCards = page.locator('text=Community Cards').locator('..').locator('div').nth(1);
    await expect(communityCards).toBeVisible();
    
    // Step 5: Complete flop betting
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    // Step 6: Verify turn
    await expect(page.locator('text=Phase: turn')).toBeVisible();
    
    // Step 7: Complete turn betting
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    // Step 8: Verify river
    await expect(page.locator('text=Phase: river')).toBeVisible();
    
    // Step 9: Complete river betting
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Check")');
    
    // Step 10: Verify showdown
    await expect(page.locator('text=Phase: complete')).toBeVisible();
    
    // Should show winner
    await expect(page.locator('text=wins')).toBeVisible();
    
    // Should have "Start New Hand" button
    await expect(page.locator('button:has-text("Start New Hand")')).toBeVisible();
    
    // Step 11: Start new hand
    await page.click('button:has-text("Start New Hand")');
    
    // Verify new hand started
    await expect(page.locator('text=Hand #2')).toBeVisible();
    await expect(page.locator('text=Phase: waiting')).toBeVisible();
    await expect(page.locator('button:has-text("Deal Cards")')).toBeVisible();
  });

  test('game handles fold action correctly', async ({ page }) => {
    // Create and set up game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['Player1', 'Player2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Deal cards
    await page.click('button:has-text("Deal Cards")');
    await expect(page.locator('text=Phase: preflop')).toBeVisible();
    
    // First player folds
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Fold")');
    
    // Game should immediately end
    await expect(page.locator('text=Phase: complete')).toBeVisible();
    await expect(page.locator('text=wins')).toBeVisible();
    await expect(page.locator('text=(Folded)')).toBeVisible();
    
    // Should show "Start New Hand" button
    await expect(page.locator('button:has-text("Start New Hand")')).toBeVisible();
  });

  test('game handles all-in correctly', async ({ page }) => {
    // Create and set up game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['AllInTest1', 'AllInTest2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Deal cards
    await page.click('button:has-text("Deal Cards")');
    await expect(page.locator('text=Phase: preflop')).toBeVisible();
    
    // First player goes all-in
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("All-In")');
    
    // Verify all-in state
    await expect(page.locator('text=(All-In)')).toBeVisible();
    
    // Second player should have call/fold options
    await expect(page.locator('text=(Your Turn)')).toBeVisible();
    await page.click('button:has-text("Call")');
    
    // Should go straight to showdown
    await expect(page.locator('text=Phase: complete')).toBeVisible();
    await expect(page.locator('text=wins')).toBeVisible();
  });

  test('UI updates reflect correct game state throughout', async ({ page }) => {
    // Create game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['StateTest1', 'StateTest2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Initial state verification
    await expect(page.locator('text=Phase: waiting')).toBeVisible();
    await expect(page.locator('text=Pot: $0')).toBeVisible();
    await expect(page.locator('text=Current Bet: $0')).toBeVisible();
    await expect(page.locator('text=Chips: $1000')).toHaveCount(2);
    
    // Deal cards and verify state changes
    await page.click('button:has-text("Deal Cards")');
    
    await expect(page.locator('text=Phase: preflop')).toBeVisible();
    await expect(page.locator('text=Pot: $30')).toBeVisible();
    await expect(page.locator('text=Current Bet: $20')).toBeVisible();
    
    // Verify chip counts decreased due to blinds
    await expect(page.locator('text=Chips: $990')).toHaveCount(1); // Small blind
    await expect(page.locator('text=Chips: $980')).toHaveCount(1); // Big blind
    
    // Make action and verify state updates
    await page.click('button:has-text("Call")');
    
    await expect(page.locator('text=Pot: $40')).toBeVisible();
    
    // Verify active player indicator moves
    await expect(page.locator('text=(Your Turn)')).toHaveCount(1);
  });

  test('copy game URL functionality works', async ({ page }) => {
    // Create game
    const response = await page.request.post('/api/game/create', {
      data: {
        playerNames: ['CopyTest1', 'CopyTest2']
      }
    });
    
    const gameData = await response.json();
    await page.goto(`/table/${gameData.gameId}`);
    
    await expect(page.locator('text=No game data available')).not.toBeVisible();
    
    // Click copy URL button
    await page.click('text=📋 Copy shareable link');
    
    // Should show success message
    await expect(page.locator('text=✅ Game URL copied to clipboard!')).toBeVisible();
    
    // Success message should disappear after timeout
    await expect(page.locator('text=✅ Game URL copied to clipboard!')).not.toBeVisible({ timeout: 5000 });
  });
});