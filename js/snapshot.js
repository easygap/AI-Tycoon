// ============================================================
//  AI TYCOON — Office snapshot export (PNG download)
// ============================================================
//
// Composites the Canvas-2D office renderer with the Pixi WebGL
// overlay into a single PNG.  We render Pixi once before grabbing
// pixels to ensure the WebGL framebuffer is up-to-date (otherwise
// Pixi may have already swapped/cleared it).

import { S } from "./state.js";
import { renderPixiOverlay, getPixiCanvas } from "./pixiOverlay.js";
import { render } from "./renderer.js";

function timestampSlug() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/** Build a PNG dataURL of the current office view. */
export function buildSnapshotDataURL() {
    if (!S.canvas) return null;
    const w = S.canvas.width;
    const h = S.canvas.height;
    if (w <= 0 || h <= 0) return null;

    // Force a fresh render so both canvases reflect the latest frame
    try { render(); } catch (err) { void err; }
    try { renderPixiOverlay(); } catch (err) { void err; }

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    if (!ctx) return null;

    // Background fill in case either canvas is transparent at edges
    const isDark = document.body.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0e0e16" : "#f6f7f4";
    ctx.fillRect(0, 0, w, h);

    // Office canvas (Canvas 2D)
    try { ctx.drawImage(S.canvas, 0, 0, w, h); } catch (err) { void err; }

    // Pixi overlay on top
    const pixi = getPixiCanvas();
    if (pixi && pixi.width > 0 && pixi.height > 0) {
        try { ctx.drawImage(pixi, 0, 0, w, h); } catch (err) { void err; }
    }

    // Stamp in the corner
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.55)" : "rgba(40,30,20,0.55)";
    ctx.font = "bold 12px Pretendard, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`AI Tycoon · ${new Date().toLocaleString()}`, 12, h - 12);

    try { return out.toDataURL("image/png"); }
    catch (err) { void err; return null; }
}

/** Trigger a PNG download of the current office view. */
export function downloadSnapshot() {
    const url = buildSnapshotDataURL();
    if (!url) return false;
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-tycoon-${timestampSlug()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
    return true;
}

if (typeof window !== "undefined") {
    window.aiTycoonSnapshot = { build: buildSnapshotDataURL, download: downloadSnapshot };
}
