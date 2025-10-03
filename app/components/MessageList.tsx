'use client';

import { Message } from '@/lib/types/message';
import { formatRelativeTimeI18n } from '@/lib/utils/time-formatter-i18n';
import { getSightingBadgeClasses } from '@/lib/constants/colors';
import { DEFAULT_RADIUS_MILES } from '@/lib/constants/app';
import { useI18n } from '@/lib/contexts/I18nContext';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const { t, formatString } = useI18n();

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <p className="text-gray-500">{t.messageList.noSightings}</p>
        <p className="text-sm text-gray-400 mt-2">{t.messageList.beTheFirst}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div key={message.id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${getSightingBadgeClasses(message.sightingType)}`}>
              {message.sightingType}
            </span>
            <span className="text-xs text-gray-500">{formatRelativeTimeI18n(message.timestamp, t)}</span>
          </div>

          <div className="flex items-start text-sm text-gray-600">
            <svg
              className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div>
              <p className="font-medium">{t.messageList.sightingLocation}</p>
              <p className="text-xs">
                {message.location.latitude.toFixed(4)}, {message.location.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="mt-2 text-xs text-blue-600">
            {formatString(t.messageList.withinRadius, { radius: DEFAULT_RADIUS_MILES })}
          </div>
        </div>
      ))}
    </div>
  );
}
