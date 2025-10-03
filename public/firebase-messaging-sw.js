// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications

importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyAf6EhR0Z7qVSGLIT4_nkkIS3SyYtG8pE0',
  authDomain: 'defroster-21a47.firebaseapp.com',
  projectId: 'defroster-21a47',
  storageBucket: 'defroster-21a47.firebasestorage.app',
  messagingSenderId: '1098585951719',
  appId: '1:1098585951719:web:b91c3c8a90ea16d6424142',
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
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
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
        if (client.url === '/' && 'focus' in client) {
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
