/**
 * API Authentication Middleware
 * Validates requests using origin validation (BFF pattern)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Validates that the request originates from the allowed domain
 * Uses NEXT_PUBLIC_BASE_URL to determine the allowed origin
 */
export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

  if (!allowedOrigin) {
    console.error('CRITICAL: NEXT_PUBLIC_BASE_URL not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') {
    if (origin?.startsWith('http://localhost:')) {
      return null;
    }
  }

  // Validate origin matches the allowed base URL
  if (origin !== allowedOrigin) {
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403 }
    );
  }

  // Validation successful
  return null;
}

/**
 * Validates cron job requests using a secret token
 * Uses constant-time comparison to prevent timing attacks
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

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSecret, 'utf-8');

    if (tokenBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  } catch {
    // timingSafeEqual can throw if buffers have different lengths
    // This is already handled above, but catch any unexpected errors
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return null;
}
