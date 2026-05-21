# 보안 신고 정책 (Security Policy)

## 지원 버전

| 버전 | 보안 패치 |
|---|---|
| 1.4.x (latest) | ✅ |
| 1.3.x | ✅ (필요 시 백포트) |
| 1.2.x 이하 | ❌ |

가급적이면 `latest` 로 업데이트해 주세요. AI Tycoon 은 사용자 머신에서만 도는 로컬
대시보드라 자동 업데이트 메커니즘이 없습니다.

## 취약점 신고 방법

GitHub Security Advisory (선호) 또는 메일로 알려주세요:

1. **GitHub Security Advisory** (권장)
   - 저장소 → `Security` 탭 → `Advisories` → `New draft security advisory`
   - 비공개로 fix 협의 후 disclose 시점 합의 가능
2. **이메일** — [README](./README.md) 의 owner 프로필에 공개된 주소

다음 항목을 알려주시면 트리아주가 빠릅니다:
- 영향 받는 버전 (예: v1.4.5)
- 재현 단계 (가능하면 PoC code 또는 스크린샷)
- 영향 범위 (사용자 데이터 노출? 서버 RCE? XSS?)
- 추천 mitigation (있다면)

## 응답 SLA

- **접수 확인**: 영업일 기준 3일 이내
- **트리아주 + 임시 가이드**: 7일 이내
- **패치 릴리즈**: 심각도에 따라:
  - Critical: 7일 이내 patch release
  - High: 14일 이내
  - Medium / Low: 다음 정규 릴리즈 사이클

## 스코프

이 정책은 다음을 다룹니다:

- `server.js` 의 HTTP/WebSocket 서버 (포트 3777)
- 브라우저에서 도는 JS 모듈 (`js/*.js`, `index.html`)
- 빌드 / 배포 스크립트 (`scripts/*.js`)
- PWA 매니페스트 + 서비스 워커

**스코프 밖**:
- 사용자가 모니터링하는 외부 AI 도구 (Claude Code, Cursor 등) 의 취약점 — 각 도구에 신고
- Node.js, npm 의존성 (`ws`) 자체의 알려진 CVE — upstream 이슈
- 의도된 design choice (예: `localStorage` 데이터는 평문 — 로컬 단일 사용자 가정)

## 알려진 보안 고려사항

- `server.js` 는 기본적으로 `localhost` 외에 listen 하지 않음 (`0.0.0.0` 바인딩 안 함).
  외부 노출하려면 직접 `PORT` 환경변수 + 리버스 프록시 설정 + 인증 추가 필요.
- 사용자의 메모 / 통계는 모두 브라우저 `localStorage` 에 평문 저장. 공유 컴퓨터에서
  민감한 정보 적지 마세요. `프라이버시 모드` (`Shift+P`) 로 화면 블러는 가능하지만 데이터 자체는 노출.
- 서비스 워커는 모든 정적 자산을 캐시. 보안 패치 배포 후 사용자 브라우저에서
  Hard Reload (Ctrl+Shift+R) 또는 `Application → Storage 비우기` 필요할 수 있음.

## 감사

책임감 있는 disclosure 에 감사드립니다. 패치된 advisory 의 credits 에 신고자 이름을 명시합니다
(원치 않으시면 익명 처리).
