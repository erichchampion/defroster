'use client';

import { useState } from 'react';
import { GeoLocation } from '@/lib/types/message';
import { getGeolocationErrorMessage } from '@/lib/utils/geolocation-errors';

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

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
          timeout: 10000,
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
          timeout: 10000,
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

  return {
    location,
    error,
    loading,
    permissionGranted,
    requestPermission,
    updateLocation,
  };
}
