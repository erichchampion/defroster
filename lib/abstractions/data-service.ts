import { Message, UserDevice, GeoLocation } from '@/lib/types/message';

/**
 * Abstraction layer for data storage services
 * Allows easy switching between Firestore, MongoDB, PostgreSQL+PostGIS, etc.
 */
export interface IDataService {
  /**
   * Initialize the data service
   */
  initialize(): Promise<void>;

  /**
   * Save a message to the database
   */
  saveMessage(message: Message): Promise<string>;

  /**
   * Get messages within a radius (in miles) of a location
   */
  getMessagesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<Message[]>;

  /**
   * Delete messages that have expired
   */
  deleteExpiredMessages(): Promise<number>;

  /**
   * Register a user device with location
   */
  registerDevice(device: UserDevice): Promise<void>;

  /**
   * Get all devices within a radius (in miles) of a location
   */
  getDevicesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<UserDevice[]>;

  /**
   * Update device location
   */
  updateDeviceLocation(deviceId: string, location: GeoLocation): Promise<void>;

  /**
   * Remove a device
   */
  removeDevice(deviceId: string): Promise<void>;
}
