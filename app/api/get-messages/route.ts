import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from '@/lib/services/data-service-singleton';
import { validateLocation, validateRadius } from '@/lib/utils/validation';
import { DEFAULT_RADIUS_MILES } from '@/lib/constants/app';
import { validateOrigin } from '@/lib/middleware/auth';
import { checkAndApplyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit-upstash';
import { logger } from '@/lib/utils/logger';

const dataService = getDataService();

export async function POST(request: NextRequest) {
  // Apply origin validation
  const authError = validateOrigin(request);
  if (authError) return authError;

  // Apply rate limiting
  const rateLimitError = await checkAndApplyRateLimit(request, RATE_LIMITS.GET_MESSAGES);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { location, radiusMiles = DEFAULT_RADIUS_MILES, sinceTimestamp } = body;

    if (!validateLocation(location)) {
      return NextResponse.json(
        { error: 'Valid location is required' },
        { status: 400 }
      );
    }

    if (!validateRadius(radiusMiles)) {
      return NextResponse.json(
        { error: 'Invalid radius: must be a positive number up to 100 miles' },
        { status: 400 }
      );
    }

    // Validate sinceTimestamp if provided
    if (sinceTimestamp !== undefined && sinceTimestamp !== null) {
      if (typeof sinceTimestamp !== 'number' || sinceTimestamp < 0) {
        return NextResponse.json(
          { error: 'Invalid sinceTimestamp: must be a positive number' },
          { status: 400 }
        );
      }
    }

    let messages = await dataService.getMessagesInRadius(location, radiusMiles);

    // Filter by timestamp if sinceTimestamp is provided (incremental query)
    if (sinceTimestamp && sinceTimestamp > 0) {
      messages = messages.filter(msg => msg.timestamp > sinceTimestamp);
      logger.info('API:get-messages', `Incremental query: found ${messages.length} messages since ${new Date(sinceTimestamp).toISOString()}`);
    } else {
      logger.info('API:get-messages', `Full query: found ${messages.length} messages`);
    }

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error('API:get-messages', 'Error getting messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
