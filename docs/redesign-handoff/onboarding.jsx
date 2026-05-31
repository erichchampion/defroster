/* Defroster — Onboarding / location-permission screen */
const { useState: useStateOnb } = React;

// renders a sentence with two {placeholder} links, each emphasized
function LinkSentence({ text, links }) {
  const parts = text.split(/(\{[a-zA-Z]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{([a-zA-Z]+)\}$/);
        if (m && links[m[1]]) {
          const { label, url } = links[m[1]];
          return <a key={i} className="ios-link" href={url} target="_blank" rel="noopener noreferrer">{label}</a>;
        }
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

function IOSCallout({ ios }) {
  const stepIco = { share: Share, plus: Plus, home: Home };
  return (
    <aside className="ios-callout" aria-label={ios.badge}>
      <div className="ios-badge"><Apple size={16} /> {ios.badge}</div>
      <h3 className="ios-title"><Home size={22} /> {ios.title}</h3>

      <p className="ios-required">
        <span className="ios-required-flag">{ios.required.split("—")[0].trim()}</span>
        {ios.required.includes("—") ? ios.required.slice(ios.required.indexOf("—") + 1) : ""}
      </p>

      <ol className="ios-steps">
        {ios.steps.map(([pre, em, post, ico], i) => {
          const Ico = stepIco[ico] || Plus;
          return (
            <li key={i} className="ios-step">
              <span className="ios-step-n">{i + 1}</span>
              <span className="ios-step-ico"><Ico size={18} /></span>
              <span className="ios-step-txt">{pre} <strong>{em}</strong>{post ? " " + post : ""}</span>
            </li>
          );
        })}
      </ol>

      <p className="ios-loc">
        <LinkSentence text={ios.location} links={{
          locationServicesLink: { label: ios.locationServicesText, url: ios.locationServicesUrl },
          homeScreenLink: { label: ios.homeScreenText, url: ios.homeScreenUrl },
        }} />
      </p>
    </aside>
  );
}

function Onboarding({ t, onGrant, go }) {
  const o = t.onboarding;
  const [loading, setLoading] = useStateOnb(false);
  const [showStory, setShowStory] = useStateOnb(false);

  const grant = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onGrant(); }, 1100);
  };

  return (
    <main className="onb">
      {/* Hero */}
      <section className="onb-hero">
        <div className="wrap onb-hero-inner">
          <div className="onb-hero-copy">
            <div className="onb-brandmark">
              <img src="assets/defroster-icon.png" alt="Defroster app icon" className="onb-brandmark-img" />
              <span className="df-wordmark" style={{ fontSize: "1.5rem" }}>Defroster</span>
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
              <button className="btn btn-primary btn-lg btn-block" onClick={grant} disabled={loading}>
                {loading ? o.ctaLoading : (<><Pin size={22} /> {o.cta}</>)}
              </button>
              <div className="onb-card-links">
                <button className="link-btn" onClick={() => go("guide")}>
                  <Book size={18} /> {o.secondaryRights}
                </button>
                <button className="link-btn" onClick={() => setShowStory((s) => !s)}>
                  <Eye size={18} /> {o.secondaryStory}
                </button>
              </div>
            </div>

            <IOSCallout ios={o.ios} />
          </div>
        </div>
      </section>

      {/* Privacy reassurance */}
      <section className="wrap onb-privacy">
        <h2 className="onb-section-title">{o.privacyTitle}</h2>
        <ul className="onb-priv-grid">
          {o.privacy.map(([label, key], i) => {
            const Ico = window.ICON_MAP[key] || Lock;
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
        <section className="wrap onb-story">
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

Object.assign(window, { Onboarding });
