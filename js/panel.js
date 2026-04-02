// ============================================================
//  AI TYCOON — Side Panel, Detail Panel, Tooltips, Filters
// ============================================================

import { S, esc, getWorkText, formatTimeAgo } from "./state.js";
import {
    AGENT_THEMES, PLATFORM_META, ROLE_META, STATUS_META,
    SUB_COLORS,
} from "./constants.js";

// ── Filter helpers ──
export function updateFilterChips() {
    // Status filter chips
    document.querySelectorAll("#filter-bar .filter-chip").forEach(el => {
        el.classList.toggle("active", el.dataset.filter === S.activeFilter);
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
            allChip.onclick = () => window.setPlatformFilter("all");
            pfBar.appendChild(allChip);
            platforms.forEach(p => {
                const meta = PLATFORM_META[p] || { badge: p, color: "#888" };
                const chip = document.createElement("button");
                chip.className = `filter-chip${S.activePlatformFilter === p ? " active" : ""}`;
                chip.textContent = meta.badge;
                chip.style.cssText = S.activePlatformFilter === p ? `color:${meta.color};border-color:${meta.color}40;background:${meta.color}15` : "";
                chip.onclick = () => window.setPlatformFilter(p);
                pfBar.appendChild(chip);
            });
        }
    }
}

export function getFilteredSortedAgents() {
    let agents = [...S.liveAgents];

    // Status filter
    if (S.activeFilter !== "all") {
        agents = agents.filter(a => {
            const s = a.isRunning ? a.status : "offline";
            if (S.activeFilter === "coding") return ["coding", "thinking", "searching", "reviewing"].includes(s);
            if (S.activeFilter === "idle") return s === "idle";
            if (S.activeFilter === "offline") return s === "offline";
            return true;
        });
    }

    // Platform filter
    if (S.activePlatformFilter !== "all") {
        agents = agents.filter(a => a.platform === S.activePlatformFilter);
    }

    // Sort
    const statusPriority = { coding: 0, reviewing: 1, searching: 2, thinking: 3, idle: 4, offline: 5 };
    agents.sort((a, b) => {
        switch (S.sortOrder) {
            case "memory": return b.memoryMB - a.memoryMB;
            case "platform": return (a.platform || "").localeCompare(b.platform || "");
            case "project": return (a.projectName || "").localeCompare(b.projectName || "");
            case "recent": {
                const ta = a.currentWork?.timestamp || 0;
                const tb = b.currentWork?.timestamp || 0;
                return tb - ta;
            }
            default: { // status
                const sa = statusPriority[a.isRunning ? a.status : "offline"] ?? 9;
                const sb = statusPriority[b.isRunning ? b.status : "offline"] ?? 9;
                return sa - sb;
            }
        }
    });
    return agents;
}

// ── Side Panel ──
export function updatePanel() {
    updateFilterChips();

    const list = document.getElementById("agents-list");
    list.innerHTML = "";

    // Agent count
    const countEl = document.getElementById("agent-count");
    if (countEl) {
        const active = S.liveAgents.filter(a => a.isRunning).length;
        countEl.textContent = `${active}/${S.liveAgents.length}`;
    }

    const filteredAgents = getFilteredSortedAgents();
    if (filteredAgents.length === 0 && S.liveAgents.length > 0) {
        list.innerHTML = `<div class="text-[11px] text-zinc-400 text-center py-4">필터에 맞는 에이전트가 없습니다</div>`;
        return;
    }

    filteredAgents.forEach((agent, idx) => {
        const status = agent.isRunning ? agent.status : "offline";
        const meta = STATUS_META[status] || STATUS_META.idle;
        // Use consistent theme per agent (based on global index, not filtered index)
        const globalIdx = S.liveAgents.indexOf(agent);
        const theme = AGENT_THEMES[(globalIdx >= 0 ? globalIdx : idx) % AGENT_THEMES.length];

        const card = document.createElement("div");
        card.className = `agent-card${agent.pid === S.selectedPid ? " selected" : ""}${!agent.isRunning ? " is-offline" : ""}`;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `${theme.name} ${agent.projectName} ${meta.label}`);
        card.onclick = () => {
            const wasSelected = S.selectedPid === agent.pid;
            S.selectedPid = wasSelected ? null : agent.pid;
            S.detailPid = wasSelected ? null : agent.pid;
            updatePanel();
            updateDetailPanel();
        };

        // Show current work from latest prompt, falling back to tasks
        let task;
        if (agent.currentWork && agent.currentWork.prompt) {
            const cleaned = agent.currentWork.prompt.replace(/\[Pasted text[^\]]*\]/g, "").trim();
            const firstLine = cleaned.split("\n")[0].trim();
            task = firstLine.length > 3
                ? firstLine.substring(0, 50)
                : (agent.currentTask ? agent.currentTask.subject : "대기 중");
        } else if (agent.currentTask) {
            task = agent.currentTask.subject;
        } else {
            task = agent.tasks?.length > 0 ? `${agent.tasks.length}개 태스크` : "대기 중";
        }
        const workAge = agent.currentWork ? formatTimeAgo(Date.now() - agent.currentWork.timestamp) : "";

        const pct = agent.totalTasks > 0 ? Math.round((agent.completedTasks / agent.totalTasks) * 100) : 0;
        const memClass = agent.memoryMB > 1000 ? "mem-high" : agent.memoryMB > 500 ? "mem-mid" : "mem-low";

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
                        <div class="text-[13px] font-bold text-zinc-800 truncate">${theme.name} · ${esc(agent.projectName)}</div>
                        <div class="text-[11px] text-zinc-400 tabular-nums font-medium flex items-center gap-1">
                            <span class="inline-flex items-center px-1 rounded text-[9px] font-bold" style="background:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badgeBg};color:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).color}">${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badge}</span>
                            ${agent.role && ROLE_META[agent.role] ? `<span class="inline-flex items-center px-1 rounded text-[9px] font-bold" style="background:${ROLE_META[agent.role].color}20;color:${ROLE_META[agent.role].color}">${ROLE_META[agent.role].badge}</span>` : ""}
                            <span>${agent.memoryMB}MB${agent.processCount > 1 ? ` · ${agent.processCount}p` : ""}</span>
                        </div>
                    </div>
                    <span class="status-badge badge-${status}">${meta.label}</span>
                </div>
                <div class="text-[12px] text-zinc-500 truncate mb-1" style="word-break:keep-all;" title="${esc(task)}">${esc(task)}</div>
                ${workAge ? `<div class="text-[10px] text-zinc-400 mb-1">💬 ${workAge}</div>` : ""}
                ${agent.totalTasks > 0 ? `
                <div class="progress-track">
                    <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="text-[11px] text-zinc-400 mt-1.5 tabular-nums font-medium">${agent.completedTasks}/${agent.totalTasks} 완료</div>
                ${subHtml}` : ""}
            </div>
        `;
        list.appendChild(card);
    });
}

export function updateStats() {
    if (!S.serverState) return;
    const now = new Date();
    document.getElementById("game-time").textContent =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const total = S.liveAgents.reduce((s, a) => s + a.totalTasks, 0);
    const done = S.liveAgents.reduce((s, a) => s + a.completedTasks, 0);
    const ram = S.liveAgents.reduce((s, a) => s + a.memoryMB, 0);

    document.getElementById("stat-tasks").textContent = total;
    document.getElementById("stat-completed").textContent = done;
    document.getElementById("stat-ram").textContent = ram.toLocaleString();
    document.getElementById("stat-agents").textContent = S.liveAgents.filter(a => a.isRunning).length;
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
                <div class="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mt-3 mb-1">현재 작업</div>
                <div class="text-[11px] text-zinc-600 mb-1" style="word-break:keep-all; line-height:1.5;">${esc(firstLine.substring(0, 100))}</div>
                <div class="text-[10px] text-zinc-400 mb-2">💬 ${formatTimeAgo(Date.now() - agent.currentWork.timestamp)}</div>`;
        }
    }

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
        if (tasks.length > 10) taskHtml += `<div class="text-[10px] text-zinc-400">+${tasks.length - 10}개 더</div>`;
    } else {
        taskHtml = `<div class="text-[11px] text-zinc-400">등록된 태스크 없음</div>`;
    }

    container.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background:${theme.body}"></div>
                <span class="text-[14px] font-bold" style="color:${theme.bodyDark}">${theme.name}</span>
                <span class="status-badge badge-${agent.isRunning ? agent.status : 'offline'} text-[10px]">${meta.label}</span>
            </div>
            <button onclick="closeDetail()" class="w-6 h-6 rounded-md flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors" aria-label="상세 패널 닫기">
                <iconify-icon icon="solar:close-circle-linear" class="text-zinc-400 text-sm"></iconify-icon>
            </button>
        </div>
        <div class="flex items-center gap-1.5 mb-1">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold" style="background:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).badgeBg};color:${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).color}">${(PLATFORM_META[agent.platform] || PLATFORM_META.claude).label}</span>
            <span class="text-[12px] text-zinc-600">${esc(agent.projectName)}</span>
        </div>
        <div class="text-[10px] text-zinc-400 truncate mb-3">${esc(agent.cwd || agent.platformName || "")}</div>

        <div class="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mb-1">메모리 사용량</div>
        <div class="text-[10px] text-zinc-400 mb-1">PID ${agent.pid} · ${agent.memoryMB}MB</div>
        ${memGraph || '<div class="text-[10px] text-zinc-400">데이터 수집 중...</div>'}

        ${currentWorkHtml}

        ${tasks.length > 0 ? `<div class="text-[11px] font-bold text-zinc-500 uppercase tracking-wide mt-3 mb-2">태스크 (${agent.completedTasks}/${agent.totalTasks})</div>
        <div class="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">${taskHtml}</div>` : ""}
    `;
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
            const statusLabel = task.status === "in_progress" ? "작업 중" : task.status === "completed" ? "완료" : "대기";
            const statusColor = task.status === "in_progress" ? "#059669" : task.status === "completed" ? "#a1a1aa" : "#d97706";
            tt.innerHTML = `
                <b style="color:${hovSub.color}">서브 에이전트 · ${esc((task.subject || "").substring(0, 25))}</b>
                <div class="tt-row"><span class="tt-label">부모</span><span class="tt-value">${esc(parentTheme.name)} · ${esc(agent.projectName)}</span></div>
                <div class="tt-row"><span class="tt-label">상태</span><span class="tt-value" style="color:${statusColor}">${statusLabel}</span></div>
                ${task.activeForm ? `<div class="tt-row"><span class="tt-label">활동</span><span class="tt-value">${esc(task.activeForm.substring(0, 25))}</span></div>` : ""}
                ${task.description ? `<div class="tt-row"><span class="tt-label">설명</span><span class="tt-value" style="max-width:160px;white-space:normal;font-size:11px;">${esc(task.description.substring(0, 60))}</span></div>` : ""}
                ${task.blockedBy?.length ? `<div class="tt-row"><span class="tt-label">대기</span><span class="tt-value">Task ${task.blockedBy.join(", ")} 완료 필요</span></div>` : ""}
            `;
            tt.className = "";
            positionTooltip(tt, e.clientX, e.clientY);
        }
    } else if (hov) {
        S.canvas.style.cursor = "pointer";
        const meta = (STATUS_META[hov.isRunning ? hov.status : "offline"] || STATUS_META.idle);
        const theme = AGENT_THEMES[S.liveAgents.indexOf(hov) % AGENT_THEMES.length];
        const taskText = getWorkText(hov) || (hov.currentTask ? hov.currentTask.subject : "대기 중");
        const memClass = hov.memoryMB > 1000 ? "mem-high" : hov.memoryMB > 500 ? "mem-mid" : "mem-low";
        const subCount = (hov.tasks || []).filter(t => t.status !== "completed").length;
        tt.innerHTML = `
            <b style="color:${theme.bodyDark}">${esc(theme.name)} · ${esc(hov.projectName)}</b>
            <div class="tt-row"><span class="tt-label">PID</span><span class="tt-value">${hov.pid}</span></div>
            <div class="tt-row"><span class="tt-label">상태</span><span class="tt-value" style="color:${meta.color}">${meta.label}</span></div>
            <div class="tt-row"><span class="tt-label">메모리</span><span class="tt-value ${memClass}">${hov.memoryMB}MB</span></div>
            <div class="tt-row"><span class="tt-label">태스크</span><span class="tt-value">${esc(taskText)}</span></div>
            ${subCount > 0 ? `<div class="tt-row"><span class="tt-label">서브</span><span class="tt-value" style="color:#059669">${subCount}개 활성</span></div>` : ""}
            <div class="tt-row"><span class="tt-label">경로</span><span class="tt-value" style="font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hov.cwd || "")}</span></div>
            <div class="tt-row"><span class="tt-label">완료</span><span class="tt-value">${hov.completedTasks}/${hov.totalTasks}</span></div>
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
