# Contributing to AI Tycoon

Thanks for your interest! This is a small but feature-rich pixel-art office
dashboard. The frontend is plain ES modules (no bundler), the backend is a
single Node.js file. Setup is minimal.

## Setup

```bash
npm install
npm start          # http://localhost:3777
npm test           # smoke check: 30 assets + modules + API
```

Open `http://localhost:3777` in your browser. Edits to JS / CSS / HTML take
effect on refresh (no hot reload). Tailwind utilities live in
`css/tailwind.generated.css`; regenerate with `npm run build` after edits to
`css/tailwind.input.css`.

## Project layout

```
ai-tycoon/
├── server.js              # AI session detection + WS broadcast + API
├── index.html             # Layout + modals + welcome card + splash
├── style.css              # Theme + component CSS (Tailwind generated separately)
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # Service worker (offline shell cache)
├── icons/                 # SVG icons (normal + maskable)
├── scripts/
│   ├── build-css.js       # Tailwind utility build
│   └── smoke-test.js      # `npm test` — server + 30 asset checks
└── js/
    ├── main.js            # Entry point, game loop, input handlers
    ├── state.js           # Shared mutable state + utilities
    ├── constants.js       # Palettes, themes, office map, character themes
    ├── ws.js              # WebSocket reconnect, state diff, latency
    ├── renderer.js        # Canvas 2D drawing: office, agents, sub-agents
    ├── pixiOverlay.js     # PixiJS effect layers (ambient tint, auras, weather)
    ├── npcs.js            # Background characters
    ├── seasons.js         # Christmas / Halloween / Spring decorations
    ├── timeOfDay.js       # Sky palette + sun/moon trajectory + ambient warmth
    ├── panel.js           # Side panel, insights, project modal, live HUD
    ├── agentPriority.js   # Sort + filter heuristics
    ├── i18n.js            # KO/EN dictionary + DOM applier
    ├── stats.js           # localStorage daily rollups + 7-day trend
    ├── achievements.js    # 21 milestones with confetti + popups
    ├── sound.js           # Web Audio chimes + volume control
    ├── notifications.js   # Desktop Notification API wrapper
    ├── snapshot.js        # PNG export of office + Pixi composite
    ├── perfHud.js         # FPS / heap / sprites overlay (Ctrl+Shift+P)
    ├── tips.js            # Rotating "Did you know?" hints
    ├── miniMap.js         # Bottom-right overview when zoomed in
    ├── backup.js          # JSON export/import of all state
    ├── toasts.js          # In-app slide-in cards
    ├── tour.js            # First-run onboarding spotlights
    ├── crossTab.js        # BroadcastChannel sync of 21 prefs
    ├── konami.js          # Hidden ↑↑↓↓←→←→BA egg
    └── demoMode.js        # Synthetic agents for screenshots
```

## Adding a new AI platform

Each platform is detected in `server.js`. Add an entry to `AI_PLATFORMS` with
process-name patterns or file-system probes, then add a matching block to
`js/constants.js → PLATFORM_META` so the dashboard knows the colour and badge.

## Adding a new achievement

Add an entry to `ACHIEVEMENTS` in `js/achievements.js` with `id`, `icon`,
KO/EN copy, and a `check(ctx)` predicate that returns `true` once unlocked.
The `gatherContext()` helper provides today's stats, streak, platform count,
hour, etc.

## Adding a new modal

Use the existing `.modal-overlay` / `.modal-card` pattern in `index.html` and
register open/close functions on `window` so the inline `onclick` handlers
can find them. Add the close key to the `Escape` priority chain in `index.html`.

## Adding a new keyboard shortcut

Update the global `keydown` listener in `index.html` (single-letter shortcuts
that ignore typing targets), and add a row to the `shortcuts-overlay` modal.

## Testing

```bash
npm test
```

The smoke test boots a sibling server on port 3778, hits 30 endpoints (HTML,
manifest, SW, icons, every JS module, the API), and verifies status + payload
keywords. CI-friendly exit codes:

- `0` — all pass
- `1` — one or more failures
- `2` — server failed to start
- `3` — test harness crash

Add new modules to the `SHELL` list when you introduce one.

## Coding conventions

- **No bundler**: plain ES modules served from `/js/*.js`. Keep imports
  relative + `.js`-suffixed so the browser resolves them directly.
- **No framework**: vanilla DOM. Build small, focused helper modules that
  expose `window.aiTycoon*` namespaces for cross-module wiring.
- **i18n first**: any new user-facing string lives in `js/i18n.js` (KO + EN);
  reference via `data-i18n="key"` or `t("key")` at runtime.
- **Persist via localStorage** with the `ai-tycoon-*` prefix so backup/restore
  and cross-tab sync pick it up automatically. Add the key to `SYNCED_KEYS`
  in `js/crossTab.js` if it should sync across tabs.
- **prefers-reduced-motion**: respected for confetti, splash, tip cards,
  konami, empty CTA, mini-map. New animated elements should check the media
  query.

## License

MIT. Contributions are accepted under the same license.
