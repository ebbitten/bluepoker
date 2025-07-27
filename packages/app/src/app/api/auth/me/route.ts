/**
 * Current User API
 * GET /api/auth/me - Get current authenticated user profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../lib/auth-middleware';

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    // Return user profile
    return NextResponse.json(
      { user },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'Failed to load user profile' },
      { status: 500 }
    );
  }
});

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}