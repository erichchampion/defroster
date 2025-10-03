'use client';

import { useState } from 'react';
import { GeoLocation, SightingType } from '@/lib/types/message';
import { useI18n } from '@/lib/contexts/I18nContext';

interface MessageFormProps {
  onSendMessage: (
    sightingType: SightingType,
    location: GeoLocation
  ) => Promise<void>;
  currentLocation: GeoLocation;
}

export default function MessageForm({ onSendMessage, currentLocation }: MessageFormProps) {
  const { t } = useI18n();
  const [sightingType, setSightingType] = useState<SightingType>('ICE');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      await onSendMessage(sightingType, currentLocation);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.messageForm.heading}</h3>
          <div className="space-y-3">
            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="sightingType"
                value="ICE"
                checked={sightingType === 'ICE'}
                onChange={(e) => setSightingType(e.target.value as SightingType)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium">{t.messageForm.sightingTypes.ice}</span>
            </label>

            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="sightingType"
                value="Army"
                checked={sightingType === 'Army'}
                onChange={(e) => setSightingType(e.target.value as SightingType)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium">{t.messageForm.sightingTypes.army}</span>
            </label>

            <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="sightingType"
                value="Police"
                checked={sightingType === 'Police'}
                onChange={(e) => setSightingType(e.target.value as SightingType)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium">{t.messageForm.sightingTypes.police}</span>
            </label>
          </div>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0"
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
            <div className="text-sm">
              <p className="font-medium text-blue-900">{t.messageForm.currentLocationLabel}</p>
              <p className="text-blue-700 text-xs">
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? t.messageForm.submitButtonLoading : t.messageForm.submitButton}
        </button>
      </form>
    </div>
  );
}
