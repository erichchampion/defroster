#!/usr/bin/env node

/**
 * Generate firebase-messaging-sw.js with environment variables
 * This prevents hardcoded credentials in the service worker
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

// Validate all required env vars are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease add them to your .env.local file');
  process.exit(1);
}

const swContent = `// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications
// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Run 'npm run generate-sw' to regenerate this file

importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: '${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}',
  authDomain: '${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}',
  projectId: '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}',
  storageBucket: '${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}',
  messagingSenderId: '${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}',
  appId: '${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const sightingType = payload.data.sightingType || 'Unknown';
  const notificationTitle = \`\${sightingType} Sighting Nearby\`;
  const notificationBody = \`A \${sightingType} sighting has been reported within 5 miles of your location\`;

  const notificationOptions = {
    body: notificationBody,
    icon: '/appicon/defroster-192x192.png',
    badge: '/appicon/defroster-64x64.png',
    tag: 'sighting-alert',
    requireInteraction: true,
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Open the app or focus the existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
`;

const outputPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');

try {
  fs.writeFileSync(outputPath, swContent, 'utf8');
  console.log('✅ Successfully generated firebase-messaging-sw.js');
  console.log(`   Output: ${outputPath}`);
} catch (error) {
  console.error('❌ Failed to generate service worker:', error.message);
  process.exit(1);
}
