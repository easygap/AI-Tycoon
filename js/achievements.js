// ============================================================
//  AI TYCOON — Achievement / milestone system
// ============================================================
//
// Small badges that unlock as the user uses the dashboard.
// Persisted in localStorage so unlocks survive reloads.
// Each achievement: { id, icon, ko, en, hint, check(stats, state) }

import { recentDays, todayStats } from "./stats.js";
import { t as i18n } from "./i18n.js";

const KEY = "ai-tycoon-achievements-v1";

const ACHIEVEMENTS = [
    {
        id: "first-connect",
        icon: "solar:link-circle-bold",
        ko: { title: "첫 연결", desc: "서버에 처음 연결됐어요" },
        en: { title: "First Connect", desc: "Connected to the server for the first time" },
        check: ({ connected }) => connected === true,
    },
    {
        id: "first-task",
        icon: "solar:checklist-bold",
        ko: { title: "첫 완료", desc: "오늘 첫 태스크를 완료했어요" },
        en: { title: "First Task", desc: "Completed your first task today" },
        check: ({ today }) => (today?.completedMax || 0) >= 1,
    },
    {
        id: "ten-tasks",
        icon: "solar:medal-ribbons-star-bold",
        ko: { title: "10개의 동력", desc: "하루 10개의 태스크를 완료했어요" },
        en: { title: "Ten Done", desc: "10 tasks completed in a day" },
        check: ({ today }) => (today?.completedMax || 0) >= 10,
    },
    {
        id: "fifty-tasks",
        icon: "solar:cup-star-bold",
        ko: { title: "50개의 폭풍", desc: "하루 50개의 태스크를 완료했어요" },
        en: { title: "Task Storm", desc: "50 tasks completed in a day" },
        check: ({ today }) => (today?.completedMax || 0) >= 50,
    },
    {
        id: "multi-platform",
        icon: "solar:layers-minimalistic-bold",
        ko: { title: "팀워크의 화신", desc: "동시에 3개 이상의 AI 플랫폼이 활성됐어요" },
        en: { title: "Multi-Tasker", desc: "3+ AI platforms active simultaneously" },
        check: ({ activePlatforms }) => activePlatforms >= 3,
    },
    {
        id: "five-platforms",
        icon: "solar:medal-star-bold",
        ko: { title: "AI 마스터", desc: "다섯 가지 이상의 AI 플랫폼을 경험했어요" },
        en: { title: "AI Master", desc: "Experienced 5+ different AI platforms" },
        check: ({ allTimePlatforms }) => allTimePlatforms >= 5,
    },
    {
        id: "night-owl",
        icon: "solar:moon-stars-bold",
        ko: { title: "밤의 코더", desc: "심야(22시 이후)에 작업했어요" },
        en: { title: "Night Owl", desc: "Worked past 22:00" },
        check: ({ hour, anyActive }) => anyActive && (hour >= 22 || hour < 2),
    },
    {
        id: "early-bird",
        icon: "solar:sunrise-bold",
        ko: { title: "이른 새", desc: "이른 아침(5-7시)에 작업했어요" },
        en: { title: "Early Bird", desc: "Worked between 5–7 AM" },
        check: ({ hour, anyActive }) => anyActive && hour >= 5 && hour < 7,
    },
    {
        id: "three-day-streak",
        icon: "solar:fire-bold",
        ko: { title: "3일 연속", desc: "3일 연속 작업실을 사용했어요" },
        en: { title: "3-Day Streak", desc: "Used the workspace 3 days in a row" },
        check: ({ streak }) => streak >= 3,
    },
    {
        id: "seven-day-streak",
        icon: "solar:flame-bold",
        ko: { title: "일주일 연속", desc: "7일 연속 작업실을 사용했어요" },
        en: { title: "Week Streak", desc: "Used the workspace 7 days in a row" },
        check: ({ streak }) => streak >= 7,
    },
    {
        id: "five-concurrent",
        icon: "solar:users-group-two-rounded-bold",
        ko: { title: "북적북적", desc: "동시에 5명 이상의 직원이 활동했어요" },
        en: { title: "Full House", desc: "5+ agents active at once" },
        check: ({ peakAgents }) => peakAgents >= 5,
    },
    {
        id: "insightful",
        icon: "solar:chart-bold",
        ko: { title: "인사이트 탐험가", desc: "인사이트 모달을 5번 열어봤어요" },
        en: { title: "Insight Explorer", desc: "Opened insights 5 times" },
        check: ({ insightsOpened }) => insightsOpened >= 5,
    },
    {
        id: "darkside",
        icon: "solar:moon-bold",
        ko: { title: "다크 사이드", desc: "다크 모드로 전환했어요" },
        en: { title: "Dark Side", desc: "Switched to dark mode" },
        check: ({ darkToggled }) => darkToggled === true,
    },
    {
        id: "bilingual",
        icon: "solar:global-bold",
        ko: { title: "이중언어", desc: "언어를 전환해봤어요" },
        en: { title: "Bilingual", desc: "Switched language" },
        check: ({ langToggled }) => langToggled === true,
    },
    {
        id: "century",
        icon: "solar:cup-paper-bold",
        ko: { title: "100태스크 클럽", desc: "하루에 100개의 태스크를 완료했어요" },
        en: { title: "Century", desc: "100 tasks done in a day" },
        check: ({ today }) => (today?.completedMax || 0) >= 100,
    },
    {
        id: "marathon-week",
        icon: "solar:running-2-bold",
        ko: { title: "주간 마라톤", desc: "7일 누적 200개 이상 태스크를 완료" },
        en: { title: "Marathon week", desc: "200+ tasks completed across 7 days" },
        check: ({ weekTotal }) => weekTotal >= 200,
    },
    {
        id: "snapshot-taker",
        icon: "solar:camera-bold",
        ko: { title: "관찰자", desc: "작업실 스냅샷을 5번 저장했어요" },
        en: { title: "Observer", desc: "Saved the office snapshot 5 times" },
        check: ({ snapshots }) => snapshots >= 5,
    },
    {
        id: "customizer",
        icon: "solar:palette-round-bold",
        ko: { title: "취향가", desc: "테마·시즌·언어를 모두 바꿔봤어요" },
        en: { title: "Tinkerer", desc: "Changed theme + season + language" },
        check: ({ themeChanged, seasonChanged, langToggled }) =>
            themeChanged && seasonChanged && langToggled,
    },
    {
        id: "project-curious",
        icon: "solar:folder-with-files-bold",
        ko: { title: "프로젝트 탐험가", desc: "프로젝트 드릴다운을 3번 열어봤어요" },
        en: { title: "Project explorer", desc: "Opened 3 project drill-downs" },
        check: ({ projectOpens }) => projectOpens >= 3,
    },
    {
        id: "konami",
        icon: "solar:gameboy-bold",
        ko: { title: "히든: 코나미", desc: "↑ ↑ ↓ ↓ ← → ← → B A — 비밀의 입력!" },
        en: { title: "Hidden: Konami", desc: "↑ ↑ ↓ ↓ ← → ← → B A — the secret combo" },
        check: ({ konami }) => konami === true,
    },
];

function loadUnlocked() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { unlocked: {}, counters: {} };
        const parsed = JSON.parse(raw);
        return {
            unlocked: parsed?.unlocked || {},
            counters: parsed?.counters || {},
        };
    } catch { return { unlocked: {}, counters: {} }; }
}

function saveUnlocked(blob) {
    try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch { /* ignore */ }
}

let state = loadUnlocked();

/** Increment a named counter. Used for insightsOpened etc. */
export function bumpCounter(name, by = 1) {
    state.counters[name] = (state.counters[name] || 0) + by;
    saveUnlocked(state);
    checkAll();
}

/** Mark a one-time flag (e.g., dark mode toggled). */
export function setFlag(name, value = true) {
    state.counters[name] = value;
    saveUnlocked(state);
    checkAll();
}

function consecutiveDayStreak() {
    const days = recentDays(14);
    if (days.length === 0) return 0;
    // count back from today
    const dates = days.map(d => d.date).sort();
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
        const target = new Date(today);
        target.setDate(today.getDate() - i);
        const k = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2,"0")}-${String(target.getDate()).padStart(2,"0")}`;
        if (dates.includes(k)) streak++;
        else break;
    }
    return streak;
}

function allTimePlatformCount() {
    const days = recentDays(14);
    const seen = new Set();
    days.forEach(d => {
        Object.keys(d.platforms || {}).forEach(p => seen.add(p));
    });
    return seen.size;
}

function gatherContext() {
    const t = todayStats();
    const days = recentDays(14);
    const liveAgents = (typeof window !== "undefined" && window.__aiTycoonAgents) || [];
    const running = liveAgents.filter(a => a.isRunning);
    const platforms = new Set(running.map(a => a.platform).filter(Boolean));
    const peak = days.reduce((m, d) => Math.max(m, d.agentsMax || 0), 0);
    const weekTotal = days.slice(-7).reduce((s, d) => s + (d.completedMax || 0), 0);
    return {
        connected: typeof window !== "undefined" && window.__aiTycoonConnected === true,
        today: t,
        activePlatforms: platforms.size,
        allTimePlatforms: allTimePlatformCount(),
        peakAgents: peak,
        streak: consecutiveDayStreak(),
        weekTotal,
        hour: new Date().getHours(),
        anyActive: running.length > 0,
        insightsOpened: state.counters.insightsOpened || 0,
        darkToggled: !!state.counters.darkToggled,
        langToggled: !!state.counters.langToggled,
        themeChanged: !!state.counters.themeChanged,
        seasonChanged: !!state.counters.seasonChanged,
        snapshots: state.counters.snapshots || 0,
        projectOpens: state.counters.projectOpens || 0,
        konami: !!state.counters.konami,
    };
}

const listeners = new Set();
export function onUnlock(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Run all checks; emit unlock events for newly-true ones. */
export function checkAll() {
    const ctx = gatherContext();
    ACHIEVEMENTS.forEach(a => {
        if (state.unlocked[a.id]) return;
        try {
            if (a.check(ctx)) {
                state.unlocked[a.id] = { unlockedAt: new Date().toISOString() };
                saveUnlocked(state);
                listeners.forEach(fn => { try { fn(a); } catch { /* ignore */ } });
            }
        } catch (err) { void err; }
    });
}

/** Public list with localized labels. */
export function listAchievements() {
    const lang = (typeof window !== "undefined" && window.aiTycoonI18n?.getLang?.()) || "ko";
    return ACHIEVEMENTS.map(a => {
        const meta = a[lang] || a.ko;
        return {
            id: a.id,
            icon: a.icon,
            title: meta.title,
            desc: meta.desc,
            unlocked: !!state.unlocked[a.id],
            unlockedAt: state.unlocked[a.id]?.unlockedAt || null,
        };
    });
}

/** Count of unlocked out of total. */
export function progressCount() {
    const unlocked = Object.keys(state.unlocked).length;
    return { unlocked, total: ACHIEVEMENTS.length };
}

/** Reset everything (for testing). */
export function resetAchievements() {
    state = { unlocked: {}, counters: {} };
    saveUnlocked(state);
}

// ── Badge popup ─────────────────────────────────────────────
function showBadgePopup(achievement) {
    if (typeof document === "undefined") return;
    const lang = (window.aiTycoonI18n?.getLang?.()) || "ko";
    const meta = achievement[lang] || achievement.ko;
    const container = document.getElementById("badge-popup-stack") || (() => {
        const stack = document.createElement("div");
        stack.id = "badge-popup-stack";
        stack.className = "badge-popup-stack";
        document.body.appendChild(stack);
        return stack;
    })();
    const popup = document.createElement("div");
    popup.className = "badge-popup";
    popup.innerHTML = `
        <div class="badge-popup-icon"><iconify-icon icon="${achievement.icon}" aria-hidden="true"></iconify-icon></div>
        <div class="badge-popup-body">
            <div class="badge-popup-kicker">${lang === "en" ? "ACHIEVEMENT UNLOCKED" : "업적 달성"}</div>
            <div class="badge-popup-title">${meta.title}</div>
            <div class="badge-popup-desc">${meta.desc}</div>
        </div>
        <button class="badge-popup-close" aria-label="${i18n("panel.close")}">×</button>
    `;
    container.appendChild(popup);
    popup.querySelector(".badge-popup-close").addEventListener("click", () => popup.remove());
    requestAnimationFrame(() => popup.classList.add("is-shown"));
    spawnConfetti(popup);
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        popup.classList.remove("is-shown");
        setTimeout(() => popup.remove(), 400);
    }, 8000);
}

/** Burst of CSS-animated confetti particles around the popup card. */
function spawnConfetti(anchorEl) {
    // Respect prefers-reduced-motion
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const layer = document.getElementById("confetti-layer") || (() => {
        const el = document.createElement("div");
        el.id = "confetti-layer";
        el.className = "confetti-layer";
        document.body.appendChild(el);
        return el;
    })();
    const colors = ["#ff8a4c", "#10b981", "#3b82f6", "#facc15", "#ec4899", "#a855f7"];
    const rect = anchorEl?.getBoundingClientRect?.();
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const count = 28;
    for (let i = 0; i < count; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const dist = 70 + Math.random() * 90;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist + 40; // bias slightly down (gravity feel)
        piece.style.left = `${originX}px`;
        piece.style.top = `${originY}px`;
        piece.style.background = colors[i % colors.length];
        piece.style.setProperty("--tx", `${tx}px`);
        piece.style.setProperty("--ty", `${ty}px`);
        piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 720}deg`);
        piece.style.setProperty("--dur", `${0.9 + Math.random() * 0.5}s`);
        piece.style.animationDelay = `${i * 8}ms`;
        layer.appendChild(piece);
        setTimeout(() => piece.remove(), 1700);
    }
}

// Track "freshly unlocked" badges (unseen by user) so we can put a dot on
// the insights button until they open the modal.
const SEEN_KEY = "ai-tycoon-achievements-seen";
function loadSeen() {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); }
    catch { return new Set(); }
}
function saveSeen(set) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}
export function unseenCount() {
    const seen = loadSeen();
    let n = 0;
    Object.keys(state.unlocked).forEach(id => { if (!seen.has(id)) n++; });
    return n;
}
export function markAllSeen() {
    const seen = new Set(Object.keys(state.unlocked));
    saveSeen(seen);
    refreshHeaderBadge();
}
function refreshHeaderBadge() {
    const btn = typeof document !== "undefined" && document.getElementById("insights-toggle");
    if (!btn) return;
    const count = unseenCount();
    let badge = btn.querySelector(".ach-header-badge");
    if (count > 0) {
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "ach-header-badge";
            btn.appendChild(badge);
        }
        badge.textContent = count > 9 ? "9+" : String(count);
        btn.dataset.unseen = String(count);
    } else {
        if (badge) badge.remove();
        btn.dataset.unseen = "0";
    }
}

if (typeof window !== "undefined") {
    onUnlock(showBadgePopup);
    onUnlock(refreshHeaderBadge);
    document.addEventListener("DOMContentLoaded", () => setTimeout(refreshHeaderBadge, 600));
    window.aiTycoonAchievements = {
        list: listAchievements,
        progress: progressCount,
        check: checkAll,
        reset: resetAchievements,
        unseenCount,
        markAllSeen,
    };
}
