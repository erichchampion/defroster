import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from '@/lib/services/data-service-singleton';
import { validateCronSecret } from '@/lib/middleware/auth';
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/utils/logger';

const dataService = getDataService();

export async function POST(request: NextRequest) {
  // Apply cron secret authentication
  const authError = validateCronSecret(request);
  if (authError) return authError;

  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMITS.CLEANUP);
  if (rateLimitError) return rateLimitError;

  try {
    const deletedCount = await dataService.deleteExpiredMessages();

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    logger.error('API:cleanup-messages', 'Error cleaning up messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
