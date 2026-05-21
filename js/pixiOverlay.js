// ============================================================
//  AI TYCOON — PixiJS WebGL overlay (cute live-work effects)
// ============================================================

import { S, getWorkText } from "./state.js";
import {
    TILE, COLS, ROWS,
    OFFICE_MAP, POI,
    AGENT_THEMES, PLATFORM_META, STATUS_META,
} from "./constants.js";
import { agentNextAction, compareAgentPriority } from "./agentPriority.js";
import { ambientTint, getSkyPalette } from "./timeOfDay.js";

let app = null;
let world = null;
let ambient = null;
let interiorFX = null;
let projectFX = null;
let floorFX = null;
let actionFX = null;
let flowFX = null;
let burstFX = null;
let agentFX = null;
let labelFX = null;
let ambientTintFX = null;
let weatherFX = null;
let ready = false;
let failed = false;
let resizeObserver = null;
let lastProjectAuraCount = 0;
let lastFlowLinkCount = 0;
let lastWorkCardCount = 0;
let lastTaskConstellationCount = 0;
let lastFreshnessRingCount = 0;
let lastActionSpotlightCount = 0;
let lastInteriorDetailCount = 0;
let lastScenePropCount = 0;
let lastAgentLifeEffectCount = 0;
const sprites = new Map();
const ambientDots = [];
const eventBursts = new Map();
const consumedWorkEvents = new Map();
const IMPORTANT_STATUSES = new Set(["coding", "thinking", "searching", "reviewing"]);
const FLOW_STATUSES = new Set(["coding", "thinking", "searching", "reviewing", "meeting"]);
const BURST_TYPES = new Set(["review", "task-done", "work", "join", "leave"]);
const WORK_CARD_EVENT_TYPES = new Set(["review", "task-start", "task-done", "work"]);
const MAX_ACTIVE_BURSTS = 8;
const MAX_BURSTS_PER_AGENT = 2;
const BURST_COOLDOWN_MS = 3400;
const MAX_FLOW_LINKS = 2;
const MAX_PROJECT_AURAS = 2;
const MAX_WORK_CARDS = 2;
const MAX_TASK_NODES = 5;
const MAX_TASK_CONSTELLATIONS = 3;
const MAX_FRESHNESS_RINGS = 3;
const MAX_ACTION_SPOTLIGHTS = 2;
const MAX_INTERIOR_DETAILS = 18;
const MAX_SCENE_PROPS = 8;
const MAX_AGENT_LIFE_EFFECTS = 3;
const FRESH_ACTIVITY_MS = 6000;
const SOFT_ACTIVITY_MS = 30000;
const WORK_CARD_FRESH_MS = 10000;
const HIGH_LOAD_FLOW_THRESHOLD = 12;
const ACTION_SPOTLIGHT_COLORS = {
    review: 0xff8a4c,
    focus: 0x2f80ed,
    stale: 0xfacc15,
    pinned: 0xfacc15,
    working: 0x10b981,
    recent: 0x94a3b8,
    idle: 0x98a2b3,
    offline: 0x667085,
};
const DENSITY_PROFILES = {
    rich: {
        interiorDetails: MAX_INTERIOR_DETAILS,
        agentLifeEffects: MAX_AGENT_LIFE_EFFECTS,
        projectAuras: MAX_PROJECT_AURAS,
        actionSpotlights: MAX_ACTION_SPOTLIGHTS,
        flowLinks: MAX_FLOW_LINKS,
        workCards: MAX_WORK_CARDS,
        taskConstellations: MAX_TASK_CONSTELLATIONS,
        freshnessRings: MAX_FRESHNESS_RINGS,
        sceneProps: MAX_SCENE_PROPS,
        focusOnly: false,
        motion: 0.62,
    },
    balanced: {
        interiorDetails: 10,
        agentLifeEffects: 1,
        projectAuras: 1,
        actionSpotlights: 1,
        flowLinks: 1,
        workCards: 1,
        taskConstellations: 1,
        freshnessRings: 1,
        sceneProps: 4,
        focusOnly: false,
        motion: 0.42,
    },
    focus: {
        interiorDetails: 4,
        agentLifeEffects: 0,
        projectAuras: 1,
        actionSpotlights: 1,
        flowLinks: 0,
        workCards: 1,
        taskConstellations: 0,
        freshnessRings: 0,
        sceneProps: 1,
        focusOnly: true,
        motion: 0.28,
    },
    minimal: {
        interiorDetails: 0,
        agentLifeEffects: 0,
        projectAuras: 0,
        actionSpotlights: 0,
        flowLinks: 0,
        workCards: 1,
        taskConstellations: 0,
        freshnessRings: 0,
        sceneProps: 0,
        focusOnly: true,
        motion: 0.05,
    },
};

export async function initPixiOverlay() {
    if (ready || failed) return;
    const host = document.getElementById("pixi-layer");
    const PIXI = window.PIXI;
    if (!host || !PIXI) {
        failed = true;
        return;
    }

    try {
        app = new PIXI.Application();
        const initialWidth = Math.max(1, host.clientWidth || window.innerWidth || 1);
        const initialHeight = Math.max(1, host.clientHeight || window.innerHeight || 1);
        if (typeof app.init === "function") {
            await app.init({
                width: initialWidth,
                height: initialHeight,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
                preference: "webgl",
            });
        } else {
            app = new PIXI.Application({
                width: initialWidth,
                height: initialHeight,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                resolution: Math.min(window.devicePixelRatio || 1, 2),
            });
        }
        host.innerHTML = "";
        host.appendChild(app.canvas || app.view);

        world = new PIXI.Container();
        ambient = new PIXI.Container();
        interiorFX = new PIXI.Graphics();
        projectFX = new PIXI.Graphics();
        floorFX = new PIXI.Graphics();
        actionFX = new PIXI.Graphics();
        flowFX = new PIXI.Graphics();
        burstFX = new PIXI.Container();
        agentFX = new PIXI.Container();
        labelFX = new PIXI.Container();
        world.addChild(ambient, interiorFX, projectFX, floorFX, actionFX, flowFX, burstFX, agentFX, labelFX);
        app.stage.addChild(world);

        // Time-of-day mood layers (screen-space, sit above the world)
        ambientTintFX = new PIXI.Graphics();
        weatherFX = new PIXI.Container();
        app.stage.addChild(ambientTintFX, weatherFX);

        for (let i = 0; i < 26; i++) {
            ambientDots.push({
                x: Math.random() * COLS * TILE,
                y: Math.random() * ROWS * TILE,
                r: 0.55 + Math.random() * 1.15,
                phase: Math.random() * Math.PI * 2,
                color: [0x10b981, 0x2f80ed, 0xff6b4a, 0xfacc15][i % 4],
            });
        }

        ready = true;
        if ("ResizeObserver" in window) {
            resizeObserver?.disconnect?.();
            resizeObserver = new ResizeObserver(resizePixiOverlay);
            resizeObserver.observe(host);
        }
        requestAnimationFrame(resizePixiOverlay);
        window.setTimeout(resizePixiOverlay, 240);
        window.setTimeout(resizePixiOverlay, 720);
    } catch (err) {
        console.warn("[AI Tycoon] Pixi overlay disabled:", err);
        failed = true;
    }
}

export function resizePixiOverlay() {
    if (!ready || !app?.renderer) return;
    const host = document.getElementById("pixi-layer");
    if (!host) return;
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    if (typeof app.resize === "function") app.resize();
    app.renderer.resize(width, height);
    const view = app.canvas || app.view;
    if (view?.style) {
        view.style.width = `${width}px`;
        view.style.height = `${height}px`;
    }
}

export function renderPixiOverlay() {
    if (!ready || !world) return;

    world.position.set(S.offsetX, S.offsetY);
    world.scale.set(S.scale);
    drawAmbient();
    drawInteriorDetails();
    drawProjectAuras();
    drawFloorHighlights();
    drawActionSpotlights();
    drawCollaborationFlows();
    syncWorkEventBursts();
    syncAgentSprites();
    drawAgentLabels();
    drawAmbientTint();
    drawWeather();
}

/** Return the live Pixi <canvas> element so it can be composited into a snapshot. */
export function getPixiCanvas() {
    if (!ready || !app) return null;
    return app.canvas || app.view || null;
}

export function getPixiOverlayDebug() {
    return {
        ready,
        activeBursts: eventBursts.size,
        activeBurstTypes: [...eventBursts.values()].map(burst => burst.type),
        consumedEvents: consumedWorkEvents.size,
        projectAuras: lastProjectAuraCount,
        flowLinks: lastFlowLinkCount,
        workCards: lastWorkCardCount,
        taskConstellations: lastTaskConstellationCount,
        freshnessRings: lastFreshnessRingCount,
        actionSpotlights: lastActionSpotlightCount,
        interiorDetails: lastInteriorDetailCount,
        sceneProps: lastScenePropCount,
        agentLifeEffects: lastAgentLifeEffectCount,
        density: effectivePixiDensity(),
        densitySetting: S.pixiDensity,
        reducedMotion: prefersReducedMotion(),
        spriteCount: sprites.size,
    };
}

function drawAmbient() {
    const g = ensureAmbientGraphics();
    clearGraphic(g);
    const t = S.animFrame;
    const calm = motionFactor();
    ambientDots.forEach((dot, i) => {
        const bob = Math.sin(t * 0.006 + dot.phase) * 1.1 * calm;
        const alpha = (0.024 + (Math.sin(t * 0.012 + i) + 1) * 0.008) * calm;
        fillCircle(g, dot.x, dot.y + bob, dot.r, dot.color, alpha);
    });
}

// ── Time-of-day mood overlay (screen-space, sits above the scene) ──
function drawAmbientTint() {
    if (!ambientTintFX) return;
    clearGraphic(ambientTintFX);
    const tint = ambientTint();
    if (tint.alpha <= 0.005) return;
    const w = app?.screen?.width || S.canvasW || 0;
    const h = app?.screen?.height || S.canvasH || 0;
    if (w <= 0 || h <= 0) return;
    if (typeof ambientTintFX.rect === "function") {
        ambientTintFX.rect(0, 0, w, h).fill({ color: tint.color, alpha: tint.alpha });
    } else {
        ambientTintFX.beginFill(tint.color, tint.alpha);
        ambientTintFX.drawRect(0, 0, w, h);
        ambientTintFX.endFill();
    }
    // Soft vignette darkening at deep night for depth
    const sky = getSkyPalette();
    if (sky.starDensity > 0.4) {
        const vignetteAlpha = Math.min(0.22, sky.starDensity * 0.20);
        const corner = Math.min(w, h) * 0.45;
        if (typeof ambientTintFX.rect === "function") {
            ambientTintFX.rect(0, 0, w, corner).fill({ color: 0x0a0e1c, alpha: vignetteAlpha * 0.5 });
            ambientTintFX.rect(0, h - corner, w, corner).fill({ color: 0x0a0e1c, alpha: vignetteAlpha * 0.6 });
        } else {
            ambientTintFX.beginFill(0x0a0e1c, vignetteAlpha * 0.5);
            ambientTintFX.drawRect(0, 0, w, corner);
            ambientTintFX.endFill();
            ambientTintFX.beginFill(0x0a0e1c, vignetteAlpha * 0.6);
            ambientTintFX.drawRect(0, h - corner, w, corner);
            ambientTintFX.endFill();
        }
    }
}

// ── Weather: occasional rain streaks across the screen (placeholder for now) ──
const _weatherState = { kind: "clear", until: 0, drops: [] };
function pickWeather(now) {
    // 8% chance per hour that weather is "rain"
    const hourSeed = Math.floor(now / 3_600_000);
    const rng = ((hourSeed * 2654435761) >>> 0) / 4294967295;
    if (rng < 0.08) {
        return { kind: "rain", until: now + 6 * 60 * 1000 + rng * 4 * 60 * 1000 };
    }
    return { kind: "clear", until: now + 8 * 60 * 1000 };
}
// GPU 메모리 누수 방지용 — drawWeather 가 매 프레임 새 Graphics 만들고 removeChildren() 만 해서
// PixiJS v8 환경에서 GPU 버퍼가 해제 안 되던 문제 (비 내릴 때 누적). 단일 Graphics 재사용 + clear().
let _weatherGfx = null;
function drawWeather() {
    if (!weatherFX) return;
    const now = Date.now();
    if (now >= _weatherState.until) {
        Object.assign(_weatherState, pickWeather(now), { drops: [] });
    }
    const PIXI = window.PIXI;
    if (!PIXI) return;
    // 단일 persistent Graphics — 매 프레임 clear() 후 다시 그리기. 새 객체 안 만듦.
    if (!_weatherGfx) {
        _weatherGfx = new PIXI.Graphics();
        weatherFX.addChild(_weatherGfx);
    }
    if (typeof _weatherGfx.clear === "function") _weatherGfx.clear();
    if (_weatherState.kind !== "rain") return;
    const w = app?.screen?.width || S.canvasW || 0;
    const h = app?.screen?.height || S.canvasH || 0;
    if (w <= 0 || h <= 0) return;
    if (_weatherState.drops.length === 0) {
        const count = Math.min(60, Math.round((w * h) / 18000));
        for (let i = 0; i < count; i++) {
            _weatherState.drops.push({
                x: Math.random() * w,
                y: Math.random() * h,
                speed: 5 + Math.random() * 4,
                len: 8 + Math.random() * 6,
                alpha: 0.15 + Math.random() * 0.18,
            });
        }
    }
    const g = _weatherGfx;
    const motion = motionFactor() * 1.6 + 0.4;
    _weatherState.drops.forEach(d => {
        d.y += d.speed * motion;
        d.x += d.speed * 0.4 * motion;
        if (d.y > h + 12) { d.y = -10; d.x = Math.random() * w; }
        if (d.x > w + 12) d.x -= w + 24;
        if (typeof g.moveTo === "function" && typeof g.lineTo === "function") {
            g.moveTo(d.x, d.y);
            g.lineTo(d.x - d.len * 0.4, d.y + d.len);
            if (typeof g.stroke === "function") {
                g.stroke({ color: 0xb0d8ff, alpha: d.alpha, width: 1 });
            } else {
                g.lineStyle(1, 0xb0d8ff, d.alpha);
            }
        }
    });
}

function activeAgentCount() {
    return S.liveAgents.reduce((count, agent) => count + (agent.isRunning ? 1 : 0), 0);
}

function effectivePixiDensity(activeCount = activeAgentCount()) {
    if (prefersReducedMotion()) return "minimal";
    if (DENSITY_PROFILES[S.pixiDensity]) return S.pixiDensity;
    return S.canvasW < 640 || activeCount > HIGH_LOAD_FLOW_THRESHOLD ? "focus" : "balanced";
}

function densityProfile(activeCount = activeAgentCount()) {
    const mode = effectivePixiDensity(activeCount);
    return { mode, ...DENSITY_PROFILES[mode] };
}

function motionFactor(activeCount = activeAgentCount()) {
    if (prefersReducedMotion()) return DENSITY_PROFILES.minimal.motion;
    return densityProfile(activeCount).motion ?? 0.42;
}

function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function samePid(a, b) {
    return a != null && b != null && String(a) === String(b);
}

function pinnedKeys() {
    return Array.isArray(S.pinnedAgentKeys) ? S.pinnedAgentKeys : [];
}

function agentPinKey(agent) {
    if (!agent || typeof agent !== "object") return String(agent);
    const stablePart = agent.sessionId
        || agent.threadId
        || agent.cwd
        || agent.projectName
        || agent.pid;
    return [agent.platform || "agent", stablePart].filter(Boolean).map(String).join(":");
}

function isAgentPinned(agent) {
    if (!agent) return false;
    const keys = pinnedKeys();
    return keys.includes(agentPinKey(agent)) || keys.includes(String(agent.pid));
}

function isSignalStale(agent) {
    if (!agent?.isRunning) return false;
    const ts = timestampToMs(agent.signals?.lastActivityAt)
        || timestampToMs(agent.signals?.lastSeenAt)
        || timestampToMs(agent.currentWork?.timestamp);
    return ts > 0 && Date.now() - ts > 15 * 60 * 1000;
}

function isVisualPriorityAgent(agent) {
    return samePid(S.directorFocusPid, agent.pid)
        || samePid(S.selectedPid, agent.pid)
        || isAgentPinned(agent)
        || isSignalStale(agent)
        || agent.needsReview
        || agent.status === "reviewing";
}

function drawInteriorDetails() {
    clearGraphic(interiorFX);
    lastInteriorDetailCount = 0;
    lastScenePropCount = 0;
    if (!interiorFX) return;

    const activeCount = activeAgentCount();
    const profile = densityProfile(activeCount);
    const mobile = S.canvasW < 640;
    const budget = Math.min(profile.interiorDetails ?? MAX_INTERIOR_DETAILS, mobile ? 4 : MAX_INTERIOR_DETAILS);
    const sceneBudget = Math.min(profile.sceneProps ?? 0, mobile ? 1 : MAX_SCENE_PROPS);
    const dark = isPixiDarkMode();
    const calm = profile.motion ?? 0.42;
    const t = S.animFrame * calm;
    let count = 0;

    count += drawWindowLight(interiorFX, t, dark, budget - count);
    count += drawCoffeeSteam(interiorFX, t, dark, budget - count);
    count += drawAquariumBubbles(interiorFX, t, dark, budget - count);
    count += drawServerLights(interiorFX, t, dark, budget - count);
    count += drawDeskMoodLights(interiorFX, t, dark, activeCount, budget - count);
    count += drawPlantAccents(interiorFX, t, dark, budget - count);
    lastScenePropCount = drawSceneProps(interiorFX, t, dark, sceneBudget);
    lastInteriorDetailCount = count;
}

function drawWindowLight(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const color = dark ? 0x60a5fa : 0xfff0b8;
    const alpha = dark ? 0.028 : 0.045;
    const shift = Math.sin(t * 0.004) * 2.4;
    const patches = S.canvasW < 640
        ? [{ x1: 19.6 * TILE + shift, y1: 0.8 * TILE, x2: 16.6 * TILE, y2: 7.2 * TILE, ex: 18.2 * TILE, ey: 7.3 * TILE, rx: 78, ry: 18 }]
        : [
            { x1: 9.2 * TILE + shift, y1: 0.8 * TILE, x2: 6.8 * TILE, y2: 8.2 * TILE, ex: 7.7 * TILE, ey: 8.6 * TILE, rx: 84, ry: 19 },
            { x1: 19.6 * TILE + shift, y1: 0.8 * TILE, x2: 17.5 * TILE, y2: 9.4 * TILE, ex: 18.8 * TILE, ey: 9.5 * TILE, rx: 96, ry: 20 },
        ];
    let count = 0;
    patches.slice(0, budget).forEach((patch, i) => {
        drawLine(g, patch.x1, patch.y1, patch.x2, patch.y2, color, alpha, 3);
        drawLine(g, patch.x1 + 13, patch.y1, patch.x2 + 18, patch.y2, color, alpha * 0.42, 1.6);
        fillEllipse(g, patch.ex, patch.ey + Math.sin(t * 0.006 + i) * 0.65, patch.rx, patch.ry, color, alpha * 0.2);
        count++;
    });
    return count;
}

function drawCoffeeSteam(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.coffee.x + 1;
    const y = POI.coffee.y + 2;
    const steam = dark ? 0xdbeafe : 0xffffff;
    const warmth = dark ? 0xfbbf24 : 0xd97706;
    const limit = Math.min(budget, S.canvasW < 640 ? 1 : 2);
    let count = 0;

    fillRoundRect(g, x - 19, y + 15, 38, 8, 4, warmth, dark ? 0.045 : 0.035);
    count++;
    for (let i = 0; i < limit - 1; i++) {
        const phase = (t * 0.02 + i * 0.9) % 1;
        const sx = x - 8 + i * 8 + Math.sin(t * 0.012 + i) * 0.7;
        const sy = y + 3 - phase * 16;
        const alpha = (0.18 - phase * 0.1) * (dark ? 0.7 : 1);
        drawArc(g, sx, sy, 3.2 + i * 0.45, Math.PI * 0.18, Math.PI * 1.12, steam, alpha, 0.5, 7);
        fillCircle(g, sx + 3.2, sy - 2.8, 0.8, steam, alpha * 0.85);
        count++;
    }
    return count;
}

function drawAquariumBubbles(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.aquarium.x;
    const y = POI.aquarium.y + 1;
    const water = dark ? 0x38bdf8 : 0x0ea5e9;
    const bubble = dark ? 0xe0f2fe : 0xffffff;
    const limit = Math.min(budget, S.canvasW < 640 ? 1 : 3);
    let count = 0;

    fillRoundRect(g, x - 31, y - 18, 62, 28, 5, water, dark ? 0.04 : 0.035);
    drawLine(g, x - 24, y - 9 + Math.sin(t * 0.012) * 0.6, x + 24, y - 9, bubble, 0.08, 0.52);
    count++;
    for (let i = 0; i < limit - 1; i++) {
        const phase = (t * 0.009 + i * 0.19) % 1;
        const bx = x - 19 + i * 8 + Math.sin(t * 0.012 + i) * 1.1;
        const by = y + 7 - phase * 24;
        const radius = 1.05 + (i % 3) * 0.42;
        strokeCircle(g, bx, by, radius, bubble, 0.18 - phase * 0.08, 0.45);
        fillCircle(g, bx + radius * 0.35, by - radius * 0.35, 0.34, bubble, 0.16);
        count++;
    }
    return count;
}

function drawServerLights(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const activeCount = activeAgentCount();
    const x = POI.server.x;
    const y = POI.server.y;
    const color = activeCount > 0 ? 0x10b981 : 0x94a3b8;
    const body = dark ? 0x111827 : 0xffffff;
    const scan = (t * 0.055) % 22;

    fillRoundRect(g, x - 37, y - 17, 74, 31, 5, body, dark ? 0.03 : 0.035);
    drawLine(g, x - 29 + scan, y - 13, x - 29 + scan, y + 10, color, 0.07, 0.8);
    for (let i = 0; i < 5; i++) {
        const lit = i < Math.min(5, Math.max(1, Math.ceil(activeCount / 2)));
        const pulse = 0.5 + Math.sin(t * 0.035 + i) * 0.5;
        fillCircle(g, x - 22 + i * 11, y + 9, 1.15 + pulse * 0.12, lit ? color : 0x98a2b3, lit ? 0.24 : 0.1);
    }
    return 1;
}

function drawDeskMoodLights(g, t, dark, activeCount, budget) {
    if (budget <= 0) return 0;
    const mobile = S.canvasW < 640;
    const limit = Math.min(budget, mobile ? 1 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? 1 : 2);
    const context = priorityContext();
    const now = Date.now();
    const candidates = S.liveAgents
        .map((agent, idx) => ({
            agent,
            idx,
            v: S.visualAgents[agent.pid],
            action: agentNextAction(agent, context, now),
        }))
        .filter(({ agent, v }) => v && agent.isRunning)
        .sort((a, b) => compareAgentPriority(a.agent, b.agent, context, now) || a.idx - b.idx)
        .slice(0, limit);
    let count = 0;

    candidates.forEach(({ agent, v, action }, i) => {
        const color = actionSpotlightColor(agent, action);
        const pulse = 0.5 + Math.sin(t * 0.025 + i * 0.7) * 0.5;
        const y = v.y - 19;
        const alpha = (dark ? 0.036 : 0.032) + Math.max(0, 3 - action.rank) * 0.006;
        fillRoundRect(g, v.x - 15, y - 4, 30, 8, 3, color, alpha + pulse * 0.006);
        fillRoundRect(g, v.x - 10, y - 1, 5 + pulse * 4, 1.2, 0.6, color, 0.13);
        fillCircle(g, v.x + 12, y + 1, 1 + pulse * 0.15, color, 0.16);
        count++;
    });
    return count;
}

function drawPlantAccents(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const plants = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (OFFICE_MAP[y]?.[x] === "P") plants.push({ x, y });
        }
    }

    const limit = Math.min(budget, S.canvasW < 640 ? 1 : 3, plants.length);
    const leaf = dark ? 0x34d399 : 0x10b981;
    const bloom = dark ? 0xf9a8d4 : 0xec4899;
    for (let i = 0; i < limit; i++) {
        const spot = plants[(i * 3) % plants.length];
        const cx = spot.x * TILE + TILE / 2;
        const cy = spot.y * TILE + 13;
        const sway = Math.sin(t * 0.012 + i) * 0.8;
        strokeEllipse(g, cx - 4 + sway, cy - 6, 3.8, 7.2, leaf, 0.11, 0.55);
        strokeEllipse(g, cx + 4 + sway, cy - 7, 3.8, 7.2, leaf, 0.1, 0.55);
        fillCircle(g, cx + sway, cy - 13 + Math.sin(t * 0.018 + i) * 0.35, 1, bloom, 0.22);
        fillCircle(g, cx + 6 + sway * 0.4, cy - 11, 0.65, 0xfacc15, 0.18);
    }
    return limit;
}

function drawSceneProps(g, t, dark, budget) {
    if (budget <= 0) return 0;
    let count = 0;
    count += drawLaunchBoardAccents(g, t, dark, budget - count);
    count += drawDeskVignettes(g, t, dark, budget - count);
    count += drawBossDeskBadge(g, t, dark, budget - count);
    count += drawMeetingNotes(g, t, dark, budget - count);
    count += drawLoungeLampGlow(g, t, dark, budget - count);
    count += drawBookshelfGlints(g, t, dark, budget - count);
    count += drawVendingPanelGlow(g, t, dark, budget - count);
    count += drawAquariumFish(g, t, dark, budget - count);
    return count;
}

function drawLaunchBoardAccents(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.whiteboard.x + 13;
    const y = POI.whiteboard.y + 1;
    const boardGlow = dark ? 0x93c5fd : 0x2f80ed;
    const sticky = dark ? 0xfde68a : 0xffd166;
    const mint = dark ? 0x86efac : 0x10b981;
    const coral = dark ? 0xfda4af : 0xff6b4a;
    const pulse = 0.5 + Math.sin(t * 0.009) * 0.5;
    const count = Math.min(budget, 2);

    fillRoundRect(g, x - 24, y - 12, 49, 23, 4, boardGlow, dark ? 0.028 : 0.025);
    strokeRoundRect(g, x - 24, y - 12, 49, 23, 4, boardGlow, 0.07 + pulse * 0.008, 0.52);
    for (let i = 0; i < 3; i++) {
        const nx = x - 18 + i * 13;
        const color = i === 0 ? sticky : i === 1 ? mint : coral;
        fillRoundRect(g, nx, y - 7 + (i % 2), 8, 6, 1.4, color, 0.13);
        fillCircle(g, nx + 2, y + 4, 1.15, mint, 0.16);
        drawLine(g, nx + 4, y + 4, nx + 8, y, mint, 0.16, 0.55);
    }
    if (count > 1) {
        drawLine(g, x - 16, y + 8, x + 17, y + 8, boardGlow, 0.07, 0.55);
        fillCircle(g, x + 20, y - 8 + Math.sin(t * 0.012) * 0.45, 1.2, sticky, 0.16);
    }
    return count;
}

function drawDeskVignettes(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const activeCount = activeAgentCount();
    const mobile = S.canvasW < 640;
    const limit = Math.min(budget, mobile ? 1 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? 1 : 2);
    const context = priorityContext();
    const now = Date.now();
    const paper = dark ? 0xe5e7eb : 0xffffff;
    const keyboard = dark ? 0x94a3b8 : 0x475467;
    const candidates = S.liveAgents
        .map((agent, idx) => ({
            agent,
            idx,
            v: S.visualAgents[agent.pid],
            action: agentNextAction(agent, context, now),
        }))
        .filter(({ agent, v }) => v && agent.isRunning && (isVisualPriorityAgent(agent) || !mobile))
        .sort((a, b) => compareAgentPriority(a.agent, b.agent, context, now) || a.idx - b.idx)
        .slice(0, limit);

    candidates.forEach(({ agent, v, action }, i) => {
        const color = actionSpotlightColor(agent, action);
        const x = v.homeX || v.x;
        const y = (v.homeY || v.y) + 11;
        const lean = i % 2 === 0 ? -1 : 1;
        const pulse = 0.5 + Math.sin(t * 0.012 + i) * 0.5;
        fillRoundRect(g, x - 20, y - 5, 39, 12, 4, color, dark ? 0.026 : 0.023);
        fillRoundRect(g, x - 15, y - 2, 13, 8, 1.5, paper, dark ? 0.075 : 0.11);
        drawLine(g, x - 12, y + 1, x - 5, y + 1, color, 0.14, 0.5);
        drawLine(g, x - 12, y + 3, x - 7, y + 3, color, 0.1, 0.45);
        fillRoundRect(g, x + 2, y + 1, 14, 4, 1.2, keyboard, 0.1);
        fillCircle(g, x + 17 * lean, y - 2 + pulse * 0.5, 1.05, color, 0.16);
    });
    return candidates.length;
}

function drawBossDeskBadge(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.boss.x;
    const y = POI.boss.y - 24;
    const surface = dark ? 0x111827 : 0xffffff;
    const gold = dark ? 0xfde68a : 0xf59e0b;
    const pulse = 0.5 + Math.sin(t * 0.014) * 0.5;

    fillRoundRect(g, x - 18, y - 7, 36, 13, 4, surface, dark ? 0.052 : 0.065);
    strokeRoundRect(g, x - 18, y - 7, 36, 13, 4, gold, 0.08 + pulse * 0.012, 0.55);
    drawLine(g, x - 9, y - 1, x - 3, y - 5, gold, 0.22, 0.7);
    drawLine(g, x - 3, y - 5, x + 3, y - 1, gold, 0.22, 0.7);
    drawLine(g, x + 3, y - 1, x + 9, y - 5, gold, 0.22, 0.7);
    fillCircle(g, x - 9, y - 1, 1.1, gold, 0.2);
    fillCircle(g, x + 9, y - 5, 1.1, gold, 0.2);
    fillCircle(g, x, y + 2, 1.35, gold, 0.2 + pulse * 0.02);
    return 1;
}

function drawMeetingNotes(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.meeting.x + 24;
    const y = POI.meeting.y + 2;
    const paper = dark ? 0xe5e7eb : 0xffffff;
    const ink = dark ? 0x93c5fd : 0x2f80ed;
    const warm = dark ? 0xfbbf24 : 0xff8a4c;
    const count = Math.min(budget, 2);

    fillEllipse(g, x + 4, y + 10, 46, 11, warm, dark ? 0.035 : 0.028);
    fillRoundRect(g, x - 24, y - 4, 14, 10, 2, paper, dark ? 0.08 : 0.12);
    fillRoundRect(g, x - 7, y - 8, 16, 11, 2, paper, dark ? 0.07 : 0.1);
    fillRoundRect(g, x + 14, y - 2, 13, 9, 2, paper, dark ? 0.07 : 0.1);
    drawLine(g, x - 21, y - 1, x - 14, y - 1, ink, 0.14, 0.65);
    drawLine(g, x - 21, y + 2, x - 16, y + 2, ink, 0.11, 0.55);
    drawLine(g, x - 3, y - 4, x + 5, y - 4, ink, 0.12, 0.55);
    fillCircle(g, x + 20 + Math.sin(t * 0.012) * 1.2, y + 2, 1.2, warm, 0.16);
    if (count > 1) {
        drawArc(g, x + 1, y + 8, 15, Math.PI * 1.08, Math.PI * 1.82, ink, 0.08, 0.55, 8);
    }
    return count;
}

function drawLoungeLampGlow(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const count = Math.min(budget, 2);
    const shade = dark ? 0xfbbf24 : 0xffc857;
    const stem = dark ? 0xcbd5e1 : 0x8b6f47;
    const glow = dark ? 0xfde68a : 0xffe7a3;
    const spots = [
        { x: POI.lounge.x + 66, y: POI.lounge.y + 8 },
        { x: POI.lounge2.x + 58, y: POI.lounge2.y + 12 },
    ];

    spots.slice(0, count).forEach((spot, i) => {
        const pulse = 0.5 + Math.sin(t * 0.01 + i) * 0.5;
        fillEllipse(g, spot.x, spot.y + 9, 28, 14, glow, (dark ? 0.028 : 0.024) + pulse * 0.004);
        drawLine(g, spot.x, spot.y - 8, spot.x, spot.y + 7, stem, 0.18, 0.65);
        fillRoundRect(g, spot.x - 8, spot.y - 12, 16, 7, 3, shade, 0.18 + pulse * 0.018);
        fillCircle(g, spot.x, spot.y - 5, 1.1, glow, 0.24);
    });
    return count;
}

function drawBookshelfGlints(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.bookshelf.x + 5;
    const y = POI.bookshelf.y - 3;
    const wood = dark ? 0x92400e : 0x9a6a3d;
    const colors = dark ? [0x93c5fd, 0x86efac, 0xfda4af] : [0x2f80ed, 0x10b981, 0xff6b4a];
    const count = Math.min(budget, 2);

    fillRoundRect(g, x - 29, y - 18, 58, 27, 4, wood, dark ? 0.035 : 0.04);
    for (let i = 0; i < 6; i++) {
        const h = 8 + (i % 3) * 2;
        fillRoundRect(g, x - 23 + i * 8, y - 13 + (10 - h), 5, h, 1.2, colors[i % colors.length], 0.11);
    }
    drawLine(g, x - 24, y - 2, x + 24, y - 2, dark ? 0xfef3c7 : 0xffffff, 0.06, 0.55);
    if (count > 1) {
        drawStar(g, x + 20, y - 15 + Math.sin(t * 0.01) * 0.7, 2.4, dark ? 0xfde68a : 0xf59e0b, 0.12);
    }
    return count;
}

function drawVendingPanelGlow(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.vending.x - 6;
    const y = POI.vending.y - 6;
    const panel = dark ? 0x111827 : 0xffffff;
    const mint = dark ? 0x5eead4 : 0x14b8a6;
    const coral = dark ? 0xfca5a5 : 0xff6b4a;
    const pulse = 0.5 + Math.sin(t * 0.012) * 0.5;

    fillRoundRect(g, x - 20, y - 17, 40, 35, 5, panel, dark ? 0.038 : 0.042);
    fillRoundRect(g, x - 14, y - 10, 16, 4, 1.4, mint, 0.11 + pulse * 0.012);
    fillRoundRect(g, x - 14, y - 3, 20, 4, 1.4, coral, 0.09);
    fillRoundRect(g, x - 14, y + 4, 12, 4, 1.4, 0xfacc15, 0.1);
    fillCircle(g, x + 12, y + 7, 1.4, mint, 0.18 + pulse * 0.024);
    return 1;
}

function drawAquariumFish(g, t, dark, budget) {
    if (budget <= 0) return 0;
    const x = POI.aquarium.x;
    const y = POI.aquarium.y - 2;
    const fishColors = dark ? [0xfde68a, 0xfda4af] : [0xf59e0b, 0xff6b4a];
    const count = Math.min(budget, 2);

    for (let i = 0; i < count; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        const swim = Math.sin(t * 0.008 + i * 1.7) * 12;
        const fx = x + dir * swim + (i === 0 ? -7 : 12);
        const fy = y - 6 + Math.sin(t * 0.012 + i) * 2.2;
        const color = fishColors[i % fishColors.length];
        fillEllipse(g, fx, fy, 4.8, 2.6, color, 0.2);
        fillTriangle(g, fx - dir * 4.5, fy, fx - dir * 8.6, fy - 2.6, fx - dir * 8.6, fy + 2.6, color, 0.16);
        fillCircle(g, fx + dir * 2.8, fy - 0.6, 0.45, 0xffffff, 0.28);
    }
    return count;
}

function drawProjectAuras() {
    clearGraphic(projectFX);
    lastProjectAuraCount = 0;
    if (!projectFX) return;

    const activeAgents = S.liveAgents
        .map((agent, idx) => ({ agent, idx, v: S.visualAgents[agent.pid] }))
        .filter(({ agent, v }) => v && agent.isRunning && FLOW_STATUSES.has(agent.status));
    if (activeAgents.length < 2) return;
    const profile = densityProfile(activeAgents.length);

    const focus = activeAgents.find(({ agent }) => samePid(agent.pid, S.directorFocusPid) || samePid(agent.pid, S.selectedPid));
    const focusKey = focus ? projectAuraKey(focus.agent) : "";
    const groups = new Map();
    activeAgents.forEach(item => {
        const key = projectAuraKey(item.agent);
        if (!key) return;
        if (S.directorMode && focusKey && key !== focusKey) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    });

    const mobile = S.canvasW < 640;
    const limit = Math.min(mobile ? 1 : MAX_PROJECT_AURAS, profile.projectAuras);
    const auras = [...groups.values()]
        .filter(group => group.length >= 2)
        .filter(group => !profile.focusOnly || group.some(({ agent }) => isVisualPriorityAgent(agent)) || projectAuraKey(group[0].agent) === focusKey)
        .map(group => buildProjectAura(group, focusKey))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    auras.forEach((aura, idx) => drawProjectAura(projectFX, aura, idx, mobile));
    lastProjectAuraCount = auras.length;
}

function buildProjectAura(group, focusKey) {
    const xs = group.map(({ v }) => v.x);
    const ys = group.map(({ v }) => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2 + 3;
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const isFocus = projectAuraKey(group[0].agent) === focusKey;
    if (!isFocus && (rawW > 280 || rawH > 210)) return null;

    const leader = [...group].sort((a, b) => {
        if (a.agent.needsReview !== b.agent.needsReview) return a.agent.needsReview ? -1 : 1;
        return statusAuraWeight(b.agent.status) - statusAuraWeight(a.agent.status);
    })[0];
    const rx = Math.min(isFocus ? 180 : 145, Math.max(58, rawW / 2 + 44));
    const ry = Math.min(isFocus ? 118 : 92, Math.max(28, rawH / 2 + 28));
    const activeWeight = group.reduce((sum, item) => sum + statusAuraWeight(item.agent.status), 0);

    return {
        key: projectAuraKey(group[0].agent),
        group,
        leader,
        x: centerX,
        y: centerY,
        rx,
        ry,
        color: projectAuraColor(leader.agent),
        isFocus,
        score: group.length * 100 + activeWeight + (isFocus ? 220 : 0),
    };
}

function drawProjectAura(g, aura, index, mobile) {
    const t = S.animFrame + index * 34;
    const pulse = 0.5 + Math.sin(t * 0.035) * 0.5;
    const alpha = (aura.isFocus ? 0.082 : 0.055) * (mobile ? 0.72 : 1);
    const strokeAlpha = (aura.isFocus ? 0.22 : 0.14) * (mobile ? 0.78 : 1);
    const rx = aura.rx + pulse * 4;
    const ry = aura.ry + pulse * 2.4;

    fillEllipse(g, aura.x, aura.y + 12, rx, ry, aura.color, alpha);
    fillEllipse(g, aura.x, aura.y + 12, rx * 0.72, ry * 0.64, 0xffffff, alpha * 0.42);
    strokeEllipse(g, aura.x, aura.y + 12, rx, ry, aura.color, strokeAlpha, aura.isFocus ? 1.05 : 0.78);

    const beadCount = Math.min(mobile ? 3 : 5, aura.group.length + 1);
    for (let i = 0; i < beadCount; i++) {
        const angle = t * 0.012 + i * (Math.PI * 2 / beadCount);
        const x = aura.x + Math.cos(angle) * rx * 0.78;
        const y = aura.y + 12 + Math.sin(angle) * ry * 0.72;
        const beadAlpha = (0.2 + pulse * 0.1) * (mobile ? 0.74 : 1);
        fillCircle(g, x, y, i % 2 === 0 ? 1.6 : 1.15, i % 2 === 0 ? aura.color : 0xffffff, beadAlpha);
    }

    aura.group.forEach((item, i) => {
        const agentPulse = 0.5 + Math.sin(t * 0.07 + i) * 0.5;
        drawLine(g, aura.x, aura.y + 12, item.v.x, item.v.y + 8, aura.color, 0.038 + agentPulse * 0.018, 0.55);
        fillCircle(g, item.v.x, item.v.y + 8, 2.1 + agentPulse * 0.5, aura.color, 0.13 + agentPulse * 0.05);
    });

    if (!mobile && aura.isFocus) {
        const flagX = aura.x - Math.min(52, aura.rx * 0.42);
        const flagY = aura.y - aura.ry * 0.44;
        fillRoundRect(g, flagX, flagY, 15, 8, 3, aura.color, 0.22);
        fillCircle(g, flagX + 4, flagY + 4, 1.4 + pulse * 0.35, 0xffffff, 0.54);
        fillCircle(g, flagX + 8, flagY + 4, 1.1, aura.color, 0.52);
        drawLine(g, flagX + 12, flagY + 2.2, flagX + 12, flagY + 5.8, aura.color, 0.42, 0.8);
    }
}

function projectAuraKey(agent) {
    const group = flowGroupKey(agent);
    if (group) return `project:${group}`;
    if (agent.platform) return `platform:${agent.platform}`;
    return "";
}

function projectAuraColor(agent) {
    const platform = PLATFORM_META[agent.platform];
    const platformColor = platform?.color && platform.color !== "#FFFFFF"
        ? platform.color
        : null;
    return hexToNumber(platformColor || STATUS_META[agent.status]?.color || "#10b981");
}

function statusAuraWeight(status) {
    if (status === "reviewing") return 28;
    if (status === "coding") return 22;
    if (status === "searching") return 18;
    if (status === "thinking") return 15;
    if (status === "meeting") return 12;
    return 4;
}

function drawFloorHighlights() {
    clearGraphic(floorFX);
    const t = S.animFrame;
    const activeAgents = S.liveAgents.filter(a => a.isRunning && IMPORTANT_STATUSES.has(a.status) && isVisualPriorityAgent(a));
    const teamLoad = Math.min(activeAgents.length / 18, 1);

    activeAgents.forEach((agent, i) => {
        const v = S.visualAgents[agent.pid];
        if (!v) return;
        const meta = STATUS_META[agent.status] || STATUS_META.coding;
        const color = hexToNumber(meta.color);
        const pulse = 0.5 + Math.sin(t * 0.024 + i) * 0.5;
        const important = getAgentEmphasis(agent);
        const focusBoost = important > 0 ? 1.35 : 1;
        const loadGlow = teamLoad * (0.35 + pulse * 0.65);
        strokeEllipse(floorFX, v.x, v.y + 8, 18 + pulse * 2.2 * focusBoost + loadGlow, 6 + pulse * 0.9 + loadGlow * 0.35, color, 0.055 + pulse * 0.026 + important * 0.045 + loadGlow * 0.018, 0.75 + teamLoad * 0.12);
        if (important > 0) {
            fillEllipse(floorFX, v.x, v.y + 8, 15 + pulse * 1.2, 4.3 + pulse * 0.45, color, 0.022 + important * 0.014);
        }
    });
}

function drawActionSpotlights() {
    clearGraphic(actionFX);
    lastActionSpotlightCount = 0;
    if (!actionFX) return;

    const activeCount = activeAgentCount();
    const spotlights = chooseActionSpotlights(activeCount);
    spotlights.forEach((item, index) => drawActionSpotlight(actionFX, item, index, spotlights.length));
    lastActionSpotlightCount = spotlights.length;
}

function chooseActionSpotlights(activeCount) {
    const profile = densityProfile(activeCount);
    const mobile = S.canvasW < 640;
    const limit = Math.min(mobile ? 1 : MAX_ACTION_SPOTLIGHTS, profile.actionSpotlights ?? 1);
    if (limit <= 0) return [];

    const context = priorityContext();
    const now = Date.now();
    return S.liveAgents
        .map((agent, idx) => ({
            agent,
            idx,
            v: S.visualAgents[agent.pid],
            action: agentNextAction(agent, context, now),
        }))
        .filter(({ agent, v, action }) => v && agent.isRunning && action.rank <= 3)
        .sort((a, b) => compareAgentPriority(a.agent, b.agent, context, now) || a.idx - b.idx)
        .slice(0, limit);
}

function priorityContext() {
    return {
        selectedPid: S.selectedPid,
        directorFocusPid: S.directorFocusPid,
        pinnedKeys: pinnedKeys(),
    };
}

function drawActionSpotlight(g, item, index, total) {
    const { agent, v, action } = item;
    const mobile = S.canvasW < 640;
    const calm = motionFactor();
    const t = S.animFrame * calm + index * 37;
    const pulse = 0.5 + Math.sin(t * 0.032) * 0.5;
    const slow = 0.5 + Math.sin(t * 0.014) * 0.5;
    const color = actionSpotlightColor(agent, action);
    const priorityBoost = Math.max(0, 4 - action.rank);
    const lift = action.key === "review" ? 2.4 : action.key === "focus" ? 1.7 : 0;
    const floorY = v.y + 9;
    const glowAlpha = ((mobile ? 0.035 : 0.052) + priorityBoost * 0.008) * calm;
    const ringAlpha = ((mobile ? 0.12 : 0.15) + priorityBoost * 0.022) * calm;
    const rx = 20 + pulse * 1.8 + priorityBoost * 1.2;
    const ry = 6.1 + pulse * 0.58 + priorityBoost * 0.22;

    fillEllipse(g, v.x, floorY, rx + 5, ry + 1.8, color, glowAlpha);
    fillEllipse(g, v.x, floorY, rx * 0.55, ry * 0.58, 0xffffff, glowAlpha * 0.45);
    strokeEllipse(g, v.x, floorY, rx, ry, color, ringAlpha, action.rank <= 1 ? 1.25 : 0.9);

    const haloR = mobile ? 15 + priorityBoost : 17 + priorityBoost * 1.35;
    drawArc(g, v.x, v.y - 8 - lift, haloR, -Math.PI * 0.88 + slow * 0.14, Math.PI * 0.16 + slow * 0.14, color, (0.12 + priorityBoost * 0.018) * calm, 0.72, 10);
    drawArc(g, v.x, v.y - 8 - lift, haloR + 3.4, Math.PI * 0.18 - slow * 0.12, Math.PI * 0.9 - slow * 0.12, color, (0.08 + priorityBoost * 0.012) * calm, 0.58, 8);

    const petalCount = mobile ? 2 : Math.min(4, 2 + priorityBoost + total);
    for (let i = 0; i < petalCount; i++) {
        const angle = t * 0.008 + i * (Math.PI * 2 / petalCount);
        const p = pointOnCircle(v.x, v.y - 9 - lift, haloR + 4 + Math.sin(t * 0.018 + i) * 0.65, angle);
        const petalColor = i % 2 === 0 ? color : 0xffffff;
        const petalAlpha = ((i % 2 === 0 ? 0.16 : 0.24) + pulse * 0.032) * calm;
        fillCircle(g, p.x, p.y, i % 2 === 0 ? 1.55 : 1.05, petalColor, petalAlpha);
    }

    drawActionGlyph(g, action.key, v.x, v.y - 28 - lift + Math.sin(t * 0.02) * 0.35, color, pulse, mobile);
    if (!mobile && action.rank <= 2) {
        drawLine(g, v.x, v.y - 23 - lift, v.x, v.y - 15 - lift, color, (0.09 + pulse * 0.03) * calm, 0.58);
    }
}

function actionSpotlightColor(agent, action) {
    if (action?.key && ACTION_SPOTLIGHT_COLORS[action.key]) return ACTION_SPOTLIGHT_COLORS[action.key];
    return hexToNumber(STATUS_META[agent.status]?.color || "#10b981");
}

function drawActionGlyph(g, key, x, y, color, pulse, mobile) {
    const calm = motionFactor();
    const alpha = (mobile ? 0.54 : 0.62) * calm;
    const scale = mobile ? 0.86 : 1;
    fillCircle(g, x, y, 5.6 * scale + pulse * 0.18, 0xffffff, alpha);
    strokeCircle(g, x, y, 5.9 * scale + pulse * 0.32, color, 0.38 * calm, 0.68);

    if (key === "review") {
        drawLine(g, x - 2.5 * scale, y + 0.2 * scale, x - 0.7 * scale, y + 2 * scale, color, 0.86, 1.25);
        drawLine(g, x - 0.7 * scale, y + 2 * scale, x + 3.2 * scale, y - 2.6 * scale, color, 0.86, 1.25);
        return;
    }
    if (key === "focus") {
        strokeCircle(g, x, y, 2.7 * scale, color, 0.72, 0.9);
        fillCircle(g, x, y, 1.1 * scale, color, 0.78);
        drawLine(g, x, y - 5.2 * scale, x, y - 3.6 * scale, color, 0.72, 0.75);
        drawLine(g, x + 3.6 * scale, y, x + 5.2 * scale, y, color, 0.72, 0.75);
        drawLine(g, x, y + 3.6 * scale, x, y + 5.2 * scale, color, 0.72, 0.75);
        drawLine(g, x - 5.2 * scale, y, x - 3.6 * scale, y, color, 0.72, 0.75);
        return;
    }
    if (key === "stale") {
        strokeCircle(g, x, y, 2.8 * scale + pulse * 0.5, color, 0.62, 0.9);
        strokeCircle(g, x, y, 4.6 * scale + pulse * 0.8, color, 0.3, 0.65);
        fillCircle(g, x, y, 0.9 * scale, color, 0.7);
        return;
    }
    if (key === "pinned") {
        drawStar(g, x, y, 4.1 * scale, color, 0.82);
        return;
    }

    fillCircle(g, x - 1.8 * scale, y, 1.25 * scale, color, 0.72);
    fillCircle(g, x + 1.8 * scale, y, 1.25 * scale, color, 0.72);
    drawLine(g, x - 2.8 * scale, y + 2.1 * scale, x + 2.8 * scale, y + 2.1 * scale, color, 0.48, 0.8);
}

function drawStar(g, x, y, r, color, alpha = 1) {
    const points = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        points.push(pointOnCircle(x, y, radius, angle));
    }
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        drawLine(g, a.x, a.y, b.x, b.y, color, alpha, 0.95);
    }
    fillCircle(g, x, y, r * 0.28, color, alpha * 0.46);
}

function drawCollaborationFlows() {
    clearGraphic(flowFX);
    lastFlowLinkCount = 0;
    if (!flowFX) return;

    const activeAgents = S.liveAgents
        .map((agent, idx) => ({ agent, idx, v: S.visualAgents[agent.pid] }))
        .filter(({ agent, v }) => v && agent.isRunning && FLOW_STATUSES.has(agent.status));
    if (activeAgents.length < 2) return;
    const profile = densityProfile(activeAgents.length);

    const byPid = new Map(activeAgents.map(item => [String(item.agent.pid), item]));
    const candidates = [];

    activeAgents.forEach(item => {
        const partnerPid = item.v?.speechTimer > 0 ? item.v.chatPartner : null;
        const partner = partnerPid == null ? null : byPid.get(String(partnerPid));
        if (partner) addFlowCandidate(candidates, item, partner, "chat", 6);
    });

    const focusItem = byPid.get(String(S.directorFocusPid ?? S.selectedPid));
    if (focusItem) {
        activeAgents
            .filter(item => item !== focusItem)
            .sort((a, b) => agentFlowPriority(b.agent) - agentFlowPriority(a.agent))
            .slice(0, 4)
            .forEach(item => addFlowCandidate(candidates, focusItem, item, "focus", 4));
    }

    activeAgents
        .filter(item => item.agent.needsReview || item.agent.status === "reviewing")
        .forEach(item => {
            const peer = focusItem && focusItem !== item
                ? focusItem
                : nearestFlowPeer(item, activeAgents);
            if (peer) addFlowCandidate(candidates, item, peer, "review", 5);
        });

    if (!S.directorMode && activeAgents.length <= HIGH_LOAD_FLOW_THRESHOLD) {
        const sorted = [...activeAgents].sort((a, b) => agentFlowPriority(b.agent) - agentFlowPriority(a.agent));
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const a = sorted[i];
                const b = sorted[j];
                if (flowGroupKey(a.agent) && flowGroupKey(a.agent) === flowGroupKey(b.agent)) {
                    addFlowCandidate(candidates, a, b, "project", 3);
                } else if (a.agent.platform && a.agent.platform === b.agent.platform) {
                    addFlowCandidate(candidates, a, b, "platform", 2);
                }
            }
        }
    }

    const linkLimit = Math.min(S.canvasW < 640 ? 2 : activeAgents.length > HIGH_LOAD_FLOW_THRESHOLD ? 2 : MAX_FLOW_LINKS, profile.flowLinks);
    const chosen = chooseFlowLinks(candidates, linkLimit);
    chosen.forEach((link, idx) => drawFlowLink(flowFX, link, idx, chosen.length));
    lastFlowLinkCount = chosen.length;
}

function addFlowCandidate(candidates, from, to, kind, priority) {
    if (!from || !to || from === to) return;
    if (S.directorMode && S.directorFocusPid != null) {
        const focusPid = String(S.directorFocusPid);
        if (String(from.agent.pid) !== focusPid && String(to.agent.pid) !== focusPid) return;
    }
    const activeCount = S.liveAgents.reduce((sum, agent) => sum + (agent.isRunning ? 1 : 0), 0);
    const profile = densityProfile(activeCount);
    if (profile.focusOnly && !flowCandidateHasPriority(from, to)) return;
    if (activeCount > HIGH_LOAD_FLOW_THRESHOLD && priority < 4) return;

    const distance = Math.hypot((to.v.x || 0) - (from.v.x || 0), (to.v.y || 0) - (from.v.y || 0));
    candidates.push({
        from,
        to,
        kind,
        priority,
        distance,
        score: priority * 1000 + agentFlowPriority(from.agent) + agentFlowPriority(to.agent) - distance * 0.18,
    });
}

function flowCandidateHasPriority(from, to) {
    return isVisualPriorityAgent(from.agent) || isVisualPriorityAgent(to.agent);
}

function chooseFlowLinks(candidates, limit) {
    if (limit <= 0) return [];
    const chosen = [];
    const usedPairs = new Set();
    const perAgent = new Map();
    const sorted = [...candidates].sort((a, b) => b.score - a.score);

    for (const candidate of sorted) {
        const key = flowPairKey(candidate.from.agent.pid, candidate.to.agent.pid);
        if (usedPairs.has(key)) continue;

        const fromPid = String(candidate.from.agent.pid);
        const toPid = String(candidate.to.agent.pid);
        const fromCount = perAgent.get(fromPid) || 0;
        const toCount = perAgent.get(toPid) || 0;
        if (fromCount >= maxFlowLinksForAgent(candidate.from.agent)) continue;
        if (toCount >= maxFlowLinksForAgent(candidate.to.agent)) continue;

        chosen.push(candidate);
        usedPairs.add(key);
        perAgent.set(fromPid, fromCount + 1);
        perAgent.set(toPid, toCount + 1);
        if (chosen.length >= limit) break;
    }
    return chosen;
}

function drawFlowLink(g, link, index, total) {
    const { from, to, kind, priority } = link;
    const x1 = from.v.x;
    const y1 = from.v.y - 6;
    const x2 = to.v.x;
    const y2 = to.v.y - 6;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / distance;
    const ny = dx / distance;
    const direction = index % 2 === 0 ? 1 : -1;
    const bow = Math.min(28, Math.max(10, distance * 0.12)) * direction;
    const cx = (x1 + x2) / 2 + nx * bow;
    const cy = (y1 + y2) / 2 + ny * bow - 10;
    const color = flowColorForLink(link);
    const focused = flowInvolvesFocus(link);
    const mobile = S.canvasW < 640;
    const emphasis = kind === "chat" || focused || priority >= 5;
    const baseAlpha = (emphasis ? 0.21 : 0.13) * (mobile ? 0.72 : 1);
    const width = (emphasis ? 1.05 : 0.82) * (mobile ? 0.82 : 1);

    drawQuadraticLine(g, x1, y1, cx, cy, x2, y2, color, baseAlpha * 0.32, width + 1.9);
    drawQuadraticLine(g, x1, y1, cx, cy, x2, y2, 0xffffff, baseAlpha * 0.18, width + 0.55);
    drawQuadraticLine(g, x1, y1, cx, cy, x2, y2, color, baseAlpha, width);

    const packetCount = mobile ? 1 : kind === "chat" ? 2 : 1;
    for (let i = 0; i < packetCount; i++) {
        const t = (S.animFrame * (kind === "chat" ? 0.018 : 0.013) + index * 0.23 + i * 0.52) % 1;
        const p = pointOnQuadratic(t, x1, y1, cx, cy, x2, y2);
        const fade = Math.sin(Math.PI * t);
        fillCircle(g, p.x, p.y, (emphasis ? 2.05 : 1.65) * (mobile ? 0.82 : 1), 0xffffff, Math.min(0.66, baseAlpha * 2.8 * fade));
        fillCircle(g, p.x, p.y, (emphasis ? 1.15 : 0.92) * (mobile ? 0.82 : 1), color, Math.min(0.74, baseAlpha * 3.2 * fade));
    }

    fillCircle(g, x1, y1, 1.45, color, baseAlpha + 0.06);
    fillCircle(g, x2, y2, 1.45, color, baseAlpha + 0.06);
    if (total === 1 && !mobile) {
        const mid = pointOnQuadratic(0.5, x1, y1, cx, cy, x2, y2);
        strokeCircle(g, mid.x, mid.y, 3.8 + Math.sin(S.animFrame * 0.08) * 0.7, color, baseAlpha * 0.72, 0.75);
    }
}

function drawQuadraticLine(g, x1, y1, cx, cy, x2, y2, color, alpha, width) {
    const distance = Math.hypot(x2 - x1, y2 - y1);
    const segments = distance > 160 ? 18 : 12;
    let prev = { x: x1, y: y1 };
    for (let i = 1; i <= segments; i++) {
        const p = pointOnQuadratic(i / segments, x1, y1, cx, cy, x2, y2);
        drawLine(g, prev.x, prev.y, p.x, p.y, color, alpha, width);
        prev = p;
    }
}

function pointOnQuadratic(t, x1, y1, cx, cy, x2, y2) {
    const inv = 1 - t;
    return {
        x: inv * inv * x1 + 2 * inv * t * cx + t * t * x2,
        y: inv * inv * y1 + 2 * inv * t * cy + t * t * y2,
    };
}

function pointOnCircle(cx, cy, r, angle) {
    return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
    };
}

function nearestFlowPeer(item, agents) {
    let best = null;
    let bestScore = -Infinity;
    agents.forEach(peer => {
        if (peer === item) return;
        const distance = Math.hypot((peer.v.x || 0) - (item.v.x || 0), (peer.v.y || 0) - (item.v.y || 0));
        const score = agentFlowPriority(peer.agent) - distance * 0.18;
        if (score > bestScore) {
            best = peer;
            bestScore = score;
        }
    });
    return best;
}

function agentFlowPriority(agent) {
    let score = 0;
    if (samePid(S.directorFocusPid, agent.pid)) score += 80;
    if (samePid(S.selectedPid, agent.pid)) score += 45;
    if (isSignalStale(agent)) score += 42;
    if (isAgentPinned(agent)) score += 38;
    if (agent.needsReview) score += 50;
    if (agent.status === "reviewing") score += 22;
    else if (agent.status === "coding") score += 16;
    else if (agent.status === "searching") score += 13;
    else if (agent.status === "thinking") score += 11;
    else if (agent.status === "meeting") score += 8;
    return score;
}

function maxFlowLinksForAgent(agent) {
    const isFocus = samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid) || isAgentPinned(agent);
    if (isFocus && S.canvasW >= 720) return S.directorMode ? 2 : 2;
    return 1;
}

function flowColorForLink(link) {
    if (link.kind === "chat") return 0xff8ab3;
    if (link.kind === "review") return 0xffa337;
    const firstScore = agentFlowPriority(link.from.agent);
    const leader = firstScore >= agentFlowPriority(link.to.agent) ? link.from.agent : link.to.agent;
    return hexToNumber(STATUS_META[leader.status]?.color || AGENT_THEMES[link.from.idx % AGENT_THEMES.length]?.body || "#10b981");
}

function flowInvolvesFocus(link) {
    const focusPid = String(S.directorFocusPid ?? S.selectedPid ?? "");
    if (!focusPid) return false;
    return String(link.from.agent.pid) === focusPid || String(link.to.agent.pid) === focusPid;
}

function flowPairKey(a, b) {
    const pa = String(a);
    const pb = String(b);
    return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
}

function flowGroupKey(agent) {
    return String(agent.projectName || agent.cwd || agent.repo || agent.project || "").trim().toLowerCase();
}

function syncWorkEventBursts() {
    if (!burstFX) return;
    const now = Date.now();
    const burstLimit = activeBurstLimit();
    pruneConsumedWorkEvents(now);

    [...eventBursts.entries()].forEach(([key, burst]) => {
        updateWorkEventBurst(burst, now);
        if (now - burst.startedAt > burst.life) {
            burst.root.destroy({ children: true });
            eventBursts.delete(key);
        }
    });

    S.workEvents.slice(0, 16).forEach(event => {
        const key = String(event.key || `${event.type}|${event.pid}|${event.text || ""}`);
        if (now - (event.ts || now) > 6000) {
            consumedWorkEvents.set(key, now);
            return;
        }
        if (consumedWorkEvents.has(key) && now - consumedWorkEvents.get(key) < BURST_COOLDOWN_MS) return;
        if (!shouldShowBurst(event)) return;
        const agent = S.liveAgents.find(a => String(a.pid) === String(event.pid));
        const v = S.visualAgents[event.pid];
        if (!agent || !v) return;
        const priority = eventBurstPriority(event);
        if (countBurstsForAgent(event.pid) >= MAX_BURSTS_PER_AGENT && !removeReplaceableBurstForAgent(event.pid, priority)) {
            consumedWorkEvents.set(key, now);
            return;
        }
        if (eventBursts.size >= burstLimit && !removeReplaceableBurst(priority)) {
            consumedWorkEvents.set(key, now);
            return;
        }
        spawnWorkEventBurst(event, agent, v, key, now);
        consumedWorkEvents.set(key, now);
    });
}

function shouldShowBurst(event) {
    if (event?.pid == null || !BURST_TYPES.has(event.type)) return false;
    const profile = densityProfile();
    const agent = S.liveAgents.find(item => samePid(item.pid, event.pid));
    const pinned = isAgentPinned(agent);
    if (profile.focusOnly && event.type !== "review" && !pinned && !samePid(event.pid, S.selectedPid) && !samePid(event.pid, S.directorFocusPid)) return false;
    if (profile.mode === "balanced" && event.type === "work" && eventBursts.size > 3 && !pinned && !samePid(event.pid, S.selectedPid)) return false;
    if (S.directorMode && event.type !== "review" && String(event.pid) !== String(S.directorFocusPid)) return false;
    if (event.type === "work" && eventBursts.size > 5 && !pinned && String(event.pid) !== String(S.selectedPid)) return false;
    return true;
}

function activeBurstLimit() {
    const profile = densityProfile();
    if (profile.mode === "focus") return 3;
    if (profile.mode === "balanced") return 5;
    return MAX_ACTIVE_BURSTS;
}

function spawnWorkEventBurst(event, agent, v, key, now) {
    const PIXI = window.PIXI;
    const root = new PIXI.Container();
    const ring = new PIXI.Graphics();
    const sparks = new PIXI.Graphics();
    const glyph = new PIXI.Graphics();
    root.addChild(ring, sparks, glyph);
    root.position.set(v.x, v.y - 8);
    burstFX.addChild(root);

    const status = agent.isRunning ? agent.status : event.status;
    const meta = STATUS_META[status] || STATUS_META.coding;
    const color = event.type === "review" ? 0xffa337
        : event.type === "task-done" ? 0x10b981
        : event.type === "join" ? 0x2f80ed
        : event.type === "leave" ? 0x94a3b8
        : hexToNumber(event.statusColor || event.color || meta.color);
    const themeColor = hexToNumber(event.color || AGENT_THEMES[S.liveAgents.indexOf(agent) % AGENT_THEMES.length]?.body || "#10b981");
    const life = event.type === "review" ? 1100 : event.type === "task-done" ? 920 : 760;
    const sparkCount = event.type === "review" ? 7 : event.type === "task-done" ? 6 : 4;
    const sparkSeeds = Array.from({ length: sparkCount }, (_, i) => ({
        angle: -Math.PI / 2 + (i - (sparkCount - 1) / 2) * 0.34,
        speed: 12 + (i % 3) * 3,
        radius: 1.3 + (i % 2) * 0.5,
        color: i % 2 === 0 ? color : themeColor,
    }));

    const burst = {
        key,
        pid: String(event.pid),
        type: event.type,
        priority: eventBurstPriority(event),
        root,
        ring,
        sparks,
        glyph,
        color,
        themeColor,
        sparkSeeds,
        startedAt: now,
        life,
    };
    eventBursts.set(key, burst);
}

function updateWorkEventBurst(burst, now) {
    const age = now - burst.startedAt;
    const p = Math.min(1, age / burst.life);
    const ease = 1 - Math.pow(1 - p, 3);
    const v = S.visualAgents[burst.pid];
    if (v) burst.root.position.set(v.x, v.y - 8 - ease * 4);
    burst.root.alpha = Math.max(0, 1 - p);
    burst.root.scale.set(1 + ease * 0.12);

    clearGraphic(burst.ring);
    const ringRadius = (burst.type === "review" ? 14 : 11) + ease * 15;
    strokeCircle(burst.ring, 0, 0, ringRadius, burst.color, 0.42 * (1 - p), 1.25);
    fillCircle(burst.ring, 0, 0, 6 + ease * 8, burst.color, 0.05 * (1 - p));

    clearGraphic(burst.sparks);
    burst.sparkSeeds.forEach(seed => {
        const dist = seed.speed * ease;
        const x = Math.cos(seed.angle) * dist;
        const y = Math.sin(seed.angle) * dist;
        fillCircle(burst.sparks, x, y, seed.radius * (1 - p * 0.42), seed.color, 0.74 * (1 - p));
    });

    drawBurstGlyph(burst.glyph, burst.type, burst.color, burst.themeColor, p);
}

function drawBurstGlyph(g, type, color, themeColor, p) {
    clearGraphic(g);
    const alpha = Math.max(0, 0.9 - p * 0.72);
    if (type === "review") {
        fillRoundRect(g, -7, -17, 14, 12, 3, 0xffffff, alpha);
        strokeRoundRect(g, -7, -17, 14, 12, 3, color, alpha * 0.72, 0.9);
        drawLine(g, -3.5, -11, -1, -8.5, color, alpha, 1.3);
        drawLine(g, -1, -8.5, 4, -14, color, alpha, 1.3);
        return;
    }
    if (type === "task-done") {
        strokeCircle(g, 0, -11, 6.5, color, alpha * 0.66, 1);
        drawLine(g, -3, -11, -0.8, -8.5, color, alpha, 1.35);
        drawLine(g, -0.8, -8.5, 4, -14, color, alpha, 1.35);
        return;
    }
    if (type === "join") {
        fillCircle(g, 0, -12, 5.5, themeColor, alpha * 0.72);
        strokeCircle(g, 0, -12, 8.5, color, alpha * 0.36, 1);
        drawLine(g, -4, -5, 4, -5, color, alpha * 0.72, 1.2);
        return;
    }
    if (type === "leave") {
        strokeCircle(g, 0, -12, 6.5, color, alpha * 0.48, 1);
        drawLine(g, -4, -12, 4, -12, color, alpha * 0.8, 1.1);
        return;
    }
    fillRoundRect(g, -8, -16, 16, 10, 3, color, alpha * 0.74);
    fillCircle(g, 8, -11, 2.8, themeColor, alpha * 0.8);
}

function countBurstsForAgent(pid) {
    return [...eventBursts.values()].filter(burst => burst.pid === String(pid)).length;
}

function eventBurstPriority(event) {
    if (event.type === "review") return 4;
    if (event.type === "task-done") return 3;
    if (event.type === "work") return 2;
    return 1;
}

function removeReplaceableBurstForAgent(pid, priority) {
    return removeReplaceableBurst(priority, burst => burst.pid === String(pid));
}

function removeReplaceableBurst(priority, predicate = () => true) {
    let targetKey = null;
    let targetScore = Infinity;
    eventBursts.forEach((burst, key) => {
        if (!predicate(burst) || burst.priority > priority) return;
        const score = burst.priority * 10000000000000 + burst.startedAt;
        if (score < targetScore) {
            targetScore = score;
            targetKey = key;
        }
    });
    if (!targetKey) return false;
    const burst = eventBursts.get(targetKey);
    burst?.root.destroy({ children: true });
    eventBursts.delete(targetKey);
    return true;
}

function pruneConsumedWorkEvents(now) {
    const liveKeys = new Set(S.workEvents.map(event => String(event.key || `${event.type}|${event.pid}|${event.text || ""}`)));
    consumedWorkEvents.forEach((ts, key) => {
        if (!liveKeys.has(key) && now - ts > 12000) consumedWorkEvents.delete(key);
    });
}

function syncAgentSprites() {
    const live = new Set();
    const activeCount = S.liveAgents.reduce((count, agent) => count + (agent.isRunning ? 1 : 0), 0);
    const workCards = chooseWorkCards(activeCount);
    const freshnessSignals = chooseFreshnessSignals(activeCount, workCards);
    const taskConstellations = chooseTaskConstellations(activeCount);
    const lifeTargets = chooseAgentLifeTargets(activeCount, workCards);
    lastWorkCardCount = 0;
    lastTaskConstellationCount = 0;
    lastFreshnessRingCount = 0;
    lastAgentLifeEffectCount = 0;
    S.liveAgents.forEach((agent, idx) => {
        const v = S.visualAgents[agent.pid];
        if (!v) return;
        live.add(String(agent.pid));
        let bundle = sprites.get(String(agent.pid));
        if (!bundle) {
            bundle = createAgentBundle(agent, idx);
            sprites.set(String(agent.pid), bundle);
            agentFX.addChild(bundle.root);
        }
        const card = workCards.get(String(agent.pid)) || null;
        const freshness = freshnessSignals.get(String(agent.pid)) || null;
        const showTaskConstellation = taskConstellations.has(String(agent.pid));
        const showLifeFX = lifeTargets.has(String(agent.pid));
        if (card) lastWorkCardCount++;
        const result = updateAgentBundle(bundle, agent, v, idx, activeCount, card, freshness, showTaskConstellation, showLifeFX);
        if (result.hasTaskConstellation) lastTaskConstellationCount++;
        if (result.hasFreshnessRing) lastFreshnessRingCount++;
        if (result.hasLifeEffect) lastAgentLifeEffectCount++;
    });

    [...sprites.entries()].forEach(([pid, bundle]) => {
        if (!live.has(pid)) {
            bundle.root.destroy({ children: true });
            sprites.delete(pid);
        }
    });
}

function chooseAgentLifeTargets(activeCount, workCards) {
    const profile = densityProfile(activeCount);
    const mobile = S.canvasW < 640;
    const limit = Math.min(mobile ? 1 : MAX_AGENT_LIFE_EFFECTS, profile.agentLifeEffects ?? 3);
    if (limit <= 0) return new Set();

    const context = priorityContext();
    const now = Date.now();
    return new Set(S.liveAgents
        .map((agent, idx) => ({
            agent,
            idx,
            v: S.visualAgents[agent.pid],
            action: agentNextAction(agent, context, now),
            hasWorkCard: workCards?.has?.(String(agent.pid)),
        }))
        .filter(({ agent, v, action, hasWorkCard }) => v && agent.isRunning && (action.rank <= 2 || hasWorkCard))
        .sort((a, b) => {
            const priority = compareAgentPriority(a.agent, b.agent, context, now);
            if (priority !== 0) return priority;
            if (a.hasWorkCard !== b.hasWorkCard) return a.hasWorkCard ? -1 : 1;
            return statusAuraWeight(b.agent.status) - statusAuraWeight(a.agent.status) || a.idx - b.idx;
        })
        .slice(0, limit)
        .map(item => String(item.agent.pid)));
}

function chooseWorkCards(activeCount) {
    const now = Date.now();
    const profile = densityProfile(activeCount);
    const limit = Math.min(S.canvasW < 640 ? 1 : S.canvasW < 720 ? 2 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? 2 : MAX_WORK_CARDS, profile.workCards);
    const candidates = new Map();

    S.liveAgents.forEach(agent => {
        const v = S.visualAgents[agent.pid];
        if (!v || !agent.isRunning) return;
        const pid = String(agent.pid);
        const isFocus = samePid(S.directorFocusPid, agent.pid);
        const isSelected = samePid(S.selectedPid, agent.pid);
        const important = isVisualPriorityAgent(agent);
        if (isFocus) upsertWorkCardCandidate(candidates, pid, agent, null, 1000);
        if (isSelected) upsertWorkCardCandidate(candidates, pid, agent, null, 820);
        if (isAgentPinned(agent)) upsertWorkCardCandidate(candidates, pid, agent, null, 740);
        if (agent.needsReview) upsertWorkCardCandidate(candidates, pid, agent, null, 900);
        if (!profile.focusOnly && agent.currentWork?.prompt && IMPORTANT_STATUSES.has(agent.status)) {
            upsertWorkCardCandidate(candidates, pid, agent, null, 360 + statusAuraWeight(agent.status));
        } else if (profile.focusOnly && important && agent.currentWork?.prompt && IMPORTANT_STATUSES.has(agent.status)) {
            upsertWorkCardCandidate(candidates, pid, agent, null, 360 + statusAuraWeight(agent.status));
        }
    });

    S.workEvents.slice(0, 20).forEach(event => {
        if (event?.pid == null || !WORK_CARD_EVENT_TYPES.has(event.type)) return;
        const agent = S.liveAgents.find(item => String(item.pid) === String(event.pid));
        const v = S.visualAgents[event.pid];
        if (!agent || !v || !agent.isRunning) return;
        if (profile.focusOnly && !isVisualPriorityAgent(agent) && event.type !== "review") return;
        const age = now - (event.ts || now);
        if (age > WORK_CARD_FRESH_MS) return;
        const priority = event.type === "review" ? 760
            : event.type === "task-done" ? 620
            : event.type === "task-start" ? 560
            : 500;
        upsertWorkCardCandidate(candidates, String(agent.pid), agent, event, priority - age * 0.035);
    });

    return new Map([...candidates.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(candidate => [String(candidate.agent.pid), candidate]));
}

function chooseTaskConstellations(activeCount) {
    const mobile = S.canvasW < 640;
    const profile = densityProfile(activeCount);
    const limit = Math.min(mobile ? 2 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? 4 : MAX_TASK_CONSTELLATIONS, profile.taskConstellations);
    const candidates = [];

    S.liveAgents.forEach(agent => {
        const tasks = Array.isArray(agent.tasks) ? agent.tasks : [];
        const v = S.visualAgents[agent.pid];
        if (!v || !agent.isRunning || tasks.length === 0) return;

        const important = samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid) || isAgentPinned(agent) || agent.needsReview;
        const inProgress = tasks.filter(task => task.status === "in_progress").length;
        const blocked = tasks.filter(task => task.status === "blocked" || task.status === "failed").length;
        const pending = tasks.filter(task => task.status === "pending" || task.status === "queued").length;
        if (profile.focusOnly && !important) return;
        if (mobile && !important && inProgress === 0) return;

        const score = (important ? 900 : 0)
            + inProgress * 90
            + blocked * 70
            + pending * 18
            + statusAuraWeight(agent.status)
            + Math.min(tasks.length, 8);
        candidates.push({ agent, score });
    });

    return new Map(candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(candidate => [String(candidate.agent.pid), candidate]));
}

function chooseFreshnessSignals(activeCount, workCards) {
    const now = Date.now();
    const profile = densityProfile(activeCount);
    const mobile = S.canvasW < 640;
    const limit = Math.min(mobile ? 1 : MAX_FRESHNESS_RINGS, profile.freshnessRings ?? MAX_FRESHNESS_RINGS);
    if (limit <= 0) return new Map();
    const context = priorityContext();
    const latestEventByPid = new Map();
    S.workEvents.slice(0, 28).forEach(event => {
        if (event?.pid == null) return;
        const pid = String(event.pid);
        if (!latestEventByPid.has(pid)) latestEventByPid.set(pid, Number(event.ts) || now);
    });

    const candidates = [];
    S.liveAgents.forEach(agent => {
        const v = S.visualAgents[agent.pid];
        if (!v || !agent.isRunning) return;
        const important = samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid) || isAgentPinned(agent) || agent.needsReview;
        const hasWorkCard = workCards?.has?.(String(agent.pid));
        const action = agentNextAction(agent, context, now);

        const ts = latestEventByPid.get(String(agent.pid))
            || timestampToMs(agent.signals?.lastActivityAt)
            || timestampToMs(agent.signals?.lastSeenAt)
            || timestampToMs(agent.currentWork?.timestamp)
            || now;
        const age = ts ? now - ts : SOFT_ACTIVITY_MS + 1;

        const score = (important ? 900 : 0)
            + Math.max(0, 6 - action.rank) * 42
            + (isAgentPinned(agent) ? 180 : 0)
            + (agent.needsReview ? 220 : 0)
            + (hasWorkCard ? 80 : 0)
            + Math.max(0, SOFT_ACTIVITY_MS - age) * 0.02
            + statusAuraWeight(agent.status);
        candidates.push({ agent, age, important, score });
    });

    return new Map(candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(signal => [String(signal.agent.pid), signal]));
}

function upsertWorkCardCandidate(candidates, pid, agent, event, score) {
    const previous = candidates.get(pid);
    if (!previous || score > previous.score) {
        candidates.set(pid, { agent, event, score });
    }
}

function createAgentBundle(agent, idx) {
    const PIXI = window.PIXI;
    const root = new PIXI.Container();
    const glow = new PIXI.Graphics();
    const freshnessFX = new PIXI.Graphics();
    const emphasis = new PIXI.Graphics();
    const taskFX = new PIXI.Graphics();
    const orbit = new PIXI.Graphics();
    const motif = new PIXI.Graphics();
    const lifeFX = new PIXI.Graphics();
    const badge = new PIXI.Graphics();
    const workCard = new PIXI.Container();
    const workCardBg = new PIXI.Graphics();
    const workCardMeter = new PIXI.Graphics();
    const workCardText = new PIXI.Text({
        text: "",
        style: {
            fontFamily: "Pretendard, system-ui, sans-serif",
            fontSize: 4.8,
            fontWeight: "800",
            fill: 0x1f2937,
            align: "left",
        },
    });
    const badgeText = new PIXI.Text({
        text: "",
        style: {
            fontFamily: "Pretendard, system-ui, sans-serif",
            fontSize: 5,
            fontWeight: "800",
            fill: 0xffffff,
            align: "center",
        },
    });
    badgeText.anchor?.set?.(0.5);
    workCardText.anchor?.set?.(0, 0.5);
    workCard.addChild(workCardBg, workCardMeter, workCardText);
    workCard.visible = false;
    root.addChild(glow, freshnessFX, emphasis, taskFX, orbit, lifeFX, motif, badge, badgeText, workCard);
    return {
        root,
        glow,
        freshnessFX,
        emphasis,
        taskFX,
        orbit,
        motif,
        lifeFX,
        badge,
        badgeText,
        workCard,
        workCardBg,
        workCardMeter,
        workCardText,
        phase: idx * 0.7,
    };
}

function updateAgentBundle(bundle, agent, v, idx, activeCount, workCard, freshness, showTaskConstellation, showLifeFX) {
    const status = agent.isRunning ? agent.status : "offline";
    const meta = STATUS_META[status] || STATUS_META.idle;
    const theme = AGENT_THEMES[idx % AGENT_THEMES.length];
    const statusColor = hexToNumber(meta.color);
    const themeColor = hexToNumber(theme.body);
    const calm = motionFactor(activeCount);
    const t = S.animFrame * calm + bundle.phase * 20;
    const bob = Math.sin(t * 0.026) * 0.75 * calm;
    const detail = activeCount > 16 ? 0.72 : activeCount > 9 ? 0.86 : 1;
    const emphasis = getAgentEmphasis(agent);

    bundle.root.position.set(v.x, v.y + bob);
    bundle.root.alpha = agent.isRunning ? 0.88 + emphasis * 0.06 : 0.36;

    clearGraphic(bundle.glow);
    if (agent.isRunning && status !== "idle") {
        const pulse = 0.5 + Math.sin(t * 0.04) * 0.5;
        fillCircle(bundle.glow, 0, -4, 14 + pulse * 1.8 + emphasis * 2.2, statusColor, (0.022 + pulse * 0.01 + emphasis * 0.012) * calm);
        if (emphasis > 0) {
            strokeCircle(bundle.glow, 0, -4, 13 + pulse * 1.3 + emphasis * 1.6, statusColor, (0.08 + emphasis * 0.055) * calm, 0.6 + emphasis * 0.1);
        }
    }

    drawEmphasis(bundle.emphasis, agent, t, statusColor, themeColor, emphasis);

    clearGraphic(bundle.orbit);
    if (agent.isRunning && IMPORTANT_STATUSES.has(status) && emphasis > 0) {
        const dotCount = activeCount > 8 ? 2 : 3;
        for (let i = 0; i < dotCount; i++) {
            const a = t * 0.014 + i * Math.PI * 0.62;
            const x = Math.cos(a) * (13 + emphasis * 1.5);
            const y = -11 + Math.sin(a) * (6.5 + emphasis);
            fillCircle(bundle.orbit, x, y, (i % 2 === 0 ? 1.15 : 0.9) * detail, i % 2 === 0 ? themeColor : statusColor, (0.2 * detail + emphasis * 0.035) * calm);
        }
    }

    const hasLifeEffect = drawAgentLifeFX(bundle.lifeFX, agent, t, statusColor, themeColor, detail, activeCount, status, showLifeFX);
    if (showLifeFX || emphasis > 0 || workCard) {
        drawStatusMotif(bundle.motif, status, t, statusColor, themeColor, detail);
    } else {
        clearGraphic(bundle.motif);
    }

    clearGraphic(bundle.badge);
    if (agent.currentWork?.prompt || agent.needsReview || samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid)) {
        const badgeColor = agent.needsReview ? 0xffa337 : statusColor;
        const badgeWidth = emphasis >= 3 ? 50 : 46;
        fillRoundRect(bundle.badge, -badgeWidth / 2, -38, badgeWidth, 13, 4, badgeColor, 0.86);
        strokeRoundRect(bundle.badge, -badgeWidth / 2, -38, badgeWidth, 13, 4, 0xffffff, 0.58, 0.65);
        const platform = PLATFORM_META[agent.platform] || PLATFORM_META.claude;
        const work = getWorkText(agent) || meta.label;
        const prefix = agent.needsReview ? "!" : samePid(S.directorFocusPid, agent.pid) ? "*" : platform.badge;
        bundle.badgeText.text = `${prefix} ${trimText(work, 9)}`;
        bundle.badgeText.position.set(0, -31.5);
        bundle.badgeText.visible = true;
    } else {
        bundle.badgeText.visible = false;
    }

    const hasFreshnessRing = drawFreshnessRing(bundle.freshnessFX, agent, t, statusColor, themeColor, activeCount, workCard, freshness);
    const hasTaskConstellation = drawTaskConstellation(bundle.taskFX, agent, t, statusColor, themeColor, activeCount, showTaskConstellation);
    drawWorkCard(bundle, agent, v, statusColor, themeColor, t, activeCount, workCard);
    return { hasFreshnessRing, hasTaskConstellation, hasLifeEffect };
}

function drawAgentLifeFX(g, agent, t, statusColor, themeColor, detail, activeCount, status, showLifeFX) {
    clearGraphic(g);
    if (!g || !showLifeFX || !agent.isRunning) return false;

    const mobile = S.canvasW < 640;
    const important = samePid(S.directorFocusPid, agent.pid)
        || samePid(S.selectedPid, agent.pid)
        || isAgentPinned(agent)
        || agent.needsReview;
    const crowdFactor = activeCount > HIGH_LOAD_FLOW_THRESHOLD && !important ? 0.68 : 1;
    const scale = (mobile ? 0.86 : 1) * detail * crowdFactor;
    const alpha = (mobile ? 0.46 : 0.56) * crowdFactor;
    const surface = isPixiDarkMode() ? 0x111827 : 0xffffff;
    const ink = isPixiDarkMode() ? 0xe5e7eb : 0x1f2937;
    const pulse = 0.5 + Math.sin(t * 0.09) * 0.5;

    if (status === "coding") {
        const y = 8 * scale;
        fillRoundRect(g, -15 * scale, y, 30 * scale, 7 * scale, 2.5 * scale, surface, 0.58 * alpha);
        strokeRoundRect(g, -15 * scale, y, 30 * scale, 7 * scale, 2.5 * scale, statusColor, 0.18 * alpha, 0.55 * scale);
        for (let i = 0; i < 6; i++) {
            const active = i === Math.floor(t / 7) % 6;
            const keyColor = active ? statusColor : themeColor;
            fillRoundRect(g, (-11 + i * 4.2) * scale, (10.2 + (i % 2) * 1.8) * scale, 2.3 * scale, 1.3 * scale, 0.6 * scale, keyColor, (active ? 0.66 : 0.28) * alpha);
        }
        drawLine(g, 14 * scale, 3.5 * scale, 14 * scale, 10.5 * scale, statusColor, (0.22 + pulse * 0.22) * alpha, 0.72 * scale);
        fillCircle(g, -16 * scale, 4 * scale, 1.1 * scale + pulse * 0.35, statusColor, 0.34 * alpha);
        return true;
    }

    if (status === "thinking") {
        fillRoundRect(g, -24 * scale, -9 * scale, 13 * scale, 12 * scale, 3 * scale, 0xfff7d6, 0.7 * alpha);
        strokeRoundRect(g, -24 * scale, -9 * scale, 13 * scale, 12 * scale, 3 * scale, statusColor, 0.32 * alpha, 0.65 * scale);
        drawLine(g, -21 * scale, -5.2 * scale, -14 * scale, -5.2 * scale, ink, 0.22 * alpha, 0.5 * scale);
        drawLine(g, -21 * scale, -1.7 * scale, -16 * scale, -1.7 * scale, ink, 0.18 * alpha, 0.5 * scale);
        fillCircle(g, -6 * scale, -14 * scale, 1.4 * scale + pulse * 0.25, statusColor, 0.34 * alpha);
        fillCircle(g, -2 * scale, -17 * scale, 1.9 * scale + pulse * 0.22, 0xfff3b0, 0.54 * alpha);
        strokeCircle(g, -2 * scale, -17 * scale, 3.7 * scale + pulse * 0.6, statusColor, 0.16 * alpha, 0.62 * scale);
        return true;
    }

    if (status === "searching") {
        const cx = 15 * scale;
        const cy = -13 * scale;
        strokeCircle(g, cx, cy, 7.5 * scale, statusColor, 0.22 * alpha, 0.72 * scale);
        drawArc(g, cx, cy, 10.5 * scale, t * 0.028, t * 0.028 + Math.PI * 0.62, statusColor, 0.34 * alpha, 0.8 * scale, 8);
        const p = pointOnCircle(cx, cy, 8.3 * scale, t * 0.04);
        drawLine(g, cx, cy, p.x, p.y, statusColor, 0.42 * alpha, 0.65 * scale);
        fillCircle(g, p.x, p.y, 1.25 * scale, 0xffffff, 0.52 * alpha);
        fillRoundRect(g, 7 * scale, -2 * scale, 16 * scale, 4.5 * scale, 2 * scale, surface, 0.48 * alpha);
        fillRoundRect(g, 9 * scale, -0.6 * scale, 5 * scale + pulse * 6 * scale, 1.5 * scale, 0.8 * scale, statusColor, 0.38 * alpha);
        return true;
    }

    if (status === "reviewing" || agent.needsReview) {
        fillRoundRect(g, -22 * scale, -14 * scale, 13 * scale, 15 * scale, 2.4 * scale, surface, 0.74 * alpha);
        strokeRoundRect(g, -22 * scale, -14 * scale, 13 * scale, 15 * scale, 2.4 * scale, 0xff8a4c, 0.48 * alpha, 0.72 * scale);
        fillRoundRect(g, -19 * scale, -17 * scale, 7 * scale, 3 * scale, 1.3 * scale, 0xff8a4c, 0.7 * alpha);
        drawLine(g, -19 * scale, -6 * scale, -16.5 * scale, -3.4 * scale, 0x10b981, 0.86 * alpha, 1.1 * scale);
        drawLine(g, -16.5 * scale, -3.4 * scale, -11.5 * scale, -9.4 * scale, 0x10b981, 0.86 * alpha, 1.1 * scale);
        strokeCircle(g, 11 * scale, -18 * scale, 3.8 * scale + pulse * 0.7, 0xff8a4c, 0.25 * alpha, 0.65 * scale);
        return true;
    }

    if (status === "meeting") {
        fillRoundRect(g, -24 * scale, -10 * scale, 14 * scale, 8 * scale, 3 * scale, surface, 0.6 * alpha);
        fillRoundRect(g, 9 * scale, -13 * scale, 14 * scale, 8 * scale, 3 * scale, surface, 0.56 * alpha);
        strokeRoundRect(g, -24 * scale, -10 * scale, 14 * scale, 8 * scale, 3 * scale, statusColor, 0.22 * alpha, 0.62 * scale);
        strokeRoundRect(g, 9 * scale, -13 * scale, 14 * scale, 8 * scale, 3 * scale, themeColor, 0.22 * alpha, 0.62 * scale);
        drawLine(g, -10 * scale, -6 * scale, 9 * scale, -9 * scale, statusColor, 0.13 * alpha, 0.62 * scale);
        for (let i = 0; i < 3; i++) {
            const dotAlpha = (i === Math.floor(t / 14) % 3 ? 0.64 : 0.26) * alpha;
            fillCircle(g, (-20 + i * 4) * scale, -6 * scale, 0.9 * scale, statusColor, dotAlpha);
            fillCircle(g, (13 + i * 4) * scale, -9 * scale, 0.9 * scale, themeColor, dotAlpha);
        }
        return true;
    }

    if (status === "coffee") {
        fillRoundRect(g, 10 * scale, -1 * scale, 9 * scale, 7 * scale, 2 * scale, surface, 0.72 * alpha);
        fillRoundRect(g, 11.2 * scale, 0.3 * scale, 6.6 * scale, 2.3 * scale, 1 * scale, 0x8b5a2b, 0.62 * alpha);
        strokeCircle(g, 19.2 * scale, 2.6 * scale, 2.3 * scale, surface, 0.58 * alpha, 0.75 * scale);
        for (let i = 0; i < 2; i++) {
            const phase = (t * 0.055 + i * 0.45) % 1;
            const sx = (12.5 + i * 3.2 + Math.sin(t * 0.025 + i) * 0.6) * scale;
            const sy = (-4 - phase * 8) * scale;
            drawArc(g, sx, sy, 2.2 * scale, Math.PI * 0.15, Math.PI * 1.08, 0xffffff, (0.32 - phase * 0.16) * alpha, 0.58 * scale, 6);
        }
        return true;
    }

    if (status === "idle") {
        const breathe = Math.sin(t * 0.045) * 0.7;
        fillEllipse(g, 0, 10 * scale, (10 + breathe) * scale, (3.2 + pulse * 0.4) * scale, themeColor, 0.08 * alpha);
        fillCircle(g, 14 * scale, -17 * scale, 3.2 * scale, themeColor, 0.34 * alpha);
        fillCircle(g, 15.6 * scale, -18.2 * scale, 3.2 * scale, surface, 0.72 * alpha);
        for (let i = 0; i < 3; i++) {
            const phase = (t * 0.018 + i * 0.28) % 1;
            fillCircle(g, (-8 + i * 4) * scale, (-16 - phase * 7) * scale, (0.8 + i * 0.18) * scale, themeColor, (0.26 - phase * 0.1) * alpha);
        }
        return true;
    }

    return false;
}

function drawFreshnessRing(g, agent, t, statusColor, themeColor, activeCount, workCard, freshness) {
    clearGraphic(g);
    if (!freshness || !agent.isRunning) return false;

    const mobile = S.canvasW < 640;
    const pinned = isAgentPinned(agent);
    const important = samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid) || pinned || agent.needsReview;

    const fresh = freshness.age <= FRESH_ACTIVITY_MS;
    const soft = freshness.age <= SOFT_ACTIVITY_MS;
    const baseAlpha = fresh ? 0.38 : soft ? 0.2 : 0.12;
    const crowdFactor = activeCount > HIGH_LOAD_FLOW_THRESHOLD && !important ? 0.68 : 1;
    const alpha = baseAlpha * (mobile ? 0.64 : 1) * crowdFactor;
    const radius = (mobile ? 11.8 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? 13.8 : 15.5) + (important ? 1.5 : 0);
    const width = (fresh ? 1.25 : 0.85) * crowdFactor;
    const color = agent.needsReview ? 0xffa337 : pinned ? 0xfacc15 : fresh ? statusColor : themeColor;
    const start = t * (fresh ? 0.045 : 0.018);
    const sweep = fresh ? Math.PI * 1.5 : soft ? Math.PI * 0.95 : Math.PI * 0.42;

    if (fresh || soft) {
        drawArc(g, 0, -5, radius, start, start + sweep, color, alpha, width, fresh ? 18 : 12);
        if (!mobile || important || fresh) {
            const bead = pointOnCircle(0, -5, radius, start + sweep);
            fillCircle(g, bead.x, bead.y, fresh ? 1.8 : 1.25, color, Math.min(0.82, alpha * 2.2));
            fillCircle(g, bead.x, bead.y, fresh ? 0.82 : 0.55, 0xffffff, Math.min(0.68, alpha * 1.8));
        }
        return true;
    }

    if (important) {
        for (let i = 0; i < 5; i++) {
            const p = pointOnCircle(0, -5, radius, start + i * Math.PI * 0.42);
            fillCircle(g, p.x, p.y, 0.78, color, alpha * 0.82);
        }
        return true;
    }
    return false;
}

function drawTaskConstellation(g, agent, t, statusColor, themeColor, activeCount, showTaskConstellation) {
    clearGraphic(g);
    const tasks = Array.isArray(agent.tasks) ? agent.tasks : [];
    if (!showTaskConstellation || !agent.isRunning || tasks.length === 0) return false;

    const mobile = S.canvasW < 640;
    const important = samePid(S.directorFocusPid, agent.pid) || samePid(S.selectedPid, agent.pid) || isAgentPinned(agent) || agent.needsReview;
    if (mobile && !important) return false;
    if (activeCount > HIGH_LOAD_FLOW_THRESHOLD && !important && !tasks.some(task => task.status === "in_progress")) return false;

    const nodeLimit = mobile ? 3 : activeCount > HIGH_LOAD_FLOW_THRESHOLD ? (important ? 4 : 2) : MAX_TASK_NODES;
    const ordered = [...tasks].sort((a, b) => taskStatusWeight(b.status) - taskStatusWeight(a.status)).slice(0, nodeLimit);
    if (ordered.length === 0) return false;

    const total = Math.max(1, Number(agent.totalTasks) || tasks.length);
    const completed = Math.min(total, Number(agent.completedTasks) || tasks.filter(task => task.status === "completed").length);
    const progress = Math.max(0, Math.min(1, completed / total));
    const highLoad = activeCount > HIGH_LOAD_FLOW_THRESHOLD;
    const surface = isPixiDarkMode() ? 0x111827 : 0xffffff;
    const width = Math.max(27, ordered.length * 7 + 13);
    const height = 12;
    const x = important ? -width / 2 : 12;
    const y = important ? 15 : 10;
    const pulse = 0.5 + Math.sin(t * 0.08) * 0.5;
    const alpha = (important ? 0.82 : 0.66) * (highLoad ? 0.82 : 1) * (mobile ? 0.9 : 1);

    fillRoundRect(g, x, y, width, height, 5, surface, alpha);
    strokeRoundRect(g, x, y, width, height, 5, statusColor, important ? 0.38 : 0.22, 0.62);
    fillRoundRect(g, x + 4, y + height - 3.1, width - 8, 1.35, 0.8, statusColor, 0.1);
    fillRoundRect(g, x + 4, y + height - 3.1, Math.max(2.2, (width - 8) * progress), 1.35, 0.8, themeColor, 0.58);

    ordered.forEach((task, i) => {
        const cx = x + 8 + i * 7;
        const cy = y + 5.1 + Math.sin(t * 0.065 + i) * 0.45;
        const color = taskStatusColor(task.status, statusColor, themeColor);
        const active = task.status === "in_progress";
        const done = task.status === "completed";
        const pending = !active && !done;
        const r = active ? 2.35 + pulse * 0.42 : done ? 2.05 : 1.85;

        if (active) {
            strokeCircle(g, cx, cy, r + 2.2 + pulse * 0.7, color, 0.18 + pulse * 0.08, 0.72);
            fillCircle(g, cx, cy, r, color, 0.84);
            fillCircle(g, cx + 2.3, cy - 2.2, 0.9 + pulse * 0.35, 0xffffff, 0.58);
            return;
        }

        if (done) {
            fillCircle(g, cx, cy, r, 0x10b981, 0.72);
            drawLine(g, cx - 1.2, cy, cx - 0.25, cy + 1.05, 0xffffff, 0.9, 0.62);
            drawLine(g, cx - 0.25, cy + 1.05, cx + 1.55, cy - 1.2, 0xffffff, 0.9, 0.62);
            return;
        }

        if (pending) {
            strokeCircle(g, cx, cy, r, color, 0.48, 0.75);
            fillCircle(g, cx, cy, 0.8, color, 0.35);
        }
    });

    if (tasks.length > ordered.length) {
        const moreX = x + width - 5.6;
        fillCircle(g, moreX - 2.2, y + 5.1, 0.78, statusColor, 0.36);
        fillCircle(g, moreX, y + 5.1, 0.78, statusColor, 0.46);
        fillCircle(g, moreX + 2.2, y + 5.1, 0.78, statusColor, 0.36);
    }

    if (important) {
        drawLine(g, 0, 9.5, 0, y, statusColor, 0.12, 0.65);
    }
    return true;
}

function taskStatusWeight(status) {
    if (status === "in_progress") return 4;
    if (status === "pending" || status === "queued") return 3;
    if (status === "blocked" || status === "failed") return 2;
    if (status === "completed") return 1;
    return 0;
}

function taskStatusColor(status, statusColor, themeColor) {
    if (status === "in_progress") return statusColor;
    if (status === "completed") return 0x10b981;
    if (status === "blocked" || status === "failed") return 0xef4444;
    if (status === "pending" || status === "queued") return themeColor;
    return 0x94a3b8;
}

function drawWorkCard(bundle, agent, v, statusColor, themeColor, t, activeCount, card) {
    const root = bundle.workCard;
    if (!card || !agent.isRunning) {
        root.visible = false;
        return;
    }

    const text = getWorkCardText(agent, card.event);
    if (!text) {
        root.visible = false;
        return;
    }

    const mobile = S.canvasW < 640;
    const highLoad = activeCount > HIGH_LOAD_FLOW_THRESHOLD;
    const worldWidth = COLS * TILE;
    const isFocus = samePid(S.directorFocusPid, agent.pid);
    const isSelected = samePid(S.selectedPid, agent.pid);
    const pinned = isAgentPinned(agent);
    const important = isFocus || isSelected || pinned || agent.needsReview;
    const width = mobile ? 76 : important ? 96 : 88;
    const height = mobile ? 22 : 24;
    const flipLeft = v.x > worldWidth - width - 42;
    const x = flipLeft ? -width - 18 : 18;
    const y = important ? -65 : -59;
    const cardBob = Math.sin(t * 0.018) * (important ? 0.5 : 0.25);
    const surface = isPixiDarkMode() ? 0x111827 : 0xffffff;
    const textColor = isPixiDarkMode() ? 0xf8fafc : 0x1f2937;
    const alpha = (important ? 0.94 : 0.84) * (highLoad ? 0.88 : 1);
    const pulse = 0.5 + Math.sin(t * 0.025) * 0.5;
    const meterW = width - 18;
    const taskTotal = Math.max(0, Number(agent.totalTasks) || (Array.isArray(agent.tasks) ? agent.tasks.length : 0));
    const taskDone = Math.max(0, Number(agent.completedTasks) || (Array.isArray(agent.tasks) ? agent.tasks.filter(task => task.status === "completed").length : 0));
    const fallbackProgress = statusProgress(agent.status);
    const meterProgress = taskTotal > 0 ? Math.max(0.12, Math.min(0.94, taskDone / taskTotal)) : fallbackProgress;

    root.visible = true;
    root.position.set(x, y + cardBob);
    root.alpha = mobile && !important ? 0.86 : 1;
    root.scale.set(mobile ? 0.94 : 1);

    clearGraphic(bundle.workCardBg);
    fillRoundRect(bundle.workCardBg, 0, 0, width, height, 6, surface, alpha);
    strokeRoundRect(bundle.workCardBg, 0, 0, width, height, 6, statusColor, important ? 0.5 : 0.28, 0.72);
    fillCircle(bundle.workCardBg, 8, 8.2, 2.1 + pulse * 0.12, statusColor, 0.7);
    if (agent.needsReview) {
        fillRoundRect(bundle.workCardBg, width - 12, 5, 7, 7, 2.2, 0xffa337, 0.86);
        drawLine(bundle.workCardBg, width - 10.2, 8.7, width - 8.7, 10.2, 0xffffff, 0.95, 0.8);
        drawLine(bundle.workCardBg, width - 8.7, 10.2, width - 5.8, 6.8, 0xffffff, 0.95, 0.8);
    } else if (isFocus || pinned) {
        fillCircle(bundle.workCardBg, width - 8, 8.5, 2.3, 0xfacc15, 0.9);
        strokeCircle(bundle.workCardBg, width - 8, 8.5, 4.8 + pulse * 0.25, 0xfacc15, 0.16, 0.58);
    }

    clearGraphic(bundle.workCardMeter);
    fillRoundRect(bundle.workCardMeter, 9, height - 5.2, meterW, 2.1, 1, statusColor, 0.1);
    fillRoundRect(bundle.workCardMeter, 9, height - 5.2, Math.max(7, meterW * meterProgress), 2.1, 1, themeColor, 0.68);
    fillCircle(bundle.workCardMeter, 9 + Math.max(7, meterW * meterProgress), height - 4.15, 1.15, statusColor, 0.5);

    bundle.workCardText.text = trimText(text, mobile ? 13 : important ? 19 : 16);
    bundle.workCardText.style.fill = textColor;
    bundle.workCardText.position.set(14, 11);
}

function statusProgress(status) {
    if (status === "coding") return 0.66;
    if (status === "thinking") return 0.42;
    if (status === "searching") return 0.5;
    if (status === "reviewing") return 0.78;
    if (status === "meeting") return 0.58;
    return 0.28;
}

function getWorkCardText(agent, event) {
    if (agent.needsReview) return getWorkText(agent) || event?.text || "검토 대기";
    if (event?.text) return event.text;
    if (event?.type === "task-done") return "작업 완료";
    if (event?.type === "task-start") return "작업 시작";
    return getWorkText(agent) || STATUS_META[agent.status]?.label || "";
}

function isPixiDarkMode() {
    return document.body.classList.contains("dark");
}

function drawStatusMotif(g, status, t, statusColor, themeColor, detail = 1) {
    clearGraphic(g);
    if (!IMPORTANT_STATUSES.has(status)) return;

    const alpha = 0.82 * detail;
    const twinkle = 0.55 + Math.sin(t * 0.11) * 0.22;

    if (status === "coding") {
        const x = -22;
        const y = -20;
        fillRoundRect(g, x, y, 18, 12, 3, 0xffffff, 0.88 * detail);
        strokeRoundRect(g, x, y, 18, 12, 3, statusColor, 0.54 * detail, 0.75);
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                fillRoundRect(g, x + 3 + col * 3.2, y + 3 + row * 4, 2.1, 1.5, 0.6, row === 0 ? themeColor : statusColor, 0.62 * detail);
            }
        }
        for (let i = 0; i < 3; i++) {
            const dot = 0.55 + Math.sin(t * 0.16 + i * 1.3) * 0.35;
            fillCircle(g, 4 + i * 4, -19 - dot * 2, 1.3 + dot * 0.45, statusColor, alpha);
        }
        return;
    }

    if (status === "thinking") {
        const bx = 15;
        const by = -23 + Math.sin(t * 0.06) * 1.2;
        fillCircle(g, bx, by, 5.2, 0xfff3b0, 0.86 * detail);
        strokeCircle(g, bx, by, 5.4, statusColor, 0.48 * detail, 0.8);
        fillRoundRect(g, bx - 3, by + 5, 6, 3.4, 1.2, statusColor, 0.65 * detail);
        drawLine(g, bx - 4.2, by + 9.3, bx + 4.2, by + 9.3, statusColor, 0.5 * detail, 0.7);
        fillCircle(g, 4, -14, 3.6, 0xffffff, 0.82 * detail);
        fillCircle(g, 9, -16, 4.5, 0xffffff, 0.82 * detail);
        fillCircle(g, 14, -14, 3.6, 0xffffff, 0.82 * detail);
        strokeCircle(g, 9, -15, 8, themeColor, 0.18 * detail, 0.8);
        return;
    }

    if (status === "searching") {
        const x = -21;
        const y = -24;
        fillRoundRect(g, x, y, 20, 18, 3, 0xffffff, 0.72 * detail);
        strokeRoundRect(g, x, y, 20, 18, 3, statusColor, 0.48 * detail, 0.8);
        for (let i = 0; i < 3; i++) {
            drawLine(g, x + 4, y + 4 + i * 4, x + 16, y + 4 + i * 4, themeColor, 0.24 * detail, 0.55);
        }
        const scanY = y + 3 + (t * 0.18 % 12);
        fillRoundRect(g, x + 2.2, scanY, 15.6, 2.2, 1.1, statusColor, 0.46 * detail);
        strokeCircle(g, 10, -15, 5.2 + twinkle, statusColor, 0.58 * detail, 0.9);
        drawLine(g, 14, -11, 18, -7, statusColor, 0.64 * detail, 1.3);
        return;
    }

    if (status === "reviewing") {
        const x = 7;
        const y = -24;
        fillRoundRect(g, x, y, 15, 12, 2.6, 0xffffff, 0.84 * detail);
        strokeRoundRect(g, x, y, 15, 12, 2.6, statusColor, 0.5 * detail, 0.8);
        fillRoundRect(g, x + 4.2, y - 4.5, 6.5, 5, 1.4, themeColor, 0.68 * detail);
        drawLine(g, x + 4.2, y - 0.2, x + 10.7, y - 0.2, themeColor, 0.62 * detail, 1.2);
        drawLine(g, x + 4, y + 6, x + 7.2, y + 9, statusColor, alpha, 1.4);
        drawLine(g, x + 7.2, y + 9, x + 12.4, y + 3.8, statusColor, alpha, 1.4);
        strokeCircle(g, -12, -15, 6.6 + twinkle * 1.2, statusColor, 0.38 * detail, 1);
        drawLine(g, -15.2, -15, -12.4, -12.4, statusColor, 0.6 * detail, 1.1);
        drawLine(g, -12.4, -12.4, -8.2, -17, statusColor, 0.6 * detail, 1.1);
    }
}

function drawEmphasis(g, agent, t, statusColor, themeColor, emphasis) {
    clearGraphic(g);
    if (!agent.isRunning || emphasis <= 0) return;

    const pulse = 0.5 + Math.sin(t * 0.08) * 0.5;
    const pinned = isAgentPinned(agent);
    const stale = isSignalStale(agent);
    const ringColor = agent.needsReview ? 0xffa337 : (pinned || stale || samePid(S.directorFocusPid, agent.pid)) ? 0xfacc15 : themeColor;
    const ringAlpha = 0.42 + pulse * 0.14;
    const isFocus = samePid(S.directorFocusPid, agent.pid);
    const isSelected = samePid(S.selectedPid, agent.pid);
    strokeCircle(g, 0, -5, 17 + emphasis + pulse * 2.2, ringColor, ringAlpha, 1.15 + emphasis * 0.12);

    if (isFocus || isSelected) {
        const markerColor = isFocus ? 0xfacc15 : themeColor;
        const markerAlpha = isFocus ? 0.5 : 0.34;
        fillEllipse(g, 0, -5, 19 + emphasis * 1.4, 10 + emphasis * 0.5, markerColor, isFocus ? 0.045 : 0.03);
        drawLine(g, -25, -12, -18, -5, markerColor, markerAlpha, 1.2);
        drawLine(g, -25, 2, -18, -5, markerColor, markerAlpha, 1.2);
    }

    if (isFocus) {
        fillCircle(g, 0, -26.5, 2.2 + pulse * 0.4, 0xfacc15, 0.88);
        fillCircle(g, -4.2, -25.2, 1.6, 0xfacc15, 0.7);
        fillCircle(g, 4.2, -25.2, 1.6, 0xfacc15, 0.7);
        strokeRoundRect(g, -6.2, -24.5, 12.4, 4.2, 1.5, 0xfacc15, 0.64, 0.85);
    }

    if (pinned && !isFocus) {
        fillCircle(g, -12, -25.5, 2 + pulse * 0.25, 0xfacc15, 0.86);
        fillCircle(g, -15.5, -24.2, 1.2, 0xfacc15, 0.66);
        fillCircle(g, -8.5, -24.2, 1.2, 0xfacc15, 0.66);
        strokeCircle(g, -12, -25.1, 5 + pulse * 0.5, 0xfacc15, 0.24, 0.62);
    }

    if (stale && !agent.needsReview) {
        strokeCircle(g, 12.5, -24.5, 4.8 + pulse * 0.8, 0xfacc15, 0.28, 0.7);
        drawLine(g, 12.5, -27.4, 12.5, -24.6, 0xfacc15, 0.7, 0.8);
        fillCircle(g, 12.5, -21.2, 0.7, 0xfacc15, 0.78);
    }

    if (isSelected) {
        const y = 16 + pulse * 0.8;
        fillCircle(g, -4, y, 1.6, themeColor, 0.75);
        fillCircle(g, 0, y + 1.2, 1.9, themeColor, 0.88);
        fillCircle(g, 4, y, 1.6, themeColor, 0.75);
    }

    if (agent.needsReview) {
        fillRoundRect(g, 12, -28, 9, 9, 2.5, 0xffa337, 0.94);
        drawLine(g, 14.2, -23.8, 16.1, -21.7, 0xffffff, 0.95, 1.2);
        drawLine(g, 16.1, -21.7, 19, -25.2, 0xffffff, 0.95, 1.2);
        strokeCircle(g, 16.5, -23.5, 6 + pulse, statusColor, 0.22, 0.8);
    }
}

function drawAgentLabels() {
    labelFX.children.forEach(c => c.__used = false);
    const labelAgents = S.liveAgents
        .map((agent, idx) => ({ agent, idx, v: S.visualAgents[agent.pid] }))
        .filter(({ agent, v }) => {
            if (!v || !agent.isRunning) return false;
            const pinned = isAgentPinned(agent);
            if (!IMPORTANT_STATUSES.has(agent.status) && !pinned) return false;
            return samePid(S.directorFocusPid, agent.pid) || agent.needsReview || samePid(S.selectedPid, agent.pid) || pinned;
        })
        .sort((a, b) => {
            if (samePid(a.agent.pid, S.directorFocusPid)) return -1;
            if (samePid(b.agent.pid, S.directorFocusPid)) return 1;
            if (a.agent.needsReview !== b.agent.needsReview) return a.agent.needsReview ? -1 : 1;
            if (isAgentPinned(a.agent) !== isAgentPinned(b.agent)) return isAgentPinned(a.agent) ? -1 : 1;
            return a.idx - b.idx;
        })
        .slice(0, S.directorMode ? 1 : 3);

    labelAgents.forEach(({ agent, idx, v }, labelIndex) => {
        const status = agent.status;
        const label = getLabel(labelIndex);
        const meta = STATUS_META[status] || STATUS_META.coding;
        const theme = AGENT_THEMES[idx % AGENT_THEMES.length];
        const t = S.animFrame + idx * 30;
        const isFocus = samePid(S.directorFocusPid, agent.pid);
        const isSelected = samePid(S.selectedPid, agent.pid);
        const pinned = isAgentPinned(agent);
        const highlighted = isFocus || isSelected || pinned;
        const width = isFocus ? 52 : isSelected ? 48 : pinned ? 48 : 44;
        label.position.set(v.x - width / 2, v.y + 29 + Math.sin(t * 0.04) * 1.2);
        clearGraphic(label.bg);
        fillRoundRect(label.bg, 0, 0, width, 11, 4, agent.needsReview ? 0xfffbeb : pinned ? 0xfff7d6 : 0xffffff, highlighted ? 0.92 : 0.84);
        strokeRoundRect(label.bg, 0, 0, width, 11, 4, agent.needsReview ? 0xffa337 : pinned ? 0xfacc15 : hexToNumber(theme.body), highlighted || agent.needsReview ? 0.7 : 0.34, 0.65);
        if (highlighted) {
            fillRoundRect(label.bg, 3, 3, 2.4, 5, 1.2, pinned || isFocus ? 0xfacc15 : hexToNumber(theme.body), 0.72);
        } else {
            fillRoundRect(label.bg, 4, 4, Math.min(width - 8, 9 + (t % 34) * 0.62), 3, 2, hexToNumber(meta.color), 0.62);
        }
        label.text.text = getStatusLabel(agent, status);
        label.text.style.fill = highlighted ? 0x182230 : 0x344054;
        label.text.position.set(width / 2, 5.8);
        label.__used = true;
        label.visible = true;
    });
    labelFX.children.forEach(c => {
        if (!c.__used) c.visible = false;
    });
}

function getAgentEmphasis(agent) {
    let score = 0;
    if (samePid(S.directorFocusPid, agent.pid)) score += 3;
    if (samePid(S.selectedPid, agent.pid)) score += 2;
    if (isSignalStale(agent)) score += 1.9;
    if (isAgentPinned(agent)) score += 1.7;
    if (agent.needsReview) score += 2.5;
    return Math.min(score, 4);
}

function getStatusLabel(agent, status) {
    const action = agentNextAction(agent, priorityContext());
    if (action.key === "review") return "검토";
    if (action.key === "focus") return samePid(S.directorFocusPid, agent.pid) ? "추적" : "선택";
    if (action.key === "stale") return "확인";
    if (action.key === "pinned") return "고정";
    if (action.key === "working") return "진행";
    return STATUS_META[status]?.label || status;
}

function getLabel(i) {
    const PIXI = window.PIXI;
    let root = labelFX.children[i];
    if (!root) {
        root = new PIXI.Container();
        const bg = new PIXI.Graphics();
        const text = new PIXI.Text({
            text: "",
            style: {
                fontFamily: "Pretendard, system-ui, sans-serif",
                fontSize: 4.5,
                fontWeight: "800",
                fill: 0x344054,
                align: "center",
            },
        });
        text.anchor?.set?.(0.5);
        root.addChild(bg, text);
        root.bg = bg;
        root.text = text;
        labelFX.addChild(root);
    }
    return root;
}

function ensureAmbientGraphics() {
    if (!ambient.__graphics) {
        ambient.__graphics = new window.PIXI.Graphics();
        ambient.addChild(ambient.__graphics);
    }
    return ambient.__graphics;
}

function clearGraphic(g) {
    if (!g) return;
    g.clear();
}

function fillCircle(g, x, y, r, color, alpha = 1) {
    if (typeof g.circle === "function") {
        g.circle(x, y, r).fill({ color, alpha });
    } else {
        g.beginFill(color, alpha);
        g.drawCircle(x, y, r);
        g.endFill();
    }
}

function strokeCircle(g, x, y, r, color, alpha = 1, width = 1) {
    if (typeof g.circle === "function") {
        g.circle(x, y, r).stroke({ color, alpha, width });
    } else {
        g.lineStyle(width, color, alpha);
        g.drawCircle(x, y, r);
    }
}

function fillEllipse(g, x, y, w, h, color, alpha = 1) {
    if (typeof g.ellipse === "function") {
        g.ellipse(x, y, w, h).fill({ color, alpha });
    } else {
        g.beginFill(color, alpha);
        g.drawEllipse(x, y, w, h);
        g.endFill();
    }
}

function strokeEllipse(g, x, y, w, h, color, alpha = 1, width = 1) {
    if (typeof g.ellipse === "function") {
        g.ellipse(x, y, w, h).stroke({ color, alpha, width });
    } else {
        g.lineStyle(width, color, alpha);
        g.drawEllipse(x, y, w, h);
    }
}

function drawLine(g, x1, y1, x2, y2, color, alpha = 1, width = 1) {
    if (typeof g.moveTo === "function" && typeof g.lineTo === "function" && typeof g.stroke === "function") {
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, alpha, width, cap: "round" });
    } else {
        g.lineStyle(width, color, alpha);
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
    }
}

function drawArc(g, cx, cy, r, start, end, color, alpha = 1, width = 1, segments = 12) {
    let prev = pointOnCircle(cx, cy, r, start);
    for (let i = 1; i <= segments; i++) {
        const angle = start + (end - start) * (i / segments);
        const p = pointOnCircle(cx, cy, r, angle);
        drawLine(g, prev.x, prev.y, p.x, p.y, color, alpha, width);
        prev = p;
    }
}

function fillRoundRect(g, x, y, w, h, r, color, alpha = 1) {
    if (typeof g.roundRect === "function") {
        g.roundRect(x, y, w, h, r).fill({ color, alpha });
    } else {
        g.beginFill(color, alpha);
        g.drawRoundedRect(x, y, w, h, r);
        g.endFill();
    }
}

function strokeRoundRect(g, x, y, w, h, r, color, alpha = 1, width = 1) {
    if (typeof g.roundRect === "function") {
        g.roundRect(x, y, w, h, r).stroke({ color, alpha, width });
    } else {
        g.lineStyle(width, color, alpha);
        g.drawRoundedRect(x, y, w, h, r);
    }
}

function fillTriangle(g, ax, ay, bx, by, cx, cy, color, alpha = 1) {
    if (typeof g.poly === "function") {
        g.poly([ax, ay, bx, by, cx, cy]).fill({ color, alpha });
    } else {
        g.beginFill(color, alpha);
        g.moveTo(ax, ay);
        g.lineTo(bx, by);
        g.lineTo(cx, cy);
        g.closePath();
        g.endFill();
    }
}

function hexToNumber(hex) {
    if (!hex || typeof hex !== "string") return 0x10b981;
    return Number.parseInt(hex.replace("#", ""), 16);
}

function timestampToMs(value) {
    if (!value) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function trimText(text, max) {
    const clean = String(text || "").trim();
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}
