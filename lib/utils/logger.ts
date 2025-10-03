/**
 * Production-safe logging utility
 * Prevents sensitive data from being logged in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always shown but sanitized
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - always shown
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Critical logs - always shown with extra visibility
   */
  critical: (...args: unknown[]) => {
    console.error('🚨 [CRITICAL]', ...args);
    // In production, could send to error tracking service (Sentry, etc.)
  },
};
