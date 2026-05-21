// ============================================================
//  AI TYCOON — "While you were away" summary toast
// ============================================================
//
// Watches `document.visibilitychange`. When the tab becomes hidden,
// snapshots the current workEvents length + relevant counters.
// When it comes back, compares and — if at least one notable event
// happened AND the user was away for ≥ MIN_AWAY_MS — shows a single
// concise toast summarizing what they missed.
//
// This complements `js/notifications.js` (OS-level alerts while
// hidden) and `js/toasts.js` (in-app cards while focused) — the goal
// here is one polished "catch-up" line on return, not noise.

import { S } from "./state.js";
import { showToast } from "./toasts.js";

const MIN_AWAY_MS = 30_000; // <30 s away = no summary, that's just glancing away
const KEY_ENABLED = "ai-tycoon-away-summary";

let snapshot = null;
let leftAt = 0;

let enabled = (typeof localStorage !== "undefined"
    ? localStorage.getItem(KEY_ENABLED) !== "false"
    : true);

export function isAwaySummaryEnabled() { return enabled; }
export function setAwaySummaryEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY_ENABLED, enabled ? "true" : "false"); } catch { /* ignore */ }
}

function tallyByType() {
    const counts = { join: 0, leave: 0, "task-done": 0, "task-start": 0, review: 0, work: 0, status: 0 };
    (S.workEvents || []).forEach(ev => {
        if (ev?.type && counts.hasOwnProperty(ev.type)) counts[ev.type]++;
    });
    return counts;
}

function diff(prev, cur) {
    const out = {};
    Object.keys(cur).forEach(k => {
        const d = (cur[k] || 0) - (prev[k] || 0);
        if (d > 0) out[k] = d;
    });
    return out;
}

function formatSummary(d, lang) {
    const ko = lang !== "en";
    const pieces = [];
    if (d.join)        pieces.push(ko ? `출근 ${d.join}` : `${d.join} joined`);
    if (d["task-done"]) pieces.push(ko ? `완료 ${d["task-done"]}` : `${d["task-done"]} done`);
    if (d.review)      pieces.push(ko ? `검토 요청 ${d.review}` : `${d.review} review${d.review > 1 ? "s" : ""}`);
    if (d["task-start"]) pieces.push(ko ? `태스크 시작 ${d["task-start"]}` : `${d["task-start"]} started`);
    if (d.leave)       pieces.push(ko ? `퇴근 ${d.leave}` : `${d.leave} left`);
    if (d.work && pieces.length === 0) pieces.push(ko ? `새 작업 ${d.work}` : `${d.work} new prompt${d.work > 1 ? "s" : ""}`);
    return pieces.join(" · ");
}

function onHidden() {
    snapshot = tallyByType();
    leftAt = Date.now();
}

function onVisible() {
    if (!enabled) return;
    if (!snapshot || !leftAt) return;
    const awayMs = Date.now() - leftAt;
    // 버그픽스 — 기존엔 snapshot 을 null 처리 후 diff(snapshot || {}, now) 호출해서
    // 항상 빈 객체와 비교했고, 결과적으로 "지금까지 발생한 모든 이벤트 카운트" 가 통째로
    // delta 로 잡혀 "자리 비운 사이" 토스트 가 매번 부풀려져 표시됨.
    // 비교에 쓸 snapshot 을 먼저 보관한 뒤 reset.
    const prevSnapshot = snapshot;
    snapshot = null;
    leftAt = 0;
    if (awayMs < MIN_AWAY_MS) return;

    const now = tallyByType();
    const delta = diff(prevSnapshot || {}, now);
    if (Object.keys(delta).length === 0) return;

    try {
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const body = formatSummary(delta, lang);
        if (!body) return;
        const mins = Math.round(awayMs / 60000);
        const title = lang === "en"
            ? (mins >= 1 ? `While you were away (${mins} min)` : "While you were away")
            : (mins >= 1 ? `자리 비운 사이 (${mins}분)` : "자리 비운 사이");
        showToast("info", title, body, { duration: 7000 });
    } catch { /* ignore */ }
}

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") onHidden();
        else if (document.visibilityState === "visible") onVisible();
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonAwaySummary = {
        isEnabled: isAwaySummaryEnabled,
        setEnabled: setAwaySummaryEnabled,
    };
}
