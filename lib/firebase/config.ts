import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let messaging: Messaging | null = null;
let messagingInitPromise: Promise<Messaging | null> | null = null;

// Initialize Firebase (client-side only)
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore
  db = getFirestore(app);
}

// Initialize Firebase Cloud Messaging (only in browser)
if (typeof window !== 'undefined' && app) {
  messagingInitPromise = isSupported().then((supported) => {
    if (supported && app) {
      messaging = getMessaging(app);
      console.log('Firebase Messaging initialized successfully');
      return messaging;
    } else {
      console.warn('Firebase Messaging not supported in this browser');
      return null;
    }
  }).catch((error) => {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  });
}

// Helper function to get messaging instance after it's initialized
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (messaging) {
    return messaging;
  }

  if (messagingInitPromise) {
    await messagingInitPromise;
    return messaging;
  }

  return null;
}

// Export with type guards for SSR safety
export { app, db, messaging };

// Helper to ensure db is initialized
export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firestore not initialized. This should only be called on the client.');
  }
  return db;
}
