// ============================================================
//  AI TYCOON — In-app toast notifications
// ============================================================
//
// Small slide-in cards in the top-right that announce noteworthy
// events (join / leave / task done / review request) for users who
// have the tab visible.  Complements js/notifications.js (which
// fires OS-level alerts only when the tab is in the background).
//
// Rate-limited per-kind, dismissible, auto-fade after 5 seconds.

const KEY = "ai-tycoon-toasts";
const MAX_STACK = 3;
const TTL_MS = 5200;
const COOLDOWN_MS = 800; // per kind to avoid spam
const lastByKind = new Map();
const stack = [];

let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) !== "false";

const KIND_META = {
    join:      { icon: "solar:login-2-bold",          color: "#10b981", bg: "rgba(16,185,129,0.95)" },
    leave:     { icon: "solar:logout-2-bold",         color: "#94a3b8", bg: "rgba(100,116,139,0.95)" },
    "task-done": { icon: "solar:check-circle-bold",   color: "#0ea5e9", bg: "rgba(14,165,233,0.95)" },
    review:    { icon: "solar:bell-bold",             color: "#f97316", bg: "rgba(249,115,22,0.95)" },
    info:      { icon: "solar:info-circle-bold",      color: "#a78bfa", bg: "rgba(167,139,250,0.95)" },
};

function ensureStack() {
    let el = document.getElementById("toast-stack");
    if (el) return el;
    el = document.createElement("div");
    el.id = "toast-stack";
    el.className = "toast-stack";
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
    return el;
}

export function isToastsEnabled() { return enabled; }
export function setToastsEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
}

export function showToast(kind, title, body) {
    if (!enabled) return;
    if (typeof document === "undefined") return;
    // Skip if user hasn't interacted yet (avoids flooding on initial state push)
    const now = Date.now();
    const cooldownKey = `${kind}:${title}`;
    const last = lastByKind.get(cooldownKey) || 0;
    if (now - last < COOLDOWN_MS) return;
    lastByKind.set(cooldownKey, now);

    const meta = KIND_META[kind] || KIND_META.info;
    const root = ensureStack();

    // Evict oldest if at max
    while (stack.length >= MAX_STACK) {
        const old = stack.shift();
        if (old?.parentNode) {
            old.classList.remove("is-shown");
            setTimeout(() => old.remove(), 300);
        }
    }

    const card = document.createElement("div");
    card.className = "toast-card";
    card.style.setProperty("--toast-color", meta.color);
    card.innerHTML = `
        <span class="toast-icon" style="background:${meta.bg}"><iconify-icon icon="${meta.icon}" aria-hidden="true"></iconify-icon></span>
        <div class="toast-body">
            <div class="toast-title">${escapeHtml(title || "")}</div>
            ${body ? `<div class="toast-text">${escapeHtml(body)}</div>` : ""}
        </div>
        <button type="button" class="toast-close" aria-label="Dismiss">×</button>
    `;
    card.querySelector(".toast-close").addEventListener("click", () => {
        card.classList.remove("is-shown");
        setTimeout(() => card.remove(), 240);
        const i = stack.indexOf(card);
        if (i >= 0) stack.splice(i, 1);
    });
    root.appendChild(card);
    stack.push(card);
    requestAnimationFrame(() => card.classList.add("is-shown"));
    setTimeout(() => {
        card.classList.remove("is-shown");
        setTimeout(() => card.remove(), 240);
        const i = stack.indexOf(card);
        if (i >= 0) stack.splice(i, 1);
    }, TTL_MS);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

if (typeof window !== "undefined") {
    window.aiTycoonToasts = {
        show: showToast,
        isEnabled: isToastsEnabled,
        setEnabled: setToastsEnabled,
    };
}
