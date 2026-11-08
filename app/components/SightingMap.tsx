'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Message, GeoLocation, SightingType } from '@/lib/types/message';
import { formatRelativeTimeI18n } from '@/lib/utils/time-formatter-i18n';
import { getSightingColor, getSightingSigClass } from '@/lib/constants/colors';
import { DEFAULT_RADIUS_METERS, LEAFLET_CDN_BASE, buildCartoTileUrl } from '@/lib/constants/app';
import { useI18n } from '@/lib/contexts/I18nContext';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: `${LEAFLET_CDN_BASE}/images/marker-icon-2x.png`,
  iconUrl: `${LEAFLET_CDN_BASE}/images/marker-icon.png`,
  shadowUrl: `${LEAFLET_CDN_BASE}/images/marker-shadow.png`,
});

// CARTO requires a free basemaps API key since 25 September 2026.
const CARTO_BASEMAPS_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY;
if (!CARTO_BASEMAPS_KEY && process.env.NODE_ENV === 'development') {
  console.warn('Map tiles need NEXT_PUBLIC_CARTO_BASEMAPS_KEY — get a free one at https://carto.com/basemaps/apikey');
}

/**
 * Calculate opacity based on message age
 * - Newer than 3 days: 100% opacity, fading to 50% at 7+ days
 */
const getOpacityForAge = (timestamp: number): number => {
  const ageInDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (ageInDays < 3) return 1.0;
  if (ageInDays < 4) return 0.9;
  if (ageInDays < 5) return 0.8;
  if (ageInDays < 6) return 0.7;
  if (ageInDays < 7) return 0.6;
  return 0.5;
};

/** Teardrop "thaw" pin tinted with the signal color — no emoji. */
const getIconForSightingType = (type: SightingType, timestamp: number): L.DivIcon => {
  const color = getSightingColor(type);
  const opacity = getOpacityForAge(timestamp);
  return L.divIcon({
    className: '',
    html: `<span class="pin" style="--pc:${color};opacity:${opacity}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
};

/** Accent dot with a halo for the user's own location. */
const userIcon = (): L.DivIcon =>
  L.divIcon({
    className: '',
    html: '<span class="you-dot"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

interface MapRecenterProps {
  center: [number, number];
}

function MapRecenter({ center }: MapRecenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface SightingMapProps {
  messages: Message[];
  currentLocation: GeoLocation;
}

export default function SightingMap({ messages, currentLocation }: SightingMapProps) {
  const { t } = useI18n();
  const center: [number, number] = useMemo(
    () => [currentLocation.latitude, currentLocation.longitude],
    [currentLocation]
  );

  // Memoize message markers to avoid recreating icons on every render
  const messageMarkers = useMemo(() => {
    return messages.map((message) => ({
      ...message,
      icon: getIconForSightingType(message.sightingType, message.timestamp),
    }));
  }, [messages]);

  return (
    <div className="leaflet-host">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapRecenter center={center} />

        {/* Calm CARTO Positron basemap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={buildCartoTileUrl(CARTO_BASEMAPS_KEY)}
        />

        {/* Search radius */}
        <Circle
          center={center}
          radius={DEFAULT_RADIUS_METERS}
          pathOptions={{
            color: '#135C46',
            fillColor: '#135C46',
            fillOpacity: 0.06,
            weight: 1.5,
            opacity: 0.5,
            dashArray: '5 6',
          }}
        />

        {/* Current location marker */}
        <Marker position={center} icon={userIcon()} zIndexOffset={1000}>
          <Popup>
            <div className="text-center">
              <strong>{t.mainApp.yourLocation}</strong>
            </div>
          </Popup>
        </Marker>

        {/* Sighting markers */}
        {messageMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.location.latitude, marker.location.longitude]}
            icon={marker.icon}
          >
            <Popup>
              <div className={getSightingSigClass(marker.sightingType)} style={{ minWidth: 150 }}>
                <span className="sig-label"><span className="sig-dot" />{t.report.types[marker.sightingType].label}</span>
                <p className="mono" style={{ marginTop: 6, color: '#5A5048', fontSize: 12 }}>
                  {formatRelativeTimeI18n(marker.timestamp, t)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
