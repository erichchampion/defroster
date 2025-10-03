export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export type SightingType = 'ICE' | 'Army' | 'Police';

export interface Message {
  id?: string;
  sightingType: SightingType;
  location: GeoLocation;
  timestamp: number;
  geohash: string;
  expiresAt: number;
}

export interface UserDevice {
  deviceId: string;
  token: string;
  geohash: string;
  updatedAt: number;
}
