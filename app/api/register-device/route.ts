import { NextRequest, NextResponse } from 'next/server';
import { geohashForLocation } from 'geofire-common';
import { getDataService } from '@/lib/services/data-service-singleton';
import { validateLocation } from '@/lib/utils/validation';
import { validateApiKey } from '@/lib/middleware/auth';
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const dataService = getDataService();

export async function POST(request: NextRequest) {
  // Apply authentication
  const authError = validateApiKey(request);
  if (authError) return authError;

  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMITS.REGISTER_DEVICE);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { token, deviceId, location } = body;

    // Validate FCM token format
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      );
    }

    // FCM tokens are typically 140-180 characters long, alphanumeric with dashes/underscores
    if (token.length < 100 || token.length > 300 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      return NextResponse.json(
        { error: 'Invalid device token format' },
        { status: 400 }
      );
    }

    // Validate deviceId format (UUID v4)
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device ID format (must be UUID v4)' },
        { status: 400 }
      );
    }

    if (!validateLocation(location)) {
      return NextResponse.json(
        { error: 'Valid location is required' },
        { status: 400 }
      );
    }

    // Use 7-character geohash for ~76m precision (city block level)
    const geohash = geohashForLocation([location.latitude, location.longitude], 7);

    await dataService.registerDevice({
      deviceId,
      token,
      geohash,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
