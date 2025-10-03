'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { FCMMessagingService } from '@/lib/services/fcm-messaging-service';
import { IndexedDBStorageService } from '@/lib/services/indexeddb-storage-service';

export interface ServicesContextValue {
  messagingService: FCMMessagingService;
  storageService: IndexedDBStorageService;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

interface ServicesProviderProps {
  children: ReactNode;
  messagingService?: FCMMessagingService;
  storageService?: IndexedDBStorageService;
}

export function ServicesProvider({
  children,
  messagingService,
  storageService
}: ServicesProviderProps) {
  // Use provided services (for testing) or create new ones (for production)
  // Memoize to avoid recreating services on every render
  const services: ServicesContextValue = useMemo(() => ({
    messagingService: messagingService || new FCMMessagingService(),
    storageService: storageService || new IndexedDBStorageService(),
  }), [messagingService, storageService]);

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return context;
}
