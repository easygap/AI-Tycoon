// ============================================================
//  AI TYCOON — WebSocket Connection & State Handling
// ============================================================

import { S, addLog, addWorkEvent, getWorkText, spawnParticles, spawnHearts } from "./state.js";
import {
    WS_URL, RECONNECT_BASE, RECONNECT_MAX,
    AGENT_THEMES, TILE, SUB_COLORS, SUB_SPEECH, STATUS_META,
    generateDeskSpots,
} from "./constants.js";
import { updatePanel, updateStats, updateDetailPanel, updateLiveHud } from "./panel.js";

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
            else if (msg.type === "heartbeat") {
                S.lastHeartbeat = Date.now();
                if (msg.diagnostics && S.serverState) {
                    S.serverState.diagnostics = msg.diagnostics;
                    updateLiveHud();
                }
            }
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

    const hudText = document.getElementById("hud-conn-text");
    const hudDot = document.getElementById("hud-live-dot");
    if (hudText) hudText.textContent = ok ? "라이브 연결" : "연결 대기";
    if (hudDot) hudDot.classList.toggle("is-on", ok);
    updateLiveHud();
}

function pidKey(pid) {
    return String(pid);
}

function statusOf(agent) {
    return agent?.isRunning ? agent.status : "offline";
}

function firstLine(text, max = 72) {
    const cleaned = String(text || "").replace(/\[Pasted text[^\]]*\]/g, "").trim();
    const line = cleaned.split("\n")[0].trim();
    return line.length > max ? `${line.substring(0, max - 1)}...` : line;
}

function workSignature(agent) {
    const prompt = agent?.currentWork?.prompt || "";
    const task = agent?.currentTask?.subject || "";
    const ts = agent?.currentWork?.timestamp || "";
    return `${prompt}|${task}|${ts}`;
}

function themeForAgent(agent) {
    const idx = S.liveAgents.findIndex(a => pidKey(a.pid) === pidKey(agent.pid));
    return AGENT_THEMES[(idx >= 0 ? idx : 0) % AGENT_THEMES.length];
}

function addAgentEvent(agent, type, overrides = {}) {
    const theme = overrides.theme || themeForAgent(agent);
    const status = overrides.status || statusOf(agent);
    const meta = STATUS_META[status] || STATUS_META.idle;
    addWorkEvent({
        type,
        pid: pidKey(agent.pid),
        agentName: theme.name,
        projectName: agent.projectName || agent.platformName || "Agent",
        platform: agent.platform,
        status,
        color: theme.body,
        statusColor: meta.color,
        text: getWorkText(agent) || firstLine(agent.currentWork?.prompt || agent.currentTask?.subject || overrides.text || "", 72),
        ...overrides,
        theme: undefined,
    });
}

function collectWorkEvents(prevAgentsByPid) {
    const previousExists = prevAgentsByPid.size > 0;
    S.liveAgents.forEach(agent => {
        const prev = prevAgentsByPid.get(pidKey(agent.pid));
        if (!prev || !previousExists) return;

        const prevStatus = statusOf(prev);
        const currentStatus = statusOf(agent);
        if (currentStatus !== prevStatus) {
            const activeStatuses = ["coding", "thinking", "searching", "reviewing", "meeting"];
            if (activeStatuses.includes(currentStatus)) {
                addAgentEvent(agent, "status", {
                    label: STATUS_META[currentStatus]?.label || currentStatus,
                    key: `status|${agent.pid}|${currentStatus}`,
                });
            } else if (currentStatus === "offline") {
                addAgentEvent(agent, "leave", {
                    label: "연결 종료",
                    text: "작업실에서 나갔어요",
                    key: `offline|${agent.pid}`,
                });
            }
        }

        if (!prev.needsReview && agent.needsReview) {
            addAgentEvent(agent, "review", {
                label: "검토 요청",
                text: getWorkText(agent) || firstLine(agent.currentWork?.prompt || agent.currentTask?.subject || "확인이 필요해요", 72),
                key: `review|${agent.pid}|${workSignature(agent)}`,
            });
        }

        if (agent.currentWork?.prompt && workSignature(agent) !== workSignature(prev)) {
            const work = firstLine(agent.currentWork.prompt, 78);
            addAgentEvent(agent, "work", {
                label: "새 작업",
                text: work,
                key: `work|${agent.pid}|${work}`,
            });
        }

        const prevTasks = new Map((prev.tasks || []).map(task => [pidKey(task.id), task]));
        (agent.tasks || []).forEach(task => {
            const prevTask = prevTasks.get(pidKey(task.id));
            if (!prevTask) {
                if (task.status === "in_progress") {
                    addAgentEvent(agent, "task-start", {
                        taskId: task.id,
                        label: "태스크 시작",
                        text: firstLine(task.activeForm || task.subject || `Task ${task.id}`, 72),
                        key: `task-start|${agent.pid}|${task.id}`,
                    });
                }
                return;
            }

            if (task.status === prevTask.status) return;
            if (task.status === "in_progress") {
                addAgentEvent(agent, "task-start", {
                    taskId: task.id,
                    label: "태스크 시작",
                    text: firstLine(task.activeForm || task.subject || `Task ${task.id}`, 72),
                    key: `task-start|${agent.pid}|${task.id}|${task.status}`,
                });
            } else if (task.status === "completed" && prevTask.status !== "completed") {
                addAgentEvent(agent, "task-done", {
                    taskId: task.id,
                    label: "완료",
                    text: firstLine(task.subject || task.activeForm || `Task ${task.id}`, 72),
                    key: `task-done|${agent.pid}|${task.id}`,
                });
            }
        });
    });
}

// ── Handle live data ──
export function handleState(state) {
    S.serverState = state;
    S.lastStateAt = Date.now();
    const prevAgentsByPid = new Map(S.liveAgents.map(a => [pidKey(a.pid), a]));
    const prevPids = new Set(S.liveAgents.map(a => pidKey(a.pid)));
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
            if (!prevPids.has(pidKey(agent.pid))) {
                addLog(`${theme.name} (${agent.projectName}) 출근했어요!`, "join");
                addAgentEvent(agent, "join", {
                    theme,
                    label: "출근",
                    text: "작업실에 합류했어요",
                    key: `join|${agent.pid}`,
                });
                spawnParticles(dx, dy, theme.body, 12);
                spawnHearts(dx, dy - 16, 3);
            }
        }
    });

    collectWorkEvents(prevAgentsByPid);

    const curPids = new Set(S.liveAgents.map(a => pidKey(a.pid)));
    Object.keys(S.visualAgents).forEach(pid => {
        if (!curPids.has(pid)) {
            const theme = S.visualAgents[pid].theme;
            addLog(`${theme.name} 퇴근! 수고했어요~`, "leave");
            const prevAgent = prevAgentsByPid.get(pid);
            if (prevAgent) {
                addAgentEvent(prevAgent, "leave", {
                    theme,
                    label: "퇴근",
                    text: "작업실에서 나갔어요",
                    key: `leave|${pid}`,
                });
            }
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
