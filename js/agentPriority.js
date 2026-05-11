// ============================================================
//  AI TYCOON — Shared Agent Next-Action Priority
// ============================================================

const WORK_STATUSES = new Set(["coding", "thinking", "searching", "reviewing", "meeting"]);
const STALE_SIGNAL_MS = 15 * 60 * 1000;
const RECENT_ACTIVITY_MS = 10 * 60 * 1000;

export function samePid(a, b) {
    return a != null && b != null && String(a) === String(b);
}

export function agentPinKey(agent) {
    if (!agent || typeof agent !== "object") return String(agent);
    const stablePart = agent.sessionId
        || agent.threadId
        || agent.cwd
        || agent.projectName
        || agent.pid;
    return [agent.platform || "agent", stablePart].filter(Boolean).map(String).join(":");
}

export function isAgentPinned(agent, pinnedKeys = []) {
    if (!agent) return false;
    return pinnedKeys.includes(agentPinKey(agent)) || pinnedKeys.includes(String(agent.pid));
}

export function timestampToMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function agentActivityTimestamp(agent) {
    return timestampToMs(agent?.signals?.lastActivityAt)
        || timestampToMs(agent?.signals?.lastSeenAt)
        || timestampToMs(agent?.currentWork?.timestamp)
        || timestampToMs(agent?.lastActivityAt)
        || 0;
}

export function agentSignalAgeMs(agent, now = Date.now()) {
    const ts = agentActivityTimestamp(agent);
    return ts > 0 ? Math.max(0, now - ts) : Number.POSITIVE_INFINITY;
}

export function agentNextAction(agent, context = {}, now = Date.now()) {
    const status = agent?.isRunning ? agent.status : "offline";
    const pinned = isAgentPinned(agent, context.pinnedKeys || []);
    const focused = samePid(context.directorFocusPid, agent?.pid);
    const selected = samePid(context.selectedPid, agent?.pid);
    const stale = agent?.isRunning && agentSignalAgeMs(agent, now) > STALE_SIGNAL_MS;
    const recent = agentActivityTimestamp(agent) > 0 && agentSignalAgeMs(agent, now) <= RECENT_ACTIVITY_MS;

    if (agent?.needsReview || status === "reviewing") {
        return { key: "review", rank: 0, tone: "attention", label: "검토 필요", icon: "solar:clipboard-check-linear" };
    }
    if (focused || selected) {
        return { key: "focus", rank: 1, tone: "focus", label: focused ? "추적 중" : "선택됨", icon: "solar:target-linear" };
    }
    if (stale) {
        return { key: "stale", rank: 2, tone: "warn", label: "신호 확인", icon: "solar:radar-2-linear" };
    }
    if (pinned) {
        return { key: "pinned", rank: 3, tone: "pinned", label: "고정 관찰", icon: "solar:star-bold" };
    }
    if (WORK_STATUSES.has(status)) {
        return { key: "working", rank: 4, tone: "live", label: "진행 확인", icon: "solar:bolt-circle-linear" };
    }
    if (recent) {
        return { key: "recent", rank: 5, tone: "neutral", label: "최근 활동", icon: "solar:history-2-linear" };
    }
    if (status === "idle") {
        return { key: "idle", rank: 6, tone: "idle", label: "대기", icon: "solar:pause-circle-linear" };
    }
    return { key: "offline", rank: 7, tone: "offline", label: "오프라인", icon: "solar:power-linear" };
}

export function compareAgentPriority(a, b, context = {}, now = Date.now()) {
    const aa = agentNextAction(a, context, now);
    const ba = agentNextAction(b, context, now);
    if (aa.rank !== ba.rank) return aa.rank - ba.rank;

    const activeA = a?.isRunning ? 0 : 1;
    const activeB = b?.isRunning ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;

    const timeA = agentActivityTimestamp(a);
    const timeB = agentActivityTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;

    return String(a?.projectName || a?.pid || "").localeCompare(String(b?.projectName || b?.pid || ""));
}
