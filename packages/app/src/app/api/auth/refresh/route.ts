/**
 * Token Refresh API
 * POST /api/auth/refresh - Refresh authentication token
 */

import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '../../../../lib/auth-client';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { refreshToken } = body;

    // Check for refresh token in body or cookies
    const token = refreshToken || request.cookies.get('refresh-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Attempt to refresh session
    const session = await authClient.refreshSession();

    return NextResponse.json(
      {
        token: session.access_token,
        user: session.user,
        expires_at: session.expires_at
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear potentially invalid cookies
    const response = NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 401 }
    );
    
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    
    return response;
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}