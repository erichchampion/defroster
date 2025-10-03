import { geohashQueryBounds, distanceBetween, geohashForLocation } from 'geofire-common';
import { adminDb } from '@/lib/firebase/admin';
import { IDataService } from '@/lib/abstractions/data-service';
import { Message, UserDevice, GeoLocation } from '@/lib/types/message';
import { MESSAGES_COLLECTION, DEVICES_COLLECTION } from '@/lib/constants/app';
import { MILES_TO_KM, KM_TO_MILES } from '@/lib/constants/conversions';

/**
 * Firestore Data Service using Firebase Admin SDK
 * Use this server-side (API routes, Cloud Functions) for privileged operations
 */
export class FirestoreAdminDataService implements IDataService {
  async initialize(): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    console.log('Firestore Admin data service initialized');
  }

  async saveMessage(message: Message): Promise<string> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const messageData = {
      ...message,
      timestamp: new Date(message.timestamp),
      expiresAt: new Date(message.expiresAt),
    };

    const docRef = await adminDb.collection(MESSAGES_COLLECTION).add(messageData);
    return docRef.id;
  }

  async getMessagesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<Message[]> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInKm = radiusMiles * MILES_TO_KM;

    // Calculate geohash query bounds
    const bounds = geohashQueryBounds(center, radiusInKm * 1000); // geofire expects meters
    const promises = [];

    for (const bound of bounds) {
      const q = adminDb
        .collection(MESSAGES_COLLECTION)
        .where('geohash', '>=', bound[0])
        .where('geohash', '<=', bound[1]);
      promises.push(q.get());
    }

    // Collect all the query results together into a single list
    const snapshots = await Promise.all(promises);
    const matchingDocs: Message[] = [];

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const data = doc.data();
        const lat = data.location.latitude;
        const lng = data.location.longitude;

        // Calculate distance and filter by radius
        const distanceInKm = distanceBetween([lat, lng], center);
        const distanceInMiles = distanceInKm * KM_TO_MILES;

        if (distanceInMiles <= radiusMiles) {
          matchingDocs.push({
            id: doc.id,
            sightingType: data.sightingType,
            location: data.location,
            timestamp: data.timestamp.toMillis(),
            geohash: data.geohash,
            expiresAt: data.expiresAt.toMillis(),
          });
        }
      }
    }

    return matchingDocs;
  }

  async deleteExpiredMessages(): Promise<number> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const now = new Date();
    const snapshot = await adminDb
      .collection(MESSAGES_COLLECTION)
      .where('expiresAt', '<=', now)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  async registerDevice(device: UserDevice): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    await adminDb.collection(DEVICES_COLLECTION).doc(device.deviceId).set({
      deviceId: device.deviceId,
      token: device.token,
      geohash: device.geohash,
      updatedAt: new Date(device.updatedAt),
    });
  }

  async getDevicesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<UserDevice[]> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInKm = radiusMiles * MILES_TO_KM;

    // Use 7-character geohash precision for device location queries
    const bounds = geohashQueryBounds(center, radiusInKm * 1000);
    const promises = [];

    for (const bound of bounds) {
      const q = adminDb
        .collection(DEVICES_COLLECTION)
        .where('geohash', '>=', bound[0].substring(0, 7))
        .where('geohash', '<=', bound[1].substring(0, 7) + '~');
      promises.push(q.get());
    }

    const snapshots = await Promise.all(promises);
    const matchingDevices: UserDevice[] = [];

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        const data = doc.data();

        matchingDevices.push({
          deviceId: data.deviceId,
          token: data.token,
          geohash: data.geohash,
          updatedAt: data.updatedAt.toMillis(),
        });
      }
    }

    return matchingDevices;
  }

  async updateDeviceLocation(deviceId: string, location: GeoLocation): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    const geohash = geohashForLocation([location.latitude, location.longitude], 7);
    await adminDb.collection(DEVICES_COLLECTION).doc(deviceId).set(
      {
        geohash,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  async removeDevice(deviceId: string): Promise<void> {
    if (!adminDb) {
      throw new Error('Firebase Admin SDK not initialized');
    }

    await adminDb.collection(DEVICES_COLLECTION).doc(deviceId).delete();
  }
}
