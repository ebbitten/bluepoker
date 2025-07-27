/**
 * User Menu Component
 * Displays user info and auth actions in navigation
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Handle sign out
  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  }

  // If not authenticated, show sign in/up buttons
  if (!user && !loading) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.push('/auth/login')}
        >
          Sign In
        </Button>
        <Button 
          onClick={() => router.push('/auth/register')}
        >
          Sign Up
        </Button>
      </div>
    );
  }

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  // If authenticated, show user menu
  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          {/* User Avatar */}
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Username */}
          <span className="text-sm font-medium text-gray-900">
            {user.username}
          </span>
          
          {/* Dropdown arrow */}
          <svg 
            className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              
              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </button>
                
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/lobby');
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Game Lobby
                </button>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}