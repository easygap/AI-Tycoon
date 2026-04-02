// ============================================================
//  AI TYCOON — WebSocket Connection & State Handling
// ============================================================

import { S, addLog, spawnParticles, spawnHearts } from "./state.js";
import {
    WS_URL, RECONNECT_BASE, RECONNECT_MAX,
    AGENT_THEMES, TILE, SUB_COLORS, SUB_SPEECH,
    generateDeskSpots,
} from "./constants.js";
import { updatePanel, updateStats, updateDetailPanel } from "./panel.js";

// ── WebSocket ──
export function connectWS() {
    try { S.ws = new WebSocket(WS_URL); } catch(e) { scheduleReconnect(); return; }
    S.ws.onopen = () => {
        S.connected = true;
        S.reconnectAttempt = 0;
        S.lastHeartbeat = Date.now();
        setConn(true);
        addLog("서버 연결 완료!", "system");
    };
    S.ws.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.type === "full_state") handleState(msg.data);
            else if (msg.type === "heartbeat") S.lastHeartbeat = Date.now();
        } catch (err) { console.error("[AI Tycoon] State error:", err); }
    };
    S.ws.onclose = () => {
        S.connected = false;
        setConn(false);
        scheduleReconnect();
    };
    S.ws.onerror = () => { try { S.ws.close(); } catch(e) {} };
}

export function scheduleReconnect() {
    S.reconnectAttempt++;
    const delay = Math.min(RECONNECT_BASE * Math.pow(1.5, S.reconnectAttempt - 1), RECONNECT_MAX);
    const txt = document.getElementById("conn-text");
    const dot = document.getElementById("conn-dot");
    if (txt) txt.textContent = `재연결 (${S.reconnectAttempt})`;
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse";
    setTimeout(connectWS, delay);
}

export function setConn(ok) {
    const dot = document.getElementById("conn-dot");
    const txt = document.getElementById("conn-text");
    const badge = document.getElementById("conn-badge");
    if (ok) {
        dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300";
        txt.textContent = "실시간";
        badge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200/60 text-xs text-emerald-600 font-medium";
    } else {
        dot.className = "w-1.5 h-1.5 rounded-full bg-zinc-400";
        txt.textContent = "연결 중";
        badge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 ring-1 ring-zinc-200/60 text-xs text-zinc-500";
    }
}

// ── Handle live data ──
export function handleState(state) {
    S.serverState = state;
    const prevPids = new Set(S.liveAgents.map(a => a.pid));
    S.liveAgents = state.agents || [];

    // Re-generate desk grid if agent count changed
    if (S.liveAgents.length > S.DESK_SPOTS.length) {
        S.DESK_SPOTS = generateDeskSpots(S.liveAgents.length);
    }

    S.liveAgents.forEach((agent, idx) => {
        if (!S.visualAgents[agent.pid]) {
            const desk = S.DESK_SPOTS[idx] || { x: 2 + (idx % 4) * 3, y: 3 + Math.floor(idx / 4) * 3 };
            const theme = AGENT_THEMES[idx % AGENT_THEMES.length];
            const dx = desk.x * TILE + TILE / 2;
            const dy = desk.y * TILE + TILE / 2;
            S.visualAgents[agent.pid] = {
                x: dx, y: dy, homeX: dx, homeY: dy,
                theme, animTick: Math.floor(Math.random() * 100),
                direction: 0, moving: false,
                walkPath: [], walkIndex: 0,
                speechText: "", speechTimer: 0,
                prevStatus: null,
                behaviorTimer: 80 + Math.floor(Math.random() * 200),
                chatPartner: null,
            };
            if (!prevPids.has(agent.pid)) {
                addLog(`${theme.name} (${agent.projectName}) 출근했어요!`, "join");
                spawnParticles(dx, dy, theme.body, 12);
                spawnHearts(dx, dy - 16, 3);
            }
        }
    });

    const curPids = new Set(S.liveAgents.map(a => a.pid));
    Object.keys(S.visualAgents).forEach(pid => {
        if (!curPids.has(pid)) {
            const theme = S.visualAgents[pid].theme;
            addLog(`${theme.name} 퇴근! 수고했어요~`, "leave");
            delete S.visualAgents[pid];
            // Fix: clear selectedPid if agent left
            if (S.selectedPid === pid) S.selectedPid = null;
        }
    });

    // Update sub-agents (tasks as mini characters)
    const activeSubKeys = new Set();
    S.liveAgents.forEach((agent, agentIdx) => {
        const v = S.visualAgents[agent.pid];
        if (!v || !agent.tasks) return;
        agent.tasks.forEach((task, ti) => {
            const key = `${agent.pid}-${task.id}`;
            activeSubKeys.add(key);
            if (!S.visualSubAgents[key]) {
                S.visualSubAgents[key] = {
                    parentPid: agent.pid,
                    taskId: task.id,
                    color: SUB_COLORS[ti % SUB_COLORS.length],
                    slotIndex: ti,
                    animTick: Math.floor(Math.random() * 100),
                    speechText: "",
                    speechTimer: 0,
                    prevStatus: null,
                    bobPhase: Math.random() * Math.PI * 2,
                };
                if (task.status === "in_progress") {
                    addLog(`[${agent.projectName}] ${(task.subject || "").substring(0, 18)} 시작`, "sub");
                }
            }
            const sub = S.visualSubAgents[key];
            sub.slotIndex = ti; // keep slot in sync
            if (task.status !== sub.prevStatus) {
                const wasInProgress = sub.prevStatus === "in_progress";
                sub.prevStatus = task.status;
                if (task.status === "in_progress") {
                    const lines = SUB_SPEECH.in_progress;
                    sub.speechText = lines[Math.floor(Math.random() * lines.length)];
                    sub.speechTimer = 80;
                } else if (task.status === "completed" && wasInProgress) {
                    sub.speechText = "완료!";
                    sub.speechTimer = 60;
                }
            }
        });
    });
    // Clean up removed sub-agents
    Object.keys(S.visualSubAgents).forEach(key => {
        if (!activeSubKeys.has(key)) delete S.visualSubAgents[key];
    });

    // Track memory history per agent
    const now = Date.now();
    S.liveAgents.forEach(a => {
        if (!S.memoryHistory[a.pid]) S.memoryHistory[a.pid] = [];
        S.memoryHistory[a.pid].push({ ts: now, mb: a.memoryMB });
        if (S.memoryHistory[a.pid].length > 60) S.memoryHistory[a.pid].shift();
    });
    // Clean dead agents
    Object.keys(S.memoryHistory).forEach(pid => {
        if (!S.liveAgents.find(a => a.pid === pid)) delete S.memoryHistory[pid];
    });

    updatePanel();
    updateStats();
    if (S.detailPid) updateDetailPanel();
}
