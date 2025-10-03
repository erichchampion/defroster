/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP address
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis or similar)
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

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): RateLimitResult {
  // Get client identifier (IP address)
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
 * Apply rate limit check and return error response if exceeded
 */
export function applyRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(request, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
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

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from common headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0] || 'unknown';

  return ip.trim();
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Strict limits for write operations
  SEND_MESSAGE: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  REGISTER_DEVICE: { maxRequests: 3, windowMs: 60000 }, // 3 per minute

  // More lenient for read operations
  GET_MESSAGES: { maxRequests: 20, windowMs: 60000 }, // 20 per minute

  // Very strict for admin operations
  CLEANUP: { maxRequests: 1, windowMs: 300000 }, // 1 per 5 minutes
} as const;
