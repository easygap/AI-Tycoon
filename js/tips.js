// ============================================================
//  AI TYCOON — "Did you know?" rotating tip card
// ============================================================
//
// Small dismissible card that appears in the lower-left of the
// canvas, cycling through helpful hints every ~30 seconds.  Only
// shown for non-mobile widths and after the welcome card is gone.
// Persisted dismissal so it doesn't re-appear after the user closes it.

const DISMISS_KEY = "ai-tycoon-tips-dismissed-v1";
const INDEX_KEY = "ai-tycoon-tip-index";
const SHOW_AFTER_MS = 5000;        // wait 5s after page load
const ROTATE_EVERY_MS = 30000;     // change tip every 30s
const AUTO_HIDE_AFTER_MS = 12000;  // each tip shows for 12s then hides until next

const TIPS = [
    {
        icon: "solar:keyboard-linear",
        ko: { title: "키보드 단축키", body: "`?` 키로 모든 단축키를 한눈에 볼 수 있어요." },
        en: { title: "Keyboard shortcuts", body: "Press `?` to see every shortcut at a glance." },
    },
    {
        icon: "solar:chart-2-linear",
        ko: { title: "인사이트 살펴보기", body: "`I` 키로 오늘의 작업·플랫폼·시간대별 활동을 한번에 봐요." },
        en: { title: "Open insights", body: "Press `I` to see today's tasks, platforms and hourly activity." },
    },
    {
        icon: "solar:camera-linear",
        ko: { title: "스냅샷 저장", body: "`P` 키로 현재 작업실 풍경을 PNG로 저장합니다." },
        en: { title: "Save snapshot", body: "Press `P` to download the current office view as PNG." },
    },
    {
        icon: "solar:palette-linear",
        ko: { title: "오피스 테마", body: "설정에서 카페·숲속·심야 등 4가지 테마로 분위기를 바꿀 수 있어요." },
        en: { title: "Office themes", body: "Settings has four themes (Classic / Cafe / Forest / Midnight)." },
    },
    {
        icon: "solar:sun-2-linear",
        ko: { title: "시간대 라이팅", body: "창밖 하늘과 조명은 실제 시계를 따라가요. 황혼 즈음 들러보세요." },
        en: { title: "Time-of-day lighting", body: "The sky tracks your real clock — try at sunset for warm tones." },
    },
    {
        icon: "solar:user-plus-rounded-linear",
        ko: { title: "데모 모드", body: "AI 세션이 없을 때 설정 → 합성 직원으로 작업실을 미리 볼 수 있어요." },
        en: { title: "Demo mode", body: "No agents? Settings → Show synthetic staff fills the office." },
    },
    {
        icon: "solar:moon-stars-linear",
        ko: { title: "야간 순찰", body: "밤(21시~새벽) 시간대에는 보안이 사무실을 순찰합니다 👮" },
        en: { title: "Night patrol", body: "After 9pm, the security guard patrols the office 👮" },
    },
    {
        icon: "solar:medal-ribbons-star-linear",
        ko: { title: "업적 모으기", body: "작업실을 자주 켜고 다양한 AI를 써보면 14개 업적이 잠금 해제돼요." },
        en: { title: "Unlock achievements", body: "Use the dashboard regularly to unlock all 14 achievement badges." },
    },
    {
        icon: "solar:bell-linear",
        ko: { title: "백그라운드 알림", body: "설정 → 알림을 켜면 탭이 안 보일 때도 검토/완료 알림을 받아요." },
        en: { title: "Background alerts", body: "Enable desktop notifications in Settings for review/done events." },
    },
    {
        icon: "solar:download-linear",
        ko: { title: "앱처럼 설치", body: "브라우저가 지원하면 헤더 '설치' 버튼으로 데스크탑 앱처럼 띄울 수 있어요." },
        en: { title: "Install as app", body: "Supported browsers show an Install button to launch as a desktop app." },
    },
];

let visibleSinceLoad = false;
let currentIdx = parseInt(localStorage.getItem(INDEX_KEY) || "0", 10) || 0;
let rotateTimer = null;
let hideTimer = null;

function isDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === "true"; } catch { return false; }
}

function ensureContainer() {
    let el = document.getElementById("tip-card");
    if (el) return el;
    el = document.createElement("div");
    el.id = "tip-card";
    el.className = "tip-card";
    el.hidden = true;
    el.innerHTML = `
        <iconify-icon class="tip-icon" aria-hidden="true"></iconify-icon>
        <div class="tip-body">
            <div class="tip-kicker"></div>
            <div class="tip-title"></div>
            <div class="tip-text"></div>
        </div>
        <button type="button" class="tip-close" aria-label="Dismiss">×</button>
    `;
    el.querySelector(".tip-close").addEventListener("click", () => {
        try { localStorage.setItem(DISMISS_KEY, "true"); } catch { /* ignore */ }
        hideTip(true);
    });
    document.body.appendChild(el);
    return el;
}

function renderTip(idx) {
    const el = ensureContainer();
    const tip = TIPS[idx % TIPS.length];
    const lang = (window.aiTycoonI18n?.getLang?.()) || "ko";
    const meta = tip[lang] || tip.ko;
    el.querySelector(".tip-icon").setAttribute("icon", tip.icon);
    el.querySelector(".tip-kicker").textContent = lang === "en" ? "DID YOU KNOW" : "혹시 알고 계셨나요?";
    el.querySelector(".tip-title").textContent = meta.title;
    el.querySelector(".tip-text").textContent = meta.body;
}

function showTip() {
    const el = ensureContainer();
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideTip(false), AUTO_HIDE_AFTER_MS);
}

function hideTip(stop) {
    const el = ensureContainer();
    el.classList.remove("is-visible");
    setTimeout(() => { el.hidden = true; }, 350);
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (stop && rotateTimer) {
        clearInterval(rotateTimer);
        rotateTimer = null;
    }
}

function nextTip() {
    if (isDismissed()) return;
    if (document.hidden) return; // pause when tab is in background
    currentIdx = (currentIdx + 1) % TIPS.length;
    try { localStorage.setItem(INDEX_KEY, String(currentIdx)); } catch { /* ignore */ }
    renderTip(currentIdx);
    showTip();
}

function startRotation() {
    if (isDismissed()) return;
    if (rotateTimer) return;
    renderTip(currentIdx);
    showTip();
    rotateTimer = setInterval(nextTip, ROTATE_EVERY_MS);
}

if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        if (isDismissed()) return;
        // Skip on small screens — the canvas is already crowded
        if (window.innerWidth < 720) return;
        setTimeout(() => {
            if (!visibleSinceLoad) {
                visibleSinceLoad = true;
                startRotation();
            }
        }, SHOW_AFTER_MS);
    });
    // Update tip text when language switches
    document.addEventListener("DOMContentLoaded", () => {
        if (window.aiTycoonI18n?.onLangChange) {
            // i18n module exports onLangChange via dynamic, attach later
        }
    });
    window.aiTycoonTips = {
        resume() {
            try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
            startRotation();
        },
        dismiss() {
            try { localStorage.setItem(DISMISS_KEY, "true"); } catch { /* ignore */ }
            hideTip(true);
        },
        next: nextTip,
    };
}
