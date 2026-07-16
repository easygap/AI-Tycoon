<p align="center">
  <img src="icons/brand-symbol.svg" alt="AI Tycoon 스튜디오 도어 심볼" width="78" height="78">
</p>

<h1 align="center">AI Tycoon</h1>

<p align="center">
  <strong>내 컴퓨터에서 일하는 AI 에이전트를 작은 픽셀 오피스에서 한눈에 봅니다.</strong><br>
  Claude Code, Codex, Cursor 등 여러 작업의 상태와 다음 확인 항목을 실시간으로 모아 보여주는 로컬 대시보드입니다.
</p>

<p align="center">
  <a href="https://github.com/easygap/AI-Tycoon/actions/workflows/ci.yml"><img src="https://github.com/easygap/AI-Tycoon/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-25272f.svg" alt="MIT License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A520-45b98f.svg" alt="Node.js 20 이상"></a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/hero-dark.png">
    <img src="docs/hero-light.png" alt="AI Tycoon 실시간 작업실과 운영 패널" width="1100">
  </picture>
  <br>
  <sub>실제 앱을 데모 데이터로 실행해 캡처했습니다. 시스템 테마에 따라 밝은 화면과 어두운 화면이 바뀝니다.</sub>
</p>

## 빠른 시작

Node.js 20 이상이 필요합니다.

```bash
git clone https://github.com/easygap/AI-Tycoon.git
cd AI-Tycoon
npm install
npm start
```

기본 브라우저가 자동으로 열리며 주소는 `http://localhost:3777`입니다. 실제 에이전트 없이 먼저 둘러보려면 `http://localhost:3777/?demo=1`로 접속하세요.

## 왜 만들었나

에이전트를 두세 개 넘게 띄우면 터미널을 오가며 누가 무엇을 하는지 다시 읽는 시간이 꽤 생깁니다. AI Tycoon은 그 흐름을 로그 목록 대신 작업실로 보여주려고 만들었습니다.

캐릭터의 자리와 움직임으로 현재 상태를 보고, 운영 패널에서 검토가 필요한 작업을 먼저 처리하고, 직원 상세 화면에서 세션과 작업 기록을 확인할 수 있습니다. 모든 화면은 브라우저에서 열리지만 서버와 데이터는 기본적으로 내 컴퓨터 안에서만 동작합니다.

## 화면 둘러보기

실행 중인 에이전트가 직원으로 들어옵니다. 코딩, 생각, 검색, 회의, 검토, 대기 상태에 따라 자리와 표현이 달라지고 같은 프로젝트는 색으로 묶입니다. Canvas와 PixiJS로 시간대 조명, 작업 흐름, 소품과 반응 효과를 더했습니다.

### 운영 패널과 모바일

운영 패널은 지금 결정해야 할 일, 진행 중인 작업, 최근 활동을 한곳에 모읍니다. 작은 화면에서는 같은 기능을 슬라이드 패널로 열어 검토와 승인을 처리할 수 있습니다.

<p align="center">
  <a href="docs/operations.png"><img src="docs/operations.png" alt="AI Tycoon 운영 패널과 검토 대기열" width="58%"></a>
  <a href="docs/mobile.png"><img src="docs/mobile.png" alt="AI Tycoon 모바일 운영 화면" width="29%"></a>
</p>

### 직원 상세와 인사이트

직원별 세션과 태스크를 확인하고 개인 메모를 남길 수 있습니다. 인사이트에서는 오늘 처리한 태스크, 플랫폼 분포, 가장 활발한 직원과 프로젝트를 요약합니다.

<p align="center">
  <a href="docs/detail.png"><img src="docs/detail.png" alt="AI Tycoon 직원 상세 화면" width="49%"></a>
  <a href="docs/insights.png"><img src="docs/insights.png" alt="AI Tycoon 작업실 인사이트 화면" width="49%"></a>
</p>

이미지를 누르면 원본 크기로 볼 수 있습니다. [스크린샷 전체 보기](./docs/SCREENSHOTS.md)

## 주요 기능

| 영역 | 할 수 있는 일 |
| --- | --- |
| 실시간 감지 | 실행 중인 AI 도구와 세션을 찾아 상태, 프로젝트, 작업 정보를 갱신 |
| 시각화 | 픽셀 오피스, 캐릭터, 시간대 조명, PixiJS 작업 효과로 흐름 표현 |
| 운영 | 우선순위 브리핑, 검토 대기열, 진행 작업과 최근 활동 확인 |
| 기록 | 직원별 상세 정보, 개인 메모, 해시태그, 일별 통계와 인사이트 |
| 사용성 | 검색과 필터, 명령 팔레트, 한국어/영어, 밝은/어두운 테마, PWA 설치 |
| 화면 공유 | 프로젝트명과 프롬프트를 가리는 프라이버시 모드 제공 |

## 실행 설정

자주 쓰는 환경 변수는 아래와 같습니다.

| 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `PORT` | `3777` | 서버 포트 변경 |
| `POLL_INTERVAL` | `2000` | 상태 수집 주기(ms) |
| `NO_OPEN` | `0` | `1`이면 브라우저를 자동으로 열지 않음 |
| `HOST` | `127.0.0.1` | 외부 접근이 필요할 때만 바인딩 주소 변경 |
| `QUIET` | `0` | `1`이면 폴링과 WebSocket 로그를 줄임 |
| `LOG_LEVEL` | - | `warn` 또는 `error`로 로그를 줄임 |

macOS와 Linux에서는 `PORT=8080 npm start`, PowerShell에서는 `$env:PORT=8080; npm start`처럼 지정할 수 있습니다.

## 지원하는 도구

| 도구 | 감지 범위 |
| --- | --- |
| Claude Code | 세션, 프로젝트, 프롬프트와 태스크를 가장 상세하게 감지 |
| OpenAI Codex | 세션 인덱스와 세션 파일을 기반으로 작업 감지 |
| Cursor | 프로세스와 워크스페이스 중심으로 감지 |
| GitHub Copilot | 프로세스 실행 여부 감지 |
| Ollama, LM Studio, Jan, GPT4All | 로컬 프로세스 실행 여부 감지 |

Claude Code와 Codex의 세션 감지는 Windows, macOS, Linux에서 동작합니다. 프로세스 감지는 Windows에서 PowerShell, macOS와 Linux에서 `ps`를 사용하며 운영체제에 따라 일부 프로젝트 정보가 비어 있을 수 있습니다.

## 알아둘 점

- 서버는 기본적으로 `127.0.0.1`에만 열립니다. `HOST`를 바꿔 외부에 노출할 때는 별도 인증과 리버스 프록시를 함께 사용하세요.
- 메모, 통계, 설정은 브라우저 `localStorage`에 평문으로 저장됩니다. 프라이버시 모드는 화면 표시를 가리는 기능이며 암호화 기능은 아닙니다.
- PWA의 오프라인 모드는 정적 화면 자산을 보관합니다. 실제 에이전트 감지와 실시간 갱신에는 Node.js 서버가 필요합니다.
- PixiJS와 Iconify는 CDN에서 불러옵니다. 완전히 폐쇄된 네트워크에서는 해당 시각 요소가 제한될 수 있습니다.
- 앱 안에서 `?`를 누르면 전체 단축키를 볼 수 있습니다. 자주 쓰는 키는 `Ctrl/Cmd+K`(명령 팔레트), `I`(인사이트), `D`(테마), `P`(스냅샷)입니다.

보안 관련 제보와 운영 기준은 [SECURITY.md](./SECURITY.md)를 확인해 주세요.

## 개발

```bash
npm run build
npm run lint
npm test
```

- [CHANGELOG.md](./CHANGELOG.md): 버전별 변경 내용
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): 감지부터 렌더링까지의 구조
- [CONTRIBUTING.md](./CONTRIBUTING.md): 개발 환경과 기여 방법
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md): 커뮤니티 운영 원칙

버그 제보와 기능 제안은 [GitHub Issues](https://github.com/easygap/AI-Tycoon/issues)에서 받고 있습니다. 이 프로젝트는 [MIT License](./LICENSE)로 배포합니다.

## English

AI Tycoon is a local, real-time dashboard that turns AI agents running on your computer into a small pixel office. It helps you see who is working, what needs review, and where to look next without switching between terminals.

Clone the repository, run `npm install` and `npm start`, then open `http://localhost:3777`. Use `?demo=1` to explore with synthetic agents. The interface supports Korean and English from the globe button in the header.
