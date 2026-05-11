# pixel-AI-Agents

로컬에서 실행 중인 AI 작업 상태를 한눈에 볼 수 있도록 만든 AI Tycoon 스타일 대시보드입니다.

Claude Code, Cursor, Codex 같은 AI 에이전트가 지금 어떤 작업을 하고 있는지 실시간으로 감지하고, 픽셀 아트 오피스 안의 캐릭터로 보여줍니다.

---

## 소개

평소에 여러 AI 세션을 동시에 띄워두고 작업하다 보면  
"지금 누가 일하고 있는지", "어떤 프로젝트를 보고 있는지", "멈춘 건 아닌지"  
텍스트 로그만으로 바로 파악하기가 어려웠습니다.

그래서 현재 내 컴퓨터에서 돌아가는 AI 작업을 게임처럼 한눈에 볼 수 있는 형태로 만들어봤습니다.

---

## 주요 기능

- 로컬에서 실행 중인 AI 에이전트 자동 감지
- 작업 상태 실시간 시각화 (coding, thinking, searching, reviewing, idle, offline)
- 픽셀 아트 오피스 기반 대시보드
- WebSocket 기반 실시간 업데이트
- 에이전트별 프로젝트 / 메모리 / 현재 작업 확인
- 보스 리뷰 큐를 통한 작업 흐름 표현
- 다크 모드, 줌/패닝, 필터/정렬 지원
- 남녀 캐릭터 다양성 (헤어스타일, 액세서리, 피부톤)
- 역할 자동 배정 (개발자, 기획자, QA, 디자이너, 리뷰어)
- 모바일 터치 지원 (핀치 줌, 한 손가락 패닝)

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

환경 변수로 포트와 폴링 주기를 변경할 수 있습니다.

```bash
PORT=8080 POLL_INTERVAL=3000 npm start
```

스타일을 수정한 뒤 Tailwind 유틸리티를 다시 생성하려면:

```bash
npm run build
```

---

## 프로젝트 구조

```
pixel-AI-Agents/
├── css/
│   ├── tailwind.input.css      # Tailwind 입력 파일
│   └── tailwind.generated.css  # 로컬 생성 유틸리티 CSS
├── js/
│   ├── constants.js   # 팔레트, 캐릭터 테마, 대사 템플릿, 오피스 맵
│   ├── state.js       # 공유 상태, 유틸 함수, 보스 큐 헬퍼
│   ├── ws.js          # WebSocket 연결/재연결, 상태 핸들러
│   ├── renderer.js    # 캔버스 렌더링 (오피스, 가구, 에이전트, 파티클)
│   ├── panel.js       # 사이드 패널, 필터/정렬, 보스 리뷰 큐 UI
│   ├── pixiOverlay.js # PixiJS 실시간 그래픽 오버레이
│   └── main.js        # 진입점, 게임 루프, 입력 처리, 채팅 시스템
├── server.js          # AI 세션 감지, 상태 수집, WebSocket 서버
├── index.html         # 전체 레이아웃
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

## 만들어본 이유

이 프로젝트는 "AI가 실제로 일하고 있는 느낌"을 조금 더 직관적으로 보고 싶어서 시작했습니다.

단순히 로그를 보는 방식보다, 작업 중 / 대기 중 / 리뷰 중 같은 흐름이 시각적으로 보이니까 여러 세션을 동시에 관리할 때 훨씬 편했습니다.
