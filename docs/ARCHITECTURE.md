# AI Tycoon — 아키텍처 노트

> 처음 코드 베이스에 진입하는 contributor 를 위한 데이터 흐름 / 모듈 관계 / 확장 포인트
> 가이드. 파일 트리 자체는 [`CONTRIBUTING.md`](../CONTRIBUTING.md) 의 "Project layout"
> 섹션에 있고, 이 문서는 그 위에서 *어떻게 도는지* 를 설명합니다.

---

## 1. 큰 그림

```
┌─────────────────────────────────────────────────────────────┐
│  운영체제 (사용자 머신)                                       │
│                                                              │
│   $ claude                $ cursor             $ ollama       │
│        │                       │                   │         │
│        └───────┐  ┌────────────┘                   │         │
│                │  │                                 │         │
│                ▼  ▼                                 ▼         │
│   ~/.claude/sessions/*.json     /api/tags (HTTP)              │
│   ~/.cursor/Settings/...        ps aux 프로세스 매칭         │
│   ~/.codex/sessions/*.jsonl                                  │
│                                                              │
│                  ┌──────────────────┐                        │
│                  │   server.js      │  Node HTTP+WS          │
│                  │   (단일 파일)     │  포트 3777            │
│                  └────────┬─────────┘                        │
│                           │ WebSocket broadcast               │
│                           │ /api/health, /api/agents          │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   브라우저 (모던 + PWA)                                │   │
│  │                                                        │   │
│  │   index.html  ──→  js/main.js  ──→  game loop          │   │
│  │                         │                              │   │
│  │     ┌───────────────────┼──────────────────┐            │   │
│  │     ▼                   ▼                  ▼            │   │
│  │  js/ws.js          js/renderer.js     js/panel.js       │   │
│  │  (WS 수신)          (Canvas 2D)       (사이드바)         │   │
│  │     │                   │                  │            │   │
│  │     └───────────────────┴──────────────────┘            │   │
│  │                         │                              │   │
│  │                    js/state.js (S = 글로벌)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

핵심: **서버는 폴링 + 브로드캐스트**, **클라이언트는 단일 mutable state (`S`) + 매 틱 렌더**.
번들러 / 프레임워크 없음. 모든 module 은 native ES module.

---

## 2. 서버 — `server.js`

단일 파일에서:

1. **HTTP 서버** — 정적 파일 서빙 + `/api/health` / `/api/agents` JSON API
2. **WebSocket 서버** — 같은 포트, `/ws` 경로 (실제로는 upgrade 핸들러)
3. **에이전트 탐지 폴러** — `POLL_INTERVAL` (기본 2초) 마다 동작:
   - `~/.claude/sessions/*.json` 스캔 → Claude Code 세션
   - `ps aux` (Mac/Linux) / `Get-Process` (Windows) → 프로세스 매칭
   - `~/.codex/sessions/*.jsonl` → Codex CLI 세션 + 스레드
   - `~/.cursor/...` → Cursor 워크스페이스
   - `http://localhost:11434/api/tags` → Ollama (있으면)
   - LM Studio / Jan / GPT4All → 프로세스 이름 매칭
4. **상태 머신** — `stickyState[sid]` 에 role 투표 누적, statusHoldUntil 로 잦은 깜빡임 차단
5. **메모리 메타** — `prevMemory[pid]` 와 비교해서 ±5MB 이상 변화 시 "활성" 신호로 인정

매 poll 종료 후 모든 WS 클라이언트에 `{ agents, workEvents, bossQueue, diagnostics }` JSON 전송.

### 새 AI 플랫폼 추가하려면
`AI_PLATFORMS` 배열에 entry 추가 + (필요시) 서버 폴링 로직에 detect 함수 추가.
클라이언트에선 `js/constants.js` 의 `PLATFORM_META` 에 색·배지 등록.

---

## 3. 클라이언트 — 단일 상태 `S`

`js/state.js` 에서 export 하는 `S` 객체가 **유일한 mutable state**.
모든 모듈이 `import { S }` 해서 직접 읽고 씁니다 (Redux 같은 추상화 없음).

핵심 필드:

```js
S.liveAgents       // server 에서 받은 agents 배열 (매 WS message 마다 교체)
S.visualAgents     // PID → { x, y, theme, ... } 캔버스 위 시각 상태
S.workEvents       // 작업 이벤트 타임라인 (최근 50개)
S.selectedPid      // 현재 선택된 에이전트 (사이드바)
S.detailPid        // 디테일 패널 표시 중인 에이전트
S.directorFocusPid // 카메라 follow 중인 에이전트
S.agentSearchQuery // 사이드바 검색어
S.activeFilter     // 'all' / 'coding' / 'idle' / 'offline'
S.pinnedAgentKeys  // 핀 상태 (sessionId 또는 pid 키 배열)
S.canvasW, S.canvasH, S.zoom, S.cameraX, S.cameraY  // 캔버스 뷰포트
```

매 WS 메시지가 들어오면 `js/ws.js:handleState()` 가 `S.liveAgents` 를 갈아끼우고
`updatePanel()` / `updateStats()` / `updateDetailPanel()` 을 호출 → DOM 갱신.

렌더 루프는 `js/main.js` 의 `requestAnimationFrame(loop)` — 매 프레임 `render()`
(Canvas 2D) + `renderPixiOverlay()` (WebGL 이펙트).

### 새 기능 추가할 때 마음가짐
- 새 상태가 필요하면 `S` 에 필드 추가
- 매 frame 또는 매 WS tick 마다 그릴 거면 `render()` 또는 `updatePanel()` 안에서 처리
- 사용자가 토글하는 거면 `localStorage` 의 `ai-tycoon-*` 키에 저장 (자동으로 backup/restore + cross-tab sync)

---

## 4. 데이터 흐름 — 한 사이클

```
[Server 2s poll]
    │
    ▼
WebSocket message: { agents, workEvents, ... }
    │
    ▼ ws.js : handleState()
S.liveAgents = msg.agents
S.workEvents = msg.workEvents
    │
    ├──→ updatePanel()         사이드바 + 카드 + visibility summary + tags-bar
    ├──→ updateStats()         좌측 HUD (실시간 작업실 통계)
    ├──→ updateDetailPanel()   우측 디테일 패널 (선택된 에이전트)
    ├──→ recordStateSnapshot() js/stats.js — localStorage 일일 통계 누적
    └──→ checkAchievements()   업적 unlock 체크 + 토스트
    │
[60Hz rAF loop]
    │
    ▼ main.js : loop()
render()              Canvas 2D — 오피스, 에이전트 캐릭터, NPC
renderPixiOverlay()   WebGL — 햇빛, 비, aura, 파티클
```

WS 메시지 빈도 (2초) 와 렌더 빈도 (60Hz) 는 분리. WS 가 도착하면 상태만 바뀌고
다음 rAF 에서 그려짐 — 그래서 "stale" 한 시각 효과 없음.

---

## 5. 영속화 — `localStorage`

모든 영속 상태는 `ai-tycoon-` 접두사. 자동 백업/복원 + cross-tab 동기화 됨.

| 키 패턴 | 모듈 | 설명 |
|---|---|---|
| `ai-tycoon-theme` | constants.js | classic/cafe/forest/midnight/sakura/ocean |
| `ai-tycoon-dark` | index.html | 다크 모드 |
| `ai-tycoon-lang` | i18n.js | ko/en |
| `ai-tycoon-sound`, `-volume` | sound.js | 사운드 토글 + 볼륨 |
| `ai-tycoon-notify` | notifications.js | 데스크탑 알림 |
| `ai-tycoon-pinned-agents` | agentPriority.js | 핀 키 배열 |
| `ai-tycoon-agent-notes` | panel.js | 에이전트별 메모 ({sessionId/pid → 텍스트}) |
| `ai-tycoon-daily-stats-v1` | stats.js | 일별 통계 rollup (최근 14일) |
| `ai-tycoon-achievements-v1` | achievements.js | 업적 unlock + 카운터 |
| `ai-tycoon-search-history` | main.js | 최근 5개 검색어 |
| `ai-tycoon-agents-compact` | main.js | 컴팩트 카드 뷰 |
| ... 외 30여 종 | | |

### Backup / Restore 흐름
`js/backup.js` 의 `buildBackup()` 이 모든 `ai-tycoon-*` 키를 JSON 으로 묶음.
`restoreFromFile()` 은 atomic — 모든 setItem 성공해야 옛 키 삭제, 실패 시 rollback.

---

## 6. Hashtag 시스템 (v1.3.0+)

메모에 `#frontend` 같은 hashtag 를 적으면 8개 터치포인트에서 자동 노출.
정확한 위치와 헬퍼는 [`CONTRIBUTING.md`](../CONTRIBUTING.md#메모-hashtag-시스템-v130) 참고.

핵심 데이터 흐름:

```
사용자가 메모 textarea 에 #tag 타이핑
    │
    ▼ setAgentNote()
localStorage 갱신 + invalidateTagCache() + renderAgentTagsBar()
    │
    ▼ 다음 updatePanel()
extractTagsFromNotes() (1초 TTL 캐시)
    │
    ▼ 8개 터치포인트 동시 반영
사이드바 tags-bar / 디테일 칩 / 자동완성 / 카드 칩 /
visibility 칩 / 명령 팔레트 / empty state / 설정 매니저
```

캐시 정합 주의: 메모를 `setAgentNote` 이외 경로로 직접 수정하면
`window.aiTycoonInvalidateTagCache()` 호출 필수.

---

## 7. 캔버스 렌더링 — Canvas 2D + Pixi 오버레이

두 캔버스가 같은 위치에 겹쳐 그려집니다:

1. **`js/renderer.js`** — Canvas 2D — 정적 배경 + 픽셀 아트 sprite 들. 매 프레임 전체 redraw.
   - 오피스 그리드 (벽 / 책상 / 가구)
   - 에이전트 캐릭터 + sub-agent 슬롯
   - NPC (보스 / 청소 로봇 / 새 / 고양이)
   - 화이트보드, 화분, 시계 등 prop

2. **`js/pixiOverlay.js`** — PixiJS WebGL — 동적 이펙트만.
   - 시간대별 ambient tint (새벽/낮/노을/밤)
   - 햇빛 줄기 (창문에서)
   - 에이전트 aura (status 별 색)
   - 비 / 눈 / 벚꽃 (계절 + weather state)
   - 파티클 (작업 완료 시 confetti)
   - 워크 카드 floating UI

분리 이유: Canvas 2D 는 단순하고 정확한 픽셀 컨트롤, Pixi 는 GPU 가속 + 많은 파티클.

### 새 visual effect 추가 시
- 정적이면 → renderer.js 의 적절한 draw 함수에
- 동적/파티클이면 → pixiOverlay.js 의 `drawAgentLifeFX` 등에 추가
- **GPU 리소스 정리 주의** — Graphics 만들었으면 `destroy()` 또는 persistent 객체 재사용 (`clear()`)

---

## 8. 테스팅 + CI

- **`npm run lint`** — `scripts/lint.js` — 36+ `.js` 파일에 `node --check` 일괄
- **`npm test`** — `scripts/smoke-test.js` — 서버 부팅 → 38개 자산/API 검증 → 종료
- **CI** — `.github/workflows/ci.yml` — Node 18/20/22 매트릭스에서 lint + test
- **Playwright** — 자동화된 e2e 는 없지만 MCP 로 임시 검증 가능 (iter 202/211/214/215 참고)

번들 빌드 단계 자체가 없어서 (브라우저가 직접 ES module 로드) 테스트 시간이 짧음.

---

## 9. 검증 라운드 히스토리

v1.4.0 이후 누적 7번의 검증 라운드 (general-purpose agent 코드 리뷰 5회 + Playwright e2e 2회)
가 총 14개 잠재 버그를 잡았음. 디테일은 [`CHANGELOG.md`](../CHANGELOG.md) 의 Iteration 200~215.

새 contributor 도 비슷한 패턴으로 코드 리뷰 라운드를 돌릴 수 있음.

---

## 10. 그 외 흥미로운 디자인 결정

- **단일 mutable state `S`** vs Redux/MobX — 작은 프로젝트라 ergonomic 우선. 안정성은
  "어디서 mutate 하는지" 를 모듈 별로 명확히 분리해서 확보 (e.g. visualAgents 는 renderer/ws 만 만짐).
- **번들러 없음** — 빌드 시간 0초, hot reload 도 그냥 새로고침. cost 는 production
  bundle 최적화 못 하는 것.
- **Tailwind 의 generated CSS 만 사용** — `style.css` 가 메인이고 Tailwind 는 보조.
  `scripts/build-css.js` 로 한 번에 생성.
- **i18n 은 dictionary + `data-i18n` 속성** — 런타임에 DOM 노드 traverse 하면서 적용.
  React 의 i18next 같은 무거운 의존성 없이도 충분.

---

새 기능 / 버그 픽스 / 디자인 제안 모두 환영. [`CONTRIBUTING.md`](../CONTRIBUTING.md) 의 setup 으로 시작하시면 됩니다.
