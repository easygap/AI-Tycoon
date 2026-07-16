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
        kicker: "오늘의 운영",
        mission: "이번 세션 완료",
        remaining: value => value > 0 ? `목표까지 ${value}개` : "세션 목표 달성",
        achievement: (value, total) => `배지 ${value}/${total}`,
        phases: {
            offline: {
                label: "연결 점검",
                title: "작업실 연결을 확인하세요",
                detail: "실시간 상태가 들어오면 오늘의 운영 흐름이 시작됩니다.",
                icon: "solar:wi-fi-router-minimalistic-linear",
                tone: "offline",
                action: "연결 상태 보기",
                actionIcon: "solar:shield-warning-linear",
                actionKey: "health",
            },
            onboarding: {
                label: "팀 준비",
                title: "첫 직원을 작업실에 연결하세요",
                detail: "실제 세션을 감지하거나 데모 팀으로 운영 흐름을 미리 볼 수 있어요.",
                icon: "solar:users-group-rounded-linear",
                tone: "ready",
                action: "데모 팀 시작",
                actionIcon: "solar:play-circle-bold",
                actionKey: "demo",
            },
            decision: {
                label: "결정 필요",
                title: value => `검토 ${value}건을 먼저 정리하세요`,
                detail: "결정을 기다리는 작업을 해소하면 팀의 흐름이 다시 이어집니다.",
                icon: "solar:clipboard-check-linear",
                tone: "attention",
                action: "검토 대기 보기",
                actionIcon: "solar:clipboard-check-bold",
                actionKey: "review",
            },
            recovery: {
                label: "흐름 복구",
                title: value => `신호가 늦은 직원 ${value}명을 확인하세요`,
                detail: "멈춘 세션을 먼저 확인하면 잘못된 대기 시간을 줄일 수 있어요.",
                icon: "solar:radar-2-linear",
                tone: "warn",
                action: "신호 지연 보기",
                actionIcon: "solar:radar-2-bold",
                actionKey: "stale",
            },
            achievement: {
                label: "목표 달성",
                title: "오늘의 운영 목표를 달성했어요",
                detail: "성과 기록을 확인하고 다음 작업 흐름을 이어가세요.",
                icon: "solar:cup-star-linear",
                tone: "complete",
                action: "오늘의 성과 보기",
                actionIcon: "solar:chart-2-bold",
                actionKey: "insights",
            },
            production: {
                label: "제작 진행",
                title: value => `${value}명이 작업에 집중하고 있어요`,
                detail: "가장 중요한 작업을 따라가며 완료와 검토 신호를 기다리세요.",
                icon: "solar:bolt-circle-linear",
                tone: "live",
                action: "핵심 작업 따라가기",
                actionIcon: "solar:target-bold",
                actionKey: "working",
            },
            momentum: {
                label: "성과 축적",
                title: value => `오늘 ${value}개의 작업을 완료했어요`,
                detail: "다음 작업을 시작하면 오늘의 목표에 더 가까워집니다.",
                icon: "solar:check-circle-linear",
                tone: "live",
                action: "다음 직원 보기",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "all",
            },
            ready: {
                label: "다음 작업 대기",
                title: "팀이 다음 지시를 기다리고 있어요",
                detail: "대기 중인 직원을 선택해 현재 상태와 최근 작업을 확인하세요.",
                icon: "solar:flag-2-linear",
                tone: "ready",
                action: "대기 직원 보기",
                actionIcon: "solar:users-group-rounded-bold",
                actionKey: "idle",
            },
        },
        loop: {
            observe: "연결",
            execute: "진행",
            decide: "결정",
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
