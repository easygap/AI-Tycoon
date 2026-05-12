// ============================================================
//  AI TYCOON — Mini-map (overview when zoomed in)
// ============================================================
//
// Draws a small offscreen-canvas overview of the office in the
// lower-right corner.  Only visible when the user has zoomed in
// past ~1.1x.  Clicking on the map pans the camera to that point.

import { S } from "./state.js";
import { TILE, COLS, ROWS, OFFICE_MAP, PAL } from "./constants.js";

const MAP_W = 140;
const MAP_H = Math.round(MAP_W * ROWS / COLS);
const SHOW_AT_ZOOM = 1.1;

let canvas = null;
let ctx = null;
let host = null;
let rafId = null;
let visible = false;

function ensureDom() {
    if (canvas) return canvas;
    host = document.createElement("div");
    host.id = "mini-map";
    host.className = "mini-map";
    host.hidden = true;
    host.setAttribute("role", "navigation");
    host.setAttribute("aria-label", "Office mini-map");
    canvas = document.createElement("canvas");
    canvas.width = MAP_W;
    canvas.height = MAP_H;
    host.appendChild(canvas);
    document.body.appendChild(host);
    canvas.addEventListener("click", onMapClick);
    canvas.addEventListener("mousemove", onMapHover);
    canvas.addEventListener("mouseleave", () => canvas.style.cursor = "default");
    ctx = canvas.getContext("2d");
    return canvas;
}

function worldFromMap(mx, my) {
    const r = canvas.getBoundingClientRect();
    const px = (mx - r.left) / r.width;
    const py = (my - r.top) / r.height;
    return {
        x: px * COLS * TILE,
        y: py * ROWS * TILE,
    };
}

function onMapClick(e) {
    const w = worldFromMap(e.clientX, e.clientY);
    // Re-center camera: convert world coords to pan offsets
    const cw = S.canvasW, ch = S.canvasH;
    const targetScreenX = cw / 2;
    const targetScreenY = ch / 2;
    const baseOffsetX = (cw - COLS * TILE * S.scale) / 2;
    const baseOffsetY = (ch - ROWS * TILE * S.scale) / 2 * 0.7; // mild vertical bias
    const targetOffsetX = targetScreenX - w.x * S.scale;
    const targetOffsetY = targetScreenY - w.y * S.scale;
    S.panX = targetOffsetX - baseOffsetX;
    S.panY = targetOffsetY - baseOffsetY;
    S.offsetX = targetOffsetX;
    S.offsetY = targetOffsetY;
    // Defer to existing recalcOffsets path on next frame if exposed
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.dispatchEvent(new Event("resize")); // forces resize() in main.js to clamp pans
    }
}

function onMapHover(e) {
    canvas.style.cursor = "pointer";
    void e;
}

function shouldShow() {
    return (S.zoomLevel || 1) >= SHOW_AT_ZOOM;
}

function loop() {
    rafId = requestAnimationFrame(loop);
    const show = shouldShow();
    if (show !== visible) {
        visible = show;
        host.hidden = !visible;
    }
    if (!visible) return;
    draw();
}

function draw() {
    const W = canvas.width, H = canvas.height;
    const sx = W / (COLS * TILE);
    const sy = H / (ROWS * TILE);

    // Background
    ctx.fillStyle = PAL.floor1 || "#F0E8D8";
    ctx.fillRect(0, 0, W, H);

    // Walls + zones
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = OFFICE_MAP[y]?.[x] || "W";
            if (t === "W") {
                ctx.fillStyle = PAL.wall || "#D4C4A8";
                ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx + 1, TILE * sy + 1);
            } else if (t === "D") {
                ctx.fillStyle = "rgba(170,120,80,0.65)";
                ctx.fillRect(x * TILE * sx + 1, y * TILE * sy + 2, TILE * sx - 2, TILE * sy - 4);
            } else if (t === "R") {
                ctx.fillStyle = "rgba(240,200,208,0.6)";
                ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx, TILE * sy);
            } else if (t === "L") {
                ctx.fillStyle = "rgba(124,158,184,0.7)";
                ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx, TILE * sy);
            } else if (t === "M") {
                ctx.fillStyle = "rgba(216,188,144,0.7)";
                ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx, TILE * sy);
            } else if (t === "K") {
                ctx.fillStyle = "rgba(160,110,70,0.7)";
                ctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx, TILE * sy);
            }
        }
    }

    // Agents — colored dots
    Object.values(S.visualAgents || {}).forEach((v) => {
        if (!v || v.x == null) return;
        ctx.fillStyle = (v.theme?.body) || "#86EFAC";
        ctx.beginPath();
        ctx.arc(v.x * sx, v.y * sy, 2.2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Boss desk marker
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(10 * TILE * sx, 15 * TILE * sy, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Camera view rectangle: derive from offsetX/scale
    const viewX = -S.offsetX / S.scale;
    const viewY = -S.offsetY / S.scale;
    const viewW = S.canvasW / S.scale;
    const viewH = S.canvasH / S.scale;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(viewX * sx, viewY * sy, viewW * sx, viewH * sy);
    ctx.strokeStyle = "rgba(217,119,87,0.85)";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(viewX * sx, viewY * sy, viewW * sx, viewH * sy);
}

if (typeof window !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        ensureDom();
        rafId = requestAnimationFrame(loop);
    });
    window.aiTycoonMiniMap = {
        show() { S.zoomLevel = Math.max(S.zoomLevel || 1, SHOW_AT_ZOOM); },
    };
}
