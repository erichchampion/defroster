/**
 * Environment Variable Validation
 * Validates critical environment variables at application startup
 */

import { MIN_SECRET_LENGTH, UPSTASH_DOMAIN } from '@/lib/constants/security';

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are set
 * Logs errors and warnings to console
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical variables (must be present)
  const requiredVars = {
    // Firebase configuration (client)
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,

    // Base URL for origin validation
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,

    // CRON secret for cleanup
    CRON_SECRET: process.env.CRON_SECRET,
  };

  // Optional but recommended for production (Upstash Redis for rate limiting)
  const productionVars = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // Check for missing required variables
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check production variables (only warn if in production)
  if (process.env.NODE_ENV === 'production') {
    for (const [key, value] of Object.entries(productionVars)) {
      if (!value) {
        warnings.push(`Missing production environment variable: ${key} (rate limiting will be disabled)`);
      }
    }
  }

  // Optional but recommended variables
  const recommendedVars = {
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  };

  for (const [key, value] of Object.entries(recommendedVars)) {
    if (!value) {
      warnings.push(`Missing recommended environment variable: ${key} (notifications may not work)`);
    }
  }

  // Validate NEXT_PUBLIC_BASE_URL format
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_BASE_URL);
    } catch {
      errors.push(`Invalid NEXT_PUBLIC_BASE_URL format: must be a valid URL (e.g., https://example.com)`);
    }
  }

  // Validate CRON_SECRET strength (should be at least MIN_SECRET_LENGTH characters)
  if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < MIN_SECRET_LENGTH) {
    warnings.push(`CRON_SECRET should be at least ${MIN_SECRET_LENGTH} characters for security`);
  }

  // Validate Upstash Redis URL format (if provided)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
      if (!url.hostname.includes(UPSTASH_DOMAIN)) {
        warnings.push(`UPSTASH_REDIS_REST_URL should be an Upstash Redis URL (*.${UPSTASH_DOMAIN})`);
      }
    } catch {
      errors.push(`Invalid UPSTASH_REDIS_REST_URL format: must be a valid URL`);
    }
  }

  const valid = errors.length === 0;

  // Log results
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`   - ${err}`));
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment validation warnings:');
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  if (valid && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }

  return { valid, errors, warnings };
}

/**
 * Validates environment and throws error if validation fails
 * Use this in server-side code to fail fast on startup
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();

  if (!result.valid) {
    throw new Error(
      `Environment validation failed:\n${result.errors.join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}
