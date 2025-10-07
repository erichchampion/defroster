'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Locale, TranslationKeys, getBrowserLanguage, getTranslations, localeToLanguage, formatString } from '@/lib/i18n/i18n';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  formatString: (template: string, values: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  initialLocale
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  // Initialize with the locale from the server if provided, otherwise default to 'en'
  const initialLanguage = initialLocale ? localeToLanguage(initialLocale) : 'en';
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [translations, setTranslations] = useState<TranslationKeys>(getTranslations(initialLanguage));

  // Only initialize from browser if no initial locale was provided
  useEffect(() => {
    if (!initialLocale) {
      const browserLang = getBrowserLanguage();
      setLanguageState(browserLang);
      setTranslations(getTranslations(browserLang));
    }
  }, [initialLocale]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setTranslations(getTranslations(lang));
    // Store preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('defroster-language', lang);
    }
  };

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defroster-language') as Language | null;
      if (stored && (stored === 'en' || stored === 'es')) {
        setLanguageState(stored);
        setTranslations(getTranslations(stored));
      }
    }
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations, formatString }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
