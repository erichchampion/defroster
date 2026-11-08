const MESSAGING_SW_PATH = '/firebase-messaging-sw.js';

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Service workers are registered per origin (host:port), so a leftover
      // SW from another project on the same origin — common on localhost dev —
      // would keep controlling this page and serving stale assets. Evict any
      // registration that is not our messaging SW before registering.
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        existingRegistrations.map((registration) => {
          const scriptUrl =
            registration.installing?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.active?.scriptURL;
          if (!scriptUrl?.endsWith(MESSAGING_SW_PATH)) {
            return registration.unregister();
          }
          return Promise.resolve(false);
        })
      );

      const registration = await navigator.serviceWorker.register(MESSAGING_SW_PATH, {
        scope: '/',
        updateViaCache: 'none',
      });
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service Workers are not supported in this browser');
    return null;
  }
}
