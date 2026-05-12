// ============================================================
//  AI TYCOON — Performance HUD (dev/debug overlay)
// ============================================================
//
// Toggle with Ctrl/Cmd + Shift + P.  Sticks to the lower-left and
// reports rolling FPS, agent counts, Pixi density, and memory hints
// without spamming the console.
//
// Free of dependencies on the rest of the runtime — reads only:
//   • performance.now() for frame timing
//   • window.aiTycoonAgents (set by ws.js)
//   • window.getPixiOverlayDebug?.() (re-exported by pixiOverlay)

const KEY = "ai-tycoon-perfhud";

let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";
let last = performance.now();
const samples = new Array(60).fill(16.67);
let sampleIdx = 0;
let el = null;
let rafId = null;

function ensureEl() {
    if (el) return el;
    el = document.createElement("div");
    el.id = "perf-hud";
    el.className = "perf-hud";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
}

function loop() {
    if (!enabled) return;
    const now = performance.now();
    const delta = now - last;
    last = now;
    samples[sampleIdx] = delta;
    sampleIdx = (sampleIdx + 1) % samples.length;

    // Update display roughly every 8 frames
    if ((sampleIdx & 7) === 0) {
        let sum = 0;
        let max = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i];
            if (samples[i] > max) max = samples[i];
        }
        const avg = sum / samples.length;
        const fps = avg > 0 ? Math.min(120, 1000 / avg) : 0;
        const slow = max > 33 ? "slow" : (max > 20 ? "mid" : "fast");

        const debug = (typeof window !== "undefined" && window.aiTycoonOverlayDebug && window.aiTycoonOverlayDebug()) || {};
        const agents = (typeof window !== "undefined" && window.__aiTycoonAgents) || [];
        const running = agents.filter(a => a.isRunning).length;
        const total = agents.length;

        const memMB = (window.performance?.memory?.usedJSHeapSize / (1024 * 1024)).toFixed(0);

        const e = ensureEl();
        e.innerHTML = `
            <div class="perf-row perf-row-main">
                <span class="perf-fps perf-${slow}">${fps.toFixed(1)} fps</span>
                <span class="perf-delim">·</span>
                <span class="perf-avg">${avg.toFixed(1)} ms avg</span>
                <span class="perf-delim">·</span>
                <span class="perf-max">${max.toFixed(1)} max</span>
            </div>
            <div class="perf-row">
                <span>agents <strong>${running}/${total}</strong></span>
                <span class="perf-delim">·</span>
                <span>density <strong>${debug.density || "?"}</strong></span>
                ${debug.spriteCount != null ? `<span class="perf-delim">·</span><span>sprites <strong>${debug.spriteCount}</strong></span>` : ""}
            </div>
            ${memMB && memMB !== "NaN" ? `<div class="perf-row perf-mem">heap ${memMB} MB</div>` : ""}
            <div class="perf-row perf-hint">Ctrl+Shift+P to toggle</div>
        `;
    }
    rafId = requestAnimationFrame(loop);
}

export function isPerfHudEnabled() { return enabled; }
export function setPerfHudEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
    const e = ensureEl();
    e.hidden = !enabled;
    if (enabled) {
        last = performance.now();
        if (rafId == null) rafId = requestAnimationFrame(loop);
    } else if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}
export function togglePerfHud() { setPerfHudEnabled(!enabled); }

if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        const e = ensureEl();
        e.hidden = !enabled;
        if (enabled) {
            last = performance.now();
            rafId = requestAnimationFrame(loop);
        }
    });
    // Wire shortcut
    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
            event.preventDefault();
            togglePerfHud();
        }
    });
    window.aiTycoonPerfHud = { isEnabled: isPerfHudEnabled, toggle: togglePerfHud, setEnabled: setPerfHudEnabled };
}
