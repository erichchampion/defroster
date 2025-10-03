'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Message, GeoLocation, SightingType } from '@/lib/types/message';
import { formatRelativeTimeI18n } from '@/lib/utils/time-formatter-i18n';
import { getSightingColor, getSightingEmoji, getSightingBadgeClasses } from '@/lib/constants/colors';
import { DEFAULT_RADIUS_METERS } from '@/lib/constants/app';
import { useI18n } from '@/lib/contexts/I18nContext';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Calculate opacity based on message age
 * - Newer than 3 days: 100% opacity
 * - 3 days: 90% opacity
 * - 4 days: 80% opacity
 * - 5 days: 70% opacity
 * - 6 days: 60% opacity
 * - 7+ days: 50% opacity
 */
const getOpacityForAge = (timestamp: number): number => {
  const ageInMs = Date.now() - timestamp;
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  if (ageInDays < 3) return 1.0;
  if (ageInDays < 4) return 0.9;
  if (ageInDays < 5) return 0.8;
  if (ageInDays < 6) return 0.7;
  if (ageInDays < 7) return 0.6;
  return 0.5;
};

const getIconForSightingType = (type: SightingType, timestamp: number): L.DivIcon => {
  const color = getSightingColor(type);
  const emoji = getSightingEmoji(type);
  const opacity = getOpacityForAge(timestamp);

  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${opacity};
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 16px;
        ">${emoji}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  return icon;
};

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

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg border-2 border-gray-200">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapRecenter center={center} />

        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Circle showing radius */}
        <Circle
          center={center}
          radius={DEFAULT_RADIUS_METERS}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5',
          }}
        />

        {/* Current location marker */}
        <Marker position={center}>
          <Popup>
            <div className="text-center">
              <strong>{t.sightingMap.yourLocation}</strong>
              <p className="text-xs text-gray-600 mt-1">
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Sighting markers */}
        {messages.map((message) => (
          <Marker
            key={message.id}
            position={[message.location.latitude, message.location.longitude]}
            icon={getIconForSightingType(message.sightingType, message.timestamp)}
          >
            <Popup>
              <div className="min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSightingBadgeClasses(message.sightingType)}`}>
                    {message.sightingType}
                  </span>
                  <span className="text-xs text-gray-500">{formatRelativeTimeI18n(message.timestamp, t)}</span>
                </div>
                <p className="text-xs text-gray-600">
                  {message.location.latitude.toFixed(4)}, {message.location.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
