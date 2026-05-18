# AI Tycoon

<p align="center">
  <img src="icons/icon.png" alt="AI Tycoon — 픽셀아트 오피스 아이콘" width="128" height="128">
</p>

[![CI](https://github.com/easygap/AI-Tycoon/actions/workflows/ci.yml/badge.svg)](https://github.com/easygap/AI-Tycoon/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-43853d.svg)](https://nodejs.org)
[![Version](https://img.shields.io/badge/version-1.2.0-d97757.svg)](./CHANGELOG.md)
[![PWA](https://img.shields.io/badge/PWA-installable-d97757.svg)](./manifest.webmanifest)

> **로컬에서 돌아가는 AI 에이전트들의 작업을 픽셀 아트 오피스로 시각화하는 실시간 대시보드.**
> *A live pixel-art office dashboard for AI agents running on your machine.*

### 🆕 v1.2.0 새 소식 (요약)
- **명령 팔레트 32+ 명령** — 검색/팔레트/단축키 모달 모두에 한글 IME 매끄럽게
- **Strict 프라이버시 모드** (`Shift+P` 더블탭) — hover unblur 차단으로 화면 녹화 안전
- **헤더 모드 칩 3종** (`⚠ 멈춤` / `DEMO` / `프라이버시`) — 활성 모드 즉시 인지 + 클릭으로 해제
- **검색 매치 노란 하이라이트** (사이드바 + 팔레트), 메모도 검색 매칭
- **카드 Shift+클릭 으로 핀 토글**, F1 도움말, Cmd/Ctrl+S 메모 즉시 저장
- **워크 이벤트 → 카드 자동 스크롤**, 사이드바 '위로' 부유 버튼
- **신선도 색상 코드** (1분/5분/30분), 메모리 추세 ▲/▼
- **운영 브리핑 / 헬스 / 보고 대기열** 등 사이드 패널 거의 모든 영역 KO/EN 일관
- `npm run lint` (35개 .js syntax 일괄 검사) + CI 통합

### 🆕 v1.1.0 새 소식 (요약)
- **명령 팔레트** (`Ctrl/Cmd+K`) — 22개 명령 + 에이전트 fuzzy 검색
- **프라이버시 모드** (`Shift+P`) — 프롬프트·프로젝트명 즉시 블러 (화면 공유 안전)
- **에이전트별 개인 메모** — 디테일 패널에 500자 메모, 카드에 황금 점 표시
- **컴팩트 카드 뷰** — 10명 이상에서 한 화면에 더 많이
- **신선도 색상 코드** — 1분/5분/30분 임계값으로 카드 활동성 직관 표시
- **멈춘 에이전트 감지** — 5분 무신호 → 칩 + 토스트 + 탭 제목 ⚠ 배지
- **오늘의 MVP 카드 · 자리 비운 사이 요약** — Insights 모달과 토스트로 자동 정리
- **HUD 작업실 타이틀 인라인 편집** — 더블클릭으로 즉시 수정
- **macOS ⌘ 키 자동 표시** · **단축키 모달 검색** · **위로 부유 버튼**
- **일일 리포트 / 메모 일괄 export** (`.md`) — 스탠드업·아카이브 친화
- **서버 graceful shutdown** — SIGTERM/SIGINT 시 WS 클라이언트에 작별 인사
- 업적 21 → **24개**, smoke 테스트 32 → **38개**

자세한 변경 내역은 [`CHANGELOG.md`](./CHANGELOG.md) 참고.

Claude Code · Cursor · Codex 같은 AI 에이전트가 지금 어떤 작업을 하고 있는지 자동으로 감지하고, 픽셀 아트 오피스 안의 캐릭터로 보여줍니다.

> 🌐 **English readers:** scroll to the bottom for a quick English overview, or hit the globe icon in the app header to switch the UI to English.

---

## 소개

여러 AI 세션을 동시에 띄워놓고 작업하다 보면 "지금 누가 일하고 있는지", "어떤 프로젝트를 보고 있는지", "멈춘 건 아닌지" 텍스트 로그만으로 바로 파악하기가 어렵습니다.

AI Tycoon은 현재 내 컴퓨터에서 돌아가는 AI 작업을 **게임처럼 한눈에** 볼 수 있도록 만든 대시보드입니다. 캐릭터들이 자기 자리에 앉아 코딩하고, 막히면 검색하러 가고, 검토 차례가 되면 보스 자리(=사용자)로 모입니다.

---

## 주요 기능

### 🤖 실시간 감지 & 시각화
- **자동 감지** — Claude Code · Cursor · Codex · Copilot · Ollama · LM Studio · Jan · GPT4All 등 8종 AI 플랫폼 (설정 없음)
- **실시간 상태** — coding · thinking · searching · reviewing · idle · offline 6단계, 깜빡임 방지 hold 로직 포함
- **보스 리뷰 큐** — 검토 차례가 된 에이전트가 줄 서서 사용자 앞에 옵니다
- **역할 자동 배정** — 개발자 · 기획자 · QA · 디자이너 · 리뷰어

### 🎨 풍부한 비주얼
- **픽셀 아트 오피스** — 데스크 · 모니터 · 의자 · 휴게실 · 자판기 · 수족관 · 미팅룸 · 책장 · 식물
- **시간대 조명** — 시계 시간에 맞춰 창밖 하늘이 새벽·낮·황혼·밤으로 자동 전환 (Pixi 앰비언트 틴트 + 윈도우 별/달/태양 궤도)
- **빗방울 날씨** — 시간당 8% 확률로 비 효과
- **백그라운드 NPC** — 청소 로봇, 종이비행기, 휴게실 고양이, 야간 보안 순찰, 배송 NPC
- **오피스 테마 6종** — 클래식 / 카페 / 숲속 / 심야 / 사쿠라 / 바다 (light/dark 양쪽 팔레트)
- **자동 시즌 장식** — 12월 크리스마스 트리+눈, 10-11월 잭오랜턴+거미줄, 3-4월 벚꽃
- **인테리어 디테일** — 책상별 램프(저녁 글로우), 커피잔/포스트잇/식물/책 변형, 캘린더·CAFE 네온·모티브 포스터

### 🎭 캐릭터
- 20개 캐릭터 테마 — 헤어스타일·액세서리·피부톤·의상 자동 배정
- 합성 데모 모드 — 실제 에이전트 없이도 6-8명 풀-페이크 직원으로 작업실 시연

### 📊 인사이트 & 통계
- **인사이트 모달** (`I` 키) — 활성/완료/진행/메모리, 플랫폼 분포, TOP 5 프로젝트, 상태 분포, 24시간 히트맵, 7일 추이, 최근 활동 피드(클릭→포커스), 업적
- **일자별 통계 영속화** — localStorage 14일 보관, 시간대별 누적
- **차트 hover 툴팁** — 5가지 지표(태스크/직원/출근/이벤트) 풍부한 정보

### 🏆 게임화
- **업적 21종** — 첫 연결, 10/50태스크, 멀티플랫폼, 야간 작업, 3/7일 연속, 5+ 동시, 콘도드 등
- **컨페티 폭발** + 토스트 팝업 + 헤더 미해제 카운트 뱃지

### 🌐 i18n & 접근성
- **KO/EN 토글** — 헤더 🌐 버튼, 70+ 문자열 양국어
- **접근성** — 키보드 내비게이션, `prefers-reduced-motion`, ARIA 라벨, 포커스 트랩

### 🔊 알림 & 사운드
- **데스크탑 알림** — Web Notifications API, 태스크 완료·검토 요청 (탭 백그라운드 시)
- **효과음** — Web Audio API, 출근/퇴근/완료/리뷰 미니 멜로디, 0-100% 볼륨

### ⚡ PWA
- **앱으로 설치** — manifest + Service Worker로 데스크탑 앱처럼 띄우기
- **오프라인 지원** — 셸 자산 28개 캐시
- **URL 단축 라우팅** — `?action=insights` / `?action=settings`

### 🎯 UX 폴리시
- **명령 팔레트** (`Ctrl/Cmd+K`) — VS Code 스타일, 에이전트·22개 명령(필터·테마·언어·도구) fuzzy 검색
- **프라이버시 모드** (`Shift+P`) — 프롬프트·프로젝트명·태스크를 즉시 블러, 화면 공유 안전
- **에이전트별 개인 메모** — 디테일 패널에 500자 메모, sessionId/PID 키로 영속, 카드에 황금 닷 표시
- **컴팩트 뷰 토글** — 정렬 옆 리스트 아이콘으로 카드 슬림화, 10+ 에이전트 운영에 유리
- **상태별 요약 칩** — 사이드 패널 상단에 6/2/1/3 (코딩/생각/검토/대기) 한눈에, 클릭 시 필터
- **프로젝트별 색상 닷** — 같은 프로젝트의 모든 에이전트가 같은 색상으로 묶임
- **"NEW" 펄스** — 방금 출근한 에이전트에 60초간 초록 보더 + 칩 강조
- **"오늘의 MVP" 카드** — Insights 모달에서 가장 활발한 에이전트 1명 자동 선정
- **"자리 비운 사이" 요약** — 탭을 30초+ 떠나 있다 돌아오면 그동안 일어난 일 한 줄 요약 토스트
- **메모리 추세 화살표** — 30초 전 대비 ▲/▼ 화살표로 증감 표시 (호버 시 정확한 MB)
- **첫 실행 환영 카드** + 5-step 스포트라이트 투어 + 회전 "혹시 알고 계셨나요?" 팁
- **단축키 모달** (`?` 키) — 18+ 글로벌 단축키 정리
- **PNG 스냅샷** (`P`) — Canvas + Pixi 합성 다운로드
- **시네마 모드** (`Z`) — 모든 오버레이 숨김 (클린 스크린샷용)
- **사운드 토글** (`M`) — 한 키로 음소거 on/off
- **에이전트 순회** (`J`/`K`) — vim 스타일 prev/next 포커스
- **인사이트 모달** (`I`), **설정 모달** (`,`), **성능 HUD** (`Ctrl+Shift+P`)
- **미니맵** — 줌 1.1x 이상 시 자동 노출, 클릭→패닝
- **통합 설정 모달** — 다크/언어/밀도/테마/HUD/사운드/볼륨/알림/시즌/시간 강제/백업/복원/모두 초기화 + "새 소식" 인라인 changelog
- **사운드 미리듣기** — 4종 효과음 즉시 시청
- **작업실 이름** — 페이지 타이틀과 HUD에 사용자 정의 이름
- **백업/복원** — 모든 prefs·통계·업적 JSON export/import
- **CSV 통계 받기** — 일자별 14일 데이터 다운로드
- **시간 스크럽 슬라이더** — 0~23:59 데모/스크린샷용 시각 강제
- **자동 SW 업데이트 알림** — 새 버전 감지 시 토스트 + Refresh 액션
- **서버 graceful shutdown** — SIGTERM/SIGINT 시 WS 클라이언트에 작별 인사 후 깔끔하게 종료

### 📱 모바일
- 핀치 줌, 한 손가락 패닝
- 모바일 우선순위 도크 (가장 중요한 직원 압축 표시)
- 사이드 패널 슬라이드 오버레이 (480px 이하)

---

## 지원 대상

현재는 아래 환경을 중심으로 감지하고 있습니다.

| 플랫폼 | 감지 방식 |
|--------|----------|
| Claude Code | 세션 파일 + 히스토리 기반 (가장 상세) |
| OpenAI Codex | 세션 인덱스 + 세션 파일 기반 |
| Cursor | 윈도우 타이틀 + 워크스페이스 파일 기반 |
| Ollama | 프로세스 감지 |
| LM Studio | 프로세스 감지 |
| GitHub Copilot | 프로세스 감지 |
| Jan | 프로세스 감지 |
| GPT4All | 프로세스 감지 |

새로운 AI 플랫폼은 `server.js`의 `AI_PLATFORMS` 객체에 항목을 추가하면 됩니다.

---

## 기술 스택

- **백엔드**: Node.js, WebSocket (`ws`)
- **프론트엔드**: HTML / CSS / JavaScript (Canvas + PixiJS)
- **스타일**: Tailwind CSS 로컬 빌드 + 커스텀 CSS
- **CDN**: Pretendard, Iconify, PixiJS

프론트는 별도 빌드 도구 없이 브라우저 네이티브 ES Module로 구성했습니다.
Tailwind 유틸리티 CSS는 `npm run build:css`로 `css/tailwind.generated.css`에 생성해 둡니다.

---

## 실행 방법

```bash
npm install
npm start
```

기본 주소:

```
http://localhost:3777
```

환경 변수로 포트와 폴링 주기, 로그 출력을 조절할 수 있습니다.

```bash
PORT=8080 POLL_INTERVAL=3000 npm start
QUIET=1 npm start                          # 폴링/WS 로그 억제
LOG_LEVEL=warn npm start                   # 위와 동일
```

스타일을 수정한 뒤 Tailwind 유틸리티를 다시 생성하려면:

```bash
npm run build
```

스모크 테스트로 모든 모듈/자산이 정상 로드되는지 확인:

```bash
npm test
```

REST API 엔드포인트 (모니터링·통합용):

```bash
curl http://localhost:3777/api/health     # 버전·가동시간·에이전트 통계
curl http://localhost:3777/api/agents     # 현재 활성 에이전트 JSON 스냅샷
```

URL 쿼리로 임베드/공유 외관 강제:

| 쿼리 | 의미 |
|---|---|
| `?clean=1` | 시네마 모드 (모든 오버레이 숨김) + 환영/투어 자동 dismiss |
| `?demo=1` | 합성 직원 데모 자동 활성화 |
| `?theme=midnight` | `classic / cafe / forest / midnight / sakura / ocean` |
| `?lang=en` | `ko / en` |
| `?dark=1` 또는 `?dark=0` | 다크모드 명시 강제 |
| `?action=insights` | 인사이트 모달 자동 오픈 |
| `?action=settings` | 설정 모달 자동 오픈 |

예: `/?clean=1&demo=1&theme=midnight&lang=en` — 회사 상태판용 시연

---

## 프로젝트 구조

```
ai-tycoon/
├── css/
│   ├── tailwind.input.css      # Tailwind 입력 파일
│   └── tailwind.generated.css  # 로컬 생성 유틸리티 CSS
├── js/
│   ├── constants.js   # 팔레트, 캐릭터 테마, 대사 템플릿, 오피스 맵
│   ├── state.js       # 공유 상태, 유틸 함수, 보스 큐 헬퍼
│   ├── ws.js          # WebSocket 연결/재연결, 상태 핸들러
│   ├── renderer.js    # 캔버스 렌더링 (오피스, 가구, 에이전트, 파티클)
│   ├── npcs.js        # 배경 NPC (청소 로봇, 종이비행기, 휴게실 고양이)
│   ├── timeOfDay.js   # 시간대별 하늘/조명 팔레트 계산
│   ├── panel.js       # 사이드 패널, 필터/정렬, 보스 리뷰 큐 UI
│   ├── pixiOverlay.js # PixiJS 실시간 그래픽 오버레이 (앰비언트 틴트, 날씨, 작업 효과)
│   └── main.js        # 진입점, 게임 루프, 입력 처리, 채팅 시스템
├── server.js          # AI 세션 감지, 상태 수집, WebSocket 서버
├── index.html         # 전체 레이아웃 + 환영 카드
├── style.css          # 테마 및 UI 스타일
├── tailwind.config.js # Tailwind 로컬 빌드 설정
├── package.json
└── README.md
```

- `server.js`: 세션 정보, 프로세스 상태, 작업 기록을 읽어서 각 AI 에이전트의 상태를 판단합니다.
- `js/`: 렌더링, 상태 관리, 패널 UI, WebSocket 처리를 담당합니다.
- `index.html`: 헤더, 캔버스, 사이드 패널, 보스 큐 컨테이너 레이아웃입니다.
- `style.css`: 라이트/다크 테마, 필터 칩, 보스 큐, 반응형 스타일을 포함합니다.

---

## 동작 방식

서버에서 세션 정보, 프로세스 상태, 작업 기록 등을 읽어서 각 AI 에이전트의 상태를 판단합니다.

예를 들어 아래 같은 상태로 구분합니다.

| 상태 | 설명 |
|------|------|
| `coding` | 실제 작업 진행 중 |
| `thinking` | 작업 대기 또는 고민 중 |
| `searching` | 자료 탐색 중 |
| `reviewing` | 리뷰/검토 중 |
| `idle` | 실행 중이지만 쉬는 상태 |
| `offline` | 종료된 상태 |

이 상태를 WebSocket으로 브라우저에 전달하고, 클라이언트에서는 각 상태에 맞는 캐릭터 행동과 UI를 렌더링합니다.

상태 전환이 너무 자주 깜빡이지 않도록 상위 전환은 즉시, 하위 전환은 일정 시간 유지 후 적용하는 hold 로직이 포함되어 있습니다.

---

## 단축키 (`?` 키로 언제든 확인)

| 키 | 동작 |
|---|---|
| `?` · `Ctrl+/` · `F1` | 단축키 도움말 |
| `,` | 설정 모달 |
| `I` | 인사이트 |
| `P` | PNG 스냅샷 |
| `Shift+P` | 프라이버시 모드 (블러) — 빠르게 두 번 누르면 Strict |
| `D` | 다크 모드 |
| `M` | 사운드 음소거 토글 |
| `Z` | 시네마 모드 (오버레이 숨김) |
| `F` | 가장 활발한 직원 포커스 |
| `J` / `K` | 다음 / 이전 직원 |
| `H` · `0` | 전체 보기로 리셋 |
| `/` | 에이전트 검색바 포커스 |
| `Ctrl+K` · `Cmd+K` | 명령 팔레트 (32+ 명령) |
| `Shift+Click` | 에이전트 카드 핀 토글 |
| `Cmd/Ctrl+S` · `Cmd/Ctrl+Enter` | 메모 즉시 저장 / 저장 + 패널 닫기 |
| `N` | 선택된 에이전트의 메모로 빠르게 포커스 |
| `Ctrl+Shift+P` | 성능 HUD |
| `Esc` | 모달 / 검색 닫기 |
| ↑↑↓↓←→←→BA | 히든 업적 🎮 |

---

## 만들어본 이유

이 프로젝트는 "AI가 실제로 일하고 있는 느낌"을 조금 더 직관적으로 보고 싶어서 시작했습니다.

단순히 로그를 보는 방식보다, 작업 중 / 대기 중 / 리뷰 중 같은 흐름이 시각적으로 보이니까 여러 세션을 동시에 관리할 때 훨씬 편했습니다.

---

## 🇺🇸 English

**AI Tycoon** is a real-time pixel-art office dashboard that visualizes the AI agents (Claude Code, Cursor, Codex, Ollama, LM Studio, Copilot, Jan, GPT4All) currently running on your local machine.

Instead of glancing at half a dozen terminals, you see your agents as characters in a tiny office: they sit at desks coding, walk to the whiteboard when planning, queue up at the "boss desk" (you) for reviews, and head to the breakroom when idle. The sky outside the windows tracks your real clock from dawn to dusk to night, and the whole scene gets warmer at sunset and cooler at night.

### Highlights

#### Realtime detection
- **Zero-config detection** — auto-discovers 8 AI platforms (Claude Code, Cursor, Codex, Copilot, Ollama, LM Studio, Jan, GPT4All)
- **6 live states** — coding / thinking / searching / reviewing / idle / offline
- **Boss review queue** — agents needing review walk to your "boss desk" and queue
- **Auto role assignment** — developer / planner / QA / designer / reviewer

#### Visual richness
- **Time-of-day lighting** — sky, sun/moon, stars and ambient tint follow the real clock; sunrise/sunset/midnight palettes
- **Weather** — occasional rain (8%/hour)
- **6 office themes** — Classic / Cafe / Forest / Midnight / Sakura / Ocean, light & dark each
- **Seasonal decor** — Christmas tree + snow (Dec), jack-o-lantern + spider web (Oct/Nov), cherry blossoms (Mar/Apr)
- **Background NPCs** — cleaning robot, paper airplane, breakroom cat, night security guard, delivery courier
- **Desk personalities** — lamps that glow at night, coffee mugs / sticky notes / succulents / book stacks
- **Wall art** — calendar, motivational poster, CAFE neon sign, world map

#### Insights & history
- **Insights modal** (`I`) — totals, platform breakdown, top 5 projects, status distribution, 24-hour heatmap, 7-day trend, clickable activity feed, achievements grid
- **Daily stats** — localStorage, 14-day retention
- **Rich hover tooltips** on every chart

#### Gamification
- **21 achievements** — first connect, 10/50 tasks, multi-platform, night owl, streaks, full house, Konami code, …
- **Confetti** + toast popups + header unseen-count badge

#### i18n & accessibility
- **KO/EN toggle** — 70+ strings, persisted preference
- Keyboard navigation, `prefers-reduced-motion`, ARIA labels, focus traps

#### Audio & alerts
- **Desktop notifications** — Web Notifications API for task done / review requests (when tab in background)
- **Sound effects** — Web Audio tones for join/leave/done/review, 0-100% volume

#### PWA
- **Install as app** — manifest + service worker, 28 shell assets cached for offline
- **URL shortcuts** — `?action=insights` / `?action=settings`

#### Polish
- **Command palette** (`Ctrl/Cmd+K`) — VS-Code-style fuzzy search across agents + 22 commands (filter / theme / lang / tools)
- **Privacy mode** (`Shift+P`) — blur prompts, project names, tasks — safe for screen sharing
- **Per-agent personal notes** — 500-char textarea in detail panel, persists across reloads; cards with notes get a golden dot
- **Compact view toggle** — slim cards for 10+ agents
- **Status summary chips** — "6 coding · 2 thinking · 1 review · 3 idle" above the agent list, click to filter
- **Per-project color dots** — agents on the same project share a stable HSL color
- **"NEW" pulse** — freshly joined agents pulse green for 60 s
- **"Today's MVP" card** — top agent of the day highlighted in Insights
- **"While you were away"** — recap toast when you return after 30+ s
- **Memory trend arrows ▲/▼** — quick visual cue vs 30 s ago
- First-run welcome card + 5-step spotlight tour + rotating "Did you know?" tips
- Keyboard shortcuts modal (`?`)
- **PNG snapshot export** (`P`) — Canvas + Pixi composite download
- **Performance HUD** (`Ctrl+Shift+P`) — FPS, heap, sprite count
- **Mini-map** — appears when zoomed in, click to pan
- **Settings modal** (`,`) — dark / lang / density / theme / sound / notify / season / time / backup / reset + inline "What's new" panel
- **Backup & restore** — full JSON export/import of prefs, stats, achievements
- **Graceful server shutdown** — SIGTERM/SIGINT broadcasts farewell to all WS clients
- Pinch-zoom, single-finger pan, mobile priority dock

### Run

```bash
npm install
npm start          # http://localhost:3777
npm test           # smoke check: 26 assets + modules
```

Optional environment variables:

```bash
PORT=8080 POLL_INTERVAL=3000 npm start
```

### Project layout

```
ai-tycoon/
├── server.js          # Detects AI sessions, broadcasts state via WebSocket
├── index.html         # Layout + welcome card + modals + splash
├── manifest.webmanifest, sw.js, icons/  # PWA support
├── css/, style.css    # Tailwind utilities + custom styles
└── js/
    ├── main.js        # Entry point, game loop, input
    ├── state.js       # Shared mutable state + utility functions
    ├── constants.js   # Palettes, themes, character themes, office map
    ├── renderer.js    # Canvas 2D drawing (office, agents, NPCs)
    ├── pixiOverlay.js # PixiJS effects layer (ambient tint, weather, auras)
    ├── npcs.js        # Background characters (robot, cat, plane, courier, guard)
    ├── seasons.js     # Christmas / Halloween / Spring decorations
    ├── timeOfDay.js   # Sky palette + ambient lighting maths
    ├── panel.js       # Side panel + insights modal
    ├── ws.js          # WebSocket reconnect + state diffing
    ├── agentPriority.js # Sorting & filtering of agents
    ├── i18n.js        # KO/EN dictionary (70+ keys)
    ├── stats.js       # Daily rollups persisted to localStorage
    ├── achievements.js# 14 milestone tracking + popups + confetti
    ├── sound.js       # Web Audio tones + volume slider
    ├── notifications.js # Web Notifications API wrapper
    ├── demoMode.js    # Synthetic agents for screenshots
    ├── snapshot.js    # PNG export (Canvas + Pixi composite)
    ├── perfHud.js     # FPS / heap / density debug overlay
    ├── tips.js        # Rotating "did you know?" hint card
    ├── miniMap.js     # Bottom-right office overview when zoomed in
    └── backup.js      # JSON export / import of all state
```

### Notes

- The frontend uses native ES modules — no bundler. Open the page and refresh after editing.
- Tailwind utilities are pre-built into `css/tailwind.generated.css`; regenerate with `npm run build`.
- The "boss desk" is *your* seat: agents needing review walk over and queue.
- New AI platforms can be added by extending `AI_PLATFORMS` in `server.js`.

### Docs

- [`CHANGELOG.md`](./CHANGELOG.md) — feature drops by iteration
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — project layout + how to add modals / shortcuts / achievements / platforms
- [`LICENSE`](./LICENSE) — MIT

### Easter eggs

- ↑ ↑ ↓ ↓ ← → ← → B A — Konami unlocks a hidden achievement
- Inspect the DevTools console — there's a hello message + helper APIs
