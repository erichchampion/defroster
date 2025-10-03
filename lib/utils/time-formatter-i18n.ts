import { TranslationKeys } from '@/lib/i18n/i18n';

/**
 * Format relative time with i18n support
 */
export function formatRelativeTimeI18n(timestamp: number, t: TranslationKeys): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);

  if (diffMinutes < 1) {
    return t.time.justNow;
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t.time.minuteAgo.replace('{count}', '1')
      : t.time.minutesAgo.replace('{count}', String(diffMinutes));
  }

  if (diffHours < 24) {
    return diffHours === 1
      ? t.time.hourAgo.replace('{count}', '1')
      : t.time.hoursAgo.replace('{count}', String(diffHours));
  }

  if (diffDays < 7) {
    return diffDays === 1
      ? t.time.dayAgo.replace('{count}', '1')
      : t.time.daysAgo.replace('{count}', String(diffDays));
  }

  return diffWeeks === 1
    ? t.time.weekAgo.replace('{count}', '1')
    : t.time.weeksAgo.replace('{count}', String(diffWeeks));
}
