'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/contexts/I18nContext';
import { Apple, Book, Check, Eye, Home, Lock, Pin, Plus, Share, ICON_MAP } from './Icons';

interface LocationPermissionProps {
  onRequestPermission: () => Promise<{ latitude: number; longitude: number } | null>;
  /** Navigate to the Know Your Rights guide (optional in isolated tests). */
  onOpenGuide?: () => void;
}

type IosCopy = {
  badge: string;
  title: string;
  required: string;
  steps: string[][];
  location: string;
  locationServicesText: string;
  locationServicesUrl: string;
  homeScreenText: string;
  homeScreenUrl: string;
};

/** Renders a sentence with {placeholder} links, each emphasized. */
function LinkSentence({ text, links }: { text: string; links: Record<string, { label: string; url: string }> }) {
  const parts = text.split(/(\{[a-zA-Z]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{([a-zA-Z]+)\}$/);
        if (m && links[m[1]]) {
          const { label, url } = links[m[1]];
          return (
            <a key={i} className="ios-link" href={url} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

const STEP_ICONS: Record<string, (p: { size?: number }) => React.JSX.Element> = {
  share: Share,
  plus: Plus,
  home: Home,
};

function IOSCallout({ ios }: { ios: IosCopy }) {
  const requiredParts = ios.required.split('—');
  return (
    <aside className="ios-callout" aria-label={ios.badge}>
      <div className="ios-badge"><Apple size={16} /> {ios.badge}</div>
      <h3 className="ios-title"><Home size={22} /> {ios.title}</h3>

      <p className="ios-required">
        <span className="ios-required-flag">{requiredParts[0].trim()}</span>
        {requiredParts.length > 1 ? requiredParts.slice(1).join('—') : ''}
      </p>

      <ol className="ios-steps">
        {ios.steps.map((step, i) => {
          const [pre, em, post, ico] = step;
          const Ico = STEP_ICONS[ico] || Plus;
          return (
            <li key={i} className="ios-step">
              <span className="ios-step-n">{i + 1}</span>
              <span className="ios-step-ico"><Ico size={18} /></span>
              <span className="ios-step-txt">{pre} <strong>{em}</strong>{post ? ' ' + post : ''}</span>
            </li>
          );
        })}
      </ol>

      <p className="ios-loc">
        <LinkSentence
          text={ios.location}
          links={{
            locationServicesLink: { label: ios.locationServicesText, url: ios.locationServicesUrl },
            homeScreenLink: { label: ios.homeScreenText, url: ios.homeScreenUrl },
          }}
        />
      </p>
    </aside>
  );
}

export default function LocationPermission({ onRequestPermission, onOpenGuide }: LocationPermissionProps) {
  const { t } = useI18n();
  const o = t.onboarding;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [showIosCallout, setShowIosCallout] = useState(false);
  const storyRef = useRef<HTMLElement>(null);

  // When the story is revealed, scroll it into view.
  useEffect(() => {
    if (showStory) {
      storyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showStory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isStandalone =
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setShowIosCallout(isIOS && !isStandalone);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="onb">
      {/* Hero */}
      <section className="onb-hero">
        <div className="wrap onb-hero-inner">
          <div className="onb-hero-copy">
            <div className="onb-brandmark">
              <Image src="/appicon/defroster-512x512.png" alt="Defroster app icon" width={60} height={60} className="onb-brandmark-img" />
              <span className="df-wordmark" style={{ fontSize: '1.5rem' }}>Defroster</span>
            </div>
            <span className="eyebrow">{o.eyebrow}</span>
            <h1 className="onb-title">{o.title}</h1>
            <p className="onb-sub">{o.sub}</p>
            <ul className="onb-trust" aria-label="Privacy summary">
              {o.trust.map((x, i) => (
                <li key={i} className="onb-trust-item"><Check size={18} /> {x}</li>
              ))}
            </ul>
          </div>

          {/* Permission card + iOS requirement — the single decision */}
          <div className="onb-card-col">
            <div className="onb-card card">
              <div className="onb-card-mark"><Pin size={30} /></div>
              <h2 className="onb-card-title">{o.cta}</h2>
              <p className="onb-card-note">{o.ctaNote}</p>
              <button className="btn btn-primary btn-lg btn-block" onClick={handleRequestPermission} disabled={loading}>
                {loading ? o.ctaLoading : (<><Pin size={22} /> {o.cta}</>)}
              </button>
              {error && <p className="onb-error" role="alert">{error}</p>}
              <div className="onb-card-links">
                <button className="link-btn" onClick={() => onOpenGuide?.()}>
                  <Book size={18} /> {o.secondaryRights}
                </button>
                <button className="link-btn" onClick={() => setShowStory((s) => !s)} aria-expanded={showStory}>
                  <Eye size={18} /> {o.secondaryStory}
                </button>
              </div>
            </div>

            {showIosCallout && <IOSCallout ios={o.ios} />}
          </div>
        </div>
      </section>

      {/* Privacy reassurance */}
      <section className="wrap onb-privacy">
        <h2 className="onb-section-title">{o.privacyTitle}</h2>
        <ul className="onb-priv-grid">
          {o.privacy.map((row, i) => {
            const [label, key] = row;
            const Ico = ICON_MAP[key] || Lock;
            return (
              <li key={i} className="onb-priv-item">
                <span className="onb-priv-ico"><Ico size={22} /></span>
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Expandable story */}
      {showStory && (
        <section ref={storyRef} className="wrap onb-story">
          <div className="onb-story-card read">
            <h2 className="onb-section-title">{o.storyTitle}</h2>
            <p className="onb-story-p">{o.story1}</p>
            <p className="onb-story-p">{o.story2}</p>
          </div>
        </section>
      )}
    </main>
  );
}
