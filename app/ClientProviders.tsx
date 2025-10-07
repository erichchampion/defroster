'use client';

import { ReactNode } from 'react';
import { ServicesProvider } from "@/lib/contexts/ServicesContext";
import { I18nProvider } from "@/lib/contexts/I18nContext";
import type { Locale } from "@/lib/i18n/i18n";

export function ClientProviders({
  children,
  initialLocale
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ServicesProvider>
        {children}
      </ServicesProvider>
    </I18nProvider>
  );
}
