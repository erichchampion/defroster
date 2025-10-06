/**
 * Redis-related constants for Upstash Redis integration
 */

/**
 * Prefix for rate limiting keys in Redis
 * Format: ratelimit:{clientId}
 */
export const RATE_LIMIT_KEY_PREFIX = 'ratelimit:';

/**
 * Fallback client identifier when IP cannot be determined
 * Used for rate limiting when all IP detection methods fail
 */
export const UNKNOWN_CLIENT_ID = 'unknown';
