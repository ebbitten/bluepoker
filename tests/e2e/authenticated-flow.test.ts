/**
 * End-to-End Authenticated Flow Tests
 * Tests complete user journeys from registration to gameplay
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

interface TestUser {
  email: string;
  password: string;
  username: string;
}

// Create unique test users for each test
function createTestUser(suffix: string = ''): TestUser {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}${suffix}@example.com`,
    password: 'TestPass123!',
    username: `testuser${timestamp}${suffix}`
  };
}

test.describe('Authenticated User Flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('Complete User Registration Flow', async ({ page }) => {
    const testUser = createTestUser();

    // Navigate to registration page (assuming it exists)
    await page.goto(`${BASE_URL}/auth/register`);

    // Fill registration form
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.fill('[data-testid="username-input"]', testUser.username);
    await page.click('[data-testid="register-button"]');

    // Should redirect to lobby or dashboard after successful registration
    await expect(page).toHaveURL(/\/lobby|\/dashboard|\/$/);
    
    // Should show authenticated user UI
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await expect(page.getByText(testUser.username)).toBeVisible();
  });

  test('Login and Access Protected Pages', async ({ page }) => {
    const testUser = createTestUser('-login');

    // First register the user via API
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: testUser.email,
        password: testUser.password,
        username: testUser.username
      }
    });
    expect(registerResponse.status()).toBe(201);

    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`);

    // Fill login form
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="login-button"]');

    // Should redirect to authenticated area
    await expect(page).toHaveURL(/\/lobby|\/dashboard|\/$/);
    
    // Test access to protected pages
    await page.goto(`${BASE_URL}/lobby`);
    await expect(page.getByTestId('lobby-container')).toBeVisible();
    
    await page.goto(`${BASE_URL}/profile`);
    await expect(page.getByTestId('profile-container')).toBeVisible();
  });

  test('Authenticated Game Creation and Joining', async ({ page }) => {
    const testUser = createTestUser('-game');

    // Register and login via API to get token
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: testUser.email,
        password: testUser.password,
        username: testUser.username
      }
    });
    const { token } = await registerResponse.json();

    // Set authentication token in browser
    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token);

    // Navigate to lobby
    await page.goto(`${BASE_URL}/lobby`);

    // Create a new game
    await page.click('[data-testid="create-game-button"]');
    await page.fill('[data-testid="game-name-input"]', 'Test Game');
    await page.click('[data-testid="confirm-create-game"]');

    // Should be redirected to the game table
    await expect(page).toHaveURL(/\/table\/[a-f0-9-]+/);
    
    // Should show the poker table
    await expect(page.getByTestId('poker-table')).toBeVisible();
    await expect(page.getByText(testUser.username)).toBeVisible();
  });

  test('Multi-User Game Session', async ({ browser }) => {
    const user1 = createTestUser('-p1');
    const user2 = createTestUser('-p2');

    // Create two browser contexts for two different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Register both users
    const reg1 = await page1.request.post(`${BASE_URL}/api/auth/register`, {
      data: user1
    });
    const reg2 = await page2.request.post(`${BASE_URL}/api/auth/register`, {
      data: user2
    });

    const { token: token1 } = await reg1.json();
    const { token: token2 } = await reg2.json();

    // Set tokens in both browsers
    await page1.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token1);
    
    await page2.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token2);

    // User 1 creates a game via API
    const gameResponse = await page1.request.post(`${BASE_URL}/api/game/create`, {
      headers: { 'Authorization': `Bearer ${token1}` },
      data: { playerNames: [user1.username, user2.username] }
    });
    const { gameId } = await gameResponse.json();

    // Both users navigate to the game
    await page1.goto(`${BASE_URL}/table/${gameId}`);
    await page2.goto(`${BASE_URL}/table/${gameId}`);

    // Both should see the game table
    await expect(page1.getByTestId('poker-table')).toBeVisible();
    await expect(page2.getByTestId('poker-table')).toBeVisible();

    // Both should see their own usernames
    await expect(page1.getByText(user1.username)).toBeVisible();
    await expect(page2.getByText(user2.username)).toBeVisible();

    // Test real-time synchronization
    await page1.click('[data-testid="call-button"]');
    
    // Page 2 should see the action immediately
    await expect(page2.getByTestId('game-log')).toContainText('call');

    await context1.close();
    await context2.close();
  });

  test('Session Persistence and Refresh', async ({ page }) => {
    const testUser = createTestUser('-persistence');

    // Register user
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    // Set token in browser
    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token);

    // Navigate to authenticated page
    await page.goto(`${BASE_URL}/lobby`);
    await expect(page.getByTestId('lobby-container')).toBeVisible();

    // Refresh the page
    await page.reload();

    // Should still be authenticated
    await expect(page.getByTestId('lobby-container')).toBeVisible();
    await expect(page.getByText(testUser.username)).toBeVisible();
  });

  test('Logout Flow', async ({ page }) => {
    const testUser = createTestUser('-logout');

    // Register and login
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token);

    await page.goto(`${BASE_URL}/lobby`);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to landing page
    await expect(page).toHaveURL(`${BASE_URL}/`);
    
    // Should not have authenticated UI
    await expect(page.getByTestId('user-menu')).not.toBeVisible();

    // Attempting to access protected page should redirect
    await page.goto(`${BASE_URL}/lobby`);
    await expect(page).toHaveURL(/\/auth\/login|\/$/);
  });

  test('Access Control - Protected Routes', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/lobby', '/profile', '/table/test-game'];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      
      // Should redirect to login or show unauthorized
      await expect(page).toHaveURL(/\/auth\/login|\/$/);
    }
  });

  test('Token Expiration Handling', async ({ page }) => {
    const testUser = createTestUser('-expiry');

    // Register user
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    // Set an expired token
    const expiredToken = 'expired.jwt.token';
    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, expiredToken);

    // Try to access protected page
    await page.goto(`${BASE_URL}/lobby`);

    // Should handle expired token gracefully
    await expect(page).toHaveURL(/\/auth\/login|\/$/);
  });

  test('Invalid Registration Data Handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Test invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'ValidPass123!');
    await page.fill('[data-testid="username-input"]', 'validuser');
    await page.click('[data-testid="register-button"]');

    await expect(page.getByText(/invalid email/i)).toBeVisible();

    // Test weak password
    await page.fill('[data-testid="email-input"]', 'valid@example.com');
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.click('[data-testid="register-button"]');

    await expect(page.getByText(/password must/i)).toBeVisible();

    // Test missing username
    await page.fill('[data-testid="password-input"]', 'ValidPass123!');
    await page.fill('[data-testid="username-input"]', '');
    await page.click('[data-testid="register-button"]');

    await expect(page.getByText(/username.*required/i)).toBeVisible();
  });

  test('Game Action Authorization', async ({ page }) => {
    const testUser = createTestUser('-actions');

    // Register and get token
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    // Create a game via API
    const gameResponse = await page.request.post(`${BASE_URL}/api/game/create`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { playerNames: [testUser.username, 'TestPlayer2'] }
    });
    const { gameId } = await gameResponse.json();

    await page.addInitScript((token) => {
      localStorage.setItem('auth_token', token);
    }, token);

    // Navigate to game
    await page.goto(`${BASE_URL}/table/${gameId}`);

    // Should only be able to make actions for own player
    const actionButtons = page.getByTestId('action-buttons');
    await expect(actionButtons).toBeVisible();

    // Clicking call should work (assuming it's the user's turn)
    const callButton = page.getByTestId('call-button');
    if (await callButton.isEnabled()) {
      await callButton.click();
      
      // Should see action in game log
      await expect(page.getByTestId('game-log')).toContainText(testUser.username);
    }
  });
});

test.describe('Authentication API Direct Tests', () => {
  test('Register via API', async ({ request }) => {
    const testUser = createTestUser('-api');

    const response = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });

    expect(response.status()).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.username).toBe(testUser.username);
    expect(data.token).toBeTruthy();
  });

  test('Login via API', async ({ request }) => {
    const testUser = createTestUser('-api-login');

    // Register first
    await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });

    // Then login
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(testUser.email);
    expect(data.token).toBeTruthy();
  });

  test('Protected endpoint access', async ({ request }) => {
    const testUser = createTestUser('-api-protected');

    // Register to get token
    const registerResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    // Access protected endpoint
    const response = await request.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.username).toBe(testUser.username);
  });

  test('Unauthorized access rejection', async ({ request }) => {
    // Try to access protected endpoint without token
    const response = await request.get(`${BASE_URL}/api/auth/me`);
    expect(response.status()).toBe(401);

    // Try with invalid token
    const responseInvalid = await request.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    expect(responseInvalid.status()).toBe(401);
  });

  test('Game creation requires authentication', async ({ request }) => {
    // Try to create game without token
    const response = await request.post(`${BASE_URL}/api/game/create`, {
      data: { playerNames: ['Player1', 'Player2'] }
    });
    expect(response.status()).toBe(401);
  });

  test('Game actions require authentication and authorization', async ({ request }) => {
    const testUser = createTestUser('-api-game');

    // Register to get token
    const registerResponse = await request.post(`${BASE_URL}/api/auth/register`, {
      data: testUser
    });
    const { token } = await registerResponse.json();

    // Create game
    const gameResponse = await request.post(`${BASE_URL}/api/game/create`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { playerNames: [testUser.username, 'TestPlayer2'] }
    });
    const { gameId } = await gameResponse.json();

    // Get game state to find player ID
    const stateResponse = await request.get(`${BASE_URL}/api/game/${gameId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const gameState = await stateResponse.json();
    const playerId = gameState.players.find((p: any) => p.name === testUser.username)?.id;

    // Try game action without token
    const unauthorizedResponse = await request.post(`${BASE_URL}/api/game/${gameId}/action`, {
      data: { playerId, action: 'call' }
    });
    expect(unauthorizedResponse.status()).toBe(401);

    // Game action with token should work (if it's the player's turn)
    const authorizedResponse = await request.post(`${BASE_URL}/api/game/${gameId}/action`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: { playerId, action: 'call' }
    });
    // Should be either 200 (success) or 400 (not player's turn)
    expect([200, 400, 403]).toContain(authorizedResponse.status());
  });
});