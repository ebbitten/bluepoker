/**
 * Authentication Types and Interfaces
 * Shared types for user authentication across the application
 */

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  last_sign_in_at: string;
  display_name?: string;
  avatar_url?: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  
  // Game Statistics
  games_played: number;
  games_won: number;
  total_chips_won: number;
  
  // User Preferences
  auto_rebuy: boolean;
  sound_enabled: boolean;
  animation_enabled: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession>;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export interface EmailValidation {
  isValid: boolean;
  error?: string;
}

export interface UsernameValidation {
  isValid: boolean;
  error?: string;
}

// Validation functions
export function validateEmail(email: string): EmailValidation {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true };
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateUsername(username: string): UsernameValidation {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.trim().length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.trim().length > 50) {
    return { isValid: false, error: 'Username must be less than 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true };
}