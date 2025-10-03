/**
 * API Authentication Middleware
 * Validates requests using API key authentication
 */

import { NextRequest, NextResponse } from 'next/server';

export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.API_SECRET_KEY;

  // Always require API key - no exceptions
  if (!expectedKey) {
    console.error('CRITICAL: API_SECRET_KEY not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Include x-api-key header.' },
      { status: 401 }
    );
  }

  if (apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  // Authentication successful
  return null;
}

/**
 * Validates cron job requests using a secret token
 */
export function validateCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('CRITICAL: CRON_SECRET not configured');
    // Return 401 to not reveal configuration status
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader?.replace('Bearer ', '');

  if (token !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
