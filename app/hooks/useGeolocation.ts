'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GeoLocation } from '@/lib/types/message';
import { getGeolocationErrorMessage } from '@/lib/utils/geolocation-errors';
import { GEOLOCATION_TIMEOUT_MS } from '@/lib/constants/time';
import { LOCATION_WATCH_OPTIONS, SIGNIFICANT_LOCATION_CHANGE_MILES } from '@/lib/constants/app';
import { calculateDistance } from '@/lib/utils/distance';

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const onLocationChangeRef = useRef<((newLocation: GeoLocation) => void) | null>(null);
  const locationRef = useRef<GeoLocation | null>(null);

  // Keep locationRef in sync with location state
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const requestPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: 0,
        });
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
      const errorMessage =
        err instanceof GeolocationPositionError
          ? getGeolocationErrorMessage(err)
          : err instanceof Error
          ? err.message
          : 'Failed to get location';

      setError(errorMessage);
      setLoading(false);
      return null;
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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT_MS,
          maximumAge: 0,
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setLocation(newLocation);
      setLoading(false);

      return newLocation;
    } catch (err) {
      const errorMessage =
        err instanceof GeolocationPositionError
          ? getGeolocationErrorMessage(err)
          : err instanceof Error
          ? err.message
          : 'Failed to update location';

      setError(errorMessage);
      setLoading(false);
      return null;
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
