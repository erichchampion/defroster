/**
 * In-Memory Rate Limiting Middleware
 *
 * @deprecated For local development only - use rate-limit-upstash.ts for production
 *
 * @remarks
 * **IMPORTANT: Development Only**
 * This implementation uses in-memory storage which has limitations:
 * - Resets on server restart/redeploy
 * - Does NOT work in serverless/multi-instance environments (Vercel, AWS Lambda, etc.)
 * - Each instance maintains its own rate limit state
 *
 * **For production**, use `lib/middleware/rate-limit-upstash.ts` which uses
 * Upstash Redis for distributed rate limiting across serverless instances.
 *
 * This file is kept for:
 * - Local development without Redis
 * - Testing rate limiting logic
 * - Single-instance deployments (not recommended)
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitConfig, RateLimitResult } from '@/lib/types/rate-limit';
import { getClientIdentifier } from '@/lib/utils/client-identifier';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (LIMITATION: not suitable for serverless/multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Check if a request should be rate limited (in-memory)
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
  const clientId = getClientIdentifier(request);

  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  // No record or expired - create new
  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(clientId, { count: 1, resetTime });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Apply rate limit check and return error response if exceeded (in-memory)
 */
export function applyRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(request, config);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': config?.maxRequests.toString() || '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        },
      }
    );
  }

  // Rate limit passed
  return null;
}

// Re-export RATE_LIMITS for backwards compatibility
export { RATE_LIMITS } from '@/lib/constants/rate-limits';
