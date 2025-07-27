import { NextResponse } from 'next/server';
import { authClient } from '../../../lib/auth-client';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbTest = await authClient.testConnection();
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: dbTest.success ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'poker-websocket-server',
      database: {
        connected: dbTest.success,
        error: dbTest.error,
        responseTime: `${responseTime}ms`
      },
      services: {
        authentication: dbTest.success ? 'healthy' : 'unhealthy',
        gameLogic: 'healthy', // Game logic doesn't require DB
        realtime: 'unknown' // Would need separate SSE test
      }
    };
    
    const statusCode = dbTest.success ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
    
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'poker-websocket-server',
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}