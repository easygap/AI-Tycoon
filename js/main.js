// ============================================================
//  AI TYCOON — Entry Point (init, loop, input, visual AI)
// ============================================================

import { S, addLog, addWorkEvent, getWorkText, spawnParticles, spawnHearts, spawnYawn, bossQueueEntry, bossQueueAdd, bossQueueRemove, bossQueueResolve } from "./state.js";
import {
    TILE, COLS, ROWS,
    ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
    AGENT_THEMES, SPEECH, MOVE_SPEECH, ROLE_META, ROLE_CHAT, STATUS_META,
    CHAT_TEMPLATES, POI, REPORT_SPEECH,
    BOSS_ACTIVE_SPOT, BOSS_WAIT_SPOTS, BOSS_WAIT_SPEECH,
    BOSS_YES_REACTIONS, BOSS_NO_REACTIONS,
    updatePalette,
} from "./constants.js";
import { connectWS, setConn } from "./ws.js";
import { render } from "./renderer.js";
import { updatePanel, updateDetailPanel, updateBossQueueUI, updateLiveHud, onMouseMove } from "./panel.js";
import { initPixiOverlay, resizePixiOverlay, renderPixiOverlay, getPixiOverlayDebug } from "./pixiOverlay.js";
import { compareAgentPriority } from "./agentPriority.js";
import { applyToDom as applyI18nToDom, onLangChange, getLang, t } from "./i18n.js";
// Auto-load helper modules so window.aiTycoon* helpers register on boot
import "./achievements.js";
import "./notifications.js";
import "./demoMode.js";
import "./snapshot.js";
import "./perfHud.js";
import "./tips.js";
import "./miniMap.js";
import "./backup.js";
import "./toasts.js";
import "./tour.js";
import "./crossTab.js";
import "./konami.js";
import "./awaySummary.js";
import "./commandPalette.js";

// ── Console branding (devtools welcome) ──
if (typeof console !== "undefined") {
    const big = "color:#d97757;font-weight:800;font-size:14px";
    const dim = "color:#7a5a48;font-size:11px";
    const ok  = "color:#10b981;font-weight:700";
    try {
        console.log("%c\n  ▄▄▄▄▄  AI Tycoon\n  █ █ █  pixel-art office for AI agents\n", big);
        console.log("%cTry %caiTycoonDemo.toggle()%c, %caiTycoonAchievements.list()%c, %caiTycoonSnapshot.download()", dim, ok, dim, ok, dim, ok);
        console.log("%cHotkeys: ? help · I insights · , settings · P snapshot · D dark · Ctrl+Shift+P perf", dim);
    } catch { /* ignore */ }
}

// Expose Pixi overlay debug for the perf HUD
if (typeof window !== "undefined") {
    window.aiTycoonOverlayDebug = getPixiOverlayDebug;
    // Expose shared state for one-shot helpers (toasts, mini-map, etc.)
    window.S = S;
}

const PANEL_FOCUSABLE = [
    "a[href]",
    "button:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");
const PIXI_DENSITY_MODES = ["auto", "minimal", "focus", "balanced", "rich"];
let lastCanvasA11yText = "";

function syncSidePanelState() {
    const panel = document.getElementById("side-panel");
    const toggle = document.getElementById("panel-toggle");
    const backdrop = document.getElementById("panel-backdrop");
    const closeButton = document.getElementById("panel-close");
    if (!panel) return;

    const hidden = panel.classList.contains("panel-hidden");
    const overlayOpen = !hidden && window.innerWidth <= 480;
    panel.toggleAttribute("inert", hidden);
    panel.inert = hidden;
    panel.setAttribute("aria-hidden", hidden ? "true" : "false");
    panel.setAttribute("role", overlayOpen ? "dialog" : "complementary");
    panel.setAttribute("aria-modal", overlayOpen ? "true" : "false");

    if (backdrop) {
        backdrop.hidden = !overlayOpen;
        backdrop.classList.toggle("is-visible", overlayOpen);
    }

    if (toggle) {
        toggle.setAttribute("aria-controls", "side-panel");
        toggle.setAttribute("aria-expanded", hidden ? "false" : "true");
    }

    if (hidden && panel.contains(document.activeElement) && toggle) {
        toggle.focus({ preventScroll: true });
    }

    if (overlayOpen && !panel.contains(document.activeElement)) {
        closeButton?.focus({ preventScroll: true });
    }
}

function panelFocusableItems() {
    const panel = document.getElementById("side-panel");
    if (!panel || panel.classList.contains("panel-hidden") || panel.inert) return [];
    return [...panel.querySelectorAll(PANEL_FOCUSABLE)]
        .filter(el => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" && el.offsetParent !== null);
}

function trapSidePanelFocus(event) {
    if (event.key !== "Tab" || window.innerWidth > 480) return;
    const panel = document.getElementById("side-panel");
    if (!panel || panel.classList.contains("panel-hidden")) return;

    const items = panelFocusableItems();
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
        return;
    }

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
    }
}

function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    return target.matches("input, textarea, select") || target.isContentEditable;
}

function handleGlobalShortcuts(event) {
    const key = event.key;
    const typing = isTypingTarget(event.target);
    // "/" focuses the side-panel search box. Ctrl/Cmd+K is owned by the
    // command palette (see js/commandPalette.js) and is no longer routed
    // here so the two shortcuts feel like distinct tools.
    if (key === "/" && !typing) {
        event.preventDefault();
        window.focusAgentSearch?.();
        return;
    }
    if (key === "Escape" && event.target?.id === "agent-search" && S.agentSearchQuery) {
        event.preventDefault();
        event.stopPropagation();
        window.clearAgentSearch?.();
    }
}

function pixiDensityMenu() {
    return document.getElementById("pixi-density-menu");
}

function pixiDensityToggle() {
    return document.getElementById("pixi-density-toggle");
}

function pixiDensityMenuItems() {
    const menu = pixiDensityMenu();
    if (!menu) return [];
    return [...menu.querySelectorAll("[data-density-option]")];
}

function closePixiDensityMenu({ restoreFocus = false } = {}) {
    const menu = pixiDensityMenu();
    const toggle = pixiDensityToggle();
    if (!menu) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    toggle?.setAttribute("aria-expanded", "false");
    if (restoreFocus && wasOpen) toggle?.focus({ preventScroll: true });
}

function openPixiDensityMenu() {
    const menu = pixiDensityMenu();
    const toggle = pixiDensityToggle();
    if (!menu || !toggle) return;
    updatePanel();
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    const activeItem = menu.querySelector('[data-active="true"]') || pixiDensityMenuItems()[0];
    requestAnimationFrame(() => activeItem?.focus({ preventScroll: true }));
}

function togglePixiDensityMenu(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const menu = pixiDensityMenu();
    if (!menu) {
        window.togglePixiDensity?.();
        return;
    }
    if (menu.hidden) openPixiDensityMenu();
    else closePixiDensityMenu({ restoreFocus: true });
}

function onPixiDensityDocumentClick(event) {
    if (event.target?.closest?.(".visual-density-control")) return;
    closePixiDensityMenu();
}

function onPixiDensityMenuKeydown(event) {
    const menu = pixiDensityMenu();
    if (!menu || menu.hidden || !event.target?.closest?.(".visual-density-control")) return;

    const items = pixiDensityMenuItems();
    if (items.length === 0) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));

    if (event.key === "Escape") {
        event.preventDefault();
        closePixiDensityMenu({ restoreFocus: true });
        return;
    }

    const nextIndex = {
        ArrowDown: (currentIndex + 1) % items.length,
        ArrowUp: (currentIndex - 1 + items.length) % items.length,
        Home: 0,
        End: items.length - 1,
    }[event.key];

    if (nextIndex !== undefined) {
        event.preventDefault();
        items[nextIndex]?.focus({ preventScroll: true });
    }
}

// ── Init ──
function init() {
    S.canvas = document.getElementById("office-canvas");
    S.ctx = S.canvas.getContext("2d");
    S.ctx.imageSmoothingEnabled = false;
    initPixiOverlay();
    window.syncSidePanelState = syncSidePanelState;

    window.addEventListener("resize", () => {
        if (S.resizeTimer) clearTimeout(S.resizeTimer);
        closePixiDensityMenu();
        S.resizeTimer = setTimeout(resize, 150);
    });
    S.canvas.addEventListener("mousemove", onMouseMove);
    S.canvas.addEventListener("click", onCanvasClick);
    S.canvas.addEventListener("keydown", onCanvasKeyDown);
    // Touch support (tap + one-finger pan + two-finger pinch zoom)
    S.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    S.canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    S.canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    S.canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
    // Zoom
    S.canvas.addEventListener("wheel", onWheel, { passive: false });
    // Pan (middle-click or right-drag)
    S.canvas.addEventListener("mousedown", onPanStart);
    S.canvas.addEventListener("mousemove", onPanMove);
    S.canvas.addEventListener("mouseup", onPanEnd);
    S.canvas.addEventListener("mouseleave", onPanEnd);
    S.canvas.addEventListener("contextmenu", e => e.preventDefault());
    S.canvas.addEventListener("dblclick", () => { S.zoomLevel = 1.0; S.panX = 0; S.panY = 0; resize(); });
    document.addEventListener("keydown", trapSidePanelFocus);
    document.addEventListener("keydown", handleGlobalShortcuts, true);
    document.addEventListener("keydown", onPixiDensityMenuKeydown);
    document.addEventListener("click", onPixiDensityDocumentClick);

    // Expose closeDetail state bridge for index.html
    window.__clearDetailPid = () => { S.detailPid = null; S.selectedPid = null; };
    if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
        window.__aiTycoonDebug = {
            addWorkEvent,
            pixi: getPixiOverlayDebug,
        };
    }

    // Expose filter/sort for index.html onclick handlers
    // Boss review queue actions
    window.bossReviewAction = (pid, result) => {
        const entry = bossQueueEntry(pid);
        if (!entry) return;

        if (entry.phase === "waitingAtBossArea" || entry.phase === "queuedForBoss" || entry.phase === "walkingToBoss") {
            // Out-of-order — demote current active (any phase) back to waiting
            if (S.bossActivePid && S.bossActivePid !== pid) {
                const curActive = bossQueueEntry(S.bossActivePid);
                if (curActive && (curActive.phase === "activeReview" || curActive.phase === "walkingToBoss")) {
                    delete curActive._pendingResult; // clear any pending result on demoted agent
                    curActive.phase = "waitingAtBossArea";
                    const cv = S.visualAgents[S.bossActivePid];
                    if (cv) walkTo(cv, BOSS_WAIT_SPOTS[0].x, BOSS_WAIT_SPOTS[0].y);
                }
            }
            S.bossActivePid = pid;
            entry.phase = "walkingToBoss";
            entry._pendingResult = result;  // applied on arrival at active spot
            const v = S.visualAgents[pid];
            if (v) walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
        } else if (entry.phase === "activeReview") {
            bossQueueResolve(pid, result);
        }
        updateBossQueueUI();
    };

    window.setFilter = (f) => { S.activeFilter = f; localStorage.setItem("ai-tycoon-filter", f); updatePanel(); updateLiveHud(); };
    window.setPlatformFilter = (f) => { S.activePlatformFilter = f; localStorage.setItem("ai-tycoon-platform", f); updatePanel(); updateLiveHud(); };
    window.setActionFilter = (f) => {
        S.activeActionFilter = f || "all";
        localStorage.setItem("ai-tycoon-action-filter", S.activeActionFilter);
        updatePanel();
        updateLiveHud();
    };
    window.setAgentSearch = (value) => {
        S.agentSearchQuery = String(value || "");
        localStorage.setItem("ai-tycoon-agent-search", S.agentSearchQuery);
        updatePanel();
        updateLiveHud();
    };
    window.clearAgentSearch = () => {
        S.agentSearchQuery = "";
        localStorage.removeItem("ai-tycoon-agent-search");
        const input = document.getElementById("agent-search");
        if (input) {
            input.value = "";
            input.focus({ preventScroll: true });
        }
        updatePanel();
        updateLiveHud();
    };
    window.focusAgentSearch = () => {
        const panel = document.getElementById("side-panel");
        if (panel?.classList.contains("panel-hidden")) {
            panel.dataset.userToggled = "true";
            panel.classList.remove("panel-hidden");
            syncSidePanelState();
            resize();
        }
        const focusInput = () => {
            const input = document.getElementById("agent-search");
            input?.focus({ preventScroll: true });
            input?.select?.();
        };
        focusInput();
        requestAnimationFrame(focusInput);
    };
    window.setSortOrder = (s) => { S.sortOrder = s; localStorage.setItem("ai-tycoon-sort", s); updatePanel(); };
    window.setPixiDensity = (mode = "auto") => {
        if (!PIXI_DENSITY_MODES.includes(mode)) return;
        S.pixiDensity = mode;
        if (mode === "auto") {
            localStorage.removeItem("ai-tycoon-pixi-density");
        } else {
            localStorage.setItem("ai-tycoon-pixi-density", mode);
        }
        updatePanel();
        updateLiveHud();
    };
    window.setPixiDensityFromMenu = (mode = "auto") => {
        window.setPixiDensity(mode);
        closePixiDensityMenu({ restoreFocus: true });
    };
    window.togglePixiDensityMenu = togglePixiDensityMenu;
    window.togglePixiDensity = () => {
        const current = PIXI_DENSITY_MODES.includes(S.pixiDensity) ? S.pixiDensity : "auto";
        window.setPixiDensity(PIXI_DENSITY_MODES[(PIXI_DENSITY_MODES.indexOf(current) + 1) % PIXI_DENSITY_MODES.length]);
    };
    window.focusActiveAgent = () => {
        const agent = getDirectorFocusAgent();
        if (!agent) return;
        S.selectedPid = agent.pid;
        S.detailPid = agent.pid;
        S.directorFocusPid = agent.pid;
        focusAgent(agent.pid, true);
        updatePanel();
        updateDetailPanel();
        updateLiveHud();
        updateCanvasAccessibility(true);
    };
    window.focusAgentByPid = (pid) => {
        const agent = S.liveAgents.find(a => String(a.pid) === String(pid));
        if (!agent) return;
        S.directorMode = false;
        localStorage.setItem("ai-tycoon-director", "false");
        S.selectedPid = agent.pid;
        S.detailPid = agent.pid;
        S.directorFocusPid = agent.pid;
        focusAgent(agent.pid, true);
        updatePanel();
        updateDetailPanel();
        updateLiveHud();
        updateCanvasAccessibility(true);
    };
    window.toggleDirectorMode = () => {
        S.directorMode = !S.directorMode;
        localStorage.setItem("ai-tycoon-director", String(S.directorMode));
        if (S.directorMode) {
            const agent = getDirectorFocusAgent();
            if (agent) {
                S.selectedPid = agent.pid;
                S.detailPid = agent.pid;
                S.directorFocusPid = agent.pid;
            }
        }
        updatePanel();
        updateDetailPanel();
        updateLiveHud();
        updateCanvasAccessibility(true);
    };
    window.resetCameraView = () => {
        S.directorMode = false;
        S.directorFocusPid = null;
        localStorage.setItem("ai-tycoon-director", "false");
        S.zoomLevel = 1.0;
        S.panX = 0;
        S.panY = 0;
        resize();
        updatePanel();
        updateLiveHud();
        updateCanvasAccessibility(true);
    };

    // Restore saved sort order in dropdown
    const sortEl = document.getElementById("sort-select");
    if (sortEl) sortEl.value = S.sortOrder;
    const searchEl = document.getElementById("agent-search");
    if (searchEl) searchEl.value = S.agentSearchQuery;

    // Small screens should open on the live office first; the panel remains one tap away.
    const panel = document.getElementById("side-panel");
    if (panel && window.innerWidth <= 480) panel.classList.add("panel-hidden");
    syncSidePanelState();
    updateCanvasAccessibility(true);

    // Force immediate palette + repaint (used by theme picker)
    window.aiTycoonForceRepaint = () => {
        try { updatePalette(); } catch (err) { void err; }
        // Render happens on next tick via the existing game loop
    };

    // Apply current language to DOM and refresh on switch
    applyI18nToDom();
    const langLabel = document.getElementById("lang-label");
    if (langLabel) langLabel.textContent = getLang().toUpperCase();
    onLangChange(() => {
        applyI18nToDom();
        if (langLabel) langLabel.textContent = getLang().toUpperCase();
        // Re-render dynamic panels that build HTML strings
        if (typeof window.refreshInsights === "function") window.refreshInsights();
        updatePanel();
    });

    // Delay first resize to let layout settle
    requestAnimationFrame(() => { resize(); connectWS(); loop(); });
}

function resize() {
    const main = document.getElementById("main-content");
    const side = document.getElementById("side-panel");
    // On mobile (<480px) the panel is an overlay, don't subtract its width
    const isMobileOverlay = window.innerWidth <= 480;
    if (isMobileOverlay && side.dataset.userToggled !== "true") {
        side.classList.add("panel-hidden");
    } else if (!isMobileOverlay && side.classList.contains("panel-hidden")) {
        side.classList.remove("panel-hidden");
        delete side.dataset.userToggled;
    }
    syncSidePanelState();
    S.canvasW = isMobileOverlay ? main.clientWidth : main.clientWidth - side.offsetWidth;
    S.canvasH = main.clientHeight;
    S.canvas.width = S.canvasW;
    S.canvas.height = S.canvasH;
    S.ctx.imageSmoothingEnabled = false;
    resizePixiOverlay();

    const sx = S.canvasW / (COLS * TILE);
    const sy = S.canvasH / (ROWS * TILE);
    const baseScale = Math.min(sx, sy);
    S.scale = baseScale * S.zoomLevel;
    recalcOffsets();
}

function recalcOffsets() {
    S.offsetX = getBaseOffsetX() + S.panX;
    S.offsetY = getBaseOffsetY() + S.panY;
}

function getBaseOffsetX() {
    return (S.canvasW - COLS * TILE * S.scale) / 2;
}

function getBaseOffsetY() {
    const extraY = S.canvasH - ROWS * TILE * S.scale;
    const verticalBias = extraY > 160 ? 0.35 : 0.5;
    return Math.max(0, extraY * verticalBias);
}

// ── Game Loop ──
function loop() {
    S.animFrame++;
    if (S.animFrame % 30 === 0) updatePalette(); // check dark mode every ~0.5s
    if (S.animFrame % 120 === 0) updateLiveHud();
    if (S.animFrame % 120 === 0) updateCanvasAccessibility(false);
    // Heartbeat stale detection: if no message in 15s, mark disconnected
    if (S.connected && Date.now() - S.lastHeartbeat > 15000) {
        S.connected = false;
        setConn(false);
        addLog("서버 응답 없음 — 재연결 대기", "system");
    }
    updateVisuals();
    updateDirectorCamera();
    updateParticles();
    render();
    renderPixiOverlay();
    requestAnimationFrame(loop);
}

function activeCanvasAgents() {
    return S.liveAgents.filter(agent => agent.isRunning);
}

function pidEquals(a, b) {
    return a != null && b != null && String(a) === String(b);
}

function agentPriorityContext() {
    return {
        selectedPid: S.selectedPid,
        directorFocusPid: S.directorFocusPid,
        pinnedKeys: Array.isArray(S.pinnedAgentKeys) ? S.pinnedAgentKeys : [],
    };
}

function describeAgent(agent) {
    if (!agent) return "선택된 직원 없음";
    const theme = AGENT_THEMES[S.liveAgents.indexOf(agent) % AGENT_THEMES.length] || AGENT_THEMES[0];
    const status = agent.isRunning ? agent.status : "offline";
    const label = STATUS_META[status]?.label || status;
    const work = getWorkText(agent) || agent.currentWork?.prompt || agent.currentTask?.subject || "대기 중";
    return `${theme.name}, ${agent.projectName || agent.platformName || "Agent"}, ${label}, ${String(work).split("\n")[0].slice(0, 80)}`;
}

function updateCanvasAccessibility(announce = false, message = "") {
    if (!S.canvas) return;
    const active = activeCanvasAgents();
    const working = active.filter(agent => ["coding", "thinking", "searching", "reviewing", "meeting"].includes(agent.status));
    const review = S.liveAgents.filter(agent => agent.needsReview || agent.status === "reviewing");
    const selected = S.liveAgents.find(agent => pidEquals(agent.pid, S.selectedPid || S.directorFocusPid));
    const summary = active.length > 0
        ? `AI Tycoon 실시간 작업실. 활성 ${active.length}명, 작업 ${working.length}명, 검토 ${review.length}명. 현재 ${describeAgent(selected || getDirectorFocusAgent())}.`
        : `AI Tycoon 실시간 작업실. ${S.connected ? "탐지기는 연결됐고 에이전트 활동을 기다리는 중입니다." : "서버 연결 대기 중입니다."}`;

    S.canvas.setAttribute("aria-label", summary);
    const status = document.getElementById("office-a11y-status");
    if (!status) return;
    const text = message || summary;
    if (!announce) {
        const staleConnectionText = status.textContent.includes("서버 연결 대기") && S.connected;
        if (!lastCanvasA11yText || staleConnectionText) {
            status.textContent = summary;
            lastCanvasA11yText = summary;
        }
        return;
    }
    if (announce && text !== lastCanvasA11yText) {
        status.textContent = text;
        lastCanvasA11yText = text;
    }
}

function getDirectorFocusAgent() {
    const priority = { reviewing: 0, coding: 1, searching: 2, thinking: 3, meeting: 4, idle: 5, offline: 6 };
    const agents = S.liveAgents
        .filter(a => a.isRunning)
        .sort((a, b) => {
            const priorityCompare = compareAgentPriority(a, b, agentPriorityContext());
            if (priorityCompare !== 0) return priorityCompare;
            const sa = priority[a.status] ?? 9;
            const sb = priority[b.status] ?? 9;
            if (sa !== sb) return sa - sb;
            return timestampValue(b) - timestampValue(a);
        });
    return agents[0] || null;
}

function timestampValue(agent) {
    const ts = agent.currentWork?.timestamp;
    const numericTs = typeof ts === "string" ? Date.parse(ts) : ts;
    return Number.isFinite(numericTs) ? numericTs : 0;
}

function focusAgent(pid, instant = false) {
    const v = S.visualAgents[pid];
    if (!v) return false;

    const targetPanX = S.canvasW * 0.5 - v.x * S.scale - getBaseOffsetX();
    const targetPanY = S.canvasH * 0.46 - v.y * S.scale - getBaseOffsetY();
    if (instant) {
        S.panX = targetPanX;
        S.panY = targetPanY;
    } else {
        S.panX += (targetPanX - S.panX) * 0.08;
        S.panY += (targetPanY - S.panY) * 0.08;
    }
    recalcOffsets();
    return true;
}

function selectCanvasAgent(agent, options = {}) {
    if (!agent) return;
    const { toggle = false, moveCamera = false, burst = false, announce = true } = options;
    const wasSelected = pidEquals(S.selectedPid, agent.pid);
    if (toggle && wasSelected) {
        S.selectedPid = null;
        S.detailPid = null;
        updatePanel();
        updateDetailPanel();
        updateLiveHud();
        updateCanvasAccessibility(announce, "직원 선택을 해제했습니다.");
        return;
    }

    if (S.directorMode) {
        S.directorMode = false;
        S.directorFocusPid = null;
        localStorage.setItem("ai-tycoon-director", "false");
    }
    S.selectedPid = agent.pid;
    S.detailPid = agent.pid;
    S.directorFocusPid = agent.pid;
    if (moveCamera) focusAgent(agent.pid, true);
    const v = S.visualAgents[agent.pid];
    if (v && burst) {
        const theme = AGENT_THEMES[S.liveAgents.indexOf(agent) % AGENT_THEMES.length] || AGENT_THEMES[0];
        spawnParticles(v.x, v.y - 8, theme.body, 8);
        spawnHearts(v.x, v.y - 16, 2);
    }
    updatePanel();
    updateDetailPanel();
    updateLiveHud();
    updateCanvasAccessibility(announce, `${describeAgent(agent)} 선택됨.`);
}

function cycleCanvasAgent(direction) {
    const agents = activeCanvasAgents();
    if (agents.length === 0) {
        updateCanvasAccessibility(true, "선택 가능한 실행 중 직원이 없습니다.");
        return;
    }
    const currentPid = S.selectedPid || S.directorFocusPid;
    const currentIndex = agents.findIndex(agent => pidEquals(agent.pid, currentPid));
    const nextIndex = currentIndex === -1
        ? (direction > 0 ? 0 : agents.length - 1)
        : (currentIndex + direction + agents.length) % agents.length;
    selectCanvasAgent(agents[nextIndex], { moveCamera: true, announce: true });
}

function updateDirectorCamera() {
    if (!S.directorMode || S.isPanning) return;
    const agent = getDirectorFocusAgent();
    if (!agent) return;
    S.directorFocusPid = agent.pid;
    S.selectedPid = agent.pid;
    focusAgent(agent.pid, false);
}

// ── Visual agent AI ──
function updateVisuals() {
    S.liveAgents.forEach(agent => {
        const v = S.visualAgents[agent.pid];
        if (!v) return;
        v.animTick++;
        const status = agent.isRunning ? agent.status : "offline";

        // Movement
        if (v.moving && v.walkPath.length > 0) {
            const tgt = v.walkPath[v.walkIndex];
            if (tgt) {
                const dx = tgt.x - v.x, dy = tgt.y - v.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 2) {
                    v.x = tgt.x; v.y = tgt.y;
                    v.walkIndex++;
                    if (v.walkIndex >= v.walkPath.length) {
                        v.moving = false; v.walkPath = []; v.walkIndex = 0;
                    }
                } else {
                    const speed = (status === "idle" || status === "offline") ? 0.8 : 1.5;
                    v.x += (dx / dist) * speed;
                    v.y += (dy / dist) * speed;
                    v.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
                }
            }
        }

        if (v.speechTimer > 0) v.speechTimer--;
        // Clear chatPartner when speech ends
        if (v.chatPartner && v.speechTimer <= 0) v.chatPartner = null;

        // Periodic yawn for resting agents (idle or offline) — about every 8-15s per agent
        if ((status === "idle" || status === "offline") && !v.moving) {
            // pid + animTick produces a stable but spread schedule across agents
            const seed = (parseInt(String(agent.pid).replace(/\D/g, "") || "1", 10)) % 173;
            const period = 480 + seed * 3;        // ~8-13 seconds at 60 fps
            if (v.animTick > 60 && (v.animTick % period) === 0) {
                spawnYawn(v.x, v.y - 14);
            }
        }

        // React to status change
        if (status !== v.prevStatus) {
            v.prevStatus = status;
            const lines = SPEECH[status] || SPEECH.idle;
            v.speechText = lines[Math.floor(Math.random() * lines.length)];
            v.speechTimer = 120;
        }

        // Status-aware behavior with contextual speech
        // FIX 2: Skip normal behavior AI when agent is in boss queue
        const inBossQueue = !!bossQueueEntry(agent.pid);
        v.behaviorTimer--;
        if (v.behaviorTimer <= 0 && !inBossQueue) {
            v.behaviorTimer = 180 + Math.floor(Math.random() * 300);
            const r = Math.random();

            if (!agent.isRunning) {
                // Offline: 휴게실에서만 활동
                if (r < 0.25) { goTo(v, "lounge"); }
                else if (r < 0.45) { goTo(v, "coffee"); }
                else if (r < 0.60) { goTo(v, "aquarium"); }
                else if (r < 0.75) { goTo(v, "lounge2"); }
                else { goTo(v, "vending"); }

            } else if (status === "coding") {
                if (r < 0.55) {
                    goTo(v, "desk");
                    // Show current work (from latest prompt) or task as speech
                    const workText = getWorkText(agent);
                    if (workText) {
                        v.speechText = workText;
                        v.speechTimer = 100;
                    }
                } else if (r < 0.70) { goTo(v, "server"); }
                else if (r < 0.85) { goTo(v, "whiteboard"); }
                else { goTo(v, "coffee"); }

            } else if (status === "thinking") {
                if (r < 0.30) { goTo(v, "whiteboard"); }
                else if (r < 0.50) { goTo(v, "bookshelf"); }
                else if (r < 0.70) {
                    // Pace near own desk
                    walkTo(v, v.homeX + (Math.random() - 0.5) * TILE * 2, v.homeY + (Math.random() - 0.5) * TILE);
                    say(v, SPEECH.thinking);
                } else { goTo(v, "desk"); }

            } else if (status === "searching") {
                if (r < 0.35) { goTo(v, "bookshelf"); }
                else if (r < 0.65) { goTo(v, "server"); }
                else if (r < 0.80) { goTo(v, "whiteboard"); }
                else { goTo(v, "desk"); }

            } else if (status === "reviewing") {
                const other = S.liveAgents.find(a => a.pid !== agent.pid && a.isRunning);
                if (other && r < 0.45) {
                    const ov = S.visualAgents[other.pid];
                    if (ov) {
                        walkTo(v, ov.homeX + 12, ov.homeY);
                        const lines = MOVE_SPEECH.peerDesk;
                        v.speechText = lines[Math.floor(Math.random() * lines.length)]
                            .replace("{peer}", ov.theme.name);
                        v.speechTimer = 90;
                    }
                } else if (r < 0.75) { goTo(v, "meeting"); }
                else { goTo(v, "desk"); }

            } else if (status === "meeting") {
                goTo(v, "meeting");

            } else if (status === "coffee") {
                if (r < 0.65) goTo(v, "coffee");
                else goTo(v, "vending");

            } else {
                // idle: 휴게실에서 여유롭게 쉬기
                v.behaviorTimer = 300 + Math.floor(Math.random() * 500); // slower pace
                if (r < 0.30) { goTo(v, "lounge"); }
                else if (r < 0.50) { goTo(v, "coffee"); }
                else if (r < 0.65) { goTo(v, "aquarium"); }
                else if (r < 0.75) { goTo(v, "vending"); }
                else if (r < 0.85) { goTo(v, "lounge2"); }
                else { goTo(v, "desk"); say(v, SPEECH.idle); }
            }
        }

        // ── Boss review queue state machine ──
        const qe = bossQueueEntry(agent.pid);

        // FIX 1: Enqueue only if not already queued AND not on cooldown from recent resolve
        if (agent.needsReview && !qe && !v._reviewCooldown && v.speechTimer <= 0 && !v.moving) {
            bossQueueAdd(agent.pid);
            addLog(`${v.theme.name}(${ROLE_META[agent.role]?.label || "개발자"}) 보고 대기열에 합류`, "system");
        }
        // When needsReview clears, also clear cooldown so future reviews work
        if (!agent.needsReview) v._reviewCooldown = false;

        // Remove from queue if needsReview cleared externally
        if (!agent.needsReview && qe && qe.phase !== "reviewResolved" && qe.phase !== "returningToWork") {
            bossQueueRemove(agent.pid);
        }

        if (qe) {
            const qIdx = S.bossQueue.indexOf(qe);

            switch (qe.phase) {
            case "queuedForBoss":
                // Decide target: active spot if no one there, else waiting spot
                if (!S.bossActivePid) {
                    qe.phase = "walkingToBoss";
                    S.bossActivePid = agent.pid;
                    walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
                } else {
                    // FIX 3: Calculate waiting spot index among waiters (excluding active/resolved/returning)
                    const waiters = S.bossQueue.filter(e =>
                        e.phase === "waitingAtBossArea" || e.phase === "queuedForBoss"
                    );
                    const myIdx = waiters.indexOf(qe);
                    const spotIdx = Math.min(Math.max(0, myIdx), BOSS_WAIT_SPOTS.length - 1);
                    if (!v.moving) walkTo(v, BOSS_WAIT_SPOTS[spotIdx].x, BOSS_WAIT_SPOTS[spotIdx].y);
                    qe.phase = "waitingAtBossArea";
                }
                break;

            case "walkingToBoss":
                if (!v.moving) {
                    // FIX 4: If user already clicked yes/no while walking, resolve immediately on arrival
                    if (qe._pendingResult) {
                        const pendingResult = qe._pendingResult;
                        delete qe._pendingResult;
                        qe.phase = "activeReview";
                        bossQueueResolve(agent.pid, pendingResult);
                    } else {
                        qe.phase = "activeReview";
                        v.speechText = REPORT_SPEECH[Math.floor(Math.random() * REPORT_SPEECH.length)];
                        v.speechTimer = 150;
                    }
                    updateBossQueueUI();
                }
                break;

            case "waitingAtBossArea":
                // Periodic waiting animation
                qe.waitTick++;
                if (qe.waitTick % 120 === 0 && v.speechTimer <= 0) {
                    v.speechText = BOSS_WAIT_SPEECH[Math.floor(Math.random() * BOSS_WAIT_SPEECH.length)];
                    v.speechTimer = 80;
                }
                // Promote to active if boss spot is free
                if (!S.bossActivePid) {
                    qe.phase = "walkingToBoss";
                    S.bossActivePid = agent.pid;
                    walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
                } else {
                    // Reposition to correct waiting spot (handles out-of-order)
                    const myWaitIdx = S.bossQueue.filter(e =>
                        e.phase === "waitingAtBossArea" || e.phase === "queuedForBoss"
                    ).indexOf(qe);
                    const targetSpot = BOSS_WAIT_SPOTS[Math.min(myWaitIdx, BOSS_WAIT_SPOTS.length - 1)];
                    if (targetSpot && !v.moving && Math.hypot(v.x - targetSpot.x, v.y - targetSpot.y) > 8) {
                        walkTo(v, targetSpot.x, targetSpot.y);
                    }
                }
                break;

            case "activeReview":
                // Stay put — waiting for user's yes/no via UI
                // Periodic fidget while waiting
                qe.waitTick++;
                if (qe.waitTick % 180 === 0 && v.speechTimer <= 0) {
                    const fidgets = ["...", "확인 부탁드려요", "(기다리는 중)", "여기 있겠습니다"];
                    v.speechText = fidgets[Math.floor(Math.random() * fidgets.length)];
                    v.speechTimer = 60;
                }
                break;

            case "reviewResolved":
                // Show reaction and start returning
                if (qe.result === "yes") {
                    v.speechText = BOSS_YES_REACTIONS[Math.floor(Math.random() * BOSS_YES_REACTIONS.length)];
                    spawnHearts(v.x, v.y - 16, 3);
                } else {
                    v.speechText = BOSS_NO_REACTIONS[Math.floor(Math.random() * BOSS_NO_REACTIONS.length)];
                }
                v.speechTimer = 100;
                qe.phase = "returningToWork";
                goTo(v, "desk");
                addLog(`${v.theme.name}: ${v.speechText}`, "system");
                updateBossQueueUI();
                break;

            case "returningToWork":
                if (!v.moving && v.speechTimer <= 0) {
                    // FIX 1: Set cooldown to prevent re-enqueue while needsReview still true
                    v._reviewCooldown = true;
                    bossQueueRemove(agent.pid);
                    updateBossQueueUI();
                }
                break;
            }
        }

        // Periodic context-aware solo speech (only if actually working and NOT in boss queue)
        if (v.animTick % 280 === 0 && agent.isRunning && status !== "idle" && !inBossQueue && v.speechTimer <= 0 && Math.random() < 0.35) {
            const workText = getWorkText(agent);
            if (workText && Math.random() < 0.5) {
                v.speechText = workText;
            } else {
                say(v, SPEECH[status] || SPEECH.idle);
            }
            v.speechTimer = 80;
        }
    });

    // Update sub-agents (gentle bobbing only)
    Object.values(S.visualSubAgents).forEach(sub => {
        sub.animTick++;
        if (sub.speechTimer > 0) sub.speechTimer--;
    });

    // Agent-to-agent chat system (more frequent when agents are idle in breakroom)
    S.chatTimer--;
    if (S.chatTimer <= 0 && S.liveAgents.length >= 2) {
        const idleCount = S.liveAgents.filter(a => a.status === "idle" || !a.isRunning).length;
        const interval = idleCount >= 2 ? 150 + Math.floor(Math.random() * 200) : 300 + Math.floor(Math.random() * 300);
        S.chatTimer = interval;
        triggerAgentChat();
    }
}

// ── Agent Chat System (status-pair aware) ──
function triggerAgentChat() {
    const available = S.liveAgents.filter(a => {
        const v = S.visualAgents[a.pid];
        return v && v.speechTimer <= 0 && a.isRunning && a.status !== "idle";
    });
    // Allow casual chat with idle agents only if no working pair exists
    let chatPool = available;
    if (chatPool.length < 2) {
        chatPool = S.liveAgents.filter(a => {
            const v = S.visualAgents[a.pid];
            return v && v.speechTimer <= 0 && a.isRunning;
        });
    }
    if (chatPool.length < 2) return;

    const i1 = Math.floor(Math.random() * chatPool.length);
    let i2 = Math.floor(Math.random() * (chatPool.length - 1));
    if (i2 >= i1) i2++;

    const a1 = chatPool[i1], a2 = chatPool[i2];
    const v1 = S.visualAgents[a1.pid], v2 = S.visualAgents[a2.pid];
    const t1 = v1.theme, t2 = v2.theme;
    const s1 = a1.status, s2 = a2.status;

    // Context
    const proj1 = a1.projectName || "프로젝트";
    const proj2 = a2.projectName || "프로젝트";
    const task1 = (getWorkText(a1) || a1.currentTask?.subject || "").substring(0, 15) || "작업";
    const task2 = (getWorkText(a2) || a2.currentTask?.subject || "").substring(0, 15) || "작업";

    // Pick template set based on role combination first, then status
    const r1 = a1.role || "developer", r2 = a2.role || "developer";
    const working1 = ["coding","thinking","searching","reviewing"].includes(s1);
    const working2 = ["coding","thinking","searching","reviewing"].includes(s2);
    let tpl;

    // 30% chance: role-based cross-check dialogue
    if (working1 && working2 && Math.random() < 0.3) {
        if (r1 === "developer" && r2 === "qa") tpl = ROLE_CHAT.devToQa;
        else if (r1 === "qa" && r2 === "developer") tpl = ROLE_CHAT.qaToDev;
        else if (r1 === "planner" && r2 !== "planner") tpl = ROLE_CHAT.planToDev;
        else if (r1 === "designer" && r2 === "developer") tpl = ROLE_CHAT.designToDev;
        else if (r1 === "developer" && r2 === "reviewer") tpl = ROLE_CHAT.devToReview;
        else if (r1 === "reviewer" && r2 === "developer") tpl = ROLE_CHAT.reviewToDev;
    }

    // Fallback: status-based template
    if (!tpl) {
    if (!working1 && !working2) {
        // 둘 다 쉬는 중 → 휴게실 사담
        tpl = CHAT_TEMPLATES.breakroom;
    } else if (working1 && working2) {
        // 둘 다 일하는 중 → 업무 대화
        if (s1 === "coding" && s2 === "coding") tpl = CHAT_TEMPLATES.bothCoding;
        else if (s1 === "coding" && s2 === "thinking") tpl = CHAT_TEMPLATES.codingThinking;
        else if (s1 === "thinking" && s2 === "coding") tpl = CHAT_TEMPLATES.thinkingCoding;
        else if (s1 === "searching") tpl = CHAT_TEMPLATES.searching;
        else if (s1 === "reviewing" || s2 === "reviewing") tpl = CHAT_TEMPLATES.reviewing;
        else tpl = CHAT_TEMPLATES.bothCoding;
        // 20% 확률로 가벼운 잡담
        if (Math.random() < 0.2) tpl = CHAT_TEMPLATES.casual;
    } else if (s1 === "meeting" || s2 === "meeting") {
        tpl = CHAT_TEMPLATES.meeting;
    } else {
        // 한쪽만 일하는 중 → 가벼운 잡담
        tpl = CHAT_TEMPLATES.casual;
    }
    } // close if (!tpl)

    const pair = tpl[Math.floor(Math.random() * tpl.length)];

    // Fill context
    function fill(s) {
        return s.replace(/\{proj\}/g, proj1).replace(/\{proj2\}/g, proj2)
                .replace(/\{task\}/g, task1).replace(/\{task2\}/g, task2)
                .replace(/\{peer\}/g, t2.name);
    }
    const line1 = fill(pair[0]);
    const line2 = fill(pair[1]);

    v1.speechText = line1.substring(0, 24);
    v1.speechTimer = 160;
    v1.chatPartner = a2.pid;

    // Capture references at call time; re-lookup in callback to avoid stale access
    const pid1 = a1.pid, pid2 = a2.pid;
    const name1 = t1.name, name2 = t2.name;
    const color1 = t1.body, color2 = t2.body;

    setTimeout(() => {
        const fresh2 = S.visualAgents[pid2];
        const fresh1 = S.visualAgents[pid1];
        if (fresh2 && fresh1) {
            fresh2.speechText = line2.substring(0, 24);
            fresh2.speechTimer = 160;
            fresh2.chatPartner = pid1;
            const mx = (fresh1.x + fresh2.x) / 2, my = (fresh1.y + fresh2.y) / 2;
            spawnHearts(mx, my - 10, 2);
        }
    }, 1500);

    addLog(`${name1} → ${name2}: ${line1.substring(0, 35)}`, "chat", color1);
    setTimeout(() => {
        if (S.visualAgents[pid2]) {
            addLog(`${name2} → ${name1}: ${line2.substring(0, 35)}`, "chat", color2);
        }
    }, 1800);
}

function walkTo(v, tx, ty) {
    v.walkPath = [{ x: tx, y: v.y }, { x: tx, y: ty }];
    v.walkIndex = 0;
    v.moving = true;
}

/** Walk to a named POI and say a location-appropriate line */
function goTo(v, dest) {
    if (dest === "desk") {
        walkTo(v, v.homeX, v.homeY);
        say(v, MOVE_SPEECH.desk);
    } else if (POI[dest]) {
        const p = POI[dest];
        walkTo(v, p.x + Math.random() * 8, p.y);
        say(v, MOVE_SPEECH[dest] || SPEECH.idle);
    }
}

/** Pick a random line from an array and set as speech */
function say(v, lines) {
    if (!lines || lines.length === 0) return;
    v.speechText = lines[Math.floor(Math.random() * lines.length)];
    v.speechTimer = 85;
}

// ── Particle Update ──
function updateParticles() {
    for (let i = S.particles.length - 1; i >= 0; i--) {
        const p = S.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
        if (p.life <= 0) S.particles.splice(i, 1);
    }
    for (let i = S.heartParticles.length - 1; i >= 0; i--) {
        const h = S.heartParticles[i];
        h.y += h.vy;
        h.x += Math.sin(h.life * 0.1) * 0.3;
        h.life--;
        if (h.life <= 0) S.heartParticles.splice(i, 1);
    }
}

// ── Input Handlers ──
function onCanvasClick(e) {
    if (S.isPanning) return;
    if (e.button && e.button !== 0) return; // only left click

    const rect = S.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - S.offsetX) / S.scale;
    const my = (e.clientY - rect.top - S.offsetY) / S.scale;

    let clicked = null;
    S.liveAgents.forEach(a => {
        const v = S.visualAgents[a.pid];
        if (!v) return;
        if (Math.abs(mx - v.x) < 10 && Math.abs(my - v.y) < 14) clicked = a;
    });

    if (clicked) {
        selectCanvasAgent(clicked, { toggle: true, burst: true, announce: true });
        return;
    } else {
        S.selectedPid = null;
        S.detailPid = null;
    }
    updatePanel();
    updateDetailPanel();
    updateLiveHud();
    updateCanvasAccessibility(true, "직원 선택을 해제했습니다.");
}

function onCanvasKeyDown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key;
    if (key === "ArrowRight" || key === "ArrowDown") {
        e.preventDefault();
        cycleCanvasAgent(1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
        e.preventDefault();
        cycleCanvasAgent(-1);
    } else if (key === "Enter" || key === " ") {
        e.preventDefault();
        const agent = S.liveAgents.find(item => pidEquals(item.pid, S.selectedPid)) || getDirectorFocusAgent();
        selectCanvasAgent(agent, { moveCamera: true, announce: true });
    } else if (key === "Home" || key === "0") {
        e.preventDefault();
        window.resetCameraView?.();
    } else if (key === "+" || key === "=") {
        e.preventDefault();
        S.zoomLevel = Math.min(ZOOM_MAX, S.zoomLevel + ZOOM_STEP);
        resize();
        updateCanvasAccessibility(true, `작업실 확대 ${Math.round(S.zoomLevel * 100)}%.`);
    } else if (key === "-" || key === "_") {
        e.preventDefault();
        S.zoomLevel = Math.max(ZOOM_MIN, S.zoomLevel - ZOOM_STEP);
        resize();
        updateCanvasAccessibility(true, `작업실 축소 ${Math.round(S.zoomLevel * 100)}%.`);
    } else if (key === "Escape") {
        if (!S.selectedPid && !S.detailPid) return;
        e.preventDefault();
        S.selectedPid = null;
        S.detailPid = null;
        S.directorFocusPid = null;
        updatePanel();
        updateDetailPanel();
        updateLiveHud();
        updateCanvasAccessibility(true, "직원 선택을 해제했습니다.");
    }
}

// ── Zoom ──
function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const oldZoom = S.zoomLevel;
    S.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.zoomLevel + delta));
    if (S.zoomLevel !== oldZoom) {
        // Zoom toward mouse position
        const rect = S.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const zr = S.zoomLevel / oldZoom;
        S.panX = mx - zr * (mx - S.panX);
        S.panY = my - zr * (my - S.panY);
        resize();
    }
}

// ── Pan (right-drag or middle-drag) ──
function onPanStart(e) {
    if (e.button === 2 || e.button === 1) {
        if (S.directorMode) {
            S.directorMode = false;
            S.directorFocusPid = null;
            localStorage.setItem("ai-tycoon-director", "false");
            updatePanel();
        }
        S.isPanning = true;
        S.panStartX = e.clientX - S.panX;
        S.panStartY = e.clientY - S.panY;
        S.canvas.style.cursor = "grabbing";
    }
}
function onPanMove(e) {
    if (!S.isPanning) return;
    S.panX = e.clientX - S.panStartX;
    S.panY = e.clientY - S.panStartY;
    resize();
}
function onPanEnd() {
    if (S.isPanning) {
        S.isPanning = false;
        S.canvas.style.cursor = "default";
    }
}

// ── Touch Handlers (tap, one-finger pan, two-finger pinch zoom) ──
let touchState = {
    startX: 0, startY: 0,        // first finger start position
    startTime: 0,
    moved: false,                 // did finger move significantly?
    panning: false,               // one-finger pan active?
    pinching: false,              // two-finger pinch active?
    pinchDist0: 0,               // initial pinch distance
    pinchZoom0: 0,               // zoom level at pinch start
    pinchCX: 0, pinchCY: 0,     // pinch center
};

function touchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function onTouchStart(e) {
    e.preventDefault();
    const ts = e.touches;

    if (ts.length === 1) {
        // Single finger: might be tap or pan
        touchState.startX = ts[0].clientX;
        touchState.startY = ts[0].clientY;
        touchState.startTime = Date.now();
        touchState.moved = false;
        touchState.panning = false;
        touchState.pinching = false;
    } else if (ts.length === 2) {
        // Two fingers: pinch zoom start
        touchState.panning = false;
        touchState.pinching = true;
        touchState.pinchDist0 = touchDist(ts[0], ts[1]);
        touchState.pinchZoom0 = S.zoomLevel;
        touchState.pinchCX = (ts[0].clientX + ts[1].clientX) / 2;
        touchState.pinchCY = (ts[0].clientY + ts[1].clientY) / 2;
    }
}

function onTouchMove(e) {
    e.preventDefault();
    const ts = e.touches;

    if (ts.length === 2 && touchState.pinching) {
        // Pinch zoom
        const dist = touchDist(ts[0], ts[1]);
        const ratio = dist / touchState.pinchDist0;
        const oldZoom = S.zoomLevel;
        S.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchState.pinchZoom0 * ratio));

        if (S.zoomLevel !== oldZoom) {
            // Zoom toward pinch center
            const rect = S.canvas.getBoundingClientRect();
            const cx = touchState.pinchCX - rect.left;
            const cy = touchState.pinchCY - rect.top;
            const zr = S.zoomLevel / oldZoom;
            S.panX = cx - zr * (cx - S.panX);
            S.panY = cy - zr * (cy - S.panY);
            resize();
        }
    } else if (ts.length === 1 && !touchState.pinching) {
        const dx = ts[0].clientX - touchState.startX;
        const dy = ts[0].clientY - touchState.startY;

        // Start panning after 8px movement threshold
        if (!touchState.panning && Math.hypot(dx, dy) > 8) {
            if (S.directorMode) {
                S.directorMode = false;
                S.directorFocusPid = null;
                localStorage.setItem("ai-tycoon-director", "false");
                updatePanel();
            }
            touchState.panning = true;
            touchState.moved = true;
            // Record pan offset at start of gesture
            touchState.panStartX = S.panX;
            touchState.panStartY = S.panY;
        }

        if (touchState.panning) {
            S.panX = touchState.panStartX + dx;
            S.panY = touchState.panStartY + dy;
            resize();
        }
    }
}

function onTouchEnd(e) {
    // If single finger didn't move much and was quick → treat as tap (click)
    if (!touchState.moved && !touchState.pinching && Date.now() - touchState.startTime < 300) {
        onCanvasClick({ clientX: touchState.startX, clientY: touchState.startY });
    }
    touchState.panning = false;
    touchState.pinching = false;
    touchState.moved = false;
}

window.addEventListener("DOMContentLoaded", init);
