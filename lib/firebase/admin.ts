import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminMessaging: admin.messaging.Messaging | null = null;

try {
  if (!admin.apps.length) {
    // In production, use service account credentials
    // For development, you can use the Firebase Admin SDK with default credentials
    // or provide a service account key JSON file

    let serviceAccount;

    try {
      serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;
    } catch (parseError) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
      throw new Error('Invalid service account JSON configuration');
    }

    admin.initializeApp({
      credential: serviceAccount
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  adminDb = admin.firestore();
  adminMessaging = admin.messaging();
} catch (error) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.warn('Firebase Admin SDK initialization failed (development mode):', error);
  } else {
    console.error('CRITICAL: Firebase Admin SDK initialization failed in production:', error);
    // In production, this is a critical error that should be monitored/alerted
  }
}

export { admin, adminDb, adminMessaging };
