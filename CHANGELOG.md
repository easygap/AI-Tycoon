# Changelog

All notable changes to AI Tycoon. Versions follow loose semantic versioning;
each iteration below corresponds to one commit / feature drop.

## [Unreleased]

### Iteration 27 — HUD visibility toggles · CHANGELOG sync
- Toggle live HUD and work-stream overlays from Settings → Appearance
- Both persisted in localStorage + cross-tab synced
- KO/EN labels

### Iteration 26 — Time-scrub slider · GitHub help links
- Settings → Demo: time scrubber slider (0-1439 minutes, 5-min steps)
- Slider icon auto-shifts: moon-stars → cloudy-sun → sun → sunset → moon
- Bidirectional sync with time input + "real-time" reset
- Settings → Help: GitHub repo link + bug-report link
- Anchor styling compatible with `.settings-action`

### Iteration 25 — Sakura + Ocean themes · CI workflow
- 6 office themes total (Classic / Cafe / Forest / Midnight / Sakura / Ocean)
- Sakura: cherry-blossom pinks + ivory floor + green plants
- Ocean: teal/cyan with deep-blue dark mode
- GitHub Actions CI on push/PR for Node 18/20/22 (`npm test`)
- README badges (CI, MIT, Node ≥18, PWA)
- `.gitignore` expanded (editor/OS/test/env), `engines.node = ">=18"`

### Iteration 22 — Console branding · Konami egg · friendly 404
- Boot banner in DevTools console with helper-API hints
- ↑↑↓↓←→←→BA easter egg — 60-piece confetti + body filter shift + Hidden achievement (21 total)
- Friendly 404 HTML page with "back to office" CTA; JSON fallback for non-HTML requests
- Smoke test grew to **30 checks**

### Iteration 21 — Empty-state Try-Demo CTA
- Centered card overlay when no agents detected
- One-click "Start demo" button + ambient glow pulse
- KO/EN, dark mode, mobile, reduced-motion friendly

### Iteration 20 — `/api/health` · About panel · clickable toasts
- New `GET /api/health` JSON endpoint (version, uptime, agents, diagnostics)
- About section in Settings — live-fetched server info
- Toasts carry `pid` → clicking jumps the camera to that agent

### Iteration 19 — Project drill-down modal · 20 achievements
- New project drill-down modal: stats, platforms, agent list, recent tasks
- 6 new achievements: century, marathon-week, snapshot-taker, customizer, project-curious (+konami later)
- Click any project chip in Insights to open

### Iteration 18 — Office dog NPC · WebSocket quality
- Roaming corgi in the lounge with sit/wag/bark behaviour
- Heartbeat-gap based connection quality indicator: good / fair / poor

### Iteration 17 — Cross-tab sync · brand mark animation
- BroadcastChannel + storage fallback syncs 21 preference keys between open tabs
- Header brand mark: hover rotate + sequential blink

### Iteration 16 — Sunrise/sunset birds · Replay tour/tips
- 5 bird silhouettes drift across windows at dawn / golden hour / sunset
- Settings "Replay tour" and "Show tips again" buttons

### Iteration 15 — `npm test` smoke test
- 28-check smoke test bootstraps server, verifies assets + modules
- Exit codes 0/1/2/3 for CI

### Iteration 14 — In-app toasts · onboarding spotlight tour
- Slide-in toast cards for join/leave/task-done/review
- 4-step spotlight tour after welcome dismissal (one-time)

### Iteration 13 — Backup/restore · README rewrite
- JSON export/import of every `ai-tycoon-*` localStorage key
- README KO + EN sections rewritten with full feature matrix

### Iteration 12 — Mini-map · achievement badge
- Office mini-map appears when zoomed in ≥1.1x; click-to-pan
- Unseen-achievement counter on header chart icon

### Iteration 11 — Performance HUD · "Did you know?" tips
- Ctrl+Shift+P toggle for FPS / heap / density overlay
- 10-tip rotating hint card (5s show, 30s rotate)

### Iteration 10 — PWA · chart tooltips · theme fade
- `manifest.webmanifest` + service worker + install button
- Rich hover tooltips on 7-day chart + heatmap
- Theme transition fade animation

### Iteration 9 — Office themes · seasonal decor
- 4 themes: Classic / Cafe / Forest / Midnight
- Auto decorations: Christmas tree + snow (Dec), pumpkin + spider web (Oct-Nov), cherry blossoms (Mar-Apr)

### Iteration 8 — PNG snapshot · clickable activity feed
- `P` hotkey saves the canvas + Pixi composite as PNG
- Insights activity rows are buttons that focus the agent

### Iteration 7 — Splash · confetti · hourly heatmap
- Branded splash before main.js boots
- Confetti burst on achievement unlock
- 24-hour activity heatmap in Insights

### Iteration 6 — Demo mode · security guard NPC
- Toggle 6-8 synthetic agents for screenshots / showcases
- Night-only patrolling guard with torch cone (21:00–05:59)

### Iteration 5 — Settings modal · notifications · sound volume
- Consolidated Settings (`,` hotkey): dark / lang / density / sound / notify / time / data
- Desktop Notification API integration for background tabs
- Sound volume slider + persisted

### Iteration 4 — Achievements · README EN section
- 14 unlock-able badges with localStorage persistence + popups
- README gains a proper 🇺🇸 English overview

### Iteration 3 — KO/EN i18n · daily stats persistence · sound effects
- 70+ strings translated, globe button toggle
- 14-day localStorage stats history; 7-day trend chart
- Optional Web Audio chimes for join/leave/done/review

### Iteration 2 — Insights modal · shortcuts modal · delivery NPC
- Insights modal (`I` hotkey): stats, platforms, projects, status distribution, recent feed
- Keyboard cheatsheet (`?`)
- Delivery courier NPC visits desks intermittently
- Floor zone differentiation (work area wood / lounge parquet)

### Iteration 1 — Time-of-day sky · NPCs · welcome card
- Dawn/day/sunset/night gradient sky in office windows with sun + moon + stars
- Pixi ambient tint + rain weather
- Cleaning robot, paper airplane, sleeping lounge cat
- First-run welcome card, improved empty state, time-of-day band

## Pre-launch (prior to iteration log)
- WebSocket-based dashboard with auto-detection of Claude Code, Cursor, Codex,
  Ollama, LM Studio, Copilot, Jan, GPT4All
- Canvas 2D office renderer + PixiJS effects overlay
- Side panel with agents list, detail view, boss review queue
