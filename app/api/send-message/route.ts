import { NextRequest, NextResponse } from 'next/server';
import { geohashForLocation } from 'geofire-common';
import { getDataService } from '@/lib/services/data-service-singleton';
import { adminMessaging } from '@/lib/firebase/admin';
import { Message } from '@/lib/types/message';
import { validateLocation } from '@/lib/utils/validation';
import { DEFAULT_RADIUS_MILES, GEOHASH_PRECISION_DEVICE } from '@/lib/constants/app';
import { MESSAGE_EXPIRATION_MS, TIMESTAMP_TOLERANCE_MS } from '@/lib/constants/time';
import { validateApiKey } from '@/lib/middleware/auth';
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  // Get service instance inside function for better testability
  const dataService = getDataService();
  // Apply authentication
  const authError = validateApiKey(request);
  if (authError) return authError;

  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMITS.SEND_MESSAGE);
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const { sightingType, location, timestamp } = body;

    if (!validateLocation(location)) {
      return NextResponse.json(
        { error: 'Valid sighting location is required' },
        { status: 400 }
      );
    }

    // Validate sighting type
    if (!sightingType || !['ICE', 'Army', 'Police'].includes(sightingType)) {
      return NextResponse.json(
        { error: 'Valid sighting type is required (ICE, Army, or Police)' },
        { status: 400 }
      );
    }

    // Validate timestamp (if provided, ensure it's within reasonable bounds)
    const serverTime = Date.now();

    if (timestamp && Math.abs(timestamp - serverTime) > TIMESTAMP_TOLERANCE_MS) {
      return NextResponse.json(
        { error: 'Invalid timestamp: too far from server time' },
        { status: 400 }
      );
    }

    // Create message with geohash
    const geohash = geohashForLocation([
      location.latitude,
      location.longitude,
    ], GEOHASH_PRECISION_DEVICE);

    // Always use server timestamp to prevent manipulation
    const now = serverTime;
    const expiresAt = now + MESSAGE_EXPIRATION_MS;

    const message: Message = {
      sightingType,
      location,
      timestamp: now,
      geohash,
      expiresAt,
    };

    // Save message to database
    const messageId = await dataService.saveMessage(message);

    // Find devices within radius
    const devices = await dataService.getDevicesInRadius(location, DEFAULT_RADIUS_MILES);

    // Send notifications to nearby devices
    if (devices.length > 0 && adminMessaging) {
      const tokens = devices.map((d) => d.token);

      const notificationMessage = {
        data: {
          id: messageId,
          sightingType,
          location: JSON.stringify(location),
          timestamp: now.toString(),
          geohash,
          expiresAt: expiresAt.toString(),
        },
        tokens,
      };

      try {
        const response = await adminMessaging.sendEachForMulticast(notificationMessage);
        logger.info('API:send-message', `Successfully sent ${response.successCount} notifications`);

        if (response.failureCount > 0) {
          logger.warn('API:send-message', `Failed to send ${response.failureCount} notifications`);
        }

        // Record notifications for devices that were successfully notified
        // This prevents duplicate notifications in the periodic function
        const recordPromises = devices.map((device) =>
          dataService.recordNotification(messageId, device.deviceId)
        );
        await Promise.all(recordPromises);
        logger.info('API:send-message', `Recorded ${devices.length} notifications`);
      } catch (error) {
        logger.error('API:send-message', 'Error sending notifications:', error);
      }
    } else if (devices.length > 0) {
      logger.warn('API:send-message', 'Firebase Admin Messaging not initialized - notifications not sent');
    }

    return NextResponse.json({
      success: true,
      messageId,
      notifiedDevices: devices.length,
    });
  } catch (error) {
    logger.error('API:send-message', 'Error in send-message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
