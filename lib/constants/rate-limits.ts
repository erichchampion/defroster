/**
 * Rate Limit Configurations
 *
 * Centralized rate limit settings for all API endpoints.
 * These limits apply per client IP address within the specified time window.
 */

import { RateLimitConfig } from '@/lib/types/rate-limit';

/**
 * Rate limit configurations for different endpoints
 *
 * @remarks
 * - SEND_MESSAGE: Strict limit to prevent spam
 * - REGISTER_DEVICE: Moderate limit for device registration
 * - GET_MESSAGES: More lenient for read operations
 * - CLEANUP: Very strict for administrative operations
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  /** 5 requests per minute for sending sighting reports */
  SEND_MESSAGE: { maxRequests: 5, windowMs: 60000 },

  /** 3 requests per minute for device registration */
  REGISTER_DEVICE: { maxRequests: 3, windowMs: 60000 },

  /** 20 requests per minute for fetching messages */
  GET_MESSAGES: { maxRequests: 20, windowMs: 60000 },

  /** 1 request per 5 minutes for cleanup operations */
  CLEANUP: { maxRequests: 1, windowMs: 300000 },
} as const;
