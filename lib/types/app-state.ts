export interface AppState {
  // Geolocation state
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  locationPermissionGranted: boolean;

  // Messaging state
  notificationPermissionGranted: boolean;
  deviceRegistered: boolean;
  lastDeviceRegistrationTime: number;

  // App readiness
  appInitialized: boolean;
  lastActiveTimestamp: number;

  // Metadata
  updatedAt?: number;
}
