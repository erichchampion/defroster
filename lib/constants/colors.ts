/**
 * Color constants for sighting types ("Thaw" design system)
 *
 * Signal colors are AA-contrast against white and color-blind-distinguishable
 * **when paired with the text label**. The UI always shows the label
 * (the `.sig-label` pill), never color alone.
 */

import { SightingType } from '../types/message';

/** Hex values used to tint map markers / dots. Mirrors --ice / --army / --police. */
export const SIGHTING_COLORS = {
  ICE: '#CF1F33',
  Army: '#B26B07',
  Police: '#2D54C8',
} as const;

/**
 * Semantic class that sets the --sig / --sig-tint / --sig-ink custom properties
 * (defined in globals.css) for a given sighting type. Apply it to a container,
 * then render the `.sig-label` pill (and optional `.sig-dot`) inside.
 */
export const SIGHTING_SIG_CLASSES = {
  ICE: 'sig-ice',
  Army: 'sig-army',
  Police: 'sig-police',
} as const;

export function getSightingColor(type: SightingType): string {
  return SIGHTING_COLORS[type] || '#6b7280';
}

/**
 * Returns the `sig-*` helper class for a sighting type. Callers add this class
 * to a wrapper and use `.sig-label` / `.nearby-rail` / `.legend-dot` etc.
 */
export function getSightingSigClass(type: SightingType): string {
  return SIGHTING_SIG_CLASSES[type] || '';
}
