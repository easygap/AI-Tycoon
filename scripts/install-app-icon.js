#!/usr/bin/env node
// AI Tycoon — 앱 아이콘 설치 헬퍼
// =========================================
// 사용법:
//   1) 원본 픽셀아트 이미지를 `icons/source.png` 또는 `icons/icon.ico` 로 떨어뜨린다
//      (또는 --src=경로 옵션 사용)
//   2) `npm run icons` 실행
//   3) `icons/icon.png` 으로 복사·추출되고, manifest/sw 가 이미 이 경로를 참조하므로
//      브라우저에서 Ctrl+Shift+R 만 해 주면 적용 완료.
//
// 외부 의존성 없이 순수 Node API 만 사용.
// - PNG 입력:  헤더 검증 후 그대로 복사
// - ICO 입력:  첫 디렉터리 엔트리에서 PNG 페이로드 꺼내 저장 (PNG-in-ICO 만 지원)
//
// 입력 우선순위: --src 옵션 > icons/source.png > icons/icon.ico > icons/source.ico

import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ICONS_DIR = resolve(ROOT, "icons");

// CLI: --src=path
const argMap = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
}));

const CANDIDATE_SOURCES = [
    argMap.src,
    "icons/source.png",
    "icons/icon.ico",
    "icons/source.ico",
].filter(Boolean).map(p => resolve(ROOT, p));

const SRC = CANDIDATE_SOURCES.find(p => existsSync(p));
const DST = resolve(ICONS_DIR, "icon.png");

function bail(msg) {
    console.error(`\n[install-app-icon] ✗ ${msg}\n`);
    process.exit(1);
}

if (!SRC) {
    bail([
        "원본 파일이 없습니다. 다음 중 하나로 저장 후 다시 실행해 주세요:",
        "   • icons/source.png  (PNG, 정사각형 권장)",
        "   • icons/icon.ico    (PNG-in-ICO)",
        "   • icons/source.ico  (PNG-in-ICO)",
        "   • --src=경로/파일   (임의 경로)",
    ].join("\n"));
}

console.log(`[install-app-icon] 입력 파일: ${SRC.replace(ROOT, "")}`);

// ── PNG 검증 ────────────────────────────────────────────────────────
function readPngSize(buf) {
    if (buf.length < 24) return null;
    const sig = buf.slice(0, 8).toString("hex");
    if (sig !== "89504e470d0a1a0a") return null; // PNG 시그니처 아님
    // IHDR 청크는 항상 첫 청크. 위치 16~23: width(4), height(4) big-endian
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// ── ICO → PNG 추출 ──────────────────────────────────────────────────
function extractPngFromIco(buf) {
    if (buf.length < 22) throw new Error("ICO 헤더보다 작음");
    const type = buf.readUInt16LE(2);
    const count = buf.readUInt16LE(4);
    if (type !== 1 || count < 1) throw new Error(`ICO header mismatch (type=${type}, count=${count})`);
    // 가장 큰 엔트리 고르기 (size 기준) — 멀티사이즈 ICO 에서 최고 화질 선택
    let best = null;
    for (let i = 0; i < count; i++) {
        const entryOff = 6 + i * 16;
        const w = buf.readUInt8(entryOff);       // 0 → 256
        const h = buf.readUInt8(entryOff + 1);
        const sz = buf.readUInt32LE(entryOff + 8);
        const off = buf.readUInt32LE(entryOff + 12);
        if (!best || sz > best.sz) best = { w: w || 256, h: h || 256, sz, off };
    }
    if (!best) throw new Error("ICO 엔트리 없음");
    const payload = buf.slice(best.off, best.off + best.sz);
    const isPng = payload.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
    if (!isPng) {
        throw new Error("ICO 안의 비트맵이 BMP 형식 (PNG-in-ICO 만 지원). " +
                        "ICO 를 PNG 로 변환 후 source.png 로 저장해 주세요.");
    }
    return { png: payload, w: best.w, h: best.h };
}

const buf = readFileSync(SRC);
const ext = extname(SRC).toLowerCase();
let resultBuf, w, h;

if (ext === ".png") {
    const size = readPngSize(buf);
    if (!size) bail(`PNG 시그니처 mismatch: ${SRC}`);
    resultBuf = buf;
    w = size.w;
    h = size.h;
} else if (ext === ".ico") {
    try {
        const ex = extractPngFromIco(buf);
        resultBuf = ex.png;
        // ICO 디렉터리는 width/height 만 들어있고, 실제 PNG 의 IHDR 이 더 정확
        const pngSize = readPngSize(ex.png);
        w = pngSize?.w || ex.w;
        h = pngSize?.h || ex.h;
        console.log(`[install-app-icon] ICO → PNG 추출 완료 (${ex.png.length}B)`);
    } catch (e) {
        bail(`ICO 처리 실패: ${e.message}`);
    }
} else {
    bail(`지원되지 않는 확장자: ${ext}. .png 또는 .ico 만 지원합니다.`);
}

const bytes = resultBuf.length;
console.log(`[install-app-icon] 결과: ${w}×${h}, ${(bytes / 1024).toFixed(1)} KB`);

if (w !== h) {
    console.warn(`[install-app-icon] ⚠ 가로/세로가 다릅니다 (${w}×${h}). 정사각형 권장.`);
}
if (w < 128) {
    console.warn(`[install-app-icon] ⚠ 권장 최소 128px. 현재 ${w}px — PWA/Android 화질 저하 가능.`);
}

writeFileSync(DST, resultBuf);
console.log(`[install-app-icon] ✓ icons/icon.png 저장 (${bytes}B)`);

// 안내
console.log("\n다음 단계:");
console.log("  1) sw.js 의 VERSION 을 한 단계 bump (캐시 무효화)");
console.log("  2) 브라우저에서 Ctrl+Shift+R 또는 Application → Storage 비우기");
console.log("  3) PWA 설치본을 쓰는 경우 재설치 (탭/창 닫고 다시 설치)\n");
