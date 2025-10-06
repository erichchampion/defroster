'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/contexts/I18nContext';

interface LocationPermissionProps {
  onRequestPermission: () => Promise<{ latitude: number; longitude: number } | null>;
}

export default function LocationPermission({ onRequestPermission }: LocationPermissionProps) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
      setIsIOS(ios);
    }
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await onRequestPermission();

      if (!location) {
        throw new Error('Failed to get location');
      }

      setLoading(false);
      // No need to call callback - parent hook will update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      setLoading(false);
    }
  };

  console.log('LocationPermission render:', { loading, error });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-3xl w-full space-y-6">
        {/* Introductory Story */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t.locationPermission.story.paragraph1}
            </p>
            <p className="text-gray-700 leading-relaxed">
              {t.locationPermission.story.paragraph2.split('{appName}')[0]}
              <strong className="text-blue-700">{t.app.name}</strong>
              {t.locationPermission.story.paragraph2.split('{appName}')[1].split('{openSourceLink}')[0]}
              <a href="https://github.com/erichchampion/defroster" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                {t.locationPermission.story.openSourceText}
              </a>
              {t.locationPermission.story.paragraph2.split('{openSourceLink}')[1]}
            </p>
          </div>
        </div>

        {/* Location Permission Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
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
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.locationPermission.heading}</h2>
            <p className="text-gray-600 mb-4">
              {t.locationPermission.description}
            </p>
            {isIOS && (
              <p className="text-gray-600">
                {t.locationPermission.iosInstructions.split('{locationServicesLink}')[0]}
                <a
                  href={t.locationPermission.locationServicesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.locationPermission.locationServicesText}
                </a>
                {t.locationPermission.iosInstructions.split('{locationServicesLink}')[1].split('{homeScreenLink}')[0]}
                <a
                  href={t.locationPermission.homeScreenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {t.locationPermission.homeScreenText}
                </a>
                {t.locationPermission.iosInstructions.split('{homeScreenLink}')[1]}
              </p>
            )}
          </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleRequestPermission}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? t.locationPermission.buttonLoading : t.locationPermission.buttonEnable}
        </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t.locationPermission.privacyNotice.heading}</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• {t.locationPermission.privacyNotice.locationUsage}</li>
              <li>• {t.locationPermission.privacyNotice.serverDeletion}</li>
              <li>• {t.locationPermission.privacyNotice.localDeletion}</li>
              <li>• {t.locationPermission.privacyNotice.locationRandomization}</li>
              <li>• {t.locationPermission.privacyNotice.noPersonalData}</li>
              <li>• {t.locationPermission.privacyNotice.revokeAccess}</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>{t.locationPermission.knowYourRights.heading}</strong> {t.locationPermission.knowYourRights.description}{' '}
              <a
                href={t.locationPermission.knowYourRights.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {t.locationPermission.knowYourRights.url}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
