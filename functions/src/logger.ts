/**
 * Logging utility for Cloud Functions
 * Provides consistent logging format
 */

export const logger = {
  /**
   * Log informational messages
   */
  info: (context: string, ...args: unknown[]) => {
    console.log(`[${context}]`, ...args);
  },

  /**
   * Log error messages
   */
  error: (context: string, ...args: unknown[]) => {
    console.error(`[${context}]`, ...args);
  },

  /**
   * Log warning messages
   */
  warn: (context: string, ...args: unknown[]) => {
    console.warn(`[${context}]`, ...args);
  },
};
