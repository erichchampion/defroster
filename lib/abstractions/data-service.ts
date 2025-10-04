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

  /**
   * Record that a notification was sent to a device for a message
   */
  recordNotification(messageId: string, deviceId: string): Promise<void>;

  /**
   * Check if a device has already been notified for a message
   */
  wasDeviceNotified(messageId: string, deviceId: string): Promise<boolean>;

  /**
   * Get all devices that have NOT been notified for a specific message
   */
  getUnnotifiedDevices(messageId: string, devices: UserDevice[]): Promise<UserDevice[]>;

  /**
   * Get all active (non-expired) messages
   */
  getActiveMessages(): Promise<Message[]>;

  /**
   * Delete expired notification records
   */
  deleteExpiredNotifications(): Promise<number>;
}
