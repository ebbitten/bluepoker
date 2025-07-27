/**
 * Authentication Client
 * Handles all authentication operations using Supabase Auth
 */

import { supabase, typedSupabase } from './supabase';
import { 
  AuthUser, 
  AuthSession, 
  AuthResult,
  validateEmail,
  validatePassword,
  validateUsername
} from '@bluepoker/shared';

export class AuthClient {
  private supabase = supabase;
  
  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('user_profiles').select('count', { count: 'exact', head: true });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  /**
   * Register a new user with email, password, and username
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

      // Check if username is already taken
      const { data: existingProfile } = await typedSupabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.trim())
        .single();

      if (existingProfile) {
        return { success: false, error: 'Username already taken' };
      }

      // Register with Supabase Auth (with timeout)
      const signUpPromise = this.supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: username.trim()
          }
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Registration timeout')), 15000)
      );
      
      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Email already registered' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Registration failed - no user data returned' };
      }

      // Get user profile
      const authUser = await this.buildAuthUser(data.user.id);
      if (!authUser) {
        return { success: false, error: 'Failed to create user profile' };
      }

      const session: AuthSession = {
        user: authUser,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0
      };

      return {
        success: true,
        user: authUser,
        session
      };

    } catch (error) {
      console.error('SignUp error:', error);
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

      // Sign in with Supabase (with timeout)
      const signInPromise = this.supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 10000)
      );
      
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password' };
        }
        if (error.message.includes('fetch')) {
          return { success: false, error: 'Authentication service unavailable' };
        }
        if (error.message.includes('network')) {
          return { success: false, error: 'Network connection error' };
        }
        return { success: false, error: error.message };
      }

      if (!data.user || !data.session) {
        return { success: false, error: 'Login failed - no session data' };
      }

      // Get user profile
      const authUser = await this.buildAuthUser(data.user.id);
      if (!authUser) {
        return { success: false, error: 'Failed to load user profile' };
      }

      const session: AuthSession = {
        user: authUser,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0
      };

      return {
        success: true,
        user: authUser,
        session
      };

    } catch (error) {
      console.error('SignIn error:', error);
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
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('SignOut error:', error);
        // Don't throw - logout should be graceful even if it fails on server
      }
    } catch (error) {
      console.error('SignOut unexpected error:', error);
      // Don't throw - logout should be graceful
    }
  }

  /**
   * Get current user session
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }

      const authUser = await this.buildAuthUser(session.user.id);
      if (!authUser) {
        return null;
      }

      return {
        user: authUser,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0
      };

    } catch (error) {
      console.error('GetSession error:', error);
      return null;
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<AuthSession> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      
      if (error || !data.session) {
        throw new Error(error?.message || 'Failed to refresh session');
      }

      const authUser = await this.buildAuthUser(data.session.user.id);
      if (!authUser) {
        throw new Error('Failed to load user profile after refresh');
      }

      return {
        user: authUser,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0
      };

    } catch (error) {
      console.error('RefreshSession error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return await this.buildAuthUser(user.id);

    } catch (error) {
      console.error('GetCurrentUser error:', error);
      return null;
    }
  }

  /**
   * Build AuthUser object from Supabase user and profile data
   */
  private async buildAuthUser(userId: string): Promise<AuthUser | null> {
    try {
      // Get Supabase auth user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user || user.id !== userId) {
        return null;
      }

      // Get user profile
      const { data: profile, error: profileError } = await typedSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        // If profile doesn't exist, create it
        const username = user.user_metadata?.username || `user_${userId.substring(0, 8)}`;
        
        const { data: newProfile, error: createError } = await typedSupabase
          .from('user_profiles')
          .insert({
            id: userId,
            username,
            display_name: username
          })
          .select()
          .single();

        if (createError || !newProfile) {
          console.error('Failed to create user profile:', createError);
          return null;
        }

        return {
          id: userId,
          email: user.email || '',
          username: newProfile.username,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at || '',
          display_name: newProfile.display_name || undefined,
          avatar_url: newProfile.avatar_url || undefined
        };
      }

      return {
        id: userId,
        email: user.email || '',
        username: profile.username,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || '',
        display_name: profile.display_name || undefined,
        avatar_url: profile.avatar_url || undefined
      };

    } catch (error) {
      console.error('BuildAuthUser error:', error);
      return null;
    }
  }
}

// Singleton instance
export const authClient = new AuthClient();