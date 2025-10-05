/**
 * Logging utility for Cloud Functions
 * Provides consistent logging format
 * Only logs errors in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log informational messages - only in development
   */
  info: (context: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[${context}]`, ...args);
    }
  },

  /**
   * Log error messages - always shown
   */
  error: (context: string, ...args: unknown[]) => {
    console.error(`[${context}]`, ...args);
  },

  /**
   * Log warning messages - only in development
   */
  warn: (context: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[${context}]`, ...args);
    }
  },
};
