'use client';

import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@/lib/contexts/ServicesContext';
import { Message, GeoLocation } from '@/lib/types/message';
import { STORAGE_KEYS, DEFAULT_RADIUS_MILES, GEOHASH_PRECISION_AREA } from '@/lib/constants/app';
import { FCM_TOKEN_MAX_AGE_MS } from '@/lib/constants/time';
import { getOrCreateDeviceId } from '@/lib/utils/device-id';
import { saveFCMToken, removeFCMToken } from '@/lib/utils/fcm-token';
import { handleStateSaveError } from '@/lib/utils/error-handling';
import { geohashForLocation } from 'geofire-common';

/**
 * React hook for managing messaging, notifications, and sighting data.
 *
 * @remarks
 * This hook provides a complete interface for:
 * - Push notification permission and token management
 * - Device registration for targeted notifications
 * - Sending and receiving sighting reports
 * - Offline-first message caching with IndexedDB
 * - Incremental server synchronization
 * - Network status monitoring
 *
 * Key features:
 * - **Dual retention**: 1-week local cache, 1-day server retention
 * - **Incremental queries**: Only fetch messages newer than last sync
 * - **Auto-restoration**: Restores FCM token and permissions on mount
 * - **Offline support**: Loads from IndexedDB when offline
 * - **State persistence**: Saves notification state for iOS PWA lifecycle
 *
 * @returns Object containing messaging state and operations
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const {
 *     permission,
 *     messages,
 *     requestPermission,
 *     registerDevice,
 *     sendMessage,
 *     getMessages
 *   } = useMessaging();
 *
 *   // Request notification permission
 *   const handleEnableNotifications = async () => {
 *     const token = await requestPermission();
 *     if (token && currentLocation) {
 *       await registerDevice(currentLocation);
 *     }
 *   };
 *
 *   // Send a sighting report
 *   const handleReportSighting = async () => {
 *     await sendMessage('ICE', sightingLocation, myLocation);
 *   };
 *
 *   // Load nearby sightings
 *   useEffect(() => {
 *     if (currentLocation) {
 *       getMessages(currentLocation);
 *     }
 *   }, [currentLocation]);
 *
 *   return <div>{messages.length} sightings nearby</div>;
 * }
 * ```
 */
export function useMessaging() {
  const { messagingService, storageService: localStorageService } = useServices();
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if Notification API is available before accessing it
      if ('Notification' in window) {
        setPermission(Notification.permission);
      } else {
        setPermission('denied');
      }

      // Get or create device ID
      const id = getOrCreateDeviceId(STORAGE_KEYS.DEVICE_ID);
      setDeviceId(id);

      // Set timestamp if not already set
      if (!localStorage.getItem(STORAGE_KEYS.DEVICE_ID_TIMESTAMP)) {
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID_TIMESTAMP, Date.now().toString());
      }

      // Try to restore saved FCM token
      const savedToken = localStorage.getItem(STORAGE_KEYS.FCM_TOKEN);
      const savedTimestamp = localStorage.getItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP);

      if (savedToken && savedTimestamp) {
        const tokenAge = Date.now() - parseInt(savedTimestamp);
        if (tokenAge < FCM_TOKEN_MAX_AGE_MS) {
          setToken(savedToken);
        } else {
          removeFCMToken();
        }
      }

      // Initialize IndexedDB
      localStorageService.initialize().catch((err) => {
        console.error('Failed to initialize IndexedDB:', err);
      });

      // Initialize messaging service early (even if permission not granted yet)
      // This ensures it's ready when setupMessageListener is called
      messagingService.initialize().catch((err) => {
        console.log('Messaging service initialization deferred:', err.message);
      });

      // Monitor online/offline status
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setIsOffline(!navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [messagingService, localStorageService]);

  // Check for existing notification permission and restore token on mount
  useEffect(() => {
    const checkExistingNotificationPermission = async () => {
      if (typeof window === 'undefined') return;
      if (!('Notification' in window)) return;

      const currentPermission = Notification.permission;

      // If permission was granted, try to restore the FCM token
      if (currentPermission === 'granted' && !token) {
        try {
          console.log('Notification permission previously granted, restoring FCM token...');
          await messagingService.initialize();
          const fcmToken = await messagingService.getToken();
          if (fcmToken) {
            saveFCMToken(fcmToken);
            setToken(fcmToken);
            console.log('FCM token restored successfully');

            // Save notification permission state
            await localStorageService.saveAppState({
              notificationPermissionGranted: true,
            }).catch(handleStateSaveError('save notification permission state'));
          }
        } catch (err) {
          console.error('Failed to restore FCM token:', err);
        }
      }
    };

    checkExistingNotificationPermission();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save notification permission state when permission is obtained
  useEffect(() => {
    if (permission === 'granted' && token) {
      localStorageService.saveAppState({
        notificationPermissionGranted: true,
      }).catch(handleStateSaveError('save notification permission state'));
    }
  }, [permission, token, localStorageService]);

  const requestPermission = async () => {
    try {
      // Ensure messaging service is initialized (safe to call multiple times)
      await messagingService.initialize();
      const granted = await messagingService.requestPermission();

      if (granted) {
        setPermission('granted');
        const fcmToken = await messagingService.getToken();
        if (fcmToken) {
          saveFCMToken(fcmToken);
          setToken(fcmToken);
        } else {
          setError('Push notifications unavailable (FCM token failed)');
        }
        return fcmToken;
      } else {
        setPermission('denied');
        setError('Notification permission denied');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to initialize notifications: ${errorMessage}`);
      console.error('Messaging initialization error:', err);
      // Return null but don't block the app
      return null;
    }
  };

  const registerDevice = useCallback(async (location: GeoLocation, fcmToken?: string, devId?: string) => {
    // Use provided values or fall back to state
    const tokenToUse = fcmToken || token;
    const deviceIdToUse = devId || deviceId;

    if (!tokenToUse || !deviceIdToUse) {
      console.error('Cannot register device: missing token or deviceId');
      return false;
    }

    try {
      console.log(`Registering device at location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
      const response = await fetch('/api/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToUse, deviceId: deviceIdToUse, location }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device');
      }

      console.log('Device registered successfully');

      // Save device registration state
      await localStorageService.saveAppState({
        deviceRegistered: true,
        notificationPermissionGranted: true,
        lastDeviceRegistrationTime: Date.now(),
      }).catch(handleStateSaveError('save device registration state'));

      return true;
    } catch (err) {
      setError('Failed to register device');
      console.error('Device registration error:', err);
      return false;
    }
  }, [token, deviceId, localStorageService]);

  const updateDeviceLocation = useCallback(async (newLocation: GeoLocation) => {
    if (!token || !deviceId) {
      console.warn('Cannot update device location: missing token or deviceId');
      return false;
    }

    console.log(`Updating device location to: ${newLocation.latitude.toFixed(4)}, ${newLocation.longitude.toFixed(4)}`);
    return registerDevice(newLocation, token, deviceId);
  }, [token, deviceId, registerDevice]);

  const sendMessage = useCallback(async (
    sightingType: 'ICE' | 'Army' | 'Police',
    location: GeoLocation,
    senderLocation: GeoLocation
  ) => {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sightingType,
          location,
          senderLocation,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send sighting');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError('Failed to send sighting');
      console.error(err);
      return null;
    }
  }, []);

  const getMessages = useCallback(async (location: GeoLocation) => {
    try {
      // Calculate geohash for this location
      const geohash = geohashForLocation([location.latitude, location.longitude], GEOHASH_PRECISION_AREA);

      // If offline, load from IndexedDB
      if (isOffline || !navigator.onLine) {
        console.log('Offline - loading messages from IndexedDB');
        const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);
        setMessages(localMessages);
        return localMessages;
      }

      // Get last fetch time for this area (for incremental queries)
      const lastFetchTime = await localStorageService.getLastFetchTime(geohash);
      const isIncrementalQuery = lastFetchTime > 0;

      console.log(isIncrementalQuery
        ? `Incremental query for area ${geohash.substring(0, 5)} since ${new Date(lastFetchTime).toISOString()}`
        : `Initial query for area ${geohash.substring(0, 5)}`
      );

      // Try to fetch from server
      const response = await fetch('/api/get-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          sinceTimestamp: isIncrementalQuery ? lastFetchTime : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get messages');
      }

      const data = await response.json();
      const serverMessages = data.messages || [];

      console.log(`Received ${serverMessages.length} messages from server`);

      // Save new messages to IndexedDB
      if (serverMessages.length > 0) {
        await localStorageService.saveMessages(serverMessages);
      }

      // Update last fetch time for this area
      await localStorageService.setLastFetchTime(geohash, Date.now());

      // ALWAYS merge with local messages to ensure we have the complete picture
      // (server only keeps 1 day, but local keeps 1 week)
      const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);

      if (isIncrementalQuery) {
        console.log(`Incremental query: ${serverMessages.length} new messages, ${localMessages.length} total messages`);
      } else {
        console.log(`Initial query: ${serverMessages.length} from server, ${localMessages.length} total messages (including cached)`);
      }

      setMessages(localMessages);
      return localMessages;
    } catch (err) {
      console.error('Error getting messages from server:', err);

      // Fallback to IndexedDB
      try {
        console.log('Falling back to IndexedDB');
        const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);
        setMessages(localMessages);
        return localMessages;
      } catch (localErr) {
        console.error('Error loading from IndexedDB:', localErr);
        setMessages([]);
        return [];
      }
    }
  }, [localStorageService, isOffline]);

  const setupMessageListener = useCallback(() => {
    messagingService.onMessage(async (message) => {
      // Save to IndexedDB
      try {
        await localStorageService.saveMessage(message);
      } catch (err) {
        console.error('Failed to save message to IndexedDB:', err);
      }

      // Update UI
      setMessages((prev) => [message, ...prev]);
    });

    // Set up token refresh handler
    messagingService.onTokenRefresh((newToken) => {
      saveFCMToken(newToken);
      setToken(newToken);

      // Re-register device with new token
      // Note: We don't have location here, so the app will need to re-register
      // when it next interacts with the location
    });

    return () => {
      messagingService.offMessage();
    };
  }, [messagingService, localStorageService]);

  const clearLocalStorage = async () => {
    try {
      await localStorageService.clearAll();
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear local storage:', err);
    }
  };

  const cleanupExpiredMessages = async () => {
    try {
      await localStorageService.deleteExpiredMessages();
    } catch (err) {
      console.error('Failed to cleanup expired messages:', err);
    }
  };

  const cleanupOldMessages = async () => {
    try {
      const deletedCount = await localStorageService.deleteMessagesOlderThanOneWeek();
      return deletedCount;
    } catch (err) {
      console.error('Failed to cleanup old messages:', err);
      return 0;
    }
  };

  const refreshToken = async (location?: GeoLocation) => {
    try {
      const newToken = await messagingService.refreshToken();

      if (newToken) {
        saveFCMToken(newToken);
        setToken(newToken);

        // Re-register device if location provided
        // Use the new token directly since state hasn't updated yet
        if (location) {
          try {
            const response = await fetch('/api/register-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token: newToken, deviceId, location }),
            });

            if (!response.ok) {
              throw new Error('Failed to register device');
            }
          } catch (err) {
            console.error('Failed to register device with refreshed token:', err);
          }
        }

        return newToken;
      }

      return null;
    } catch (err) {
      console.error('Failed to refresh token:', err);
      return null;
    }
  };

  return {
    token,
    deviceId,
    permission,
    messages,
    error,
    isOffline,
    requestPermission,
    registerDevice,
    updateDeviceLocation,
    sendMessage,
    getMessages,
    setupMessageListener,
    clearLocalStorage,
    cleanupExpiredMessages,
    cleanupOldMessages,
    refreshToken,
  };
}
