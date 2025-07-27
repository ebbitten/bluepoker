/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authClient } from '../lib/auth-client';
import { AuthUser, AuthSession, AuthResult, AuthContextValue } from '@bluepoker/shared';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Initialize authentication state
  async function initializeAuth() {
    try {
      setLoading(true);
      
      // Try to get existing session
      const currentSession = await authClient.getSession();
      
      if (currentSession) {
        setUser(currentSession.user);
        setSession(currentSession);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setLoading(false);
    }
  }

  // Sign up new user
  async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
    try {
      setLoading(true);
      
      const result = await authClient.signUp(email, password, username);
      
      if (result.success && result.user && result.session) {
        setUser(result.user);
        setSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('SignUp error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    } finally {
      setLoading(false);
    }
  }

  // Sign in existing user
  async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
      setLoading(true);
      
      const result = await authClient.signIn(email, password);
      
      if (result.success && result.user && result.session) {
        setUser(result.user);
        setSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('SignIn error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    } finally {
      setLoading(false);
    }
  }

  // Sign out current user
  async function signOut(): Promise<void> {
    try {
      setLoading(true);
      
      await authClient.signOut();
      
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('SignOut error:', error);
      // Still clear local state even if server signout fails
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }

  // Refresh session
  async function refreshSession(): Promise<AuthSession> {
    try {
      const newSession = await authClient.refreshSession();
      
      setUser(newSession.user);
      setSession(newSession);
      
      return newSession;
    } catch (error) {
      console.error('RefreshSession error:', error);
      
      // If refresh fails, clear auth state
      setUser(null);
      setSession(null);
      
      throw error;
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Hook to require authentication
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  
  if (!auth.user && !auth.loading) {
    throw new Error('Authentication required');
  }
  
  return auth;
}