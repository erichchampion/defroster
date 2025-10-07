import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';
export type Locale = 'en-us' | 'es-us';

export type TranslationKeys = typeof en;

const translations: Record<Language, TranslationKeys> = {
  en,
  es: es as TranslationKeys,
};

/**
 * Get the browser's default language, falling back to English
 */
export function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const browserLang = navigator.language.toLowerCase();

  // Check if the browser language starts with 'es' (Spanish)
  if (browserLang.startsWith('es')) {
    return 'es';
  }

  // Default to English
  return 'en';
}

/**
 * Convert locale to language code
 */
export function localeToLanguage(locale: Locale): Language {
  return locale.split('-')[0] as Language;
}

/**
 * Convert language to locale
 */
export function languageToLocale(language: Language): Locale {
  return `${language}-us` as Locale;
}

/**
 * Get translations for a specific language
 */
export function getTranslations(language: Language = 'en'): TranslationKeys {
  return translations[language] || translations.en;
}

/**
 * Get translations for a specific locale
 */
export function getTranslationsByLocale(locale: Locale): TranslationKeys {
  return getTranslations(localeToLanguage(locale));
}

/**
 * Replace placeholders in a string with values
 * Example: formatString("Hello {name}", { name: "World" }) => "Hello World"
 */
export function formatString(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * Get a nested translation value from a dot-notation path
 * Example: getValue(translations, "app.name") => "Defroster"
 */
export function getValue<T>(obj: T, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return the path if not found
    }
  }

  return typeof result === 'string' ? result : path;
}

/**
 * Supported locales
 */
export const locales: Locale[] = ['en-us', 'es-us'];
export const defaultLocale: Locale = 'en-us';
