/**
 * Security-related constants
 */

/**
 * Minimum length for CRON_SECRET in characters
 * @remarks Using 32 characters provides 256 bits of entropy when hex-encoded
 */
export const MIN_SECRET_LENGTH = 32;

/**
 * Expected domain for Upstash Redis URLs
 */
export const UPSTASH_DOMAIN = 'upstash.io';
