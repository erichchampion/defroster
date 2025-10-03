import { NextRequest, NextResponse } from 'next/server';
import { getDataService } from '@/lib/services/data-service-singleton';
import { validateLocation, validateRadius } from '@/lib/utils/validation';
import { DEFAULT_RADIUS_MILES } from '@/lib/constants/app';
import { validateApiKey } from '@/lib/middleware/auth';
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const dataService = getDataService();

export async function POST(request: NextRequest) {
  // Apply authentication
  const authError = validateApiKey(request);
  if (authError) return authError;

  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMITS.GET_MESSAGES);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { location, radiusMiles = DEFAULT_RADIUS_MILES } = body;

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

    const messages = await dataService.getMessagesInRadius(location, radiusMiles);

    return NextResponse.json({ messages });
  } catch {
    console.error('Error getting messages');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
