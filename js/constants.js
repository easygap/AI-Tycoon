// ============================================================
//  AI TYCOON — Constants & Pure Data
// ============================================================

export const TILE = 32;
export const COLS = 24;
export const ROWS = 18;
export const WS_URL = `ws://${location.hostname || "localhost"}:${location.port || 3777}`;
export const RECONNECT_BASE = 3000;
export const RECONNECT_MAX = 30000;
export const MAX_PARTICLES = 200;
export const MAX_HEARTS = 50;

// ── Palette (switches between light and dark) ──
export const PAL_LIGHT = {
    floor1: "#F0E8D8", floor2: "#E8DFD0",
    wall: "#D4C4A8", wallTop: "#C8B898", wallAccent: "#BFA878",
    desk: "#C8A878", deskTop: "#D8BC90", deskEdge: "#B09060",
    monitor: "#2a2a3a", monFrame: "#3a3a4a",
    monActive: "#d0fae8", monDim: "#e8e8e8",
    chair: "#E8A0B0", chairSeat: "#F0B8C8",
    plant1: "#5AB87A", plant2: "#7AD09A", pot: "#D4A878",
    coffee: "#6B3820", coffeeMach: "#E8E0D0", coffeeSteam: "rgba(255,255,255,0.5)",
    server: "#B8C8D8", serverFace: "#C8D8E8", serverLed: "#34d399",
    whiteboard: "#FFFFFF", wbFrame: "#C8B898",
    rug: "#F0C8D0", rugEdge: "#E8B0C0",
    meetTable: "#D8BC90", meetTableTop: "#E8D0A8",
    shadow: "rgba(0,0,0,0.08)",
    bubbleBg: "rgba(255,255,255,0.97)", bubbleBorder: "rgba(200,180,150,0.3)",
    windowFrame: "#C8B898", windowGlass: "rgba(135,206,250,0.3)",
    flower1: "#F9A8D4", flower2: "#FDE68A", flower3: "#A5B4FC",
    catBody: "#F5E6D3", catEar: "#F9A8D4",
    labelBg: "rgba(255,255,255,0.9)", labelText: "#57534e", labelTextOff: "#a1a1aa",
    bubbleText: "#3f3f46", bubbleChatBg: "rgba(255,235,240,0.97)", bubbleChatText: "#be185d",
    emptyText: "rgba(0,0,0,0.25)", emptySub: "rgba(0,0,0,0.15)",
};
export const PAL_DARK = {
    floor1: "#1c1c24", floor2: "#22222c",
    wall: "#111118", wallTop: "#1a1a22", wallAccent: "#2a2a35",
    desk: "#3d3028", deskTop: "#4d3c32", deskEdge: "#2d2018",
    monitor: "#0a0c14", monFrame: "#1a1c24",
    monActive: "#1a3a2a", monDim: "#0e0e16",
    chair: "#3a2030", chairSeat: "#4a2840",
    plant1: "#1e4a36", plant2: "#2a6048", pot: "#5a4030",
    coffee: "#6B3820", coffeeMach: "#3a3a48", coffeeSteam: "rgba(255,255,255,0.15)",
    server: "#141420", serverFace: "#1a1a2c", serverLed: "#34d399",
    whiteboard: "#2a2a34", wbFrame: "#3a3a44",
    rug: "#2a1828", rugEdge: "#3a2838",
    meetTable: "#302820", meetTableTop: "#3a3228",
    shadow: "rgba(0,0,0,0.25)",
    bubbleBg: "rgba(20,20,28,0.95)", bubbleBorder: "rgba(255,255,255,0.08)",
    windowFrame: "#2a2a34", windowGlass: "rgba(30,40,80,0.4)",
    flower1: "#804060", flower2: "#806830", flower3: "#405080",
    catBody: "#4a3828", catEar: "#603040",
    labelBg: "rgba(20,20,28,0.85)", labelText: "#a1a1aa", labelTextOff: "#8a8a9a",
    bubbleText: "#d4d4d8", bubbleChatBg: "rgba(60,20,40,0.9)", bubbleChatText: "#fda4af",
    emptyText: "rgba(255,255,255,0.2)", emptySub: "rgba(255,255,255,0.1)",
};
export let PAL = { ...PAL_LIGHT };

export function updatePalette() {
    const isDark = document.body.classList.contains("dark");
    Object.assign(PAL, isDark ? PAL_DARK : PAL_LIGHT);
}

// ── Character pools: names, gender expression, visual traits ──
const MALE_NAMES = ["서준","도윤","시우","준혁","태민","현우","지호","은호","재윤","민준","하준","수호","예준","건우","우진"];
const FEMALE_NAMES = ["민지","수아","하은","유나","예린","소율","채원","지윤","서연","나은","다은","시은","하늘","유진","소희"];

export const AGENT_THEMES = [
    // Female characters (varied hair, skin, accessories)
    { body: "#FFB3C6", bodyDark: "#E88CA0", hair: "#1A1A2E", skin: "#F5D5C8", name: "민지",  gender: "F", hairStyle: "long",  accessory: "ribbon", hairColor: "#1A1A2E" },
    { body: "#86EFAC", bodyDark: "#5CC880", hair: "#2D2018", skin: "#F5D5C8", name: "수아",  gender: "F", hairStyle: "bob",   accessory: null,     hairColor: "#2D2018" },
    { body: "#C4B5FD", bodyDark: "#9B8AE0", hair: "#1A1A2E", skin: "#F0D0B8", name: "하은",  gender: "F", hairStyle: "pony",  accessory: "glasses", hairColor: "#1A1A2E" },
    { body: "#67E8F9", bodyDark: "#40C8E0", hair: "#3D2820", skin: "#EEDDC0", name: "유나",  gender: "F", hairStyle: "long",  accessory: null,     hairColor: "#3D2820" },
    { body: "#F0ABFC", bodyDark: "#C878E0", hair: "#1A1A2E", skin: "#F5D5C8", name: "예린",  gender: "F", hairStyle: "twin",  accessory: "ribbon", hairColor: "#1A1A2E" },
    { body: "#FB923C", bodyDark: "#D07020", hair: "#1F1F30", skin: "#EEDDC0", name: "소율",  gender: "F", hairStyle: "bob",   accessory: null,     hairColor: "#1F1F30" },
    { body: "#E879F9", bodyDark: "#B850D0", hair: "#2D2018", skin: "#F0D0B8", name: "채원",  gender: "F", hairStyle: "pony",  accessory: "earring", hairColor: "#2D2018" },
    { body: "#FACC15", bodyDark: "#C8A010", hair: "#1F1F30", skin: "#F5D5C8", name: "지윤",  gender: "F", hairStyle: "long",  accessory: "glasses", hairColor: "#1F1F30" },
    { body: "#FB7185", bodyDark: "#D05068", hair: "#252538", skin: "#F0D0B8", name: "서연",  gender: "F", hairStyle: "twin",  accessory: null,     hairColor: "#252538" },
    { body: "#22D3EE", bodyDark: "#18A8C0", hair: "#3D2820", skin: "#EEDDC0", name: "나은",  gender: "F", hairStyle: "bob",   accessory: "ribbon", hairColor: "#3D2820" },
    // Male characters (varied hair, skin, accessories)
    { body: "#93C5FD", bodyDark: "#6BA3E8", hair: "#2D2D3F", skin: "#F0D0B8", name: "서준",  gender: "M", hairStyle: "short", accessory: null,     hairColor: "#2D2D3F" },
    { body: "#FCD34D", bodyDark: "#D4A820", hair: "#252538", skin: "#EEDDC0", name: "지호",  gender: "M", hairStyle: "crew",  accessory: "glasses", hairColor: "#252538" },
    { body: "#FDA4AF", bodyDark: "#E07888", hair: "#1A1A2E", skin: "#F5D5C8", name: "도윤",  gender: "M", hairStyle: "part",  accessory: null,     hairColor: "#1A1A2E" },
    { body: "#FCA5A5", bodyDark: "#E07878", hair: "#3D2820", skin: "#F0D0B8", name: "시우",  gender: "M", hairStyle: "short", accessory: null,     hairColor: "#3D2820" },
    { body: "#A3E635", bodyDark: "#78B820", hair: "#2D2D3F", skin: "#F0D0B8", name: "준혁",  gender: "M", hairStyle: "crew",  accessory: null,     hairColor: "#2D2D3F" },
    { body: "#38BDF8", bodyDark: "#2090C8", hair: "#252538", skin: "#F5D5C8", name: "태민",  gender: "M", hairStyle: "part",  accessory: "cap",    hairColor: "#252538" },
    { body: "#4ADE80", bodyDark: "#30A858", hair: "#1A1A2E", skin: "#EEDDC0", name: "현우",  gender: "M", hairStyle: "short", accessory: null,     hairColor: "#1A1A2E" },
    { body: "#F87171", bodyDark: "#D05050", hair: "#252538", skin: "#F0D0B8", name: "민서",  gender: "M", hairStyle: "crew",  accessory: "glasses", hairColor: "#252538" },
    { body: "#34D399", bodyDark: "#20A870", hair: "#2D2018", skin: "#EEDDC0", name: "은호",  gender: "M", hairStyle: "part",  accessory: null,     hairColor: "#2D2018" },
    { body: "#A78BFA", bodyDark: "#8060D0", hair: "#1F1F30", skin: "#F5D5C8", name: "재윤",  gender: "M", hairStyle: "short", accessory: "cap",    hairColor: "#1F1F30" },
];

// ── Platform visual identity ──
export const PLATFORM_META = {
    claude: {
        label: "Claude Code",
        badge: "CC",
        color: "#D97757",
        badgeBg: "#D9775720",
    },
    cursor: {
        label: "Cursor AI",
        badge: "Cu",
        color: "#00B4D8",
        badgeBg: "#00B4D820",
    },
    ollama: {
        label: "Ollama",
        badge: "OL",
        color: "#FFFFFF",
        badgeBg: "#FFFFFF20",
    },
    lmstudio: {
        label: "LM Studio",
        badge: "LM",
        color: "#4CAF50",
        badgeBg: "#4CAF5020",
    },
    codex: {
        label: "OpenAI Codex",
        badge: "Cx",
        color: "#10A37F",
        badgeBg: "#10A37F20",
    },
    copilot: {
        label: "Copilot",
        badge: "CP",
        color: "#6E40C9",
        badgeBg: "#6E40C920",
    },
    jan: {
        label: "Jan",
        badge: "Jn",
        color: "#1A73E8",
        badgeBg: "#1A73E820",
    },
    gpt4all: {
        label: "GPT4All",
        badge: "G4",
        color: "#10A37F",
        badgeBg: "#10A37F20",
    },
};

// ── Role identity ──
export const ROLE_META = {
    developer: { label: "개발자", icon: "solar:code-square-linear", badge: "DEV", color: "#3B82F6" },
    planner:   { label: "기획자", icon: "solar:clipboard-list-linear", badge: "PM", color: "#8B5CF6" },
    designer:  { label: "디자이너", icon: "solar:palette-linear", badge: "UI", color: "#EC4899" },
    qa:        { label: "QA", icon: "solar:bug-linear", badge: "QA", color: "#EF4444" },
    reviewer:  { label: "리뷰어", icon: "solar:eye-linear", badge: "RV", color: "#F59E0B" },
};

// ── Role-based cross-check dialogues ──
export const ROLE_CHAT = {
    // Developer → QA
    devToQa: [
        ["{task} 구현 완료했어요, 테스트 부탁해요!", "네! 바로 돌려볼게요 🔍"],
        ["이 기능 QA 넘길게요", "어떤 시나리오로 테스트하면 될까요?"],
        ["버그 수정했어요, 확인 부탁해요", "재현 해볼게요~ 환경 알려주세요"],
    ],
    // QA → Developer
    qaToDev: [
        ["여기서 에러 나요! 스크린샷 보내드릴게요", "앗 감사합니다! 바로 확인할게요"],
        ["{proj} 테스트 중 이상한 동작이요", "로그 보내주시면 바로 볼게요!"],
        ["이 케이스 통과 안 돼요 ㅠ", "어떤 입력이었어요? 재현 해볼게요"],
    ],
    // Planner → Developer
    planToDev: [
        ["{proj} 스펙 정리했어요, 확인해주세요", "넵! 기술적으로 가능한지 볼게요"],
        ["일정 조율 필요해요", "현재 진행 상황 공유드릴게요!"],
        ["이 기능 우선순위 올릴게요", "알겠습니다! 먼저 착수할게요"],
    ],
    // Designer → Developer
    designToDev: [
        ["디자인 시안 올렸어요~", "오 예쁘다! 바로 반영할게요 ✨"],
        ["이 컴포넌트 간격 좀 조절해주세요", "넵! margin 수정하면 될까요?"],
        ["색상 토큰 정리했어요", "CSS 변수로 넣을게요!"],
    ],
    // Developer → Reviewer
    devToReview: [
        ["{task} PR 올렸어요, 리뷰 부탁해요!", "봐볼게요~ 잠시만요 👀"],
        ["이 부분 구현 방식 의견 좀요", "음... 다른 패턴도 고려해봐요"],
    ],
    // Reviewer → Developer
    reviewToDev: [
        ["리뷰 코멘트 남겼어요!", "감사합니다! 바로 수정할게요"],
        ["전체적으로 LGTM이에요 👍", "감사합니다! 머지할게요~"],
        ["여기 한 군데만 수정하면 승인할게요", "넵! 바로 고칠게요"],
    ],
};

// Report-to-user speech lines
export const REPORT_SPEECH = [
    "검토 부탁드립니다! 📋",
    "작업 완료했어요! 확인해주세요",
    "이거 한번 봐주세요~",
    "보고드립니다! 🙋",
    "여기 확인 필요해요!",
];

export const STATUS_META = {
    coding:    { label: "코딩 중",   icon: "solar:code-square-linear",       color: "#059669" },
    thinking:  { label: "생각 중",   icon: "solar:lightbulb-linear",         color: "#d97706" },
    searching: { label: "검색 중",   icon: "solar:magnifier-linear",         color: "#2563eb" },
    coffee:    { label: "커피 타임", icon: "solar:cup-hot-linear",           color: "#7c3aed" },
    meeting:   { label: "미팅",      icon: "solar:chat-round-dots-linear",   color: "#0d9488" },
    reviewing: { label: "리뷰 중",   icon: "solar:document-text-linear",     color: "#e11d48" },
    idle:      { label: "대기",      icon: "solar:sleeping-square-linear",   color: "#71717a" },
    offline:   { label: "오프라인",  icon: "solar:power-linear",             color: "#a1a1aa" },
};

// ── Solo speech (context-aware, picked by status + location) ──
export const SPEECH = {
    coding: [
        "함수 분리하자...", "이 로직 좀 복잡한데", "변수명 뭘로 하지",
        "커밋 메시지 작성 중", "타입 에러 잡았다!", "빌드 성공!",
        "테스트 케이스 추가해야지", "이 부분 리팩토링 필요", "import 정리 중...",
        "PR 올려야겠다", "컴파일 중...", "의존성 업데이트 중",
    ],
    thinking: [
        "이 구조로 괜찮을까...", "다른 방법은 없나", "흠, 트레이드오프가...",
        "아키텍처를 바꿔볼까", "성능이 걱정되는데", "좀 더 생각해보자",
        "이전에 비슷한 거 했었는데", "문서부터 정리하자", "설계 다시 해볼까",
    ],
    searching: [
        "이 함수 어디 있더라", "grep으로 찾아보자", "문서에 있었는데...",
        "스택오버플로우 확인 중", "비슷한 이슈 찾는 중", "API 문서 훑는 중",
        "git log 확인해보자", "이전 커밋에 있나", "타입 정의 찾는 중",
    ],
    idle: [
        "다음 할 일 뭐지", "잠깐 쉬자...", "~♪",
        "코드 정리나 할까", "메일 확인해야지", "zzZ",
    ],
    reviewing: [
        "이 부분 컨벤션 맞나", "LGTM!", "여기 수정 필요해요",
        "테스트 커버리지 확인 중", "변경사항 꼼꼼히 보는 중", "깔끔하네요~",
        "네이밍 이거 맞아요?", "사이드 이펙트 없나 확인 중",
    ],
    meeting: [
        "진행 상황 공유드립니다", "의견 있으신 분?", "다음 스프린트 계획은",
        "우선순위 정리하죠", "블로커 있나요?", "동의합니다",
    ],
    coffee: [
        "에스프레소 한 잔...", "에너지 충전!", "잠깐 환기하고 오자",
        "머리 좀 식히자", "향기 좋다~", "당 보충...",
    ],
    offline: [""],
};

// ── Movement-specific speech (when agent walks to a location) ──
export const MOVE_SPEECH = {
    server:    ["배포 상태 확인하자", "서버 로그 좀 보자", "CPU 사용량 체크", "디스크 공간 확인"],
    whiteboard:["설계 정리해놓자", "흐름도 그려보자", "TODO 업데이트", "아이디어 메모"],
    bookshelf: ["레퍼런스 찾아보자", "비슷한 패턴 있었는데", "공식 문서 확인", "이전 노트 어디갔지"],
    meeting:   ["진행 공유하러", "같이 논의하자", "피드백 받으러"],
    coffee:    ["잠깐 쉬자", "카페인 충전", "머리 좀 식히고"],
    vending:   ["음료 하나 뽑자", "당 보충!", "잠깐 간식 타임"],
    lounge:    ["잠깐 쉬어가자", "스트레칭 하자", "소파에서 좀 쉴까"],
    lounge2:   ["저쪽 소파 비어있나", "잠깐 누워야겠다", "눈 좀 붙이자..."],
    aquarium:  ["물고기 보면 힐링", "잠깐 멍 때리자", "마음 좀 가라앉히고"],
    desk:      ["다시 집중!", "코드로 돌아가자", "작업 이어하자"],
    peerDesk:  ["{peer} 코드 같이 보자", "{peer} 진행 어때요?", "{peer} 잠깐 이것 좀"],
};

// Sub-agent config
export const SUB_COLORS = [
    "#86EFAC", "#93C5FD", "#FCD34D", "#FDA4AF",
    "#C4B5FD", "#67E8F9", "#FCA5A5", "#A5B4FC",
];
export const TASK_STATUS_ICON = { in_progress: "⚡", completed: "✓", pending: "◦" };
export const SUB_SPEECH = {
    in_progress: ["작업 중!", "거의 다 됐어요~", "분석 중...", "코드 수정 중!"],
    pending:     ["대기 중~", "곧 시작해요!"],
    completed:   ["완료!", "끝났어요~"],
};

// ── Agent-to-agent conversations ──
// {proj}=speaker project, {task}=speaker task, {proj2}=listener project, {task2}=listener task
export const CHAT_TEMPLATES = {
    // Both coding
    bothCoding: [
        ["{proj} 어디까지 됐어요?", "{task2} 작업 중이에요~ 거의 마무리!"],
        ["{task} 하다가 막혔는데...", "어떤 부분이요? {proj2}에서 비슷한 거 해봤어요"],
        ["git conflict 났어요 ㅠ", "{proj2}도 가끔 그래요, rebase 해봐요"],
        ["{task} 커밋 올렸어요!", "바로 리뷰 볼게요~ 👀"],
        ["이거 {proj} 성능 괜찮나", "프로파일링 해봤어요? 저도 {proj2} 최적화 중"],
        ["{proj} CI가 느려졌어요", "캐시 확인해봐요! {proj2}는 캐시로 해결했어요"],
    ],
    // Speaker coding, listener thinking
    codingThinking: [
        ["{task} 이렇게 하면 될까요?", "음... 다른 접근법도 고려해봐요"],
        ["이 로직 맞는지 봐주세요", "잠깐 생각 중인 게 있는데, 같이 논의해요"],
        ["{proj} 아키텍처 의견 좀요", "지금 구조 정리 중이에요, 잠시만요~"],
    ],
    // Speaker thinking, listener coding
    thinkingCoding: [
        ["이거 이렇게 가면 어떨까", "오 괜찮은데요! {task2} 하면서 적용해볼게요"],
        ["{proj} 구조 다시 잡아볼까 해요", "좋아요! 리팩토링 타이밍이네요"],
        ["문서 정리 좀 해야 할 거 같아요", "README 업데이트할 거 있으면 같이 해요"],
    ],
    // Speaker searching
    searching: [
        ["이 에러 본 적 있어요?", "어떤 에러요? 로그 보내줘요"],
        ["{proj}에서 이상한 로그가...", "타임스탬프 확인해봐요! 환경 문제일 수도"],
        ["이 라이브러리 써본 적 있어요?", "아 그거! 버전 호환 주의하세요"],
        ["API 명세 어디서 봐요?", "Swagger 확인해봐요, 아니면 소스 직접 보거나"],
    ],
    // Speaker reviewing
    reviewing: [
        ["{task} PR 봤는데, 여기 의견 있어요", "어떤 부분이요? 수정할게요!"],
        ["코드 스타일 통일하면 좋겠어요", "린터 규칙 추가할까요? {proj2}에도 적용하면 좋겠어요"],
        ["테스트 좀 더 추가해주세요~", "넵! 어떤 케이스가 빠졌나요?"],
    ],
    // One meeting
    meeting: [
        ["회의 시간이에요~", "지금 갈게요! {task2} 잠시 멈추고"],
        ["다음 스프린트 얘기 좀 해요", "네! {proj} 진행 상황 공유할 게 있어요"],
        ["블로커 있는 사람?", "{task} 때문에 좀 막혀있어요 ㅠ"],
    ],
    // 휴게실 사담 (idle/offline 에이전트끼리)
    breakroom: [
        // 커피/음료
        ["커피 한 잔 더 할까요? ☕", "좋죠! 오늘 몇 잔째지 ㅋㅋ"],
        ["아메리카노 vs 라떼?", "오늘은 라떼 기분이에요~"],
        ["자판기에 새 음료 들어왔어요", "오 뭐요? 저도 하나 뽑을래요!"],
        ["이 커피 맛있다...", "어디 원두예요? 저도 마셔볼래요"],
        // 음식
        ["점심 뭐 먹었어요?", "아직이요 ㅠ 뭐 시킬까요? 🍲"],
        ["배달 시킬 사람~?", "저요! 뭐 먹을 거예요?"],
        ["간식 먹을 사람?", "오 뭐 있어요? 당 충전 필요..."],
        ["편의점 갈 건데 같이?", "저도요! 아이스크림 사와야지 🍦"],
        // 날씨/시간
        ["오늘 날씨 진짜 좋다~", "창밖에 하늘 예쁘네요 ☀"],
        ["벌써 이 시간이네...", "시간 진짜 빠르다 😳"],
        ["비 온다 우산 가져왔어요?", "앗... 안 가져왔는데 ☔"],
        ["퇴근 시간 아직 멀었죠?", "생각하지 마세요... 😇"],
        // 주말/일상
        ["주말에 뭐 했어요?", "집에서 넷플릭스 정주행 했어요 📺"],
        ["요즘 재밌는 거 있어요?", "새 드라마 시작했는데 꿀잼이에요!"],
        ["운동 다니세요?", "헬스 등록만 하고... 안 가요 😂"],
        ["여행 가고 싶다...", "저도요 ㅠ 제주도라도 갈까요?"],
        // 직장 생활
        ["오늘 야근인가요 ㅠ", "같이 하면 덜 힘들죠 💪"],
        ["이번 주 힘들었죠", "다음 주는 좀 여유롭길... 🙏"],
        ["회식 언제 하죠?", "금요일 어때요? 고기 먹으러!"],
        ["연차 쓰고 싶다...", "저도요... 같이 쓸까요? 😆"],
        // 수족관/사무실
        ["수족관 물고기 새로 들어왔나봐요", "아 진짜요? 잠깐 보러 가요~"],
        ["이 물고기 이름이 뭘까", "금붕어? 아닌가 열대어? 🐠"],
        ["소파 너무 편하다...", "잠깐만 눈 좀 붙이면 안 되나 😴"],
        ["스트레칭 같이 해요", "좋아요! 목이 뻣뻣해요~"],
        // 개발자 사담
        ["집에서도 코딩해요?", "가끔... 사이드 프로젝트가 ㅎㅎ"],
        ["새 키보드 샀어요!", "오~ 뭐 샀어요? 소리 좋아요?"],
        ["모니터 하나 더 사고 싶다", "트리플은 진리죠... 😎"],
        ["AI가 우리 일자리 뺏을까요?", "우리가 AI 만들잖아요 ㅋㅋ"],
        ["새벽에 갑자기 아이디어 떠올랐어요", "메모했어요? 안 하면 까먹어요!"],
        ["재택근무 하고 싶다...", "오늘만이라도... 🏠"],
    ],
    // 업무 중 가벼운 잡담
    casual: [
        ["잠깐 쉬었다 할까요?", "좋아요 커피 한 잔 하고 와요 ☕"],
        ["오늘 집중 잘 돼요?", "괜찮아요! 이 노래 틀으니까 좋네요 🎵"],
        ["배고프지 않아요?", "아 말하니까 배고프다... 😂"],
    ],
};

// Map: W=Wall B=Board S=Server C=Coffee D=Desk P=Plant R=Rug M=Meeting
//       L=Lounge K=Bookshelf V=Vending A=Aquarium (space)=Glass partition
// LEFT = 업무 공간 (cols 0-12)  |  RIGHT = 휴게실/탕비실 (cols 14-23)
export const OFFICE_MAP = [
    "WWWWWWWWWWWWWWWWWWWWWWWW", // 0
    "WBBFFSSSFFFFW CCPFFAAFFW", // 1  업무: 보드,서버 | 휴게: 커피,수족관
    "WFFFFFFPFFFFW FFFFFFRRRW", // 2  | 휴게 러그 시작
    "WFDDFFDDFFFFW FLLFFFRRRW", // 3  데스크1 | 소파
    "WFDDFFDDFFFFW FLLFFFRRRW", // 4         | 소파
    "WFFFFFFPFFFFW FFFFFFFPFW", // 5  복도   | 식물
    "WFDDFFDDFFFFW FVFKKKFFFW", // 6  데스크2 | 자판기,책장
    "WFDDFFDDFFFFW FFFFFFFPFW", // 7
    "WFFFFFFPFFFFW FLLFFFFFFW", // 8  복도   | 소파2
    "WFDDFFDDFFFFW FLLFFFFFFW", // 9  데스크3 | 소파2
    "WFDDFFDDFFFFW FFFFFFFPFW", // 10
    "WFFFFFFPFFFFW FFFFFFFFFW", // 11 복도
    "WFDDFFDDFFFFW FRRRMFFFFW", // 12 데스크4 | 미팅룸
    "WFDDFFDDFFFFW FRRRMFFFFW", // 13
    "WFFFFFFPFFFFW FFFFFFFFFW", // 14
    "WFFPFFFFFFPFW FFFFFFFPFW", // 15 식물
    "WFFFFFFFFFFF  FFFFFFFFFW", // 16 입구
    "WWWWWWWWWWWWWWWWWWWWWWWW", // 17
];

// Dynamic desk grid: fills work area (cols 1-11, rows 2-15) in pairs
// Generates as many desks as needed, never hardcoded
export function generateDeskSpots(count) {
    const spots = [];
    const colPairs = [[2, 6], [2, 6], [2, 6], [2, 6], [9, 9], [9, 9]]; // x positions
    const rowStart = 3, rowGap = 3; // y positions: 3, 6, 9, 12...
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const y = rowStart + row * rowGap;
        if (y > 15) {
            // Overflow: use right work area (cols 9-11)
            const overIdx = i - (Math.floor(13 / rowGap) + 1) * 2;
            spots.push({ x: 9 + (overIdx % 2) * 2, y: rowStart + Math.floor(overIdx / 2) * rowGap });
        } else {
            spots.push({ x: col === 0 ? 2 : 6, y });
        }
    }
    return spots;
}

// Boss review area: active spot + up to 5 waiting spots (no overlap)
export const BOSS_ACTIVE_SPOT = { x: 10 * TILE, y: 13.5 * TILE }; // directly in front of boss
export const BOSS_WAIT_SPOTS = [
    { x: 7.5 * TILE,  y: 13 * TILE },
    { x: 6 * TILE,    y: 13.5 * TILE },
    { x: 7.5 * TILE,  y: 14.5 * TILE },
    { x: 6 * TILE,    y: 14.5 * TILE },
    { x: 5 * TILE,    y: 14 * TILE },
];

export const BOSS_WAIT_SPEECH = [
    "곧 차례겠지...", "메모 다시 확인 중...", "발표 준비 중...",
    "긴장되네 ㅎㅎ", "어떻게 말하지...", "자료 정리 중...",
    "(기다리는 중)", "순서 오면 바로 가야지", "슬쩍 앞 상황 확인...",
];

export const BOSS_YES_REACTIONS = [
    "감사합니다! 👍", "바로 반영할게요!", "승인 감사합니다~", "네! 진행하겠습니다!",
];
export const BOSS_NO_REACTIONS = [
    "네, 수정할게요!", "다시 검토해볼게요", "알겠습니다, 보완하겠습니다", "피드백 감사합니다!",
];

export const POI = {
    // 업무 공간 (왼쪽)
    whiteboard:{ x: 1.5 * TILE,  y: 1.5 * TILE },
    server:    { x: 5 * TILE,    y: 1.5 * TILE },
    boss:      { x: 10 * TILE,   y: 15 * TILE },  // 보스(유저) 자리 — 하단 중앙
    // 휴게실 (오른쪽)
    coffee:    { x: 14.5 * TILE, y: 1.5 * TILE },
    aquarium:  { x: 20.5 * TILE, y: 1.5 * TILE },
    lounge:    { x: 15 * TILE,   y: 3.5 * TILE },
    lounge2:   { x: 15 * TILE,   y: 8.5 * TILE },
    vending:   { x: 15 * TILE,   y: 6.5 * TILE },
    bookshelf: { x: 17 * TILE,   y: 6.5 * TILE },
    meeting:   { x: 16 * TILE,   y: 12.5 * TILE },
};

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 3.0;
export const ZOOM_STEP = 0.1;
