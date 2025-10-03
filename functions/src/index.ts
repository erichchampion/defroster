import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Scheduled function to clean up expired messages
 * Runs every 15 minutes
 */
export const cleanupExpiredMessages = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('America/New_York') // Adjust to your timezone
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for expired messages
      const snapshot = await db
        .collection('messages')
        .where('expiresAt', '<=', now)
        .get();

      if (snapshot.empty) {
        console.log('No expired messages to clean up');
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

      console.log(`Successfully deleted ${deletedCount} expired messages`);
      return null;
    } catch (error) {
      console.error('Error cleaning up expired messages:', error);
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
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    try {
      // Query for devices not updated in 30 days
      const snapshot = await db
        .collection('devices')
        .where('updatedAt', '<=', thirtyDaysAgo)
        .get();

      if (snapshot.empty) {
        console.log('No old devices to clean up');
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

      console.log(`Successfully deleted ${deletedCount} old device registrations`);
      return null;
    } catch (error) {
      console.error('Error cleaning up old devices:', error);
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
    console.error('Error in manual cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
