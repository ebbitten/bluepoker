/**
 * User Registration API
 * POST /api/auth/register - Register new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '../../../../lib/auth-client';
import { checkRateLimit } from '../../../../lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Rate limiting - 5 attempts per 5 minutes
    if (!checkRateLimit(`register:${clientIP}`, 5, 300000)) {
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, password, username, confirmPassword } = body;

    // Basic validation
    if (!email || !password || !username) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    // Confirm password validation
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Attempt registration
    const result = await authClient.signUp(email, password, username);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        user: result.user,
        token: result.session?.access_token,
        message: 'Registration successful'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration API error:', error);
    
    // More specific error handling
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}