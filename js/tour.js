// ============================================================
//  AI TYCOON — Onboarding spotlight tour
// ============================================================
//
// 4-step guided tour that fires the *first* time the user dismisses
// the welcome card.  Each step highlights one feature with a halo
// + tooltip near the target element.  Skippable, persists "completed"
// flag so it never re-runs.

const KEY = "ai-tycoon-tour-done";

const STEPS = [
    {
        target: "#settings-toggle",
        ko: { title: "설정", body: "테마, 언어, 효과음, 알림, 시간대 강제 등 모든 설정을 한 곳에서." },
        en: { title: "Settings", body: "Theme, language, sound, alerts, time-of-day — all in one place." },
        placement: "bottom",
    },
    {
        target: "#insights-toggle",
        ko: { title: "인사이트", body: "오늘의 작업·플랫폼 분포·7일 추이·24시간 히트맵을 모아 봐요. (단축키 I)" },
        en: { title: "Insights", body: "Today's tasks, platform mix, 7-day trend, hourly heatmap — open with I." },
        placement: "bottom",
    },
    {
        target: "#snapshot-toggle",
        ko: { title: "스냅샷 PNG", body: "현재 작업실 화면을 그대로 PNG로 저장합니다. (단축키 P)" },
        en: { title: "Snapshot PNG", body: "Save the current office view as PNG. Hotkey: P." },
        placement: "bottom",
    },
    {
        target: "#shortcuts-toggle",
        ko: { title: "단축키", body: "물음표(?)로 단축키 치트시트가 열려요. 키보드만으로 80%는 가능합니다." },
        en: { title: "Shortcuts", body: "Press ? for the full cheatsheet. You can do 80% of things with the keyboard." },
        placement: "bottom",
    },
];

let stepIdx = 0;
let active = false;
let backdropEl = null;
let spotlightEl = null;
let cardEl = null;

function done() {
    try { return localStorage.getItem(KEY) === "true"; }
    catch { return false; }
}
function markDone() {
    try { localStorage.setItem(KEY, "true"); } catch { /* ignore */ }
}

function destroy() {
    [backdropEl, spotlightEl, cardEl].forEach(el => {
        if (el?.parentNode) el.parentNode.removeChild(el);
    });
    backdropEl = spotlightEl = cardEl = null;
    active = false;
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
}

function reposition() {
    if (!active) return;
    placeStep(STEPS[stepIdx]);
}

function placeStep(step) {
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) { advance(); return; }
    const rect = target.getBoundingClientRect();
    const pad = 6;

    if (!spotlightEl) {
        spotlightEl = document.createElement("div");
        spotlightEl.className = "tour-spotlight";
        document.body.appendChild(spotlightEl);
    }
    spotlightEl.style.left = `${rect.left - pad}px`;
    spotlightEl.style.top = `${rect.top - pad}px`;
    spotlightEl.style.width = `${rect.width + pad * 2}px`;
    spotlightEl.style.height = `${rect.height + pad * 2}px`;

    if (!cardEl) {
        cardEl = document.createElement("div");
        cardEl.className = "tour-card";
        document.body.appendChild(cardEl);
    }
    const lang = (window.aiTycoonI18n?.getLang?.()) || "ko";
    const meta = step[lang] || step.ko;
    const skip = lang === "en" ? "Skip tour" : "건너뛰기";
    const next = lang === "en" ? "Next" : "다음";
    const finish = lang === "en" ? "Got it" : "확인";
    const isLast = stepIdx === STEPS.length - 1;
    cardEl.innerHTML = `
        <div class="tour-card-step">${stepIdx + 1} / ${STEPS.length}</div>
        <div class="tour-card-title">${escapeHtml(meta.title)}</div>
        <div class="tour-card-body">${escapeHtml(meta.body)}</div>
        <div class="tour-card-actions">
            <button type="button" class="tour-skip">${escapeHtml(skip)}</button>
            <button type="button" class="tour-next">${escapeHtml(isLast ? finish : next)}</button>
        </div>
    `;
    cardEl.querySelector(".tour-skip").addEventListener("click", finishTour);
    cardEl.querySelector(".tour-next").addEventListener("click", advance);

    // Position card under the target
    const cardW = 280;
    const cardH = cardEl.offsetHeight || 130;
    let cx = rect.left + rect.width / 2 - cardW / 2;
    cx = Math.max(12, Math.min(cx, window.innerWidth - cardW - 12));
    let cy = rect.bottom + 16;
    if (cy + cardH > window.innerHeight - 12) {
        cy = rect.top - cardH - 16;
    }
    cardEl.style.left = `${cx}px`;
    cardEl.style.top = `${cy}px`;

    requestAnimationFrame(() => {
        spotlightEl.classList.add("is-visible");
        cardEl.classList.add("is-visible");
    });
}

function advance() {
    stepIdx++;
    if (stepIdx >= STEPS.length) {
        finishTour();
        return;
    }
    placeStep(STEPS[stepIdx]);
}

function finishTour() {
    markDone();
    if (cardEl) cardEl.classList.remove("is-visible");
    if (spotlightEl) spotlightEl.classList.remove("is-visible");
    setTimeout(destroy, 320);
}

export function startTour() {
    if (active) return;
    if (done()) return;
    if (window.innerWidth < 720) {
        // Skip on small screens — the header buttons are too tight.
        markDone();
        return;
    }
    active = true;
    stepIdx = 0;
    backdropEl = document.createElement("div");
    backdropEl.className = "tour-backdrop";
    document.body.appendChild(backdropEl);
    requestAnimationFrame(() => backdropEl.classList.add("is-visible"));
    placeStep(STEPS[stepIdx]);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

if (typeof window !== "undefined") {
    window.aiTycoonTour = {
        start: startTour,
        reset() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
        isDone: done,
    };
}
