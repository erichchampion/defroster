/**
 * Distributed Rate Limiting using Upstash Redis
 *
 * Implements rate limiting that works across multiple serverless instances
 * by using Redis as a shared state store.
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { RateLimitConfig, RateLimitResult } from '@/lib/types/rate-limit';
import { RATE_LIMIT_KEY_PREFIX } from '@/lib/constants/redis';
import { getClientIdentifier } from '@/lib/utils/client-identifier';

/**
 * Singleton Redis client
 */
let redis: Redis | null = null;

/**
 * Gets or creates the Redis client
 * Returns null if Upstash Redis is not configured
 */
function getRedisClient(): Redis | null {
  // Check if Redis is configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️  Upstash Redis not configured - rate limiting will be disabled');
    return null;
  }

  // Create client if it doesn't exist
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/**
 * Checks if a request is within rate limits
 * Uses Redis INCR and EXPIRE for atomic rate limiting
 *
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // If Redis is not configured, allow all requests but warn
  if (!redis) {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }

  // Get client identifier and create Redis key
  const clientId = getClientIdentifier(request);
  const key = `${RATE_LIMIT_KEY_PREFIX}${clientId}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  try {
    // Atomically increment the counter
    const count = await redis.incr(key);

    // Set expiration on first request
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    // Check if limit exceeded
    if (count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - count,
      resetTime,
    };
  } catch (error) {
    // On Redis errors, log and allow request (fail open)
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }
}

/**
 * Async version that checks rate limits and returns appropriate response
 * Use this in your API routes
 *
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @returns NextResponse with 429 status if rate limit exceeded, null if allowed
 */
export async function checkAndApplyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, config);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

// Re-export RATE_LIMITS for backwards compatibility
export { RATE_LIMITS } from '@/lib/constants/rate-limits';
