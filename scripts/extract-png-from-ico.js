#!/usr/bin/env node
// ICO 파일 안에 박혀 있는 PNG 비트맵을 꺼내서 별도 PNG 로 저장하는 일회용 헬퍼.
// 사용자 ICO (128×128 PNG-in-ICO) 를 PWA/og:image 용 단독 PNG 로 변환할 때 씀.
//
// 사용법:  node scripts/extract-png-from-ico.js [src=icons/icon.ico] [dst=icons/icon.png]
//
// ICO 구조 요약:
//   6 byte ICONDIR  (reserved2 + type2 + count2)
//   16 byte * N  ICONDIRENTRY (width, height, ..., size4, offset4)
//   비트맵 데이터들이 offset 위치에 박혀 있음. PNG-in-ICO 면 그대로 PNG 시그니처로 시작.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, process.argv[2] || "icons/icon.ico");
const DST = resolve(ROOT, process.argv[3] || "icons/icon.png");

const buf = readFileSync(SRC);
if (buf.length < 22) {
    console.error(`[extract] 너무 작음 (${buf.length}B), ICO 같지 않음.`);
    process.exit(1);
}
const type = buf.readUInt16LE(2);
const count = buf.readUInt16LE(4);
if (type !== 1 || count < 1) {
    console.error(`[extract] ICO 헤더 mismatch (type=${type}, count=${count}).`);
    process.exit(1);
}
// 첫 번째 엔트리만 처리 (멀티사이즈면 가장 큰 거 골라도 되는데, 우선 첫 거로 충분).
const entryOffset = 6;
const w = buf.readUInt8(entryOffset);       // 0 → 256
const h = buf.readUInt8(entryOffset + 1);
const sz = buf.readUInt32LE(entryOffset + 8);
const off = buf.readUInt32LE(entryOffset + 12);
console.log(`[extract] entry: ${w || 256}×${h || 256}, size=${sz}, offset=${off}`);

const payload = buf.slice(off, off + sz);
const isPng = payload.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
if (!isPng) {
    console.error(`[extract] 첫 비트맵이 PNG 시그니처가 아님 — 이 ICO 는 BMP-in-ICO. 별도 변환 필요.`);
    process.exit(1);
}
writeFileSync(DST, payload);
console.log(`[extract] ✓ ${payload.length}B PNG → ${DST.replace(ROOT, "")}`);
