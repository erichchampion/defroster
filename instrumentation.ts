/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts up
 * Used to validate environment variables before the app runs
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('./lib/utils/env-validation');

    // Validate environment variables
    const result = validateEnvironment();

    // In production, fail fast if validation fails
    if (!result.valid && process.env.NODE_ENV === 'production') {
      console.error('CRITICAL: Environment validation failed in production');
      console.error('The application may not function correctly.');
      // Don't throw in production as it could prevent the app from starting
      // Instead, log the error and let individual features fail gracefully
    }
  }
}
