/**
 * User Login API
 * POST /api/auth/login - Authenticate user with email/password
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

    // Rate limiting - 10 attempts per 5 minutes
    if (!checkRateLimit(`login:${clientIP}`, 10, 300000)) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, password, rememberMe } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Attempt login
    const result = await authClient.signIn(email, password);

    if (!result.success) {
      // Use generic error message for security
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
        token: result.session?.access_token,
        message: 'Login successful'
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie if remember me is selected
    if (rememberMe && result.session) {
      response.cookies.set('auth-token', result.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
      });

      response.cookies.set('refresh-token', result.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
      });
    }

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    
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