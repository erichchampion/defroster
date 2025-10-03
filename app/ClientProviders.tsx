'use client';

import { ReactNode } from 'react';
import { ServicesProvider } from "@/lib/contexts/ServicesContext";
import { I18nProvider } from "@/lib/contexts/I18nContext";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ServicesProvider>
        {children}
      </ServicesProvider>
    </I18nProvider>
  );
}
