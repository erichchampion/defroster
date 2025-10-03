/**
 * Singleton instance of the data service
 * This ensures we only create one instance across the application
 */

import { FirestoreDataService } from './firestore-data-service';
import { IDataService } from '../abstractions/data-service';

let dataServiceInstance: IDataService | null = null;

export function getDataService(): IDataService {
  if (!dataServiceInstance) {
    dataServiceInstance = new FirestoreDataService();
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
