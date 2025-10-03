// Firebase Cloud Messaging Service Worker TEMPLATE
// This template is used by scripts/generate-sw.js to create the actual service worker
// DO NOT use this file directly - it will not work without environment variable substitution

importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// Firebase configuration will be injected here by the build script
firebase.initializeApp({
  apiKey: '${NEXT_PUBLIC_FIREBASE_API_KEY}',
  authDomain: '${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}',
  projectId: '${NEXT_PUBLIC_FIREBASE_PROJECT_ID}',
  storageBucket: '${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}',
  messagingSenderId: '${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}',
  appId: '${NEXT_PUBLIC_FIREBASE_APP_ID}',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const sightingType = payload.data.sightingType || 'Unknown';
  const notificationTitle = `${sightingType} Sighting Nearby`;
  const notificationBody = `A ${sightingType} sighting has been reported within 5 miles of your location`;

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
