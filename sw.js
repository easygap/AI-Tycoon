// AI Tycoon — minimal service worker
// Caches the static shell so the dashboard still opens offline,
// then falls back to network for everything else.

const VERSION = "ai-tycoon-shell-v59";
const SHELL_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/css/tailwind.generated.css",
    "/css/studio-2026.css",
    "/assets/fonts/SUIT-Variable.woff2",
    "/assets/fonts/Galmuri11.woff2",
    "/assets/fonts/WantedSansVariable.woff2",
    "/assets/vendor/iconify-icon.min.js",
    "/assets/vendor/solar-icons.js",
    "/assets/vendor/pixi.min.js",
    "/manifest.webmanifest",
    "/icons/icon.png",
    "/icons/icon.ico",
    "/icons/icon.svg",
    "/icons/icon-maskable.svg",
    "/icons/brand-symbol.svg",
    "/js/main.js",
    "/js/state.js",
    "/js/constants.js",
    "/js/ws.js",
    "/js/renderer.js",
    "/js/characters.js",
    "/js/panel.js",
    "/js/pixiOverlay.js",
    "/js/agentPriority.js",
    "/js/contentDirector.js",
    "/js/i18n.js",
    "/js/stats.js",
    "/js/sound.js",
    "/js/soundScore.js",
    "/js/atmosphere.js",
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
    event.waitUntil(
        // A partial shell must not replace a working installation.
        caches.open(VERSION).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter(k => k.startsWith("ai-tycoon-shell-") && k !== VERSION).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Bypass WebSocket upgrades & non-GET
    if (req.method !== "GET") return;
    if (req.url.startsWith("ws://") || req.url.startsWith("wss://")) return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) {
        // Live session data belongs to the server, never the static asset cache.
        event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ ok: false, error: "offline" }), {
            status: 503, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        })));
        return;
    }
    // Same-origin shell: cache-first
    if (url.origin === self.location.origin && SHELL_ASSETS.some(p => url.pathname === p)) {
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(resp => {
                if (resp && resp.status === 200) {
                    const copy = resp.clone();
                    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
                }
                return resp;
            }).catch(() => req.mode === "navigate" ? caches.match("/index.html") : Response.error()))
        );
        return;
    }

    // Only navigations get an HTML fallback; missing scripts never receive HTML.
    if (req.mode === "navigate") event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
});
