// ============================================================
//  AI TYCOON — Side Panel, Detail Panel, Tooltips, Filters
// ============================================================

import { S, esc, getWorkText, formatTimeAgo } from "./state.js";
import {
    agentNextAction,
    agentPinKey as getAgentPinKey,
    compareAgentPriority,
    isAgentPinned as isPinnedByKeys,
} from "./agentPriority.js";
import {
    AGENT_THEMES, PLATFORM_META, ROLE_META, STATUS_META,
    SUB_COLORS,
} from "./constants.js";
import { timeOfDayLabel, getSkyPalette } from "./timeOfDay.js";
import { recentDays, todayStats, yesterdayStats, hourActivityToday, hourActivityWindow } from "./stats.js";
import { avgHeartbeatGap, connQuality } from "./ws.js";
import { t as i18n } from "./i18n.js";
import { listAchievements, progressCount } from "./achievements.js";

const PIN_STORAGE_KEY = "ai-tycoon-pinned-agents";
const PIN_LEGACY_STORAGE_KEY = "ai-tycoon-pinned-pids";
const ACTION_FILTERS = [
    { key: "all", label: "전체", icon: "solar:list-check-linear" },
    { key: "review", label: "검토", icon: "solar:clipboard-check-linear" },
    { key: "stale", label: "신호", icon: "solar:radar-2-linear" },
    { key: "working", label: "진행", icon: "solar:bolt-circle-linear" },
    { key: "pinned", label: "고정", icon: "solar:star-bold" },
    { key: "recent", label: "최근", icon: "solar:history-2-linear" },
    { key: "idle", label: "대기", icon: "solar:pause-circle-linear" },
];

// ── Filter helpers ──
export function updateFilterChips() {
    // Status filter chips
    document.querySelectorAll("#filter-bar .filter-chip").forEach(el => {
        const active = el.dataset.filter === S.activeFilter;
        el.classList.toggle("active", active);
        el.setAttribute("aria-pressed", active ? "true" : "false");
    });
    // Platform filter chips (dynamically generated)
    const platforms = [...new Set(S.liveAgents.map(a => a.platform))];
    const pfBar = document.getElementById("platform-filter");
    if (pfBar) {
        pfBar.innerHTML = "";
        if (platforms.length > 1) {
            const allChip = document.createElement("button");
            allChip.className = `filter-chip${S.activePlatformFilter === "all" ? " active" : ""}`;
            allChip.textContent = "전체";
            allChip.setAttribute("aria-pressed", S.activePlatformFilter === "all" ? "true" : "false");
            allChip.onclick = () => window.setPlatformFilter("all");
            pfBar.appendChild(allChip);
            platforms.forEach(p => {
                const meta = PLATFORM_META[p] || { badge: p, color: "#888" };
                const chip = document.createElement("button");
                chip.className = `filter-chip${S.activePlatformFilter === p ? " active" : ""}`;
                chip.textContent = meta.badge;
                chip.setAttribute("aria-pressed", S.activePlatformFilter === p ? "true" : "false");
                chip.style.cssText = S.activePlatformFilter === p ? `color:${meta.color};border-color:${meta.color}40;background:${meta.color}15` : "";
                chip.onclick = () => window.setPlatformFilter(p);
                pfBar.appendChild(chip);
            });
        }
    }
    updateActionFilterChips();
}

export function getFilteredSortedAgents() {
    let agents = getPanelFilteredAgents({ includeActionFilter: true });

    // Sort
    const statusPriority = { coding: 0, reviewing: 1, searching: 2, thinking: 3, idle: 4, offline: 5 };
    agents.sort((a, b) => {
        switch (S.sortOrder) {
            case "memory": return b.memoryMB - a.memoryMB;
            case "platform": return (a.platform || "").localeCompare(b.platform || "");
            case "project": return (a.projectName || "").localeCompare(b.projectName || "");
            case "recent": {
                const ta = timestampValue(a);
                const tb = timestampValue(b);
                return tb - ta;
            }
            default: { // status
                const priorityCompare = compareAgentPriority(a, b, priorityContext());
                if (priorityCompare !== 0) return priorityCompare;
                const sa = statusPriority[a.isRunning ? a.status : "offline"] ?? 9;
                const sb = statusPriority[b.isRunning ? b.status : "offline"] ?? 9;
                if (sa !== sb) return sa - sb;
                return timestampValue(b) - timestampValue(a);
            }
        }
    });
    return agents;
}

function getPanelFilteredAgents(options = {}) {
    const includeActionFilter = options.includeActionFilter !== false;
    let agents = [...S.liveAgents];

    if (S.activeFilter !== "all") {
        agents = agents.filter(a => {
            const s = a.isRunning ? a.status : "offline";
            if (S.activeFilter === "coding") return ["coding", "thinking", "searching", "reviewing"].includes(s);
            if (S.activeFilter === "idle") return s === "idle";
            if (S.activeFilter === "offline") return s === "offline";
            return true;
        });
    }

    if (S.activePlatformFilter !== "all") {
        agents = agents.filter(a => a.platform === S.activePlatformFilter);
    }

    const query = normalizeSearch(S.agentSearchQuery);
    if (query) {
        const terms = query.split(" ").filter(Boolean);
        agents = agents.filter(agent => {
            const haystack = agentSearchText(agent);
            return terms.every(term => haystack.includes(term));
        });
    }

    if (includeActionFilter && S.activeActionFilter !== "all") {
        agents = agents.filter(agent => getAgentFilterAction(agent).key === S.activeActionFilter);
    }

    return agents;
}

function normalizeSearch(value) {
    return String(value ?? "").toLocaleLowerCase("ko-KR").replace(/\s+/g, " ").trim();
}

function agentSearchText(agent) {
    const theme = getAgentTheme(agent);
    const status = agent.isRunning ? agent.status : "offline";
    const meta = STATUS_META[status] || STATUS_META.idle;
    const platform = PLATFORM_META[agent.platform] || {};
    const role = agent.role && ROLE_META[agent.role] ? ROLE_META[agent.role] : {};
    const taskText = [
        getWorkText(agent),
        agent.currentWork?.prompt,
        agent.currentTask?.subject,
        ...(agent.tasks || []).flatMap(task => [task.subject, task.activeForm, task.status]),
    ].filter(Boolean).join(" ");

    // 내가 직접 단 메모도 검색 대상에 포함 — "리팩터링" 같은 단서로 빠르게 찾을 수 있게.
    const note = getAgentNote(agent) || "";

    return normalizeSearch([
        theme.name,
        agent.projectName,
        agent.cwd,
        agent.pid,
        agent.sessionId,
        agent.platform,
        platform.badge,
        role.badge,
        meta.label,
        status,
        taskText,
        note,
    ].filter(Boolean).join(" "));
}

function getAgentTheme(agent, fallbackIndex = 0) {
    const globalIdx = S.liveAgents.indexOf(agent);
    return AGENT_THEMES[(globalIdx >= 0 ? globalIdx : fallbackIndex) % AGENT_THEMES.length];
}

function firstLine(text, max = 72) {
    const cleaned = (text || "").replace(/\[Pasted text[^\]]*\]/g, "").trim();
    const line = cleaned.split("\n")[0].trim();
    return line.length > max ? `${line.substring(0, max - 1)}...` : line;
}

function workAge(agent) {
    const ts = agent.currentWork?.timestamp;
    const numericTs = typeof ts === "string" ? Date.parse(ts) : ts;
    return Number.isFinite(numericTs) && numericTs > 0 ? formatTimeAgo(Date.now() - numericTs) : "";
}

function timestampValue(agent) {
    const ts = agent.currentWork?.timestamp;
    const numericTs = typeof ts === "string" ? Date.parse(ts) : ts;
    return Number.isFinite(numericTs) ? numericTs : 0;
}

function taskProgress(agent) {
    if (agent.totalTasks > 0) {
        return Math.round((agent.completedTasks / agent.totalTasks) * 100);
    }
    const status = agent.isRunning ? agent.status : "offline";
    if (["coding", "reviewing", "searching", "thinking"].includes(status)) return 64;
    if (status === "idle") return 16;
    return 0;
}

function updateSearchControls(filteredAgents) {
    const input = document.getElementById("agent-search");
    const clear = document.getElementById("agent-search-clear");
    const summary = document.getElementById("agent-visibility-summary");
    const query = S.agentSearchQuery || "";
    const normalizedQuery = normalizeSearch(query);

    if (input && document.activeElement !== input && input.value !== query) {
        input.value = query;
    }
    if (clear) clear.hidden = !normalizedQuery;
    if (!summary) return;

    const visible = filteredAgents.length;
    const total = S.liveAgents.length;
    const actionMeta = ACTION_FILTERS.find(item => item.key === S.activeActionFilter);
    const working = filteredAgents.filter(agent =>
        agent.isRunning && ["coding", "thinking", "searching", "reviewing", "meeting"].includes(agent.status)
    ).length;
    const review = filteredAgents.filter(agent => agent.needsReview || agent.status === "reviewing").length;
    const pinned = filteredAgents.filter(isAgentPinned).length;
    const recent = filteredAgents.filter(agent => Date.now() - timestampValue(agent) < 10 * 60 * 1000).length;
    const lgV = (window.aiTycoonI18n?.getLang?.() || "ko");
    const labels = lgV === "en"
        ? { all: "Show all", count: "people", view: "view", pinned: "Pinned", working: "Working", review: "Review", recent: "Recent" }
        : { all: "전체 보기", count: "명", view: "보기", pinned: "고정", working: "작업", review: "검토", recent: "최근" };
    const searchLabel = normalizedQuery
        ? `<span class="visibility-query">"${esc(query)}"</span>`
        : `<span>${esc(labels.all)}</span>`;
    const countSuffix = lgV === "en" ? ` ${labels.count}` : labels.count; // "명" 은 붙여 쓰고 "people" 은 띄움

    summary.innerHTML = `
        <span>${searchLabel}</span>
        <span class="tabular-nums">${visible}/${total}${countSuffix}</span>
        ${actionMeta && actionMeta.key !== "all" ? `<span class="action-visibility">${esc(actionMeta.label)} ${esc(labels.view)}</span>` : ""}
        ${pinned ? `<span class="pinned-visibility tabular-nums">${esc(labels.pinned)} ${pinned}</span>` : ""}
        <span class="tabular-nums">${esc(labels.working)} ${working}</span>
        ${review ? `<span class="needs-attention tabular-nums">${esc(labels.review)} ${review}</span>` : ""}
        ${recent ? `<span class="tabular-nums">${esc(labels.recent)} ${recent}</span>` : ""}
    `;
}

function effectivePixiDensity() {
    if (prefersReducedMotion()) return "minimal";
    if (["rich", "balanced", "focus", "minimal"].includes(S.pixiDensity)) return S.pixiDensity;
    const activeCount = S.liveAgents.reduce((count, agent) => count + (agent.isRunning ? 1 : 0), 0);
    return S.canvasW < 640 || activeCount > 12 ? "focus" : "balanced";
}

function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function pixiDensityMeta(mode) {
    return {
        auto: { label: "자동", icon: "solar:layers-minimalistic-linear" },
        minimal: { label: "저자극", icon: "solar:eye-closed-linear" },
        rich: { label: "풍부", icon: "solar:layers-minimalistic-linear" },
        balanced: { label: "균형", icon: "solar:tuning-square-linear" },
        focus: { label: "집중", icon: "solar:focus-linear" },
        reduced: { label: "감소", icon: "solar:eye-closed-linear" },
    }[mode] || { label: "자동", icon: "solar:layers-minimalistic-linear" };
}

function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

const SIGNAL_LABELS = {
    session: "session",
    process: "process",
    history: "history",
    task: "task",
    window: "window",
    codex: "codex",
    thread: "thread",
    cursor: "cursor",
    memory: "memory",
};

function agentSignalInfo(agent) {
    const signals = agent?.signals || {};
    const sources = Array.isArray(signals.sources) ? [...new Set(signals.sources)].filter(Boolean) : [];
    const seenAt = numeric(signals.lastSeenAt, timestampValue(agent));
    const activityAt = numeric(signals.lastActivityAt, timestampValue(agent));
    const basis = activityAt || seenAt;
    const age = basis > 0 ? Math.max(0, Date.now() - basis) : 0;
    const ageLabel = basis > 0 ? formatTimeAgo(age) : "수집 중";
    const sourceLabel = sources.length
        ? sources.slice(0, 3).map(source => SIGNAL_LABELS[source] || source).join("/")
        : (agent?.platform || "signal");
    return { sources, sourceLabel, ageLabel, seenAt, activityAt, age };
}

/** 작업 중(또는 생각/검토 중) 상태에서 N분간 활동 신호가 없으면 'stuck'으로 본다.
 *  세션이 끊긴 건 아닌데 프롬프트 답을 기다리며 멈춰있는 경우를 잡아내려고. */
const STUCK_THRESHOLD_MS = 5 * 60 * 1000;
function isAgentStuck(agent) {
    if (!agent?.isRunning) return false;
    const activeStatuses = ["coding", "thinking", "searching", "reviewing"];
    if (!activeStatuses.includes(agent.status)) return false;
    const info = agentSignalInfo(agent);
    return info.age > STUCK_THRESHOLD_MS;
}

// 한 번 알린 에이전트는 다시 안 알림 (해제됐다가 다시 멈출 때만 한 번 더)
const _stuckNotified = new Set();
function maybeFireStuckToast(agent) {
    if (typeof window === "undefined") return;
    const key = String(agent?.pid || "");
    if (!key) return;
    const stuck = isAgentStuck(agent);
    if (stuck && !_stuckNotified.has(key)) {
        _stuckNotified.add(key);
        try {
            const idx = (S.liveAgents || []).indexOf(agent);
            const theme = AGENT_THEMES[(idx >= 0 ? idx : 0) % AGENT_THEMES.length];
            const lang = window.aiTycoonI18n?.getLang?.() || "ko";
            const title = lang === "en"
                ? `${theme.name} looks stuck`
                : `${theme.name} 멈춘 것 같아요`;
            const body = lang === "en"
                ? `${agent.projectName || ""} · No signals for 5+ min`
                : `${agent.projectName || ""} · 5분+ 무신호`;
            window.aiTycoonToasts?.show?.("review", title, body, { pid: agent.pid });
        } catch { /* 알림 실패는 치명적이지 않음 */ }
    } else if (!stuck && _stuckNotified.has(key)) {
        // 다시 움직였으면 상태 초기화 → 다음에 또 멈추면 한 번 더 알림
        _stuckNotified.delete(key);
    }
}

function renderDiagnosticChip(label, value, tone = "neutral") {
    return `<span class="diag-chip" data-tone="${tone}">
        <span class="diag-value">${esc(value)}</span>
        <span class="diag-label">${esc(label)}</span>
    </span>`;
}

function renderDetectorHealth(active, working) {
    const el = document.getElementById("hud-diagnostics");
    if (!el) return;

    const diagnostics = S.serverState?.diagnostics || {};
    const detectorStatus = diagnostics.detectorStatus || {};
    const delayed = Object.values(detectorStatus).some(status => status === "cached" || status === "timeout");
    const hasDiagnostics = Object.keys(diagnostics).length > 0;

    const sessionCount = numeric(diagnostics.sessionCount, S.serverState?.totalSessions || 0);
    const processCount = numeric(diagnostics.processCount, S.serverState?.totalProcesses || 0);
    const externalCount = numeric(diagnostics.externalCount, 0);
    const codexSignals = numeric(diagnostics.codexSessionCount, 0) + numeric(diagnostics.cursorWorkspaceCount, 0);

    const lastSignalAt = numeric(diagnostics.lastPollAt, S.lastStateAt || S.lastHeartbeat || 0);
    const ageLabel = lastSignalAt > 0 ? `${formatTimeAgo(Math.max(0, Date.now() - lastSignalAt))} 갱신` : "수집 중";

    let state = "scanning";
    let title = "탐지 준비 중";
    if (!S.connected) {
        state = "offline";
        title = "서버 연결 대기";
    } else if (!hasDiagnostics) {
        state = "scanning";
        title = "탐지 수집 중";
    } else if (delayed) {
        state = "degraded";
        title = "탐지 일부 지연";
    } else if (S.liveAgents.length > 0) {
        state = "live";
        title = "탐지 정상";
    } else {
        state = "ready";
        title = "시작 준비 완료";
    }

    let hint = `${active.length}명 근무 중 · ${working.length}명 집중 처리 중`;
    if (!S.connected) {
        hint = "서버 신호를 다시 붙이는 중입니다";
    } else if (delayed) {
        hint = "마지막 정상 탐지 값을 유지하고 있습니다";
    } else if (S.liveAgents.length === 0 && !diagnostics.claudeDirExists && externalCount === 0) {
        hint = "AI 세션을 실행하면 작업실에 자동으로 나타납니다";
    } else if (S.liveAgents.length === 0) {
        hint = "탐지기는 준비됐고 실시간 활동을 기다리는 중입니다";
    }

    const chips = [
        renderDiagnosticChip("Claude", diagnostics.claudeDirExists ? "준비" : "대기", diagnostics.claudeDirExists ? "ok" : "warn"),
        renderDiagnosticChip("세션", sessionCount.toLocaleString(), sessionCount > 0 ? "ok" : "neutral"),
        renderDiagnosticChip("프로세스", processCount.toLocaleString(), processCount > 0 ? "ok" : "neutral"),
        renderDiagnosticChip("AI 신호", (externalCount + codexSignals).toLocaleString(), externalCount + codexSignals > 0 ? "ok" : "neutral"),
    ].join("");

    el.dataset.state = state;
    el.classList.toggle("is-empty-office", S.liveAgents.length === 0);
    el.innerHTML = `
        <div class="diag-row">
            <span class="detector-pill"><span class="detector-dot"></span>${esc(title)}</span>
            <span class="diag-age">${esc(ageLabel)}</span>
        </div>
        <div class="diag-grid">${chips}</div>
        <div class="diag-hint">${esc(hint)}</div>
    `;
}

function detectorTone(status) {
    if (status === "fresh") return "ok";
    if (status === "cached") return "warn";
    if (status === "timeout") return "bad";
    return "neutral";
}

function detectorLabel(status) {
    return {
        fresh: "정상",
        cached: "캐시",
        timeout: "지연",
    }[status] || "대기";
}

function connectionHealth() {
    const age = Math.max(0, Date.now() - numeric(S.lastHeartbeat, Date.now()));
    if (!S.connected) {
        return {
            tone: "bad",
            label: "재연결",
            detail: `${S.reconnectAttempt || 0}회 시도`,
            ageLabel: formatTimeAgo(age),
        };
    }
    if (age > 22000) {
        return { tone: "bad", label: "응답 없음", detail: formatTimeAgo(age), ageLabel: formatTimeAgo(age) };
    }
    if (age > 12000) {
        return { tone: "warn", label: "느림", detail: formatTimeAgo(age), ageLabel: formatTimeAgo(age) };
    }
    return { tone: "ok", label: "Live", detail: formatTimeAgo(age), ageLabel: formatTimeAgo(age) };
}

function healthSnapshot(active, working, review) {
    const diagnostics = S.serverState?.diagnostics || {};
    const detectorStatus = diagnostics.detectorStatus || {};
    const hasDiagnostics = Object.keys(diagnostics).length > 0;
    const delayed = Object.values(detectorStatus).some(status => status === "cached" || status === "timeout");
    const lastSignalAt = numeric(diagnostics.lastPollAt, S.lastStateAt || S.lastHeartbeat || 0);
    const ageLabel = lastSignalAt > 0 ? formatTimeAgo(Math.max(0, Date.now() - lastSignalAt)) : "수집 중";

    let state = "ready";
    let title = "탐지 정상";
    let hint = `${active.length}명 감지 · ${working.length}명 작업 중`;
    if (!S.connected) {
        state = "offline";
        title = "서버 연결 대기";
        hint = `재연결 ${S.reconnectAttempt || 0}회 시도 중입니다.`;
    } else if (!hasDiagnostics) {
        state = "scanning";
        title = "진단 수집 중";
        hint = "탐지기가 첫 상태를 보내는 중입니다.";
    } else if (delayed) {
        state = "degraded";
        title = "탐지 일부 지연";
        hint = "마지막 정상 값을 유지하고 있습니다.";
    } else if (S.liveAgents.length === 0) {
        state = "empty";
        title = "직원 감지 대기";
        hint = "AI 세션을 실행하면 자동으로 작업실에 나타납니다.";
    } else if (review.length > 0) {
        state = "attention";
        title = "검토 필요";
        hint = `${review.length}명의 직원이 확인을 기다립니다.`;
    }

    return { diagnostics, detectorStatus, hasDiagnostics, delayed, lastSignalAt, ageLabel, state, title, hint };
}

function renderSystemHealth(active, working, review) {
    const panel = document.getElementById("system-health-panel");
    if (!panel) return;

    const health = healthSnapshot(active, working, review);
    const diagnostics = health.diagnostics;
    const detectorStatus = health.detectorStatus;
    const connection = connectionHealth();
    const detectorRows = [
        ["processes", "프로세스"],
        ["external", "AI 앱"],
        ["codex", "Codex"],
        ["cursor", "Cursor"],
    ].map(([key, label]) => {
        const status = detectorStatus[key] || "pending";
        return `
            <span class="health-detector" data-tone="${detectorTone(status)}">
                <i></i>
                <b>${esc(label)}</b>
                <em>${esc(detectorLabel(status))}</em>
            </span>`;
    }).join("");

    const statRows = [
        ["세션", numeric(diagnostics.sessionCount, S.serverState?.totalSessions || 0)],
        ["프로세스", numeric(diagnostics.processCount, S.serverState?.totalProcesses || 0)],
        ["Codex", numeric(diagnostics.codexSessionCount, 0)],
        ["Cursor", numeric(diagnostics.cursorWorkspaceCount, 0)],
    ].map(([label, value]) => `
        <span class="health-stat">
            <strong class="tabular-nums">${Number(value).toLocaleString()}</strong>
            <em>${esc(label)}</em>
        </span>
    `).join("");

    panel.dataset.state = health.state;
    panel.innerHTML = `
        <div class="health-head">
            <div>
                <span class="health-kicker">시스템 상태</span>
                <strong>${esc(health.title)}</strong>
            </div>
            <span class="health-age">${esc(health.ageLabel)}</span>
        </div>
        <div class="health-hint">${esc(health.hint)}</div>
        <div class="health-connection" data-tone="${esc(connection.tone)}">
            <span><i></i>WebSocket</span>
            <strong>${esc(connection.label)}</strong>
            <em>${esc(connection.detail)}</em>
        </div>
        <div class="health-detectors">${detectorRows}</div>
        <div class="health-stats">${statRows}</div>
        <div class="health-actions">
            <button type="button" class="health-action" data-health-action="copy">
                <iconify-icon icon="solar:copy-linear" aria-hidden="true"></iconify-icon>
                <span>진단 복사</span>
            </button>
            <button type="button" class="health-action" data-health-action="reload">
                <iconify-icon icon="solar:refresh-linear" aria-hidden="true"></iconify-icon>
                <span>새로고침</span>
            </button>
        </div>
    `;

    panel.querySelector('[data-health-action="copy"]')?.addEventListener("click", event => {
        const payload = {
            copiedAt: new Date().toISOString(),
            connected: S.connected,
            reconnectAttempt: S.reconnectAttempt,
            lastHeartbeat: S.lastHeartbeat,
            agentCount: S.liveAgents.length,
            activeCount: active.length,
            workingCount: working.length,
            reviewCount: review.length,
            diagnostics,
        };
        copyTextToClipboard(JSON.stringify(payload, null, 2), event.currentTarget);
    });
    panel.querySelector('[data-health-action="reload"]')?.addEventListener("click", () => window.location.reload());
}

function briefHeadline(active, working, review, pinned, stale) {
    if (!S.connected) {
        return {
            tone: "offline",
            icon: "solar:plug-circle-linear",
            title: "연결 대기",
            detail: `재연결 ${S.reconnectAttempt || 0}회`,
        };
    }
    if (review.length > 0) {
        return {
            tone: "attention",
            icon: "solar:clipboard-check-linear",
            title: "검토 우선",
            detail: `${review.length}명 확인 대기`,
        };
    }
    if (stale.length > 0) {
        return {
            tone: "warn",
            icon: "solar:radar-2-linear",
            title: "신호 확인",
            detail: `${stale.length}명 갱신 지연`,
        };
    }
    if (pinned.length > 0) {
        return {
            tone: "pinned",
            icon: "solar:star-bold",
            title: "고정 직원 추적",
            detail: `${pinned.length}명 상단 유지`,
        };
    }
    if (working.length > 0) {
        return {
            tone: "live",
            icon: "solar:bolt-circle-linear",
            title: "작업 흐름 정상",
            detail: `${working.length}명 집중 중`,
        };
    }
    if (active.length > 0) {
        return {
            tone: "ready",
            icon: "solar:users-group-rounded-linear",
            title: "대기 직원 확인",
            detail: `${active.length}명 활성`,
        };
    }
    return {
        tone: "empty",
        icon: "solar:radar-2-linear",
        title: "직원 감지 대기",
        detail: "세션 대기 중",
    };
}

function briefAgentName(agent) {
    if (!agent) return "대상 없음";
    return getAgentTheme(agent).name;
}

function briefWork(agent) {
    if (!agent) return "";
    const status = agent.isRunning ? agent.status : "offline";
    return getWorkText(agent) || firstLine(agent.currentWork?.prompt || agent.currentTask?.subject || STATUS_META[status]?.label || "", 32);
}

function renderBriefAction(action) {
    return `
        <button type="button"
            class="brief-action"
            data-brief-action="${esc(action.key)}"
            ${action.pid != null ? `data-pid="${esc(action.pid)}"` : ""}
            ${action.filter ? `data-filter="${esc(action.filter)}"` : ""}
            ${action.search ? `data-search="${esc(action.search)}"` : ""}
            ${action.actionFilter ? `data-action-filter="${esc(action.actionFilter)}"` : ""}
            data-tone="${esc(action.tone || "neutral")}"
            aria-label="${esc(`${action.label} ${action.value || ""} ${action.detail || ""}`)}">
            <span class="brief-action-icon">
                <iconify-icon icon="${esc(action.icon)}" aria-hidden="true"></iconify-icon>
            </span>
            <span class="brief-action-copy">
                <strong>${esc(action.label)}</strong>
                <em>${esc(action.detail || "")}</em>
            </span>
            <span class="brief-action-value tabular-nums">${esc(action.value || "")}</span>
        </button>
    `;
}

function renderOperatorBrief(active, working, review) {
    const panel = document.getElementById("operator-brief-panel");
    if (!panel) return;

    const activeSorted = [...active].sort(agentSortByLivePriority);
    const reviewSorted = [...review].sort(agentSortByLivePriority);
    const pinned = activeSorted.filter(isAgentPinned);
    const stale = activeSorted.filter(agent => {
        const info = agentSignalInfo(agent);
        return info.age > 15 * 60 * 1000;
    });
    const headline = briefHeadline(activeSorted, working, reviewSorted, pinned, stale);
    const actionLabels = {
        review: "검토 대기",
        focus: "포커스",
        stale: "신호 지연",
        pinned: "고정 직원",
        working: "진행 작업",
        recent: "최근 활동",
        idle: "대기 직원",
    };
    const actionGroups = new Map();
    activeSorted.forEach(agent => {
        const action = getAgentNextAction(agent);
        if (action.key === "offline") return;
        if (!actionGroups.has(action.key)) {
            actionGroups.set(action.key, { action, agents: [] });
        }
        actionGroups.get(action.key).agents.push(agent);
    });

    const actions = [...actionGroups.values()]
        .sort((a, b) => a.action.rank - b.action.rank)
        .map(group => {
            const agent = group.agents[0];
            const signal = agentSignalInfo(agent);
            return {
                key: group.action.key,
                tone: group.action.tone,
                icon: group.action.icon,
                label: actionLabels[group.action.key] || group.action.label,
                detail: `${briefAgentName(agent)} · ${group.action.key === "stale" ? signal.ageLabel : briefWork(agent)}`,
                value: group.agents.length,
                pid: agent.pid,
                filter: group.action.key === "review" || group.action.key === "working" ? "coding" : "all",
                actionFilter: group.action.key,
                rank: group.action.rank,
            };
        })
        .slice(0, 3);

    if (actions.length === 0) {
        actions.push({
            key: "all",
            tone: "neutral",
            icon: "solar:list-check-linear",
            label: activeSorted.length ? "전체 직원" : "대기 상태",
            detail: activeSorted.length ? `${activeSorted.length}명 활성` : "탐지 준비 완료",
            value: activeSorted.length || "",
            filter: "all",
        });
    }

    const dedupedActions = [];
    const seenKeys = new Set();
    actions.forEach(action => {
        const identity = `${action.key}:${action.pid ?? action.filter ?? action.search ?? ""}`;
        if (seenKeys.has(identity) || dedupedActions.length >= 3) return;
        seenKeys.add(identity);
        dedupedActions.push(action);
    });

    panel.dataset.tone = headline.tone;
    panel.innerHTML = `
        <div class="brief-head">
            <span class="brief-icon">
                <iconify-icon icon="${esc(headline.icon)}" aria-hidden="true"></iconify-icon>
            </span>
            <div>
                <span class="brief-kicker">운영 브리핑</span>
                <strong>${esc(headline.title)}</strong>
            </div>
            <em>${esc(headline.detail)}</em>
        </div>
        <div class="brief-actions">${dedupedActions.map(renderBriefAction).join("")}</div>
    `;

    panel.querySelectorAll(".brief-action").forEach(button => {
        button.addEventListener("click", () => {
            const filter = button.dataset.filter;
            const search = button.dataset.search;
            const actionFilter = button.dataset.actionFilter;
            const pid = button.dataset.pid;
            if (filter) window.setFilter?.(filter);
            if (actionFilter) window.setActionFilter?.(actionFilter);
            if (search) window.setAgentSearch?.(search);
            if (pid != null) {
                window.focusAgentByPid?.(pid);
                openMobilePanel("#detail-panel");
            } else {
                openMobilePanel("#agents-heading");
            }
        });
    });
}

function agentSortByLivePriority(a, b) {
    const priorityCompare = compareAgentPriority(a, b, priorityContext());
    if (priorityCompare !== 0) return priorityCompare;
    const statusPriority = { coding: 0, reviewing: 1, searching: 2, thinking: 3, meeting: 4, idle: 5, offline: 6 };
    const sa = statusPriority[a.isRunning ? a.status : "offline"] ?? 9;
    const sb = statusPriority[b.isRunning ? b.status : "offline"] ?? 9;
    if (sa !== sb) return sa - sb;
    return timestampValue(b) - timestampValue(a);
}

function pidKey(pid) {
    return String(pid);
}

function pinnedKeys() {
    if (!Array.isArray(S.pinnedAgentKeys)) S.pinnedAgentKeys = [];
    return S.pinnedAgentKeys;
}

function priorityContext() {
    return {
        selectedPid: S.selectedPid,
        directorFocusPid: S.directorFocusPid,
        pinnedKeys: pinnedKeys(),
    };
}

function agentPinKey(agent) {
    return getAgentPinKey(agent);
}

function isAgentPinned(agent) {
    return isPinnedByKeys(agent, pinnedKeys());
}

function getAgentNextAction(agent) {
    return agentNextAction(agent, priorityContext());
}

function filterActionContext() {
    return {
        selectedPid: null,
        directorFocusPid: null,
        pinnedKeys: pinnedKeys(),
    };
}

function getAgentFilterAction(agent) {
    return agentNextAction(agent, filterActionContext());
}

function actionFilterCountMap(agents) {
    const counts = new Map(ACTION_FILTERS.map(item => [item.key, 0]));
    agents.forEach(agent => {
        const key = getAgentFilterAction(agent).key;
        counts.set(key, (counts.get(key) || 0) + 1);
    });
    counts.set("all", agents.length);
    return counts;
}

function updateActionFilterChips() {
    const bar = document.getElementById("action-filter");
    if (!bar) return;

    const baseAgents = getPanelFilteredAgents({ includeActionFilter: false });
    const counts = actionFilterCountMap(baseAgents);
    const activeFilter = ACTION_FILTERS.some(item => item.key === S.activeActionFilter)
        ? S.activeActionFilter
        : "all";
    if (activeFilter !== S.activeActionFilter) S.activeActionFilter = activeFilter;

    bar.innerHTML = ACTION_FILTERS
        .filter(item => item.key === "all" || counts.get(item.key) > 0 || item.key === activeFilter)
        .map(item => {
            const count = counts.get(item.key) || 0;
            const active = item.key === activeFilter;
            return `
                <button type="button"
                    class="action-filter-chip${active ? " active" : ""}"
                    data-action-filter="${esc(item.key)}"
                    aria-pressed="${active ? "true" : "false"}"
                    ${count === 0 && item.key !== "all" ? "disabled" : ""}
                    aria-label="${esc(`${item.label} ${count}명 보기`)}">
                    <iconify-icon icon="${esc(item.icon)}" aria-hidden="true"></iconify-icon>
                    <span>${esc(item.label)}</span>
                    <b class="tabular-nums">${count}</b>
                </button>
            `;
        }).join("");

    bar.querySelectorAll(".action-filter-chip[data-action-filter]").forEach(button => {
        button.addEventListener("click", () => window.setActionFilter?.(button.dataset.actionFilter || "all"));
    });
}

function savePinnedAgents() {
    S.pinnedAgentKeys = [...new Set(pinnedKeys().map(String).filter(Boolean))].slice(0, 40);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(S.pinnedAgentKeys));
    localStorage.removeItem(PIN_LEGACY_STORAGE_KEY);
}

function toggleAgentPin(agent) {
    if (!agent) return;
    const key = agentPinKey(agent);
    const legacyKey = pidKey(agent.pid);
    const keys = new Set(pinnedKeys());
    const pinned = isAgentPinned(agent);
    keys.delete(legacyKey);
    if (pinned) {
        keys.delete(key);
    } else {
        keys.add(key);
    }
    S.pinnedAgentKeys = [...keys];
    savePinnedAgents();
    updatePanel();
    updateDetailPanel();
    updateLiveHud();
}

function uniqueAgents(list) {
    const seen = new Set();
    return list.filter(agent => {
        const key = pidKey(agent.pid);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function workEventMeta(event) {
    const fallback = STATUS_META[event.status] || STATUS_META.idle;
    // 라벨이 이미 들어와 있으면(ws.js 에서 이미 i18n 분기) 그대로 쓰고, 없을 때만 현재 언어로 기본값.
    const lgW = (window.aiTycoonI18n?.getLang?.() || "ko");
    const labels = lgW === "en"
        ? { join: "Joined", leave: "Left", work: "New work", review: "Review", start: "Task start", done: "Done" }
        : { join: "출근", leave: "퇴근", work: "새 작업", review: "검토 요청", start: "태스크 시작", done: "완료" };
    const byType = {
        join: { label: event.label || labels.join, icon: "solar:login-2-linear" },
        leave: { label: event.label || labels.leave, icon: "solar:logout-2-linear" },
        status: { label: event.label || fallback.label, icon: fallback.icon },
        work: { label: event.label || labels.work, icon: "solar:bolt-circle-linear" },
        review: { label: event.label || labels.review, icon: "solar:clipboard-check-linear" },
        "task-start": { label: event.label || labels.start, icon: "solar:play-circle-linear" },
        "task-done": { label: event.label || labels.done, icon: "solar:check-circle-linear" },
    };
    return byType[event.type] || { label: event.label || fallback.label, icon: fallback.icon };
}

function inspectWorkEvent(pid, key) {
    if (pid == null) return;
    S.inspectedEventKey = key || null;
    window.focusAgentByPid?.(pid);
    openMobilePanel("#detail-panel");
}

function openMobilePanel(focusSelector) {
    if (window.innerWidth > 480) return;
    const panel = document.getElementById("side-panel");
    if (panel && panel.classList.contains("panel-hidden")) {
        panel.dataset.userToggled = "true";
        panel.classList.remove("panel-hidden");
        window.syncSidePanelState?.();
        setTimeout(() => window.dispatchEvent(new Event("resize")), 120);
    }
    if (focusSelector) {
        setTimeout(() => document.querySelector(focusSelector)?.focus({ preventScroll: true }), 160);
    }
}

function renderWorkEvent(event, idx, now) {
    const agent = S.liveAgents.find(a => pidKey(a.pid) === pidKey(event.pid));
    const theme = agent ? getAgentTheme(agent, idx) : AGENT_THEMES[idx % AGENT_THEMES.length];
    const status = agent ? (agent.isRunning ? agent.status : "offline") : event.status;
    const meta = workEventMeta({ ...event, status });
    const statusMeta = STATUS_META[status] || STATUS_META.idle;
    const platform = PLATFORM_META[event.platform || agent?.platform] || PLATFORM_META.claude;
    const pct = agent ? taskProgress(agent) : (event.type === "task-done" ? 100 : 56);
    const age = now - event.ts < 5000 ? "방금" : formatTimeAgo(now - event.ts);
    const isFresh = now - event.ts < 6000;
    const color = event.color || theme.body;
    const statusColor = event.statusColor || statusMeta.color;
    const key = String(event.key || `${event.type}|${event.pid}|${event.text || ""}`);
    const isInspected = S.inspectedEventKey === key;
    const ariaLabel = `${event.agentName || theme.name} ${meta.label}: ${event.text || agent?.currentTask?.subject || "상태 갱신"}`;

    return `
        <article class="stream-item stream-${esc(event.type || "status")}${event.type === "review" ? " needs-review" : ""}${isFresh ? " is-fresh" : ""}${isInspected ? " is-inspected" : ""}"
            role="button"
            tabindex="0"
            data-pid="${esc(event.pid)}"
            data-event-key="${esc(key)}"
            aria-label="${esc(ariaLabel)}"
            aria-current="${isInspected ? "true" : "false"}"
            style="--agent-color:${color}; --status-color:${statusColor};">
            <div class="stream-glow"></div>
            <div class="stream-icon">
                <iconify-icon icon="${meta.icon}" class="text-sm"></iconify-icon>
            </div>
            <div class="stream-copy">
                <div class="stream-topline">
                    <strong>${esc(event.agentName || theme.name)}</strong>
                    <span>${esc(platform.badge)}</span>
                    <em>${esc(meta.label)}</em>
                    <small>${esc(age)}</small>
                </div>
                <div class="stream-work">${esc(event.text || agent?.currentTask?.subject || "상태 갱신")}</div>
                <div class="stream-progress"><span style="width:${pct}%"></span></div>
            </div>
        </article>
    `;
}

function bindWorkEventActions(container) {
    if (!container) return;
    container.querySelectorAll(".stream-item[data-pid]").forEach(item => {
        const activate = () => inspectWorkEvent(item.dataset.pid, item.dataset.eventKey);
        item.addEventListener("click", activate);
        item.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            activate();
        });
    });
}

function renderActivityTimeline(now) {
    const timeline = document.getElementById("activity-timeline");
    const count = document.getElementById("activity-count");
    if (!timeline) return;

    const events = S.workEvents.slice(0, 12);
    if (count) count.textContent = events.length ? `${events.length}` : "";
    timeline.classList.toggle("is-empty", events.length === 0);
    if (events.length === 0) {
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const title = lang === "en" ? "Collecting activity…" : "활동 수집 중";
        const body  = lang === "en"
            ? "Events show up here as agents start working."
            : "직원이 작업을 시작하면 여기에 시간순으로 쌓입니다";
        timeline.innerHTML = `
            <div class="activity-empty">
                <iconify-icon icon="solar:radar-2-linear" aria-hidden="true"></iconify-icon>
                <strong>${esc(title)}</strong>
                <span>${esc(body)}</span>
            </div>`;
        return;
    }

    timeline.innerHTML = events.map((event, idx) => renderWorkEvent(event, idx, now)).join("");
    bindWorkEventActions(timeline);
}

function renderAgentFocusRail() {
    const rail = document.getElementById("agent-focus-rail");
    if (!rail) return;

    const activeAgents = [...S.liveAgents]
        .filter(agent => agent.isRunning)
        .sort(agentSortByLivePriority);

    rail.classList.toggle("is-empty", activeAgents.length === 0);
    if (activeAgents.length === 0) {
        rail.innerHTML = "";
        return;
    }

    const workingCount = activeAgents.filter(agent =>
        ["coding", "thinking", "searching", "reviewing", "meeting"].includes(agent.status)
    ).length;
    const reviewCount = activeAgents.filter(agent => agent.needsReview || agent.status === "reviewing").length;
    const pinnedCount = activeAgents.filter(isAgentPinned).length;
    rail.setAttribute("aria-label", `실시간 직원 작업 보드, 활성 ${activeAgents.length}명, 작업 ${workingCount}명, 고정 ${pinnedCount}명`);

    const summaryHtml = `
        <div class="agent-focus-summary" aria-label="작업 보드 요약">
            <span>작업 보드</span>
            <strong class="tabular-nums">${activeAgents.length}</strong>
            ${pinnedCount ? `<i class="tabular-nums">고정 ${pinnedCount}</i>` : ""}
            <em class="tabular-nums">작업 ${workingCount}</em>
            ${reviewCount ? `<b class="tabular-nums">검토 ${reviewCount}</b>` : ""}
        </div>
    `;

    rail.innerHTML = summaryHtml + activeAgents.map((agent, idx) => {
        const theme = getAgentTheme(agent, idx);
        const status = agent.isRunning ? agent.status : "offline";
        const meta = STATUS_META[status] || STATUS_META.idle;
        const platform = PLATFORM_META[agent.platform] || PLATFORM_META.claude;
        const pct = taskProgress(agent);
        const work = getWorkText(agent) || firstLine(agent.currentWork?.prompt || agent.currentTask?.subject || meta.label, 36);
        const isCurrent = pidKey(agent.pid) === pidKey(S.selectedPid) || pidKey(agent.pid) === pidKey(S.directorFocusPid);
        const pinned = isAgentPinned(agent);
        const action = getAgentNextAction(agent);
        const ariaLabel = `${theme.name}, ${agent.projectName || platform.label}, ${meta.label}, ${work}${pinned ? ", 고정됨" : ""}, 카메라 포커스`;

        return `
            <button type="button"
                class="agent-focus-chip${isCurrent ? " is-current" : ""}${agent.needsReview ? " needs-review" : ""}${pinned ? " is-pinned" : ""}"
                data-action="${esc(action.key)}"
                data-pid="${esc(agent.pid)}"
                aria-label="${esc(ariaLabel)}"
                aria-current="${isCurrent ? "true" : "false"}"
                style="--agent-color:${theme.body}; --status-color:${meta.color};">
                <span class="rail-avatar" aria-hidden="true">
                    <span>${esc(theme.name.slice(0, 1))}</span>
                    ${pinned ? `<i class="rail-pin-dot"><iconify-icon icon="solar:star-bold"></iconify-icon></i>` : ""}
                </span>
                <span class="rail-copy">
                    <span class="rail-topline">
                        <strong>${esc(theme.name)}</strong>
                        <em>${esc(platform.badge)}</em>
                        <span class="rail-action-badge" data-tone="${esc(action.tone)}">${esc(action.label)}</span>
                        ${agent.needsReview ? `<b>검토</b>` : ""}
                    </span>
                    <span class="rail-work">${esc(work)}</span>
                    <span class="rail-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>
                </span>
                <iconify-icon icon="${meta.icon}" class="rail-status" aria-hidden="true"></iconify-icon>
            </button>
        `;
    }).join("");

    rail.querySelectorAll(".agent-focus-chip").forEach(button => {
        button.addEventListener("click", () => window.focusAgentByPid?.(button.dataset.pid));
    });
}

function renderMobilePriorityDock() {
    const dock = document.getElementById("mobile-priority-dock");
    if (!dock) return;

    const active = S.liveAgents
        .filter(agent => agent.isRunning)
        .sort(agentSortByLivePriority);
    const working = active.filter(agent => ["coding", "thinking", "searching", "reviewing", "meeting"].includes(agent.status));
    const review = active.filter(agent => agent.needsReview || agent.status === "reviewing");
    const pinned = active.filter(isAgentPinned);
    const topAgents = uniqueAgents([...pinned, ...review, ...working, ...active])
        .slice(0, 3);

    dock.classList.toggle("is-empty", active.length === 0);
    if (active.length === 0) {
        dock.innerHTML = `
            <div class="mobile-dock-head">
                <span>대기 중</span>
                <em>0명</em>
            </div>
            <div class="mobile-dock-empty">AI 세션 감지 대기</div>
            <div class="mobile-dock-actions">
                <button type="button" class="mobile-dock-action" data-mobile-action="search">
                    <iconify-icon icon="solar:magnifer-linear" aria-hidden="true"></iconify-icon><span>검색</span>
                </button>
                <button type="button" class="mobile-dock-action" data-mobile-action="list">
                    <iconify-icon icon="solar:list-check-linear" aria-hidden="true"></iconify-icon><span>목록</span>
                </button>
            </div>`;
    } else {
        const cardHtml = topAgents.map((agent, idx) => {
            const theme = getAgentTheme(agent, idx);
            const status = agent.isRunning ? agent.status : "offline";
            const meta = STATUS_META[status] || STATUS_META.idle;
            const platform = PLATFORM_META[agent.platform] || PLATFORM_META.claude;
            const work = getWorkText(agent) || firstLine(agent.currentWork?.prompt || agent.currentTask?.subject || meta.label, 44);
            const pct = taskProgress(agent);
            const pinnedAgent = isAgentPinned(agent);
            const action = getAgentNextAction(agent);
            return `
                <button type="button"
                    class="mobile-priority-card${agent.needsReview ? " needs-review" : ""}${pinnedAgent ? " is-pinned" : ""}"
                    data-action="${esc(action.key)}"
                    data-pid="${esc(agent.pid)}"
                    aria-label="${esc(`${theme.name}, ${agent.projectName || platform.label}, ${action.label}, ${work}${pinnedAgent ? ", 고정됨" : ""}`)}"
                    style="--agent-color:${theme.body}; --status-color:${meta.color};">
                    <span class="mobile-priority-avatar" aria-hidden="true">${esc(theme.name.slice(0, 1))}</span>
                    <span class="mobile-priority-copy">
                        <span class="mobile-priority-top">
                            <strong>${esc(theme.name)}</strong>
                            <em>${esc(platform.badge)}</em>
                            <span data-tone="${esc(action.tone)}">${esc(action.label)}</span>
                            ${agent.needsReview ? `<b>검토</b>` : ""}
                        </span>
                        <span class="mobile-priority-work">${esc(work)}</span>
                        <span class="mobile-priority-progress" aria-hidden="true"><i style="width:${pct}%"></i></span>
                    </span>
                    <iconify-icon icon="${meta.icon}" class="mobile-priority-status" aria-hidden="true"></iconify-icon>
                </button>`;
        }).join("");

        dock.innerHTML = `
            <div class="mobile-dock-head">
                <span>지금 볼 일</span>
                <em class="tabular-nums">활성 ${active.length}</em>
                ${pinned.length ? `<em class="pinned-mobile-count tabular-nums">고정 ${pinned.length}</em>` : ""}
                <em class="tabular-nums">작업 ${working.length}</em>
                ${review.length ? `<b class="tabular-nums">검토 ${review.length}</b>` : ""}
            </div>
            <div class="mobile-priority-list">${cardHtml}</div>
            <div class="mobile-dock-actions">
                <button type="button" class="mobile-dock-action" data-mobile-action="search">
                    <iconify-icon icon="solar:magnifer-linear" aria-hidden="true"></iconify-icon><span>검색</span>
                </button>
                <button type="button" class="mobile-dock-action" data-mobile-action="list">
                    <iconify-icon icon="solar:list-check-linear" aria-hidden="true"></iconify-icon><span>목록</span>
                </button>
            </div>`;
    }

    dock.querySelectorAll(".mobile-priority-card[data-pid]").forEach(button => {
        button.addEventListener("click", () => {
            window.focusAgentByPid?.(button.dataset.pid);
            openMobilePanel("#detail-panel");
        });
    });
    dock.querySelector('[data-mobile-action="search"]')?.addEventListener("click", () => window.focusAgentSearch?.());
    dock.querySelector('[data-mobile-action="list"]')?.addEventListener("click", () => openMobilePanel("#panel-close"));
}

function copyAgentValue(agent, kind) {
    if (kind === "pid") return String(agent.pid || "");
    if (kind === "session") return String(agent.sessionId || "");
    if (kind === "cwd") return String(agent.cwd || "");
    if (kind === "work") return String(agent.currentWork?.prompt || getWorkText(agent) || "");
    return "";
}

async function copyTextToClipboard(text, button) {
    if (!text) return;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }
        if (button) {
            const original = button.innerHTML;
            button.classList.add("is-copied");
            button.innerHTML = `<iconify-icon icon="solar:check-circle-linear" aria-hidden="true"></iconify-icon><span>복사됨</span>`;
            setTimeout(() => {
                button.classList.remove("is-copied");
                button.innerHTML = original;
            }, 1300);
        }
    } catch (error) {
        console.warn("[AI Tycoon] Clipboard copy failed:", error);
    }
}

function statusFilterForRadar(key) {
    if (["coding", "thinking", "searching", "reviewing", "meeting"].includes(key)) return "coding";
    if (key === "idle") return "idle";
    if (key === "offline") return "offline";
    return "all";
}

function renderTeamRadar() {
    const radar = document.getElementById("team-radar");
    if (!radar) return;

    const total = S.liveAgents.length;
    radar.classList.toggle("is-empty", total === 0);
    if (total === 0) {
        radar.innerHTML = "";
        return;
    }

    const statusCounts = [
        { key: "coding", label: "코딩", count: 0 },
        { key: "searching", label: "검색", count: 0 },
        { key: "thinking", label: "생각", count: 0 },
        { key: "reviewing", label: "검토", count: 0 },
        { key: "idle", label: "대기", count: 0 },
        { key: "offline", label: "오프", count: 0 },
    ];
    const statusMap = new Map(statusCounts.map(item => [item.key, item]));
    const platformCounts = new Map();
    let activeCount = 0;
    let loadScore = 0;

    S.liveAgents.forEach(agent => {
        const status = agent.isRunning ? agent.status : "offline";
        const normalized = statusMap.has(status) ? status : (agent.isRunning ? "coding" : "offline");
        statusMap.get(normalized).count++;
        if (agent.isRunning) activeCount++;
        if (["coding", "reviewing"].includes(status)) loadScore += 1;
        else if (["searching", "thinking", "meeting"].includes(status)) loadScore += 0.7;
        else if (status === "idle") loadScore += 0.18;
        const platform = agent.platform || "unknown";
        platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);
    });

    const loadPct = total > 0 ? Math.min(100, Math.round((loadScore / total) * 100)) : 0;
    const reviewCount = statusMap.get("reviewing").count + S.liveAgents.filter(agent => agent.needsReview && agent.status !== "reviewing").length;
    statusMap.get("reviewing").count = reviewCount;
    const loadLabel = loadPct >= 72 ? "집중" : loadPct >= 38 ? "활성" : "여유";
    const activePct = Math.round((activeCount / total) * 100);

    const statusHtml = statusCounts
        .filter(item => item.count > 0)
        .map(item => {
            const meta = STATUS_META[item.key] || STATUS_META.idle;
            const width = Math.max(8, Math.round((item.count / total) * 100));
            const filter = statusFilterForRadar(item.key);
            const isPressed = S.activeFilter === filter || (filter === "coding" && S.activeFilter === "coding");
            return `
                <button type="button"
                    class="radar-segment${item.key === "reviewing" && reviewCount > 0 ? " needs-review" : ""}"
                    data-filter="${filter}"
                    aria-label="${esc(item.label)} ${item.count}명 보기"
                    aria-pressed="${isPressed ? "true" : "false"}"
                    style="--status-color:${meta.color}; --segment-width:${width}%;">
                    <span>${esc(item.label)}</span>
                    <b>${item.count}</b>
                    <i aria-hidden="true"><em></em></i>
                </button>
            `;
        }).join("");

    const platformHtml = [...platformCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([platform, count]) => {
            const meta = PLATFORM_META[platform] || { badge: platform.slice(0, 2).toUpperCase(), color: "#64748b" };
            return `<span class="radar-platform" style="--platform-color:${meta.color};"><i></i>${esc(meta.badge)}<b>${count}</b></span>`;
        }).join("");

    radar.innerHTML = `
        <div class="radar-head">
            <div>
                <span class="radar-kicker">팀 레이더</span>
                <strong id="team-radar-title">${loadLabel}</strong>
            </div>
            <div class="radar-score" style="--load:${loadPct}%;" aria-label="팀 부하 ${loadPct}%">
                <span>${loadPct}</span>
            </div>
        </div>
        <div class="radar-load" aria-hidden="true">
            <span style="width:${loadPct}%"></span>
        </div>
        <div class="radar-status-grid">${statusHtml}</div>
        <div class="radar-foot">
            <span class="radar-active">${activeCount}/${total} 활성 · ${activePct}%</span>
            <span class="radar-platforms">${platformHtml}</span>
        </div>
    `;

    radar.querySelectorAll(".radar-segment").forEach(button => {
        button.addEventListener("click", () => window.setFilter?.(button.dataset.filter || "all"));
    });
}

function updateConnQualityIndicator() {
    if (!S.connected) return;
    const badge = document.getElementById("conn-badge");
    const txt = document.getElementById("conn-text");
    if (!badge || !txt) return;
    const ms = avgHeartbeatGap();
    if (ms == null) return;
    const quality = connQuality();
    const lang = (window.aiTycoonI18n?.getLang?.()) || "ko";
    const live = lang === "en" ? "Live" : "실시간";
    txt.textContent = `${live} · ${Math.round(ms)}ms`;
    badge.dataset.connQuality = quality;
}

// ── Live HUD ──
export function updateLiveHud() {
    const activeEl = document.getElementById("hud-active");
    if (!activeEl) return;

    // Connection quality dot on the badge
    updateConnQualityIndicator();

    const active = S.liveAgents.filter(a => a.isRunning);
    const working = S.liveAgents.filter(a =>
        a.isRunning && ["coding", "thinking", "searching", "reviewing", "meeting"].includes(a.status)
    );
    const review = S.liveAgents.filter(a => a.needsReview || a.status === "reviewing");

    document.getElementById("hud-active").textContent = active.length;
    document.getElementById("hud-working").textContent = working.length;
    document.getElementById("hud-review").textContent = review.length;

    const reviewMetric = document.getElementById("hud-review")?.closest("div");
    if (reviewMetric) reviewMetric.classList.toggle("needs-attention", review.length > 0);

    renderDetectorHealth(active, working);
    renderSystemHealth(active, working, review);
    renderOperatorBrief(active, working, review);

    const panelToggle = document.getElementById("panel-toggle");
    if (panelToggle) {
        panelToggle.classList.toggle("has-review", review.length > 0);
        panelToggle.dataset.reviewCount = review.length > 0 ? String(review.length) : "";
        panelToggle.setAttribute("aria-label", review.length > 0 ? `사이드 패널 토글, 검토 ${review.length}건` : "사이드 패널 토글");
    }

    const directorFocus = S.liveAgents.find(a => pidKey(a.pid) === pidKey(S.directorFocusPid));
    const focus = directorFocus || [...working].sort(agentSortByLivePriority)[0] || [...active].sort(agentSortByLivePriority)[0];
    const focusName = document.getElementById("hud-focus-name");
    const focusWork = document.getElementById("hud-focus-work");
    const focusProgress = document.getElementById("hud-focus-progress");

    if (focus) {
        const theme = getAgentTheme(focus);
        const status = focus.isRunning ? focus.status : "offline";
        const meta = STATUS_META[status] || STATUS_META.idle;
        const work = getWorkText(focus) || firstLine(focus.currentWork?.prompt, 56) || meta.label;
        const lgF = (window.aiTycoonI18n?.getLang?.() || "ko");
        const trackingLabel = lgF === "en" ? "Tracking" : "추적 중";
        focusName.textContent = `${theme.name} · ${focus.projectName || focus.platformName || "Agent"}`;
        focusWork.textContent = `${S.directorMode ? trackingLabel : meta.label} · ${work}`;
        focusProgress.style.width = `${taskProgress(focus)}%`;
        focusProgress.style.background = `linear-gradient(90deg, ${theme.body}, ${meta.color})`;
    } else {
        const lgF = (window.aiTycoonI18n?.getLang?.() || "ko");
        const idleHead = lgF === "en" ? "Standing by" : "대기 중";
        const waitAct  = lgF === "en" ? "Waiting for new agent activity" : "새 에이전트 활동을 기다리는 중";
        const waitConn = lgF === "en" ? "Waiting for the server connection" : "서버 연결을 기다리는 중";
        focusName.textContent = idleHead;
        focusWork.textContent = S.connected ? waitAct : waitConn;
        focusProgress.style.width = S.connected ? "18%" : "8%";
        focusProgress.style.background = "linear-gradient(90deg, #94a3b8, #cbd5e1)";
    }

    const directorBtn = document.getElementById("director-toggle");
    if (directorBtn) {
        directorBtn.classList.toggle("active", S.directorMode);
        directorBtn.setAttribute("aria-pressed", S.directorMode ? "true" : "false");
    }

    const densityBtn = document.getElementById("pixi-density-toggle");
    if (densityBtn) {
        const mode = effectivePixiDensity();
        const reduced = prefersReducedMotion();
        const isAuto = !["rich", "balanced", "focus", "minimal"].includes(S.pixiDensity);
        const meta = reduced ? pixiDensityMeta("reduced") : pixiDensityMeta(isAuto ? "auto" : mode);
        const effectiveMeta = pixiDensityMeta(mode);
        densityBtn.dataset.density = mode;
        densityBtn.dataset.setting = isAuto ? "auto" : S.pixiDensity;
        densityBtn.dataset.auto = isAuto ? "true" : "false";
        densityBtn.dataset.reducedMotion = reduced ? "true" : "false";
        densityBtn.title = reduced
            ? "시각 효과: 저자극 (시스템 설정)"
            : isAuto
                ? `시각 효과: 자동 · 현재 ${effectiveMeta.label}`
                : `시각 효과: ${meta.label}`;
        densityBtn.setAttribute("aria-label", densityBtn.title);
        densityBtn.setAttribute("aria-expanded", document.getElementById("pixi-density-menu")?.hidden === false ? "true" : "false");
        densityBtn.removeAttribute("aria-pressed");
        const icon = document.getElementById("pixi-density-icon");
        if (icon) icon.setAttribute("icon", meta.icon);
        const label = document.getElementById("pixi-density-label");
        if (label) label.textContent = meta.label;
        const activeSetting = reduced ? "minimal" : isAuto ? "auto" : S.pixiDensity;
        document.querySelectorAll("[data-density-option]").forEach(option => {
            const active = option.dataset.densityOption === activeSetting;
            option.dataset.active = active ? "true" : "false";
            option.dataset.effective = option.dataset.densityOption === mode ? "true" : "false";
            option.setAttribute("aria-checked", active ? "true" : "false");
        });
    }

    renderAgentFocusRail();
    renderTeamRadar();
    renderMobilePriorityDock();

    const stream = document.getElementById("work-stream");
    if (!stream) return;

    const now = Date.now();
    renderActivityTimeline(now);

    const streamEvents = S.workEvents
        .filter(event => now - event.ts < 120000)
        .slice(0, 3);

    stream.classList.toggle("is-empty", streamEvents.length === 0);
    if (streamEvents.length === 0) {
        stream.innerHTML = "";
        return;
    }

    stream.innerHTML = streamEvents.map((event, idx) => renderWorkEvent(event, idx, now)).join("");
    bindWorkEventActions(stream);
}

// ── Side Panel ──
// Show/hide the empty-state CTA based on agents + demo state
function refreshEmptyCta() {
    const cta = document.getElementById("empty-cta");
    if (!cta) return;
    const demoOn = window.aiTycoonDemo?.isEnabled?.() === true;
    const hasAgents = (S.liveAgents || []).length > 0;
    cta.hidden = demoOn || hasAgents;
}

/** Render a one-line status breakdown above the agent list.
 *  Each chip is clickable and toggles the corresponding status filter. */
function renderAgentsStatusSummary() {
    const el = document.getElementById("agents-status-summary");
    if (!el) return;
    const agents = S.liveAgents || [];
    if (agents.length === 0) {
        el.hidden = true;
        el.innerHTML = "";
        return;
    }
    const buckets = { coding: 0, thinking: 0, reviewing: 0, searching: 0, idle: 0, offline: 0 };
    agents.forEach(a => {
        const s = a.isRunning ? (a.status || "idle") : "offline";
        if (buckets.hasOwnProperty(s)) buckets[s]++;
        else buckets.idle++;
    });
    const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
    const labels = lang === "en"
        ? { coding: "coding", thinking: "thinking", reviewing: "review", searching: "search", idle: "idle", offline: "offline" }
        : { coding: "코딩", thinking: "생각", reviewing: "검토", searching: "검색", idle: "대기", offline: "오프라인" };
    // Only show non-zero buckets, ordered by "activity level" descending
    const order = ["coding", "thinking", "reviewing", "searching", "idle", "offline"];
    const visible = order.filter(k => buckets[k] > 0);
    if (visible.length === 0) {
        el.hidden = true;
        el.innerHTML = "";
        return;
    }
    el.hidden = false;
    el.innerHTML = visible.map(k => {
        const meta = STATUS_META[k] || STATUS_META.idle;
        const active = (S.activeFilter === k);
        // Filter chip-style: clicking toggles the status filter
        const filterKey = (k === "coding" || k === "idle" || k === "offline") ? k : null;
        const role = filterKey ? "button" : "presentation";
        const cls = `agents-status-pill${active ? " is-active" : ""}${filterKey ? " is-clickable" : ""}`;
        const attrs = filterKey
            ? `role="button" tabindex="0" data-status-filter="${esc(filterKey)}"`
            : "";
        return `<span class="${cls}" ${attrs} style="--pill-color:${meta.color}">
            <span class="agents-status-dot" style="background:${meta.color}"></span>
            <span class="agents-status-num">${buckets[k]}</span>
            <span class="agents-status-label">${esc(labels[k])}</span>
        </span>`;
    }).join("");
    // Wire click handlers (only on clickable pills)
    el.querySelectorAll('[data-status-filter]').forEach(node => {
        const fk = node.getAttribute("data-status-filter");
        const handle = () => {
            // Toggle: clicking the active filter goes back to "all"
            if (S.activeFilter === fk) {
                if (typeof window.setFilter === "function") window.setFilter("all");
            } else if (typeof window.setFilter === "function") {
                window.setFilter(fk);
            }
        };
        node.addEventListener("click", handle);
        node.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handle(); }
        });
    });
}

export function updatePanel() {
    updateFilterChips();
    refreshEmptyCta();

    const list = document.getElementById("agents-list");
    list.innerHTML = "";

    // Agent count
    const countEl = document.getElementById("agent-count");
    if (countEl) {
        const active = S.liveAgents.filter(a => a.isRunning).length;
        countEl.textContent = `${active}/${S.liveAgents.length}`;
    }

    // Status summary bar — bird's-eye breakdown so the user knows
    // what's happening even before scanning the agent list
    renderAgentsStatusSummary();

    const filteredAgents = getFilteredSortedAgents();
    updateSearchControls(filteredAgents);
    if (S.liveAgents.length === 0) {
        // 빈 상태 카드 + 지원 AI 도구 8종 로고 줄
        // 처음 보는 사용자가 "어떤 도구를 켜면 잡히는지" 한눈에 알 수 있게.
        const supported = [
            { id: "claude",   label: "Claude Code" },
            { id: "codex",    label: "Codex" },
            { id: "cursor",   label: "Cursor" },
            { id: "copilot",  label: "Copilot" },
            { id: "ollama",   label: "Ollama" },
            { id: "lmstudio", label: "LM Studio" },
            { id: "jan",      label: "Jan" },
            { id: "gpt4all",  label: "GPT4All" },
        ];
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const title = lang === "en" ? "Waiting for agents" : "직원을 기다리는 중";
        const sub = lang === "en"
            ? "Launch any of the AI tools below and they'll show up here automatically."
            : "아래 AI 도구 중 아무거나 켜면 자동으로 책상에 앉아요.";
        const demoLabel = lang === "en" ? "Try demo mode" : "데모 모드로 미리 보기";
        const platformChips = supported.map(p => {
            const meta = PLATFORM_META[p.id] || PLATFORM_META.claude;
            return `<span class="empty-platform-chip" style="background:${meta.badgeBg};color:${meta.color};border-color:${meta.color}55">
                <span class="empty-platform-dot" style="background:${meta.color}"></span>
                <span>${esc(p.label)}</span>
            </span>`;
        }).join("");
        list.innerHTML = `<div class="agent-empty-state agent-empty-rich">
            <iconify-icon icon="solar:radar-2-linear" aria-hidden="true"></iconify-icon>
            <strong>${esc(title)}</strong>
            <span>${esc(sub)}</span>
            <div class="empty-platforms" aria-label="${esc(lang === "en" ? "Supported AI platforms" : "지원 플랫폼")}">${platformChips}</div>
            <button type="button" class="empty-demo-btn" onclick="window.aiTycoonDemo?.toggle?.()">
                <iconify-icon icon="solar:play-circle-bold" aria-hidden="true"></iconify-icon>
                <span>${esc(demoLabel)}</span>
            </button>
        </div>`;
        return;
    }
    if (filteredAgents.length === 0 && S.liveAgents.length > 0) {
        const hasSearch = normalizeSearch(S.agentSearchQuery);
        const hasActionFilter = S.activeActionFilter !== "all";
        const resetAction = hasSearch ? "clearAgentSearch()" : hasActionFilter ? "setActionFilter('all')" : "setFilter('all')";
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        const isEn = lang === "en";
        const resetLabel = hasSearch
            ? (isEn ? "Clear search" : "검색 지우기")
            : hasActionFilter
                ? (isEn ? "Reset action filter" : "행동 필터 해제")
                : (isEn ? "Show all" : "전체 보기");
        const titleStr = hasSearch
            ? (isEn ? "No results" : "검색 결과가 없습니다")
            : (isEn ? "No agents match the filter" : "필터에 맞는 에이전트가 없습니다");
        const bodyStr = hasSearch
            ? (isEn ? "Double-check the name, project, or work text." : "직원 이름, 프로젝트, 작업 문구를 다시 확인해 주세요.")
            : hasActionFilter
                ? (isEn ? "Pick a different action filter or go back to all." : "다른 다음 행동을 선택하거나 전체로 돌아갈 수 있습니다.")
                : (isEn ? "Switch the filter back to All to see everyone." : "필터를 전체로 바꾸면 모든 직원을 볼 수 있습니다.");
        list.innerHTML = `<div class="agent-empty-state">
            <iconify-icon icon="${hasSearch ? "solar:magnifer-linear" : hasActionFilter ? "solar:bolt-circle-linear" : "solar:filter-linear"}" aria-hidden="true"></iconify-icon>
            <strong>${esc(titleStr)}</strong>
            <span>${esc(bodyStr)}</span>
            <button type="button" onclick="${resetAction}">${esc(resetLabel)}</button>
        </div>`;
        return;
    }

    filteredAgents.forEach((agent, idx) => {
        const status = agent.isRunning ? agent.status : "offline";
        const meta = STATUS_META[status] || STATUS_META.idle;
        // Use consistent theme per agent (based on global index, not filtered index)
        const globalIdx = S.liveAgents.indexOf(agent);
        const theme = AGENT_THEMES[(globalIdx >= 0 ? globalIdx : idx) % AGENT_THEMES.length];
        const pinned = isAgentPinned(agent);
        const action = getAgentNextAction(agent);

        // "Just joined" pulse — first 60 s after the visual agent was created
        const visual = S.visualAgents[agent.pid];
        const justJoined = visual && visual.joinedAt && (Date.now() - visual.joinedAt) < 60000;
        const noteText = getAgentNote(agent) || "";
        const hasNote = !!noteText;
        const stuck = isAgentStuck(agent);
        // 처음 stuck으로 전환된 순간에만 토스트 한 번
        maybeFireStuckToast(agent);
        const card = document.createElement("div");
        card.className = `agent-card${agent.pid === S.selectedPid ? " selected" : ""}${!agent.isRunning ? " is-offline" : ""}${pinned ? " is-pinned" : ""}${justJoined ? " is-new" : ""}${hasNote ? " has-note" : ""}${stuck ? " is-stuck" : ""}`;
        // 메모 있으면 카드에 native title 로 미리보기 — hover 시 OS 툴팁
        // (디테일 패널 안 열고도 첫 문장 확인 가능)
        if (hasNote) {
            const preview = noteText.replace(/\s+/g, " ").trim().slice(0, 140);
            card.dataset.notePreview = preview;
            card.title = `📝 ${preview}`;
        }
        card.dataset.action = action.key;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        const selectAgent = () => {
            const wasSelected = S.selectedPid === agent.pid;
            S.selectedPid = wasSelected ? null : agent.pid;
            S.detailPid = wasSelected ? null : agent.pid;
            updatePanel();
            updateDetailPanel();
        };
        card.onclick = selectAgent;
        card.onkeydown = (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            selectAgent();
        };

        // Show current work from latest prompt, falling back to tasks
        const lgCard = (window.aiTycoonI18n?.getLang?.() || "ko");
        const idleText = lgCard === "en" ? "Idle" : "대기 중";
        const taskCountText = (n) => lgCard === "en"
            ? `${n} task${n > 1 ? "s" : ""}`
            : `${n}개 태스크`;
        let task;
        if (agent.currentWork && agent.currentWork.prompt) {
            const cleaned = agent.currentWork.prompt.replace(/\[Pasted text[^\]]*\]/g, "").trim();
            const firstLine = cleaned.split("\n")[0].trim();
            task = firstLine.length > 3
                ? firstLine.substring(0, 50)
                : (agent.currentTask ? agent.currentTask.subject : idleText);
        } else if (agent.currentTask) {
            task = agent.currentTask.subject;
        } else {
            task = agent.tasks?.length > 0 ? taskCountText(agent.tasks.length) : idleText;
        }
        const age = workAge(agent);
        const signal = agentSignalInfo(agent);
        card.setAttribute(
            "aria-label",
            `${theme.name} ${agent.projectName}, ${meta.label}, ${pinned ? "고정됨, " : ""}${task}. 최근 ${signal.ageLabel}, 근거 ${signal.sourceLabel}`
        );

        const pct = taskProgress(agent);
        // Build sub-agent list HTML
        const allTasks = agent.tasks || [];
        const subTasks = allTasks.length <= 3
            ? allTasks
            : allTasks.filter(t => t.status !== "completed");
        let subHtml = "";
        if (subTasks.length > 0) {
            subHtml = `<div class="mt-2 flex flex-col gap-1">` +
                subTasks.slice(0, 5).map((t, ti) => {
                    const sc = SUB_COLORS[ti % SUB_COLORS.length];
                    const sIcon = t.status === "in_progress" ? "⚡" : t.status === "completed" ? "✓" : "◦";
                    const sOpacity = t.status === "completed" ? "opacity-50" : "";
                    const sLabel = (t.activeForm || t.subject || `Task ${t.id}`).substring(0, 28);
                    return `<div class="flex items-center gap-1.5 ${sOpacity}">
                        <div class="w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-[8px]" style="background:${sc}30;color:${sc};">${sIcon}</div>
                        <span class="text-[11px] text-zinc-500 truncate" style="word-break:keep-all;">${sLabel}</span>
                    </div>`;
                }).join("") +
                (subTasks.length > 5 ? `<div class="text-[10px] text-zinc-400">+${subTasks.length - 5}개 더</div>` : "") +
            `</div>`;
        }

        card.innerHTML = `
            <div class="agent-card-inner">
                <div class="flex items-center gap-2.5 mb-2">
                    <div class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style="background:${theme.body}30;">
                        <iconify-icon icon="${meta.icon}" style="color:${theme.body};" class="text-sm"></iconify-icon>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-[13px] font-bold text-zinc-800 truncate flex items-center gap-1.5">
                            <span class="agent-card-name">${esc(theme.name)}</span>
                            <span class="agent-card-sep" aria-hidden="true">·</span>
                            <span class="agent-project-dot" style="background:${projectColor(agent.projectName)}" title="${esc(agent.projectName || "")}" aria-hidden="true"></span>
                            <span class="agent-card-project truncate">${esc(agent.projectName)}</span>
                        </div>
                        <div class="text-[11px] text-zinc-400 tabular-nums font-medium flex items-center gap-1">
                            <span class="inline-flex items-center px-1 rounded text-[9px] font-bold" style="background:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badgeBg};color:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).color}">${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badge}</span>
                            ${agent.role && ROLE_META[agent.role] ? `<span class="inline-flex items-center px-1 rounded text-[9px] font-bold" style="background:${ROLE_META[agent.role].color}20;color:${ROLE_META[agent.role].color}">${ROLE_META[agent.role].badge}</span>` : ""}
                            ${stuck ? `<span class="agent-stuck-chip" title="5분 이상 활동 신호 없음 — 멈춘 것 같아요"><iconify-icon icon="solar:hourglass-line-linear" aria-hidden="true"></iconify-icon>멈춤?</span>` : ""}
                            <span>${agent.memoryMB}MB${agent.processCount > 1 ? ` · ${agent.processCount}p` : ""}${(() => {
                                const t = memoryTrend(agent);
                                if (t.dir === "flat") return "";
                                const arrow = t.dir === "up" ? "▲" : "▼";
                                const color = t.dir === "up" ? "#ef4444" : "#10b981";
                                const sign = t.dir === "up" ? "+" : "";
                                return ` <span class="mem-trend" style="color:${color}" title="30초 전 대비 ${sign}${t.deltaMB}MB" aria-label="메모리 ${t.dir === "up" ? "증가" : "감소"} ${sign}${t.deltaMB}MB">${arrow}</span>`;
                            })()}</span>
                        </div>
                        <div class="agent-signal-line" title="${esc(signal.sourceLabel)}" data-freshness="${
                            signal.age < 60_000 ? "fresh"
                            : signal.age < 5 * 60_000 ? "recent"
                            : signal.age < 30 * 60_000 ? "warm"
                            : "stale"
                        }">
                            <iconify-icon icon="solar:radar-2-linear" aria-hidden="true"></iconify-icon>
                            <span>최근 ${esc(signal.ageLabel)}</span>
                            <em>${esc(signal.sourceLabel)}</em>
                        </div>
                    </div>
                    <button type="button"
                        class="agent-pin-btn${pinned ? " is-pinned" : ""}"
                        data-pin-action="toggle"
                        aria-pressed="${pinned ? "true" : "false"}"
                        aria-label="${esc(`${theme.name} ${pinned ? "고정 해제" : "고정"}`)}"
                        title="${pinned ? "고정 해제" : "고정"}">
                        <iconify-icon icon="${pinned ? "solar:star-bold" : "solar:star-linear"}" aria-hidden="true"></iconify-icon>
                    </button>
                    <span class="next-action-chip" data-tone="${esc(action.tone)}" title="${esc(action.label)}">
                        <iconify-icon icon="${esc(action.icon)}" aria-hidden="true"></iconify-icon>
                        <span>${esc(action.label)}</span>
                    </span>
                    <span class="status-badge badge-${status}">${meta.label}</span>
                </div>
                <div class="text-[12px] text-zinc-500 truncate mb-1" style="word-break:keep-all;" title="${esc(task)}">${esc(task)}</div>
                ${age ? `<div class="text-[10px] text-zinc-400 mb-1">최근 ${age}</div>` : ""}
                ${agent.totalTasks > 0 ? `
                <div class="progress-track">
                    <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="text-[11px] text-zinc-400 mt-1.5 tabular-nums font-medium">${agent.completedTasks}/${agent.totalTasks} 완료</div>
                ${subHtml}` : ""}
            </div>
        `;
        const pinButton = card.querySelector('[data-pin-action="toggle"]');
        if (pinButton) {
            pinButton.addEventListener("click", event => {
                event.stopPropagation();
                toggleAgentPin(agent);
            });
            pinButton.addEventListener("keydown", event => event.stopPropagation());
            pinButton.addEventListener("keyup", event => event.stopPropagation());
        }
        list.appendChild(card);
    });
}

function timeOfDayIcon(hour) {
    if (hour < 5) return "solar:moon-stars-linear";
    if (hour < 7) return "solar:cloudy-sun-linear";
    if (hour < 11) return "solar:sun-2-linear";
    if (hour < 15) return "solar:sun-linear";
    if (hour < 17.5) return "solar:cloudy-sun-linear";
    if (hour < 19.5) return "solar:sunset-linear";
    if (hour < 22) return "solar:moon-linear";
    return "solar:moon-stars-linear";
}

function updateTimeOfDayBand(now) {
    const band = document.getElementById("tod-band");
    const icon = document.getElementById("game-time-icon");
    if (!band) return;
    const sky = getSkyPalette(now);
    band.textContent = timeOfDayLabel(now);
    band.style.color = sky.warmth > 0.4 ? "#d97757"
        : sky.starDensity > 0.4 ? "#7a85b8"
        : "#71717a";
    if (icon) icon.setAttribute("icon", timeOfDayIcon(sky.hour));
}

export function updateStats() {
    if (!S.serverState) return;
    const now = new Date();
    document.getElementById("game-time").textContent =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    updateTimeOfDayBand(now);

    const total = S.liveAgents.reduce((s, a) => s + a.totalTasks, 0);
    const done = S.liveAgents.reduce((s, a) => s + a.completedTasks, 0);
    const ram = S.liveAgents.reduce((s, a) => s + a.memoryMB, 0);

    document.getElementById("stat-tasks").textContent = total;
    document.getElementById("stat-completed").textContent = done;
    document.getElementById("stat-ram").textContent = ram.toLocaleString();
    document.getElementById("stat-agents").textContent = S.liveAgents.filter(a => a.isRunning).length;
    updateLiveHud();
}

// ── Boss Review Queue UI ──
export function updateBossQueueUI() {
    const container = document.getElementById("boss-queue-panel");
    if (!container) return;

    const queue = S.bossQueue.filter(e => e.phase !== "returningToWork");
    if (queue.length === 0) {
        container.classList.add("hidden");
        return;
    }
    container.classList.remove("hidden");

    const items = queue.map(entry => {
        const agent = S.liveAgents.find(a => a.pid === entry.pid);
        const v = S.visualAgents[entry.pid];
        if (!agent || !v) return "";
        const th = v.theme;
        const roleMeta = ROLE_META[agent.role] || ROLE_META.developer;
        const isActive = entry.phase === "activeReview";
        const isWaiting = entry.phase === "waitingAtBossArea" || entry.phase === "queuedForBoss";
        const isWalking = entry.phase === "walkingToBoss";
        const workText = getWorkText(agent) || agent.projectName;

        const phaseLabel = isActive ? "🎯 보고 중"
            : entry.phase === "walkingToBoss" ? "🚶 이동 중"
            : entry.phase === "reviewResolved" ? "✅ 처리됨"
            : "⏳ 대기 중";

        return `<div class="boss-q-item ${isActive ? "boss-q-active" : ""}">
            <div class="flex items-center gap-2 mb-1">
                <div class="w-3 h-3 rounded-full shrink-0" style="background:${th.body}"></div>
                <span class="text-[12px] font-bold" style="color:${th.bodyDark}">${esc(th.name)}</span>
                <span class="text-[9px] px-1 rounded" style="background:${roleMeta.color}20;color:${roleMeta.color}">${roleMeta.badge}</span>
                <span class="text-[10px] text-zinc-400 ml-auto">${phaseLabel}</span>
            </div>
            <div class="text-[11px] text-zinc-500 truncate mb-1.5">${esc(workText)}</div>
            <div class="flex gap-1.5">
                <button onclick="bossReviewAction('${entry.pid}','yes')" class="boss-q-btn boss-q-yes" ${isActive || isWaiting ? "" : "disabled"}>
                    <iconify-icon icon="solar:check-circle-linear" class="text-xs"></iconify-icon> 승인
                </button>
                <button onclick="bossReviewAction('${entry.pid}','no')" class="boss-q-btn boss-q-no" ${isActive || isWaiting ? "" : "disabled"}>
                    <iconify-icon icon="solar:close-circle-linear" class="text-xs"></iconify-icon> 반려
                </button>
            </div>
        </div>`;
    }).join("");

    container.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
            <iconify-icon icon="solar:clipboard-check-linear" class="text-amber-500 text-sm"></iconify-icon>
            <h3 class="text-[12px] font-bold text-zinc-600 tracking-wide uppercase">보고 대기열</h3>
            <span class="text-[10px] text-zinc-400 tabular-nums ml-auto">${queue.length}건</span>
        </div>
        <div class="flex flex-col gap-2">${items}</div>
    `;
}

// ── Agent Detail Panel ──
export function updateDetailPanel() {
    const container = document.getElementById("detail-panel");
    if (!container) return;

    if (!S.detailPid) {
        container.classList.add("hidden");
        return;
    }

    const agent = S.liveAgents.find(a => a.pid === S.detailPid);
    if (!agent) {
        container.classList.add("hidden");
        S.detailPid = null;
        return;
    }

    container.classList.remove("hidden");
    const v = S.visualAgents[agent.pid];
    const theme = v ? v.theme : AGENT_THEMES[0];
    const meta = (STATUS_META[agent.isRunning ? agent.status : "offline"] || STATUS_META.idle);
    const hist = S.memoryHistory[agent.pid] || [];
    const pinned = isAgentPinned(agent);
    const action = getAgentNextAction(agent);

    // Memory graph (mini sparkline)
    let memGraph = "";
    if (hist.length > 1) {
        const maxMB = Math.max(...hist.map(h => h.mb), 100);
        const w = 240, h = 40;
        const points = hist.map((p, i) => {
            const x = (i / (hist.length - 1)) * w;
            const y = h - (p.mb / maxMB) * h;
            return `${x},${y}`;
        }).join(" ");
        memGraph = `
            <svg width="${w}" height="${h}" class="mt-1">
                <polyline points="${points}" fill="none" stroke="${theme.body}" stroke-width="1.5" stroke-linejoin="round"/>
                <text x="${w}" y="10" text-anchor="end" fill="currentColor" font-size="9" class="text-zinc-400">${hist[hist.length-1]?.mb || 0}MB</text>
                <text x="0" y="${h}" fill="currentColor" font-size="8" class="text-zinc-400">${Math.round((Date.now() - (hist[0]?.ts || Date.now())) / 60000)}분 전</text>
            </svg>`;
    }

    // Current work section (from latest prompt)
    let currentWorkHtml = "";
    if (agent.currentWork && agent.currentWork.prompt) {
        const cleaned = agent.currentWork.prompt.replace(/\[Pasted text[^\]]*\]/g, "").trim();
        const firstLine = cleaned.split("\n")[0].trim();
        if (firstLine.length > 3) {
            currentWorkHtml = `
                <div class="detail-work-card">
                    <div class="detail-work-head">
                        <span>현재 작업</span>
                        <button type="button" class="detail-copy-btn" data-copy-kind="work" aria-label="현재 작업 복사">
                            <iconify-icon icon="solar:copy-linear" aria-hidden="true"></iconify-icon><span>복사</span>
                        </button>
                    </div>
                    <div class="detail-work-preview">${esc(firstLine.substring(0, 130))}</div>
                    <details class="detail-work-full">
                        <summary>작업 원문 보기</summary>
                        <pre>${esc(cleaned)}</pre>
                    </details>
                    <div class="detail-work-age">최근 ${workAge(agent) || "업데이트됨"}</div>
                </div>`;
        }
    }

    const signal = agentSignalInfo(agent);
    const signalPills = (signal.sources.length ? signal.sources : [agent.platform || "signal"])
        .slice(0, 5)
        .map(source => `<span>${esc(SIGNAL_LABELS[source] || source)}</span>`)
        .join("");
    const relatedEvents = S.workEvents
        .filter(event => pidKey(event.pid) === pidKey(agent.pid))
        .slice(0, 4);
    const signalEventsHtml = relatedEvents.length
        ? relatedEvents.map(event => {
            const eventStatus = event.status || agent.status;
            const eventMeta = workEventMeta({ ...event, status: eventStatus });
            const selected = S.inspectedEventKey && S.inspectedEventKey === String(event.key || `${event.type}|${event.pid}|${event.text || ""}`);
            return `<button type="button"
                class="detail-event${selected ? " is-selected" : ""}"
                data-pid="${esc(agent.pid)}"
                data-event-key="${esc(event.key || `${event.type}|${event.pid}|${event.text || ""}`)}">
                <iconify-icon icon="${eventMeta.icon}" aria-hidden="true"></iconify-icon>
                <span>${esc(eventMeta.label)}</span>
                <em>${esc(firstLine(event.text || agent.projectName || "상태 갱신", 34))}</em>
                <small>${esc(formatTimeAgo(Math.max(0, Date.now() - (event.ts || Date.now()))))}</small>
            </button>`;
        }).join("")
        : (() => {
            const lge = (window.aiTycoonI18n?.getLang?.() || "ko");
            return `<div class="detail-event-empty">${lge === "en" ? "Collecting recent events" : "최근 이벤트 수집 중"}</div>`;
        })();
    const lgSig = (window.aiTycoonI18n?.getLang?.() || "ko");
    const sigTitle1 = lgSig === "en" ? "Detection basis" : "인식 근거";
    const sigTitle2 = lgSig === "en" ? "Recent signals" : "최근 신호";
    const sigRecent = lgSig === "en" ? "Last" : "최근";
    const signalHtml = `
        <div class="detail-section-title">${esc(sigTitle1)}</div>
        <div class="signal-proof">
            <div class="signal-proof-head">
                <span><iconify-icon icon="solar:radar-2-linear" aria-hidden="true"></iconify-icon> ${esc(sigRecent)} ${esc(signal.ageLabel)}</span>
                <em>${esc(signal.sourceLabel)}</em>
            </div>
            <div class="signal-proof-pills">${signalPills}</div>
        </div>
        <div class="detail-section-title mt-3">${esc(sigTitle2)}</div>
        <div class="detail-event-list">${signalEventsHtml}</div>
    `;

    // Task timeline
    const tasks = agent.tasks || [];
    let taskHtml = "";
    if (tasks.length > 0) {
        taskHtml = tasks.slice(0, 10).map(t => {
            const icon = t.status === "in_progress" ? "⚡" : t.status === "completed" ? "✓" : "◦";
            const color = t.status === "in_progress" ? theme.body : t.status === "completed" ? "#a1a1aa" : "#d4d4d8";
            const opacity = t.status === "completed" ? "opacity-50" : "";
            return `<div class="flex items-start gap-2 ${opacity}">
                <span style="color:${color}" class="shrink-0 text-[11px] mt-0.5">${icon}</span>
                <div class="min-w-0">
                    <div class="text-[11px] font-medium truncate" style="color:${color === "#a1a1aa" ? "" : color}">${esc((t.subject || "Task " + t.id).substring(0, 35))}</div>
                    ${t.activeForm ? `<div class="text-[10px] text-zinc-400 truncate">${esc(t.activeForm)}</div>` : ""}
                </div>
            </div>`;
        }).join("");
        const lgT = (window.aiTycoonI18n?.getLang?.() || "ko");
        const moreLabel = lgT === "en" ? `+${tasks.length - 10} more` : `+${tasks.length - 10}개 더`;
        if (tasks.length > 10) taskHtml += `<div class="text-[10px] text-zinc-400">${moreLabel}</div>`;
    } else {
        const lgE = (window.aiTycoonI18n?.getLang?.() || "ko");
        taskHtml = `<div class="text-[11px] text-zinc-400">${lgE === "en" ? "No tasks registered" : "등록된 태스크 없음"}</div>`;
    }

    const lgM = (window.aiTycoonI18n?.getLang?.() || "ko");
    const labels = lgM === "en"
        ? { session: "Session", cwd: "Path", copySuffix: "copy" }
        : { session: "세션", cwd: "경로", copySuffix: "복사" };
    const metaRows = [
        ["PID", agent.pid, "pid"],
        agent.sessionId ? [labels.session, agent.sessionId, "session"] : null,
        agent.cwd ? [labels.cwd, agent.cwd, "cwd"] : null,
    ].filter(Boolean);
    const detailMetaHtml = metaRows.length
        ? `<div class="detail-meta-grid">
            ${metaRows.map(([label, value, kind]) => `
                <div class="detail-meta-row">
                    <span>${esc(label)}</span>
                    <code>${esc(value)}</code>
                    <button type="button" class="detail-copy-btn icon-only" data-copy-kind="${esc(kind)}" aria-label="${esc(label)} ${esc(labels.copySuffix)}">
                        <iconify-icon icon="solar:copy-linear" aria-hidden="true"></iconify-icon>
                    </button>
                </div>
            `).join("")}
        </div>`
        : "";

    container.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background:${theme.body}"></div>
                <span class="text-[14px] font-bold" style="color:${theme.bodyDark}">${theme.name}</span>
                ${pinned ? `<span class="detail-pin-chip"><iconify-icon icon="solar:star-bold" aria-hidden="true"></iconify-icon>고정</span>` : ""}
                <span class="next-action-chip detail-action-chip" data-tone="${esc(action.tone)}">
                    <iconify-icon icon="${esc(action.icon)}" aria-hidden="true"></iconify-icon>
                    <span>${esc(action.label)}</span>
                </span>
                <span class="status-badge badge-${agent.isRunning ? agent.status : 'offline'} text-[10px]">${meta.label}</span>
            </div>
            <div class="detail-head-actions">
                <button type="button"
                    class="detail-pin-btn${pinned ? " is-pinned" : ""}"
                    data-detail-pin
                    aria-pressed="${pinned ? "true" : "false"}"
                    aria-label="${esc(`${theme.name} ${pinned ? "고정 해제" : "고정"}`)}">
                    <iconify-icon icon="${pinned ? "solar:star-bold" : "solar:star-linear"}" aria-hidden="true"></iconify-icon>
                </button>
                <button onclick="closeDetail()" class="detail-close-btn" aria-label="상세 패널 닫기">
                    <iconify-icon icon="solar:close-circle-linear" aria-hidden="true"></iconify-icon>
                </button>
            </div>
        </div>
        <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold" style="background:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badgeBg};color:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).color}">${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).label}</span>
            <button type="button"
                class="detail-project-chip"
                data-detail-project
                title="이 프로젝트만 보기"
                aria-label="이 프로젝트만 필터링">
                <span class="agent-project-dot" style="background:${projectColor(agent.projectName)}" aria-hidden="true"></span>
                <span>${esc(agent.projectName)}</span>
                <iconify-icon icon="solar:filter-linear" aria-hidden="true"></iconify-icon>
            </button>
        </div>
        <div class="text-[10px] text-zinc-400 truncate mb-3">${esc(agent.cwd || agent.platformName || "")}</div>
        ${detailMetaHtml}

        ${(() => {
            const lg = (window.aiTycoonI18n?.getLang?.() || "ko");
            const memTitle  = lg === "en" ? "Memory usage" : "메모리 사용량";
            const collecting = lg === "en" ? "Collecting data…" : "데이터 수집 중…";
            const tasksTitle = lg === "en" ? "Tasks" : "태스크";
            return `
        <div class="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">${esc(memTitle)}</div>
        <div class="text-[10px] text-zinc-400 mb-1">PID ${esc(String(agent.pid))} · ${agent.memoryMB}MB</div>
        ${memGraph || `<div class="text-[10px] text-zinc-400">${esc(collecting)}</div>`}

        ${currentWorkHtml}

        ${signalHtml}

        ${tasks.length > 0 ? `<div class="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mt-3 mb-2">${esc(tasksTitle)} (${agent.completedTasks}/${agent.totalTasks})</div>
        <div class="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">${taskHtml}</div>` : ""}`;
        })()}

        ${(() => {
            const langN = (window.aiTycoonI18n?.getLang?.() || "ko");
            const noteTitle = langN === "en" ? "Personal note" : "개인 메모";
            const placeholder = langN === "en"
                ? "Anything to remember about this agent… (e.g. auth refactor in progress)"
                : "이 에이전트에 대한 메모… (예: 인증 리팩터링 중)";
            const ariaLabel = langN === "en" ? "Agent personal note" : "에이전트 개인 메모";
            const noteVal = getAgentNote(agent) || "";
            const hintPrefix = langN === "en" ? "Local only" : "로컬에만 저장";
            const clearLabel = langN === "en" ? "Clear" : "지우기";
            return `
        <div class="detail-section-title mt-3">${esc(noteTitle)}</div>
        <div class="detail-note-card">
            <textarea
                id="detail-note-input"
                class="detail-note-input"
                rows="2"
                placeholder="${esc(placeholder)}"
                aria-label="${esc(ariaLabel)}"
                maxlength="500"
                data-privacy>${esc(noteVal)}</textarea>
            <div class="detail-note-foot">
                <span class="detail-note-hint">${esc(hintPrefix)} · ${esc(String(noteVal.length))}/500</span>
                <button type="button" class="detail-note-clear" data-detail-note-clear ${!noteVal ? "hidden" : ""}>${esc(clearLabel)}</button>
            </div>
        </div>`;
        })()}
    `;

    container.querySelectorAll(".detail-event[data-pid]").forEach(item => {
        item.addEventListener("click", () => inspectWorkEvent(item.dataset.pid, item.dataset.eventKey));
    });
    container.querySelectorAll(".detail-copy-btn[data-copy-kind]").forEach(button => {
        button.addEventListener("click", () => {
            copyTextToClipboard(copyAgentValue(agent, button.dataset.copyKind), button);
        });
    });
    container.querySelector("[data-detail-pin]")?.addEventListener("click", () => toggleAgentPin(agent));

    // 프로젝트 칩 클릭 → 검색창에 프로젝트명 박아 넣어서 동일 프로젝트만 보이게
    // (이미 동일 검색어면 토글로 해제)
    container.querySelector("[data-detail-project]")?.addEventListener("click", () => {
        const name = agent.projectName || "";
        if (!name) return;
        const cur = (S.agentSearchQuery || "").trim();
        if (cur === name) {
            window.clearAgentSearch?.();
        } else if (typeof window.setAgentSearch === "function") {
            window.setAgentSearch(name);
            const input = document.getElementById("agent-search");
            if (input) input.value = name;
        }
    });

    // Notes wiring (debounced save)
    const noteInput = container.querySelector("#detail-note-input");
    const noteClear = container.querySelector("[data-detail-note-clear]");
    const noteHint  = container.querySelector(".detail-note-hint");
    // 저장 직후 1.2초간 'saved' 상태 표시 — 디바운스 때문에 사라진 글자가 어디로 갔나 헷갈리지 않게.
    const flashSaved = () => {
        if (!noteHint) return;
        const langN = (window.aiTycoonI18n?.getLang?.() || "ko");
        const savedTxt = langN === "en" ? "Saved" : "저장됨";
        const hintTxt = langN === "en" ? "Local only" : "로컬에만 저장";
        noteHint.classList.add("is-saved");
        noteHint.textContent = `${savedTxt} · ${(noteInput?.value.length || 0)}/500`;
        clearTimeout(noteHint._flashTimer);
        noteHint._flashTimer = setTimeout(() => {
            noteHint.classList.remove("is-saved");
            noteHint.textContent = `${hintTxt} · ${(noteInput?.value.length || 0)}/500`;
        }, 1200);
    };
    if (noteInput) {
        let saveTimer = null;
        // 한글 IME 조합 중에는 저장 보류 — 자모 단위로 저장되면 의미 없는 텍스트만 박힘
        noteInput.addEventListener("compositionstart", () => { noteInput._imeComposing = true; });
        noteInput.addEventListener("compositionend", () => {
            noteInput._imeComposing = false;
            // 조합 끝나면 즉시 한 번 저장 (디바운스 무시)
            setAgentNote(agent, noteInput.value);
            if (noteClear) noteClear.toggleAttribute("hidden", !noteInput.value);
            flashSaved();
        });
        noteInput.addEventListener("input", () => {
            if (noteInput._imeComposing) return;
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                setAgentNote(agent, noteInput.value);
                if (noteClear) noteClear.toggleAttribute("hidden", !noteInput.value);
                flashSaved();
            }, 220);
        });
        // Cmd/Ctrl+S 로 즉시 저장 — 디바운스 220ms 기다리기 답답할 때 명시적 저장.
        // 브라우저 기본 '페이지 저장' 동작은 textarea 안에서만 막음.
        noteInput.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
                e.preventDefault();
                if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
                setAgentNote(agent, noteInput.value);
                if (noteClear) noteClear.toggleAttribute("hidden", !noteInput.value);
                flashSaved();
            }
        });
    }
    if (noteClear) {
        noteClear.addEventListener("click", () => {
            setAgentNote(agent, "");
            if (noteInput) noteInput.value = "";
            noteClear.setAttribute("hidden", "");
            flashSaved();
        });
    }
}

// ── Tooltip (mouse hover on canvas) ──
export function onMouseMove(e) {
    const rect = S.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - S.offsetX) / S.scale;
    const my = (e.clientY - rect.top - S.offsetY) / S.scale;

    let hov = null;
    S.liveAgents.forEach(a => {
        const v = S.visualAgents[a.pid];
        if (!v) return;
        if (Math.abs(mx - v.x) < 10 && Math.abs(my - v.y) < 14) hov = a;
    });

    // Check sub-agent hover (new grid layout)
    let hovSub = null;
    Object.values(S.visualSubAgents).forEach(sub => {
        const parent = S.visualAgents[sub.parentPid];
        if (!parent) return;
        const maxPerRow = 5;
        const row = Math.floor(sub.slotIndex / maxPerRow);
        const col = sub.slotIndex % maxPerRow;
        const sx = parent.x + 14 + col * 9;
        const sy = parent.y + 2 + row * 12;
        if (Math.abs(mx - sx) < 5 && Math.abs(my - sy) < 5) {
            hovSub = sub;
        }
    });

    const tt = document.getElementById("tooltip");
    if (hovSub) {
        S.canvas.style.cursor = "pointer";
        const agent = S.liveAgents.find(a => a.pid === hovSub.parentPid);
        const task = agent?.tasks?.find(t => t.id === hovSub.taskId);
        const parentTheme = S.visualAgents[hovSub.parentPid]?.theme;
        if (task && parentTheme) {
            const lgS = (window.aiTycoonI18n?.getLang?.() || "ko");
            const labels = lgS === "en"
                ? { head: "Sub agent", inProgress: "Working", done: "Done", pending: "Pending", parent: "Parent", status: "Status", activity: "Activity", desc: "Desc", waiting: "Wait", needs: "needs to complete" }
                : { head: "서브 에이전트", inProgress: "작업 중", done: "완료", pending: "대기", parent: "부모", status: "상태", activity: "활동", desc: "설명", waiting: "대기", needs: "완료 필요" };
            const statusLabel = task.status === "in_progress" ? labels.inProgress : task.status === "completed" ? labels.done : labels.pending;
            const statusColor = task.status === "in_progress" ? "#059669" : task.status === "completed" ? "#a1a1aa" : "#d97706";
            tt.innerHTML = `
                <b style="color:${hovSub.color}">${esc(labels.head)} · ${esc((task.subject || "").substring(0, 25))}</b>
                <div class="tt-row"><span class="tt-label">${esc(labels.parent)}</span><span class="tt-value">${esc(parentTheme.name)} · ${esc(agent.projectName)}</span></div>
                <div class="tt-row"><span class="tt-label">${esc(labels.status)}</span><span class="tt-value" style="color:${statusColor}">${statusLabel}</span></div>
                ${task.activeForm ? `<div class="tt-row"><span class="tt-label">${esc(labels.activity)}</span><span class="tt-value">${esc(task.activeForm.substring(0, 25))}</span></div>` : ""}
                ${task.description ? `<div class="tt-row"><span class="tt-label">${esc(labels.desc)}</span><span class="tt-value" style="max-width:160px;white-space:normal;font-size:11px;">${esc(task.description.substring(0, 60))}</span></div>` : ""}
                ${task.blockedBy?.length ? `<div class="tt-row"><span class="tt-label">${esc(labels.waiting)}</span><span class="tt-value">Task ${task.blockedBy.join(", ")} ${esc(labels.needs)}</span></div>` : ""}
            `;
            tt.className = "";
            positionTooltip(tt, e.clientX, e.clientY);
        }
    } else if (hov) {
        S.canvas.style.cursor = "pointer";
        const meta = (STATUS_META[hov.isRunning ? hov.status : "offline"] || STATUS_META.idle);
        const theme = AGENT_THEMES[S.liveAgents.indexOf(hov) % AGENT_THEMES.length];
        const lgT = (window.aiTycoonI18n?.getLang?.() || "ko");
        const labels = lgT === "en"
            ? { idle: "Idle", status: "Status", mem: "Memory", task: "Task", sub: "Sub", cwd: "Path", done: "Done", active: "active" }
            : { idle: "대기 중", status: "상태", mem: "메모리", task: "태스크", sub: "서브", cwd: "경로", done: "완료", active: "개 활성" };
        const taskText = getWorkText(hov) || (hov.currentTask ? hov.currentTask.subject : labels.idle);
        const memClass = hov.memoryMB > 1000 ? "mem-high" : hov.memoryMB > 500 ? "mem-mid" : "mem-low";
        const subCount = (hov.tasks || []).filter(t => t.status !== "completed").length;
        const subValue = lgT === "en" ? `${subCount} ${labels.active}` : `${subCount}${labels.active}`;
        tt.innerHTML = `
            <b style="color:${theme.bodyDark}">${esc(theme.name)} · ${esc(hov.projectName)}</b>
            <div class="tt-row"><span class="tt-label">PID</span><span class="tt-value">${hov.pid}</span></div>
            <div class="tt-row"><span class="tt-label">${esc(labels.status)}</span><span class="tt-value" style="color:${meta.color}">${meta.label}</span></div>
            <div class="tt-row"><span class="tt-label">${esc(labels.mem)}</span><span class="tt-value ${memClass}">${hov.memoryMB}MB</span></div>
            <div class="tt-row"><span class="tt-label">${esc(labels.task)}</span><span class="tt-value">${esc(taskText)}</span></div>
            ${subCount > 0 ? `<div class="tt-row"><span class="tt-label">${esc(labels.sub)}</span><span class="tt-value" style="color:#059669">${esc(subValue)}</span></div>` : ""}
            <div class="tt-row"><span class="tt-label">${esc(labels.cwd)}</span><span class="tt-value" style="font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hov.cwd || "")}</span></div>
            <div class="tt-row"><span class="tt-label">${esc(labels.done)}</span><span class="tt-value">${hov.completedTasks}/${hov.totalTasks}</span></div>
        `;
        tt.className = "";
        tt.style.left = (e.clientX + 14) + "px";
        tt.style.top = (e.clientY + 14) + "px";
    } else {
        S.canvas.style.cursor = "default";
        tt.className = "hidden";
    }
}

export function positionTooltip(tt, ex, ey) {
    const tw = 280, th = 200; // estimated max tooltip size
    let lx = ex + 14, ly = ey + 14;
    if (lx + tw > window.innerWidth) lx = ex - tw - 10;
    if (ly + th > window.innerHeight) ly = ey - th - 10;
    if (lx < 0) lx = 4;
    if (ly < 0) ly = 4;
    tt.style.left = lx + "px";
    tt.style.top = ly + "px";
}

// ============================================================
//  Insights modal — aggregate snapshot from current state
// ============================================================
function platformColor(platform) {
    return PLATFORM_META[platform]?.color || "#94a3b8";
}
function platformLabel(platform) {
    return PLATFORM_META[platform]?.label || platform || "Unknown";
}

// ── Per-agent personal notes (localStorage, keyed by sessionId or pid) ──
// Keyed by sessionId when available (stable across restarts) else PID.
const NOTE_KEY = "ai-tycoon-agent-notes";
function noteKeyFor(agent) {
    return String(agent?.sessionId || agent?.pid || "");
}
function loadAllNotes() {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY) || "{}") || {}; }
    catch { return {}; }
}
function getAgentNote(agent) {
    const key = noteKeyFor(agent);
    if (!key) return "";
    return loadAllNotes()[key] || "";
}
function setAgentNote(agent, value) {
    const key = noteKeyFor(agent);
    if (!key) return;
    const all = loadAllNotes();
    const trimmed = String(value || "").slice(0, 500);
    if (trimmed) all[key] = trimmed;
    else delete all[key];
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(all)); } catch { /* quota */ }
}

/** Compare current memoryMB against ~30 s ago to spot trends.
 *  Returns { dir: "up"|"down"|"flat", deltaMB: number }. */
function memoryTrend(agent) {
    const hist = S.memoryHistory?.[agent.pid] || [];
    if (hist.length < 4) return { dir: "flat", deltaMB: 0 };
    const cur = hist[hist.length - 1]?.mb ?? agent.memoryMB ?? 0;
    // Walk back ~30 seconds. Polls run every 2 s → roughly 15 samples back.
    const targetTs = Date.now() - 30000;
    let past = hist[0];
    for (let i = hist.length - 1; i >= 0; i--) {
        if ((hist[i].ts || 0) <= targetTs) { past = hist[i]; break; }
    }
    const delta = cur - (past?.mb || cur);
    // Threshold: 30 MB is the noise floor below which we call it "flat"
    if (Math.abs(delta) < 30) return { dir: "flat", deltaMB: delta };
    return { dir: delta > 0 ? "up" : "down", deltaMB: delta };
}

/** Stable HSL color for a project name — same name always → same dot. */
function projectColor(name) {
    if (!name) return "#94a3b8";
    let hash = 0;
    const s = String(name);
    for (let i = 0; i < s.length; i++) {
        hash = (hash * 31 + s.charCodeAt(i)) | 0;
    }
    // Avoid muddy/blueish tones near the agent theme accents; bias to warm + cool spread
    const hue = Math.abs(hash) % 360;
    // Mid-saturation, slightly desaturated lightness keeps the dot readable on both themes
    return `hsl(${hue}, 62%, 56%)`;
}
function statusLabelI18n(statusKey) {
    const key = `status.${statusKey}`;
    const localized = i18n(key);
    if (localized && localized !== key) return localized;
    return STATUS_META[statusKey]?.label || statusKey;
}

export function refreshInsights() {
    const agents = S.liveAgents || [];
    const activeCount = agents.filter(a => a.isRunning).length;
    const totalCompleted = agents.reduce((s, a) => s + (a.completedTasks || 0), 0);
    const totalOngoing = agents.reduce((s, a) =>
        s + ((a.tasks || []).filter(t => t.status === "in_progress").length), 0);
    const totalRam = agents.reduce((s, a) => s + (a.memoryMB || 0), 0);

    const el = (id) => document.getElementById(id);
    // Friendly mood line — categorises today's pace based on completed tasks
    const moodEl = el("insights-mood");
    if (moodEl) {
        const today = todayStats();
        const tc = today?.completedMax || 0;
        const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
        let label, emoji, tone;
        if (tc === 0 && activeCount === 0) {
            label = lang === "en" ? "Office is quiet — no one's here yet" : "조용한 오피스 · 아직 출근 전이에요";
            emoji = "🌿";
            tone = "calm";
        } else if (tc < 6 && activeCount > 0) {
            label = lang === "en" ? "Easy pace today" : "여유로운 하루";
            emoji = "☕";
            tone = "calm";
        } else if (tc < 20) {
            label = lang === "en" ? "Steady rhythm" : "꾸준한 흐름";
            emoji = "✍️";
            tone = "steady";
        } else if (tc < 50) {
            label = lang === "en" ? "Busy day" : "활발한 하루";
            emoji = "⚡";
            tone = "busy";
        } else if (tc < 100) {
            label = lang === "en" ? "Marathon mode" : "마라톤 모드";
            emoji = "🏃";
            tone = "intense";
        } else {
            label = lang === "en" ? "On fire" : "불타는 하루";
            emoji = "🔥";
            tone = "intense";
        }
        moodEl.dataset.tone = tone;
        moodEl.innerHTML = `<span class="insights-mood-emoji">${emoji}</span><span>${esc(label)}</span><span class="insights-mood-num tabular-nums">${tc} ${lang === "en" ? "tasks" : "태스크"}</span>`;
    }

    if (el("insights-agents")) el("insights-agents").textContent = activeCount;
    if (el("insights-completed")) {
        // 완료 태스크 옆에 어제와 비교한 ±N 칩. 처음 사용 등으로 어제 데이터 없으면 숨김.
        const completedEl = el("insights-completed");
        const yest = yesterdayStats();
        const yc = yest?.completedMax || 0;
        const todayC = todayStats()?.completedMax || 0;
        const delta = todayC - yc;
        const langNow = (window.aiTycoonI18n?.getLang?.() || "ko");
        const yLabel = langNow === "en" ? "vs yesterday" : "어제 대비";
        // 어제 데이터 자체가 없으면 칩 숨김
        if (!yest) {
            completedEl.textContent = String(totalCompleted);
        } else {
            const sign = delta > 0 ? "+" : (delta < 0 ? "" : "±");
            const tone = delta > 0 ? "up" : (delta < 0 ? "down" : "flat");
            completedEl.innerHTML = `${totalCompleted}<span id="insights-completed-delta" class="insights-delta" data-tone="${tone}" title="${esc(yLabel)}: ${sign}${delta}">${sign}${delta}</span>`;
        }
    }
    if (el("insights-ongoing")) el("insights-ongoing").textContent = totalOngoing;
    if (el("insights-ram")) {
        el("insights-ram").innerHTML = totalRam.toLocaleString() + '<span class="insights-unit">MB</span>';
    }

    // Platform breakdown
    const platformBuckets = new Map();
    agents.forEach(a => {
        const key = a.platform || "unknown";
        if (!platformBuckets.has(key)) {
            platformBuckets.set(key, { count: 0, ram: 0, running: 0 });
        }
        const b = platformBuckets.get(key);
        b.count++;
        b.ram += a.memoryMB || 0;
        if (a.isRunning) b.running++;
    });
    const platformList = [...platformBuckets.entries()]
        .sort((a, b) => b[1].count - a[1].count);
    const maxPlatformCount = platformList[0]?.[1]?.count || 1;
    const platformEl = el("insights-platforms");
    if (platformEl) {
        if (platformList.length === 0) {
            platformEl.innerHTML = `<div class="insights-empty">${esc(i18n("insights.emptyPlatforms"))}</div>`;
        } else {
            platformEl.innerHTML = platformList.map(([key, b]) => {
                const pct = Math.max(8, Math.round((b.count / maxPlatformCount) * 100));
                const color = platformColor(key);
                return `
                    <div class="insights-platform-row">
                        <div class="insights-platform-name">
                            <span class="insights-platform-dot" style="background:${color}"></span>
                            <span>${esc(platformLabel(key))}</span>
                        </div>
                        <div class="insights-platform-bar">
                            <div class="insights-platform-fill" style="width:${pct}%;background:${color}"></div>
                        </div>
                        <div class="insights-platform-meta">
                            <span class="insights-platform-count">${b.running}/${b.count}</span>
                            <span class="insights-platform-ram">${b.ram.toLocaleString()}MB</span>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    // Today's MVP — agent with the highest combined score:
    //   score = completedTasks*3 + recent work-event count + (running ? 1 : 0)
    // Only shown when there's at least one agent that actually scored something
    const mvpSection = el("insights-mvp-section");
    const mvpEl = el("insights-mvp");
    if (mvpSection && mvpEl) {
        const eventCounts = new Map();
        (S.workEvents || []).forEach(ev => {
            const pid = String(ev?.pid || "");
            if (!pid) return;
            eventCounts.set(pid, (eventCounts.get(pid) || 0) + 1);
        });
        const scored = agents.map(a => {
            const ev = eventCounts.get(String(a.pid)) || 0;
            const score = (a.completedTasks || 0) * 3 + ev + (a.isRunning ? 1 : 0);
            return { a, ev, score };
        }).filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
            mvpSection.hidden = true;
            mvpEl.innerHTML = "";
        } else {
            mvpSection.hidden = false;
            const winner = scored[0];
            const a = winner.a;
            const theme = getAgentTheme(a);
            const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
            const project = a.projectName || a.platformName || "—";
            const initial = (theme.name || "?").charAt(0);
            const completedLabel = lang === "en" ? "completed" : "완료";
            const eventsLabel = lang === "en" ? "events" : "이벤트";
            const reasonText = lang === "en"
                ? "Most active today"
                : "오늘 가장 바쁘게 일했어요";
            mvpEl.innerHTML = `
                <span class="insights-mvp-crown" aria-hidden="true">
                    <iconify-icon icon="solar:cup-star-bold"></iconify-icon>
                </span>
                <span class="insights-mvp-avatar" style="background:${theme.body};color:#fff">${esc(initial)}</span>
                <div class="insights-mvp-info">
                    <div class="insights-mvp-name">${esc(theme.name)}</div>
                    <div class="insights-mvp-project">${esc(project)}</div>
                    <div class="insights-mvp-reason">${esc(reasonText)}</div>
                </div>
                <div class="insights-mvp-stats">
                    <span><strong>${a.completedTasks || 0}</strong> ${esc(completedLabel)}</span>
                    <span><strong>${winner.ev}</strong> ${esc(eventsLabel)}</span>
                </div>
            `;
            mvpEl.onclick = () => {
                S.selectedPid = a.pid;
                S.detailPid = a.pid;
                S.directorFocusPid = a.pid;
                S.directorMode = true;
                document.getElementById("insights-overlay")?.classList?.remove("is-visible");
                setTimeout(() => {
                    const overlay = document.getElementById("insights-overlay");
                    if (overlay) overlay.hidden = true;
                }, 280);
            };
        }
    }

    // Top projects (by total tasks)
    const projectBuckets = new Map();
    agents.forEach(a => {
        const name = a.projectName || "(no project)";
        if (!projectBuckets.has(name)) {
            projectBuckets.set(name, { tasks: 0, completed: 0, agents: 0, platforms: new Set() });
        }
        const b = projectBuckets.get(name);
        b.tasks += a.totalTasks || 0;
        b.completed += a.completedTasks || 0;
        b.agents++;
        if (a.platform) b.platforms.add(a.platform);
    });
    const topProjects = [...projectBuckets.entries()]
        .sort((a, b) => (b[1].tasks - a[1].tasks) || (b[1].agents - a[1].agents))
        .slice(0, 5);
    const projectEl = el("insights-projects");
    if (projectEl) {
        if (topProjects.length === 0) {
            projectEl.innerHTML = `<div class="insights-empty">${esc(i18n("insights.emptyProjects"))}</div>`;
        } else {
            projectEl.innerHTML = topProjects.map(([name, b], idx) => {
                const pct = b.tasks > 0 ? Math.round((b.completed / b.tasks) * 100) : 0;
                const platforms = [...b.platforms].map(p =>
                    `<span class="insights-mini-chip" style="background:${platformColor(p)}33;color:${platformColor(p)}">${esc(PLATFORM_META[p]?.badge || p.slice(0,2).toUpperCase())}</span>`
                ).join("");
                const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
                const peopleSuffix = lang === "en" ? (b.agents === 1 ? "agent" : "agents") : "명";
                const doneLabel = lang === "en" ? "done" : "완료";
                return `
                    <button type="button" class="insights-project-row" data-project="${esc(name)}">
                        <div class="insights-project-rank">#${idx + 1}</div>
                        <div class="insights-project-info">
                            <div class="insights-project-name">${esc(name)}</div>
                            <div class="insights-project-meta">
                                <span>${b.agents}${lang === "en" ? " " : ""}${peopleSuffix}</span>
                                <span>·</span>
                                <span>${b.completed}/${b.tasks} ${doneLabel} (${pct}%)</span>
                                <span class="insights-project-platforms">${platforms}</span>
                            </div>
                        </div>
                        <div class="insights-project-bar">
                            <div class="insights-project-fill" style="width:${pct}%"></div>
                        </div>
                    </button>
                `;
            }).join("");
            projectEl.querySelectorAll(".insights-project-row[data-project]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const name = btn.getAttribute("data-project");
                    if (typeof window.openProject === "function") window.openProject(name);
                });
            });
        }
    }

    // Status distribution
    const statusBuckets = new Map();
    agents.forEach(a => {
        const s = a.isRunning ? a.status : "offline";
        statusBuckets.set(s, (statusBuckets.get(s) || 0) + 1);
    });
    const total = agents.length || 1;
    const statusOrder = ["coding", "thinking", "searching", "reviewing", "meeting", "coffee", "idle", "offline"];
    const statusEl = el("insights-status");
    if (statusEl) {
        const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
        const peopleWord = lang === "en" ? "" : "명";
        const segments = statusOrder
            .filter(s => statusBuckets.get(s))
            .map(s => {
                const count = statusBuckets.get(s);
                const pct = (count / total) * 100;
                const meta = STATUS_META[s] || STATUS_META.idle;
                const label = statusLabelI18n(s);
                return `<div class="insights-status-seg" style="width:${pct}%;background:${meta.color}" title="${esc(label)}: ${count}${lang === "en" ? "" : peopleWord}">
                    <span>${pct > 8 ? esc(label) : ""}</span>
                </div>`;
            }).join("");
        const legend = statusOrder
            .filter(s => statusBuckets.get(s))
            .map(s => {
                const meta = STATUS_META[s] || STATUS_META.idle;
                const label = statusLabelI18n(s);
                return `<span class="insights-status-legend-item">
                    <span class="insights-status-legend-dot" style="background:${meta.color}"></span>
                    <span>${esc(label)} ${statusBuckets.get(s)}${peopleWord}</span>
                </span>`;
            }).join("");
        statusEl.innerHTML = `
            <div class="insights-status-bar-track">${segments || `<div class="insights-empty insights-empty-bar">${esc(i18n("insights.emptyStatus"))}</div>`}</div>
            <div class="insights-status-legend">${legend}</div>
        `;
    }

    // 7-day history chart
    const historyEl = el("insights-history");
    if (historyEl) {
        const days = recentDays(7);
        const today = todayStats();
        const yesterday = yesterdayStats();
        const deltaCard = (() => {
            if (!today) return "";
            const yc = yesterday?.completedMax || 0;
            const tc = today.completedMax || 0;
            const diff = tc - yc;
            const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
            const color = diff > 0 ? "#10b981" : diff < 0 ? "#ef4444" : "#94a3b8";
            return `
                <div class="insights-history-summary">
                    <span class="insights-history-summary-num">${tc}</span>
                    <span class="insights-history-summary-label">${esc(i18n("insights.completedLabel"))}</span>
                    <span class="insights-history-summary-delta" style="color:${color}">${arrow} ${Math.abs(diff)} ${esc(i18n("insights.deltaSuffix"))}</span>
                </div>
            `;
        })();
        if (days.length === 0) {
            historyEl.innerHTML = `<div class="insights-empty">${esc(i18n("insights.emptyHistory"))}</div>`;
        } else {
            const maxCompleted = Math.max(1, ...days.map(d => d.completedMax || 0));
            const maxAgents = Math.max(1, ...days.map(d => d.agentsMax || 0));
            const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
            const taskWord = lang === "en" ? "tasks" : "태스크";
            const peopleWord = lang === "en" ? "peak" : "명";
            const bars = days.map(d => {
                const c = d.completedMax || 0;
                const a = d.agentsMax || 0;
                const cPct = Math.max(2, (c / maxCompleted) * 100);
                const aPct = Math.max(2, (a / maxAgents) * 100);
                const label = d.date.slice(5).replace("-", "/");
                const isToday = d.date === days[days.length - 1].date;
                const joinLabel = lang === "en" ? "joined" : "출근";
                const eventsLabel = lang === "en" ? "events" : "이벤트";
                const tooltip = `
                    <div class="chart-tooltip-title">${esc(d.date)}${isToday ? ` · ${lang === "en" ? "Today" : "오늘"}` : ""}</div>
                    <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#10b981"></span>${esc(taskWord)} <strong>${c}</strong></div>
                    <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#3b82f6"></span>${lang === "en" ? "Peak agents" : "최대 동시"} <strong>${a}</strong></div>
                    <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#facc15"></span>${esc(joinLabel)} <strong>${d.joinedCount || 0}</strong></div>
                    <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#a78bfa"></span>${esc(eventsLabel)} <strong>${d.events || 0}</strong></div>
                `;
                return `
                    <div class="insights-history-col${isToday ? " is-today" : ""}" data-tooltip="${esc(tooltip)}">
                        <div class="insights-history-bars">
                            <div class="insights-history-bar insights-history-bar-task" style="height:${cPct}%"></div>
                            <div class="insights-history-bar insights-history-bar-agent" style="height:${aPct}%"></div>
                        </div>
                        <div class="insights-history-label">${esc(label)}</div>
                    </div>
                `;
            }).join("");
            historyEl.innerHTML = `
                ${deltaCard}
                <div class="insights-history-chart">${bars}</div>
                <div class="insights-history-legend">
                    <span><span class="insights-history-legend-dot" style="background:#10b981"></span>${esc(i18n("insights.legendTasks"))}</span>
                    <span><span class="insights-history-legend-dot" style="background:#3b82f6"></span>${esc(i18n("insights.legendAgents"))}</span>
                </div>
            `;
        }
    }

    // Hourly heatmap (24 hour cells)
    const hourlyEl = el("insights-hourly");
    if (hourlyEl) {
        const today = hourActivityToday();
        const window7 = hourActivityWindow(7);
        const maxV = Math.max(1, ...window7);
        const nowHour = new Date().getHours();
        const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
        const peakHour = window7.indexOf(Math.max(...window7));
        const peakLabel = lang === "en"
            ? `Peak: ${String(peakHour).padStart(2, "0")}:00`
            : `피크 시간 ${String(peakHour).padStart(2, "0")}시`;
        const todayLabel = lang === "en" ? "Today" : "오늘";
        const weekLabel = lang === "en" ? "7-day" : "최근 7일";
        const cells = window7.map((v, h) => {
            const intensity = Math.max(0, Math.min(1, v / maxV));
            const todayV = today[h] || 0;
            const dotSize = Math.max(0, Math.min(1, todayV / Math.max(1, today[nowHour] || maxV)));
            const isNow = h === nowHour;
            const hourLabel = `${String(h).padStart(2, "0")}:00`;
            const tooltip = `
                <div class="chart-tooltip-title">${hourLabel}${isNow ? ` · ${lang === "en" ? "Now" : "지금"}` : ""}</div>
                <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#10b981"></span>${esc(weekLabel)} <strong>${v}</strong></div>
                <div class="chart-tooltip-row"><span class="chart-tooltip-dot" style="background:#ff8a4c"></span>${esc(todayLabel)} <strong>${todayV}</strong></div>
            `;
            return `
                <div class="insights-hour-cell${isNow ? " is-now" : ""}" data-tooltip="${esc(tooltip)}">
                    <div class="insights-hour-bar" style="--intensity:${intensity.toFixed(2)}"></div>
                    <div class="insights-hour-dot" style="opacity:${dotSize.toFixed(2)}"></div>
                    <div class="insights-hour-label">${h % 3 === 0 ? String(h).padStart(2, "0") : "·"}</div>
                </div>
            `;
        }).join("");
        hourlyEl.innerHTML = `
            <div class="insights-hourly-row">${cells}</div>
            <div class="insights-hourly-legend">
                <span><span class="insights-hour-key bar"></span>${esc(weekLabel)}</span>
                <span><span class="insights-hour-key dot"></span>${esc(todayLabel)}</span>
                <span class="insights-hourly-peak">${esc(peakLabel)}</span>
            </div>
        `;
    }

    // Achievements grid
    const achEl = el("insights-achievements");
    const achProgress = el("insights-ach-progress");
    if (achEl) {
        const items = listAchievements();
        const prog = progressCount();
        if (achProgress) achProgress.textContent = `${prog.unlocked}/${prog.total}`;
        achEl.innerHTML = items.map(a => `
            <div class="ach-tile${a.unlocked ? " is-unlocked" : ""}" title="${esc(a.desc)}">
                <iconify-icon icon="${a.icon}" class="ach-tile-icon" aria-hidden="true"></iconify-icon>
                <div class="ach-tile-body">
                    <div class="ach-tile-title">${esc(a.title)}</div>
                    <div class="ach-tile-desc">${esc(a.desc)}</div>
                </div>
                ${a.unlocked ? '<iconify-icon icon="solar:check-circle-bold" class="ach-tile-check" aria-hidden="true"></iconify-icon>' : ""}
            </div>
        `).join("");
    }

    // Recent feed — clickable rows that focus the agent
    const feedEl = el("insights-feed");
    if (feedEl) {
        const events = (S.workEvents || []).slice(0, 12);
        if (events.length === 0) {
            feedEl.innerHTML = `<div class="insights-empty">${esc(i18n("insights.emptyFeed"))}</div>`;
        } else {
            feedEl.innerHTML = events.map(ev => {
                const meta = STATUS_META[ev.status] || STATUS_META.idle;
                const ts = ev.ts ? new Date(ev.ts) : new Date();
                const time = `${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`;
                const labelText = ev.label || statusLabelI18n(ev.status) || meta.label;
                const color = ev.statusColor || ev.color || meta.color;
                const pid = ev.pid ? String(ev.pid) : "";
                return `
                    <button type="button" class="insights-feed-row" ${pid ? `data-pid="${esc(pid)}"` : ""} ${pid ? "" : "disabled"}>
                        <span class="insights-feed-time">${esc(time)}</span>
                        <span class="insights-feed-tag" style="background:${color}22;color:${color}">${esc(labelText)}</span>
                        <span class="insights-feed-name">${esc(ev.agentName || "")}</span>
                        <span class="insights-feed-text">${esc(ev.text || "")}</span>
                    </button>
                `;
            }).join("");
            feedEl.querySelectorAll(".insights-feed-row[data-pid]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const pid = btn.getAttribute("data-pid");
                    if (!pid) return;
                    // Find agent, focus camera, close modal
                    const ag = S.liveAgents.find(a => String(a.pid) === pid);
                    if (!ag) return;
                    S.selectedPid = pid;
                    S.detailPid = pid;
                    if (typeof window.focusActiveAgent === "function" && typeof S.directorMode !== "undefined") {
                        // Use existing focus helper — switch to director mode targeting this pid
                        S.directorFocusPid = pid;
                        S.directorMode = true;
                    }
                    document.getElementById("insights-overlay")?.classList?.remove("is-visible");
                    setTimeout(() => {
                        const overlay = document.getElementById("insights-overlay");
                        if (overlay) overlay.hidden = true;
                    }, 280);
                });
            });
        }
    }
}

// ── Rich hover tooltip for chart cells inside the insights modal ──
function ensureChartTooltip() {
    let tt = document.getElementById("chart-tooltip");
    if (tt) return tt;
    tt = document.createElement("div");
    tt.id = "chart-tooltip";
    tt.className = "chart-tooltip";
    document.body.appendChild(tt);
    return tt;
}
function showChartTooltip(target, html) {
    const tt = ensureChartTooltip();
    tt.innerHTML = html;
    tt.classList.add("is-visible");
    const rect = target.getBoundingClientRect();
    const ttRect = tt.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - ttRect.width / 2;
    let y = rect.top - ttRect.height - 8;
    if (y < 8) y = rect.bottom + 8;
    x = Math.max(8, Math.min(x, window.innerWidth - ttRect.width - 8));
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
}
function hideChartTooltip() {
    const tt = document.getElementById("chart-tooltip");
    if (tt) tt.classList.remove("is-visible");
}

// Attach delegated hover handlers once
if (typeof document !== "undefined") {
    document.addEventListener("mouseover", (e) => {
        const col = e.target.closest?.(".insights-history-col");
        if (col?.dataset?.tooltip) {
            showChartTooltip(col, col.dataset.tooltip);
            return;
        }
        const cell = e.target.closest?.(".insights-hour-cell");
        if (cell?.dataset?.tooltip) {
            showChartTooltip(cell, cell.dataset.tooltip);
        }
    });
    document.addEventListener("mouseout", (e) => {
        if (e.target.closest?.(".insights-history-col, .insights-hour-cell")) {
            hideChartTooltip();
        }
    });
    document.addEventListener("scroll", hideChartTooltip, true);
}

// ============================================================
//  Project drill-down modal
// ============================================================
export function refreshProject(projectName) {
    const el = (id) => document.getElementById(id);
    const titleEl = el("project-title");
    if (titleEl) titleEl.textContent = projectName;

    const matching = S.liveAgents.filter(a => (a.projectName || "") === projectName);
    const running = matching.filter(a => a.isRunning);
    const totalCompleted = matching.reduce((s, a) => s + (a.completedTasks || 0), 0);
    const totalRam = matching.reduce((s, a) => s + (a.memoryMB || 0), 0);
    const ongoing = matching.reduce((s, a) =>
        s + ((a.tasks || []).filter(t => t.status === "in_progress").length), 0);

    if (el("project-agents"))    el("project-agents").textContent    = running.length;
    if (el("project-completed")) el("project-completed").textContent = totalCompleted;
    if (el("project-ongoing"))   el("project-ongoing").textContent   = ongoing;
    if (el("project-ram"))       el("project-ram").innerHTML = totalRam.toLocaleString() + '<span class="insights-unit">MB</span>';

    // Platform breakdown for this project
    const platformsEl = el("project-platforms");
    if (platformsEl) {
        const buckets = new Map();
        matching.forEach(a => {
            const k = a.platform || "unknown";
            buckets.set(k, (buckets.get(k) || 0) + 1);
        });
        const items = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
        if (items.length === 0) {
            platformsEl.innerHTML = `<div class="insights-empty">${esc(i18n("insights.emptyPlatforms"))}</div>`;
        } else {
            platformsEl.innerHTML = items.map(([key, count]) => `
                <span class="project-platform-chip" style="background:${platformColor(key)}26;color:${platformColor(key)};border-color:${platformColor(key)}55">
                    <span class="project-platform-dot" style="background:${platformColor(key)}"></span>
                    <span>${esc(PLATFORM_META[key]?.label || key)}</span>
                    <span class="project-platform-count">${count}</span>
                </span>
            `).join("");
        }
    }

    // Agent list
    const agentListEl = el("project-agent-list");
    if (agentListEl) {
        if (matching.length === 0) {
            agentListEl.innerHTML = `<div class="insights-empty">${esc(i18n("project.empty"))}</div>`;
        } else {
            const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
            const taskWord = lang === "en" ? "tasks" : "태스크";
            const memWord = "MB";
            agentListEl.innerHTML = matching.map(a => {
                const theme = themeForAgent(a);
                const status = a.isRunning ? a.status : "offline";
                const meta = STATUS_META[status] || STATUS_META.idle;
                const work = getWorkText(a) || (a.currentTask?.subject || "");
                return `
                    <button type="button" class="project-agent-row" data-pid="${esc(String(a.pid))}">
                        <span class="project-agent-avatar" style="background:${theme.body}">${esc(theme.name.charAt(0))}</span>
                        <div class="project-agent-info">
                            <div class="project-agent-name">${esc(theme.name)}</div>
                            <div class="project-agent-meta">
                                <span class="project-agent-status" style="color:${meta.color}">${esc(statusLabelI18n(status))}</span>
                                <span>·</span>
                                <span>${a.completedTasks || 0}/${a.totalTasks || 0} ${taskWord}</span>
                                <span>·</span>
                                <span>${a.memoryMB || 0} ${memWord}</span>
                            </div>
                            ${work ? `<div class="project-agent-work">${esc(work)}</div>` : ""}
                        </div>
                    </button>
                `;
            }).join("");
            agentListEl.querySelectorAll(".project-agent-row").forEach(btn => {
                btn.addEventListener("click", () => {
                    const pid = btn.getAttribute("data-pid");
                    if (!pid) return;
                    S.selectedPid = pid;
                    S.detailPid = pid;
                    S.directorFocusPid = pid;
                    S.directorMode = true;
                    document.getElementById("project-overlay")?.classList?.remove("is-visible");
                    setTimeout(() => {
                        const ov = document.getElementById("project-overlay");
                        if (ov) ov.hidden = true;
                    }, 280);
                });
            });
        }
    }

    // Recent tasks across all agents on this project
    const tasksEl = el("project-tasks");
    if (tasksEl) {
        const flat = [];
        matching.forEach(a => {
            (a.tasks || []).forEach(t => flat.push({ ...t, _agent: themeForAgent(a).name }));
        });
        flat.sort((a, b) => {
            const order = { in_progress: 0, pending: 1, completed: 2 };
            const aOrd = order[a.status] ?? 3;
            const bOrd = order[b.status] ?? 3;
            return aOrd - bOrd;
        });
        if (flat.length === 0) {
            tasksEl.innerHTML = `<div class="insights-empty">${esc(i18n("project.emptyTasks"))}</div>`;
        } else {
            const lang = (window.aiTycoonI18n?.getLang?.() || "ko");
            tasksEl.innerHTML = flat.slice(0, 8).map(task => {
                const statusLabel = task.status === "in_progress" ? (lang === "en" ? "in progress" : "진행")
                    : task.status === "completed" ? (lang === "en" ? "done" : "완료")
                    : (lang === "en" ? "pending" : "대기");
                const color = task.status === "in_progress" ? "#10b981"
                    : task.status === "completed" ? "#94a3b8"
                    : "#f59e0b";
                return `
                    <div class="project-task-row">
                        <span class="project-task-status" style="background:${color}22;color:${color}">${esc(statusLabel)}</span>
                        <span class="project-task-subject">${esc(task.subject || task.activeForm || `Task ${task.id}`)}</span>
                        <span class="project-task-agent">${esc(task._agent || "")}</span>
                    </div>
                `;
            }).join("");
        }
    }
}

if (typeof window !== "undefined") window.refreshProject = refreshProject;

// Expose for window-level button handlers
if (typeof window !== "undefined") window.refreshInsights = refreshInsights;
