/**
 * User Logout API
 * POST /api/auth/logout - Sign out current user
 */

import { NextResponse } from 'next/server';
import { authClient } from '../../../../lib/auth-client';
import { withAuth } from '../../../../lib/auth-middleware';

export const POST = withAuth(async () => {
  try {
    // Sign out from Supabase
    await authClient.signOut();

    // Create response
    const response = NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );

    // Clear auth cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    // Still return success - logout should be graceful
    const response = NextResponse.json(
      { success: true, message: 'Logout completed' },
      { status: 200 }
    );

    // Clear cookies even if logout failed
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');

    return response;
  }
});

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}