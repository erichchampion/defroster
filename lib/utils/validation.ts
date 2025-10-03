/**
 * Validation utility functions
 */

import { GeoLocation } from '../types/message';

export function validateLocation(location: unknown): location is GeoLocation {
  if (!location || typeof location !== 'object') return false;

  const loc = location as GeoLocation;

  return (
    typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number' &&
    !isNaN(loc.latitude) &&
    !isNaN(loc.longitude) &&
    isFinite(loc.latitude) &&
    isFinite(loc.longitude) &&
    loc.latitude >= -90 &&
    loc.latitude <= 90 &&
    loc.longitude >= -180 &&
    loc.longitude <= 180
  );
}

export function validateCoordinate(value: number, type: 'latitude' | 'longitude'): boolean {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return false;

  if (type === 'latitude') {
    return value >= -90 && value <= 90;
  } else {
    return value >= -180 && value <= 180;
  }
}

export function validateRadius(radius: unknown): radius is number {
  const MAX_RADIUS_MILES = 100;

  if (typeof radius !== 'number' || isNaN(radius) || !isFinite(radius)) {
    return false;
  }

  return radius > 0 && radius <= MAX_RADIUS_MILES;
}
