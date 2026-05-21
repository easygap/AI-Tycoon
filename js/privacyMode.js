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
// Strict 모드: hover 해도 unblur 안 되는 강력 모드 (화면 녹화/스크린샷 안전).
// 기본은 false(=일반 프라이버시 모드)이며 토스트 모드 토글 시에는 그대로 둠.
// 사용자가 직접 `aiTycoonPrivacy.setStrict(true)` 호출하거나 Shift+P 를 빠르게 두 번 누르면 strict 전환.
const STRICT_KEY = "ai-tycoon-privacy-strict";
let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";
let strict = (typeof localStorage !== "undefined" && localStorage.getItem(STRICT_KEY)) === "true";

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
    document.body?.classList?.toggle("privacy-strict", enabled && strict);
    if (enabled) {
        const badge = ensureBadge();
        requestAnimationFrame(() => badge.classList.add("is-shown"));
        // strict 일 때 배지 텍스트 살짝 강조
        const text = badge.querySelector(".privacy-badge-text");
        if (text) text.textContent = strict ? "프라이버시 (Strict)" : "프라이버시 모드";
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

export function isStrict() { return strict; }
export function setStrict(v) {
    strict = !!v;
    try { localStorage.setItem(STRICT_KEY, strict ? "true" : "false"); } catch { /* ignore */ }
    // strict 켤 때 자동으로 일반 프라이버시도 켬
    if (strict && !enabled) {
        setEnabled(true);
        return;
    }
    applyClass();
    try {
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const title = strict
            ? (lang === "en" ? "Strict privacy on" : "Strict 프라이버시 ON")
            : (lang === "en" ? "Strict privacy off" : "Strict 프라이버시 OFF");
        const body = strict
            ? (lang === "en" ? "Hover-to-reveal disabled — safe for recording" : "호버 미리보기 차단 — 화면 녹화/공유 안전")
            : (lang === "en" ? "Hover-to-reveal restored" : "호버 미리보기 복구");
        window.aiTycoonToasts?.show?.("info", title, body);
    } catch { /* ignore */ }
}

// ── Apply on load + hotkey ──
if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyClass, { once: true });
    } else {
        applyClass();
    }
    // Shift+P 한 번: 일반 토글 / 600ms 안에 한 번 더: Strict 모드 토글
    let _lastShiftP = 0;
    document.addEventListener("keydown", (e) => {
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "P" || e.key === "p")) {
            const t = e.target;
            if (t && (t.matches?.("input, textarea, select") || t.isContentEditable)) return;
            e.preventDefault();
            const now = Date.now();
            if (now - _lastShiftP < 600) {
                // 빠른 더블 — strict 토글
                setStrict(!strict);
                _lastShiftP = 0;
            } else {
                _lastShiftP = now;
                toggle();
            }
        }
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonPrivacy = { isEnabled: isPrivacyEnabled, setEnabled, toggle, isStrict, setStrict };
}
