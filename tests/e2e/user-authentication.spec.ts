/**
 * User Authentication E2E Tests
 * Tests complete user authentication flows in browser
 * These tests MUST fail initially, then pass after implementation
 */

import { test, expect } from '@playwright/test';

test.describe('User Authentication E2E', () => {
  const testUser = {
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    username: `e2euser${Date.now()}`
  };

  test.describe('Registration Flow', () => {
    test('should complete user registration flow', async ({ page }) => {
      await page.goto('/');
      
      // Should see login/register options on homepage
      await expect(page.locator('text=Sign Up')).toBeVisible();
      await page.click('text=Sign Up');
      
      // Should navigate to registration page
      await expect(page).toHaveURL('/auth/register');
      
      // Fill out registration form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      
      // Submit registration
      await page.click('button[type="submit"]');
      
      // Should redirect to lobby after successful registration
      await expect(page).toHaveURL('/lobby');
      
      // Should see user menu with username
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
      
      // Should see "Sign Out" option
      await expect(page.locator('text=Sign Out')).toBeVisible();
    });

    test('should show validation errors for invalid registration', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Try to submit with weak password
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="username"]', testUser.username);
      
      await page.click('button[type="submit"]');
      
      // Should show password validation error
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
      
      // Should not redirect
      await expect(page).toHaveURL('/auth/register');
    });

    test('should handle duplicate email registration', async ({ page }) => {
      // First registration
      await page.goto('/auth/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      await page.click('button[type="submit"]');
      
      // Wait for registration to complete
      await expect(page).toHaveURL('/lobby');
      
      // Log out
      await page.click('text=Sign Out');
      await expect(page).toHaveURL('/');
      
      // Try to register with same email
      await page.click('text=Sign Up');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', 'differentuser');
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('text=Email already registered')).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Register a test user first
      await page.goto('/auth/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/lobby');
      
      // Log out
      await page.click('text=Sign Out');
      await expect(page).toHaveURL('/');
    });

    test('should complete login flow', async ({ page }) => {
      // Click sign in
      await page.click('text=Sign In');
      await expect(page).toHaveURL('/auth/login');
      
      // Fill login form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      
      // Submit login
      await page.click('button[type="submit"]');
      
      // Should redirect to lobby
      await expect(page).toHaveURL('/lobby');
      
      // Should see username in user menu
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Wrong password
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      
      // Should stay on login page
      await expect(page).toHaveURL('/auth/login');
    });

    test('should handle remember me functionality', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Login with remember me checked
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.check('input[name="rememberMe"]');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/lobby');
      
      // Refresh page - should stay logged in
      await page.reload();
      await expect(page).toHaveURL('/lobby');
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access lobby without authentication
      await page.goto('/lobby');
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
      
      // Should show message about needing to log in
      await expect(page.locator('text=Please sign in to continue')).toBeVisible();
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      // Register and login
      await page.goto('/auth/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      await page.click('button[type="submit"]');
      
      // Should be able to access lobby
      await expect(page).toHaveURL('/lobby');
      
      // Should be able to navigate to other protected routes
      await page.goto('/profile');
      await expect(page).toHaveURL('/profile');
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      // Register and login
      await page.goto('/auth/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/lobby');
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await expect(page).toHaveURL('/lobby');
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
    });

    test('should logout and clear session', async ({ page }) => {
      // Logout
      await page.click('text=Sign Out');
      
      // Should redirect to home
      await expect(page).toHaveURL('/');
      
      // Should show sign in/up options
      await expect(page.locator('text=Sign In')).toBeVisible();
      await expect(page.locator('text=Sign Up')).toBeVisible();
      
      // Try to access protected route
      await page.goto('/lobby');
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
    });

    test('should handle session expiration', async ({ page }) => {
      // This test would simulate session expiration
      // For now, we'll mock it by manually clearing localStorage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected route
      await page.goto('/lobby');
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('text=Session expired')).toBeVisible();
    });
  });

  test.describe('Authenticated Game Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Register and login
      await page.goto('/auth/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="username"]', testUser.username);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/lobby');
    });

    test('should create game with authenticated user as owner', async ({ page }) => {
      // Create a game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Auth Test Game');
      
      // Select game options
      await page.locator('div:has(label:has-text("Max Players")) button').click();
      await page.getByText('4 Players').click();
      
      await page.click('button[type="submit"]:has-text("Create Game")');
      
      // Game should appear in lobby with current user as creator
      await expect(page.locator('text=Auth Test Game')).toBeVisible();
      await expect(page.locator(`text=Created by ${testUser.username}`)).toBeVisible();
    });

    test('should join game with authenticated user identity', async ({ page }) => {
      // Create a game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Join Test Game');
      await page.locator('div:has(label:has-text("Max Players")) button').click();
      await page.getByText('4 Players').click();
      await page.click('button[type="submit"]:has-text("Create Game")');
      
      // Join the game (should not prompt for player name since we're authenticated)
      await page.click('button:has-text("Join Game")');
      
      // Should redirect to game table
      await expect(page.url()).toContain('/table/');
      
      // Should see authenticated username in game
      await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
      
      // Should not see placeholder names
      await expect(page.locator('text=Waiting for Player')).not.toBeVisible();
    });

    test('should prevent unauthorized game actions', async ({ page }) => {
      // This test would require a second user and more complex setup
      // For now, we'll verify that game actions are tied to authenticated user
      
      // Create and join a game
      await page.click('button:has-text("Create Game")');
      await page.fill('input[name="gameName"]', 'Action Test Game');
      await page.locator('div:has(label:has-text("Max Players")) button').click();
      await page.getByText('2 Players').click();
      await page.click('button[type="submit"]:has-text("Create Game")');
      
      await page.click('button:has-text("Join Game")');
      await expect(page.url()).toContain('/table/');
      
      // Verify that game actions are enabled for authenticated user
      // (Specific actions depend on game implementation)
      await expect(page.locator('button:has-text("Call")')).toBeVisible();
      await expect(page.locator('button:has-text("Fold")')).toBeVisible();
    });
  });

  test.describe('Multi-User Game Flow', () => {
    test('should handle multiple authenticated users in same game', async ({ browser }) => {
      // Create two browser contexts (simulate two users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const user1 = {
        email: `user1-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        username: `user1-${Date.now()}`
      };
      
      const user2 = {
        email: `user2-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        username: `user2-${Date.now()}`
      };
      
      try {
        // Register user1
        await page1.goto('/auth/register');
        await page1.fill('input[name="email"]', user1.email);
        await page1.fill('input[name="password"]', user1.password);
        await page1.fill('input[name="confirmPassword"]', user1.password);
        await page1.fill('input[name="username"]', user1.username);
        await page1.click('button[type="submit"]');
        await expect(page1).toHaveURL('/lobby');
        
        // Register user2
        await page2.goto('/auth/register');
        await page2.fill('input[name="email"]', user2.email);
        await page2.fill('input[name="password"]', user2.password);
        await page2.fill('input[name="confirmPassword"]', user2.password);
        await page2.fill('input[name="username"]', user2.username);
        await page2.click('button[type="submit"]');
        await expect(page2).toHaveURL('/lobby');
        
        // User1 creates a game
        await page1.click('button:has-text("Create Game")');
        await page1.fill('input[name="gameName"]', 'Multi-User Test');
        await page1.locator('div:has(label:has-text("Max Players")) button').click();
        await page1.getByText('2 Players').click();
        await page1.click('button[type="submit"]:has-text("Create Game")');
        
        // User2 should see the game in lobby
        await expect(page2.locator('text=Multi-User Test')).toBeVisible();
        
        // User1 joins game
        await page1.click('button:has-text("Join Game")');
        await expect(page1.url()).toContain('/table/');
        
        // User2 joins same game
        await page2.click('button:has-text("Join Game")');
        await expect(page2.url()).toContain('/table/');
        
        // Both users should see each other in the game
        await expect(page1.locator(`text=${user1.username}`)).toBeVisible();
        await expect(page1.locator(`text=${user2.username}`)).toBeVisible();
        await expect(page2.locator(`text=${user1.username}`)).toBeVisible();
        await expect(page2.locator(`text=${user2.username}`)).toBeVisible();
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });
});