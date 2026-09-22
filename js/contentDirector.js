// ============================================================
//  AI TYCOON - Session content direction
// ============================================================

function count(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function resolveSessionTarget(activeAgents) {
    return Math.min(8, Math.max(3, count(activeAgents) + 2));
}

// Keep one-release compatibility while an older cached panel.js is replaced.
export function resolveDailyTarget(yesterday) {
    const previous = count(yesterday?.completedMax);
    if (previous >= 20) return 25;
    if (previous >= 10) return 15;
    if (previous >= 5) return 10;
    return 5;
}

const COPY = {
    ko: {
        kicker: "지금 우리 회사는",
        mission: "이번에 끝낸 일",
        remaining: value => value > 0 ? `${value}개 더 끝내면 목표 달성!` : "목표를 달성했어요",
        achievement: (value, total) => `배지 ${value}/${total}`,
        phases: {
            offline: {
                label: "연결 끊김",
                title: "잠깐, 연결이 끊겼어요",
                detail: "컴퓨터에서 AI Tycoon이 실행 중인지 확인해 주세요.",
                icon: "solar:wi-fi-router-minimalistic-linear",
                tone: "offline",
                action: "연결 상태 보기",
                actionIcon: "solar:shield-warning-linear",
                actionKey: "health",
            },
            onboarding: {
                label: "첫 시작",
                title: "아직 출근한 직원이 없어요",
                detail: "Claude Code나 Codex에서 일을 시작해 보세요. 여기서 직원의 모습을 볼 수 있어요.",
                icon: "solar:users-group-rounded-linear",
                tone: "ready",
                action: "먼저 구경하기",
                actionIcon: "solar:play-circle-bold",
                actionKey: "demo",
            },
            decision: {
                label: "확인 필요",
                title: value => `확인할 일이 ${value}개 있어요`,
                detail: "어떤 일을 하고 있는지 열어볼까요?",
                icon: "solar:clipboard-check-linear",
                tone: "attention",
                action: "확인할 일 보기",
                actionIcon: "solar:clipboard-check-bold",
                actionKey: "review",
            },
            recovery: {
                label: "새 소식 없음",
                title: value => `${value}명의 소식이 뜸해요`,
                detail: "작업이 멈췄는지, 오래 걸리는 일인지 AI 도구에서 확인해 주세요.",
                icon: "solar:radar-2-linear",
                tone: "warn",
                action: "직원 상태 보기",
                actionIcon: "solar:radar-2-bold",
                actionKey: "stale",
            },
            achievement: {
                label: "목표 달성",
                title: "하나씩 끝내고 있어요",
                detail: "끝낸 일은 기록에서 다시 볼 수 있어요.",
                icon: "solar:cup-star-linear",
                tone: "complete",
                action: "끝낸 일 보기",
                actionIcon: "solar:chart-2-bold",
                actionKey: "insights",
            },
            production: {
                label: "일하는 중",
                title: value => `${value}명이 일하고 있어요`,
                detail: "직원을 누르면 지금 무슨 일을 하는지 볼 수 있어요.",
                icon: "solar:bolt-circle-linear",
                tone: "live",
                action: "일하는 직원 보기",
                actionIcon: "solar:target-bold",
                actionKey: "working",
            },
            momentum: {
                label: "작업 완료",
                title: value => `오늘 ${value}개의 작업을 완료했어요`,
                detail: "끝낸 일은 기록에 모아뒀어요.",
                icon: "solar:check-circle-linear",
                tone: "live",
                action: "다음 직원 보기",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "all",
            },
            ready: {
                label: "다음 작업 대기",
                title: "직원들이 잠깐 쉬고 있어요",
                detail: "AI 도구에서 새 일을 시작하면 다시 움직여요.",
                icon: "solar:flag-2-linear",
                tone: "ready",
                action: "쉬는 직원 보기",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "idle",
            },
        },
        loop: {
            observe: "출근",
            execute: "일하는 중",
            decide: "확인 필요",
            achieve: "완료",
        },
    },
    en: {
        kicker: "Today's operation",
        mission: "Completed this session",
        remaining: value => value > 0 ? `${value} to goal` : "Goal complete",
        achievement: (value, total) => `Badges ${value}/${total}`,
        phases: {
            offline: {
                label: "Connection check",
                title: "Check the workspace connection",
                detail: "Today's operation starts when live status begins to arrive.",
                icon: "solar:wi-fi-router-minimalistic-linear",
                tone: "offline",
                action: "View connection",
                actionIcon: "solar:shield-warning-linear",
                actionKey: "health",
            },
            onboarding: {
                label: "Team setup",
                title: "Connect your first agent",
                detail: "Detect a live session or preview the operation with a demo team.",
                icon: "solar:users-group-rounded-linear",
                tone: "ready",
                action: "Start demo team",
                actionIcon: "solar:play-circle-bold",
                actionKey: "demo",
            },
            decision: {
                label: "Decision needed",
                title: value => `Clear ${value} review request${value === 1 ? "" : "s"}`,
                detail: "Resolve waiting decisions to keep the team's work moving.",
                icon: "solar:clipboard-check-linear",
                tone: "attention",
                action: "View pending reviews",
                actionIcon: "solar:clipboard-check-bold",
                actionKey: "review",
            },
            recovery: {
                label: "Recover flow",
                title: value => `Check ${value} delayed signal${value === 1 ? "" : "s"}`,
                detail: "Inspect stalled sessions before they turn into hidden waiting time.",
                icon: "solar:radar-2-linear",
                tone: "warn",
                action: "View delayed signals",
                actionIcon: "solar:radar-2-bold",
                actionKey: "stale",
            },
            achievement: {
                label: "Goal complete",
                title: "Today's operation goal is complete",
                detail: "Review the result and keep the next work cycle moving.",
                icon: "solar:cup-star-linear",
                tone: "complete",
                action: "View today's results",
                actionIcon: "solar:chart-2-bold",
                actionKey: "insights",
            },
            production: {
                label: "In production",
                title: value => `${value} agent${value === 1 ? " is" : "s are"} focused`,
                detail: "Follow the highest-priority work and wait for completion or review signals.",
                icon: "solar:bolt-circle-linear",
                tone: "live",
                action: "Follow priority work",
                actionIcon: "solar:target-bold",
                actionKey: "working",
            },
            momentum: {
                label: "Building momentum",
                title: value => `${value} task${value === 1 ? "" : "s"} completed today`,
                detail: "Start the next task to move closer to today's goal.",
                icon: "solar:check-circle-linear",
                tone: "live",
                action: "View next agent",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "all",
            },
            ready: {
                label: "Ready for work",
                title: "The team is waiting for the next direction",
                detail: "Select an idle agent to review its status and recent work.",
                icon: "solar:flag-2-linear",
                tone: "ready",
                action: "View idle agents",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "idle",
            },
        },
        loop: {
            observe: "Connect",
            execute: "Work",
            decide: "Decide",
            achieve: "Finish",
        },
    },
};

function phaseKey(input) {
    if (!input.connected) return "offline";
    if (input.active === 0) return "onboarding";
    if (input.review > 0) return "decision";
    if (input.stale > 0) return "recovery";
    if (input.completed >= input.target) return "achievement";
    if (input.working > 0) return "production";
    if (input.completed > 0) return "momentum";
    return "ready";
}

function loopState({ complete, current, attention = false }) {
    if (attention) return "attention";
    if (complete) return "complete";
    if (current) return "current";
    return "pending";
}

export function buildContentDirector(input = {}) {
    const language = input.lang === "en" ? "en" : "ko";
    const copy = COPY[language];
    const active = count(input.active);
    const working = count(input.working);
    const review = count(input.review);
    const stale = count(input.stale);
    const completed = count(input.completed);
    const target = Math.max(1, count(input.target) || 5);
    const connected = Boolean(input.connected);
    const key = phaseKey({ connected, active, working, review, stale, completed, target });
    const phase = copy.phases[key];
    const valueForTitle = key === "decision"
        ? review
        : key === "recovery"
            ? stale
            : key === "production"
                ? working
                : completed;
    const percent = Math.min(100, Math.round((completed / target) * 100));
    const remaining = Math.max(0, target - completed);
    const achievementUnlocked = count(input.achievementUnlocked);
    const achievementTotal = count(input.achievementTotal);

    return {
        key,
        tone: phase.tone,
        icon: phase.icon,
        label: phase.label,
        title: typeof phase.title === "function" ? phase.title(valueForTitle) : phase.title,
        detail: phase.detail,
        kicker: copy.kicker,
        mission: {
            label: copy.mission,
            value: completed,
            target,
            percent,
            remaining,
            remainingLabel: copy.remaining(remaining),
        },
        achievementLabel: achievementTotal > 0
            ? copy.achievement(achievementUnlocked, achievementTotal)
            : "",
        primaryAction: {
            key: phase.actionKey,
            label: phase.action,
            icon: phase.actionIcon,
            tone: phase.tone,
        },
        loop: [
            {
                key: "observe",
                label: copy.loop.observe,
                value: active,
                state: loopState({ complete: connected && active > 0, current: connected && active === 0 }),
            },
            {
                key: "execute",
                label: copy.loop.execute,
                value: working,
                state: loopState({ complete: completed > 0, current: working > 0 }),
            },
            {
                key: "decide",
                label: copy.loop.decide,
                value: review,
                state: loopState({ complete: connected && active > 0 && review === 0, current: false, attention: review > 0 }),
            },
            {
                key: "achieve",
                label: copy.loop.achieve,
                value: completed,
                state: loopState({ complete: completed >= target, current: completed > 0 }),
            },
        ],
    };
}
