/* Defroster — Report a sighting (bottom sheet / modal) */
const { useState: useStateRep, useEffect: useEffectRep } = React;

const TYPE_ORDER = ["ICE", "Army", "Police"];
const TYPE_CLASS = { ICE: "sig-ice", Army: "sig-army", Police: "sig-police" };

function ReportSheet({ t, loc, onSend, onClose }) {
  const r = t.report;
  const [type, setType] = useStateRep("ICE");
  const [phase, setPhase] = useStateRep("pick"); // pick | sending | done

  useEffectRep(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = () => {
    setPhase("sending");
    setTimeout(() => {
      onSend(type);
      setPhase("done");
    }, 900);
  };

  return (
    <div className="sheet-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== "sending") onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={r.title}>
        {phase !== "done" ? (
          <>
            <div className="sheet-grab" />
            <div className="sheet-head">
              <h2 className="sheet-title">{r.title}</h2>
              <button className="icon-btn" aria-label={r.cancel} onClick={onClose}><X size={22} /></button>
            </div>
            <p className="sheet-sub">{r.sub}</p>

            <div className="type-grid" role="radiogroup" aria-label={r.title}>
              {TYPE_ORDER.map((k) => {
                const info = r.types[k];
                const on = type === k;
                return (
                  <button key={k} role="radio" aria-checked={on}
                    className={"type-card " + TYPE_CLASS[k] + (on ? " is-on" : "")}
                    onClick={() => setType(k)}>
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
                <p className="sheet-loc-coords">≈ {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)} · block-level only</p>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={send} disabled={phase === "sending"}>
              {phase === "sending" ? r.sending : (<><Bell size={22} /> {r.send}</>)}
            </button>
          </>
        ) : (
          <div className="sheet-done">
            <div className="done-mark"><Check size={44} /></div>
            <h2 className="sheet-title">{r.doneTitle}</h2>
            <p className="sheet-sub" style={{ textAlign: "center" }}>{r.doneSub}</p>
            <button className="btn btn-primary btn-lg btn-block" onClick={onClose}>{r.doneClose}</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ReportSheet, TYPE_ORDER, TYPE_CLASS });
