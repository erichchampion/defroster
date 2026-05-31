'use client';

import { useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/contexts/I18nContext';
import { Alert, ArrowLeft, Check, ChevRight, Heart, Lock, Scale, Shield, ShieldCheck } from './Icons';

interface ImmigrationGuideProps {
  /** Navigate back to the alerts screen (optional in isolated tests). */
  onBack?: () => void;
}

function Accordion({ items }: { items: string[][] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="acc">
      {items.map((item, i) => {
        const [title, body] = item;
        const on = open === i;
        return (
          <div key={i} className={'acc-item' + (on ? ' is-open' : '')}>
            <button className="acc-head" aria-expanded={on} onClick={() => setOpen(on ? -1 : i)}>
              <span className="acc-num">{i + 1}</span>
              <span className="acc-title">{title}</span>
              <span className="acc-chev"><ChevRight size={22} style={{ transform: 'rotate(90deg)' }} /></span>
            </button>
            {on && <div className="acc-body"><p>{body}</p></div>}
          </div>
        );
      })}
    </div>
  );
}

function GuideSection({ id, n, title, children }: { id: string; n: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="g-section read">
      <div className="g-section-head">
        <span className="g-section-n">{n}</span>
        <h2 className="g-section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ImmigrationGuide({ onBack }: ImmigrationGuideProps) {
  const { t } = useI18n();
  const g = t.guide;
  const s = g.sections;

  const toc: [string, string][] = [
    ['stopped', s.stopped],
    ['warrants', s.warrants],
    ['school', s.school],
    ['police', s.police],
    ['help', s.help],
    ['legal', s.legal],
  ];

  return (
    <main className="guide">
      {/* Header */}
      <header className="g-hero">
        <div className="wrap read">
          <div className="g-breadcrumb">
            {onBack && (
              <button className="back-btn" onClick={onBack}><ArrowLeft size={20} /> {t.nav.app}</button>
            )}
            <span className="eyebrow" style={{ color: 'var(--ember-600)' }}>Defroster · {t.nav.guide}</span>
          </div>
          <h1 className="g-title">{g.title}</h1>
          <p className="g-sub">{g.sub}</p>
          <a className="g-rights-link" href={g.rightsUrl} target="_blank" rel="noopener noreferrer">
            <Shield size={18} /> {g.rightsUrlLabel}
          </a>
        </div>
      </header>

      {/* TOC */}
      <nav className="wrap read g-toc" aria-label={g.tocTitle}>
        <span className="g-toc-label">{g.tocTitle}</span>
        <div className="g-toc-chips">
          {toc.map(([id, label]) => (
            <a key={id} className="g-toc-chip" href={'#' + id}>{label}</a>
          ))}
        </div>
      </nav>

      {/* 1. If stopped */}
      <GuideSection id="stopped" n="01" title={s.stopped}>
        <div className="g-block">
          <h3 className="g-h3">{g.stopped.rightsTitle}</h3>
          <ul className="checklist">
            {g.stopped.rights.map((x, i) => <li key={i}><span className="ck"><Check size={16} /></span>{x}</li>)}
          </ul>
        </div>
        <div className="g-callout g-callout-ice">
          <span className="g-callout-ico"><Alert size={22} /></span>
          <div>
            <h3 className="g-h3" style={{ marginBottom: 6 }}>{g.stopped.arrestedTitle}</h3>
            <ul className="bullets">
              {g.stopped.arrested.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
      </GuideSection>

      {/* 2. Warrants — the hero */}
      <GuideSection id="warrants" n="02" title={s.warrants}>
        <p className="g-lead">{g.warrants.intro}</p>
        <div className="warrant-compare">
          <div className="warrant-card warrant-must">
            <div className="warrant-tag"><Scale size={20} /> {g.warrants.judicial.tag}</div>
            <div className="warrant-verdict verdict-must">{g.warrants.judicial.verdict}</div>
            <ul className="bullets">
              {g.warrants.judicial.points.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
          <div className="warrant-card warrant-refuse">
            <div className="warrant-tag"><Shield size={20} /> {g.warrants.admin.tag}</div>
            <div className="warrant-verdict verdict-refuse"><ShieldCheck size={20} /> {g.warrants.admin.verdict}</div>
            <ul className="bullets">
              {g.warrants.admin.points.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
        <div className="g-callout g-callout-pine">
          <span className="g-callout-ico"><Lock size={22} /></span>
          <p>{g.warrants.ask}</p>
        </div>
        <figure className="warrant-fig">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/warrants.jpg" alt="Comparison of a judicial warrant and a DHS administrative warrant" loading="lazy" />
          <figcaption>{g.warrants.imgCaption}</figcaption>
        </figure>
      </GuideSection>

      {/* 3. School */}
      <GuideSection id="school" n="03" title={s.school}>
        <p className="g-lead">{g.school.intro}</p>
        <ul className="bullets bullets-lg">
          {g.school.points.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </GuideSection>

      {/* 4. Police & 287(g) */}
      <GuideSection id="police" n="04" title={s.police}>
        <div className="g-callout g-callout-warn">
          <span className="g-callout-ico"><Alert size={22} /></span>
          <p><strong>{g.police.warn}</strong></p>
        </div>
        <p className="g-body">{g.police.what}</p>
      </GuideSection>

      {/* 5. How everyone can help */}
      <GuideSection id="help" n="05" title={s.help}>
        <Accordion items={g.help.items} />
        <a className="g-inline-link" href={g.help.repsUrl} target="_blank" rel="noopener noreferrer">
          <ChevRight size={16} /> {g.help.repsLabel}
        </a>
      </GuideSection>

      {/* 6. Legal help */}
      <GuideSection id="legal" n="06" title={s.legal}>
        <ul className="checklist">
          {g.legal.points.map((x, i) => <li key={i}><span className="ck"><Check size={16} /></span>{x}</li>)}
        </ul>
      </GuideSection>

      {/* Takeaway */}
      <section className="wrap read">
        <div className="g-takeaway">
          <Heart size={26} />
          <p>{g.takeaway}</p>
        </div>
        {onBack && (
          <div className="g-guide-cta">
            <button className="btn btn-primary btn-lg" onClick={onBack}><ArrowLeft size={20} /> {g.backToAlerts}</button>
          </div>
        )}
      </section>
    </main>
  );
}
