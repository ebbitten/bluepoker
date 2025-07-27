/**
 * Mock Authentication Client
 * Provides a local authentication system when Supabase is not available
 * Implements the same interface as AuthClient for seamless testing
 */

import { 
  AuthUser, 
  AuthSession, 
  AuthResult,
  validateEmail,
  validatePassword,
  validateUsername
} from '@bluepoker/shared';

interface MockUser {
  id: string;
  email: string;
  username: string;
  password: string;
  created_at: string;
  last_sign_in_at: string;
}

export class MockAuthClient {
  private users: Map<string, MockUser> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private currentSessionToken: string | null = null;

  constructor() {
    // Pre-populate with some test users
    this.addTestUser('player1@test.com', 'password123', 'Player1');
    this.addTestUser('player2@test.com', 'password123', 'Player2');
    this.addTestUser('test@test.com', 'password123', 'TestUser');
  }

  private addTestUser(email: string, password: string, username: string) {
    const id = `mock-${username.toLowerCase()}`;
    const now = new Date().toISOString();
    
    this.users.set(email, {
      id,
      email,
      username,
      password,
      created_at: now,
      last_sign_in_at: now
    });
  }

  /**
   * Test database connection - always succeeds in mock mode
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Register a new user
   */
  async signUp(email: string, password: string, username: string): Promise<AuthResult> {
    try {
      // Validate inputs
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return { success: false, error: passwordValidation.errors[0] };
      }

      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        return { success: false, error: usernameValidation.error };
      }

      // Check if email already exists
      if (this.users.has(email.trim())) {
        return { success: false, error: 'Email already registered' };
      }

      // Check if username is already taken
      for (const user of this.users.values()) {
        if (user.username === username.trim()) {
          return { success: false, error: 'Username already taken' };
        }
      }

      // Create new user
      const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newUser: MockUser = {
        id,
        email: email.trim(),
        username: username.trim(),
        password,
        created_at: now,
        last_sign_in_at: now
      };

      this.users.set(email.trim(), newUser);

      // Create session
      const authUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        created_at: newUser.created_at,
        last_sign_in_at: newUser.last_sign_in_at
      };

      const sessionToken = `mock-session-${Date.now()}`;
      const session: AuthSession = {
        user: authUser,
        access_token: sessionToken,
        refresh_token: `refresh-${sessionToken}`,
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.sessions.set(sessionToken, session);
      this.currentSessionToken = sessionToken;

      return {
        success: true,
        user: authUser,
        session
      };

    } catch (error) {
      console.error('Mock SignUp error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Basic validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error };
      }

      if (!password) {
        return { success: false, error: 'Password is required' };
      }

      // Find user
      const user = this.users.get(email.trim());
      if (!user || user.password !== password) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Update last sign in
      user.last_sign_in_at = new Date().toISOString();

      // Create session
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      };

      const sessionToken = `mock-session-${Date.now()}`;
      const session: AuthSession = {
        user: authUser,
        access_token: sessionToken,
        refresh_token: `refresh-${sessionToken}`,
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.sessions.set(sessionToken, session);
      this.currentSessionToken = sessionToken;

      return {
        success: true,
        user: authUser,
        session
      };

    } catch (error) {
      console.error('Mock SignIn error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (this.currentSessionToken) {
      this.sessions.delete(this.currentSessionToken);
      this.currentSessionToken = null;
    }
  }

  /**
   * Get current user session
   */
  async getSession(): Promise<AuthSession | null> {
    if (!this.currentSessionToken) {
      return null;
    }

    const session = this.sessions.get(this.currentSessionToken);
    if (!session) {
      this.currentSessionToken = null;
      return null;
    }

    // Check if session expired
    if (session.expires_at && session.expires_at < Date.now()) {
      this.sessions.delete(this.currentSessionToken);
      this.currentSessionToken = null;
      return null;
    }

    return session;
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<AuthSession> {
    const session = await this.getSession();
    if (!session) {
      throw new Error('No active session to refresh');
    }

    // Create new session with extended expiry
    const newSessionToken = `mock-session-${Date.now()}`;
    const newSession: AuthSession = {
      ...session,
      access_token: newSessionToken,
      refresh_token: `refresh-${newSessionToken}`,
      expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Clean up old session
    if (this.currentSessionToken) {
      this.sessions.delete(this.currentSessionToken);
    }

    this.sessions.set(newSessionToken, newSession);
    this.currentSessionToken = newSessionToken;

    return newSession;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await this.getSession();
    return session?.user || null;
  }
}

// Singleton instance
export const mockAuthClient = new MockAuthClient();