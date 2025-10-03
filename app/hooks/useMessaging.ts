'use client';

import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@/lib/contexts/ServicesContext';
import { Message, GeoLocation } from '@/lib/types/message';
import { STORAGE_KEYS, DEFAULT_RADIUS_MILES } from '@/lib/constants/app';
import { FCM_TOKEN_MAX_AGE_MS } from '@/lib/constants/time';
import { getOrCreateDeviceId } from '@/lib/utils/device-id';

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
      setPermission(Notification.permission);

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
          localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP);
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

  const requestPermission = async () => {
    try {
      // Ensure messaging service is initialized (safe to call multiple times)
      await messagingService.initialize();
      const granted = await messagingService.requestPermission();

      if (granted) {
        setPermission('granted');
        const fcmToken = await messagingService.getToken();
        if (fcmToken) {
          // Save token to localStorage with timestamp
          localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, fcmToken);
          localStorage.setItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP, Date.now().toString());

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

  const registerDevice = async (location: GeoLocation) => {
    if (!token || !deviceId) {
      return false;
    }

    try {
      const response = await fetch('/api/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({ token, deviceId, location }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device');
      }

      return true;
    } catch (err) {
      setError('Failed to register device');
      console.error(err);
      return false;
    }
  };

  const sendMessage = async (
    sightingType: 'ICE' | 'Army' | 'Police',
    location: GeoLocation,
    senderLocation: GeoLocation
  ) => {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
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
  };

  const getMessages = async (location: GeoLocation) => {
    try {
      // If offline, load from IndexedDB
      if (isOffline || !navigator.onLine) {
        console.log('Offline - loading messages from IndexedDB');
        const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);
        setMessages(localMessages);
        return localMessages;
      }

      // Try to fetch from server
      const response = await fetch('/api/get-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error('Failed to get messages');
      }

      const data = await response.json();
      const serverMessages = data.messages || [];

      // Save to IndexedDB for offline access
      if (serverMessages.length > 0) {
        await localStorageService.saveMessages(serverMessages);
      }

      setMessages(serverMessages);
      return serverMessages;
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
  };

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
      // Save new token to localStorage
      localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, newToken);
      localStorage.setItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP, Date.now().toString());

      // Update state
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
        // Save new token to localStorage
        localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, newToken);
        localStorage.setItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP, Date.now().toString());

        // Update state
        setToken(newToken);

        // Re-register device if location provided
        // Use the new token directly since state hasn't updated yet
        if (location) {
          try {
            const response = await fetch('/api/register-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
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
    sendMessage,
    getMessages,
    setupMessageListener,
    clearLocalStorage,
    cleanupExpiredMessages,
    cleanupOldMessages,
    refreshToken,
  };
}
