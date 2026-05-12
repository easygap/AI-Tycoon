// ============================================================
//  AI TYCOON — Daily stats persistence (localStorage)
// ============================================================
//
// Tracks per-day rollups so the insights modal can show "yesterday vs today"
// and a 7-day trend. Stored as a JSON blob in localStorage; rolls forward
// at midnight.
//
// Shape on disk:
//   {
//     "v": 1,
//     "days": {
//        "2026-05-12": {
//            "completedMax": 18,   // max value of total completedTasks today
//            "agentsMax":   4,     // peak concurrent agents
//            "joinedCount": 12,    // distinct new agent pids first seen today
//            "events":      54,    // total addWorkEvent calls
//            "platforms":   { "claude": 3, "codex": 1, ... },
//            "statusMinutes": { "coding": 35, "thinking": 12, ... },
//            "firstSeenAt": "2026-05-12T08:14:22Z",
//            "lastSeenAt":  "2026-05-12T18:54:10Z"
//        },
//        ...
//     }
//   }

const KEY = "ai-tycoon-daily-stats-v1";
const MAX_DAYS = 14; // keep 2 weeks; show last 7 in UI

function todayKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadBlob() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { v: 1, days: {} };
        const parsed = JSON.parse(raw);
        if (parsed?.v === 1 && typeof parsed.days === "object") return parsed;
        return { v: 1, days: {} };
    } catch {
        return { v: 1, days: {} };
    }
}

function saveBlob(blob) {
    try {
        // Prune old days, keep last MAX_DAYS sorted
        const keys = Object.keys(blob.days || {}).sort();
        if (keys.length > MAX_DAYS) {
            const drop = keys.slice(0, keys.length - MAX_DAYS);
            drop.forEach(k => delete blob.days[k]);
        }
        localStorage.setItem(KEY, JSON.stringify(blob));
    } catch (err) {
        console.warn("[ai-tycoon] stats save failed:", err);
    }
}

function ensureToday(blob) {
    const k = todayKey();
    if (!blob.days[k]) {
        blob.days[k] = {
            completedMax: 0,
            agentsMax: 0,
            joinedCount: 0,
            events: 0,
            platforms: {},
            statusMinutes: {},
            hourActivity: new Array(24).fill(0),
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        };
    }
    // Backfill for older blobs without hourActivity
    if (!Array.isArray(blob.days[k].hourActivity) || blob.days[k].hourActivity.length !== 24) {
        blob.days[k].hourActivity = new Array(24).fill(0);
    }
    return blob.days[k];
}

// ── Internal state to track deltas across calls ──
const memo = {
    seenPids: new Set(),     // pids ever seen today
    lastStatusTick: new Map(), // pid → { status, since }
    lastSavedDayKey: null,
};

/** Called frequently (every server state push). */
export function recordStateSnapshot(agents) {
    const blob = loadBlob();
    const day = ensureToday(blob);

    // Rollover detection — if day changed, reset memo
    const k = todayKey();
    if (memo.lastSavedDayKey && memo.lastSavedDayKey !== k) {
        memo.seenPids.clear();
        memo.lastStatusTick.clear();
    }
    memo.lastSavedDayKey = k;

    const running = (agents || []).filter(a => a.isRunning);
    day.agentsMax = Math.max(day.agentsMax || 0, running.length);

    // Sum of all completedTasks across current agents — this is monotonic
    // for any given agent, but can drop if an agent disappears. Take the
    // max-ever value as a conservative "today's completed work" tally.
    const sumCompleted = (agents || []).reduce((s, a) => s + (a.completedTasks || 0), 0);
    day.completedMax = Math.max(day.completedMax || 0, sumCompleted);

    // Track newly-seen pids today
    (agents || []).forEach(a => {
        const pid = String(a.pid);
        if (!memo.seenPids.has(pid)) {
            memo.seenPids.add(pid);
            day.joinedCount = (day.joinedCount || 0) + 1;
        }
        // Per-platform max concurrent
        const platKey = a.platform || "unknown";
        const wasMax = day.platforms[platKey] || 0;
        const currentForPlatform = running.filter(x => (x.platform || "unknown") === platKey).length;
        day.platforms[platKey] = Math.max(wasMax, currentForPlatform);
    });

    // Per-status minute accumulation
    const now = Date.now();
    (agents || []).forEach(a => {
        const pid = String(a.pid);
        const status = a.isRunning ? (a.status || "idle") : "offline";
        const prev = memo.lastStatusTick.get(pid);
        if (prev) {
            const elapsedMin = (now - prev.since) / 60000;
            if (elapsedMin > 0 && elapsedMin < 60) { // sanity ceiling
                day.statusMinutes[prev.status] =
                    (day.statusMinutes[prev.status] || 0) + elapsedMin;
            }
        }
        memo.lastStatusTick.set(pid, { status, since: now });
    });
    // Clean up departed pids' status timers
    const currentPids = new Set((agents || []).map(a => String(a.pid)));
    [...memo.lastStatusTick.keys()].forEach(pid => {
        if (!currentPids.has(pid)) {
            const prev = memo.lastStatusTick.get(pid);
            const elapsedMin = (now - prev.since) / 60000;
            if (elapsedMin > 0 && elapsedMin < 60) {
                day.statusMinutes[prev.status] =
                    (day.statusMinutes[prev.status] || 0) + elapsedMin;
            }
            memo.lastStatusTick.delete(pid);
        }
    });

    // Hourly activity heatmap — accumulate running-agent count by current hour
    if (running.length > 0) {
        const hour = new Date().getHours();
        day.hourActivity[hour] = (day.hourActivity[hour] || 0) + running.length;
    }

    day.lastSeenAt = new Date().toISOString();
    saveBlob(blob);
}

/** Called once per addWorkEvent. */
export function recordEvent() {
    const blob = loadBlob();
    const day = ensureToday(blob);
    day.events = (day.events || 0) + 1;
    day.lastSeenAt = new Date().toISOString();
    saveBlob(blob);
}

/** Returns the last N days (chronological) for charts. */
export function recentDays(n = 7) {
    const blob = loadBlob();
    const keys = Object.keys(blob.days || {}).sort();
    return keys.slice(-n).map(k => ({ date: k, ...blob.days[k] }));
}

/** Returns today's rollup. */
export function todayStats() {
    const blob = loadBlob();
    return blob.days[todayKey()] || null;
}

/** Returns yesterday's rollup for comparison. */
export function yesterdayStats() {
    const blob = loadBlob();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return blob.days[todayKey(y)] || null;
}

/** Total minutes spent in each status today. */
export function statusMinutesToday() {
    const t = todayStats();
    return t ? { ...t.statusMinutes } : {};
}

/** Per-hour activity (0..23) for today, summed across last N days. */
export function hourActivityToday() {
    const t = todayStats();
    return t?.hourActivity ? [...t.hourActivity] : new Array(24).fill(0);
}
export function hourActivityWindow(days = 7) {
    const list = recentDays(days);
    const merged = new Array(24).fill(0);
    list.forEach(d => {
        if (Array.isArray(d.hourActivity)) {
            d.hourActivity.forEach((v, i) => { merged[i] += v || 0; });
        }
    });
    return merged;
}

/** Clear all persisted stats. */
export function resetStats() {
    localStorage.removeItem(KEY);
    memo.seenPids.clear();
    memo.lastStatusTick.clear();
    memo.lastSavedDayKey = null;
}

if (typeof window !== "undefined") {
    window.aiTycoonStats = { recentDays, todayStats, yesterdayStats, resetStats };
}
