// ============================================================
//  AI TYCOON — Desktop notifications (Web Notifications API)
// ============================================================
//
// Opt-in: user must grant browser permission AND flip the toggle.
// Throttled so we never fire more than one notification per 4 sec
// per "kind" key.

const KEY = "ai-tycoon-notify";
let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";
const lastFiredByKind = new Map();
const THROTTLE_MS = 4000;
const listeners = new Set();

export function isNotifyEnabled() { return enabled; }
export function notifyPermission() {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
}

export async function setNotifyEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") {
                enabled = false;
                try { localStorage.setItem(KEY, "false"); } catch { /* ignore */ }
            }
        } catch (err) { void err; enabled = false; }
    }
    listeners.forEach(fn => { try { fn(enabled); } catch { /* ignore */ } });
    return enabled;
}

export function toggleNotify() { return setNotifyEnabled(!enabled); }
export function onNotifyChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Fire a notification. Skipped if tab is focused (avoid double signal). */
export function notify(kind, title, body, opts = {}) {
    if (!enabled) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    // Don't disturb when user is already watching the tab
    if (typeof document !== "undefined" && document.visibilityState === "visible" && !opts.alsoWhenVisible) return;

    const now = Date.now();
    const last = lastFiredByKind.get(kind) || 0;
    if (now - last < THROTTLE_MS) return;
    lastFiredByKind.set(kind, now);

    try {
        const n = new Notification(title, {
            body,
            icon: opts.icon || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23D97757' rx='20' width='100' height='100'/%3E%3Crect x='24' y='30' width='52' height='48' rx='8' fill='%23FFFFFF'/%3E%3Crect x='42' y='58' width='16' height='20' rx='3' fill='%23D97757'/%3E%3C/svg%3E",
            tag: opts.tag || kind,
            silent: opts.silent || false,
        });
        n.onclick = () => {
            try {
                window.focus();
                if (opts.onClick) opts.onClick();
            } catch { /* ignore */ }
            n.close();
        };
        // Auto-close after 6s
        setTimeout(() => { try { n.close(); } catch { /* ignore */ } }, 6000);
    } catch (err) { void err; }
}

if (typeof window !== "undefined") {
    window.aiTycoonNotify = {
        isEnabled: isNotifyEnabled,
        permission: notifyPermission,
        toggle: toggleNotify,
        setEnabled: setNotifyEnabled,
        notify,
    };
}
