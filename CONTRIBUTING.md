# Contributing to AI Tycoon

Thanks for your interest! This is a small but feature-rich pixel-art office
dashboard. The frontend is plain ES modules (no bundler), the backend is a
single Node.js file. Setup is minimal.

## Setup

```bash
npm install
npm start          # http://localhost:3777
npm run lint       # node --check 36+ .js files
npm test           # smoke check: 38 assets/modules/API contract
npm run icons      # 새 픽셀아트 아이콘 설치 (PNG/ICO 자동 분기)
npm run build      # Tailwind 유틸리티 재생성 (css/tailwind.input.css 수정 후)
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
├── icons/                 # 픽셀아트 PNG (1순위) + SVG (fallback) + ICO (IE/Edge 호환)
├── scripts/
│   ├── build-css.js       # Tailwind utility build
│   ├── lint.js            # `npm run lint` — node --check on every .js
│   ├── install-app-icon.js # `npm run icons` — PNG/ICO 자동 분기해서 icon.png 갱신
│   └── smoke-test.js      # `npm test` — server + 38 asset/API checks
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
    ├── achievements.js    # 24 milestones with confetti + popups
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
    ├── awaySummary.js     # 'While you were away' toast on tab return
    ├── commandPalette.js  # Ctrl/Cmd+K palette (32+ commands)
    ├── privacyMode.js     # Shift+P blur + Strict mode
    ├── standupExport.js   # Daily standup + agent notes Markdown export
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
모달은 `탐색 / 화면 / 캔버스 / 메모` 4개 그룹으로 나뉘어 있어요 — 새 키는 가장 맞는
그룹 아래 `<li>` 로 추가하고, `data-i18n="shortcuts.<key>"` 로 KO/EN 둘 다 등록하세요.

## 메모 hashtag 시스템 (v1.3.0+)

메모에 `#frontend` 같은 hashtag 를 쓰면 8개 터치포인트에서 자동 노출됩니다.
새 기능 추가/수정할 때 이 중 영향 갈 만한 곳 체크해 주세요:

1. **사이드바 `agent-tags-bar`** (`renderAgentTagsBar` in `js/panel.js`)
2. **디테일 패널 메모 칩** (`updateDetailPanel` 안 `tagChipsHtml`)
3. **메모 textarea 자동완성** (`refreshAutocomplete` in `js/panel.js`)
4. **명령 팔레트 필터 명령** (`buildActions` 후반부 in `js/commandPalette.js`)
5. **visibility-summary `#tag` 칩** (`updateSearchControls` in `js/panel.js`)
6. **hashtag 0건 empty state** (filteredAgents 분기 in `updatePanel`)
7. **설정 → 메모 태그 관리자** (`renderTagsManager` in `index.html`)
8. **에이전트 카드 내부 칩** (`updatePanel` 카드 render `agent-card-tags`)

핵심 헬퍼:
- `extractTagsFromText(text)` — 단일 메모 → unique 태그 배열 (순서 보존)
- `extractTagsFromNotes()` — 전체 메모 → `[{tag, count}]` (1초 TTL 캐시)
- `invalidateTagCache()` — localStorage 직접 수정 시 호출 필요
  (`window.aiTycoonInvalidateTagCache` 로도 노출)
- `tagHueFor(tag)` — 태그명 → stable hsl hue (다크/라이트 양쪽 가독성 보장)

태그 정규식은 `/#([A-Za-z0-9_가-힣]{2,32})/g` 한 곳 (`TAG_REGEX` in `panel.js`).
수정 시 단어 경계 검사 (`(?![A-Za-z0-9_가-힣])`) 도 같이 바꿔야 rename/delete 안전.

## Testing

```bash
npm run lint   # node --check on every .js (36+ files)
npm test       # smoke check: 38 assets/API/contract
```

The smoke test boots a sibling server on port 3778, hits 38 endpoints (HTML,
manifest, SW, icons, every JS module, the API JSON contract for /api/health,
/api/agents, CORS header, custom 404), and verifies status + payload keywords.
CI-friendly exit codes:

- `0` — all pass
- `1` — one or more failures
- `2` — server failed to start
- `3` — test harness crash

Add new modules to the `SHELL` list when you introduce one. CI runs both
`npm run lint` and `npm test` on Node 18 / 20 / 22.

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
- **태그 캐시 정합** — 메모 (`ai-tycoon-agent-notes`) 를 `setAgentNote` 가 아닌
  경로로 직접 수정한다면 `window.aiTycoonInvalidateTagCache()` 호출 필수.
  안 그러면 1초간 stale 태그 리스트가 사이드바·카드·팔레트에 그려짐.
- **prefers-reduced-motion**: respected for confetti, splash, tip cards,
  konami, empty CTA, mini-map. New animated elements should check the media
  query.

## License

MIT. Contributions are accepted under the same license.
