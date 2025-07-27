/**
 * Authentication Middleware
 * Provides JWT validation and request authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { AuthUser } from '@bluepoker/shared';
import { gameStore } from './game-store';

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
  userId: string;
}

/**
 * Validate JWT token and return user data
 */
export async function validateJWT(token: string): Promise<AuthUser | null> {
  try {
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(cleanToken);
    
    if (error || !user) {
      return null;
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      username: profile.username,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || '',
      display_name: profile.display_name || undefined,
      avatar_url: profile.avatar_url || undefined
    };

  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

/**
 * Extract and validate authorization from request
 */
export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  // Try Authorization header first
  let token = req.headers.get('authorization');
  
  // If no header, try query parameter (for SSE connections)
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get('token');
    if (token) {
      token = `Bearer ${token}`;
    }
  }

  if (!token) {
    throw new Error('No authentication token provided');
  }

  const user = await validateJWT(token);
  if (!user) {
    throw new Error('Invalid or expired authentication token');
  }

  return user;
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth<T extends any[]>(
  handler: (req: NextRequest, user: AuthUser, ...args: T) => Promise<Response>
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    try {
      const user = await requireAuth(req);
      return await handler(req, user, ...args);
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication required', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 401 }
      );
    }
  };
}

/**
 * Verify user is authorized to perform game action
 */
export async function verifyGameAction(
  gameId: string,
  userId: string,
  action: string
): Promise<boolean> {
  try {
    // Get game from store
    const game = gameStore.get(gameId);
    if (!game) {
      return false;
    }

    // Verify user is a player in the game
    const userPlayer = game.players.find(p => p.userId === userId);
    if (!userPlayer) {
      return false;
    }

    // For actions that require turn order, verify it's the user's turn
    const turnBasedActions = ['fold', 'call', 'raise', 'check'];
    if (turnBasedActions.includes(action)) {
      // Check if it's the user's turn
      const currentPlayerIndex = game.activePlayerIndex;
      const userPlayerIndex = game.players.findIndex(p => p.userId === userId);
      
      if (currentPlayerIndex !== userPlayerIndex) {
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Game action verification error:', error);
    return false;
  }
}

/**
 * Create authentication response helpers
 */
export function createAuthResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function createAuthError(message: string, status: number = 401) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Extract user ID from authenticated request
 */
export function getUserId(req: NextRequest): string | null {
  // This would be set by middleware after authentication
  return req.headers.get('x-user-id');
}

/**
 * Rate limiting helper for auth endpoints
 */
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
  const now = Date.now();
  const attempts = authAttempts.get(identifier);

  if (!attempts) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    authAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }

  // Check if under limit
  if (attempts.count < maxAttempts) {
    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }

  return false;
}