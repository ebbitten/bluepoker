/**
 * User Authentication Integration Tests
 * Tests authentication flow with real API endpoints
 * These tests MUST fail initially, then pass after implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const baseUrl = 'http://localhost:3000';

interface AuthTestUser {
  email: string;
  password: string;
  username: string;
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
  };
  token?: string;
  error?: string;
}

// Test utilities
async function makeAuthRequest(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  const fetch = (await import('node-fetch')).default;
  
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${baseUrl}${endpoint}`, options);
  const data = await response.text();
  
  let jsonData;
  try {
    jsonData = JSON.parse(data);
  } catch (e) {
    jsonData = { error: data };
  }
  
  return {
    status: response.status,
    data: jsonData,
    ok: response.ok
  };
}

describe('Authentication API Integration', () => {
  const testUser: AuthTestUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    username: `testuser${Date.now()}`
  };

  let authToken: string | undefined;
  let userId: string | undefined;

  afterEach(async () => {
    // Cleanup: logout if we have a token
    if (authToken) {
      await makeAuthRequest('/api/auth/logout', 'POST', null, authToken);
      authToken = undefined;
      userId = undefined;
    }
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await makeAuthRequest('/api/auth/register', 'POST', {
        email: testUser.email,
        password: testUser.password,
        username: testUser.username
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testUser.email);
      expect(response.data.user.username).toBe(testUser.username);
      expect(response.data.token).toBeDefined();

      // Save for cleanup
      authToken = response.data.token;
      userId = response.data.user.id;
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await makeAuthRequest('/api/auth/register', 'POST', testUser);

      // Duplicate registration
      const response = await makeAuthRequest('/api/auth/register', 'POST', {
        ...testUser,
        username: 'differentuser'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('email');
    });

    it('should reject duplicate username registration', async () => {
      // First registration
      await makeAuthRequest('/api/auth/register', 'POST', testUser);

      // Duplicate username
      const response = await makeAuthRequest('/api/auth/register', 'POST', {
        ...testUser,
        email: 'different@example.com'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('username');
    });

    it('should validate email format', async () => {
      const response = await makeAuthRequest('/api/auth/register', 'POST', {
        ...testUser,
        email: 'invalid-email'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('email');
    });

    it('should validate password strength', async () => {
      const response = await makeAuthRequest('/api/auth/register', 'POST', {
        ...testUser,
        password: '123'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('password');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register test user
      const registerResponse = await makeAuthRequest('/api/auth/register', 'POST', testUser);
      if (registerResponse.data.token) {
        // Logout to test login
        await makeAuthRequest('/api/auth/logout', 'POST', null, registerResponse.data.token);
      }
    });

    it('should login with valid credentials', async () => {
      const response = await makeAuthRequest('/api/auth/login', 'POST', {
        email: testUser.email,
        password: testUser.password
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testUser.email);
      expect(response.data.token).toBeDefined();

      authToken = response.data.token;
      userId = response.data.user.id;
    });

    it('should reject invalid email', async () => {
      const response = await makeAuthRequest('/api/auth/login', 'POST', {
        email: 'nonexistent@example.com',
        password: testUser.password
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('credentials');
    });

    it('should reject invalid password', async () => {
      const response = await makeAuthRequest('/api/auth/login', 'POST', {
        email: testUser.email,
        password: 'wrongpassword'
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('credentials');
    });
  });

  describe('Protected Endpoints', () => {
    beforeEach(async () => {
      // Login and get token
      const registerResponse = await makeAuthRequest('/api/auth/register', 'POST', testUser);
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
    });

    it('should access user profile with valid token', async () => {
      const response = await makeAuthRequest('/api/auth/me', 'GET', null, authToken);

      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.user.email).toBe(testUser.email);
      expect(response.data.user.username).toBe(testUser.username);
    });

    it('should reject access without token', async () => {
      const response = await makeAuthRequest('/api/auth/me', 'GET');

      expect(response.status).toBe(401);
      expect(response.data.error).toContain('authentication');
    });

    it('should reject access with invalid token', async () => {
      const response = await makeAuthRequest('/api/auth/me', 'GET', null, 'invalid-token');

      expect(response.status).toBe(401);
      expect(response.data.error).toContain('authentication');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      const registerResponse = await makeAuthRequest('/api/auth/register', 'POST', testUser);
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
    });

    it('should logout successfully', async () => {
      const response = await makeAuthRequest('/api/auth/logout', 'POST', null, authToken);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify token is invalidated
      const profileResponse = await makeAuthRequest('/api/auth/me', 'GET', null, authToken);
      expect(profileResponse.status).toBe(401);

      authToken = undefined; // Prevent double cleanup
    });

    it('should refresh token', async () => {
      // This test assumes we implement refresh token functionality
      const response = await makeAuthRequest('/api/auth/refresh', 'POST', {
        refreshToken: 'mock-refresh-token'
      });

      // Will fail until implemented
      expect(response.status).toBe(200);
      expect(response.data.token).toBeDefined();
    });
  });
});

describe('Authenticated Lobby Integration', () => {
  const testUser: AuthTestUser = {
    email: `lobby-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    username: `lobbyuser${Date.now()}`
  };

  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    // Register and login test user
    const registerResponse = await makeAuthRequest('/api/auth/register', 'POST', testUser);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });

  afterEach(async () => {
    if (authToken) {
      await makeAuthRequest('/api/auth/logout', 'POST', null, authToken);
    }
  });

  it('should require authentication for game creation', async () => {
    // Without auth token
    const unauthorizedResponse = await makeAuthRequest('/api/lobby/games', 'POST', {
      name: 'Test Game',
      maxPlayers: 4,
      gameType: 'multi-table'
    });

    expect(unauthorizedResponse.status).toBe(401);

    // With auth token
    const authorizedResponse = await makeAuthRequest('/api/lobby/games', 'POST', {
      name: 'Test Game',
      maxPlayers: 4,
      gameType: 'multi-table'
    }, authToken);

    expect(authorizedResponse.status).toBe(201);
    expect(authorizedResponse.data.gameId).toBeDefined();
    expect(authorizedResponse.data.createdBy).toBe(userId);
  });

  it('should require authentication for joining games', async () => {
    // Create a game first
    const createResponse = await makeAuthRequest('/api/lobby/games', 'POST', {
      name: 'Test Game',
      maxPlayers: 4,
      gameType: 'multi-table'
    }, authToken);

    const gameId = createResponse.data.gameId;

    // Without auth token
    const unauthorizedResponse = await makeAuthRequest(`/api/lobby/games/${gameId}/join`, 'POST', {
      playerName: 'TestPlayer'
    });

    expect(unauthorizedResponse.status).toBe(401);

    // With auth token (should use username from auth, not playerName from body)
    const authorizedResponse = await makeAuthRequest(`/api/lobby/games/${gameId}/join`, 'POST', {}, authToken);

    expect(authorizedResponse.status).toBe(200);
    expect(authorizedResponse.data.success).toBe(true);
    expect(authorizedResponse.data.gameState.players[0].name).toBe(testUser.username);
  });

  it('should use authenticated user identity in games', async () => {
    // Create and join a game
    const createResponse = await makeAuthRequest('/api/lobby/games', 'POST', {
      name: 'Identity Test Game',
      maxPlayers: 4,
      gameType: 'multi-table'
    }, authToken);

    const gameId = createResponse.data.gameId;

    await makeAuthRequest(`/api/lobby/games/${gameId}/join`, 'POST', {}, authToken);

    // Verify game state shows authenticated user
    const gameResponse = await makeAuthRequest(`/api/game/${gameId}`, 'GET', null, authToken);

    expect(gameResponse.status).toBe(200);
    expect(gameResponse.data.players).toHaveLength(2);
    expect(gameResponse.data.players[0].name).toBe(testUser.username);
    expect(gameResponse.data.players[0].userId).toBe(userId);
  });
});

describe('Authenticated Game Actions', () => {
  const testUser1: AuthTestUser = {
    email: `player1-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    username: `player1-${Date.now()}`
  };

  const testUser2: AuthTestUser = {
    email: `player2-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    username: `player2-${Date.now()}`
  };

  let token1: string, token2: string;
  let user1Id: string, user2Id: string;
  let gameId: string;

  beforeEach(async () => {
    // Register two players
    const reg1 = await makeAuthRequest('/api/auth/register', 'POST', testUser1);
    const reg2 = await makeAuthRequest('/api/auth/register', 'POST', testUser2);

    token1 = reg1.data.token;
    token2 = reg2.data.token;
    user1Id = reg1.data.user.id;
    user2Id = reg2.data.user.id;

    // Create and join a game
    const createResponse = await makeAuthRequest('/api/lobby/games', 'POST', {
      name: 'Action Test Game',
      maxPlayers: 4,
      gameType: 'multi-table'
    }, token1);

    gameId = createResponse.data.gameId;

    // Both players join
    await makeAuthRequest(`/api/lobby/games/${gameId}/join`, 'POST', {}, token1);
    await makeAuthRequest(`/api/lobby/games/${gameId}/join`, 'POST', {}, token2);
  });

  afterEach(async () => {
    if (token1) await makeAuthRequest('/api/auth/logout', 'POST', null, token1);
    if (token2) await makeAuthRequest('/api/auth/logout', 'POST', null, token2);
  });

  it('should require authentication for game actions', async () => {
    // Without token
    const response = await makeAuthRequest(`/api/game/${gameId}/action`, 'POST', {
      action: 'call'
    });

    expect(response.status).toBe(401);
  });

  it('should only allow players to make their own actions', async () => {
    // Player 1 tries to make action for player 2 (should fail)
    const response = await makeAuthRequest(`/api/game/${gameId}/action`, 'POST', {
      action: 'call',
      playerId: user2Id // Trying to act as different user
    }, token1);

    expect(response.status).toBe(403);
    expect(response.data.error).toContain('unauthorized');
  });

  it('should verify turn order in game actions', async () => {
    // Get game state to see whose turn it is
    const gameResponse = await makeAuthRequest(`/api/game/${gameId}`, 'GET', null, token1);
    const currentPlayerId = gameResponse.data.currentPlayer;

    // Wrong player tries to act
    const wrongToken = currentPlayerId === user1Id ? token2 : token1;
    const wrongResponse = await makeAuthRequest(`/api/game/${gameId}/action`, 'POST', {
      action: 'call'
    }, wrongToken);

    expect(wrongResponse.status).toBe(400);
    expect(wrongResponse.data.error).toContain('turn');

    // Correct player acts
    const rightToken = currentPlayerId === user1Id ? token1 : token2;
    const rightResponse = await makeAuthRequest(`/api/game/${gameId}/action`, 'POST', {
      action: 'call'
    }, rightToken);

    expect(rightResponse.status).toBe(200);
    expect(rightResponse.data.success).toBe(true);
  });
});