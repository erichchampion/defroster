import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { getDb } from '@/lib/firebase/config';
import { IDataService } from '@/lib/abstractions/data-service';
import { Message, UserDevice, GeoLocation } from '@/lib/types/message';
import { geohashForLocation } from 'geofire-common';
import { MESSAGES_COLLECTION, DEVICES_COLLECTION, GEOHASH_PRECISION_DEVICE } from '@/lib/constants/app';
import { MILES_TO_KM, KM_TO_MILES } from '@/lib/constants/conversions';

export class FirestoreDataService implements IDataService {
  async initialize(): Promise<void> {
    // Firestore is initialized in the config
    console.log('Firestore data service initialized');
  }

  async saveMessage(message: Message): Promise<string> {
    const messageData = {
      ...message,
      timestamp: Timestamp.fromMillis(message.timestamp),
      expiresAt: Timestamp.fromMillis(message.expiresAt),
    };

    const docRef = await addDoc(collection(getDb(), MESSAGES_COLLECTION), messageData);
    return docRef.id;
  }

  async getMessagesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<Message[]> {
    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInKm = radiusMiles * MILES_TO_KM;

    // Calculate geohash query bounds
    const bounds = geohashQueryBounds(center, radiusInKm * 1000); // geofire expects meters
    const promises = [];

    for (const bound of bounds) {
      const q = query(
        collection(getDb(), MESSAGES_COLLECTION),
        where('geohash', '>=', bound[0]),
        where('geohash', '<=', bound[1])
      );
      promises.push(getDocs(q));
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
    const now = Timestamp.now();
    const q = query(
      collection(getDb(), MESSAGES_COLLECTION),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((document) =>
      deleteDoc(doc(getDb(), MESSAGES_COLLECTION, document.id))
    );

    await Promise.all(deletePromises);
    return snapshot.size;
  }

  async registerDevice(device: UserDevice): Promise<void> {
    await setDoc(doc(getDb(), DEVICES_COLLECTION, device.deviceId), {
      deviceId: device.deviceId,
      token: device.token,
      geohash: device.geohash,
      updatedAt: Timestamp.fromMillis(device.updatedAt),
    });
  }

  async getDevicesInRadius(
    location: GeoLocation,
    radiusMiles: number
  ): Promise<UserDevice[]> {
    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInKm = radiusMiles * MILES_TO_KM;

    // Use 7-character geohash precision for device location queries
    const bounds = geohashQueryBounds(center, radiusInKm * 1000);
    const promises = [];

    for (const bound of bounds) {
      const q = query(
        collection(getDb(), DEVICES_COLLECTION),
        where('geohash', '>=', bound[0].substring(0, GEOHASH_PRECISION_DEVICE)),
        where('geohash', '<=', bound[1].substring(0, GEOHASH_PRECISION_DEVICE) + '~')
      );
      promises.push(getDocs(q));
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
    const geohash = geohashForLocation([location.latitude, location.longitude], GEOHASH_PRECISION_DEVICE);
    await setDoc(
      doc(getDb(), DEVICES_COLLECTION, deviceId),
      {
        geohash,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  }

  async removeDevice(deviceId: string): Promise<void> {
    await deleteDoc(doc(getDb(), DEVICES_COLLECTION, deviceId));
  }

  async recordNotification(messageId: string, deviceId: string): Promise<void> {
    const notificationId = `${messageId}_${deviceId}`;
    const expiresAt = Timestamp.fromMillis(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await setDoc(doc(getDb(), 'notifications', notificationId), {
      messageId,
      deviceId,
      sentAt: Timestamp.now(),
      expiresAt,
    });
  }

  async wasDeviceNotified(messageId: string, deviceId: string): Promise<boolean> {
    const notificationId = `${messageId}_${deviceId}`;
    const docRef = doc(getDb(), 'notifications', notificationId);
    const docSnap = await getDoc(docRef);

    return docSnap.exists();
  }

  async getUnnotifiedDevices(messageId: string, devices: UserDevice[]): Promise<UserDevice[]> {
    if (devices.length === 0) return [];

    const notificationChecks = await Promise.all(
      devices.map(async (device) => {
        const wasNotified = await this.wasDeviceNotified(messageId, device.deviceId);
        return { device, wasNotified };
      })
    );

    return notificationChecks
      .filter((check) => !check.wasNotified)
      .map((check) => check.device);
  }

  async getActiveMessages(): Promise<Message[]> {
    const now = Timestamp.now();
    const q = query(
      collection(getDb(), MESSAGES_COLLECTION),
      where('expiresAt', '>', now)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sightingType: data.sightingType,
        location: data.location,
        timestamp: data.timestamp.toMillis(),
        geohash: data.geohash,
        expiresAt: data.expiresAt.toMillis(),
      };
    });
  }

  async deleteExpiredNotifications(): Promise<number> {
    const now = Timestamp.now();
    const q = query(
      collection(getDb(), 'notifications'),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((document) =>
      deleteDoc(doc(getDb(), 'notifications', document.id))
    );

    await Promise.all(deletePromises);
    return snapshot.size;
  }
}
