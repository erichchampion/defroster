/* Defroster — shared shell: Logo, TopBar, Footer */

// Real Defroster app icon — a sun melting an ice cube into water (the "thaw").
const Logo = ({ size = 34 }) => (
  <span className="df-logo" style={{ width: size, height: size }} aria-hidden="true">
    <img src="assets/defroster-icon.png" alt="" width={size} height={size} className="df-logo-img" />
  </span>
);

const Wordmark = ({ small }) => (
  <span className="df-wordmark" style={{ fontSize: small ? "1.15rem" : "1.32rem" }}>Defroster</span>
);

function LangToggle({ lang, setLang }) {
  return (
    <div className="seg" role="group" aria-label="Language">
      {["en-us", "es-us"].map((l) => (
        <button key={l} className={"seg-btn" + (lang === l ? " is-on" : "")}
          aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l === "en-us" ? "EN" : "ES"}
        </button>
      ))}
    </div>
  );
}

function TextSize({ scale, setScale }) {
  const steps = [1, 1.15, 1.32];
  const idx = steps.indexOf(scale);
  const i = idx === -1 ? 0 : idx;
  return (
    <div className="seg" role="group" aria-label="Text size">
      <button className="seg-btn" aria-label="Smaller text" disabled={i === 0}
        onClick={() => setScale(steps[Math.max(0, i - 1)])} style={{ fontSize: ".82rem" }}>A−</button>
      <button className="seg-btn" aria-label="Larger text" disabled={i === steps.length - 1}
        onClick={() => setScale(steps[Math.min(steps.length - 1, i + 1)])} style={{ fontSize: "1.05rem" }}>A+</button>
    </div>
  );
}

function TopBar({ t, lang, setLang, scale, setScale, screen, go }) {
  return (
    <header className="topbar">
      <div className="wrap topbar-inner">
        <button className="brand-btn" onClick={() => go("onboarding")} aria-label="Defroster home">
          <Logo />
          <Wordmark />
        </button>

        <nav className="topnav" aria-label="Primary">
          {screen !== "onboarding" && (
            <>
              <button className={"nav-link" + (screen === "app" ? " is-active" : "")} onClick={() => go("app")}>
                {t.nav.app}
              </button>
              <button className={"nav-link" + (screen === "guide" ? " is-active" : "")} onClick={() => go("guide")}>
                {t.nav.guide}
              </button>
            </>
          )}
          <div className="topbar-controls">
            <TextSize scale={scale} setScale={setScale} />
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer({ t }) {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Logo size={26} />
          <span className="df-wordmark" style={{ fontSize: "1.05rem" }}>Defroster</span>
        </div>
        <p className="footer-priv">{t.footer.privacy}</p>
        <a className="footer-link" href="https://github.com/erichchampion/defroster" target="_blank" rel="noopener noreferrer">
          <GitHub size={18} /> {t.footer.open}
        </a>
      </div>
      <div className="wrap">
        <p className="footer-disc">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}

Object.assign(window, { Logo, Wordmark, LangToggle, TextSize, TopBar, Footer });
