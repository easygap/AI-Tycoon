// ============================================================
//  AI TYCOON — Cross-tab state sync (BroadcastChannel)
// ============================================================
//
// When the user opens AI Tycoon in multiple tabs (e.g. main monitor
// + side panel), changes to user preferences propagate live across
// all open tabs without a reload.  Falls back to localStorage events
// for browsers that don't expose BroadcastChannel.
//
// Synced preferences:
//   • dark mode, language, pixi density, office theme, sound on/off
//     + volume, notifications, demo mode, season override, time-of-day
//     override, perfHud, tour/tip dismissal, pinned agents
//
// Stats and achievements deliberately NOT synced — they are inherently
// device-local in a localStorage model.

const CHANNEL = "ai-tycoon-prefs";
const SYNCED_KEYS = new Set([
    "ai-tycoon-dark",
    "ai-tycoon-lang",
    "ai-tycoon-pixi-density",
    "ai-tycoon-theme",
    "ai-tycoon-sound",
    "ai-tycoon-sound-volume",
    "ai-tycoon-notify",
    "ai-tycoon-demo",
    "ai-tycoon-season",
    "ai-tycoon-time-override",
    "ai-tycoon-perfhud",
    "ai-tycoon-tour-done",
    "ai-tycoon-tips-dismissed-v1",
    "ai-tycoon-welcomed-v1",
    "ai-tycoon-pinned-agents",
    "ai-tycoon-pinned-pids",
    "ai-tycoon-filter",
    "ai-tycoon-platform",
    "ai-tycoon-action-filter",
    "ai-tycoon-sort",
    "ai-tycoon-agent-search",
    "ai-tycoon-director",
]);

let channel = null;
let originalSetItem = null;
let originalRemoveItem = null;
let echoBlock = false;  // prevent rebroadcasting changes we just received

function broadcast(kind, key, value) {
    if (!channel) return;
    try { channel.postMessage({ kind, key, value, ts: Date.now() }); }
    catch (err) { void err; }
}

function applyKeyChange(key, value) {
    // Already wrote to localStorage in receiver; now sync the in-memory state.
    echoBlock = true;
    try {
        switch (key) {
            case "ai-tycoon-dark": {
                const isDark = value === "true";
                document.body.classList.toggle("dark", isDark);
                const icon = document.getElementById("dark-icon");
                if (icon) icon.setAttribute("icon", isDark ? "solar:sun-linear" : "solar:moon-linear");
                break;
            }
            case "ai-tycoon-lang":
                if (window.aiTycoonI18n) window.aiTycoonI18n.setLang(value === "en" ? "en" : "ko");
                break;
            case "ai-tycoon-theme":
                if (window.aiTycoonForceRepaint) window.aiTycoonForceRepaint();
                break;
            case "ai-tycoon-sound":
                if (window.aiTycoonSound) window.aiTycoonSound.setEnabled(value === "true");
                break;
            case "ai-tycoon-sound-volume": {
                const f = parseFloat(value);
                if (window.aiTycoonSound && Number.isFinite(f)) window.aiTycoonSound.setVolume(f);
                break;
            }
            case "ai-tycoon-notify":
                // Don't auto-enable on receiving tab (could surprise the user)
                // but reflect the on/off bit in UI
                if (window.aiTycoonNotify) {
                    const enabled = value === "true";
                    // Use private setter that doesn't ask for permission
                    try { window.aiTycoonNotify.setEnabled(enabled); } catch { /* ignore */ }
                }
                break;
            case "ai-tycoon-demo":
                if (window.aiTycoonDemo) window.aiTycoonDemo.setEnabled(value === "true");
                break;
            case "ai-tycoon-perfhud":
                if (window.aiTycoonPerfHud) window.aiTycoonPerfHud.setEnabled(value === "true");
                break;
            case "ai-tycoon-tips-dismissed-v1":
                if (value === "true" && window.aiTycoonTips) window.aiTycoonTips.dismiss();
                break;
        }
    } catch (err) {
        console.warn("[ai-tycoon] cross-tab apply failed:", err);
    } finally {
        echoBlock = false;
    }
}

function startBroadcastChannel() {
    if (typeof BroadcastChannel === "undefined") return false;
    try {
        channel = new BroadcastChannel(CHANNEL);
        channel.onmessage = (e) => {
            const msg = e.data;
            if (!msg || !msg.kind) return;
            if (msg.kind === "set" && SYNCED_KEYS.has(msg.key)) {
                echoBlock = true;
                try {
                    if (msg.value == null) localStorage.removeItem(msg.key);
                    else localStorage.setItem(msg.key, msg.value);
                } finally {
                    echoBlock = false;
                }
                applyKeyChange(msg.key, msg.value);
            }
        };
        return true;
    } catch (err) {
        console.warn("[ai-tycoon] BroadcastChannel unavailable:", err);
        return false;
    }
}

function startStorageFallback() {
    // 'storage' fires only in OTHER tabs (not the one that set the key),
    // perfect cross-tab signal.
    window.addEventListener("storage", (e) => {
        if (!e.key || !SYNCED_KEYS.has(e.key)) return;
        applyKeyChange(e.key, e.newValue);
    });
}

function patchLocalStorage() {
    if (originalSetItem) return;
    originalSetItem = localStorage.setItem.bind(localStorage);
    originalRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = (key, value) => {
        originalSetItem(key, value);
        if (echoBlock) return;
        if (SYNCED_KEYS.has(key)) broadcast("set", key, value);
    };
    localStorage.removeItem = (key) => {
        originalRemoveItem(key);
        if (echoBlock) return;
        if (SYNCED_KEYS.has(key)) broadcast("set", key, null);
    };
}

if (typeof window !== "undefined") {
    startBroadcastChannel();
    startStorageFallback();
    patchLocalStorage();
    window.aiTycoonCrossTab = {
        keys: () => [...SYNCED_KEYS],
        broadcast: (key, value) => broadcast("set", key, value),
    };
}
