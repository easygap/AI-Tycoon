// ============================================================
//  AI TYCOON — Demo mode (synthetic agents for showcase)
// ============================================================
//
// Generates fake agents that look like real Claude/Codex/Cursor sessions.
// Useful when:
//   • The user just opened the dashboard with no AI sessions running
//   • Recording marketing screenshots / videos
//   • Verifying UI without spinning up real agents
//
// All synthetic data flows through the same WebSocket-equivalent
// pipeline (handleState) so every visualisation behaves identically.

import { S, addLog } from "./state.js";

const KEY = "ai-tycoon-demo";

let timer = null;
let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";

const FAKE_PLATFORMS = [
    { platform: "claude", platformName: "Claude Code" },
    { platform: "claude", platformName: "Claude Code" },
    { platform: "cursor", platformName: "Cursor AI" },
    { platform: "codex",  platformName: "OpenAI Codex" },
    { platform: "copilot",platformName: "Copilot" },
    { platform: "ollama", platformName: "Ollama" },
];

const FAKE_PROJECTS = [
    "ai-tycoon", "growth-platform", "ecommerce-redesign", "billing-service",
    "search-rewrite", "tessera", "analytics-pipeline", "auth-overhaul",
    "atlas", "mobile-app", "experiments", "design-system",
];

const STATUS_POOL = ["coding", "thinking", "searching", "reviewing", "meeting", "idle"];

const FAKE_TASKS = [
    "Refactor billing flow", "Fix null deref in checkout", "Polish dark mode tokens",
    "Add E2E tests for auth", "Investigate slow dashboard query", "Update README screenshots",
    "Migrate to TanStack Query", "Wire new design system tokens", "Optimize bundle size",
    "Add admin export endpoint", "Triage Sentry errors", "Audit a11y on settings page",
    "Backfill missing analytics events", "Rewrite onboarding copy", "Spike: GraphQL adoption",
];

const FAKE_PROMPTS = [
    "Run the test suite and report any failures",
    "Check the audit log for the past hour",
    "Why is the build slow on CI?",
    "Add a feature flag for the new flow",
    "Generate a migration plan from REST to GraphQL",
    "Summarize today's PR reviews",
    "Set up Playwright for E2E tests",
    "Investigate Tuesday's outage",
    "Audit recent dependency upgrades",
    "Draft a release notes summary",
];

function rngStable(seed) {
    let x = seed >>> 0;
    return () => {
        x = (x * 1664525 + 1013904223) >>> 0;
        return (x & 0xffff) / 0x10000;
    };
}

function makeAgent(idx, tickCount) {
    const r = rngStable(idx * 7919 + 31);
    const platMeta = FAKE_PLATFORMS[idx % FAKE_PLATFORMS.length];
    const project = FAKE_PROJECTS[(idx * 5 + Math.floor(tickCount / 12)) % FAKE_PROJECTS.length];
    // Status drifts over time but isn't fully random
    const statusBias = Math.floor((tickCount + idx * 4) / 6) % STATUS_POOL.length;
    const status = STATUS_POOL[statusBias];

    const taskTitles = [
        FAKE_TASKS[(idx * 3 + Math.floor(tickCount / 14)) % FAKE_TASKS.length],
        FAKE_TASKS[(idx * 11 + Math.floor(tickCount / 20)) % FAKE_TASKS.length],
        FAKE_TASKS[(idx * 17 + Math.floor(tickCount / 8)) % FAKE_TASKS.length],
    ];
    const tasks = taskTitles.map((subject, ti) => ({
        id: `demo-task-${idx}-${ti}`,
        subject,
        activeForm: subject.replace(/^(\w+)/, (m) => m.toLowerCase() + "ing"),
        description: subject,
        status: ti === 0 ? "in_progress" : (ti === 1 ? "pending" : "completed"),
        blocks: [], blockedBy: [],
    }));

    const promptText = FAKE_PROMPTS[(idx * 5 + Math.floor(tickCount / 10)) % FAKE_PROMPTS.length];

    // Occasionally flag review needed
    const needsReview = (idx + Math.floor(tickCount / 18)) % 9 === 3;

    return {
        pid: `demo-${idx}`,
        sessionId: `demo-session-${idx}`,
        platform: platMeta.platform,
        platformName: platMeta.platformName,
        role: ["developer", "planner", "designer", "qa", "reviewer"][idx % 5],
        needsReview,
        projectName: project,
        cwd: `/repos/${project}`,
        isRunning: true,
        memoryMB: 120 + Math.round(r() * 880),
        status,
        currentTask: tasks[0] ? {
            id: tasks[0].id,
            subject: tasks[0].subject,
            description: tasks[0].description,
            status: tasks[0].status,
        } : null,
        currentWork: {
            prompt: promptText,
            timestamp: Date.now() - Math.floor(r() * 600000),
        },
        tasks,
        completedTasks: 5 + Math.floor(tickCount * 0.4) + idx, // grows over time
        totalTasks: 9 + Math.floor(tickCount * 0.4) + idx + 2,
        startTime: Date.now() - Math.floor(r() * 8 * 60 * 60 * 1000),
        signals: {
            sources: ["demo"],
            lastSeenAt: Date.now(),
            lastActivityAt: Date.now() - Math.floor(r() * 60000),
        },
    };
}

let tickCount = 0;

async function pushSyntheticState() {
    tickCount++;
    // Lazy import to avoid circular dep
    const { handleState } = await import("./ws.js");
    const count = 4 + (tickCount % 5); // 4–8 agents
    const agents = [];
    for (let i = 0; i < count; i++) agents.push(makeAgent(i, tickCount));

    handleState({
        agents,
        diagnostics: {
            sessionCount: agents.length,
            externalCount: 0,
            codexSessionCount: 0,
            cursorWorkspaceCount: 0,
            isDemo: true,
        },
    });
}

export function startDemo() {
    if (timer) return;
    addLog("데모 모드 ON · 합성 에이전트 표시", "system");
    pushSyntheticState();
    timer = setInterval(pushSyntheticState, 3000);
    if (typeof window !== "undefined") {
        window.__aiTycoonConnected = true;
    }
}

export function stopDemo() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    addLog("데모 모드 OFF", "system");
    // Clear synthetic agents — real reconnection will resupply
    S.liveAgents = [];
    S.visualAgents = {};
    S.visualSubAgents = {};
    Object.keys(S.memoryHistory).forEach(k => delete S.memoryHistory[k]);
}

export function isDemoEnabled() { return enabled; }
export async function setDemoEnabled(v) {
    const next = !!v;
    const changed = next !== enabled;
    enabled = next;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
    if (enabled) startDemo();
    else stopDemo();
    // 토글 한 번 누른 결과를 토스트로 알려줘서 "어, 진짜 직원이 합류한 건가?" 혼란 방지.
    // 초기 자동 시작 (boot 시 enabled === true 인 경우) 에는 토스트 안 띄움.
    if (changed && typeof window !== "undefined") {
        try {
            const lang = window.aiTycoonI18n?.getLang?.() || "ko";
            const title = enabled
                ? (lang === "en" ? "Demo mode on" : "데모 모드 ON")
                : (lang === "en" ? "Demo mode off" : "데모 모드 OFF");
            const body = enabled
                ? (lang === "en"
                    ? "Fake agents will appear. Click again to stop."
                    : "합성 직원이 등장합니다. 한 번 더 누르면 종료돼요.")
                : (lang === "en" ? "Showing only real agents now." : "이제 실제 에이전트만 표시됩니다.");
            window.aiTycoonToasts?.show?.("info", title, body);
        } catch { /* 알림 실패 무시 */ }
    }
}
export function toggleDemo() { return setDemoEnabled(!enabled); }

// Auto-start on load if previously enabled
if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        if (enabled) setTimeout(startDemo, 1000);
    });
    window.aiTycoonDemo = { isEnabled: isDemoEnabled, toggle: toggleDemo, setEnabled: setDemoEnabled, startDemo, stopDemo };
}
