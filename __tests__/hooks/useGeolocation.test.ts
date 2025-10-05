import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '@/app/hooks/useGeolocation';
import { ILocalStorageService } from '@/lib/abstractions/local-storage-service';

// Mock storage service
const mockStorageService: jest.Mocked<ILocalStorageService> = {
  initialize: jest.fn(),
  saveMessage: jest.fn(),
  saveMessages: jest.fn(),
  getMessagesInRadius: jest.fn(),
  getAllMessages: jest.fn(),
  deleteMessage: jest.fn(),
  deleteExpiredMessages: jest.fn(),
  deleteOldMessages: jest.fn(),
  deleteMessagesOlderThanOneWeek: jest.fn(),
  clearAll: jest.fn(),
  saveAppState: jest.fn(),
  getAppState: jest.fn(),
  clearAppState: jest.fn(),
};

// Mock the services context
jest.mock('@/lib/contexts/ServicesContext', () => ({
  useServices: () => ({
    storageService: mockStorageService,
    messagingService: {},
  }),
}));

describe('useGeolocation', () => {
  let mockGeolocation: jest.Mocked<Geolocation>;
  let mockPermissions: {
    query: jest.Mock;
  };
  let mockPermissionStatus: {
    state: string;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
  };

  beforeEach(() => {
    mockGeolocation = {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    };
    global.navigator.geolocation = mockGeolocation;

    // Mock Permissions API
    mockPermissionStatus = {
      state: 'prompt',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    mockPermissions = {
      query: jest.fn().mockResolvedValue(mockPermissionStatus),
    };

    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true,
    });

    // Reset mock storage service
    jest.clearAllMocks();
    mockStorageService.saveAppState.mockResolvedValue();
    mockStorageService.getAppState.mockResolvedValue(null);
    mockStorageService.clearAppState.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with null location and no permission', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.location).toBeNull();
      expect(result.current.permissionGranted).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('requestPermission', () => {
    it('should successfully get location and set permission', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      const { result } = renderHook(() => useGeolocation());

      let location;
      await act(async () => {
        location = await result.current.requestPermission();
      });

      expect(location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(result.current.location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(result.current.permissionGranted).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle permission denied', async () => {
      const mockError = new GeolocationPositionError('User denied geolocation', 1);

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      let location;
      await act(async () => {
        location = await result.current.requestPermission();
      });

      expect(location).toBeNull();
      expect(result.current.location).toBeNull();
      expect(result.current.permissionGranted).toBe(false);
      expect(result.current.error).toContain('permission');
    });

    it('should handle position unavailable', async () => {
      const mockError = new GeolocationPositionError('Position unavailable', 2);

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toContain('unavailable');
    });

    it('should handle timeout', async () => {
      const mockError = new GeolocationPositionError('Timeout', 3);

      mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
        error(mockError);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toContain('timed out');
    });

    it('should set loading state during request', async () => {
      let resolvePosition: (pos: any) => void;
      const positionPromise = new Promise((resolve) => {
        resolvePosition = resolve;
      });

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        positionPromise.then(success);
      });

      const { result } = renderHook(() => useGeolocation());

      let requestPromise: Promise<any>;
      act(() => {
        requestPromise = result.current.requestPermission();
      });

      // Should be loading
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the position
      await act(async () => {
        resolvePosition!({
          coords: { latitude: 37.7749, longitude: -122.4194 },
        });
        await requestPromise;
      });

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
    });
  });

  describe('updateLocation', () => {
    it('should update location without requiring permission request', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      const { result } = renderHook(() => useGeolocation());

      // First request permission
      await act(async () => {
        await result.current.requestPermission();
      });

      // Update to new location
      const newMockPosition = {
        coords: {
          latitude: 37.7850,
          longitude: -122.4094,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(newMockPosition as GeolocationPosition);
      });

      await act(async () => {
        await result.current.updateLocation();
      });

      expect(result.current.location).toEqual({
        latitude: 37.7850,
        longitude: -122.4094,
      });
      expect(result.current.permissionGranted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle geolocation not supported', async () => {
      // @ts-ignore
      global.navigator.geolocation = undefined;

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe('Geolocation is not supported by your browser');
    });

    it('should handle multiple concurrent permission requests', async () => {
      let callCount = 0;
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        callCount++;
        setTimeout(() => {
          success({
            coords: { latitude: 37.7749, longitude: -122.4194 },
          } as GeolocationPosition);
        }, 10);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await Promise.all([
          result.current.requestPermission(),
          result.current.requestPermission(),
          result.current.requestPermission(),
        ]);
      });

      // Should only make one actual geolocation request
      expect(result.current.location).toBeTruthy();
    });
  });

  describe('Permissions API Integration', () => {
    it('should automatically restore location when permission was previously granted', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockPermissionStatus.state = 'granted';
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      await act(async () => {
        renderHook(() => useGeolocation());
      });

      // Wait for permission check and automatic location request
      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should not request location when permission was denied', async () => {
      mockPermissionStatus.state = 'denied';

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
        expect(result.current.error).toBe('Location permission was denied');
      });

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });

    it('should not request location when permission is in prompt state', async () => {
      mockPermissionStatus.state = 'prompt';

      renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
      });

      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });

    it('should handle Permissions API not available', async () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderHook(() => useGeolocation());

      // Should not throw error, just log
      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
      });
    });

    it('should handle Permissions API query error gracefully', async () => {
      mockPermissions.query.mockRejectedValue(new Error('Permission query failed'));

      renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalled();
      });

      // Should not crash the hook
      expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
    });

    it('should listen for permission changes and request location when granted', async () => {
      mockPermissionStatus.state = 'prompt';

      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissionStatus.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      // Simulate permission being granted
      const changeHandler = mockPermissionStatus.addEventListener.mock.calls[0][1];
      mockPermissionStatus.state = 'granted';

      await act(async () => {
        changeHandler();
      });

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should query permissions with correct name parameter', async () => {
      renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
      });
    });
  });

  describe('Location State Persistence', () => {
    it('should save location state to IndexedDB when location is obtained', async () => {
      const mockPosition = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            lastKnownLocation: {
              latitude: 37.7749,
              longitude: -122.4194,
              timestamp: expect.any(Number),
            },
            locationPermissionGranted: true,
          })
        );
      });
    });

    it('should restore location from IndexedDB on mount if available', async () => {
      const savedState = {
        lastKnownLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: Date.now() - 1000,
        },
        locationPermissionGranted: true,
        notificationPermissionGranted: false,
        deviceRegistered: false,
        lastDeviceRegistrationTime: 0,
        appInitialized: false,
        lastActiveTimestamp: 0,
      };

      mockStorageService.getAppState.mockResolvedValue(savedState);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockStorageService.getAppState).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.location).toEqual({
          latitude: 37.7749,
          longitude: -122.4194,
        });
      });
    });

    it('should not restore location if state is null', async () => {
      mockStorageService.getAppState.mockResolvedValue(null);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockStorageService.getAppState).toHaveBeenCalled();
      });

      expect(result.current.location).toBeNull();
    });

    it('should not restore location if lastKnownLocation is null', async () => {
      const savedState = {
        lastKnownLocation: null,
        locationPermissionGranted: true,
        notificationPermissionGranted: false,
        deviceRegistered: false,
        lastDeviceRegistrationTime: 0,
        appInitialized: false,
        lastActiveTimestamp: 0,
      };

      mockStorageService.getAppState.mockResolvedValue(savedState);

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockStorageService.getAppState).toHaveBeenCalled();
      });

      expect(result.current.location).toBeNull();
    });

    it('should update state in IndexedDB when location changes', async () => {
      const firstPosition = {
        coords: { latitude: 37.7749, longitude: -122.4194 },
      };
      const secondPosition = {
        coords: { latitude: 37.7850, longitude: -122.4094 },
      };

      mockGeolocation.getCurrentPosition
        .mockImplementationOnce((success) => success(firstPosition as GeolocationPosition))
        .mockImplementationOnce((success) => success(secondPosition as GeolocationPosition));

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        await result.current.updateLocation();
      });

      await waitFor(() => {
        expect(mockStorageService.saveAppState).toHaveBeenCalledWith(
          expect.objectContaining({
            lastKnownLocation: {
              latitude: 37.7850,
              longitude: -122.4094,
              timestamp: expect.any(Number),
            },
          })
        );
      });
    });

    it('should handle saveAppState errors gracefully', async () => {
      mockStorageService.saveAppState.mockRejectedValue(new Error('Save failed'));

      const mockPosition = {
        coords: { latitude: 37.7749, longitude: -122.4194 },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition as GeolocationPosition);
      });

      const { result } = renderHook(() => useGeolocation());

      await act(async () => {
        await result.current.requestPermission();
      });

      // Should still set location even if save fails
      expect(result.current.location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });
  });
});
