import { GeoLocation } from '@/lib/types/message';
import { METERS_TO_MILES } from '@/lib/constants/conversions';

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param location1 First location
 * @param location2 Second location
 * @returns Distance in miles
 */
export function calculateDistance(location1: GeoLocation, location2: GeoLocation): number {
  const R = 6371000; // Earth's radius in meters

  const lat1Rad = (location1.latitude * Math.PI) / 180;
  const lat2Rad = (location2.latitude * Math.PI) / 180;
  const deltaLatRad = ((location2.latitude - location1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((location2.longitude - location1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) *
      Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceMeters = R * c;
  const distanceMiles = distanceMeters * METERS_TO_MILES;

  return distanceMiles;
}
