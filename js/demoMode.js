// A stable six-person demo follows the same event pipeline as live agents.
import { S, addLog } from "./state.js";

const KEY = "ai-tycoon-demo";
let enabled = false;
try { enabled = new URLSearchParams(location.search).get("demo") === "1" || localStorage.getItem(KEY) === "true"; } catch { /* storage unavailable */ }
let timer = null, tick = 0, generation = 0;
const started = Date.now();
const platforms = ["claude", "codex", "cursor", "claude", "ollama", "copilot"];
const names = ["Claude Code", "OpenAI Codex", "Cursor", "Claude Code", "Ollama", "GitHub Copilot"];
const projects = ["작업실 라디오", "오늘의 날씨", "작업실 라디오", "동네 서점", "오늘의 날씨", "동네 서점"];
const koTasks = ["작업 완료 알림 다듬기", "날씨 카드에 일몰 시간 넣기", "배경음악 볼륨 저장하기", "장바구니 흐름 검토하기", "지역별 예보 비교하기", "주문 내역 테스트 작성하기"];
const enTasks = ["Polish completion cues", "Add sunset times", "Remember music volume", "Review the checkout flow", "Compare local forecasts", "Test order history"];

function makeAgent(index) {
    const phase = (tick + index * 2) % 16;
    const cycle = Math.floor((tick + index * 2) / 16);
    const needsReview = index === 3 && phase >= 5 && phase < 12;
    const status = needsReview ? "reviewing" : phase < 5 ? "coding" : phase < 8 ? "thinking" : phase < 11 ? "searching" : phase < 14 ? "coding" : "idle";
    const en = window.aiTycoonI18n?.getLang?.() === "en";
    const subject = (en ? enTasks : koTasks)[index];
    const completedTasks = 3 + index + cycle;
    const tasks = [
        { id: `demo-${index}-${cycle}`, subject, activeForm: subject, description: subject, status: phase >= 14 ? "completed" : "in_progress", blocks: [], blockedBy: [] },
        { id: `demo-${index}-ready`, subject: en ? "Prepare next release" : "다음 배포 준비하기", status: "pending", blocks: [], blockedBy: [] },
    ];
    return {
        pid: `demo-${index}`, sessionId: `demo-session-${index}`, platform: platforms[index], platformName: names[index],
        role: ["developer", "planner", "designer", "reviewer", "developer", "qa"][index],
        projectName: en ? ["office-radio", "weather", "office-radio", "bookshop", "weather", "bookshop"][index] : projects[index],
        cwd: `/demo/project-${index % 3}`, isRunning: true, status, needsReview,
        memoryMB: 180 + index * 63 + (tick % 7) * 3,
        currentWork: { prompt: subject, timestamp: started + cycle * 80000 },
        currentTask: tasks[0], tasks, completedTasks, totalTasks: completedTasks + 2,
        startTime: started - (index + 1) * 600000,
        signals: { sources: ["demo"], lastSeenAt: Date.now(), lastActivityAt: Date.now() },
    };
}
function resetScene() {
    S.liveAgents = []; S.visualAgents = {}; S.visualSubAgents = {};
    S.workEvents = []; S.activityLog = []; S.bossQueue = []; S.bossActivePid = null;
    S.selectedPid = null; S.detailPid = null; S.directorFocusPid = null;
    S.hasHydratedLiveState = false; S.memoryHistory = {};
    S.particles = []; S.heartParticles = [];
    document.getElementById("activity-log")?.replaceChildren();
    document.getElementById("toast-stack")?.replaceChildren();
}
async function pushSyntheticState() {
    const token = generation;
    const { handleState } = await import("./ws.js");
    if (!enabled || token !== generation) return;
    const agents = Array.from({ length: 6 }, (_, i) => makeAgent(i));
    handleState({
        agents, totalTasks: agents.reduce((n, a) => n + a.totalTasks, 0),
        completedTasks: agents.reduce((n, a) => n + a.completedTasks, 0),
        diagnostics: { sessionCount: 6, externalCount: 0, codexSessionCount: 1, cursorWorkspaceCount: 1, isDemo: true },
    });
    tick++;
}
export function startDemo() {
    if (timer) return;
    enabled = true; generation++; tick = 0; resetScene();
    addLog(window.aiTycoonI18n?.getLang?.() === "en" ? "Exploring the demo office" : "데모 작업실을 둘러보는 중입니다", "system");
    void pushSyntheticState(); timer = setInterval(pushSyntheticState, 5000);
}
export function stopDemo() {
    enabled = false; generation++;
    if (timer) clearInterval(timer); timer = null; resetScene();
    import("./ws.js").then(({ restoreLiveState }) => { if (!enabled) restoreLiveState(); });
}
export function isDemoEnabled() { return enabled; }
export async function setDemoEnabled(value) {
    const changed = enabled !== !!value;
    try { localStorage.setItem(KEY, value ? "true" : "false"); } catch { /* optional persistence */ }
    if (value) startDemo(); else stopDemo();
    if (changed) window.aiTycoonToasts?.show?.("info", value ? "데모 작업실을 열었습니다" : "실제 작업실로 돌아왔습니다");
}
export function toggleDemo() { return setDemoEnabled(!enabled); }
if (typeof window !== "undefined") {
    window.aiTycoonDemo = { isEnabled: isDemoEnabled, toggle: toggleDemo, setEnabled: setDemoEnabled, startDemo, stopDemo };
    document.addEventListener("DOMContentLoaded", () => { if (enabled) startDemo(); });
}
