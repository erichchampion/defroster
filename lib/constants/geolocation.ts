/**
 * Geolocation API configuration constants
 */

import { GEOLOCATION_TIMEOUT_MS } from './time';

/**
 * Standard geolocation options for getCurrentPosition
 * Used for both initial permission request and location updates
 */
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: GEOLOCATION_TIMEOUT_MS,
  maximumAge: 0,
};
