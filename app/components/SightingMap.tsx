'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { Message, GeoLocation, SightingType } from '@/lib/types/message';
import { formatRelativeTimeI18n } from '@/lib/utils/time-formatter-i18n';
import { getSightingColor, getSightingSigClass } from '@/lib/constants/colors';
import { DEFAULT_RADIUS_METERS, buildCartoVectorStyleUrl } from '@/lib/constants/app';
import { useI18n } from '@/lib/contexts/I18nContext';
import 'maplibre-gl/dist/maplibre-gl.css';

type Translations = ReturnType<typeof useI18n>['t'];

// CARTO requires a free basemaps API key since 25 September 2026.
const CARTO_BASEMAPS_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY;
if (!CARTO_BASEMAPS_KEY && process.env.NODE_ENV === 'development') {
  console.warn('Map tiles need NEXT_PUBLIC_CARTO_BASEMAPS_KEY — get a free one at https://carto.com/basemaps/apikey');
}

const MAP_ZOOM = 13;
const CIRCLE_STEPS = 64;
const RADIUS_COLOR = '#135C46';

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
const createSightingMarkerElement = (type: SightingType, timestamp: number): HTMLElement => {
  const el = document.createElement('span');
  el.className = 'pin';
  el.style.setProperty('--pc', getSightingColor(type));
  el.style.opacity = String(getOpacityForAge(timestamp));
  return el;
};

/** Accent dot with a halo for the user's own location. */
const createUserMarkerElement = (): HTMLElement => {
  const el = document.createElement('span');
  el.className = 'you-dot';
  return el;
};

const createYourLocationContent = (label: string): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';
  const strong = document.createElement('strong');
  strong.textContent = label;
  wrapper.appendChild(strong);
  return wrapper;
};

const createSightingPopupContent = (message: Message, t: Translations): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = getSightingSigClass(message.sightingType);
  wrapper.style.minWidth = '150px';

  const label = document.createElement('span');
  label.className = 'sig-label';
  const dot = document.createElement('span');
  dot.className = 'sig-dot';
  label.appendChild(dot);
  label.appendChild(document.createTextNode(t.report.types[message.sightingType].label));

  const time = document.createElement('p');
  time.className = 'mono';
  time.style.marginTop = '6px';
  time.style.color = '#5A5048';
  time.style.fontSize = '12px';
  time.textContent = formatRelativeTimeI18n(message.timestamp, t);

  wrapper.append(label, time);
  return wrapper;
};

/**
 * Approximate a radius circle as a GeoJSON polygon.
 * Equirectangular projection is fine at city scale (a few miles).
 */
const createCirclePolygon = (center: [number, number], radiusMeters: number): FeatureCollection => {
  const [lng, lat] = center;
  const latRad = (lat * Math.PI) / 180;
  const ring: Array<[number, number]> = [];

  for (let i = 0; i <= CIRCLE_STEPS; i += 1) {
    const theta = (i / CIRCLE_STEPS) * 2 * Math.PI;
    const dLng = (radiusMeters * Math.cos(theta)) / (111_320 * Math.cos(latRad));
    const dLat = (radiusMeters * Math.sin(theta)) / 110_540;
    ring.push([lng + dLng, lat + dLat]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };
};

interface SightingMapProps {
  messages: Message[];
  currentLocation: GeoLocation;
}

export default function SightingMap({ messages, currentLocation }: SightingMapProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const sightingMarkersRef = useRef<maplibregl.Marker[]>([]);
  const circleSourceRef = useRef<maplibregl.GeoJSONSource | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // MapLibre uses [longitude, latitude] order
  const center: [number, number] = useMemo(
    () => [currentLocation.longitude, currentLocation.latitude],
    [currentLocation]
  );

  // Create the map once; recentering and marker updates are handled below.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const map = new maplibregl.Map({
      container,
      style: buildCartoVectorStyleUrl(CARTO_BASEMAPS_KEY),
      center,
      zoom: MAP_ZOOM,
      attributionControl: {
        customAttribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    });
    mapRef.current = map;

    map.on('load', () => {
      // Parity with the previous Leaflet config: avoid hijacking page scroll
      map.scrollZoom.disable();

      map.addSource('search-radius', {
        type: 'geojson',
        data: createCirclePolygon(center, DEFAULT_RADIUS_METERS),
      });
      map.addLayer({
        id: 'search-radius-fill',
        type: 'fill',
        source: 'search-radius',
        paint: { 'fill-color': RADIUS_COLOR, 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'search-radius-outline',
        type: 'line',
        source: 'search-radius',
        paint: {
          'line-color': RADIUS_COLOR,
          'line-width': 1.5,
          'line-opacity': 0.5,
          'line-dasharray': [5, 6],
        },
      });
      circleSourceRef.current = map.getSource('search-radius') as maplibregl.GeoJSONSource;

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      circleSourceRef.current = null;
      userMarkerRef.current = null;
      sightingMarkersRef.current = [];
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; center changes handled by the recenter effect
  }, []);

  // Keep the user marker (and its popup) in sync with the i18n locale
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return undefined;

    const marker = new maplibregl.Marker({ element: createUserMarkerElement() })
      .setLngLat(center)
      .setPopup(
        new maplibregl.Popup({ offset: 18 }).setDOMContent(createYourLocationContent(t.mainApp.yourLocation))
      )
      .addTo(map);
    userMarkerRef.current = marker;

    return () => {
      marker.remove();
      if (userMarkerRef.current === marker) userMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- position updates handled by the recenter effect
  }, [mapReady, t]);

  // Sighting markers are rebuilt when the message set or locale changes
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return undefined;

    const markers = messages.map((message) =>
      new maplibregl.Marker({
        element: createSightingMarkerElement(message.sightingType, message.timestamp),
        anchor: 'bottom',
      })
        .setLngLat([message.location.longitude, message.location.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 24 }).setDOMContent(createSightingPopupContent(message, t))
        )
        .addTo(map)
    );
    sightingMarkersRef.current = markers;

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [mapReady, messages, t]);

  // Recentre the view, user marker, and search radius when the location changes
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    map.jumpTo({ center });
    userMarkerRef.current?.setLngLat(center);
    circleSourceRef.current?.setData(createCirclePolygon(center, DEFAULT_RADIUS_METERS));
  }, [mapReady, center]);

  return <div className="map-host" ref={containerRef} />;
}
