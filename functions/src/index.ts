import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { geohashQueryBounds } from 'geofire-common';
import {
  MILES_TO_KM,
  NOTIFICATION_WINDOW_MS,
  TWO_HOURS_MS,
  ONE_WEEK_MS,
  GEOHASH_PRECISION_DEVICE,
  MESSAGES_COLLECTION,
  DEVICES_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  DEFAULT_RADIUS_MILES,
} from './constants';
import { logger } from './logger';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Scheduled function to clean up expired messages
 * Runs every 15 minutes
 */
/**
 * Scheduled function to send notifications to newly-in-range devices
 * Runs every 15 minutes
 */
export const sendPeriodicNotifications = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    const now = admin.firestore.Timestamp.now();

    try {
      logger.info('Function:sendPeriodicNotifications', 'Starting periodic notification job...');

      // Only get messages from the last 30 minutes (notification window)
      // This prevents notification spam for older messages
      const nowMillis = Date.now();
      const notificationWindowStart = admin.firestore.Timestamp.fromMillis(
        nowMillis - NOTIFICATION_WINDOW_MS
      );

      const messagesSnapshot = await db
        .collection(MESSAGES_COLLECTION)
        .where('timestamp', '>', notificationWindowStart)
        .where('expiresAt', '>', now)
        .get();

      if (messagesSnapshot.empty) {
        logger.info('Function:sendPeriodicNotifications', 'No messages in notification window (last 30 minutes)');
        return null;
      }

      logger.info('Function:sendPeriodicNotifications', `Found ${messagesSnapshot.size} messages in notification window (last 30 minutes)`);
      let totalNotificationsSent = 0;

      // Process each message
      for (const messageDoc of messagesSnapshot.docs) {
        const messageData = messageDoc.data();
        const messageId = messageDoc.id;
        const location = messageData.location;

        // Find devices in radius using geohash
        const center: [number, number] = [location.latitude, location.longitude];
        const radiusInKm = DEFAULT_RADIUS_MILES * MILES_TO_KM;
        const bounds = geohashQueryBounds(center, radiusInKm * 1000);

        const devicePromises = [];
        for (const bound of bounds) {
          const q = db
            .collection(DEVICES_COLLECTION)
            .where('geohash', '>=', bound[0].substring(0, GEOHASH_PRECISION_DEVICE))
            .where('geohash', '<=', bound[1].substring(0, GEOHASH_PRECISION_DEVICE) + '~');
          devicePromises.push(q.get());
        }

        const deviceSnapshots = await Promise.all(devicePromises);
        const devicesInRange: Array<{ deviceId: string; token: string }> = [];

        // Filter devices by actual distance
        for (const snap of deviceSnapshots) {
          for (const deviceDoc of snap.docs) {
            const deviceData = deviceDoc.data();
            // For now, we just check geohash - actual distance filtering could be added
            devicesInRange.push({
              deviceId: deviceData.deviceId,
              token: deviceData.token,
            });
          }
        }

        if (devicesInRange.length === 0) {
          continue;
        }

        // Filter out devices that have already been notified
        const notificationChecks = await Promise.all(
          devicesInRange.map(async (device) => {
            const notifDoc = await db
              .collection(NOTIFICATIONS_COLLECTION)
              .doc(`${messageId}_${device.deviceId}`)
              .get();
            return { device, alreadyNotified: notifDoc.exists };
          })
        );

        const devicesToNotify = notificationChecks
          .filter((check) => !check.alreadyNotified)
          .map((check) => check.device);

        if (devicesToNotify.length === 0) {
          logger.info('Function:sendPeriodicNotifications', `No new devices to notify for message ${messageId}`);
          continue;
        }

        logger.info('Function:sendPeriodicNotifications', `Sending notifications to ${devicesToNotify.length} devices for message ${messageId}`);

        // Send notifications
        const tokens = devicesToNotify.map((d) => d.token);
        const notificationMessage = {
          data: {
            id: messageId,
            sightingType: messageData.sightingType,
            location: JSON.stringify(messageData.location),
            timestamp: messageData.timestamp.toMillis().toString(),
            geohash: messageData.geohash,
            expiresAt: messageData.expiresAt.toMillis().toString(),
          },
          tokens,
        };

        try {
          const response = await messaging.sendEachForMulticast(notificationMessage);
          logger.info('Function:sendPeriodicNotifications', `Sent ${response.successCount} notifications, ${response.failureCount} failures`);
          totalNotificationsSent += response.successCount;

          // Record notifications
          const batch = db.batch();
          const notificationExpiry = admin.firestore.Timestamp.fromMillis(
            nowMillis + TWO_HOURS_MS
          );

          devicesToNotify.forEach((device) => {
            const notifRef = db
              .collection(NOTIFICATIONS_COLLECTION)
              .doc(`${messageId}_${device.deviceId}`);
            batch.set(notifRef, {
              messageId,
              deviceId: device.deviceId,
              sentAt: admin.firestore.Timestamp.now(),
              expiresAt: notificationExpiry,
            });
          });

          await batch.commit();
          logger.info('Function:sendPeriodicNotifications', `Recorded ${devicesToNotify.length} notification records`);
        } catch (error) {
          logger.error('Function:sendPeriodicNotifications', `Error sending notifications for message ${messageId}:`, error);
        }
      }

      logger.info('Function:sendPeriodicNotifications', `Periodic notification job complete. Sent ${totalNotificationsSent} total notifications`);
      return null;
    } catch (error) {
      logger.error('Function:sendPeriodicNotifications', 'Error in periodic notification job:', error);
      throw error;
    }
  });

export const cleanupExpiredMessages = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('America/New_York') // Adjust to your timezone
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for expired messages
      const snapshot = await db
        .collection(MESSAGES_COLLECTION)
        .where('expiresAt', '<=', now)
        .get();

      if (snapshot.empty) {
        logger.info('Function:cleanupExpiredMessages', 'No expired messages to clean up');
        return null;
      }

      // Delete messages in batches (Firestore max 500 writes per batch)
      const batchSize = 500;
      let deletedCount = 0;

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      logger.info('Function:cleanupExpiredMessages', `Successfully deleted ${deletedCount} expired messages`);
      return null;
    } catch (error) {
      logger.error('Function:cleanupExpiredMessages', 'Error cleaning up expired messages:', error);
      throw error;
    }
  });

/**
 * Scheduled function to clean up expired notification records
 * Runs every hour
 */
export const cleanupExpiredNotifications = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for expired notification records
      const snapshot = await db
        .collection(NOTIFICATIONS_COLLECTION)
        .where('expiresAt', '<=', now)
        .get();

      if (snapshot.empty) {
        logger.info('Function:cleanupExpiredNotifications', 'No expired notification records to clean up');
        return null;
      }

      // Delete in batches
      const batchSize = 500;
      let deletedCount = 0;

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      logger.info('Function:cleanupExpiredNotifications', `Successfully deleted ${deletedCount} expired notification records`);
      return null;
    } catch (error) {
      logger.error('Function:cleanupExpiredNotifications', 'Error cleaning up expired notification records:', error);
      throw error;
    }
  });

/**
 * Scheduled function to clean up old device registrations
 * Runs daily at 2 AM
 */
export const cleanupOldDevices = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('America/New_York') // Adjust to your timezone
  .onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - ONE_WEEK_MS
    );

    try {
      // Query for devices not updated in 7 days
      const snapshot = await db
        .collection(DEVICES_COLLECTION)
        .where('updatedAt', '<=', sevenDaysAgo)
        .get();

      if (snapshot.empty) {
        logger.info('Function:cleanupOldDevices', 'No old devices to clean up');
        return null;
      }

      // Delete devices in batches
      const batchSize = 500;
      let deletedCount = 0;

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = snapshot.docs.slice(i, i + batchSize);

        batchDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        deletedCount += batchDocs.length;
      }

      logger.info('Function:cleanupOldDevices', `Successfully deleted ${deletedCount} old device registrations`);
      return null;
    } catch (error) {
      logger.error('Function:cleanupOldDevices', 'Error cleaning up old devices:', error);
      throw error;
    }
  });

/**
 * HTTP-triggered function for manual cleanup (for testing/emergency)
 * Requires authentication
 */
export const manualCleanup = functions.https.onRequest(async (req, res) => {
  // Verify authorization
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CLEANUP_SECRET;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  try {
    // Clean up expired messages
    const messagesSnapshot = await db
      .collection('messages')
      .where('expiresAt', '<=', now)
      .get();

    const batchSize = 500;
    let messagesDeleted = 0;

    for (let i = 0; i < messagesSnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = messagesSnapshot.docs.slice(i, i + batchSize);

      batchDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      messagesDeleted += batchDocs.length;
    }

    res.status(200).json({
      success: true,
      messagesDeleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Function:manualCleanup', 'Error in manual cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
