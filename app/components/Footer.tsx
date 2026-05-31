'use client';

import Image from 'next/image';
import { useI18n } from '@/lib/contexts/I18nContext';
import { GitHub } from './Icons';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <span className="df-logo" aria-hidden="true">
            <Image src="/appicon/defroster-512x512.png" alt="" width={26} height={26} className="df-logo-img" />
          </span>
          <span className="df-wordmark" style={{ fontSize: '1.05rem' }}>Defroster</span>
        </div>
        <p className="footer-priv">{t.footer.privacy}</p>
        <a
          className="footer-link"
          href="https://github.com/erichchampion/defroster"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHub size={18} /> {t.footer.open}
        </a>
      </div>
      <div className="wrap">
        <p className="footer-disc">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
