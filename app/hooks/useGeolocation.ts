'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GeoLocation } from '@/lib/types/message';
import { getGeolocationErrorMessage } from '@/lib/utils/geolocation-errors';
import { GEOLOCATION_OPTIONS } from '@/lib/constants/geolocation';
import { LOCATION_WATCH_OPTIONS, SIGNIFICANT_LOCATION_CHANGE_MILES } from '@/lib/constants/app';
import { calculateDistance } from '@/lib/utils/distance';
import { useServices } from '@/lib/contexts/ServicesContext';
import { handleStateSaveError } from '@/lib/utils/error-handling';

/**
 * React hook for managing geolocation with iOS PWA lifecycle support.
 *
 * @remarks
 * Provides comprehensive geolocation management with features optimized for
 * Progressive Web Apps, especially on iOS where apps may be terminated when
 * backgrounded.
 *
 * Key features:
 * - **Permission auto-detection**: Uses Permissions API to check existing grants
 * - **State persistence**: Saves/restores location from IndexedDB
 * - **Permission monitoring**: Listens for permission changes
 * - **Location watching**: Background updates with significant change detection
 * - **Battery optimization**: Uses network location (not GPS) for efficiency
 * - **iOS lifecycle support**: Automatic restoration after app backgrounding
 *
 * The hook automatically:
 * 1. Checks for previously granted permissions on mount
 * 2. Restores last known location from IndexedDB
 * 3. Auto-requests location if permission already granted
 * 4. Saves location changes to IndexedDB for persistence
 *
 * @returns Object containing location state and operations
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const {
 *     location,
 *     permissionGranted,
 *     loading,
 *     error,
 *     requestPermission,
 *     startWatchingLocation
 *   } = useGeolocation();
 *
 *   // Request initial permission
 *   const handleRequestLocation = async () => {
 *     const loc = await requestPermission();
 *     if (loc) {
 *       console.log('Got location:', loc);
 *     }
 *   };
 *
 *   // Start watching for location changes
 *   useEffect(() => {
 *     if (permissionGranted) {
 *       const cleanup = startWatchingLocation((newLoc) => {
 *         console.log('Location updated:', newLoc);
 *       });
 *       return cleanup;
 *     }
 *   }, [permissionGranted]);
 *
 *   if (loading) return <div>Getting location...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (!location) return <div>No location</div>;
 *
 *   return <div>Lat: {location.latitude}, Lng: {location.longitude}</div>;
 * }
 * ```
 */
export function useGeolocation() {
  const { storageService } = useServices();
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const onLocationChangeRef = useRef<((newLocation: GeoLocation) => void) | null>(null);
  const locationRef = useRef<GeoLocation | null>(null);

  // Helper function to handle geolocation errors
  const handleGeolocationError = (err: unknown, defaultMessage: string) => {
    const errorMessage =
      err instanceof GeolocationPositionError
        ? getGeolocationErrorMessage(err)
        : err instanceof Error
        ? err.message
        : defaultMessage;
    setError(errorMessage);
    setLoading(false);
    return null;
  };

  // Keep locationRef in sync with location state
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // Restore location state from IndexedDB on mount
  useEffect(() => {
    const restoreLocationState = async () => {
      try {
        const savedState = await storageService.getAppState();
        if (savedState?.lastKnownLocation && savedState.locationPermissionGranted) {
          console.log('Restoring location from IndexedDB...');
          setLocation({
            latitude: savedState.lastKnownLocation.latitude,
            longitude: savedState.lastKnownLocation.longitude,
          });
        }
      } catch (err) {
        handleStateSaveError('restore location state')(err);
      }
    };

    restoreLocationState();
  }, [storageService]);

  // Save location state to IndexedDB when it changes
  useEffect(() => {
    if (location && permissionGranted) {
      storageService.saveAppState({
        lastKnownLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: Date.now(),
        },
        locationPermissionGranted: true,
      }).catch(handleStateSaveError('save location state'));
    }
  }, [location, permissionGranted, storageService]);

  // Check for existing geolocation permission on mount
  useEffect(() => {
    const checkExistingPermission = async () => {
      if (typeof window === 'undefined') return;

      // Check if Permissions API is available
      if (!('permissions' in navigator)) {
        console.log('Permissions API not available');
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

        if (result.state === 'granted') {
          console.log('Geolocation permission previously granted, restoring location...');
          // Automatically restore location without user interaction
          await requestPermission();
        } else if (result.state === 'denied') {
          setError('Location permission was denied');
        }

        // Listen for permission changes
        const handlePermissionChange = () => {
          if (result.state === 'granted') {
            requestPermission();
          }
        };

        result.addEventListener('change', handlePermissionChange);

        // Cleanup listener on unmount
        return () => {
          result.removeEventListener('change', handlePermissionChange);
        };
      } catch (err) {
        console.error('Failed to query geolocation permission:', err);
      }
    };

    checkExistingPermission();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocation(newLocation);
      setPermissionGranted(true);
      setLoading(false);

      return newLocation;
    } catch (err) {
      return handleGeolocationError(err, 'Failed to get location');
    }
  };

  const updateLocation = async () => {
    if (!permissionGranted) {
      return requestPermission();
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocation(newLocation);
      setLoading(false);

      return newLocation;
    } catch (err) {
      return handleGeolocationError(err, 'Failed to update location');
    }
  };

  const startWatchingLocation = useCallback((
    onLocationChange?: (newLocation: GeoLocation) => void
  ) => {
    if (!permissionGranted) {
      console.warn('Cannot watch location: permission not granted');
      return null;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported');
      return null;
    }

    // Stop any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Store the callback
    if (onLocationChange) {
      onLocationChangeRef.current = onLocationChange;
    }

    console.log('Starting location watch...');

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Calculate distance from current location using ref
        if (locationRef.current) {
          const distance = calculateDistance(locationRef.current, newLocation);
          console.log(`Location update received. Distance moved: ${distance.toFixed(2)} miles`);

          // Only update if movement is significant
          if (distance >= SIGNIFICANT_LOCATION_CHANGE_MILES) {
            console.log(`Significant location change detected (${distance.toFixed(2)} miles)`);
            setLocation(newLocation);

            // Call the callback if provided
            if (onLocationChangeRef.current) {
              onLocationChangeRef.current(newLocation);
            }
          }
        } else {
          // No previous location, just update
          setLocation(newLocation);
          if (onLocationChangeRef.current) {
            onLocationChangeRef.current(newLocation);
          }
        }
      },
      (err) => {
        const errorMessage = getGeolocationErrorMessage(err);
        console.error('Location watch error:', errorMessage);
        setError(errorMessage);
      },
      LOCATION_WATCH_OPTIONS
    );

    watchIdRef.current = watchId;
    console.log(`Location watch started with ID: ${watchId}`);

    // Return cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        console.log(`Stopping location watch ${watchIdRef.current}`);
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        onLocationChangeRef.current = null;
      }
    };
  }, [permissionGranted]);

  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log(`Stopping location watch ${watchIdRef.current}`);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      onLocationChangeRef.current = null;
    }
  }, []);

  return {
    location,
    error,
    loading,
    permissionGranted,
    requestPermission,
    updateLocation,
    startWatchingLocation,
    stopWatchingLocation,
  };
}
