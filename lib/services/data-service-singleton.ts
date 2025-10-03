/**
 * Singleton instance of the data service
 * This ensures we only create one instance across the application
 *
 * Server-side (API routes): Uses Firebase Admin SDK for privileged operations
 * Client-side: Uses Firebase Client SDK with security rules
 */

import { FirestoreDataService } from './firestore-data-service';
import { FirestoreAdminDataService } from './firestore-admin-data-service';
import { IDataService } from '../abstractions/data-service';

let dataServiceInstance: IDataService | null = null;

export function getDataService(): IDataService {
  if (!dataServiceInstance) {
    // Use Admin SDK on server-side (API routes), Client SDK on client-side
    const isServer = typeof window === 'undefined';
    dataServiceInstance = isServer
      ? new FirestoreAdminDataService()
      : new FirestoreDataService();
  }
  return dataServiceInstance;
}

/**
 * Reset the singleton instance (for testing only)
 */
export function resetDataService(): void {
  dataServiceInstance = null;
}

/**
 * Set a custom data service instance (for testing only)
 */
export function setDataService(service: IDataService): void {
  dataServiceInstance = service;
}
