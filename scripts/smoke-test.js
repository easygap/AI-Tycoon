#!/usr/bin/env node
// AI Tycoon — smoke test
// Boots the server, makes a few HTTP requests, prints a green check.
// Run via `npm test`.  Exits 0 on success, non-zero on failure.

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const HOST = "localhost";
const PORT = 3778; // dedicated test port so it doesn't collide with dev server

const SHELL = [
    { url: "/", contains: "<title>AI Tycoon</title>", label: "index.html" },
    { url: "/api/health", contains: "\"ok\": true", label: "health endpoint" },
    { url: "/api/agents", contains: "\"agents\":", label: "agents endpoint" },
    { url: "/manifest.webmanifest", contains: "\"name\":", label: "manifest" },
    { url: "/sw.js", contains: "ai-tycoon-shell", label: "service worker" },
    { url: "/icons/icon.svg", contains: "<svg", label: "icon (svg)" },
    { url: "/icons/icon-maskable.svg", contains: "<svg", label: "icon (maskable)" },
    { url: "/style.css", contains: ".welcome-overlay", label: "style.css welcome rule" },
    { url: "/js/main.js", contains: "import", label: "main.js" },
    { url: "/js/state.js", contains: "export const S", label: "state.js" },
    { url: "/js/renderer.js", contains: "export function render", label: "renderer.js" },
    { url: "/js/pixiOverlay.js", contains: "initPixiOverlay", label: "pixiOverlay.js" },
    { url: "/js/timeOfDay.js", contains: "export function getSkyPalette", label: "timeOfDay.js" },
    { url: "/js/npcs.js", contains: "export function drawNPCs", label: "npcs.js" },
    { url: "/js/seasons.js", contains: "export function drawSeasonal", label: "seasons.js" },
    { url: "/js/i18n.js", contains: "DICT", label: "i18n.js dict" },
    { url: "/js/stats.js", contains: "recordStateSnapshot", label: "stats.js" },
    { url: "/js/achievements.js", contains: "ACHIEVEMENTS", label: "achievements.js" },
    { url: "/js/sound.js", contains: "sfxJoin", label: "sound.js" },
    { url: "/js/notifications.js", contains: "notifyPermission", label: "notifications.js" },
    { url: "/js/snapshot.js", contains: "buildSnapshotDataURL", label: "snapshot.js" },
    { url: "/js/perfHud.js", contains: "togglePerfHud", label: "perfHud.js" },
    { url: "/js/tips.js", contains: "TIPS", label: "tips.js" },
    { url: "/js/miniMap.js", contains: "MAP_W", label: "miniMap.js" },
    { url: "/js/backup.js", contains: "buildBackup", label: "backup.js" },
    { url: "/js/toasts.js", contains: "showToast", label: "toasts.js" },
    { url: "/js/tour.js", contains: "startTour", label: "tour.js" },
    { url: "/js/demoMode.js", contains: "startDemo", label: "demoMode.js" },
    { url: "/js/crossTab.js", contains: "BroadcastChannel", label: "crossTab.js" },
    { url: "/js/konami.js", contains: "SEQUENCE", label: "konami.js" },
    { url: "/js/awaySummary.js", contains: "isAwaySummaryEnabled", label: "awaySummary.js" },
    { url: "/js/commandPalette.js", contains: "command-palette-overlay", label: "commandPalette.js" },
    { url: "/js/privacyMode.js", contains: "isPrivacyEnabled", label: "privacyMode.js" },
    { url: "/nope-404-test", contains: "Not found", label: "custom 404", expectStatus: 404 },
];

function request(urlPath) {
    return new Promise((resolve, reject) => {
        const req = http.get({ host: HOST, port: PORT, path: urlPath, timeout: 5000 }, res => {
            let buf = "";
            res.setEncoding("utf8");
            res.on("data", chunk => { buf += chunk; });
            res.on("end", () => resolve({ status: res.statusCode, body: buf, headers: res.headers }));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(new Error("timeout")); });
    });
}

async function waitForServer(maxMs = 7000) {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
        try {
            await request("/");
            return true;
        } catch { /* keep trying */ }
        await new Promise(r => setTimeout(r, 200));
    }
    return false;
}

async function main() {
    process.stdout.write("AI Tycoon smoke test\n────────────────────────\n");

    const server = spawn("node", ["server.js"], {
        cwd: path.resolve(__dirname, ".."),
        env: { ...process.env, PORT: String(PORT) },
        stdio: ["ignore", "pipe", "pipe"],
    });
    let serverErr = "";
    server.stderr.on("data", d => { serverErr += d.toString(); });
    // Swallow stdout so the test output is clean
    server.stdout.on("data", () => {});

    const ready = await waitForServer();
    if (!ready) {
        process.stderr.write(`Server did not become ready.\n${serverErr}\n`);
        server.kill();
        process.exit(2);
    }

    let failed = 0;
    for (const c of SHELL) {
        try {
            const res = await request(c.url);
            const expectStatus = c.expectStatus || 200;
            const ok = res.status === expectStatus && (c.contains ? res.body.includes(c.contains) : true);
            process.stdout.write(`${ok ? "✔" : "✘"}  [${res.status}] ${c.label.padEnd(28)} ${c.url}\n`);
            if (!ok) failed++;
        } catch (err) {
            process.stdout.write(`✘  [---] ${c.label.padEnd(28)} ${c.url}  (${err.message})\n`);
            failed++;
        }
    }

    // ── Deep API contract checks ──
    // /api/health JSON shape
    try {
        const res = await request("/api/health");
        const data = JSON.parse(res.body);
        const required = ["ok", "version", "startedAt", "uptimeMs", "nodeVersion", "platform", "clients", "agents", "pollIntervalMs"];
        const missing = required.filter(k => !(k in data));
        const agentsShape = data.agents && typeof data.agents === "object" && "total" in data.agents && "running" in data.agents;
        const okShape = data.ok === true && missing.length === 0 && agentsShape && typeof data.version === "string";
        process.stdout.write(`${okShape ? "✔" : "✘"}  [api] /api/health JSON shape (v=${data.version}, agents.total=${data.agents?.total})\n`);
        if (!okShape) {
            if (missing.length) process.stdout.write(`    missing fields: ${missing.join(", ")}\n`);
            failed++;
        }
    } catch (err) {
        process.stdout.write(`✘  [api] /api/health JSON parse failed: ${err.message}\n`);
        failed++;
    }
    // /api/agents JSON shape
    try {
        const res = await request("/api/agents");
        const data = JSON.parse(res.body);
        const okShape = data && data.ok === true && Array.isArray(data.agents) && typeof data.count === "number";
        process.stdout.write(`${okShape ? "✔" : "✘"}  [api] /api/agents JSON shape (count=${data?.count})\n`);
        if (!okShape) failed++;
    } catch (err) {
        process.stdout.write(`✘  [api] /api/agents JSON parse failed: ${err.message}\n`);
        failed++;
    }
    // CORS header on /api/agents
    try {
        const res = await request("/api/agents");
        const cors = res.headers["access-control-allow-origin"];
        const ok = cors === "*";
        process.stdout.write(`${ok ? "✔" : "✘"}  [api] /api/agents Access-Control-Allow-Origin = *\n`);
        if (!ok) failed++;
    } catch (err) {
        process.stdout.write(`✘  [api] CORS check failed: ${err.message}\n`);
        failed++;
    }
    const totalChecks = SHELL.length + 3;

    process.stdout.write("────────────────────────\n");
    process.stdout.write(`${totalChecks - failed}/${totalChecks} checks passed\n`);
    server.kill();
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
    process.stderr.write(`Smoke test crashed: ${err.stack || err.message}\n`);
    process.exit(3);
});
