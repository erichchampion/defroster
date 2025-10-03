'use client';

import { useState, useEffect } from 'react';
import { useGeolocation } from '@/app/hooks/useGeolocation';
import { useMessaging } from '@/app/hooks/useMessaging';
import dynamic from 'next/dynamic';
import LocationPermission from '@/app/components/LocationPermission';
import MessageForm from '@/app/components/MessageForm';
import MessageList from '@/app/components/MessageList';
import { GeoLocation } from '@/lib/types/message';
import { registerServiceWorker } from '@/lib/utils/register-sw';
import { useI18n } from '@/lib/contexts/I18nContext';

// Dynamically import the map component to avoid SSR issues with Leaflet
const SightingMap = dynamic(() => import('@/app/components/SightingMap'), {
  ssr: false,
});

export default function Home() {
  const { t } = useI18n();
  const { location, permissionGranted, requestPermission: requestLocationPermission } = useGeolocation();
  const {
    token,
    permission,
    messages,
    isOffline,
    requestPermission,
    registerDevice,
    sendMessage,
    getMessages,
    setupMessageListener,
    cleanupExpiredMessages,
    cleanupOldMessages,
  } = useMessaging();

  const [isReady, setIsReady] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // When location becomes available, set up the app
  useEffect(() => {
    if (permissionGranted && location && !isReady) {
      console.log('Location available, setting up app...');

      const setup = async () => {
        // Load initial messages
        await getMessages(location);

        // Automatically request notification permission if not already granted
        if (permission !== 'granted') {
          const fcmToken = await requestPermission();
          if (fcmToken) {
            await registerDevice(location);
          }
        } else if (permission === 'granted' && !token) {
          // Permission granted but no token - try to get it
          const fcmToken = await requestPermission();
          if (fcmToken) {
            await registerDevice(location);
          }
        }

        setIsReady(true);
      };

      setup();
    }
  }, [permissionGranted, location, isReady, permission, token, requestPermission, registerDevice, getMessages]);

  // Set up message listener
  useEffect(() => {
    if (isReady) {
      const cleanup = setupMessageListener();
      return cleanup;
    }
  }, [isReady, setupMessageListener]);

  // Cleanup local IndexedDB storage (Firestore cleanup now handled by Cloud Functions)
  useEffect(() => {
    if (isReady) {
      // Cleanup local IndexedDB storage periodically
      const localCleanupInterval = setInterval(() => {
        cleanupExpiredMessages();
      }, 15 * 60 * 1000); // Every 15 minutes

      // Cleanup old messages (older than 1 week) daily
      const oldMessageCleanupInterval = setInterval(() => {
        cleanupOldMessages();
      }, 24 * 60 * 60 * 1000); // Every 24 hours

      // Initial cleanup - both expired and old messages
      cleanupExpiredMessages();
      cleanupOldMessages();

      return () => {
        clearInterval(localCleanupInterval);
        clearInterval(oldMessageCleanupInterval);
      };
    }
  }, [isReady, cleanupExpiredMessages, cleanupOldMessages]);

  // Handle sending messages
  const handleSendMessage = async (
    sightingType: 'ICE' | 'Army' | 'Police',
    sightingLocation: GeoLocation
  ) => {
    if (!location) return;

    await sendMessage(sightingType, sightingLocation, location);

    // Refresh messages
    await getMessages(location);
  };

  // Refresh messages periodically
  useEffect(() => {
    if (isReady && location) {
      const interval = setInterval(() => {
        getMessages(location);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isReady, location, getMessages]);

  if (!permissionGranted || !location) {
    return <LocationPermission onRequestPermission={requestLocationPermission} />;
  }

  if (!isReady) {
    console.log('Showing loading screen');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.main.loadingMessage}</p>
        </div>
      </div>
    );
  }

  console.log('Showing main app');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.main.heading}</h1>
          <p className="text-gray-600">
            {t.main.subtitle}
          </p>
          <div className="flex items-center gap-3 mt-2">
            {isOffline && (
              <p className="text-sm text-amber-600">
                {t.main.offlineMode}
              </p>
            )}
            {!isOffline && permission === 'granted' && token && (
              <p className="text-sm text-green-600">
                {t.main.notificationsEnabled}
              </p>
            )}
          </div>
          {permission !== 'granted' && (
            <button
              onClick={async () => {
                const fcmToken = await requestPermission();
                if (fcmToken && location) {
                  await registerDevice(location);
                }
              }}
              className="mt-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
            >
              {t.main.enableNotificationsButton}
            </button>
          )}
          {permission === 'granted' && !token && (
            <p className="text-sm text-amber-600 mt-1">
              {t.main.notificationsUnavailable}
            </p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.main.sightingsMapHeading}</h2>
          <SightingMap messages={messages} currentLocation={location} />
        </div>

        <div className="mb-6">
          <MessageForm onSendMessage={handleSendMessage} currentLocation={location} />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.main.nearbySightingsListHeading}</h2>
          <MessageList messages={messages} />
        </div>
      </div>
    </div>
  );
}
