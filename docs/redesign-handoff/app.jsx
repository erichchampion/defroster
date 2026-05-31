/* Defroster — root app: state, routing, tweaks, mount */
const { useState, useEffect, useMemo } = React;

const CENTER = { lat: 41.7603, lng: -87.5731 }; // Chicago South Shore (the story)

function makeMessages() {
  const now = Date.now();
  const M = (type, mins, dLat, dLng) => ({
    id: type + mins, type, ts: now - mins * 60000,
    lat: CENTER.lat + dLat, lng: CENTER.lng + dLng,
  });
  return [
    M("ICE", 9, 0.006, 0.004),
    M("Police", 46, -0.013, 0.02),
    M("Army", 175, 0.022, -0.012),
    M("ICE", 360, -0.026, -0.022),
    M("Police", 1500, 0.032, 0.03),
    M("ICE", 5400, -0.043, 0.012),
  ].sort((a, b) => b.ts - a.ts);
}

const ACCENTS = {
  pine:  { a: "#135C46", a6: "#15694F", a7: "#0F4B39", tint: "#E7F1EC" },
  ember: { a: "#C24E1E", a6: "#B0461A", a7: "#963A14", tint: "#FBEDE3" },
  blue:  { a: "#1F4FB0", a6: "#1C46A0", a7: "#163B88", tint: "#E7EDF9" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "pine",
  "displayFont": "Bricolage Grotesque"
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLangRaw] = useState(() => localStorage.getItem("df_lang") || "en-us");
  const [scale, setScaleRaw] = useState(() => parseFloat(localStorage.getItem("df_scale")) || 1);
  const [screen, setScreen] = useState("onboarding");
  const [granted, setGranted] = useState(false);
  const [notif, setNotif] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [messages, setMessages] = useState(makeMessages);

  const setLang = (l) => { setLangRaw(l); localStorage.setItem("df_lang", l); };
  const setScale = (s) => { setScaleRaw(s); localStorage.setItem("df_scale", s); };

  const t = useMemo(() => {
    const base = window.I18N[lang];
    return { ...base, __lang: lang };
  }, [lang]);

  // apply text scale
  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", scale);
  }, [scale]);

  // reflect language on <html> for screen readers
  useEffect(() => {
    document.documentElement.lang = lang === "es-us" ? "es" : "en";
  }, [lang]);

  // apply accent + font tweaks
  useEffect(() => {
    const ac = ACCENTS[tw.accent] || ACCENTS.pine;
    const r = document.documentElement.style;
    r.setProperty("--accent", ac.a);
    r.setProperty("--accent-600", ac.a6);
    r.setProperty("--accent-700", ac.a7);
    r.setProperty("--accent-tint", ac.tint);
    r.setProperty("--pine", ac.a);
    r.setProperty("--font-display", `"${tw.displayFont}", "Public Sans", system-ui, sans-serif`);
  }, [tw.accent, tw.displayFont]);

  const go = (s) => { setScreen(s); window.scrollTo(0, 0); };

  const onGrant = () => { setGranted(true); setNotif(true); go("app"); };

  const sendReport = (type) => {
    const m = { id: "u" + Date.now(), type, ts: Date.now(),
      lat: CENTER.lat + (Math.random() - 0.5) * 0.01, lng: CENTER.lng + (Math.random() - 0.5) * 0.01 };
    setMessages((prev) => [m, ...prev]);
  };

  return (
    <div className="df-shell">
      <TopBar t={t} lang={lang} setLang={setLang} scale={scale} setScale={setScale} screen={screen} go={go} />

      {screen === "onboarding" && <Onboarding t={t} onGrant={onGrant} go={go} />}
      {screen === "app" && (
        <MainApp t={t} center={CENTER} messages={messages} notif={notif} setNotif={setNotif}
          openReport={() => setReportOpen(true)} go={go} />
      )}
      {screen === "guide" && <GuideScreen t={t} go={go} />}

      <Footer t={t} />

      {reportOpen && (
        <ReportSheet t={t} loc={CENTER} onSend={sendReport} onClose={() => setReportOpen(false)} />
      )}

      <TweaksPanel>
        <TweakSection label={lang === "es-us" ? "Apariencia" : "Appearance"} />
        <TweakColor label={lang === "es-us" ? "Color principal" : "Accent"} value={ACCENTS[tw.accent].a}
          options={[ACCENTS.pine.a, ACCENTS.ember.a, ACCENTS.blue.a]}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k].a === v) || "pine";
            setTweak("accent", key);
          }} />
        <TweakRadio label={lang === "es-us" ? "Fuente de títulos" : "Heading font"} value={tw.displayFont}
          options={["Bricolage Grotesque", "Public Sans"]}
          onChange={(v) => setTweak("displayFont", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
