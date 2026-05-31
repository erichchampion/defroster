'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from '@/app/hooks/useGeolocation';
import { useMessaging } from '@/app/hooks/useMessaging';
import { useServices } from '@/lib/contexts/ServicesContext';
import dynamic from 'next/dynamic';
import LocationPermission from '@/app/components/LocationPermission';
import MessageList from '@/app/components/MessageList';
import ImmigrationGuide from '@/app/components/ImmigrationGuide';
import ReportSheet from '@/app/components/ReportSheet';
import TopBar from '@/app/components/TopBar';
import Footer from '@/app/components/Footer';
import { Bell, ChevRight, List, MapIcon, Plus, Scale, X } from '@/app/components/Icons';
import { GeoLocation, SightingType } from '@/lib/types/message';
import { getSightingSigClass } from '@/lib/constants/colors';
import { registerServiceWorker } from '@/lib/utils/register-sw';
import { useI18n } from '@/lib/contexts/I18nContext';
import { handleStateSaveError } from '@/lib/utils/error-handling';
import type { Screen } from '@/lib/types/navigation';
import {
  MESSAGE_REFRESH_INTERVAL_MS,
  CLEANUP_INTERVAL_MS,
  OLD_MESSAGE_CLEANUP_INTERVAL_MS
} from '@/lib/constants/time';

// Dynamically import the map component to avoid SSR issues with Leaflet
const SightingMap = dynamic(() => import('@/app/components/SightingMap'), {
  ssr: false,
});

const TYPE_ORDER: SightingType[] = ['ICE', 'Army', 'Police'];

export default function Home() {
  const { t } = useI18n();
  const { storageService } = useServices();
  const {
    location,
    permissionGranted,
    requestPermission: requestLocationPermission,
    startWatchingLocation
  } = useGeolocation();
  const {
    token,
    deviceId,
    permission,
    messages,
    isOffline,
    requestPermission,
    registerDevice,
    updateDeviceLocation,
    sendMessage,
    getMessages,
    setupMessageListener,
    cleanupExpiredMessages,
    cleanupOldMessages,
  } = useMessaging();

  const [isReady, setIsReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // UI state (presentation only)
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [view, setView] = useState<'map' | 'list'>('map');
  const [reportOpen, setReportOpen] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState(false);

  const go = useCallback((next: Screen) => {
    setScreen(next);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, []);

  // Detect if running as standalone PWA and if on iOS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as Window['navigator'] & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);

      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
      setIsIOS(ios);
    }
  }, []);

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // When location becomes available, set up the app
  useEffect(() => {
    if (permissionGranted && location && !isReady) {
      console.log('Location available, setting up app...');

      const setup = async () => {
        // Load initial messages
        await getMessages(location);

        // Automatically request notification permission if not already granted
        if (permission !== 'granted') {
          const fcmToken = await requestPermission();
          if (fcmToken && deviceId) {
            await registerDevice(location, fcmToken, deviceId);
          }
        } else if (permission === 'granted' && !token) {
          // Permission granted but no token - try to get it
          const fcmToken = await requestPermission();
          if (fcmToken && deviceId) {
            await registerDevice(location, fcmToken, deviceId);
          }
        }

        setIsReady(true);
      };

      setup();
    }
  }, [permissionGranted, location, isReady, permission, token, deviceId, requestPermission, registerDevice, getMessages]);

  // Once ready, move from onboarding to the main app.
  useEffect(() => {
    if (isReady && permissionGranted && location && screen === 'onboarding') {
      setScreen('app');
    }
  }, [isReady, permissionGranted, location, screen]);

  // Set up message listener
  useEffect(() => {
    if (isReady) {
      const cleanup = setupMessageListener();
      return cleanup;
    }
  }, [isReady, setupMessageListener]);

  // Cleanup local IndexedDB storage (Firestore cleanup now handled by Cloud Functions)
  useEffect(() => {
    if (isReady) {
      // Cleanup local IndexedDB storage periodically
      const localCleanupInterval = setInterval(() => {
        cleanupExpiredMessages();
      }, CLEANUP_INTERVAL_MS);

      // Cleanup old messages (older than 1 week) daily
      const oldMessageCleanupInterval = setInterval(() => {
        cleanupOldMessages();
      }, OLD_MESSAGE_CLEANUP_INTERVAL_MS);

      // Initial cleanup - both expired and old messages
      cleanupExpiredMessages();
      cleanupOldMessages();

      return () => {
        clearInterval(localCleanupInterval);
        clearInterval(oldMessageCleanupInterval);
      };
    }
  }, [isReady, cleanupExpiredMessages, cleanupOldMessages]);

  // Handle sending messages
  const handleSendMessage = async (
    sightingType: SightingType,
    sightingLocation: GeoLocation
  ) => {
    if (!location) return;

    await sendMessage(sightingType, sightingLocation, location);

    // Refresh messages
    await getMessages(location);
  };

  // Combined visibility change handler
  const handleVisibilityChange = useCallback(async () => {
    if (!document.hidden && isReady) {
      // Update timestamp
      await storageService.saveAppState({
        lastActiveTimestamp: Date.now(),
      }).catch(handleStateSaveError('update last active timestamp'));

      // Refresh messages
      if (location) {
        await getMessages(location);
      }
    }
  }, [isReady, location, getMessages, storageService]);

  // Refresh messages periodically and on visibility change
  useEffect(() => {
    if (!isReady || !location) return;

    const refreshMessages = () => {
      if (!document.hidden) {
        getMessages(location);
      }
    };

    const interval = setInterval(refreshMessages, MESSAGE_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isReady, location, getMessages, handleVisibilityChange]);

  // Watch for location changes in the background
  useEffect(() => {
    if (isReady && permissionGranted) {
      console.log('Setting up background location monitoring...');

      const cleanup = startWatchingLocation(async (newLocation) => {
        console.log('Location changed significantly, updating app state...');

        // Update device registration with new location
        if (token && deviceId) {
          await updateDeviceLocation(newLocation);
        }

        // Refresh messages for new location
        await getMessages(newLocation);
      });

      return cleanup || undefined;
    }
  }, [isReady, permissionGranted, token, deviceId, startWatchingLocation, updateDeviceLocation, getMessages]);

  // Save app readiness state to IndexedDB
  useEffect(() => {
    if (isReady) {
      storageService.saveAppState({
        appInitialized: true,
        lastActiveTimestamp: Date.now(),
      }).catch(handleStateSaveError('save app readiness state'));
    }
  }, [isReady, storageService]);

  // Page lifecycle event handlers (Phase 4)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageShow = async (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache (Back-Forward Cache)
        console.log('Page restored from bfcache, refreshing state...');

        // Refresh location if permission granted
        if (permissionGranted && location) {
          await getMessages(location);
        }
      }
    };

    const handlePageHide = async () => {
      // Save state before page might be terminated
      await storageService.saveAppState({
        lastActiveTimestamp: Date.now(),
      }).catch(handleStateSaveError('save state on page hide'));
    };

    const handleFreeze = () => {
      console.log('Page frozen by browser');
    };

    const handleResume = () => {
      console.log('Page resumed from frozen state');
      // Refresh data when resuming
      if (permissionGranted && location) {
        getMessages(location);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('freeze', handleFreeze);
    document.addEventListener('resume', handleResume);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('freeze', handleFreeze);
      document.removeEventListener('resume', handleResume);
    };
  }, [permissionGranted, location, getMessages, storageService]);

  const enableNotifications = async () => {
    const fcmToken = await requestPermission();
    if (fcmToken && location && deviceId) {
      await registerDevice(location, fcmToken, deviceId);
    }
  };

  const showOnboarding = !permissionGranted || !location;
  const effectiveScreen: Screen = screen === 'guide' ? 'guide' : showOnboarding ? 'onboarding' : 'app';
  const notificationsActive = permission === 'granted' && !!token;
  // In-app banner: prompt to enable notifications when possible (iOS needs install first).
  const showNotifBanner = !notifDismissed && permission !== 'granted' && (!isIOS || isStandalone);

  return (
    <div className="df-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <TopBar screen={effectiveScreen} go={go} />

      <div id="main">
        {screen === 'guide' ? (
          <ImmigrationGuide onBack={() => go(showOnboarding ? 'onboarding' : 'app')} />
        ) : showOnboarding ? (
          <LocationPermission
            onRequestPermission={requestLocationPermission}
            onOpenGuide={() => go('guide')}
          />
        ) : !isReady ? (
          <div className="loading-screen">
            <div className="text-center">
              <div className="spinner" />
              <p style={{ color: 'var(--ink-2)' }}>{t.main.loadingMessage}</p>
            </div>
          </div>
        ) : (
          <main className="app">
            <div className="wrap app-head">
              <div className="app-head-l">
                <h1 className="app-title">{t.mainApp.nearbyTitle}</h1>
                <div className="app-status">
                  {isOffline ? (
                    <span className="chip chip-warn">{t.mainApp.statusOffline}</span>
                  ) : notificationsActive ? (
                    <span className="chip chip-ok"><span className="live-dot" /> {t.mainApp.statusOn}</span>
                  ) : null}
                  <span className="app-radius">{t.mainApp.radiusNote}</span>
                </div>
              </div>
              <button className="btn btn-primary report-cta-top" onClick={() => setReportOpen(true)}>
                <Plus size={22} /> {t.mainApp.reportCta}
              </button>
            </div>

            {showNotifBanner && (
              <div className="wrap">
                <div className="notif-banner">
                  <span className="notif-ico"><Bell size={22} /></span>
                  <div className="notif-copy">
                    <p className="notif-title">{t.mainApp.enableNotif}</p>
                    <p className="notif-why">{t.mainApp.notifWhy}</p>
                  </div>
                  <button className="btn btn-ghost notif-btn" onClick={enableNotifications}>
                    {t.mainApp.enableNotif}
                  </button>
                  <button className="icon-btn" aria-label={t.report.cancel} onClick={() => setNotifDismissed(true)}>
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Mobile view toggle */}
            <div className="wrap mob-toggle-wrap">
              <div className="seg seg-wide mob-toggle">
                <button className={'seg-btn' + (view === 'map' ? ' is-on' : '')} onClick={() => setView('map')}>
                  <MapIcon size={18} /> {t.mainApp.mapTab}
                </button>
                <button className={'seg-btn' + (view === 'list' ? ' is-on' : '')} onClick={() => setView('list')}>
                  <List size={18} /> {t.mainApp.listTab}
                </button>
              </div>
            </div>

            <div className="wrap app-grid">
              <section className={'app-map-col' + (view === 'list' ? ' mob-hide' : '')}>
                <div className="map-card card">
                  <SightingMap messages={messages} currentLocation={location} />
                </div>
                <div className="legend">
                  {TYPE_ORDER.map((k) => (
                    <span key={k} className={'legend-item ' + getSightingSigClass(k)}>
                      <span className="legend-dot" /> {t.report.types[k].label}
                    </span>
                  ))}
                </div>
              </section>

              <aside className={'app-side' + (view === 'map' ? ' mob-hide' : '')}>
                <div className="side-head">
                  <h2 className="side-title">{t.mainApp.nearbyTitle}</h2>
                  <span className="side-count">{messages.length}</span>
                </div>
                <MessageList messages={messages} currentLocation={location} />

                <button className="rights-card" onClick={() => go('guide')}>
                  <span className="rights-ico"><Scale size={26} /></span>
                  <span className="rights-text">
                    <span className="rights-title">{t.mainApp.rightsCardTitle}</span>
                    <span className="rights-sub">{t.mainApp.rightsCardSub}</span>
                  </span>
                  <span className="rights-cta"><ChevRight size={22} /></span>
                </button>
              </aside>
            </div>

            {/* Mobile sticky report */}
            <div className="report-dock">
              <button className="btn btn-primary btn-lg btn-block" onClick={() => setReportOpen(true)}>
                <Plus size={22} /> {t.mainApp.reportCta}
              </button>
            </div>
          </main>
        )}
      </div>

      <Footer />

      {reportOpen && location && (
        <ReportSheet
          onSendMessage={handleSendMessage}
          currentLocation={location}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
