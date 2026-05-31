/* Defroster — Main app: map + report + nearby list + rights card */
const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp, useMemo: useMemoApp } = React;

const SIG_HEX = { ICE: "#CF1F33", Army: "#B26B07", Police: "#2D54C8" };

function ageOpacity(ts) {
  const d = (Date.now() - ts) / 86400000;
  if (d < 3) return 1; if (d < 4) return .9; if (d < 5) return .8;
  if (d < 6) return .68; if (d < 7) return .56; return .46;
}

function timeAgo(ts, lang) {
  const s = Math.floor((Date.now() - ts) / 1000);
  const es = lang === "es-us";
  if (s < 60) return es ? "ahora mismo" : "just now";
  const m = Math.floor(s / 60); if (m < 60) return es ? `hace ${m} min` : `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return es ? `hace ${h} h` : `${h} hr ago`;
  const d = Math.floor(h / 24); return es ? `hace ${d} d${d > 1 ? "ías" : "ía"}` : `${d} day${d > 1 ? "s" : ""} ago`;
}

function milesAway(a, b) {
  const R = 3958.8, toR = (x) => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ---- Leaflet map (imperative) ---- */
function SightingMap({ center, messages, t }) {
  const elRef = useRefApp(null);
  const mapRef = useRefApp(null);
  const layerRef = useRefApp(null);

  useEffectApp(() => {
    if (!window.L || mapRef.current) return;
    const L = window.L;
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true })
      .setView([center.lat, center.lng], 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
    }).addTo(map);
    L.circle([center.lat, center.lng], {
      radius: 8047, color: "#135C46", weight: 1.5, opacity: .5,
      fillColor: "#135C46", fillOpacity: .06, dashArray: "5 6",
    }).addTo(map);
    // user marker
    const you = L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html:
      `<span class="you-dot"></span>` });
    L.marker([center.lat, center.lng], { icon: you, zIndexOffset: 1000 }).addTo(map)
      .bindPopup(`<b>${t.app.yourLocation}</b>`);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // update sighting markers
  useEffectApp(() => {
    const L = window.L, map = mapRef.current, layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    messages.forEach((m) => {
      const c = SIG_HEX[m.type], op = ageOpacity(m.ts);
      const icon = L.divIcon({
        className: "", iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
        html: `<span class="pin" style="--pc:${c};opacity:${op}"></span>`,
      });
      L.marker([m.lat, m.lng], { icon }).addTo(layer)
        .bindPopup(`<b style="color:${c}">${t.report.types[m.type].label}</b><br><span style="color:#5A5048">${timeAgo(m.ts, t.__lang)}</span>`);
    });
  }, [messages, t]);

  return <div ref={elRef} className="leaflet-host" role="img" aria-label="Map of nearby sightings" />;
}

/* ---- Nearby list ---- */
function NearbyList({ t, center, messages }) {
  if (!messages.length) {
    return (
      <div className="empty">
        <div className="empty-mark"><ShieldCheck size={34} /></div>
        <p className="empty-title">{t.app.empty}</p>
        <p className="empty-sub">{t.app.emptySub}</p>
      </div>
    );
  }
  return (
    <ul className="nearby">
      {messages.map((m) => {
        const mi = milesAway(center, m);
        return (
          <li key={m.id} className={"nearby-card " + TYPE_CLASS[m.type]} style={{ opacity: ageOpacity(m.ts) }}>
            <span className="nearby-rail" />
            <div className="nearby-body">
              <div className="nearby-top">
                <span className="sig-label"><span className="sig-dot" />{t.report.types[m.type].label}</span>
                <span className="nearby-time">{timeAgo(m.ts, t.__lang)}</span>
              </div>
              <p className="nearby-meta">
                <Pin size={16} /> {t.app.sightingAt} · <span className="mono">{mi.toFixed(1)} mi</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MainApp({ t, center, messages, notif, setNotif, openReport, go }) {
  const [view, setView] = useStateApp("map"); // mobile toggle

  return (
    <main className="app">
      <div className="wrap app-head">
        <div className="app-head-l">
          <h1 className="app-title">{t.app.nearbyTitle}</h1>
          <div className="app-status">
            <span className="chip chip-ok"><span className="live-dot" /> {notif ? t.app.statusOn : t.app.radiusNote}</span>
            <span className="app-radius">{t.app.radiusNote}</span>
          </div>
        </div>
        <button className="btn btn-primary report-cta-top" onClick={openReport}>
          <Plus size={22} /> {t.app.reportCta}
        </button>
      </div>

      {!notif && (
        <div className="wrap">
          <div className="notif-banner">
            <span className="notif-ico"><Bell size={22} /></span>
            <div className="notif-copy">
              <p className="notif-title">{t.app.enableNotif}</p>
              <p className="notif-why">{t.app.notifWhy}</p>
            </div>
            <button className="btn btn-ghost notif-btn" onClick={() => setNotif(true)}>{t.app.enableNotif}</button>
          </div>
        </div>
      )}

      {/* Mobile view toggle */}
      <div className="wrap mob-toggle-wrap">
        <div className="seg seg-wide mob-toggle">
          <button className={"seg-btn" + (view === "map" ? " is-on" : "")} onClick={() => setView("map")}><MapIcon size={18} /> {t.app.mapTab}</button>
          <button className={"seg-btn" + (view === "list" ? " is-on" : "")} onClick={() => setView("list")}><List size={18} /> {t.app.listTab}</button>
        </div>
      </div>

      <div className="wrap app-grid">
        <section className={"app-map-col" + (view === "list" ? " mob-hide" : "")}>
          <div className="map-card card">
            <SightingMap center={center} messages={messages} t={t} />
          </div>
          <div className="legend">
            {TYPE_ORDER.map((k) => (
              <span key={k} className={"legend-item " + TYPE_CLASS[k]}>
                <span className="legend-dot" /> {t.report.types[k].label}
              </span>
            ))}
          </div>
        </section>

        <aside className={"app-side" + (view === "map" ? " mob-hide" : "")}>
          <div className="side-head">
            <h2 className="side-title">{t.app.listTab === "List" ? "Nearby" : "Cercanos"}</h2>
            <span className="side-count">{messages.length}</span>
          </div>
          <NearbyList t={t} center={center} messages={messages} />

          {/* Know your rights entry */}
          <button className="rights-card" onClick={() => go("guide")}>
            <span className="rights-ico"><Scale size={26} /></span>
            <span className="rights-text">
              <span className="rights-title">{t.app.rightsCardTitle}</span>
              <span className="rights-sub">{t.app.rightsCardSub}</span>
            </span>
            <span className="rights-cta"><ChevRight size={22} /></span>
          </button>
        </aside>
      </div>

      {/* Mobile sticky report */}
      <div className="report-dock">
        <button className="btn btn-primary btn-lg btn-block" onClick={openReport}>
          <Plus size={22} /> {t.app.reportCta}
        </button>
      </div>
    </main>
  );
}

Object.assign(window, { MainApp, SightingMap, NearbyList, timeAgo, milesAway, ageOpacity });
