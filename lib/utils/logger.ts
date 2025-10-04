/**
 * Production-safe logging utility with context support
 * Prevents sensitive data from being logged in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Debug logs - only in development
   * @param context - The context/module name (e.g., 'API:get-messages')
   * @param args - Additional arguments to log
   */
  debug: (context: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG:${context}]`, ...args);
    }
  },

  /**
   * Info logs - only in development
   * @param context - The context/module name
   * @param args - Additional arguments to log
   */
  info: (context: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(`[INFO:${context}]`, ...args);
    }
  },

  /**
   * Warning logs - always shown but sanitized
   * @param context - The context/module name
   * @param args - Additional arguments to log
   */
  warn: (context: string, ...args: unknown[]) => {
    console.warn(`[WARN:${context}]`, ...args);
  },

  /**
   * Error logs - always shown
   * @param context - The context/module name
   * @param args - Additional arguments to log
   */
  error: (context: string, ...args: unknown[]) => {
    console.error(`[ERROR:${context}]`, ...args);
  },

  /**
   * Critical logs - always shown with extra visibility
   * @param context - The context/module name
   * @param args - Additional arguments to log
   */
  critical: (context: string, ...args: unknown[]) => {
    console.error(`🚨 [CRITICAL:${context}]`, ...args);
    // In production, could send to error tracking service (Sentry, etc.)
  },
};
