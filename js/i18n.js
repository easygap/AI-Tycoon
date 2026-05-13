// ============================================================
//  AI TYCOON — Lightweight KO/EN i18n
// ============================================================
//
// Two-language toggle for the most user-visible strings.  Most of the
// canvas-rendered Korean dialogue (NPCs, agent chat, role banter) stays
// in Korean because that's the product personality.  This file covers:
//   • Header / connection states
//   • Modal titles & section headers
//   • Welcome card
//   • Status labels (used across UI)
//   • Time-of-day band
//   • Empty / disconnect copy
//
// Activate via the globe button in the header; persisted in localStorage.

const KEY = "ai-tycoon-lang";

const DICT = {
    ko: {
        // Brand & connection
        "brand.name": "AI Tycoon",
        "conn.connecting": "연결 중",
        "conn.live": "실시간",
        "conn.lost": "서버 응답 없음",
        // Header tooltips
        "header.density": "Pixi 표시 밀도",
        "header.darkToggle": "다크모드 전환",
        "header.panelToggle": "사이드 패널 토글",
        "header.insights": "작업실 인사이트",
        "header.shortcuts": "키보드 단축키",
        "header.lang": "언어 전환",
        "header.settings": "설정",
        "header.snapshot": "작업실 스냅샷 저장",
        "header.install": "앱으로 설치",
        "header.installLabel": "설치",
        "shortcuts.snapshot": "스냅샷 PNG 저장",
        "shortcuts.perfHud": "성능 오버레이 토글",
        // Settings modal
        "settings.kicker": "설정",
        "settings.title": "취향대로 작업실 꾸미기",
        "settings.appearance": "모양",
        "settings.darkMode": "다크 모드",
        "settings.language": "언어",
        "settings.visualDensity": "시각 밀도",
        "settings.workspaceName": "작업실 이름",
        "settings.liveHud": "실시간 HUD",
        "settings.workStream": "작업 스트림",
        "settings.officeTheme": "오피스 테마",
        "settings.themeClassic": "클래식",
        "settings.themeCafe": "카페",
        "settings.themeForest": "숲속",
        "settings.themeMidnight": "심야",
        "settings.themeSakura": "사쿠라",
        "settings.themeOcean": "바다",
        "settings.seasonOverride": "시즌 장식",
        "settings.seasonAuto": "자동 (월 기준)",
        "settings.seasonNone": "장식 없음",
        "settings.seasonSpring": "봄 벚꽃",
        "settings.seasonHalloween": "할로윈",
        "settings.seasonWinter": "크리스마스",
        "settings.audio": "소리",
        "settings.soundFx": "효과음",
        "settings.volume": "볼륨",
        "settings.notifications": "알림",
        "settings.desktopNotify": "데스크탑 알림",
        "settings.notifyHelp": "태스크 완료 / 검토 요청이 생기면 탭이 백그라운드일 때 OS 알림으로 알려드려요.",
        "settings.demo": "데모",
        "settings.demoMode": "합성 직원 표시",
        "settings.demoModeHelp": "실제 에이전트가 없을 때 가상의 직원으로 작업실을 시연합니다 (마케팅 · 스크린샷용).",
        "settings.timeOverride": "시간대 강제",
        "settings.timeClear": "실시간",
        "settings.timeOverrideHelp": "데모/스크린샷용으로 창밖 하늘과 분위기를 특정 시각으로 고정합니다.",
        "settings.data": "데이터",
        "settings.about": "정보",
        "settings.help": "도움말",
        "settings.replayTour": "투어 다시 보기",
        "settings.replayTips": "팁 다시 켜기",
        "settings.timeScrub": "시간 스크럽",
        "settings.viewSource": "GitHub 저장소 열기",
        "settings.reportIssue": "버그 / 요청 제보",
        "settings.backup": "백업 내보내기",
        "settings.exportCsv": "일자별 통계 CSV 받기",
        "settings.restore": "백업 가져오기",
        "settings.backupHelp": "현재 환경설정·통계·업적을 JSON 파일로 내보내거나, 같은 형식의 파일을 불러와 복원합니다.",
        "settings.resetStats": "통계 초기화",
        "settings.resetAchievements": "업적 초기화",
        "shortcuts.settings": "설정 열기",
        // Density menu
        "density.auto": "자동",
        "density.minimal": "저자극",
        "density.focus": "집중",
        "density.balanced": "균형",
        "density.rich": "풍부",
        // Welcome
        "welcome.kicker": "처음 오셨군요",
        "welcome.title": "AI Tycoon에 오신 걸 환영합니다",
        "welcome.desc": "내 컴퓨터에서 동작 중인 AI 에이전트들의 작업 상태를 픽셀 아트 오피스로 한눈에 봐보세요.",
        "welcome.feat1": "<strong>Claude Code · Cursor · Codex</strong> 등을 실행하면 작업실에 캐릭터로 등장해요.",
        "welcome.feat2": "코딩 · 생각 · 검색 · 리뷰 상태가 <strong>실시간</strong>으로 표시됩니다.",
        "welcome.feat3": "시계 시간에 따라 <strong>창밖 하늘</strong>이 새벽·낮·노을·밤으로 바뀌어요.",
        "welcome.feat4": "헤더의 <strong>시각 밀도</strong>·<strong>다크모드</strong>·<strong>디렉터 모드</strong>로 보기를 바꿔보세요.",
        "welcome.primary": "작업실 둘러보기",
        "welcome.secondary": "다음에 다시 보지 않기",
        // Insights modal
        "insights.kicker": "실시간 인사이트",
        "insights.title": "오늘의 작업실",
        "insights.activeAgents": "활성 에이전트",
        "insights.completed": "완료 태스크",
        "insights.ongoing": "진행 중",
        "insights.totalRam": "총 메모리",
        "insights.platforms": "플랫폼 분포",
        "insights.topProjects": "활발한 프로젝트 TOP 5",
        "insights.statusDist": "상태 분포",
        "insights.history": "최근 7일 추이",
        "insights.hourly": "시간대별 활동",
        "insights.recentActivity": "최근 활동",
        "insights.achievements": "업적",
        "project.kicker": "프로젝트",
        "project.agents": "참여 직원",
        "project.platforms": "플랫폼",
        "project.agentList": "참여 직원",
        "project.tasks": "최근 태스크",
        "project.empty": "이 프로젝트에 활성 직원이 없어요.",
        "project.emptyTasks": "기록된 태스크가 없어요.",
        "insights.deltaSuffix": "전일대비",
        "insights.completedLabel": "완료 태스크",
        "insights.emptyPlatforms": "감지된 에이전트가 없어요.",
        "insights.emptyProjects": "아직 프로젝트가 없어요.",
        "insights.emptyHistory": "아직 누적 데이터가 없어요. 작업실을 켜둘수록 풍부해져요.",
        "insights.emptyFeed": "아직 활동 기록이 없어요.",
        "insights.emptyStatus": "상태 정보 없음",
        "insights.legendTasks": "완료 태스크",
        "insights.legendAgents": "최대 동시 직원",
        // Shortcuts modal
        "shortcuts.kicker": "단축키",
        "shortcuts.title": "키보드 한 번에 끝내기",
        "shortcuts.navGroup": "탐색",
        "shortcuts.screenGroup": "화면",
        "shortcuts.canvasGroup": "캔버스",
        "shortcuts.searchFocus": "에이전트 검색 포커스",
        "shortcuts.searchAlt": "에이전트 검색 (대체)",
        "shortcuts.escClose": "검색·모달 닫기",
        "shortcuts.darkToggle": "다크 모드 전환",
        "shortcuts.focusActive": "가장 활발한 직원 포커스",
        "shortcuts.resetView": "전체 보기로 리셋",
        "shortcuts.help": "이 도움말 열기",
        "shortcuts.insights": "인사이트 열기",
        "shortcuts.zoom": "줌 인 / 아웃",
        "shortcuts.zoomReset": "줌 리셋",
        "shortcuts.panning": "패닝",
        "shortcuts.dblZoom": "줌 리셋",
        // Sidebar
        "panel.agents": "에이전트",
        "panel.searchPlaceholder": "직원, 프로젝트, 작업 검색",
        "panel.recentActivity": "최근 활동",
        "panel.filterAll": "전체",
        "panel.filterCoding": "코딩 중",
        "panel.filterIdle": "대기",
        "panel.filterOffline": "오프라인",
        "panel.close": "닫기",
        // Status meta
        "status.coding": "코딩 중",
        "status.thinking": "생각 중",
        "status.searching": "검색 중",
        "status.coffee": "커피 타임",
        "status.meeting": "미팅",
        "status.reviewing": "리뷰 중",
        "status.idle": "대기",
        "status.offline": "오프라인",
        // Time of day
        "tod.deepNight": "심야",
        "tod.dawn": "새벽",
        "tod.morning": "아침",
        "tod.noon": "한낮",
        "tod.afternoon": "오후",
        "tod.dusk": "황혼",
        "tod.evening": "저녁",
        "tod.night": "밤",
        // HUD
        "hud.live": "라이브 연결",
        "hud.waiting": "연결 대기",
        "hud.realtimeOffice": "실시간 작업실",
        "hud.focus": "포커스",
        "hud.standby": "대기 중",
        "hud.collectingStatus": "에이전트 상태 수집 중",
        "hud.metricActive": "활성",
        "hud.metricWorking": "작업",
        "hud.metricReview": "검토",
        "hud.director": "디렉터",
        "hud.directorTitle": "가장 중요한 직원 자동 추적",
        "hud.focusTitle": "가장 활발한 직원 보기",
        "hud.fullView": "전체 보기",
        // Empty state
        "empty.waitingTitle": "직원을 기다리고 있어요",
        "empty.connectingTitle": "서버에 연결하는 중",
        "empty.signalCount": "{0}개 세션 · {1}개 AI 신호 감지",
        "empty.justWait": "잠시만요…",
        "empty.tryRunning": "이 도구 중 하나를 실행해 보세요",
        "empty.ctaKicker": "아직 직원이 없네요",
        "empty.ctaTitle": "데모 모드로 미리 보기",
        "empty.ctaDesc": "실제 AI 세션이 없어도 합성 직원으로 작업실을 둘러볼 수 있어요.",
        "empty.ctaButton": "데모 시작",
        "empty.serverWaiting": "서버 응답 대기 중…",
        "empty.checkServer": "npm start 가 실행 중인지 확인해 주세요",
    },
    en: {
        "brand.name": "AI Tycoon",
        "conn.connecting": "Connecting",
        "conn.live": "Live",
        "conn.lost": "Server unreachable",
        "header.density": "Pixi visual density",
        "header.darkToggle": "Toggle dark mode",
        "header.panelToggle": "Toggle side panel",
        "header.insights": "Workspace insights",
        "header.shortcuts": "Keyboard shortcuts",
        "header.lang": "Switch language",
        "header.settings": "Settings",
        "header.snapshot": "Save workspace snapshot",
        "header.install": "Install as app",
        "header.installLabel": "Install",
        "shortcuts.snapshot": "Save snapshot PNG",
        "shortcuts.perfHud": "Toggle performance overlay",
        "settings.kicker": "SETTINGS",
        "settings.title": "Tune your workspace",
        "settings.appearance": "Appearance",
        "settings.darkMode": "Dark mode",
        "settings.language": "Language",
        "settings.visualDensity": "Visual density",
        "settings.workspaceName": "Workspace name",
        "settings.liveHud": "Live HUD",
        "settings.workStream": "Work stream",
        "settings.officeTheme": "Office theme",
        "settings.themeClassic": "Classic",
        "settings.themeCafe": "Cafe",
        "settings.themeForest": "Forest",
        "settings.themeMidnight": "Midnight",
        "settings.themeSakura": "Sakura",
        "settings.themeOcean": "Ocean",
        "settings.seasonOverride": "Seasonal decor",
        "settings.seasonAuto": "Auto (by month)",
        "settings.seasonNone": "Off",
        "settings.seasonSpring": "Spring blossoms",
        "settings.seasonHalloween": "Halloween",
        "settings.seasonWinter": "Christmas",
        "settings.audio": "Sound",
        "settings.soundFx": "Sound effects",
        "settings.volume": "Volume",
        "settings.notifications": "Notifications",
        "settings.desktopNotify": "Desktop notifications",
        "settings.notifyHelp": "Get an OS notification for task done / review requests when the tab is in the background.",
        "settings.demo": "Demo",
        "settings.demoMode": "Show synthetic staff",
        "settings.demoModeHelp": "Populate the office with fake agents — handy for marketing screenshots or when nothing else is running.",
        "settings.timeOverride": "Force time of day",
        "settings.timeClear": "Real-time",
        "settings.timeOverrideHelp": "Lock the sky and ambient mood to a specific clock time, for demos & screenshots.",
        "settings.data": "Data",
        "settings.about": "About",
        "settings.help": "Help",
        "settings.replayTour": "Replay tour",
        "settings.replayTips": "Show tips again",
        "settings.timeScrub": "Scrub time",
        "settings.viewSource": "Open GitHub repo",
        "settings.reportIssue": "Report bug / request",
        "settings.backup": "Export backup",
        "settings.exportCsv": "Export daily stats CSV",
        "settings.restore": "Import backup",
        "settings.backupHelp": "Export your preferences, stats and achievements as a JSON file, or import a previously-saved file to restore.",
        "settings.resetStats": "Reset stats",
        "settings.resetAchievements": "Reset achievements",
        "shortcuts.settings": "Open settings",
        "density.auto": "Auto",
        "density.minimal": "Minimal",
        "density.focus": "Focus",
        "density.balanced": "Balanced",
        "density.rich": "Rich",
        "welcome.kicker": "WELCOME",
        "welcome.title": "Welcome to AI Tycoon",
        "welcome.desc": "Watch your locally-running AI agents work as pixel-art characters in a live office dashboard.",
        "welcome.feat1": "Run <strong>Claude Code · Cursor · Codex</strong> and they appear in the office as characters.",
        "welcome.feat2": "Coding · thinking · searching · reviewing states show up in <strong>real time</strong>.",
        "welcome.feat3": "The <strong>sky outside</strong> shifts through dawn, day, sunset, and night with your clock.",
        "welcome.feat4": "Use header controls for <strong>visual density</strong>, <strong>dark mode</strong>, and <strong>director mode</strong>.",
        "welcome.primary": "Tour the office",
        "welcome.secondary": "Don't show again",
        "insights.kicker": "LIVE INSIGHTS",
        "insights.title": "Today's office",
        "insights.activeAgents": "Active agents",
        "insights.completed": "Completed tasks",
        "insights.ongoing": "In progress",
        "insights.totalRam": "Total memory",
        "insights.platforms": "Platform breakdown",
        "insights.topProjects": "Top 5 active projects",
        "insights.statusDist": "Status distribution",
        "insights.history": "Last 7 days",
        "insights.hourly": "Hourly activity",
        "insights.recentActivity": "Recent activity",
        "insights.achievements": "Achievements",
        "project.kicker": "PROJECT",
        "project.agents": "Active agents",
        "project.platforms": "Platforms",
        "project.agentList": "Team",
        "project.tasks": "Recent tasks",
        "project.empty": "No active agents on this project.",
        "project.emptyTasks": "No tasks recorded.",
        "insights.deltaSuffix": "vs. yesterday",
        "insights.completedLabel": "Completed tasks",
        "insights.emptyPlatforms": "No agents detected yet.",
        "insights.emptyProjects": "No projects yet.",
        "insights.emptyHistory": "No history yet. Keep the office open and it'll grow.",
        "insights.emptyFeed": "No activity yet.",
        "insights.emptyStatus": "No status data",
        "insights.legendTasks": "Completed tasks",
        "insights.legendAgents": "Peak concurrent agents",
        "shortcuts.kicker": "SHORTCUTS",
        "shortcuts.title": "Keyboard everything",
        "shortcuts.navGroup": "Navigation",
        "shortcuts.screenGroup": "Screen",
        "shortcuts.canvasGroup": "Canvas",
        "shortcuts.searchFocus": "Focus agent search",
        "shortcuts.searchAlt": "Focus search (alt)",
        "shortcuts.escClose": "Close search / modal",
        "shortcuts.darkToggle": "Toggle dark mode",
        "shortcuts.focusActive": "Focus most active agent",
        "shortcuts.resetView": "Reset to full view",
        "shortcuts.help": "Open this help",
        "shortcuts.insights": "Open insights",
        "shortcuts.zoom": "Zoom in / out",
        "shortcuts.zoomReset": "Reset zoom",
        "shortcuts.panning": "Pan",
        "shortcuts.dblZoom": "Reset zoom",
        "panel.agents": "Agents",
        "panel.searchPlaceholder": "Search agents, projects, tasks",
        "panel.recentActivity": "Recent activity",
        "panel.filterAll": "All",
        "panel.filterCoding": "Coding",
        "panel.filterIdle": "Idle",
        "panel.filterOffline": "Offline",
        "panel.close": "Close",
        "status.coding": "Coding",
        "status.thinking": "Thinking",
        "status.searching": "Searching",
        "status.coffee": "Coffee break",
        "status.meeting": "Meeting",
        "status.reviewing": "Reviewing",
        "status.idle": "Idle",
        "status.offline": "Offline",
        "tod.deepNight": "Deep night",
        "tod.dawn": "Dawn",
        "tod.morning": "Morning",
        "tod.noon": "Noon",
        "tod.afternoon": "Afternoon",
        "tod.dusk": "Dusk",
        "tod.evening": "Evening",
        "tod.night": "Night",
        "hud.live": "Live",
        "hud.waiting": "Waiting",
        "hud.realtimeOffice": "Live workspace",
        "hud.focus": "Focus",
        "hud.standby": "Standby",
        "hud.collectingStatus": "Collecting agent status",
        "hud.metricActive": "Active",
        "hud.metricWorking": "Working",
        "hud.metricReview": "Review",
        "hud.director": "Director",
        "hud.directorTitle": "Auto-follow most important agent",
        "hud.focusTitle": "View most active agent",
        "hud.fullView": "Full view",
        "empty.waitingTitle": "Waiting for staff",
        "empty.connectingTitle": "Connecting to server",
        "empty.signalCount": "{0} sessions · {1} AI signals",
        "empty.justWait": "Just a moment…",
        "empty.tryRunning": "Try running one of these",
        "empty.ctaKicker": "No staff yet",
        "empty.ctaTitle": "Try demo mode",
        "empty.ctaDesc": "Populate the office with synthetic agents — no AI sessions required.",
        "empty.ctaButton": "Start demo",
        "empty.serverWaiting": "No response from server…",
        "empty.checkServer": "Make sure npm start is running",
    },
};

let _lang = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) || "ko";
if (_lang !== "ko" && _lang !== "en") _lang = "ko";

const listeners = new Set();

export function getLang() { return _lang; }

export function setLang(lang) {
    if (lang !== "ko" && lang !== "en") return;
    _lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    applyToDom();
    listeners.forEach(fn => { try { fn(lang); } catch { /* ignore */ } });
}

export function toggleLang() {
    setLang(_lang === "ko" ? "en" : "ko");
}

export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/** Translate a key.  Supports {0}, {1}… positional placeholders. */
export function t(key, ...args) {
    const v = DICT[_lang]?.[key] ?? DICT.ko[key] ?? key;
    if (args.length === 0) return v;
    return v.replace(/\{(\d+)\}/g, (_, n) => args[Number(n)] ?? "");
}

/** Apply translations to DOM elements bearing data-i18n / data-i18n-attr. */
export function applyToDom(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const mode = el.getAttribute("data-i18n-mode") || "text";
        const v = t(key);
        if (mode === "html") el.innerHTML = v;
        else el.textContent = v;
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(el => {
        const spec = el.getAttribute("data-i18n-attr");
        // spec format: "title:header.darkToggle,aria-label:header.darkToggle"
        spec.split(",").forEach(pair => {
            const [attr, key] = pair.split(":");
            if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
        });
    });
    // Placeholders
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        el.setAttribute("placeholder", t(key));
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonI18n = { t, getLang, setLang, toggleLang };
    document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.lang = _lang;
        applyToDom();
    });
}
