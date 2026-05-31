'use client';

import { useEffect, useState } from 'react';
import { GeoLocation, SightingType } from '@/lib/types/message';
import { getSightingSigClass } from '@/lib/constants/colors';
import { useI18n } from '@/lib/contexts/I18nContext';
import { Bell, Blur, Check, X } from './Icons';

const TYPE_ORDER: SightingType[] = ['ICE', 'Army', 'Police'];

interface ReportSheetProps {
  onSendMessage: (sightingType: SightingType, location: GeoLocation) => Promise<void>;
  currentLocation: GeoLocation;
  onClose: () => void;
}

type Phase = 'pick' | 'sending' | 'done';

export default function ReportSheet({ onSendMessage, currentLocation, onClose }: ReportSheetProps) {
  const { t } = useI18n();
  const r = t.report;
  const [type, setType] = useState<SightingType>('ICE');
  const [phase, setPhase] = useState<Phase>('pick');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'sending') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const send = async () => {
    setPhase('sending');
    setError(null);
    try {
      await onSendMessage(type, currentLocation);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
      setPhase('pick');
    }
  };

  return (
    <div
      className="sheet-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && phase !== 'sending') onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={r.title}>
        {phase !== 'done' ? (
          <>
            <div className="sheet-grab" />
            <div className="sheet-head">
              <h2 className="sheet-title">{r.title}</h2>
              <button className="icon-btn" aria-label={r.cancel} onClick={onClose}><X size={22} /></button>
            </div>
            <p className="sheet-sub">{r.sub}</p>

            {error && <p className="sheet-error" role="alert">{error}</p>}

            <div className="type-grid" role="radiogroup" aria-label={r.title}>
              {TYPE_ORDER.map((k) => {
                const info = r.types[k];
                const on = type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={info.full}
                    className={'type-card ' + getSightingSigClass(k) + (on ? ' is-on' : '')}
                    onClick={() => setType(k)}
                  >
                    <span className="type-dot" />
                    <span className="type-text">
                      <span className="type-label">{info.label}</span>
                      <span className="type-full">{info.full}</span>
                    </span>
                    <span className="type-check">{on && <Check size={20} />}</span>
                  </button>
                );
              })}
            </div>

            <div className="sheet-loc">
              <Blur size={20} />
              <div>
                <p className="sheet-loc-label">{r.locLabel}</p>
                <p className="sheet-loc-coords mono">
                  ≈ {currentLocation.latitude.toFixed(2)}, {currentLocation.longitude.toFixed(2)}
                </p>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={send} disabled={phase === 'sending'}>
              {phase === 'sending' ? r.sending : (<><Bell size={22} /> {r.send}</>)}
            </button>
          </>
        ) : (
          <div className="sheet-done">
            <div className="done-mark"><Check size={44} /></div>
            <h2 className="sheet-title">{r.doneTitle}</h2>
            <p className="sheet-sub" style={{ textAlign: 'center' }}>{r.doneSub}</p>
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>{r.doneClose}</button>
          </div>
        )}
      </div>
    </div>
  );
}
