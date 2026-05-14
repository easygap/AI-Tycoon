// ============================================================
//  AI TYCOON — Privacy mode
// ============================================================
//
// One-tap toggle that blurs project names, prompts, task subjects,
// and the activity log so users can safely screen-share, demo,
// or record without leaking work-in-progress details.
//
// Implementation: adds a `privacy-mode` class to <body>. CSS rules
// in style.css apply `filter: blur(4px)` to elements tagged with
// `data-privacy` or known sensitive selectors (.agent-card-project,
// .detail-work-preview, etc.). A small floating badge in the
// bottom-right reminds the user they're in privacy mode.
//
// Hotkey: Shift+P toggles. Toggle state persists in localStorage.

const KEY = "ai-tycoon-privacy-mode";
let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";

function ensureBadge() {
    let badge = document.getElementById("privacy-badge");
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = "privacy-badge";
    badge.className = "privacy-badge";
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-live", "polite");
    badge.innerHTML = `
        <iconify-icon icon="solar:eye-closed-bold" aria-hidden="true"></iconify-icon>
        <span class="privacy-badge-text">프라이버시 모드</span>
        <button type="button" class="privacy-badge-close" aria-label="프라이버시 모드 끄기">×</button>
    `;
    badge.querySelector(".privacy-badge-close").addEventListener("click", () => setEnabled(false));
    document.body.appendChild(badge);
    return badge;
}

function applyClass() {
    document.body?.classList?.toggle("privacy-mode", enabled);
    if (enabled) {
        const badge = ensureBadge();
        requestAnimationFrame(() => badge.classList.add("is-shown"));
    } else {
        const badge = document.getElementById("privacy-badge");
        if (badge) {
            badge.classList.remove("is-shown");
            setTimeout(() => badge.remove(), 240);
        }
    }
}

export function isPrivacyEnabled() { return enabled; }

export function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
    applyClass();
    // 업적: 한 번이라도 켜본 적 있으면 플래그 박아둠
    if (enabled) {
        try { window.aiTycoonAchievements?.setFlag?.("privacyEverOn", true); } catch { /* ignore */ }
    }
    // Tell the cross-tab sync layer about it
    try {
        window.dispatchEvent(new CustomEvent("ai-tycoon-privacy-change", { detail: { enabled } }));
    } catch { /* ignore */ }
    // In-app toast feedback (non-blocking)
    try {
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const title = enabled
            ? (lang === "en" ? "Privacy mode on" : "프라이버시 모드 ON")
            : (lang === "en" ? "Privacy mode off" : "프라이버시 모드 OFF");
        const body = enabled
            ? (lang === "en" ? "Prompts & project names blurred" : "프롬프트와 프로젝트명을 흐리게 표시해요")
            : (lang === "en" ? "Showing full details" : "원래대로 모두 표시됩니다");
        window.aiTycoonToasts?.show?.("info", title, body);
    } catch { /* ignore */ }
}

export function toggle() { setEnabled(!enabled); }

// ── Apply on load + hotkey ──
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyClass, { once: true });
    } else {
        applyClass();
    }
    document.addEventListener("keydown", (e) => {
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "P" || e.key === "p")) {
            // Don't hijack when typing
            const t = e.target;
            if (t && (t.matches?.("input, textarea, select") || t.isContentEditable)) return;
            // Don't override the plain "P" snapshot — only Shift+P
            // Note: snapshot uses lowercase "p" via keydown without shift; Shift+P is reserved here
            e.preventDefault();
            toggle();
        }
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonPrivacy = { isEnabled: isPrivacyEnabled, setEnabled, toggle };
}
