# Defroster — Redesign Handoff

A calm, high-contrast, accessible visual refresh of the Defroster PWA. This package contains a
working HTML/CSS/React prototype of the redesign plus everything a developer needs to fold the
new look into the existing **Next.js 15 / React 19 / Tailwind** codebase
(`github.com/erichchampion/defroster`).

The redesign is internally called **"Thaw"** — warm paper backgrounds, a deep pine‑green primary
(safety / shelter), an ember accent (a nod to *defrosting* ICE), and bold color‑coded sighting
labels. It happens to mirror the real app‑icon metaphor (a sun melting ice into water).

---

## 1. What's in this package

```
Defroster-Redesign-Handoff/
├── README.md                  ← you are here
├── Defroster Redesign.html    ← run this to see the full prototype
├── tokens.css                 ← design system: color / type / spacing / radius / shadow tokens
├── app.css                    ← component styles (topbar, onboarding, app, report, guide…)
├── i18n.js                    ← EN + ES copy used by the prototype (incl. new iOS strings)
├── icons.jsx                  ← minimal line-icon set (Lucide-style, currentColor)
├── shell.jsx                  ← TopBar (logo, language, text-size) + Footer
├── onboarding.jsx             ← onboarding / location-permission screen + iOS callout
├── mainapp.jsx                ← main app: Leaflet map, nearby list, rights card
├── report.jsx                 ← "Report a sighting" sheet (color-coded type picker)
├── guide.jsx                  ← Know Your Rights guide (scannable + warrant comparison)
├── app.jsx                    ← root: routing, state, tweaks, mount
├── tweaks-panel.jsx           ← optional in-design tweak controls (not needed in production)
├── assets/
│   └── defroster-icon.png     ← the current app icon (used as logo + favicon)
└── public/
    └── warrants.jpg           ← real judicial-vs-DHS warrant comparison image
```

> The prototype is built with React via in-browser Babel for fast iteration. **Do not ship the
> Babel build** — port the markup/styles into your existing TSX components as described below.

### Running the prototype
Any static server works (the page loads local CSS/JS/images):

```bash
cd Defroster-Redesign-Handoff
npx serve .          # or: python3 -m http.server 8000
```

Open the printed URL and click **Turn on location to begin** to walk all three screens. Use the
**A− / A+** and **EN / ES** controls in the header; the **Tweaks** panel (bottom-right) lets you
preview accent-color and heading-font options.

---

## 2. Design tokens

All tokens live in **`tokens.css`** as CSS custom properties on `:root`. The cleanest path is to
**paste these variables into `app/globals.css`** and reference them from Tailwind via
`theme.extend` (or just use the CSS vars directly in `className` with arbitrary values, e.g.
`bg-[var(--paper)]`).

### Color

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FBF7F1` | page background (warm off-white) |
| `--paper-2` | `#F5EFE6` | sunken surfaces |
| `--surface` | `#FFFFFF` | cards |
| `--ink` | `#1C1815` | primary text (warm near-black) |
| `--ink-2` | `#5A5048` | body / secondary text |
| `--ink-3` | `#8B8077` | meta / captions |
| `--line` | `#ECE3D6` | hairline borders |
| `--line-2` | `#E0D5C4` | stronger borders |
| `--pine` / `--pine-600` / `--pine-700` | `#135C46` / `#15694F` / `#0F4B39` | **primary** (buttons, links, "safe") |
| `--ember` / `--ember-600` | `#E5602A` / `#D7531F` | accent (logo glow, iOS callout, focus ring) |
| `--pine-tint` | `#E7F1EC` | soft green wash |
| `--ember-tint` | `#FCEDE3` | soft ember wash |

**Sighting signal colors** (replace the current `lib/constants/colors.ts` values):

| Type | `--ice` / `--army` / `--police` | Tint | Dark text |
|---|---|---|---|
| ICE | `#CF1F33` | `#FBE9EB` | `#8E1422` |
| Army / National Guard | `#B26B07` | `#FBF0DC` | `#784707` |
| Police | `#2D54C8` | `#E7ECFB` | `#1E3A8F` |

These are AA-contrast against white and color-blind-distinguishable **when paired with the text
label** (the redesign always shows the label, never color alone — see §6).

### Type

| Token | Value |
|---|---|
| `--font-display` | **Bricolage Grotesque** (headings) |
| `--font-sans` | **Public Sans** (body / UI — a US-government accessibility face) |
| `--font-mono` | **Spline Sans Mono** (timestamps, coordinates, counts) |
| Body base | `17px` (`--t-body: 1.0625rem`), line-height `1.62` |
| Scale | `--t-mega … --t-xs`, all multiplied by `--text-scale` for the size control |

Sizes never go below ~13px; tap targets are ≥ `44–56px` (`.btn` min-height 56).

### Spacing / radius / elevation
- Spacing: 4px base — `--s1`=4 … `--s20`=80.
- Radius: `--r-xs`=8 → `--r-xl`=30, `--r-pill`=999.
- Shadows: `--shadow-xs/sm/md/lg` (calm, low-spread). Focus ring: `--ring` (ember, 3px).

---

## 3. Fonts

Add the three Google fonts with `next/font/google` (recommended — self-hosts + avoids layout
shift). In `app/[locale]/layout.tsx`:

```ts
import { Bricolage_Grotesque, Public_Sans, Spline_Sans_Mono } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['400','600','700','800'] });
const sans    = Public_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['400','500','600','700','800'] });
const mono    = Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400','600'] });

// on <body>: className={`${display.variable} ${sans.variable} ${mono.variable}`}
```

Then set `font-family: var(--font-sans)` on body and `var(--font-display)` on `h1–h4`.
(The prototype loads the same fonts via a Google Fonts `<link>` — fine for preview, not for prod.)

---

## 4. Implementation order (suggested)

1. Drop tokens into `globals.css`; add the three fonts.
2. Update `lib/constants/colors.ts` (new hexes) and decide labels-vs-emoji (§6).
3. Rebuild `LocationPermission.tsx` → new onboarding (§5.1) **including the iOS callout (§7).**
4. Rebuild the main page layout in `app/[locale]/page.tsx` (§5.2).
5. Restyle `MessageForm.tsx` (§5.3), `MessageList.tsx` (§5.4), `SightingMap.tsx` (§5.5).
6. Rebuild `ImmigrationGuide.tsx` → scannable guide + warrant comparison (§5.6).
7. Add the new i18n keys (§8) and accessibility controls (§9).

---

## 5. Screen-by-screen mapping to existing components

### 5.1 `app/components/LocationPermission.tsx` → Onboarding
The old screen stacked story + permission + privacy list + the **entire** immigration guide, which
overwhelmed first-time users. The redesign reduces it to **one decision**:

- A hero (app icon + wordmark, headline, sub, three trust chips: *anonymous / no account /
  auto-deletes*).
- A single **permission card** with a plain-language "why" and the primary CTA.
- Secondary links that *defer* the heavy content: **Read: Know Your Rights** and **Why we built
  this** (the October 2 story is now collapsed behind a toggle, not blocking the CTA).
- A **"What stays private"** grid (the old bullet list, as 6 calm cards).
- The **iOS Home-Screen callout** (§7).

See `onboarding.jsx` for structure and `app.css` (`.onb-*`, `.ios-*`) for styles.

### 5.2 `app/[locale]/page.tsx` → Main app
- Sticky **TopBar** with logo, `Alerts` / `Know Your Rights` nav, and the A−/A+ + EN/ES controls.
- A two-column grid (desktop): **map** left, **nearby list** + **Know-your-rights card** right.
  Mobile collapses to a **Map / List** segmented toggle and a **sticky bottom "Report a sighting"**
  button (`.report-dock`).
- Status chip ("Alerts on" / offline) and a dismissible **notifications** banner replace the inline
  status text. Keep your existing `isOffline`, `permission`, `token` logic — only the presentation
  changes.

### 5.3 `app/components/MessageForm.tsx` → Report sheet
Moves from an always-visible form to a **modal/bottom sheet** opened by the report button. Three
large **color-coded type cards** (radio group) instead of small radios, a "location blurred to the
block" reassurance row, a primary **Send anonymous alert** button, and a success state. Wire
`onSend(type)` to your existing `handleSendMessage`. See `report.jsx`.

### 5.4 `app/components/MessageList.tsx` → Nearby cards
Each card: a left color rail, the bold **sighting label pill**, time-ago, and distance in a mono
font. Age still drives opacity (keep your `getOpacityForAge`). Empty state is reassuring
("All clear nearby") with a shield-check, not a magnifier. See `.nearby-*` in `app.css`.

### 5.5 `app/components/SightingMap.tsx` → Map styling
Keep `react-leaflet`. Two visual changes:
- **Tiles:** swap the default OSM tiles for the lighter, calmer CARTO Positron basemap:
  `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` (attribution: OpenStreetMap ©
  CARTO).
- **Markers:** teardrop `divIcon`s tinted with the new signal hexes + white border + soft shadow;
  the user marker is an accent dot with a halo. Radius circle uses `--pine` at low opacity, dashed.
  Marker HTML is in `mainapp.jsx` (`.pin`, `.you-dot`).

### 5.6 `app/components/ImmigrationGuide.tsx` → Know Your Rights
The single biggest readability win. The wall of text becomes:
- A header with the ACLU "Know Your Rights" link surfaced as a button.
- A **"Jump to"** chip nav (anchor links).
- Numbered sections; **"How everyone can help"** becomes an **accordion** (one open at a time).
- **The warrant distinction is elevated to the visual centerpiece**: two side-by-side cards —
  *Judicial warrant → "You must comply"* (ink) vs *ICE/DHS paper → "You can refuse"* (pine) —
  followed by the real `warrants.jpg` comparison and a callout on how to ask for the warrant.

Your existing `renderBoldText` / `renderTextWithLink` helpers still apply.

---

## 6. Iconography & the emoji decision

The redesign uses **bold color-coded text labels** (e.g. a red **ICE** pill), not emoji, as the
primary signal — this reads instantly, survives screen readers, and is unambiguous across cultures.
If you keep emoji on map markers for familiarity, **always keep the text label too**; never rely on
color or emoji alone (accessibility). UI icons are spare Lucide-style line glyphs (`icons.jsx`);
SF Symbols → Lucide if you add any.

---

## 7. NEW — iOS "Add to Home Screen" requirement (please don't skip)

On iOS, **push notifications and reliable location only work once the site is installed to the Home
Screen as a web app.** The old build mentioned this in one easy-to-miss sentence. The redesign turns
it into an **emphasized callout** in onboarding:

- An **"iPhone & iPad"** badge + heading **"Add Defroster to your Home Screen."**
- A highlighted **"Required on iOS"** box stating alerts only work once installed.
- Three numbered visual steps: **Tap Share → Add to Home Screen → Open from Home Screen.**
- A secondary line that keeps both original links — **Location Services** and **Home Screen** —
  rendered as emphasized, underlined links.

**Behavior:** you already detect this in `page.tsx` (`isIOS`, `isStandalone`). Show the callout when
`isIOS && !isStandalone`; once running standalone, hide it and show the normal notification CTA.
Markup is in `onboarding.jsx` (`IOSCallout`); styles are `.ios-*` in `app.css`.

---

## 8. New i18n keys

Add an `ios` block under `onboarding` (the prototype restructures `locationPermission` copy into an
`onboarding` namespace, but you can keep your existing namespaces and just add these keys). English
shown; Spanish equivalents are in `i18n.js`.

```jsonc
"onboarding": {
  "ios": {
    "badge": "iPhone & iPad",
    "title": "Add Defroster to your Home Screen",
    "required": "Required on iOS — alerts and notifications only work once Defroster is saved to your Home Screen as a web app.",
    "steps": [
      ["Tap", "Share", "in Safari", "share"],
      ["Choose", "Add to Home Screen", "", "plus"],
      ["Open Defroster", "from your Home Screen", "", "home"]
    ],
    "location": "Also turn on {locationServicesLink} for Safari Websites, then save this site to your {homeScreenLink}.",
    "locationServicesText": "Location Services",
    "locationServicesUrl": "https://support.apple.com/en-us/102515",
    "homeScreenText": "Home Screen",
    "homeScreenUrl": "https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
  }
}
```

All other strings reuse your existing `en.json` / `es.json` content. The prototype's `i18n.js` is a
convenient reference for the full redesigned copy (onboarding, app, report, guide) in both
languages.

---

## 9. Accessibility checklist

- **Text-size control** (A− / A+) sets `--text-scale` (1 → 1.15 → 1.32); every font-size in the
  system is `calc(token * var(--text-scale))`. Persist to `localStorage`.
- **Language**: set `document.documentElement.lang` to `en` / `es` (the prototype does this in
  `app.jsx`); you already render the correct `<html lang>` server-side per locale — keep that.
- **Focus**: visible ember focus ring on every interactive element (`:focus-visible` → `--ring`).
- **Contrast**: text/background pairs are AA+; signal pills carry a text label, never color alone.
- **Reduced motion**: animations are disabled under `prefers-reduced-motion` (already in
  `tokens.css`). Map/sheet transitions are short and functional.
- **Targets**: buttons ≥ 56px tall; sheet type-cards are full-width tappable rows.
- Add a **"Skip to content"** link (in the prototype's `index` head) before `#root`.

---

## 10. Notes & caveats

- The prototype uses **mock sightings** centered on Chicago South Shore and **simulated
  permissions** — it is not wired to Firebase/FCM. All backend, privacy, geohash, rate-limiting and
  cleanup logic in your repo is untouched by this redesign; only the presentation layer changes.
- `warrants.jpg` is the real image already in your `public/`. The app icon used here is your
  existing `public/appicon/defroster-512x512.png`.
- Only **Bricolage Grotesque / Public Sans / Spline Sans Mono** are introduced; no other new deps.
- The `tweaks-panel.jsx` file is a preview-only convenience and should not ship.

Questions on any mapping? The corresponding `*.jsx` + `app.css` selectors named in each section are
the source of truth for spacing and exact values.
