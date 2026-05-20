# AI Tycoon — 스크린샷 갤러리

데모 모드 (`?demo=1`) 로 띄운 1440×900 캡처들. v1.4.5 기준.

---

## 메인 대시보드

라이트 / 다크 두 모드 모두에서 동일한 픽셀 아트 오피스 + 사이드바 + HUD 가 함께 보입니다.

<p align="center">
  <img src="hero-light.png" alt="AI Tycoon 메인 화면 — 라이트 모드" width="900">
</p>

<p align="center">
  <img src="hero-dark.png" alt="AI Tycoon 메인 화면 — 다크 모드" width="900">
</p>

---

## 명령 팔레트 (`Ctrl+K` / `Cmd+K`)

VS Code 스타일 빠른 검색. 에이전트 fuzzy 검색 + 모든 액션 + **메모에 박힌 `#태그` 별 필터 명령** 까지 한 곳에.

<p align="center">
  <img src="cmdpalette.png" alt="명령 팔레트 — '필터' 검색 시 hashtag 별 필터 명령 자동 노출" width="900">
</p>

`#frontend (1)`, `#backend (1)`, `#bug (1)`, `#리팩터링 (1)` — 메모에 실제로 박혀 있는 태그만 카운트와 함께 동적으로 추가됩니다.

---

## 인사이트 모달 (`I` 키)

오늘 작업·플랫폼 분포·24시간 활동 히트맵·업적 진행률을 한 화면에. 시간대 히트맵은 현재 시각 셀에 ▼ 마커 + 부드러운 바운스 애니메이션으로 "지금" 위치를 표시합니다.

<p align="center">
  <img src="insights.png" alt="인사이트 모달 — 오늘 통계, 플랫폼별 사용량, 오늘의 MVP, 진행 중인 프로젝트" width="900">
</p>

---

## 디테일 패널

에이전트 카드 클릭 시 우측에 열리는 디테일 패널. 메모 textarea + hashtag 칩 + 메모리 그래프 + 작업 히스토리.

<p align="center">
  <img src="detail.png" alt="디테일 패널 — 에이전트 정보, 메모, 해시태그 칩, 메모리 추세" width="900">
</p>

좌측 패널의 카드들에도 작은 hashtag 칩이 박혀 있어 한눈에 어떤 카테고리의 작업인지 분류할 수 있습니다.

---

## 캡처 방법

```bash
# 서버 띄우고
npm start

# 브라우저에서 데모 모드로 접속
# http://localhost:3777/?demo=1
```

스크린샷은 1440×900 해상도에서 캡처. Playwright MCP 자동화 사용 (iter 211 / 214 / 215).

i18n 토글 (`globe` 아이콘) 로 EN 모드 캡처도 가능.
