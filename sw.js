// AI Tycoon — minimal service worker
// Caches the static shell so the dashboard still opens offline,
// then falls back to network for everything else.

const VERSION = "ai-tycoon-shell-v37";
const SHELL_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/css/tailwind.generated.css",
    "/manifest.webmanifest",
    "/icons/icon.png",
    "/icons/icon.ico",
    "/icons/icon.svg",
    "/icons/icon-maskable.svg",
    "/js/main.js",
    "/js/state.js",
    "/js/constants.js",
    "/js/ws.js",
    "/js/renderer.js",
    "/js/panel.js",
    "/js/pixiOverlay.js",
    "/js/agentPriority.js",
    "/js/i18n.js",
    "/js/stats.js",
    "/js/sound.js",
    "/js/notifications.js",
    "/js/achievements.js",
    "/js/demoMode.js",
    "/js/snapshot.js",
    "/js/timeOfDay.js",
    "/js/npcs.js",
    "/js/seasons.js",
    "/js/perfHud.js",
    "/js/tips.js",
    "/js/miniMap.js",
    "/js/backup.js",
    "/js/toasts.js",
    "/js/tour.js",
    "/js/crossTab.js",
    "/js/konami.js",
    "/js/awaySummary.js",
    "/js/commandPalette.js",
    "/js/privacyMode.js",
    "/js/standupExport.js",
];

self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(VERSION).then((cache) =>
            // Use addAll w/ catch so a single asset miss doesn't fail the whole install
            Promise.allSettled(SHELL_ASSETS.map(p => cache.add(p).catch(() => null)))
        )
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Bypass WebSocket upgrades & non-GET
    if (req.method !== "GET") return;
    if (req.url.startsWith("ws://") || req.url.startsWith("wss://")) return;

    const url = new URL(req.url);
    // Same-origin shell: cache-first
    if (url.origin === self.location.origin && SHELL_ASSETS.some(p => url.pathname === p)) {
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(resp => {
                if (resp && resp.status === 200) {
                    const copy = resp.clone();
                    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
                }
                return resp;
            }).catch(() => caches.match("/index.html")))
        );
        return;
    }

    // Network-first for everything else, fall back to cache then offline page
    event.respondWith(
        fetch(req).then(resp => {
            // Cache static cross-origin (Pretendard / Iconify / Pixi) GETs
            if (resp && resp.status === 200 && resp.type === "basic") {
                const copy = resp.clone();
                caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
            }
            return resp;
        }).catch(() => caches.match(req).then(c => c || caches.match("/index.html")))
    );
});
