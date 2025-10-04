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
import {
  MESSAGE_REFRESH_INTERVAL_MS,
  CLEANUP_INTERVAL_MS,
  OLD_MESSAGE_CLEANUP_INTERVAL_MS
} from '@/lib/constants/time';

// Dynamically import the map component to avoid SSR issues with Leaflet
const SightingMap = dynamic(() => import('@/app/components/SightingMap'), {
  ssr: false,
});

export default function Home() {
  const { t } = useI18n();
  const {
    location,
    permissionGranted,
    requestPermission: requestLocationPermission,
    startWatchingLocation
  } = useGeolocation();
  const {
    token,
    deviceId,
    permission,
    messages,
    isOffline,
    requestPermission,
    registerDevice,
    updateDeviceLocation,
    sendMessage,
    getMessages,
    setupMessageListener,
    cleanupExpiredMessages,
    cleanupOldMessages,
  } = useMessaging();

  const [isReady, setIsReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Detect if running as standalone PWA and if on iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as Window['navigator'] & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
      setIsIOS(ios);
    }
  }, []);

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
          if (fcmToken && deviceId) {
            await registerDevice(location, fcmToken, deviceId);
          }
        } else if (permission === 'granted' && !token) {
          // Permission granted but no token - try to get it
          const fcmToken = await requestPermission();
          if (fcmToken && deviceId) {
            await registerDevice(location, fcmToken, deviceId);
          }
        }

        setIsReady(true);
      };

      setup();
    }
  }, [permissionGranted, location, isReady, permission, token, deviceId, requestPermission, registerDevice, getMessages]);

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
      }, CLEANUP_INTERVAL_MS);

      // Cleanup old messages (older than 1 week) daily
      const oldMessageCleanupInterval = setInterval(() => {
        cleanupOldMessages();
      }, OLD_MESSAGE_CLEANUP_INTERVAL_MS);

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

  // Refresh messages periodically (only when page is visible)
  useEffect(() => {
    if (isReady && location) {
      const refreshMessages = () => {
        if (!document.hidden) {
          getMessages(location);
        }
      };

      const interval = setInterval(refreshMessages, MESSAGE_REFRESH_INTERVAL_MS);

      // Also refresh when page becomes visible again
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          getMessages(location);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isReady, location, getMessages]);

  // Watch for location changes in the background
  useEffect(() => {
    if (isReady && permissionGranted) {
      console.log('Setting up background location monitoring...');

      const cleanup = startWatchingLocation(async (newLocation) => {
        console.log('Location changed significantly, updating app state...');

        // Update device registration with new location
        if (token && deviceId) {
          await updateDeviceLocation(newLocation);
        }

        // Refresh messages for new location
        await getMessages(newLocation);
      });

      return cleanup || undefined;
    }
  }, [isReady, permissionGranted, token, deviceId, startWatchingLocation, updateDeviceLocation, getMessages]);

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
          {permission !== 'granted' && !isIOS && (
            <button
              onClick={async () => {
                const fcmToken = await requestPermission();
                if (fcmToken && location && deviceId) {
                  await registerDevice(location, fcmToken, deviceId);
                }
              }}
              className="mt-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
            >
              {t.main.enableNotificationsButton}
            </button>
          )}
          {permission !== 'granted' && isIOS && !isStandalone && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <p className="font-semibold">{t.main.iosNotificationGuide.heading}</p>
              <p className="mt-1">
                {t.main.iosNotificationGuide.instructions}
                <svg className="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </p>
            </div>
          )}
          {permission !== 'granted' && isIOS && isStandalone && (
            <button
              onClick={async () => {
                const fcmToken = await requestPermission();
                if (fcmToken && location && deviceId) {
                  await registerDevice(location, fcmToken, deviceId);
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
