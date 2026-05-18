#!/usr/bin/env node
// AI Tycoon — 앱 아이콘 설치 헬퍼
// =========================================
// 사용법:
//   1) 원본 픽셀아트 PNG 를 `icons/source.png` 로 떨어뜨린다 (또는 --src=경로 옵션 사용)
//   2) `node scripts/install-app-icon.js` 실행
//   3) `icons/icon.png` 으로 복사되고, manifest/sw 가 이미 이 경로를 참조하므로 캐시만
//      Hard Reload (Ctrl+Shift+R) 해 주면 적용 완료.
//
// 외부 의존성 없이 순수 Node API 만 사용. PNG 헤더만 살짝 들춰서 1024x1024 이상 정사각형
// 인지 가볍게 검증한다 (PWA 아이콘 권장 최소 사이즈가 그 정도).

import { copyFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ICONS_DIR = resolve(ROOT, "icons");

// CLI: --src=path (default: icons/source.png)
const argMap = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));
const SRC = resolve(ROOT, argMap.src || "icons/source.png");
const DST = resolve(ICONS_DIR, "icon.png");

function bail(msg) {
    console.error(`\n[install-app-icon] ✗ ${msg}\n`);
    process.exit(1);
}

if (!existsSync(SRC)) {
    bail(`원본 파일이 없습니다: ${SRC}\n` +
         `   → 픽셀아트 PNG 를 ${argMap.src || "icons/source.png"} 으로 저장하고 다시 실행해 주세요.`);
}

// PNG 헤더 읽어서 크기 확인 (외부 라이브러리 없이)
function readPngSize(file) {
    const buf = readFileSync(file);
    if (buf.length < 24) return null;
    const sig = buf.slice(0, 8).toString("hex");
    if (sig !== "89504e470d0a1a0a") return null; // PNG 시그니처 아님
    // IHDR 청크는 항상 첫 청크. 위치 16~23: width(4), height(4) big-endian
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h };
}

const size = readPngSize(SRC);
if (!size) bail(`PNG 파일이 아닙니다 (헤더 mismatch): ${SRC}`);

const { w, h } = size;
const bytes = statSync(SRC).size;
console.log(`[install-app-icon] 원본 크기 ${w}×${h}, ${(bytes / 1024).toFixed(1)} KB`);

if (w !== h) {
    console.warn(`[install-app-icon] ⚠ 가로/세로가 다릅니다 (${w}×${h}). 정사각형 권장.`);
}
if (w < 512) {
    console.warn(`[install-app-icon] ⚠ 권장 최소 512px. 현재 ${w}px — PWA/Android 화질 저하 가능.`);
}

// 그대로 복사 (resize 는 안 함 — sharp/ImageMagick 의존성 추가 회피).
// 브라우저/OS 가 자동 다운스케일하므로 1024×1024 원본이면 모든 플랫폼에서 깔끔.
copyFileSync(SRC, DST);
console.log(`[install-app-icon] ✓ icons/icon.png ← ${argMap.src || "icons/source.png"}`);

// 안내
console.log("\n다음 단계:");
console.log("  1) sw.js 의 VERSION 을 한 단계 bump (캐시 무효화) — CI 가 한다면 생략 가능");
console.log("  2) 브라우저에서 Ctrl+Shift+R 또는 Application → Storage 비우기");
console.log("  3) PWA 설치본을 쓰는 경우 재설치 (탭/창 닫고 다시 설치)\n");
