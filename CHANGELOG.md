# Changelog

All notable changes to AI Tycoon. Versions follow loose semantic versioning;
each iteration below corresponds to one commit / feature drop.

## [Unreleased]

### Iteration 135 — 검색어 매치 부분 노란 마커로 하이라이트
- 새 `highlightTokens(safeText, query)` 헬퍼 — `esc()` 처리된 텍스트만 받아 매칭 부분을 `<mark class="search-match">` 로 감쌈
- 카드의 에이전트 이름 / 프로젝트명 / 작업 텍스트 3곳에 적용
- 검색어가 어디에 매치됐는지 즉시 시각 확인 가능
- 정규식 메타 문자 이스케이프, 다중 토큰(OR) 지원, 대소문자 무시
- 다크모드 색감 별도 (`amber-300/32%`)

### Iteration 134 — 디테일 패널 메모리 스파크라인 좌측 시간 라벨도 KO/EN
- SVG sparkline 의 좌측에 표시되는 `Nm ago / N분 전` 라벨을 다국어 분기
- 영어 모드에서 그래프 좌측에 한국어 '분 전' 이 뜨던 자잘한 leak 정리

### Iteration 133 — HUD 진단(`renderDetectorHealth`) 영역도 KO/EN
- HUD 좌상단 진단 라인 / 칩 / 힌트 모두 다국어
- 6가지 state title (탐지 준비 중/서버 연결 대기/수집 중/일부 지연/정상/준비 완료) → 영어
- 5가지 hint (근무/재연결/지연/시작 안내) 영어
- 칩 라벨 (Claude, 세션/프로세스/AI 신호, 준비/대기) 영어 분기
- 호버 ageLabel 도 `갱신` → `updated` 형식

### Iteration 132 — 시스템 헬스 상태/감지기/연결 라벨 추가 KO/EN
- `detectorLabel`: 정상/캐시/지연/대기 → OK/cached/slow/wait
- `connectionHealth`: 재연결/응답 없음/느림 → Reconnect/No response/Slow (Live는 유지)
- `healthSnapshot`: 탐지 정상/서버 연결 대기/진단 수집 중/탐지 일부 지연/직원 감지 대기/검토 필요 모두 영어 분기
- 디테일 힌트(`N명 감지 · M명 작업 중` 등)도 영어 분기

### Iteration 131 — 시스템 헬스 패널 라벨 모두 KO/EN
- 사이드 패널 상단의 시스템 상태 카드: `시스템 상태 / 프로세스 / AI 앱 / 세션 / 진단 복사 / 새로고침`
- 영어: `System status / Processes / AI apps / Sessions / Copy diagnostics / Reload`
- detector / stat / button 영역 모두 동시에 분기
- 헤더 영역은 그대로 (Codex/Cursor 같은 고유 명은 유지)

### Iteration 130 — '운영 브리핑' 헤드라인 7종도 KO/EN 분기
- `briefHeadline()` 의 7가지 상태별 title + detail 모두 다국어
- 연결 대기 / 검토 우선 / 신호 확인 / 고정 직원 추적 / 작업 흐름 정상 / 대기 직원 확인 / 직원 감지 대기
- EN: Connecting / Review first / Signal check / Tracking pinned / All flowing / Standing by / Waiting for agents
- 디테일도 `재연결 3회 → Reconnect 3x`, `5명 확인 대기 → 5 waiting for review` 등 일관 분기

### Iteration 129 — `workEventMeta` 기본값 라벨도 KO/EN
- 이벤트 객체에 라벨이 비어있는 경우 사용되는 폴백 라벨 6종 (출근/퇴근/새 작업/검토/태스크 시작/완료) 다국어
- 현재 언어 기준으로 사용해 사이드 패널 작업 스트림과 디테일 패널 모두 일관
- ws.js 에서 이미 라벨 박아주는 경우엔 그 라벨 우선 (regression 안전)

### Iteration 128 — '연결 종료' / '작업실에서 나갔어요' 도 KO/EN
- 상태가 `offline` 으로 떨어졌을 때 work-event 라벨/본문을 다국어로
- `연결 종료` → `Disconnected`, `작업실에서 나갔어요` → `Left the office`
- (퇴근 이벤트와는 별개 이벤트, 같은 문구지만 분기 위치 다름)

### Iteration 127 — 작업 이벤트 라벨/알림 메시지 KO/EN 분기
- `addAgentEvent` 의 라벨 5종 (검토 요청 / 새 작업 / 태스크 시작 / 태스크 시작 / 완료) → `Review / New work / Task start / Done`
- 검토 요청 fallback 텍스트 `확인이 필요해요` → `Needs review`
- 데스크탑 알림 (`notify`) 의 `검토 요청: ${text}` / `완료!` 도 영어 분기 (`Review needed:` / `done!`)
- 사이드 패널의 'work stream' 영역이 KO/EN 모두 자연스럽게

### Iteration 126 — 활동 로그(`addLog`) 메시지 7개도 KO/EN
- `ws.js` 안에서 `addLog()` 호출 7곳을 모두 다국어 분기
- 서버 연결/종료/응답 없음, 에이전트 출근/퇴근, 태스크 시작, 출근/퇴근 이벤트 라벨까지
- 재연결 카운터(`재연결 (3) → Reconnect (3)`) 와 연결 끊김 안내 툴팁/aria-label 도 분기
- 이제 사이드 패널 하단 활동 로그가 영어 모드에서도 자연스럽게 영문으로

### Iteration 125 — 사이드바 가시성 요약(visibility summary) 줄도 KO/EN
- `전체 보기 / N명 / 고정 N / 작업 N / 검토 N / 최근 N` 모두 KO/EN 분기
- 영어 모드: `Show all / N people / Pinned N / Working N / Review N / Recent N`
- "명" 은 한국어에서 붙여 쓰고, "people" 은 영어에서 띄어 쓰도록 자연어 조사 처리
- 검색 위 한 줄짜리 요약 띠가 영어 사용자에게도 자연스러움

### Iteration 124 — 포커스 레일(focus rail) 안내 문구 KO/EN 분기
- 포커스된 에이전트가 있을 때 `추적 중` 라벨 → `Tracking`
- 없을 때 `대기 중 / 새 에이전트 활동을 기다리는 중 / 서버 연결을 기다리는 중`
  → `Standing by / Waiting for new agent activity / Waiting for the server connection`
- 사이드 패널 상단 포커스 영역의 영어 모드도 자연스럽게

### Iteration 123 — 캔버스 서브 에이전트(태스크) hover 툴팁도 KO/EN
- 서브 에이전트 / 부모 / 상태 / 활동 / 설명 / 대기 라벨 + `작업 중 / 완료 / 대기` 상태값 모두 분기
- `Sub agent / Parent / Status / Activity / Desc / Wait / Working / Done / Pending`
- "Task X 완료 필요" → "Task X needs to complete"
- 캔버스 부유 툴팁 두 종류(에이전트/서브태스크) 모두 다국어 완료

### Iteration 122 — 캔버스 hover 툴팁 다국어 처리
- 캔버스에서 에이전트에 마우스 올렸을 때 뜨는 툴팁의 8개 라벨을 KO/EN 분기
- 상태/메모리/태스크/서브/경로/완료 → Status/Memory/Task/Sub/Path/Done
- `대기 중` → `Idle`, `N개 활성` → `N active`
- 영문 사용자가 호버해도 더 이상 한국어 라벨 안 보임

### Iteration 121 — 사이드바 카드 본문의 '대기 중' / '개 태스크' 다국어
- 작업 텍스트 fallback 인 `대기 중` → `Idle`
- 태스크 카운트 `${n}개 태스크` → `${n} task(s)` (단수/복수 처리)
- 디테일 패널에 이어 카드 본문 텍스트도 KO/EN 모두 자연스럽게

### Iteration 120 — 디테일 패널의 신호/이벤트 영역도 KO/EN 분기
- `인식 근거 → Detection basis`, `최근 신호 → Recent signals`
- `최근 ${age} → Last ${age}`
- `최근 이벤트 수집 중 → Collecting recent events`
- 디테일 패널의 거의 모든 라벨이 이제 다국어 완비

### Iteration 119 — 디테일 패널의 메모리/태스크/메타 라벨 KO/EN 분기
- 메모리 사용량 / 태스크 / "데이터 수집 중" / "등록된 태스크 없음" / "+N개 더" 모두 KO/EN
- 메타 행 라벨 (PID / 세션 / 경로) → (PID / Session / Path) 분기
- copy 버튼의 aria-label suffix 도 KO `복사` / EN `copy` 자동 매칭
- 영어 모드 디테일 패널이 완전히 자연스러워짐

### Iteration 118 — 디테일 패널 메모 UI 다국어 처리
- 메모 섹션 제목 / placeholder / aria-label / 글자 카운터 / `저장됨` 토스트 / `지우기` 버튼 모두 KO/EN 분기
- IIFE 로 한 번에 합성해 렌더링 분기 깔끔하게
- KO: `개인 메모 / 이 에이전트에 대한 메모… / 저장됨 / 지우기`
- EN: `Personal note / Anything to remember about this agent… / Saved / Clear`

### Iteration 117 — 메모 textarea 의 Cmd/Ctrl+S 즉시 저장
- 220ms 디바운스 기다리지 않고 명시적으로 저장하고 싶을 때 표준 단축키 지원
- 브라우저의 '페이지 저장' 기본 동작은 textarea 안에서만 막음 (다른 곳에서는 그대로)
- 저장 후 `flashSaved()` 로 1.2초 초록 '저장됨' 피드백 동일하게 발화
- 디바운스 타이머도 함께 클리어해 중복 저장 방지

### Iteration 116 — F1 키도 단축키 도움말 열기에 매핑
- 기존 `?` / `Ctrl+/` 외에 표준 도움말 키인 `F1` 추가
- `preventDefault()` 로 브라우저 기본 도움말 가로채기 방지
- 단축키 모달 cheatsheet 에 `F1 — 단축키 도움말 (F1 표준)` 한 줄 추가
- KO/EN i18n 키 `shortcuts.helpF1`

### Iteration 115 — 헤더 프라이버시 칩이 Strict 일 때 색·라벨 강조
- `aiTycoonPrivacy.isStrict()` 결과를 `refreshDemoChip` 사이클에서 함께 확인
- 칩에 `.is-strict` 클래스 부여 → 더 진한 인디고/바이올렛 색감
- 라벨 텍스트가 자동으로 `Strict` 로 바뀜 (원래 라벨은 `data-origText` 에 보존했다가 strict 해제 시 복원)
- 다크 모드 별도 색감
- iter 114 strict 모드 도입 후 헤더에서도 즉시 구분 가능

### Iteration 114 — Strict 프라이버시 모드 (호버 미리보기 차단)
- `Shift+P` 빠르게 두 번 (600ms 이내) → strict 모드 토글
- strict 일 때는 `body.privacy-strict` 클래스로 hover 시 unblur 비활성화 → 화면 녹화/공유 시 완전 안전
- 배지 색감 더 진한 인디고/바이올렛 그라데이션 + 텍스트 `프라이버시 (Strict)` 표시
- 명령 팔레트에 `Strict 프라이버시 (호버 미리보기 차단)` 항목 추가
- `localStorage` `ai-tycoon-privacy-strict` 키로 영속, KO/EN 토스트 안내

### Iteration 113 — 명령 팔레트 푸터에 결과 개수 표시
- 푸터 우측에 `5개 결과` 형식의 카운트 칩 추가 (auto margin 으로 우측 정렬)
- 결과 3개 미만일 때는 시각 잡음 줄이려고 빈 문자열
- 검색어 입력하면서 매칭이 어떻게 좁혀지는지 즉시 확인 가능
- `aria-live="polite"` 로 스크린 리더에도 변경 안내

### Iteration 112 — 팔레트 빈 검색 시 정렬 순서: 최근 → 핀 → 나머지
- 빈 검색 시 결과 정렬을 3단계로 명확히 분리: ① 최근 방문 LRU 순 → ② 핀된 에이전트 → ③ 나머지(점수 내림차순)
- 빈 검색에서도 핀이 항상 상단에 노출되어 자주 보는 에이전트가 클릭 한 번으로 도달
- 핀 + 최근 방문 + 점수 세 신호를 명확히 우선순위화 (이전엔 recent 만 처리, 핀은 검색 점수에만 영향)

### Iteration 111 — 명령 팔레트 결과에 메모 노트 아이콘 (📝)
- iter 93 에서 메모 매칭은 했는데, 결과 줄에 어떤 친구가 메모를 갖고 있는지 시각 표시는 없었음
- 제목 줄 끝에 작은 노트 이모지 칩 추가, hover 시 메모 첫 140자 OS 툴팁
- 핀 별(iter 106) + 최근 칩(iter 72) + 메모 노트(이번 iter) 3종으로 결과 한 줄에서 컨텍스트 즉시 파악

### Iteration 110 — `formatTimeAgo` 도 KO/EN 분기 (앱 전반 일관)
- 카드/디테일 패널/이벤트 스트림 등에서 두루 쓰이는 `formatTimeAgo()` 가 한국어만 반환했음
- 현재 언어가 `en` 이면 `just now / 3m ago / 2h ago` 형식으로 자연스럽게 출력
- KO 는 기존 `방금 전 / N분 전 / N시간 전` 그대로
- 이 한 줄 변경으로 영어 모드의 시간 표시가 동시에 모두 자연스러워짐

### Iteration 109 — 필터/검색 결과 0건 카드도 KO/EN 분기
- 사이드바에서 검색 또는 필터로 0건이 나올 때 표시되는 빈 카드의 제목/본문/리셋 버튼 모두 다국어
- 검색 0건: `No results / Double-check the name, project, or work text. / Clear search`
- 필터 0건: `No agents match the filter / Pick a different action filter or go back to all. / Reset action filter`
- 전체 필터 안내: `Switch the filter back to All to see everyone. / Show all`

### Iteration 108 — 작업 스트림 빈 상태 메시지 다국어 처리
- 활동 타임라인이 비어있을 때 표시되는 "활동 수집 중" 메시지를 KO/EN 분기
- 영어 사용자에게 `Collecting activity…` + `Events show up here as agents start working.` 노출
- 그 외에는 기존 한국어 그대로

### Iteration 107 — 메모 있는 카드 hover 시 미리보기 툴팁
- `has-note` 카드의 `title` 속성에 `📝 메모 첫 140자` 박아두기
- 디테일 패널 열지 않고도 OS 네이티브 툴팁으로 메모 확인 가능
- 공백은 단일 스페이스로 정규화, 최대 140자 컷
- `dataset.notePreview` 도 함께 박아 다른 모듈에서 활용 가능

### Iteration 106 — 명령 팔레트 결과에서 핀된 에이전트 우선 + 별 표시
- `agentPriority.isAgentPinned` 를 import 해서 결과 빌더에서 핀 확인
- 같은 검색어에서 핀된 에이전트는 점수 `+2` 가산 → 상단으로 정렬
- 결과 줄의 아바타 우상단에 작은 노란색 ★ 칩 표시 (고정됨)
- 자주 보는 에이전트를 핀 해놓으면 Ctrl+K 에서도 항상 위로

### Iteration 105 — 헤더에 프라이버시 모드 활성 칩
- 프라이버시 모드 ON 상태일 때만 헤더에 회색-슬레이트 칩 표시 + 닫힌 눈 아이콘
- 클릭하면 `aiTycoonPrivacy.toggle()` 로 즉시 해제
- 좌하단 보라색 배지(iter 61)에 더해 헤더에도 같은 정보가 있어 어디서든 한눈에 인지
- DEMO 칩과 동일한 구조/스타일로 헤더 일관성
- KO `프라이버시` / EN `Privacy` 다국어

### Iteration 104 — 헤더 DEMO 칩 클릭으로 데모 즉시 종료
- `<div>` 였던 데모 칩을 `<button>` 으로 바꾸고 `aiTycoonDemo.toggle()` 핸들러 연결
- 호버 시 배경 진해지고 살짝 위로 떠오름, active 시 원래대로
- `header.demoTitle` / `header.demoAria` i18n 키로 KO/EN 동작 안내
- 표시만 하던 칩이 액션 가능한 컨트롤이 됨

### Iteration 103 — 데모 모드 활성 시 헤더에 'DEMO' 보라색 칩
- `aiTycoonDemo.isEnabled()` 결과를 5초마다 polling 해서 헤더 칩 표시
- 보라/인디고 그라데이션 칩 + ▶ 아이콘으로 '재생 중' 느낌
- 데모 모드 종료 시 즉시 숨김 (`refreshDemoChip()` 가 `refreshTabCount` 안에서 같이 호출)
- KO "데모" / EN "DEMO" 다국어
- 가짜 직원 보고 있다는 걸 항상 명확히 인지

### Iteration 102 — 헤더 stuck 칩에 i18n 적용
- 라벨 / title / aria-label 을 `header.stuckLabel` · `header.stuckTitle` · `header.stuckAria` 3개 키로 분리
- KO 그대로 "멈춤" 유지, EN "stuck" / "Jump to the most-stuck agent" / "Jump to stuck agent" 로 자연스럽게
- 영어 사용자에게도 통일된 헤더 경험 제공

### Iteration 101 — 헤더에 멈춤 카운트 칩 + 한 번에 포커스
- 헤더 연결 상태 옆에 호박색 `⏳ N 멈춤` 칩, stuck 0명이면 자동 숨김
- 5초 인터벌(`refreshTabCount`)에 함께 갱신되어 항상 신선
- 클릭 시 `focusFirstStuckAgent()` 가 가장 오래 멈춰있던 친구로 포커스
- 2.4초 주기 펄스 애니메이션, `prefers-reduced-motion` 사용자는 정적 표시
- 다크 모드 별도 톤 (amber-400)

### Iteration 100 — package.json 메타데이터 보강 (출시 준비)
- `description` 을 영문 → 한국어 + 지원 플랫폼 8종 명시로 갱신
- `homepage` / `repository` / `bugs` URL 명시
- `keywords` 15종 추가: claude-code, ai-agent, dashboard, pixel-art, real-time, websocket, pwa, cursor, codex, copilot, ollama, lm-studio, monitoring, developer-tools 등
- 향후 npm 검색이나 GitHub topic 노출 시 발견성 ↑
- JSON 파싱 / smoke 테스트(38/38) 정상 통과 확인

### Iteration 99 — 서버 부팅 배너에 버전 + Node 표기
- ASCII 박스 아래쪽 부분에 `v1.1.0` 줄과 `Platform: win32 · Node v22.x` 한 줄 보강
- `VERSION` 상수를 그대로 가져오므로 다음 릴리즈부터 자동 갱신
- 운영 환경에서 어떤 빌드가 떴는지 SSH 로 봐도 즉시 식별

### Iteration 98 — 에이전트 메모 textarea 도 IME 조합 처리
- 메모 자동저장(디바운스 220ms)이 한글 IME 조합 중에는 자모 단위로 박힐 수 있어 막음
- `compositionend` 시점에는 디바운스 무시하고 즉시 저장 + '저장됨' 피드백
- 영문 입력은 기존 디바운스 그대로 (이벤트 미발생)
- 사이드바 / Ctrl+K / 단축키 모달에 이어 4개 입력 모두 일관된 IME 처리

### Iteration 97 — 단축키 모달 검색 input 도 한글 IME 조합 보류
- 사이드바 / Ctrl+K 와 동일한 패턴: `compositionstart`/`compositionend` 으로 조합 플래그
- 단축키 검색에서 한글 키워드 입력 시 자모 단위 필터링 깜빡임 제거
- 앱 전반의 입력 UX 가 한글 사용자에게 일관되게 부드러워짐

### Iteration 96 — 명령 팔레트 input 도 한글 IME 조합 보류
- 사이드바 검색(iter 95)과 동일한 패턴: `compositionstart` → `_imeComposing=true`, `compositionend` → `false` 후 한 번에 `render()`
- Ctrl+K 열고 한글로 빠르게 타이핑할 때 자모 단위 결과 깜빡임 사라짐
- 영문 입력에는 영향 없음

### Iteration 95 — 검색 input 의 한글 IME 조합 중 검색 보류
- `compositionstart` 에 `_imeComposing=true`, `compositionend` 에 `false` 플래그 토글
- `oninput` 은 조합 중이 아닐 때만 `setAgentSearch` 호출 → 자모 단위 매칭으로 인한 깜빡임 방지
- 조합이 끝나면 한 번에 갱신, 디바운스(iter 94)와 조합되어 부드러운 한글 입력 경험
- 영문 입력에는 영향 없음

### Iteration 94 — 사이드바 검색 입력 120ms 디바운스
- `setAgentSearch()` 가 빈 문자열일 때만 즉시 반영, 그 외엔 120ms 디바운스
- 빠른 타이핑 + 한글 IME 조합 시 매 키스트로크마다 풀 패널 렌더링 부담을 줄임
- 검색어는 localStorage 에 즉시 저장 (탭 닫혀도 보존)
- X 버튼 클릭이나 ESC 로 검색 비우는 경우는 디바운스 우회

### Iteration 93 — 명령 팔레트도 메모 매칭에 포함
- `commandPalette.js` 의 `scoreAgent()` haystack 에 메모 본문 추가
- 사이드바 검색과 동일한 키워드(예: "리팩터링", "디자인") 로 Ctrl+K 에서도 즉시 도달
- 두 검색이 같은 데이터 소스를 보게 되어 사용자 멘탈 모델 일관성 ↑

### Iteration 92 — 사이드바 검색이 개인 메모 텍스트도 매칭
- `agentSearchText(agent)` 가 `getAgentNote(agent)` 결과를 haystack 에 포함
- 메모에 "리팩터링", "디자인 작업" 같은 단서를 적어두면 그 키워드로 빠르게 에이전트 찾기
- 빈 메모는 자동으로 필터링되어 노이즈 없음
- 단순 한 줄 변경이지만 메모 + 검색 두 기능을 연결해 활용도 ↑

### Iteration 91 — Insights 모달의 완료 태스크에 '어제 대비' 델타 칩
- "완료 태스크" 카드 숫자 옆에 `+5` / `-2` / `±0` 형식의 작은 칩 추가
- `yesterdayStats()` 가 있는 날부터만 표시 — 첫날엔 자연스럽게 숨김
- tone (up/down/flat) 별로 emerald · rose · slate 색상 분기, 다크 모드 별도
- 호버 시 `어제 대비: +5` 툴팁
- 어제와 비교하면서 "오늘 더 일했나" 즉시 가늠 가능

### Iteration 90 — README 상단에 v1.1.0 새 소식 요약 배너
- README 최상단에 버전 배지 추가 (`version-1.1.0`)
- "🆕 v1.1.0 새 소식 (요약)" 섹션으로 핵심 신기능 12개 한 줄씩 정리
- 자세한 변경은 `CHANGELOG.md` 링크로 안내
- 처음 저장소에 들어오는 사람도 최신 변경 사항을 즉시 인지

## [1.1.0] — Iter 54-88 모음 릴리즈
- 명령 팔레트(Ctrl/Cmd+K), 프라이버시 모드(Shift+P), 에이전트 메모, 컴팩트 뷰,
  '오늘의 MVP' 카드, '자리 비운 사이' 토스트, 멈춤 감지, 신선도 색상 코딩,
  HUD 타이틀 인라인 편집, 스토리지 사용량 표시, 데모/스탠드업/메모 export,
  단축키 검색, macOS ⌘ 자동 표시, '위로' 부유 버튼 등 다수
- 업적 21 → 24개로 확장
- Smoke 테스트 32 → 38개로 확장 (API JSON 계약 검증 포함)
- 서버 graceful shutdown 추가
- `package.json` / `server.js` 의 VERSION 1.0.0 → 1.1.0 로 올림

### Iteration 88 — 카드 신호 라인에 신선도 색상 코딩
- `.agent-signal-line` 에 `data-freshness` 속성 (fresh / recent / warm / stale)
- `< 1분` 초록(emerald), `< 5분` 호박(amber), `< 30분` 회색(neutral), 그 이상 흐린 회색(zinc)
- 레이더 아이콘과 "최근 N분" 텍스트가 함께 색이 변해 한눈에 활동 신선도 파악
- 다크 모드 별도 톤
- 카드 하나하나 클릭하지 않아도 어느 친구가 방금 일했는지 색으로 즉시 인지

### Iteration 87 — 단축키 모달에 키워드 검색 입력
- 모달 상단에 검색바 추가, 공백으로 분리된 토큰 모두 매칭(AND) 되는 항목만 표시
- 매칭이 없는 그룹 헤더는 자동으로 숨김, 결과 0건이면 안내 문구
- 모달 열 때마다 검색어 자동 리셋 + 80ms 후 포커스 — 즉시 타이핑 가능
- KO `단축키 또는 동작 검색…` / EN `Search shortcuts or actions…`
- 단축키 18+ 개가 쌓여서 빠르게 찾는 게 어려웠던 문제 해소

### Iteration 86 — 사이드 패널 '위로' 부유 버튼
- 에이전트 리스트 스크롤이 240px 이상 내려가면 우하단에 작은 ↑ 버튼이 등장
- 클릭하면 `behavior: "smooth"` 로 부드럽게 최상단 복귀
- position: sticky + 음수 margin 트릭으로 컨테이너 우하단 모서리에 고정
- 다크 모드 호박색 톤, hover 시 살짝 위로 떠오름
- 카드 10+ 누적 시 다시 올라오는 게 귀찮던 점 해소

### Iteration 85 — 데모 모드 토글 시 안내 토스트
- `setDemoEnabled` 에서 상태 변화가 있을 때만 토스트로 ON/OFF 안내
- KO `데모 모드 ON / 합성 직원이 등장합니다. 한 번 더 누르면 종료돼요.`
- EN `Demo mode on / Fake agents will appear. Click again to stop.`
- 부팅 시 이전 상태 복원되는 경우(`enabled === true` 그대로)에는 발화하지 않음 — 시끄러움 방지
- 처음 데모 모드를 켜는 사용자가 "진짜 합류한 직원인가?" 헷갈리지 않게

### Iteration 84 — 설정 → 데이터에 브라우저 저장 공간 사용량 표시
- `ai-tycoon-*` 키 개수와 합산 바이트(KB) 를 백업 안내 문구 바로 아래에 노출
- 다국어 (KO `브라우저 저장 공간: 28개 키 · 14.2 KB`, EN `Browser storage: 28 keys · 14.2 KB`)
- 백업 / 초기화 누르기 전에 얼마나 쌓였는지 가늠 가능
- 다크 모드 별도 톤, 아이콘 + tabular-nums

### Iteration 83 — HUD 작업실 타이틀 인라인 편집 (더블클릭 / Enter)
- HUD 상단의 "실시간 작업실" 타이틀을 더블클릭 또는 포커스 후 Enter 키로 즉시 인라인 입력 전환
- Enter → 저장, Esc → 취소, blur → 저장 (트리플 안전)
- 호버 시 점선 outline 으로 클릭 가능 신호, focus-visible 시 키보드 사용자도 인지
- 설정 모달 들어가지 않고도 헤더에서 바로 워크스페이스 이름 변경
- 다크 모드 별도 색감, 입력 시 호박색 보더 + 그림자

### Iteration 82 — 설정 → 데이터 섹션에 스탠드업/메모 export 버튼
- 명령 팔레트에만 있던 두 export 기능을 설정 모달에서도 두 버튼으로 노출
- `일일 리포트 (.md)` + `에이전트 메모 (.md)` 한 쌍으로 CSV 옆에 배치
- `settings.exportStandup` / `settings.exportNotes` i18n 키 추가 (KO/EN)
- 키보드 단축키를 모르는 사용자도 GUI 에서 자연스럽게 발견 가능

### Iteration 81 — 신규 기능 연계 업적 3종 추가
- **단축 마법사** (`cmdk-wizard`): 명령 팔레트(Ctrl+K)를 5번 열기 — `bumpCounter("paletteOpens")`
- **메모장이** (`note-keeper`): 3개 이상 에이전트에 메모 저장 — localStorage 직접 카운트
- **조용한 모드** (`incognito`): 프라이버시 모드 처음 켜기 — `setFlag("privacyEverOn", true)`
- `window.aiTycoonAchievements`에 `bumpCounter`/`setFlag` 노출해 다른 모듈에서 호출
- 업적 총 24개 (기존 21개 → 24개)

### Iteration 80 — 메모 자동 저장 시 '저장됨' 시각 피드백
- 디테일 패널 메모를 220ms 디바운스로 저장하는데, 저장 시점이 안 보여서 사용자가 헷갈릴 수 있었음
- 저장 직후 푸터 힌트를 1.2초간 초록색 "저장됨 · N/500" 으로 강조 후 원래 문구로 복귀
- "지우기" 버튼 클릭 시에도 동일 피드백
- `is-saved` 클래스 + CSS 트랜지션, 다크 모드 별도 톤

### Iteration 79 — 에이전트 메모 일괄 Markdown 내보내기
- `buildNotesMarkdown` / `downloadNotesMarkdown` 함수 추가 (`standupExport.js`)
- 저장된 모든 `ai-tycoon-agent-notes` 항목을 sessionId/PID 별로 묶어 Markdown 헤더 + 본문 출력
- 현재 살아있는 에이전트와 매칭되면 이름/프로젝트도 헤더에 포함
- 명령 팔레트에 "에이전트 메모 내보내기 (Markdown)" 항목
- 메모가 0개일 때도 안전하게 빈 안내 출력, KO/EN 다국어

### Iteration 78 — macOS 사용자에게 Ctrl 대신 ⌘ 자동 표시
- `<kbd>` 요소 중 `data-mod-key` 속성을 가진 것들을 macOS 에서는 `⌘` 로 갈아끼움
- 검색바 Ctrl+K 칩, 단축키 도움말 모달의 Ctrl 키 모두 자동 변환
- `navigator.platform` 으로 Mac/iPad/iPhone 감지, 그 외에는 그대로 Ctrl
- DOMContentLoaded + 400ms 추가 호출로 헬프 모달이 늦게 그려져도 반영

### Iteration 77 — 멈춘 에이전트 수를 브라우저 탭 제목에 노출
- `refreshTabCount` 가 stuck 에이전트도 계산해 `⚠ N · (M) 작업실 · AI Tycoon` 형식으로 제목 갱신
- 다른 탭에서 작업하다 페이지 안 봐도 멈춤 상태를 즉시 인지
- 5초 인터벌 그대로 사용, 추가 코드 없이 기존 카운터에 한 줄만 더함
- 임계값(5분)은 `panel.js` 의 `isAgentStuck` 과 동일하게 유지

### Iteration 76 — 빈 상태 카드에 지원 AI 도구 8종 + 데모 CTA
- 에이전트가 0명일 때 단순한 텍스트 대신 지원 플랫폼 8개를 컬러 칩으로 나열
- Claude · Codex · Cursor · Copilot · Ollama · LM Studio · Jan · GPT4All
- "데모 모드로 미리 보기" 그라데이션 버튼으로 처음 보는 사용자가 빈 화면이 아니라 살아있는 작업실을 즉시 체험 가능
- KO/EN 다국어 분기
- 다크 모드 톤 분리

### Iteration 75 — 멈춤 감지 1회 토스트 알림
- 에이전트가 처음으로 stuck 상태(`isAgentStuck` true)로 전환되는 순간 한 번만 토스트
- 클릭하면 해당 에이전트로 포커스 (review 톤 사용)
- 다시 움직이면 `_stuckNotified` Set 에서 제거 → 다음에 또 멈추면 한 번 더 알림
- 패널을 안 보고 있어도 책상에서 일하다 알 수 있음
- KO/EN 다국어 메시지

### Iteration 74 — 멈춘 에이전트 감지 칩 (5분 무신호 + 작업중 상태)
- `isAgentStuck(agent)` 헬퍼: 상태가 coding/thinking/searching/reviewing 인데 신호 age > 5분이면 `true`
- 해당 카드에 `.is-stuck` 클래스로 호박색 보더, 헤더 행에 `멈춤?` 칩 표시
- 호버 시 "5분 이상 활동 신호 없음 — 멈춘 것 같아요" 툴팁
- 다크 모드 별도 색감, 모래시계 아이콘으로 직관적
- 프롬프트 입력 기다리며 멈춘 세션을 빠르게 발견할 수 있음

### Iteration 73 — 디테일 패널 프로젝트 칩 클릭 시 동일 프로젝트만 필터
- 디테일 패널 상단의 프로젝트 이름을 클릭 가능한 칩으로 변경
- 클릭하면 검색창에 프로젝트명이 자동 입력 → 같은 프로젝트의 다른 에이전트만 노출
- 이미 동일한 검색어 상태면 한 번 더 누를 때 해제 (토글)
- 색상 닷 + 필터 아이콘으로 클릭 가능함을 시각적으로 안내
- 다크/라이트 별도 톤

### Iteration 72 — 명령 팔레트 최근 방문 기억
- Ctrl+K 열고 빈 입력 상태일 때 최근 방문한 에이전트 최대 5명을 상단에 노출
- LRU 큐로 `ai-tycoon-cmdk-recent` localStorage 키에 sessionId/pid 저장
- "최근" 칩으로 시각 구분, 같은 작업으로 다시 돌아갈 때 한 번 더 검색할 필요 없음
- 다크 모드 전용 라벤더 톤, 모바일에서도 자연스럽게

### Iteration 71 — 일일 스탠드업 리포트 Markdown 내보내기
- 새 `js/standupExport.js`: 오늘 작업을 Markdown 형식으로 정리해서 다운로드
- 구조: `한눈에` (활성/완료/진행) → `에이전트별 작업` (이름/프로젝트/플랫폼/완료/진행 + 현재 작업) → `최근 이벤트` (10건)
- KO/EN 다국어, 파일명 `ai-tycoon-standup-YYYY-MM-DD.md`
- 명령 팔레트에 "일일 리포트 (Markdown)" 항목 추가
- 일일 스탠드업 / 데일리 리포트 / 주간 보고에 그대로 붙여넣기 가능
- SW v12, smoke test 38개로 확장

### Iteration 70 — About 카드에 Service Worker 버전 표시
- 설정 → 정보 카드에 SW 캐시 버전 줄 추가 (`SW: ai-tycoon-shell-v11`)
- `/sw.js`를 `cache: no-store` 옵션으로 fetch 해서 VERSION 상수를 정규식으로 추출
- 사용자가 캐시가 최신인지, 새 SW 가 잘 활성화됐는지 한눈에 확인 가능
- 라이브 서버 API + SW 정적 자산 두 출처를 모두 표시해 디버깅 친화

### Iteration 69 — README 대규모 업데이트 (iter 54-68 반영)
- "UX 폴리시" 섹션 상단에 11개 신규 기능 강조: 명령 팔레트, 프라이버시 모드, 메모, 컴팩트 뷰, 상태 칩, 프로젝트 닷, NEW 펄스, MVP 카드, 자리 비운 사이, 메모리 추세, 5-step 투어
- 단축키 표 갱신: `Shift+P`(프라이버시), `Ctrl+K`(팔레트) 분리, `/`(검색)·`Ctrl+/`(도움말 대체) 명확화
- 테마 개수 4→6 (사쿠라/바다 포함), 업적 14→21 (콘도드 등)
- English 섹션 동기화 + Polish 카테고리 확장

### Iteration 68 — 에이전트별 개인 메모
- 디테일 패널 하단에 "개인 메모" 텍스트 영역 — 최대 500자
- 입력 220ms 디바운스 → `localStorage` (`ai-tycoon-agent-notes`) 에 sessionId/PID 키로 저장
- 메모가 있는 에이전트 카드 좌상단에 황금색 점 표시 (`.has-note::before`)
- 디테일 패널의 footer에 글자 수 카운터 + "지우기" 버튼
- `data-privacy` 속성으로 프라이버시 모드에서도 자동 블러 처리
- 같은 에이전트를 다음에 열 때 메모가 그대로 — 컨텍스트 유지

### Iteration 67 — 컴팩트 에이전트 카드 모드 (토글)
- 정렬 드롭다운 옆 작은 리스트 아이콘 버튼 → 클릭 시 컴팩트 보기 토글
- 컴팩트 모드: 카드 패딩 축소, 서브태스크 리스트 숨김, 신호 라인 제거, 보더 슬림화
- 많은 에이전트(10+) 운영 시 한 화면에 더 많이 표시
- 상태는 `ai-tycoon-agents-compact` localStorage 키로 영속
- 토글 시 토스트로 ON/OFF 피드백, 다크 모드 별도 색감
- `aria-pressed` 접근성 + 활성 시 보라색 강조

### Iteration 66 — 설정 모달의 "새 소식" (What's new) 패널
- 설정 모달에 최근 12개 변경 사항 중 상위 6개를 인라인 표시
- 다국어 (KO/EN), 아이콘별 색감 (ok/feature/highlight/design/stable 5톤)
- 그라데이션 카드 + "전체 변경 사항 보기 →" 링크 → GitHub CHANGELOG.md
- 설정 열 때마다 자동 갱신, 다크모드 별도 색감

### Iteration 65 — Smoke test에 API JSON 계약 검증 추가
- `/api/health` 응답을 JSON 으로 파싱하여 `ok / version / startedAt / uptimeMs / nodeVersion / platform / clients / agents.total / agents.running / pollIntervalMs` 9개 필드 존재 확인
- `/api/agents` 응답 구조 검증 (`ok / count / agents[]`)
- `/api/agents` CORS 헤더 (`Access-Control-Allow-Origin: *`) 확인
- 단순 substring 검사에서 실제 API 계약 회귀 방지로 한 단계 업그레이드
- 총 검증 항목 34개 → 37개

### Iteration 64 — 명령 팔레트 발견성 강화 (투어 + 검색바 힌트)
- 검색 입력창 우측에 `Ctrl K` 키캡 칩 — 클릭하면 명령 팔레트 즉시 오픈
- 호버 시 보라색 강조, 모바일(<480px) 자동 숨김, 다크모드 별도 색감
- 온보딩 투어에 5번째 스텝 추가: 검색바를 가리키며 "명령 팔레트 (Ctrl+K)" 안내
- 신규 사용자는 첫 방문 시 바로, 기존 사용자는 검색 칩으로 자연스럽게 발견

### Iteration 63 — 메모리 추세 화살표 (▲ / ▼)
- 에이전트 카드의 메모리 옆에 30초 전 대비 추세 화살표 표시
- ▲ 빨강 = +30MB 이상 증가, ▼ 초록 = -30MB 이상 감소, 그 사이는 표시 없음
- `memoryTrend(agent)` 헬퍼: S.memoryHistory에서 timestamp로 ~30초 전 샘플 검색
- 호버 시 정확한 증감량을 툴팁으로 (`+45MB` 등), aria-label 도 포함
- 가벼운 ‑ 카드 레이아웃에 영향 없음 (8px 인라인 텍스트)

### Iteration 62 — 명령 팔레트 명령 22종 확장
- 6개 카테고리 × 22명령으로 확장: Display (다크/프라이버시/시네마), Modal (인사이트/설정/도움말), Filter (전체/코딩/대기/오프라인), Theme (6종), Language (한/영), Tools (데모/스냅샷/백업/음소거)
- 빈 검색 시 자주 쓰는 6개 기본 표시, 입력 시 22개 전체에서 매칭
- `window.toggleCinemaMode` / `window.applyTheme` 글로벌 노출 — 팔레트에서 즉시 호출 가능
- 이제 Ctrl+K 만으로 거의 모든 기능에 도달 가능 — 마우스 없이 운영

### Iteration 61 — 프라이버시 모드 (Shift+P)
- 새 `js/privacyMode.js`: 프롬프트·프로젝트명·태스크·로그를 `filter: blur(4px)`로 가림
- 좌하단 'EYE_CLOSED + 프라이버시 모드' 보라색 배지로 모드 활성화 시각화 (X 버튼으로 즉시 해제)
- 흐려진 텍스트에 hover 하면 잠깐 또렷해짐 — 본인은 읽을 수 있고 화면 공유 시청자는 못 읽음
- `Shift+P` 단축키 + 명령 팔레트에 '프라이버시 모드 토글' 항목 추가
- 토글 시 토스트로 ON/OFF 안내, 상태는 localStorage 에 영구 저장
- 모든 민감한 셀렉터 통합: 카드 / 디테일 / 인사이트 / 토스트 / 명령 팔레트 / `[data-privacy]` 지정 가능
- SW v11, smoke test 34개로 확장

### Iteration 60 — 명령 팔레트 (Ctrl+K / Cmd+K)
- 새 `js/commandPalette.js` — VS Code 스타일 빠른 검색 모달
- 입력 즉시 에이전트 이름 / 프로젝트 / 플랫폼 / 현재 작업 텍스트 / PID 를 다중 토큰으로 매칭, 상위 8명 표시
- 추가로 글로벌 명령 6종 (다크 토글, 데모 토글, 인사이트, 스냅샷, 설정, 도움말) 결과
- ↑↓ 키 네비게이션 + Enter 실행 + Esc 닫기 + 클릭 + 호버 미리보기
- 카드는 18% 위에서 페이드인, 라이트/다크 양쪽 톤 매칭, 모바일 96vw 너비 대응
- 기존 Ctrl+K (검색바 포커스)는 / 단축키로 분리, Ctrl+K 는 팔레트 전용
- SW v10, smoke test 33개로 확장

### Iteration 59 — 프로젝트별 일관된 색상 닷
- 에이전트 카드 헤더에 프로젝트 이름 앞 작은 8px 컬러 닷 추가
- `projectColor(name)` 헬퍼: 프로젝트 이름의 32-bit 해시 → HSL 360° 분포 → 안정적 색상
- 같은 프로젝트의 모든 에이전트는 똑같은 닷 색상으로 묶여 시각적 그룹핑이 명확해짐
- 흰색 보더 링으로 다크/라이트 모두에서 닷이 또렷하게 보이도록 조정
- 카드 헤더 레이아웃을 flex로 다듬어 긴 프로젝트명도 잘 잘림

### Iteration 58 — 사이드 패널 상단에 상태별 요약 칩
- 에이전트 목록 위에 한 줄짜리 상태 분포 칩 (`6 코딩 · 2 생각 · 1 검토 · 3 대기 …`)
- 0이 아닌 상태만 표시, 활동량 큰 순으로 배치
- 코딩/대기/오프라인 칩은 클릭 가능 — 클릭하면 해당 상태 필터, 다시 클릭하면 전체로 토글
- 활성 필터와 동기화되어 현재 어떤 필터가 적용됐는지 한눈에 확인
- 다크모드 색감 별도, `color-mix()` 로 자동 톤 매칭

### Iteration 57 — "방금 출근" 펄스 + NEW 배지
- 새로 등장한 에이전트 카드는 60초 동안 초록 보더 펄스 + 우측 상단 NEW 칩
- `S.visualAgents[pid].joinedAt`를 ws.js에서 기록해 두고 panel.js 에서 `(now - joinedAt) < 60s` 일 때 `.is-new` 클래스 부여
- `agentJoinPulse` (그림자 링 확산) + `agentJoinBadge` (페이드인-아웃) keyframes
- `prefers-reduced-motion` 사용자는 정적 상태로 표시
- 다크모드는 더 진한 emerald 보더로 톤 매칭

### Iteration 56 — Insights 모달에 "오늘의 MVP" 카드
- 새 섹션이 Insights 모달의 플랫폼 분포와 Top 5 프로젝트 사이에 등장
- 점수 = (완료 태스크 × 3) + 최근 work-event 개수 + (실행 중이면 +1) 으로 가장 활발한 에이전트 1명을 선정
- 황금 트로피 아이콘 + 에이전트 아바타 + 프로젝트 이름 + 통계 — 클릭하면 해당 에이전트로 포커스
- 점수가 0이면 섹션 자체를 숨김 (조용한 시간에 빈 카드 안 보이도록)
- 다국어 키 `insights.mvp` (KO "오늘의 MVP" / EN "Today's MVP") 추가
- 다크모드 전용 색감 / 모바일 그리드 재배치 포함

### Iteration 55 — "자리 비운 사이" 요약 토스트
- New `js/awaySummary.js`: listens to `visibilitychange`, snapshots the work-event tally when the tab hides, and on return (after ≥ 30 s away) shows a single concise toast — e.g. `완료 2 · 검토 요청 1 · 출근 1` — so users don't miss what happened while they were elsewhere
- Bilingual: KO `자리 비운 사이 (3분)` / EN `While you were away (3 min)`
- Toggle via `aiTycoonAwaySummary.setEnabled(false)` or localStorage `ai-tycoon-away-summary`; on by default
- SW bumped to v9; smoke test now exercises 32 endpoints

### Iteration 54 — Graceful server shutdown + client toast
- `SIGTERM` / `SIGINT` now stops poll & heartbeat intervals first, then broadcasts a `server_shutdown` JSON message to every WS client so the UI can show a friendly toast before the socket closes
- Uses `wss.close()` → `httpServer.close()` for clean drains, with a 3-second safety-net `setTimeout` that force-exits if anything hangs
- New `uncaughtException` / `unhandledRejection` handlers route through the same shutdown path so a crash doesn't leave half-broadcast state behind
- Client side: ws.js shows a 6 s "system" toast (`서버가 종료됩니다 — 다시 켜지면 자동 재연결할게요`) and logs the event; toasts.js gains a `system` kind (slate icon) + optional `duration` override

### Iteration 40 — Typing dots above coding agents
- Three small bouncing dots above any agent currently `coding`, tinted with their platform colour
- Hidden when a speech bubble is up to avoid visual collision

### Iteration 39 — Daily mood line in Insights
- Friendly sentence describing today's pace: 조용한 오피스 / 여유로운 하루 / 꾸준한 흐름 / 활발한 하루 / 마라톤 모드 / 불타는 하루
- Emoji + colour-coded background + task count chip on the right

### Iteration 38 — Live agent count in tab title
- `(N) AI Tycoon` (or `(N) {workspace} · AI Tycoon`) refreshed every 5 s

### Iteration 37 — README refresh
- Highlights section synced with new features
- Dedicated shortcuts table (14 keys + Konami)

### Iteration 36 — J/K agent cycling
- `J` next agent, `K` previous, auto-engages director mode
- Toast feedback with project name + N/M position

### Iteration 35 — Sound preview buttons
- Four colour-coded preview buttons in Settings → Sound (join/leave/done/review)
- Auto-enables sound if currently off so the first tap actually plays

### Iteration 34 — CHANGELOG sync · SW v7

### Iteration 33 — Cinema mode (Z key)
- Single hotkey hides every canvas overlay (HUD, work stream, tip, mini-map, focus rail, perf, empty CTA)
- Header + side panel fade to 6% opacity, restored on hover
- Combine with `P` to capture clean office screenshots

### Iteration 32 — Sound mute hotkey · "Reset all" option
- `M` toggles sound effects, with on/off toast
- Settings → Data → "Reset all preferences" wipes every `ai-tycoon-*` key + reloads

### Iteration 31 — SW update prompt
- New service-worker version emits an in-app toast with a "Refresh" action
- Previous behaviour just logged to console

### Iteration 30 — A11y focus rings · hotkey hint badges · CHANGELOG sync
- Visible `:focus-visible` outline (orange, 2.5px) for every focusable control
- Tiny `data-hotkey` badges appear on hover for `,` `P` `I` `?` `D` toolbar buttons
- Synced CHANGELOG for iterations 28-30

### Iteration 29 — Platform-tinted monitors · CSV feedback
- Each agent's monitor screen glows in their platform brand colour
- Blinking 1-pixel cursor on active screens
- CSV export now shows a toast ("CSV 저장 완료 · N 일자") and gracefully handles empty stats

### Iteration 28 — Workspace name · CSV stats export
- Settings → Appearance "Workspace name" input customises page title + HUD label
- Settings → Data "Export daily stats CSV" downloads a 14-day rollup as CSV
  (columns: date, completedMax, agentsMax, joinedCount, events, platformsTop)
- New key added to cross-tab sync list

### Iteration 27 — HUD visibility toggles · CHANGELOG sync
- Toggle live HUD and work-stream overlays from Settings → Appearance
- Both persisted in localStorage + cross-tab synced
- KO/EN labels

### Iteration 26 — Time-scrub slider · GitHub help links
- Settings → Demo: time scrubber slider (0-1439 minutes, 5-min steps)
- Slider icon auto-shifts: moon-stars → cloudy-sun → sun → sunset → moon
- Bidirectional sync with time input + "real-time" reset
- Settings → Help: GitHub repo link + bug-report link
- Anchor styling compatible with `.settings-action`

### Iteration 25 — Sakura + Ocean themes · CI workflow
- 6 office themes total (Classic / Cafe / Forest / Midnight / Sakura / Ocean)
- Sakura: cherry-blossom pinks + ivory floor + green plants
- Ocean: teal/cyan with deep-blue dark mode
- GitHub Actions CI on push/PR for Node 18/20/22 (`npm test`)
- README badges (CI, MIT, Node ≥18, PWA)
- `.gitignore` expanded (editor/OS/test/env), `engines.node = ">=18"`

### Iteration 22 — Console branding · Konami egg · friendly 404
- Boot banner in DevTools console with helper-API hints
- ↑↑↓↓←→←→BA easter egg — 60-piece confetti + body filter shift + Hidden achievement (21 total)
- Friendly 404 HTML page with "back to office" CTA; JSON fallback for non-HTML requests
- Smoke test grew to **30 checks**

### Iteration 21 — Empty-state Try-Demo CTA
- Centered card overlay when no agents detected
- One-click "Start demo" button + ambient glow pulse
- KO/EN, dark mode, mobile, reduced-motion friendly

### Iteration 20 — `/api/health` · About panel · clickable toasts
- New `GET /api/health` JSON endpoint (version, uptime, agents, diagnostics)
- About section in Settings — live-fetched server info
- Toasts carry `pid` → clicking jumps the camera to that agent

### Iteration 19 — Project drill-down modal · 20 achievements
- New project drill-down modal: stats, platforms, agent list, recent tasks
- 6 new achievements: century, marathon-week, snapshot-taker, customizer, project-curious (+konami later)
- Click any project chip in Insights to open

### Iteration 18 — Office dog NPC · WebSocket quality
- Roaming corgi in the lounge with sit/wag/bark behaviour
- Heartbeat-gap based connection quality indicator: good / fair / poor

### Iteration 17 — Cross-tab sync · brand mark animation
- BroadcastChannel + storage fallback syncs 21 preference keys between open tabs
- Header brand mark: hover rotate + sequential blink

### Iteration 16 — Sunrise/sunset birds · Replay tour/tips
- 5 bird silhouettes drift across windows at dawn / golden hour / sunset
- Settings "Replay tour" and "Show tips again" buttons

### Iteration 15 — `npm test` smoke test
- 28-check smoke test bootstraps server, verifies assets + modules
- Exit codes 0/1/2/3 for CI

### Iteration 14 — In-app toasts · onboarding spotlight tour
- Slide-in toast cards for join/leave/task-done/review
- 4-step spotlight tour after welcome dismissal (one-time)

### Iteration 13 — Backup/restore · README rewrite
- JSON export/import of every `ai-tycoon-*` localStorage key
- README KO + EN sections rewritten with full feature matrix

### Iteration 12 — Mini-map · achievement badge
- Office mini-map appears when zoomed in ≥1.1x; click-to-pan
- Unseen-achievement counter on header chart icon

### Iteration 11 — Performance HUD · "Did you know?" tips
- Ctrl+Shift+P toggle for FPS / heap / density overlay
- 10-tip rotating hint card (5s show, 30s rotate)

### Iteration 10 — PWA · chart tooltips · theme fade
- `manifest.webmanifest` + service worker + install button
- Rich hover tooltips on 7-day chart + heatmap
- Theme transition fade animation

### Iteration 9 — Office themes · seasonal decor
- 4 themes: Classic / Cafe / Forest / Midnight
- Auto decorations: Christmas tree + snow (Dec), pumpkin + spider web (Oct-Nov), cherry blossoms (Mar-Apr)

### Iteration 8 — PNG snapshot · clickable activity feed
- `P` hotkey saves the canvas + Pixi composite as PNG
- Insights activity rows are buttons that focus the agent

### Iteration 7 — Splash · confetti · hourly heatmap
- Branded splash before main.js boots
- Confetti burst on achievement unlock
- 24-hour activity heatmap in Insights

### Iteration 6 — Demo mode · security guard NPC
- Toggle 6-8 synthetic agents for screenshots / showcases
- Night-only patrolling guard with torch cone (21:00–05:59)

### Iteration 5 — Settings modal · notifications · sound volume
- Consolidated Settings (`,` hotkey): dark / lang / density / sound / notify / time / data
- Desktop Notification API integration for background tabs
- Sound volume slider + persisted

### Iteration 4 — Achievements · README EN section
- 14 unlock-able badges with localStorage persistence + popups
- README gains a proper 🇺🇸 English overview

### Iteration 3 — KO/EN i18n · daily stats persistence · sound effects
- 70+ strings translated, globe button toggle
- 14-day localStorage stats history; 7-day trend chart
- Optional Web Audio chimes for join/leave/done/review

### Iteration 2 — Insights modal · shortcuts modal · delivery NPC
- Insights modal (`I` hotkey): stats, platforms, projects, status distribution, recent feed
- Keyboard cheatsheet (`?`)
- Delivery courier NPC visits desks intermittently
- Floor zone differentiation (work area wood / lounge parquet)

### Iteration 1 — Time-of-day sky · NPCs · welcome card
- Dawn/day/sunset/night gradient sky in office windows with sun + moon + stars
- Pixi ambient tint + rain weather
- Cleaning robot, paper airplane, sleeping lounge cat
- First-run welcome card, improved empty state, time-of-day band

## Pre-launch (prior to iteration log)
- WebSocket-based dashboard with auto-detection of Claude Code, Cursor, Codex,
  Ollama, LM Studio, Copilot, Jan, GPT4All
- Canvas 2D office renderer + PixiJS effects overlay
- Side panel with agents list, detail view, boss review queue
