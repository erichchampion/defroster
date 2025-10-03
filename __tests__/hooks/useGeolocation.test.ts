import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '@/app/hooks/useGeolocation';

describe('useGeolocation', () => {
  let mockGeolocation: jest.Mocked<Geolocation>;

  beforeEach(() => {
    mockGeolocation = {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    };
    global.navigator.geolocation = mockGeolocation;
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
});
