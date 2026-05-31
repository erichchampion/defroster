'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/lib/contexts/I18nContext';
import { languageToLocale, type Language, type Locale } from '@/lib/i18n/i18n';
import { useTextScale, TEXT_SCALE_STEPS } from '@/app/hooks/useTextScale';
import type { Screen } from '@/lib/types/navigation';

interface TopBarProps {
  screen: Screen;
  go: (screen: Screen) => void;
}

function LangToggle() {
  const { language, setLanguage } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang); // instant client feedback
    // Navigate to the locale URL so SSR locale / <html lang> / metadata match.
    const nextLocale: Locale = languageToLocale(lang);
    const segments = (pathname || '/').split('/');
    // segments[0] is '' (leading slash); segments[1] is the locale segment.
    if (segments.length > 1) {
      segments[1] = nextLocale;
    }
    router.push(segments.join('/') || `/${nextLocale}`);
  };

  return (
    <div className="seg" role="group" aria-label="Language">
      {(['en', 'es'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={'seg-btn' + (language === l ? ' is-on' : '')}
          aria-pressed={language === l}
          onClick={() => switchTo(l)}
        >
          {l === 'en' ? 'EN' : 'ES'}
        </button>
      ))}
    </div>
  );
}

function TextSize() {
  const { scale, setScale } = useTextScale();
  const steps = TEXT_SCALE_STEPS;
  const idx = steps.indexOf(scale as (typeof steps)[number]);
  const i = idx === -1 ? 0 : idx;

  return (
    <div className="seg" role="group" aria-label="Text size">
      <button
        type="button"
        className="seg-btn"
        aria-label="Smaller text"
        disabled={i === 0}
        onClick={() => setScale(steps[Math.max(0, i - 1)])}
        style={{ fontSize: '.82rem' }}
      >
        A−
      </button>
      <button
        type="button"
        className="seg-btn"
        aria-label="Larger text"
        disabled={i === steps.length - 1}
        onClick={() => setScale(steps[Math.min(steps.length - 1, i + 1)])}
        style={{ fontSize: '1.05rem' }}
      >
        A+
      </button>
    </div>
  );
}

function HeaderControls() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="topbar-controls-wrap" ref={wrapRef}>
      <button
        type="button"
        className="topbar-menu-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Settings"
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      <div className={'topbar-controls' + (open ? ' is-open' : '')}>
        <TextSize />
        <LangToggle />
      </div>
    </div>
  );
}

export default function TopBar({ screen, go }: TopBarProps) {
  const { t } = useI18n();

  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <button className="brand-btn" onClick={() => go(screen === 'onboarding' ? 'onboarding' : 'app')} aria-label="Defroster home">
          <span className="df-logo" aria-hidden="true">
            <Image src="/appicon/defroster-512x512.png" alt="" width={34} height={34} className="df-logo-img" />
          </span>
          <span className="df-wordmark">Defroster</span>
        </button>

        <nav className="topnav" aria-label="Primary">
          {screen !== 'onboarding' && (
            <>
              <button
                className={'nav-link' + (screen === 'app' ? ' is-active' : '')}
                onClick={() => go('app')}
              >
                {t.nav.app}
              </button>
              <button
                className={'nav-link' + (screen === 'guide' ? ' is-active' : '')}
                onClick={() => go('guide')}
              >
                {t.nav.guide}
              </button>
            </>
          )}
          <HeaderControls />
        </nav>
      </div>
    </header>
  );
}
