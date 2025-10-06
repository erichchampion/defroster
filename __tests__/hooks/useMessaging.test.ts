import React, { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessaging } from '@/app/hooks/useMessaging';
import { ServicesProvider } from '@/lib/contexts/ServicesContext';

// Mock fetch
global.fetch = jest.fn();

// Create mock service instances
const mockMessagingService = {
  initialize: jest.fn(),
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  sendToDevices: jest.fn(),
  onMessage: jest.fn(),
  offMessage: jest.fn(),
  onTokenRefresh: jest.fn(),
  refreshToken: jest.fn(),
};

const mockStorageService = {
  initialize: jest.fn(),
  saveMessage: jest.fn(),
  saveMessages: jest.fn(),
  getMessagesInRadius: jest.fn(),
  getAllMessages: jest.fn(),
  deleteMessage: jest.fn(),
  deleteExpiredMessages: jest.fn(),
  deleteMessagesOlderThanOneWeek: jest.fn(),
  clearAll: jest.fn(),
  getLastFetchTime: jest.fn(),
  setLastFetchTime: jest.fn(),
  saveAppState: jest.fn(),
  getAppState: jest.fn(),
  clearAppState: jest.fn(),
};

describe('useMessaging', () => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(
      ServicesProvider,
      {
        messagingService: mockMessagingService as any,
        storageService: mockStorageService as any,
      },
      children
    );

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockMessagingService.initialize.mockResolvedValue(undefined);
    mockMessagingService.requestPermission.mockResolvedValue(true);
    mockMessagingService.getToken.mockResolvedValue('mock_fcm_token');
    mockMessagingService.sendToDevices.mockResolvedValue(undefined);
    mockMessagingService.refreshToken.mockResolvedValue('new_mock_token');

    mockStorageService.initialize.mockResolvedValue(undefined);
    mockStorageService.saveMessage.mockResolvedValue(undefined);
    mockStorageService.saveMessages.mockResolvedValue(undefined);
    mockStorageService.getMessagesInRadius.mockResolvedValue([]);
    mockStorageService.getAllMessages.mockResolvedValue([]);
    mockStorageService.deleteMessage.mockResolvedValue(undefined);
    mockStorageService.deleteExpiredMessages.mockResolvedValue(0);
    mockStorageService.getLastFetchTime.mockResolvedValue(0);
    mockStorageService.setLastFetchTime.mockResolvedValue(undefined);
    mockStorageService.deleteMessagesOlderThanOneWeek.mockResolvedValue(0);
    mockStorageService.clearAll.mockResolvedValue(undefined);
    mockStorageService.saveAppState.mockResolvedValue(undefined);
    mockStorageService.getAppState.mockResolvedValue(null);
    mockStorageService.clearAppState.mockResolvedValue(undefined);

    // Mock Notification API
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn(() => Promise.resolve('granted')),
    } as any;

    // Mock navigator.onLine
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
    Storage.prototype.clear = jest.fn();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      expect(result.current.token).toBeNull();
      expect(result.current.permission).toBe('default');
      expect(result.current.messages).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should detect existing notification permission', () => {
      global.Notification.permission = 'granted';

      const { result } = renderHook(() => useMessaging(), { wrapper });

      expect(result.current.permission).toBe('granted');
    });
  });

  describe('requestPermission', () => {
    it('should successfully request permission and get token', async () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      let token;
      await act(async () => {
        token = await result.current.requestPermission();
      });

      expect(mockMessagingService.initialize).toHaveBeenCalled();
      expect(mockMessagingService.requestPermission).toHaveBeenCalled();
      expect(mockMessagingService.getToken).toHaveBeenCalled();
      expect(token).toBe('mock_fcm_token');
      expect(result.current.token).toBe('mock_fcm_token');
      expect(result.current.permission).toBe('granted');
    });

    it('should handle permission denied', async () => {
      mockMessagingService.requestPermission.mockResolvedValue(false);

      const { result } = renderHook(() => useMessaging(), { wrapper });

      let token;
      await act(async () => {
        token = await result.current.requestPermission();
      });

      expect(token).toBeNull();
      expect(result.current.permission).toBe('denied');
      expect(result.current.error).toBe('Notification permission denied');
    });

    it('should handle FCM token failure gracefully', async () => {
      mockMessagingService.getToken.mockResolvedValue(null);

      const { result } = renderHook(() => useMessaging(), { wrapper });

      let token;
      await act(async () => {
        token = await result.current.requestPermission();
      });

      expect(token).toBeNull();
      expect(result.current.permission).toBe('granted');
      expect(result.current.error).toBe('Push notifications unavailable (FCM token failed)');
    });

    it('should handle initialization errors', async () => {
      mockMessagingService.initialize.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useMessaging(), { wrapper });

      let token;
      await act(async () => {
        token = await result.current.requestPermission();
      });

      expect(token).toBeNull();
      expect(result.current.error).toContain('Failed to initialize notifications');
    });
  });

  describe('registerDevice', () => {
    it('should successfully register device with token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // First get a token
      await act(async () => {
        await result.current.requestPermission();
      });

      // Then register device
      let success;
      await act(async () => {
        success = await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/register-device',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('mock_fcm_token'),
        })
      );

      // Verify deviceId is included
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const bodyData = JSON.parse(fetchCall.body);
      expect(bodyData.token).toBe('mock_fcm_token');
      expect(bodyData.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(bodyData.location).toEqual({ latitude: 37.7749, longitude: -122.4194 });
    });

    it('should skip registration without token', async () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      let success;
      await act(async () => {
        success = await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      expect(success).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.requestPermission();
      });

      let success;
      await act(async () => {
        success = await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to register device');
    });
  });

  describe('sendMessage', () => {
    it('should successfully send ICE sighting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg_123' }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      let response;
      await act(async () => {
        response = await result.current.sendMessage(
          'ICE',
          { latitude: 37.7849, longitude: -122.4294 },
          { latitude: 37.7749, longitude: -122.4194 }
        );
      });

      expect(response).toEqual({ success: true, messageId: 'msg_123' });
      expect(global.fetch).toHaveBeenCalledWith('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('ICE'),
      });
    });

    it('should successfully send Army sighting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg_124' }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.sendMessage(
          'Army',
          { latitude: 37.7849, longitude: -122.4294 },
          { latitude: 37.7749, longitude: -122.4194 }
        );
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.sightingType).toBe('Army');
      expect(callBody.location).toEqual({ latitude: 37.7849, longitude: -122.4294 });
    });

    it('should successfully send Police sighting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, messageId: 'msg_125' }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.sendMessage(
          'Police',
          { latitude: 37.7849, longitude: -122.4294 },
          { latitude: 37.7749, longitude: -122.4194 }
        );
      });

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.sightingType).toBe('Police');
    });

    it('should handle send failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      let response;
      await act(async () => {
        response = await result.current.sendMessage(
          'ICE',
          { latitude: 37.7849, longitude: -122.4294 },
          { latitude: 37.7749, longitude: -122.4194 }
        );
      });

      expect(response).toBeNull();
      expect(result.current.error).toBe('Failed to send sighting');
    });
  });

  describe('getMessages', () => {
    it('should successfully retrieve messages from server', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          sightingType: 'ICE' as const,
          location: { latitude: 37.7849, longitude: -122.4294 },
          timestamp: Date.now(),
          geohash: 'hash1',
          expiresAt: Date.now() + 3600000,
        },
        {
          id: 'msg_2',
          sightingType: 'Police' as const,
          location: { latitude: 37.7850, longitude: -122.4295 },
          timestamp: Date.now(),
          geohash: 'hash2',
          expiresAt: Date.now() + 3600000,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ messages: mockMessages }),
      });

      // Mock getMessagesInRadius to return the same messages (simulating they were saved and retrieved)
      mockStorageService.getMessagesInRadius.mockResolvedValue(mockMessages);

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.getMessages({ latitude: 37.7749, longitude: -122.4194 });
      });

      expect(result.current.messages).toEqual(mockMessages);
      expect(mockStorageService.saveMessages).toHaveBeenCalledWith(mockMessages);
      expect(mockStorageService.getMessagesInRadius).toHaveBeenCalled();
    });

    it('should handle empty message list', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.getMessages({ latitude: 37.7749, longitude: -122.4194 });
      });

      expect(result.current.messages).toEqual([]);
      expect(mockStorageService.saveMessages).not.toHaveBeenCalled();
    });

    it('should load from IndexedDB when offline', async () => {
      const mockLocalMessages = [
        {
          id: 'msg_local',
          sightingType: 'Army' as const,
          location: { latitude: 37.7849, longitude: -122.4294 },
          timestamp: Date.now(),
          geohash: 'hash_local',
          expiresAt: Date.now() + 3600000,
        },
      ];

      mockStorageService.getMessagesInRadius.mockResolvedValue(mockLocalMessages);
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.getMessages({ latitude: 37.7749, longitude: -122.4194 });
      });

      expect(mockStorageService.getMessagesInRadius).toHaveBeenCalledWith(
        { latitude: 37.7749, longitude: -122.4194 },
        5
      );
      expect(result.current.messages).toEqual(mockLocalMessages);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fallback to IndexedDB on server error', async () => {
      const mockLocalMessages = [
        {
          id: 'msg_fallback',
          sightingType: 'ICE' as const,
          location: { latitude: 37.7849, longitude: -122.4294 },
          timestamp: Date.now(),
          geohash: 'hash_fb',
          expiresAt: Date.now() + 3600000,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      mockStorageService.getMessagesInRadius.mockResolvedValue(mockLocalMessages);

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.getMessages({ latitude: 37.7749, longitude: -122.4194 });
      });

      expect(mockStorageService.getMessagesInRadius).toHaveBeenCalled();
      expect(result.current.messages).toEqual(mockLocalMessages);
    });
  });

  describe('setupMessageListener', () => {
    it('should set up message listener', () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      act(() => {
        result.current.setupMessageListener();
      });

      expect(mockMessagingService.onMessage).toHaveBeenCalled();
    });

    it('should add new messages to state and save to IndexedDB when received', async () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      let messageCallback: any;
      mockMessagingService.onMessage.mockImplementation((cb) => {
        messageCallback = cb;
      });

      act(() => {
        result.current.setupMessageListener();
      });

      // Simulate receiving a message
      const newMessage = {
        id: 'msg_new',
        sightingType: 'ICE' as const,
        location: { latitude: 37.7849, longitude: -122.4294 },
        timestamp: Date.now(),
        geohash: 'hash_new',
        expiresAt: Date.now() + 3600000,
      };

      await act(async () => {
        await messageCallback(newMessage);
      });

      expect(result.current.messages).toContainEqual(newMessage);
      expect(mockStorageService.saveMessage).toHaveBeenCalledWith(newMessage);
    });

    it('should clean up listener on unmount', () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      let cleanup: any;
      act(() => {
        cleanup = result.current.setupMessageListener();
      });

      act(() => {
        cleanup();
      });

      expect(mockMessagingService.offMessage).toHaveBeenCalled();
    });
  });

  describe('Offline/Online Detection', () => {
    it('should initialize with online state', () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });
      expect(result.current.isOffline).toBe(false);
    });

    it('should detect offline state', () => {
      Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useMessaging(), { wrapper });
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('cleanupExpiredMessages', () => {
    it('should delete expired messages from IndexedDB', async () => {
      mockStorageService.deleteExpiredMessages.mockResolvedValue(3);
      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.cleanupExpiredMessages();
      });

      expect(mockStorageService.deleteExpiredMessages).toHaveBeenCalled();
    });
  });

  describe('clearLocalStorage', () => {
    it('should clear all local storage and messages', async () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      // Add some messages first
      await act(async () => {
        const mockMessages = [
          {
            id: 'msg_1',
            sightingType: 'ICE' as const,
            location: { latitude: 37.7849, longitude: -122.4294 },
            timestamp: Date.now(),
            geohash: 'hash1',
            expiresAt: Date.now() + 3600000,
          },
        ];
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ messages: mockMessages }),
        });
        // Mock getMessagesInRadius to return the messages (simulating they were saved and retrieved)
        mockStorageService.getMessagesInRadius.mockResolvedValue(mockMessages);
        await result.current.getMessages({ latitude: 37.7749, longitude: -122.4194 });
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      await act(async () => {
        await result.current.clearLocalStorage();
      });

      expect(mockStorageService.clearAll).toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });
  });

  describe('Token Persistence', () => {
    it('should restore FCM token from localStorage on initialization', async () => {
      const savedToken = 'saved_fcm_token';
      const savedTimestamp = Date.now().toString();

      // Must set up mock BEFORE rendering hook
      const getItemMock = jest.fn((key: string) => {
        if (key === 'defroster_fcm_token') return savedToken;
        if (key === 'defroster_fcm_token_timestamp') return savedTimestamp;
        return null;
      });
      Storage.prototype.getItem = getItemMock;

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // Wait for the effect to run
      await waitFor(() => {
        expect(result.current.token).toBe(savedToken);
      });

      expect(getItemMock).toHaveBeenCalledWith('defroster_fcm_token');
      expect(getItemMock).toHaveBeenCalledWith('defroster_fcm_token_timestamp');
    });

    it('should not restore expired token from localStorage', async () => {
      const savedToken = 'expired_token';
      const expiredTimestamp = (Date.now() - (31 * 24 * 60 * 60 * 1000)).toString(); // 31 days ago

      // Must set up mock BEFORE rendering hook
      const getItemMock = jest.fn((key: string) => {
        if (key === 'defroster_fcm_token') return savedToken;
        if (key === 'defroster_fcm_token_timestamp') return expiredTimestamp;
        return null;
      });
      Storage.prototype.getItem = getItemMock;
      const removeItemMock = jest.fn();
      Storage.prototype.removeItem = removeItemMock;

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // Wait for the effect to run
      await waitFor(() => {
        expect(removeItemMock).toHaveBeenCalledWith('defroster_fcm_token');
      });

      expect(result.current.token).toBeNull();
      expect(removeItemMock).toHaveBeenCalledWith('defroster_fcm_token_timestamp');
    });

    it('should save token to localStorage when obtained', async () => {
      const setItemMock = jest.fn();
      Storage.prototype.setItem = setItemMock;

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(setItemMock).toHaveBeenCalledWith('defroster_fcm_token', 'mock_fcm_token');
      expect(setItemMock).toHaveBeenCalledWith('defroster_fcm_token_timestamp', expect.any(String));
    });

    it('should refresh token and save to localStorage', async () => {
      const setItemMock = jest.fn();
      Storage.prototype.setItem = setItemMock;

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // First get a token
      await act(async () => {
        await result.current.requestPermission();
      });

      // Clear previous calls
      setItemMock.mockClear();

      // Refresh token
      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockMessagingService.refreshToken).toHaveBeenCalled();
      expect(setItemMock).toHaveBeenCalledWith('defroster_fcm_token', 'new_mock_token');
      expect(setItemMock).toHaveBeenCalledWith('defroster_fcm_token_timestamp', expect.any(String));
      expect(result.current.token).toBe('new_mock_token');
    });

    it('should re-register device when refreshing token with location', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // Get initial token
      await act(async () => {
        await result.current.requestPermission();
      });

      const location = { latitude: 37.7749, longitude: -122.4194 };

      // Refresh with location
      await act(async () => {
        await result.current.refreshToken(location);
      });

      // Should re-register device with new token
      // Check the last call to fetch (it may have been called multiple times)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const lastCall = fetchCalls[fetchCalls.length - 1];

      expect(lastCall[0]).toBe('/api/register-device');
      const bodyData = JSON.parse(lastCall[1].body);
      expect(bodyData.token).toBe('new_mock_token');
      expect(bodyData.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(bodyData.location).toEqual(location);
    });
  });

  describe('Notification Permission Restoration', () => {
    it('should restore FCM token when permission is already granted on mount', async () => {
      global.Notification.permission = 'granted';
      mockMessagingService.getToken.mockResolvedValue('restored_token');

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });

      await waitFor(() => {
        expect(mockMessagingService.initialize).toHaveBeenCalled();
        expect(mockMessagingService.getToken).toHaveBeenCalled();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(result.current.token).toBe('restored_token');
      });
    });

    it('should not restore token when permission is denied', async () => {
      global.Notification.permission = 'denied';

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
      });

      expect(mockMessagingService.getToken).not.toHaveBeenCalled();
      expect(result.current.token).toBeNull();
    });

    it('should not restore token when permission is in default state', async () => {
      global.Notification.permission = 'default';

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('default');
      });

      expect(mockMessagingService.getToken).not.toHaveBeenCalled();
      expect(result.current.token).toBeNull();
    });

    it('should handle FCM token restoration failure gracefully', async () => {
      global.Notification.permission = 'granted';
      mockMessagingService.getToken.mockRejectedValue(new Error('Token retrieval failed'));

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });

      // Should not crash, token should remain null
      await waitFor(() => {
        expect(mockMessagingService.getToken).toHaveBeenCalled();
      }, { timeout: 3000 });

      expect(result.current.token).toBeNull();
    });

    it('should handle messaging service initialization failure during restoration', async () => {
      global.Notification.permission = 'granted';
      mockMessagingService.initialize.mockRejectedValue(new Error('Service init failed'));

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });

      // Should not crash
      await waitFor(() => {
        expect(mockMessagingService.initialize).toHaveBeenCalled();
      }, { timeout: 3000 });

      expect(result.current.token).toBeNull();
    });

    it('should save restored token to localStorage', async () => {
      global.Notification.permission = 'granted';
      mockMessagingService.getToken.mockResolvedValue('restored_token');

      renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(Storage.prototype.setItem).toHaveBeenCalledWith('defroster_fcm_token', 'restored_token');
        expect(Storage.prototype.setItem).toHaveBeenCalledWith('defroster_fcm_token_timestamp', expect.any(String));
      }, { timeout: 3000 });
    });

    it('should handle Notification API not available', async () => {
      // @ts-ignore
      delete global.Notification;

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(result.current.permission).toBe('denied');
      });

      expect(mockMessagingService.getToken).not.toHaveBeenCalled();
    });
  });

  describe('Device Registration State Persistence', () => {
    it('should save device registration state after successful registration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      // First get a token
      await act(async () => {
        await result.current.requestPermission();
      });

      // Then register device
      await act(async () => {
        await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceRegistered: true,
            notificationPermissionGranted: true,
            lastDeviceRegistrationTime: expect.any(Number),
          })
        );
      });
    });

    it('should save notification permission state after successful token restoration', async () => {
      global.Notification.permission = 'granted';
      mockMessagingService.getToken.mockResolvedValue('restored_token');

      renderHook(() => useMessaging(), { wrapper });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            notificationPermissionGranted: true,
          })
        );
      }, { timeout: 3000 });
    });

    it('should handle saveAppState errors gracefully during registration', async () => {
      mockStorageService.saveAppState.mockRejectedValue(new Error('Save failed'));

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        const success = await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
        // Should still return success even if state save fails
        expect(success).toBe(true);
      });
    });

    it('should update state when token is obtained through requestPermission', async () => {
      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            notificationPermissionGranted: true,
          })
        );
      });
    });

    it('should track last device registration time', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      const beforeTime = Date.now();

      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        await result.current.registerDevice({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });

      const afterTime = Date.now();

      await waitFor(() => {
        const calls = mockStorageService.saveAppState.mock.calls;
        const registrationCall = calls.find((call) =>
          call[0].deviceRegistered === true
        );
        expect(registrationCall).toBeDefined();
        expect(registrationCall![0].lastDeviceRegistrationTime).toBeGreaterThanOrEqual(beforeTime);
        expect(registrationCall![0].lastDeviceRegistrationTime).toBeLessThanOrEqual(afterTime);
      });
    });

    it('should update state when device location is updated', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useMessaging(), { wrapper });

      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        await result.current.updateDeviceLocation({
          latitude: 37.7850,
          longitude: -122.4094,
        });
      });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            deviceRegistered: true,
            lastDeviceRegistrationTime: expect.any(Number),
          })
        );
      });
    });
  });
});
