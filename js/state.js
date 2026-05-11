// ============================================================
//  AI TYCOON — Shared Mutable State + Small Utilities
// ============================================================

import { generateDeskSpots, MAX_PARTICLES, MAX_HEARTS } from "./constants.js";

function readStoredStringArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed)
            ? [...new Set(parsed.map(item => String(item)).filter(Boolean))].slice(0, 40)
            : [];
    } catch {
        return [];
    }
}

export const S = {
    canvas: null,
    ctx: null,
    canvasW: 0,
    canvasH: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    animFrame: 0,
    particles: [],
    heartParticles: [],
    ws: null,
    connected: false,
    reconnectAttempt: 0,
    lastHeartbeat: Date.now(),
    liveAgents: [],
    visualAgents: {},
    visualSubAgents: {},
    selectedPid: null,
    detailPid: null,
    serverState: null,
    lastStateAt: 0,
    inspectedEventKey: null,
    activityLog: [],
    workEvents: [],
    chatTimer: 180,
    activeFilter: localStorage.getItem("ai-tycoon-filter") || "all",
    activePlatformFilter: localStorage.getItem("ai-tycoon-platform") || "all",
    activeActionFilter: localStorage.getItem("ai-tycoon-action-filter") || "all",
    agentSearchQuery: localStorage.getItem("ai-tycoon-agent-search") || "",
    sortOrder: localStorage.getItem("ai-tycoon-sort") || "status",
    pinnedAgentKeys: [
        ...new Set([
            ...readStoredStringArray("ai-tycoon-pinned-agents"),
            ...readStoredStringArray("ai-tycoon-pinned-pids"),
        ]),
    ],
    memoryHistory: {},
    zoomLevel: 1.0,
    panX: 0,
    panY: 0,
    pixiDensity: localStorage.getItem("ai-tycoon-pixi-density") || "auto",
    directorMode: localStorage.getItem("ai-tycoon-director") === "true",
    directorFocusPid: null,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    DESK_SPOTS: generateDeskSpots(8),
    resizeTimer: null,

    // Boss review queue: ordered array of { pid, phase, waitTick }
    // phase: "queuedForBoss" → "walkingToBoss" → "waitingAtBossArea" → "activeReview"
    //        → "reviewResolved" → "returningToWork"
    bossQueue: [],
    bossActivePid: null, // pid of the agent currently at the active review spot
};

/** Escape HTML special characters */
export function esc(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Get display text for what agent is currently working on */
export function getWorkText(agent) {
    // Priority 1: currentWork from history (real-time prompt)
    if (agent.currentWork && agent.currentWork.prompt) {
        const prompt = agent.currentWork.prompt;
        // Clean up: remove [Pasted text] references, take meaningful part
        const cleaned = prompt.replace(/\[Pasted text[^\]]*\]/g, "").trim();
        if (cleaned.length > 3) {
            // Take first meaningful line
            const firstLine = cleaned.split("\n")[0].trim();
            return firstLine.substring(0, 25);
        }
    }
    // Priority 2: currentTask subject
    if (agent.currentTask) {
        return agent.currentTask.subject.substring(0, 25);
    }
    return null;
}

/** Format time ago in Korean */
export function formatTimeAgo(ms) {
    if (ms < 60000) return "방금 전";
    if (ms < 3600000) return `${Math.floor(ms / 60000)}분 전`;
    return `${Math.floor(ms / 3600000)}시간 전`;
}

// ── Activity Log ──
export function addLog(msg, type, color) {
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    S.activityLog.unshift({ time: ts, message: msg, type: type || "system", color });
    if (S.activityLog.length > 50) S.activityLog.pop();

    const el = document.getElementById("activity-log");
    if (!el) return;
    el.innerHTML = S.activityLog.slice(0, 25).map(e => {
        const isChat = e.type === "chat";
        const cssClass = isChat ? "log-entry chat-entry" : "log-entry";
        const icon = isChat ? "solar:chat-round-dots-linear"
            : e.type === "join" ? "solar:login-2-linear"
            : e.type === "leave" ? "solar:logout-2-linear"
            : "solar:clipboard-list-linear";
        return `<div class="${cssClass}"><span class="log-time">${e.time}</span><iconify-icon icon="${icon}" class="log-icon"></iconify-icon><span>${esc(e.message)}</span></div>`;
    }).join("");
}

// ── Live Work Event Stream ──
export function addWorkEvent(event) {
    const now = Date.now();
    const key = event.key || [
        event.type,
        event.pid,
        event.status,
        event.taskId,
        event.text,
    ].filter(Boolean).join("|");

    const latest = S.workEvents[0];
    if (latest && latest.key === key && now - latest.ts < 2500) {
        latest.ts = now;
        return;
    }

    S.workEvents.unshift({
        ...event,
        key,
        ts: event.ts || now,
    });
    if (S.workEvents.length > 28) S.workEvents.length = 28;
}

// ── Boss Review Queue helpers ──
export function bossQueueEntry(pid) {
    return S.bossQueue.find(e => e.pid === pid);
}
export function bossQueueAdd(pid) {
    if (S.bossQueue.some(e => e.pid === pid)) return; // no duplicates
    S.bossQueue.push({ pid, phase: "queuedForBoss", waitTick: 0, result: null });
}
export function bossQueueRemove(pid) {
    S.bossQueue = S.bossQueue.filter(e => e.pid !== pid);
    if (S.bossActivePid === pid) S.bossActivePid = null;
}
export function bossQueueResolve(pid, result) {
    const entry = S.bossQueue.find(e => e.pid === pid);
    if (!entry) return;
    entry.phase = "reviewResolved";
    entry.result = result; // "yes" or "no"
    if (S.bossActivePid === pid) S.bossActivePid = null;
}

// ── Particles ──
export function spawnParticles(x, y, color, n) {
    while (S.particles.length > MAX_PARTICLES - n) S.particles.shift();
    for (let i = 0; i < n; i++) {
        S.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 2.5 - 0.5,
            life: 30 + Math.floor(Math.random() * 20),
            color, size: 1.5 + Math.random() * 2.5,
        });
    }
}

export function spawnHearts(x, y, n) {
    while (S.heartParticles.length > MAX_HEARTS - n) S.heartParticles.shift();
    const emojis = ["♥", "★", "♪", "✿"];
    for (let i = 0; i < n; i++) {
        S.heartParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vy: -0.3 - Math.random() * 0.4,
            life: 50 + Math.floor(Math.random() * 30),
            char: emojis[Math.floor(Math.random() * emojis.length)],
            color: ["#F9A8D4", "#FDE68A", "#A5B4FC", "#86EFAC"][Math.floor(Math.random() * 4)],
            size: 3 + Math.random() * 2,
        });
    }
}
