/**
 * Color constants for sighting types
 */

import { SightingType } from '../types/message';

export const SIGHTING_COLORS = {
  ICE: '#ef4444',
  Army: '#10b981',
  Police: '#3b82f6',
} as const;

export const SIGHTING_EMOJIS = {
  ICE: '🚨',
  Army: '🪖',
  Police: '👮',
} as const;

export const SIGHTING_BADGE_CLASSES = {
  ICE: 'bg-red-100 text-red-800 border-red-200',
  Army: 'bg-green-100 text-green-800 border-green-200',
  Police: 'bg-blue-100 text-blue-800 border-blue-200',
} as const;

export function getSightingColor(type: SightingType): string {
  return SIGHTING_COLORS[type] || '#6b7280';
}

export function getSightingEmoji(type: SightingType): string {
  return SIGHTING_EMOJIS[type] || '📍';
}

export function getSightingBadgeClasses(type: SightingType): string {
  return SIGHTING_BADGE_CLASSES[type] || 'bg-gray-100 text-gray-800 border-gray-200';
}
