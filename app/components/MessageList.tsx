'use client';

import { Message, GeoLocation } from '@/lib/types/message';
import { formatRelativeTimeI18n } from '@/lib/utils/time-formatter-i18n';
import { getSightingSigClass } from '@/lib/constants/colors';
import { calculateDistance } from '@/lib/utils/distance';
import { useI18n } from '@/lib/contexts/I18nContext';
import { Pin, ShieldCheck } from './Icons';

const getOpacityForAge = (timestamp: number): number => {
  const ageInDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (ageInDays < 3) return 1.0;
  if (ageInDays < 4) return 0.9;
  if (ageInDays < 5) return 0.8;
  if (ageInDays < 6) return 0.7;
  if (ageInDays < 7) return 0.6;
  return 0.5;
};

interface MessageListProps {
  messages: Message[];
  currentLocation?: GeoLocation;
}

export default function MessageList({ messages, currentLocation }: MessageListProps) {
  const { t } = useI18n();

  if (messages.length === 0) {
    return (
      <div className="empty">
        <div className="empty-mark"><ShieldCheck size={34} /></div>
        <p className="empty-title">{t.mainApp.empty}</p>
        <p className="empty-sub">{t.mainApp.emptySub}</p>
      </div>
    );
  }

  return (
    <ul className="nearby">
      {messages.map((message) => {
        const miles = currentLocation ? calculateDistance(currentLocation, message.location) : null;
        return (
          <li
            key={message.id}
            className={'nearby-card ' + getSightingSigClass(message.sightingType)}
            style={{ opacity: getOpacityForAge(message.timestamp) }}
          >
            <span className="nearby-rail" />
            <div className="nearby-body">
              <div className="nearby-top">
                <span className="sig-label"><span className="sig-dot" />{t.report.types[message.sightingType].label}</span>
                <span className="nearby-time">{formatRelativeTimeI18n(message.timestamp, t)}</span>
              </div>
              <p className="nearby-meta">
                <Pin size={16} /> {t.mainApp.sightingAt}
                {miles !== null && <> · <span className="mono">{miles.toFixed(1)} mi</span></>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
