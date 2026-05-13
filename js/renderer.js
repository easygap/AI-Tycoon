// ============================================================
//  AI TYCOON — Canvas Rendering (Office, Agents, Effects)
// ============================================================

import { S } from "./state.js";
import {
    TILE, COLS, ROWS, PAL,
    OFFICE_MAP, AGENT_THEMES, PLATFORM_META, STATUS_META, POI,
} from "./constants.js";
import { getSkyPalette, sunWindowX, indoorLightBoost } from "./timeOfDay.js";
import { drawNPCs } from "./npcs.js";
import { t } from "./i18n.js";
import { drawSeasonal } from "./seasons.js";

// Stable per-window pseudo-random seed used for star fields & cloud drift.
function winHash(x) { return ((x * 2654435761) >>> 0) / 4294967295; }

// ── Main Render ──
export function render() {
    S.ctx.clearRect(0, 0, S.canvasW, S.canvasH);
    S.ctx.save();
    S.ctx.translate(S.offsetX, S.offsetY);
    S.ctx.scale(S.scale, S.scale);
    drawOffice();
    drawFurniture();
    drawDecorations();
    drawSeasonal(S.ctx, S.animFrame);
    drawNPCs(S.ctx, S.animFrame);
    drawAgents();
    drawSubAgents();
    drawParticles();
    drawHeartParticles();
    drawEmptyState();
    S.ctx.restore();
    drawZoomIndicator();
}

function drawOffice() {
    const ctx = S.ctx;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = OFFICE_MAP[y]?.[x] || "W";
            const px = x * TILE, py = y * TILE;
            if (t === "W") {
                ctx.fillStyle = PAL.wall;
                ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = PAL.wallTop;
                ctx.fillRect(px, py, TILE, 2);
                ctx.fillStyle = PAL.wallAccent;
                if (x % 4 === 0) ctx.fillRect(px, py, 1, TILE);
            } else if (t === "R") {
                ctx.fillStyle = PAL.rug;
                ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = PAL.rugEdge;
                if (OFFICE_MAP[y-1]?.[x] !== "R") ctx.fillRect(px, py, TILE, 2);
                if (OFFICE_MAP[y+1]?.[x] !== "R") ctx.fillRect(px, py + TILE - 2, TILE, 2);
            } else if (t === " ") {
                // Glass partition / divider
                ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floor1 : PAL.floor2;
                ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = PAL.windowGlass;
                ctx.fillRect(px + 14, py, 4, TILE);
                ctx.fillStyle = PAL.windowFrame;
                ctx.fillRect(px + 14, py, 4, 2);
                ctx.fillRect(px + 14, py + TILE - 2, 4, 2);
            } else {
                ctx.fillStyle = (x + y) % 2 === 0 ? PAL.floor1 : PAL.floor2;
                ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = "rgba(255,255,255,0.08)";
                ctx.fillRect(px, py, TILE, 1);
                ctx.fillRect(px, py, 1, TILE);
                // Zone-specific overlay: work area gets a wood-plank grain,
                // lounge gets a softer parquet pattern.
                if (x >= 1 && x <= 11) {
                    // Work zone: horizontal wood grain
                    ctx.fillStyle = "rgba(120,80,40,0.06)";
                    ctx.fillRect(px, py + 7, TILE, 0.6);
                    ctx.fillRect(px, py + 18, TILE, 0.6);
                    ctx.fillRect(px, py + 26, TILE, 0.5);
                } else if (x >= 14 && x <= 22) {
                    // Lounge zone: parquet-style square pattern (every other 2x2 tile)
                    if (((x >> 1) + (y >> 1)) % 2 === 0) {
                        ctx.fillStyle = "rgba(255,255,255,0.04)";
                        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
                        ctx.fillStyle = "rgba(180,150,110,0.06)";
                        ctx.fillRect(px + 4, py + 4, TILE - 8, 0.6);
                        ctx.fillRect(px + 4, py + TILE - 5, TILE - 8, 0.6);
                    }
                }
            }
        }
    }
}

function drawFurniture() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t = OFFICE_MAP[y]?.[x] || "";
            const px = x * TILE, py = y * TILE;
            switch (t) {
                case "D": drawDesk(px, py, x, y); break;
                case "S": drawServer(px, py); break;
                case "C": drawCoffee(px, py, x); break;
                case "P": drawPlant(px, py); break;
                case "B": drawWhiteboard(px, py); break;
                case "M": drawMeeting(px, py); break;
                case "L": drawLounge(px, py, x, y); break;
                case "K": drawBookshelf(px, py); break;
                case "V": drawVending(px, py); break;
                case "A": drawAquarium(px, py); break;
            }
        }
    }
}

// ── Decorations ──
function drawDecorations() {
    const ctx = S.ctx;
    const ct = S.animFrame;

    // ── Windows: time-of-day sky, sun/moon path follows real clock ──
    const sky = getSkyPalette();
    const workSunX   = sunWindowX(8, 11);
    const loungeSunX = sunWindowX(17, 21);
    // 업무 공간 벽
    for (let x = 8; x < 12; x++) {
        const anchor = workSunX != null && Math.abs(x - workSunX) < 0.5;
        drawWindow(x * TILE, 0, ct, x, sky, anchor);
    }
    // 휴게실 벽
    for (let x = 17; x < 22; x++) {
        const anchor = loungeSunX != null && Math.abs(x - loungeSunX) < 0.5;
        drawWindow(x * TILE, 0, ct, x, sky, anchor);
    }
    // Birds flying past windows (dawn / golden hour / sunset)
    drawBirds(ct, sky);

    // ── Wall clock (업무 공간) ──
    const clkX = 11 * TILE + 16, clkY = 12;
    ctx.fillStyle = "#E8D8C0";
    ctx.beginPath(); ctx.arc(clkX, clkY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(clkX, clkY, 5, 0, Math.PI * 2); ctx.fill();
    // Clock hands
    const h = new Date().getHours(), m = new Date().getMinutes();
    const hAngle = ((h % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const mAngle = (m / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = "#3a3a4a";
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX + Math.cos(hAngle) * 3, clkY + Math.sin(hAngle) * 3); ctx.stroke();
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(clkX, clkY); ctx.lineTo(clkX + Math.cos(mAngle) * 4, clkY + Math.sin(mAngle) * 4); ctx.stroke();

    // ── Wall decorations (work area side, left wall) ──
    // Motivational poster (top of work area wall, near col 1.5)
    const motX = 1 * TILE + 6, motY = 4;
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(motX - 1, motY - 1, 22, 18);
    ctx.fillStyle = "#FCE7A8";
    ctx.fillRect(motX, motY, 20, 16);
    ctx.fillStyle = "#d97757";
    ctx.fillRect(motX + 2, motY + 2, 16, 1);
    ctx.fillRect(motX + 2, motY + 5, 12, 1);
    // Tiny rocket icon
    ctx.fillStyle = "#3a78d4";
    ctx.fillRect(motX + 9, motY + 9, 2, 4);
    ctx.fillRect(motX + 10, motY + 8, 2, 5);
    ctx.fillRect(motX + 9, motY + 13, 1, 2);
    ctx.fillRect(motX + 12, motY + 13, 1, 2);
    ctx.fillStyle = "#ff8a4c";
    ctx.fillRect(motX + 10, motY + 14, 2, 2);

    // Calendar (showing today's date)
    const calX = 7 * TILE + 8, calY = 4;
    ctx.fillStyle = "#fff";
    ctx.fillRect(calX, calY, 18, 18);
    ctx.fillStyle = "#d97757";
    ctx.fillRect(calX, calY, 18, 5);
    ctx.font = "bold 4px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    const today = new Date();
    const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
    ctx.fillText(monthNames[today.getMonth()], calX + 9, calY + 3.8);
    ctx.fillStyle = "#3a2010";
    ctx.font = "bold 7px Pretendard, sans-serif";
    ctx.fillText(String(today.getDate()), calX + 9, calY + 14);
    ctx.font = "3px Pretendard, sans-serif";
    ctx.fillStyle = "#7a5a48";
    ctx.fillText("MON TUE WED", calX + 9, calY + 17.5);

    // Poster on wall (휴게실 벽)
    const posX = 22 * TILE + 2, posY = 3;
    ctx.fillStyle = "#F0D8C0";
    ctx.fillRect(posX, posY, 20, 22);
    ctx.fillStyle = "#fff";
    ctx.fillRect(posX + 2, posY + 2, 16, 12);
    // Tiny landscape in poster (sky tinted by time-of-day too!)
    ctx.fillStyle = sky.starDensity > 0.4 ? "#3a4878" : "#87CEEB";
    ctx.fillRect(posX + 2, posY + 2, 16, 6);
    ctx.fillStyle = "#7AD09A";
    ctx.fillRect(posX + 2, posY + 8, 16, 6);
    // Text
    ctx.fillStyle = "#B09060";
    ctx.fillRect(posX + 4, posY + 16, 12, 1);
    ctx.fillRect(posX + 6, posY + 18, 8, 1);

    // ── "CAFE" neon sign over breakroom — glows brighter at night ──
    const cafeX = 15 * TILE + 8, cafeY = 0.4 * TILE;
    const cafeGlow = 0.35 + indoorLightBoost() * 0.5;
    ctx.fillStyle = `rgba(255,107,74,${cafeGlow * 0.4})`;
    ctx.fillRect(cafeX - 2, cafeY - 1, 38, 9);
    ctx.font = "bold 6px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,180,140,${cafeGlow})`;
    ctx.fillText("CAFE ☕", cafeX + 17, cafeY + 5);
    ctx.fillStyle = `rgba(255,107,74,${cafeGlow * 0.9})`;
    ctx.fillRect(cafeX, cafeY + 7, 34, 0.6);

    // ── Cute cat in breakroom ──
    const catX = 20 * TILE + 8, catY = 4 * TILE + 14;
    ctx.fillStyle = PAL.catBody;
    ctx.fillRect(catX, catY, 8, 6);
    ctx.fillRect(catX + 1, catY - 4, 6, 5);
    ctx.fillStyle = PAL.catEar;
    ctx.fillRect(catX + 1, catY - 6, 2, 3);
    ctx.fillRect(catX + 5, catY - 6, 2, 3);
    if (ct % 160 < 150) {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(catX + 2, catY - 2, 1, 1);
        ctx.fillRect(catX + 5, catY - 2, 1, 1);
    }
    const tailWag = Math.sin(ct * 0.05) * 2;
    ctx.fillStyle = PAL.catBody;
    ctx.fillRect(catX + 8, catY + 2 + tailWag, 4, 2);
    ctx.fillRect(catX + 11, catY + tailWag, 2, 2);
    // Cat purr animation
    if (ct % 80 < 10) {
        ctx.fillStyle = "rgba(249,168,212,0.3)";
        ctx.font = "3px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♪", catX + 12, catY - 8);
    }

    // ── Flowers near plants (colorful, varied) ──
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (OFFICE_MAP[y]?.[x] === "P") {
                const px = x * TILE, py2 = y * TILE;
                const sw = Math.sin(ct * 0.02 + px * 0.3) * 1;
                // Multiple small flowers
                drawTinyFlower(px + 8 + sw, py2 + 3, PAL.flower1, ct + px);
                drawTinyFlower(px + 20 + sw, py2 + 5, PAL.flower2, ct + px + 50);
                drawTinyFlower(px + 14 + sw, py2 + 1, PAL.flower3, ct + px + 100);
            }
        }
    }

    // ── Rug pattern (add subtle diamond pattern) ──
    for (let y = 8; y <= 10; y++) {
        for (let x = 16; x <= 19; x++) {
            if (OFFICE_MAP[y]?.[x] === "R") {
                const px = x * TILE + 16, py = y * TILE + 16;
                ctx.fillStyle = "rgba(255,255,255,0.06)";
                ctx.beginPath();
                ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py);
                ctx.lineTo(px, py + 6); ctx.lineTo(px - 6, py);
                ctx.closePath(); ctx.fill();
            }
        }
    }

    // ── Sparkle on windows (gentle) ──
    if (ct % 90 < 3) {
        const sx = (6 + Math.floor(Math.random() * 8)) * TILE + 10 + Math.random() * 12;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(sx, 10, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Floor mat at entrance (glass partition gap) ──
    ctx.fillStyle = "#D8C0A0";
    ctx.fillRect(11 * TILE, 16 * TILE + 4, 3 * TILE, TILE - 8);
    ctx.fillStyle = "#C8B090";
    ctx.fillRect(11 * TILE + 3, 16 * TILE + 7, 3 * TILE - 6, TILE - 14);
    ctx.font = "4px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(160,120,80,0.4)";
    ctx.fillText("WELCOME", 12.5 * TILE, 16 * TILE + 18);

    // ── "휴게실" sign above breakroom entrance ──
    ctx.font = "3.5px Pretendard, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = PAL.emptyText;
    ctx.fillText("☕ 휴게실", 18 * TILE, 0.6 * TILE);

    // ── Boss desk (user's seat) ──
    drawBossDesk(ct);
}

function drawBossDesk(ct) {
    const ctx = S.ctx;
    const bx = POI.boss.x, by = POI.boss.y;

    // Large executive desk
    ctx.fillStyle = PAL.deskEdge;
    roundRect(ctx, bx - 20, by - 6, 40, 16, 3);
    ctx.fill();
    ctx.fillStyle = PAL.deskTop;
    roundRect(ctx, bx - 18, by - 5, 36, 12, 2);
    ctx.fill();

    // Monitor (wider than normal)
    ctx.fillStyle = PAL.monFrame;
    ctx.fillRect(bx - 10, by - 14, 20, 12);
    ctx.fillStyle = PAL.monActive;
    ctx.fillRect(bx - 8, by - 12, 16, 8);
    // Screen glow
    const glow = 0.3 + Math.sin(ct * 0.03) * 0.1;
    ctx.fillStyle = `rgba(52,211,153,${glow})`;
    ctx.fillRect(bx - 8, by - 12, 16, 8);
    // Monitor stand
    ctx.fillStyle = PAL.monFrame;
    ctx.fillRect(bx - 2, by - 2, 4, 3);

    // Executive chair (bigger, darker)
    ctx.fillStyle = "#5A4030";
    roundRect(ctx, bx - 7, by + 12, 14, 10, 4);
    ctx.fill();
    ctx.fillStyle = "#6B4C38";
    roundRect(ctx, bx - 6, by + 13, 12, 7, 3);
    ctx.fill();
    // Chair backrest
    ctx.fillStyle = "#5A4030";
    roundRect(ctx, bx - 8, by + 8, 16, 6, 3);
    ctx.fill();

    // Nameplate "BOSS"
    ctx.fillStyle = "#D4A868";
    roundRect(ctx, bx - 10, by - 18, 20, 5, 1.5);
    ctx.fill();
    ctx.font = "bold 3px 'Pretendard', sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("👑 BOSS", bx, by - 14.5);

    // Coffee cup on desk
    ctx.fillStyle = PAL.coffee;
    ctx.fillRect(bx + 12, by - 3, 4, 4);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(bx + 12, by - 3, 4, 1);
    // Steam
    if (ct % 40 < 20) {
        ctx.fillStyle = PAL.coffeeSteam;
        ctx.fillRect(bx + 13, by - 5 - (ct % 10) * 0.3, 2, 2);
    }
}

// Birds: small flock that drifts across the window panes during dawn / golden hour.
// They live in canvas space (so they share the office transform) but only render
// when the sky palette warmth is moderate — dawn glow, late afternoon, sunset.
const BIRDS = [];
function ensureBirds() {
    if (BIRDS.length > 0) return;
    for (let i = 0; i < 5; i++) {
        BIRDS.push({
            x: -10 - i * 22,
            y: 4 + Math.random() * 10,
            speed: 0.06 + Math.random() * 0.08,
            phase: Math.random() * Math.PI * 2,
            wingSpeed: 0.18 + Math.random() * 0.1,
        });
    }
}
function drawBirds(ct, sky) {
    // Only at dawn (5.5-7), golden hour / sunset (16-19), and brief moments of dusk
    const h = sky.hour;
    const visible = (h >= 5.4 && h < 7.4) || (h >= 16 && h < 19.3);
    if (!visible) return;
    ensureBirds();
    const ctx = S.ctx;
    const range = (11 - 8 + 1) * TILE + (21 - 17 + 1) * TILE + 100;
    BIRDS.forEach(b => {
        b.x += b.speed;
        if (b.x > 11 * TILE + 80) b.x = 6 * TILE - 60 - Math.random() * 40;
        // Vertical bob
        const by = b.y + Math.sin(ct * 0.04 + b.phase) * 0.8;
        // Skip if outside the actual window strip (rows 0-1)
        if (by < 0 || by > 22) return;
        // Wing animation — alternate two shapes
        const wingUp = (Math.floor(ct * b.wingSpeed) % 2 === 0);
        const c = sky.warmth > 0.6 ? "rgba(40,30,20,0.8)" : "rgba(60,55,55,0.7)";
        ctx.fillStyle = c;
        // Two short strokes forming a flying "v"
        if (wingUp) {
            ctx.fillRect(b.x - 1.6, by, 1.6, 0.7);
            ctx.fillRect(b.x + 0.8, by - 0.7, 1.6, 0.7);
            ctx.fillRect(b.x + 0.4, by, 0.5, 0.5);
        } else {
            ctx.fillRect(b.x - 1.6, by + 0.3, 1.6, 0.7);
            ctx.fillRect(b.x + 0.8, by + 0.3, 1.6, 0.7);
            ctx.fillRect(b.x + 0.4, by, 0.5, 0.5);
        }
    });
    void range;
}

function drawWindow(px, py, ct, tx, sky, isAnchor) {
    const ctx = S.ctx;
    sky = sky || getSkyPalette();
    // Frame
    ctx.fillStyle = PAL.windowFrame;
    ctx.fillRect(px + 3, py + 2, TILE - 6, TILE - 4);

    // Glass interior — gradient sky (top→bottom)
    const glassX = px + 5, glassY = py + 4;
    const glassW = TILE - 10, glassH = TILE - 8;
    const grad = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH);
    grad.addColorStop(0, sky.topCss);
    grad.addColorStop(1, sky.botCss);
    ctx.fillStyle = grad;
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Stars (only at night) — stable per-window scatter
    if (sky.starDensity > 0.05) {
        const seed = winHash(tx * 13 + 7);
        const count = Math.round(sky.starDensity * 4);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + sky.starDensity * 0.5})`;
        for (let i = 0; i < count; i++) {
            const r1 = winHash(tx * 31 + i * 17 + 3);
            const r2 = winHash(tx * 19 + i * 23 + 11);
            const sx = glassX + 1 + r1 * (glassW - 2);
            const sy = glassY + 1 + r2 * (glassH * 0.55);
            const twinkle = 0.55 + 0.45 * Math.sin(ct * 0.06 + i * 1.3 + tx);
            ctx.globalAlpha = sky.starDensity * twinkle;
            ctx.fillRect(sx, sy, 1, 1);
        }
        ctx.globalAlpha = 1;
        void seed;
    }

    // Celestial body — sun in daytime, moon in night, only on the anchor window
    if (isAnchor && sky.body) {
        const cyAbs = glassY + sky.sunY * glassH;
        const cx = glassX + glassW / 2;
        if (sky.body === "sun") {
            // Soft halo
            const halo = ctx.createRadialGradient(cx, cyAbs, 0, cx, cyAbs, 9);
            halo.addColorStop(0, `rgba(${sky.sunColor[0]},${sky.sunColor[1]},${sky.sunColor[2]},0.55)`);
            halo.addColorStop(1, `rgba(${sky.sunColor[0]},${sky.sunColor[1]},${sky.sunColor[2]},0)`);
            ctx.fillStyle = halo;
            ctx.fillRect(cx - 9, cyAbs - 9, 18, 18);
            // Disc
            ctx.fillStyle = sky.sunCss;
            ctx.beginPath(); ctx.arc(cx, cyAbs, 3, 0, Math.PI * 2); ctx.fill();
        } else {
            // Moon: pale disc with subtle crater
            ctx.fillStyle = "rgba(220,225,240,0.95)";
            ctx.beginPath(); ctx.arc(cx, cyAbs, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(170,175,200,0.6)";
            ctx.fillRect(cx + 0.5, cyAbs - 1.5, 1, 1);
            ctx.fillRect(cx - 1.5, cyAbs + 0.5, 1, 1);
            // Soft glow halo
            const halo = ctx.createRadialGradient(cx, cyAbs, 0, cx, cyAbs, 8);
            halo.addColorStop(0, "rgba(220,225,255,0.35)");
            halo.addColorStop(1, "rgba(220,225,255,0)");
            ctx.fillStyle = halo;
            ctx.fillRect(cx - 8, cyAbs - 8, 16, 16);
        }
    }

    // Cloud — only when not deep night (skip if star density is high)
    if (sky.starDensity < 0.5) {
        const cloudX = ((ct * 0.02 + tx * 7) % (glassW + 12)) - 6;
        const cloudAlpha = 0.45 + (1 - sky.starDensity) * 0.25;
        ctx.fillStyle = `rgba(255,255,255,${cloudAlpha})`;
        ctx.fillRect(glassX + cloudX, glassY + 7, 6, 2);
        ctx.fillRect(glassX + cloudX + 2, glassY + 6, 4, 3);
    }

    // City silhouette at the bottom of the glass (subtle, day-tinted)
    const silhouetteAlpha = sky.starDensity > 0.5 ? 0.55 : 0.18;
    ctx.fillStyle = `rgba(40,55,80,${silhouetteAlpha})`;
    ctx.fillRect(glassX,            glassY + glassH - 3, 4, 3);
    ctx.fillRect(glassX + 5,        glassY + glassH - 5, 3, 5);
    ctx.fillRect(glassX + 9,        glassY + glassH - 4, 4, 4);
    ctx.fillRect(glassX + 14,       glassY + glassH - 6, 3, 6);
    ctx.fillRect(glassX + 18,       glassY + glassH - 4, 4, 4);

    // Curtain (soft pink, draped on sides)
    ctx.fillStyle = "#F9D4E0";
    ctx.fillRect(px + 3, py + 2, 3, TILE - 4);
    ctx.fillRect(px + TILE - 6, py + 2, 3, TILE - 4);
    // Curtain rod
    ctx.fillStyle = "#C8A878";
    ctx.fillRect(px + 2, py + 2, TILE - 4, 1.5);

    // Inner warm light spill at night (lamp behind window suggesting interior glow)
    const boost = indoorLightBoost();
    if (boost > 0.2) {
        ctx.fillStyle = `rgba(255,200,140,${boost * 0.22})`;
        ctx.fillRect(glassX, glassY + glassH * 0.55, glassW, glassH * 0.45);
    }
}

function drawTinyFlower(x, y, color, seed) {
    const ctx = S.ctx;
    const sway = Math.sin(seed * 0.001 + S.animFrame * 0.03) * 0.5;
    // Stem
    ctx.fillStyle = "#5AB87A";
    ctx.fillRect(x + sway, y + 2, 1, 4);
    // Petals (4 tiny squares around center)
    ctx.fillStyle = color;
    ctx.fillRect(x - 1 + sway, y, 1.5, 1.5);
    ctx.fillRect(x + 1 + sway, y, 1.5, 1.5);
    ctx.fillRect(x + sway, y - 1, 1.5, 1.5);
    ctx.fillRect(x + sway, y + 1, 1.5, 1.5);
    // Center
    ctx.fillStyle = "#FDE68A";
    ctx.fillRect(x + sway, y + 0.2, 1, 1);
}

function drawDesk(px, py, tx, ty) {
    const ctx = S.ctx;
    // Desk body
    ctx.fillStyle = PAL.deskEdge;
    ctx.fillRect(px + 2, py + 8, TILE - 4, TILE - 10);
    ctx.fillStyle = PAL.desk;
    ctx.fillRect(px + 3, py + 8, TILE - 6, TILE - 12);
    ctx.fillStyle = PAL.deskTop;
    ctx.fillRect(px + 2, py + 7, TILE - 4, 3);

    const above = OFFICE_MAP[ty - 1]?.[tx];
    if (above !== "D") {
        // Monitor
        ctx.fillStyle = PAL.monFrame;
        ctx.fillRect(px + 7, py + 1, 18, 14);
        ctx.fillStyle = PAL.monitor;
        ctx.fillRect(px + 8, py + 2, 16, 12);

        const agentHere = findAgentAtDesk(tx, ty);
        if (agentHere?.isRunning) {
            const pulse = 0.7 + Math.sin(S.animFrame * 0.04 + tx * 2) * 0.15;
            // Use the platform's brand colour for the active screen so each
            // platform feels visually identifiable at a glance.
            const platMeta = PLATFORM_META[agentHere.platform] || null;
            const tint = platMeta?.color || PAL.monActive;
            ctx.globalAlpha = pulse;
            // Base wash with a soft platform tint
            ctx.fillStyle = hexToRgba(tint, 0.65);
            ctx.fillRect(px + 9, py + 3, 14, 10);
            ctx.globalAlpha = 1;

            // Code lines in a darker shade of the same tint
            ctx.fillStyle = hexToRgba(tint, 0.85);
            for (let i = 0; i < 4; i++) {
                const w = 3 + ((tx * 5 + i * 3 + Math.floor(S.animFrame / 12)) % 9);
                ctx.fillRect(px + 10, py + 4 + i * 2.5, w, 1);
            }
            // Cursor blink — single pixel on the last line
            if (Math.floor(S.animFrame / 14) % 2 === 0) {
                ctx.fillStyle = hexToRgba(tint, 1);
                ctx.fillRect(px + 21, py + 12, 1, 1);
            }
        } else {
            ctx.fillStyle = PAL.monDim;
            ctx.fillRect(px + 9, py + 3, 14, 10);
        }

        // Stand
        ctx.fillStyle = "#B0A090";
        ctx.fillRect(px + 14, py + 15, 4, 2);

        // ── Desk props: varied per desk (stable from tx/ty) ──
        // Deterministic prop choice so each desk is consistent across frames.
        const propSeed = ((tx * 73 + ty * 31) >>> 0) % 4;
        // Desk lamp (left side of desk) — glows warm at night
        const lampX = px + 4, lampY = py + 5;
        ctx.fillStyle = "#5a4030"; // stand
        ctx.fillRect(lampX + 1, lampY + 6, 1, 4);
        ctx.fillStyle = "#3a2018"; // base
        ctx.fillRect(lampX, lampY + 9, 4, 1);
        ctx.fillStyle = "#8a6848"; // shade
        ctx.beginPath();
        ctx.moveTo(lampX - 0.5, lampY + 4);
        ctx.lineTo(lampX + 4, lampY + 4);
        ctx.lineTo(lampX + 3, lampY + 1);
        ctx.lineTo(lampX, lampY + 1);
        ctx.closePath();
        ctx.fill();
        // Bulb glow scales with indoor light boost (evening/night)
        const boost = indoorLightBoost();
        if (boost > 0.05) {
            const glow = ctx.createRadialGradient(lampX + 1.5, lampY + 5, 0, lampX + 1.5, lampY + 5, 7);
            glow.addColorStop(0, `rgba(255,220,140,${0.65 * boost})`);
            glow.addColorStop(1, "rgba(255,220,140,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(lampX - 4, lampY, 12, 12);
            // Warm spot on desk surface
            ctx.fillStyle = `rgba(255,210,130,${0.18 * boost})`;
            ctx.fillRect(px + 2, py + 8, TILE - 4, 3);
        }

        // Coffee mug, sticky note, plant — pick one variant per desk
        if (propSeed === 0) {
            // Coffee mug (right side)
            ctx.fillStyle = "#F2E8DC";
            ctx.fillRect(px + 22, py + 9, 4, 4);
            ctx.fillStyle = "#3a2418"; // coffee
            ctx.fillRect(px + 22, py + 9, 4, 1);
            ctx.fillStyle = "#F2E8DC";
            ctx.fillRect(px + 26, py + 10, 1, 2);
        } else if (propSeed === 1) {
            // Sticky note stack (right side)
            ctx.fillStyle = "#FCE7A8";
            ctx.fillRect(px + 21, py + 9, 5, 4);
            ctx.fillStyle = "rgba(180,140,40,0.4)";
            ctx.fillRect(px + 22, py + 10, 3, 0.6);
            ctx.fillRect(px + 22, py + 11.2, 2, 0.6);
        } else if (propSeed === 2) {
            // Tiny succulent in pot
            ctx.fillStyle = "#8b5a3c";
            ctx.fillRect(px + 22, py + 11, 4, 2);
            ctx.fillStyle = "#3aa570";
            ctx.fillRect(px + 22.5, py + 8.5, 1, 2.5);
            ctx.fillRect(px + 23.5, py + 8, 1, 3);
            ctx.fillRect(px + 24.5, py + 9, 1, 2);
        } else {
            // Stack of books
            ctx.fillStyle = "#c25a55";
            ctx.fillRect(px + 21, py + 11, 5, 1.5);
            ctx.fillStyle = "#3a78d4";
            ctx.fillRect(px + 21.5, py + 10, 4.5, 1);
            ctx.fillStyle = "#e2c060";
            ctx.fillRect(px + 22, py + 9, 4, 1);
        }

        // Chair (cute pink!)
        ctx.fillStyle = PAL.chair;
        ctx.fillRect(px + 8, py + TILE - 5, 16, 7);
        ctx.fillStyle = PAL.chairSeat;
        ctx.fillRect(px + 10, py + TILE - 3, 12, 4);
    }
}

function findAgentAtDesk(tx, ty) {
    for (let i = 0; i < S.liveAgents.length; i++) {
        const d = S.DESK_SPOTS[i % S.DESK_SPOTS.length];
        if (d.x === tx && d.y === ty) return S.liveAgents[i];
    }
    return null;
}

function drawServer(px, py) {
    const ctx = S.ctx;
    ctx.fillStyle = PAL.server;
    ctx.fillRect(px + 5, py + 2, TILE - 10, TILE - 4);
    ctx.fillStyle = PAL.serverFace;
    ctx.fillRect(px + 7, py + 4, TILE - 14, TILE - 8);

    // LEDs reflect active agent count
    const activeCount = S.liveAgents.filter(a => a.isRunning).length;
    for (let i = 0; i < 3; i++) {
        const isLit = i < activeCount;
        const blink = Math.sin(S.animFrame * 0.08 + i * 2.5 + px * 0.1) > 0;
        ctx.fillStyle = isLit ? (blink ? PAL.serverLed : "#1a8a5a") : "#B0D8C0";
        ctx.fillRect(px + 9 + i * 4, py + 7, 2, 2);
    }

    ctx.fillStyle = "#A8B8C8";
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 7, py + 13 + i * 4, TILE - 14, 1);
}

function drawCoffee(px, py, tx) {
    const ctx = S.ctx;
    if (tx !== 14) return; // only draw once from leftmost C tile
    ctx.fillStyle = PAL.coffeeMach;
    ctx.fillRect(px + 6, py + 3, 20, 18);
    ctx.fillStyle = "#F0E8D8";
    ctx.fillRect(px + 8, py + 5, 16, 8);

    // Display
    ctx.fillStyle = "rgba(52,211,153,0.5)";
    ctx.fillRect(px + 9, py + 6, 5, 4);

    // Cup
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(px + 12, py + 16, 6, 5);
    ctx.fillStyle = PAL.coffee;
    ctx.fillRect(px + 13, py + 17, 4, 2);

    // Steam
    const sy = Math.sin(S.animFrame * 0.06) * 2;
    ctx.fillStyle = PAL.coffeeSteam;
    ctx.fillRect(px + 13, py + 12 + sy, 1.5, 3);
    ctx.fillRect(px + 16, py + 11 + sy, 1.5, 3.5);
}

function drawPlant(px, py) {
    const ctx = S.ctx;
    ctx.fillStyle = PAL.pot;
    ctx.fillRect(px + 11, py + 19, 10, 8);
    ctx.fillRect(px + 9, py + 17, 14, 3);

    const sw = Math.sin(S.animFrame * 0.025 + px * 0.3) * 1.5;
    ctx.fillStyle = PAL.plant1;
    ctx.fillRect(px + 13 + sw, py + 5, 6, 13);
    ctx.fillStyle = PAL.plant2;
    ctx.fillRect(px + 9 + sw, py + 7, 5, 7);
    ctx.fillRect(px + 18 + sw, py + 9, 5, 5);
    ctx.fillRect(px + 14 + sw, py + 3, 4, 5);
}

function drawWhiteboard(px, py) {
    const ctx = S.ctx;
    ctx.fillStyle = PAL.wbFrame;
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 9);
    ctx.fillStyle = PAL.whiteboard;
    ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 13);

    // Show real project names from active agents
    const activeProjects = S.liveAgents.filter(a => a.isRunning).map(a => a.projectName);
    const colors = ["rgba(5,150,105,0.4)", "rgba(37,99,235,0.35)", "rgba(217,119,6,0.35)", "rgba(220,50,100,0.3)"];
    ctx.font = "2.5px Pretendard, sans-serif";
    ctx.textAlign = "left";
    for (let i = 0; i < Math.min(activeProjects.length, 4); i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillText(activeProjects[i].substring(0, 8), px + 7, py + 8 + i * 3.5);
    }
    if (activeProjects.length === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(px + 7, py + 7, 8, 1);
        ctx.fillRect(px + 7, py + 10, 12, 1);
    }
}

function drawMeeting(px, py) {
    const ctx = S.ctx;
    const cx = px + TILE / 2, cy = py + TILE / 2;
    // Chairs around table (show if agents are in meeting status)
    const meetingAgents = S.liveAgents.filter(a => a.status === "meeting" || a.status === "reviewing").length;
    const chairPositions = [[-14,0],[14,0],[0,-14],[0,14]];
    for (let i = 0; i < Math.min(meetingAgents, 4); i++) {
        const cp = chairPositions[i];
        ctx.fillStyle = PAL.chair;
        ctx.fillRect(cx + cp[0] - 3, cy + cp[1] - 3, 6, 6);
        ctx.fillStyle = PAL.chairSeat;
        ctx.fillRect(cx + cp[0] - 2, cy + cp[1] - 2, 4, 4);
    }
    // Table
    ctx.fillStyle = PAL.meetTable;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.meetTableTop;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
    // Papers/laptop on table
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 3, cy - 2, 4, 3);
    ctx.fillStyle = "#3a3a4a";
    ctx.fillRect(cx + 1, cy - 1, 3, 2);
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(cx + 1.5, cy - 0.5, 2, 1);
}

function drawLounge(px, py, tx, ty) {
    const ctx = S.ctx;
    const isLeft = (tx % 4 < 2); // left or right sofa
    // Sofa base
    ctx.fillStyle = "#7C9EB8";
    ctx.fillRect(px + 3, py + 6, TILE - 6, TILE - 8);
    // Cushion
    ctx.fillStyle = "#9AB8D0";
    ctx.fillRect(px + 5, py + 8, TILE - 10, TILE - 12);
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(px + 6, py + 9, TILE - 14, 3);
    // Armrest
    ctx.fillStyle = "#6888A0";
    if (isLeft) {
        ctx.fillRect(px + 2, py + 6, 3, TILE - 8);
    } else {
        ctx.fillRect(px + TILE - 5, py + 6, 3, TILE - 8);
    }
    // Pillow on top row only
    if (OFFICE_MAP[ty - 1]?.[tx] !== "L") {
        ctx.fillStyle = "#F9D4E0";
        ctx.fillRect(px + 10, py + 10, 8, 6);
        ctx.fillStyle = "#F0B8C8";
        ctx.fillRect(px + 11, py + 11, 6, 4);
    }
}

function drawBookshelf(px, py) {
    const ctx = S.ctx;
    // Frame
    ctx.fillStyle = "#8B7355";
    ctx.fillRect(px + 3, py + 2, TILE - 6, TILE - 4);
    // Shelves
    ctx.fillStyle = "#A08860";
    ctx.fillRect(px + 4, py + 3, TILE - 8, TILE - 6);
    // Shelf dividers
    ctx.fillStyle = "#7A6345";
    ctx.fillRect(px + 4, py + 10, TILE - 8, 1.5);
    ctx.fillRect(px + 4, py + 18, TILE - 8, 1.5);
    // Books (colorful spines)
    const colors = ["#E07070", "#70A0E0", "#70C080", "#E0C060", "#C080D0", "#F0A060"];
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(px + 5 + i * 3.5, py + 4, 2.5, 6);
    }
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = colors[(i + 3) % colors.length];
        ctx.fillRect(px + 6 + i * 4, py + 12, 3, 5.5);
    }
    // Small plant on top shelf
    ctx.fillStyle = PAL.pot;
    ctx.fillRect(px + 18, py + 20, 5, 4);
    ctx.fillStyle = PAL.plant2;
    ctx.fillRect(px + 19, py + 16, 3, 5);
}

function drawVending(px, py) {
    const ctx = S.ctx;
    // Machine body
    ctx.fillStyle = "#D04050";
    ctx.fillRect(px + 4, py + 2, TILE - 8, TILE - 4);
    // Front panel
    ctx.fillStyle = "#E05060";
    ctx.fillRect(px + 6, py + 4, TILE - 12, TILE - 10);
    // Glass window
    ctx.fillStyle = "rgba(200,230,255,0.3)";
    ctx.fillRect(px + 7, py + 5, TILE - 14, 10);
    // Drink rows
    const drinkColors = ["#40A0E0", "#50C050", "#E0A030", "#E06060"];
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
            ctx.fillStyle = drinkColors[(r * 3 + c) % drinkColors.length];
            ctx.fillRect(px + 8 + c * 5, py + 6 + r * 5, 3, 4);
        }
    }
    // Coin slot
    ctx.fillStyle = "#B03040";
    ctx.fillRect(px + 8, py + 19, 4, 3);
    // Dispenser
    ctx.fillStyle = "#901828";
    ctx.fillRect(px + 15, py + 18, 6, 5);
    // Light indicator
    const on = Math.sin(S.animFrame * 0.05) > 0;
    ctx.fillStyle = on ? "#50FF80" : "#206030";
    ctx.fillRect(px + TILE - 9, py + 5, 2, 2);
}

function drawAquarium(px, py) {
    const ctx = S.ctx;
    // Tank frame
    ctx.fillStyle = "#5A6878";
    ctx.fillRect(px + 2, py + 4, TILE - 4, TILE - 6);
    // Water
    ctx.fillStyle = "rgba(80,160,220,0.35)";
    ctx.fillRect(px + 4, py + 6, TILE - 8, TILE - 10);
    // Water surface shimmer
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    const shimX = Math.sin(S.animFrame * 0.04 + px) * 2;
    ctx.fillRect(px + 6 + shimX, py + 6, 8, 1);
    // Fish 1 (orange)
    const f1x = px + 8 + Math.sin(S.animFrame * 0.03 + 1) * 6;
    const f1y = py + 12 + Math.sin(S.animFrame * 0.05) * 2;
    ctx.fillStyle = "#F0A040";
    ctx.fillRect(f1x, f1y, 4, 2);
    ctx.fillRect(f1x - 1, f1y + 1, 1, 1); // tail
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(f1x + 3, f1y, 0.7, 0.7); // eye
    // Fish 2 (blue)
    const f2x = px + 16 + Math.sin(S.animFrame * 0.025 + 3) * 5;
    const f2y = py + 16 + Math.sin(S.animFrame * 0.04 + 2) * 2;
    ctx.fillStyle = "#60A0E0";
    ctx.fillRect(f2x, f2y, 3, 2);
    ctx.fillRect(f2x + 3, f2y + 0.5, 1, 1); // tail
    // Bubbles
    const bubY = py + 20 - (S.animFrame * 0.3 + px) % 14;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.arc(px + 12, bubY, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 18, bubY + 4, 0.7, 0, Math.PI * 2); ctx.fill();
    // Gravel
    ctx.fillStyle = "#A89870";
    ctx.fillRect(px + 4, py + TILE - 8, TILE - 8, 2);
    // Seaweed
    const sw = Math.sin(S.animFrame * 0.03 + px * 0.2) * 1;
    ctx.fillStyle = "#40A060";
    ctx.fillRect(px + 8 + sw, py + TILE - 14, 1.5, 6);
    ctx.fillRect(px + 20 + sw, py + TILE - 12, 1.5, 4);
}

// ── Agent Rendering (Korean characters) ──
function drawAgents() {
    const sorted = S.liveAgents
        .map(a => ({ a, v: S.visualAgents[a.pid] }))
        .filter(o => o.v)
        .sort((a, b) => a.v.y - b.v.y);

    sorted.forEach(({ a, v }) => drawAgent(a, v));
}

function drawAgent(agent, v) {
    const ctx = S.ctx;
    ctx.save();
    const x = Math.round(v.x), y = Math.round(v.y);
    const t = v.animTick;
    const th = v.theme;
    const bob = v.moving ? Math.sin(t * 0.3) * 1.5 : 0;
    const sel = agent.pid === S.selectedPid;
    const status = agent.isRunning ? agent.status : "offline";
    const offline = !agent.isRunning;

    // Shadow (soft)
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath(); ctx.ellipse(x, y + 7, 6, 3, 0, 0, Math.PI * 2); ctx.fill();

    drawAgentAura(agent, v, x, y, t, status);

    // Selection ring — warm pink
    if (sel) {
        ctx.strokeStyle = "rgba(249,168,212,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y + 7, 10, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    }

    if (offline) ctx.globalAlpha = 0.4;

    const by = y + bob;

    // Body (rounded feel)
    ctx.fillStyle = th.body;
    ctx.fillRect(x - 4, by - 4, 8, 8);
    // Body highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x - 3, by - 3, 3, 2);

    // Legs
    const la = v.moving ? Math.sin(t * 0.4) * 2.5 : 0;
    ctx.fillStyle = "#3a3a4a";
    ctx.fillRect(x - 3, by + 4, 3, 4 + la);
    ctx.fillRect(x + 1, by + 4, 3, 4 - la);

    // Arms
    ctx.fillStyle = th.bodyDark;
    if (status === "coding" && !v.moving) {
        const tp = Math.sin(t * 0.5) * 1;
        ctx.fillRect(x - 6, by - 1 + tp, 2, 4);
        ctx.fillRect(x + 4, by - 1 - tp, 2, 4);
    } else if (status === "thinking" && !v.moving) {
        ctx.fillRect(x - 6, by - 2, 2, 5);
        ctx.fillRect(x + 4, by - 5, 2, 4);
    } else if (status === "coffee" && !v.moving) {
        ctx.fillRect(x - 6, by - 1, 2, 4);
        ctx.fillRect(x + 4, by - 1, 2, 4);
        // Cup
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x + 5, by - 1, 3, 3);
        ctx.fillStyle = PAL.coffee;
        ctx.fillRect(x + 6, by, 1, 1);
    } else {
        const aa = v.moving ? Math.sin(t * 0.4) * 1.5 : 0;
        ctx.fillRect(x - 6, by - 1 + aa, 2, 4);
        ctx.fillRect(x + 4, by - 1 - aa, 2, 4);
    }

    // Status-specific props
    if (status === "reviewing" && !v.moving) {
        // Clipboard in hand
        ctx.fillStyle = "#F5F0E8";
        ctx.fillRect(x - 8, by - 2, 3, 4);
        ctx.fillStyle = "#D4C4A8";
        ctx.fillRect(x - 8, by - 3, 3, 1);
        // Text lines
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(x - 7, by - 0.5, 1.5, 0.5);
        ctx.fillRect(x - 7, by + 0.5, 1, 0.5);
    }
    if (status === "searching" && !v.moving) {
        ctx.strokeStyle = "rgba(37,99,235,0.5)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x + 7, by - 4, 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(37,99,235,0.3)";
        ctx.fillRect(x + 8.5, by - 2, 1, 2.5);
    }

    if (agent.needsReview && !offline) {
        ctx.fillStyle = "rgba(245,158,11,0.92)";
        roundRect(ctx, x + 7, by - 18, 8, 8, 2);
        ctx.fill();
        ctx.fillStyle = "#fff7ed";
        ctx.fillRect(x + 10.5, by - 16, 1, 4);
        ctx.fillRect(x + 10.5, by - 11, 1, 1);
    }

    // Head (Korean skin tone)
    ctx.fillStyle = th.skin;
    ctx.fillRect(x - 3, by - 11, 7, 7);

    // Hair — gender-aware styles
    ctx.fillStyle = th.hairColor || th.hair;
    if (th.gender === "F") {
        if (th.hairStyle === "long") {
            // Top cap
            ctx.fillRect(x - 4, by - 12, 9, 4);
            // Long flowing sides
            ctx.fillRect(x - 5, by - 10, 2, 8);
            ctx.fillRect(x + 4, by - 10, 2, 8);
            // Back hair
            ctx.fillRect(x - 4, by - 8, 1, 6);
            ctx.fillRect(x + 4, by - 8, 1, 6);
        } else if (th.hairStyle === "bob") {
            ctx.fillRect(x - 4, by - 12, 9, 4);
            ctx.fillRect(x - 5, by - 10, 2, 5);
            ctx.fillRect(x + 4, by - 10, 2, 5);
        } else if (th.hairStyle === "pony") {
            ctx.fillRect(x - 4, by - 12, 9, 4);
            ctx.fillRect(x - 4, by - 10, 1, 3);
            ctx.fillRect(x + 4, by - 10, 1, 3);
            // Ponytail on back
            ctx.fillRect(x + 5, by - 9, 2, 5);
        } else if (th.hairStyle === "twin") {
            ctx.fillRect(x - 4, by - 12, 9, 4);
            // Twin tails
            ctx.fillRect(x - 6, by - 10, 2, 6);
            ctx.fillRect(x + 5, by - 10, 2, 6);
        }
    } else {
        // Male hair styles
        if (th.hairStyle === "crew") {
            ctx.fillRect(x - 3, by - 12, 7, 3);
            ctx.fillRect(x - 4, by - 11, 1, 2);
            ctx.fillRect(x + 4, by - 11, 1, 2);
        } else if (th.hairStyle === "part") {
            ctx.fillRect(x - 4, by - 12, 9, 4);
            ctx.fillRect(x - 4, by - 10, 1, 2);
            ctx.fillRect(x + 4, by - 10, 1, 2);
            // Part line
            ctx.fillStyle = th.skin;
            ctx.fillRect(x + 1, by - 12, 1, 2);
            ctx.fillStyle = th.hairColor || th.hair;
        } else {
            // Default short
            ctx.fillRect(x - 4, by - 12, 9, 3);
            ctx.fillRect(x - 4, by - 10, 1, 2);
            ctx.fillRect(x + 4, by - 10, 1, 2);
        }
    }

    // Accessories
    if (th.accessory === "glasses") {
        ctx.strokeStyle = "rgba(100,100,120,0.6)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 3, by - 9.5, 2.5, 2);
        ctx.strokeRect(x + 0.5, by - 9.5, 2.5, 2);
        // Bridge
        ctx.fillStyle = "rgba(100,100,120,0.4)";
        ctx.fillRect(x - 0.5, by - 9, 1, 0.5);
    } else if (th.accessory === "ribbon") {
        ctx.fillStyle = "#F9A8D4";
        ctx.fillRect(x + 3, by - 13, 3, 2);
        ctx.fillRect(x + 4, by - 14, 1, 1);
    } else if (th.accessory === "cap") {
        ctx.fillStyle = th.body;
        ctx.fillRect(x - 5, by - 13, 11, 2);
        ctx.fillRect(x - 3, by - 14, 7, 2);
        // Brim
        ctx.fillStyle = th.bodyDark;
        ctx.fillRect(x - 6, by - 11, 4, 1);
    } else if (th.accessory === "earring") {
        ctx.fillStyle = "#FDE68A";
        ctx.fillRect(x - 5, by - 7, 1, 2);
    }

    // Blush (cute!)
    ctx.fillStyle = "rgba(249,168,212,0.35)";
    ctx.fillRect(x - 3, by - 6, 2, 1);
    ctx.fillRect(x + 2, by - 6, 2, 1);

    // Eyes
    const blink = t % 130 > 125;
    if (status === "idle" && !v.moving && !blink) {
        // Half-closed drowsy eyes
        ctx.fillStyle = th.hair;
        ctx.fillRect(x - 2, by - 8.5, 2, 1.5);
        ctx.fillRect(x + 1, by - 8.5, 2, 1.5);
    } else if (blink) {
        ctx.fillStyle = th.hair;
        ctx.fillRect(x - 2, by - 8, 2, 1);
        ctx.fillRect(x + 1, by - 8, 2, 1);
    } else {
        // White of eye
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(x - 2, by - 9, 2, 2);
        ctx.fillRect(x + 1, by - 9, 2, 2);
        // Pupil
        ctx.fillStyle = th.hair;
        const lx = v.direction === 1 ? -1 : v.direction === 2 ? 1 : 0;
        ctx.fillRect(x - 2 + lx, by - 8, 1, 1);
        ctx.fillRect(x + 2 + lx, by - 8, 1, 1);
    }

    // Smile (when not offline)
    if (!offline && status !== "thinking") {
        ctx.fillStyle = "rgba(180,80,80,0.4)";
        ctx.fillRect(x - 1, by - 5, 3, 1);
    }

    ctx.globalAlpha = 1;

    // Thinking dots (warm yellow)
    if (status === "thinking" && !v.moving) {
        const dp = Math.floor(t / 18) % 4;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < dp ? "rgba(217,119,6,0.7)" : "rgba(217,119,6,0.15)";
            ctx.fillRect(x + 7 + i * 3, by - 13 - Math.sin(t * 0.08 + i) * 1.5, 1.5, 1.5);
        }
    }

    // Chat indicator (when chatting with another agent)
    if (v.chatPartner && v.speechTimer > 0) {
        ctx.fillStyle = "rgba(249,168,212,0.6)";
        const heartY = by - 25 - Math.sin(t * 0.1) * 2;
        ctx.font = "4px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♥", x + 8, heartY);
    }

    // Memory bar
    if (agent.memoryMB > 0) {
        const bw = 16;
        const pct = Math.min(1, agent.memoryMB / 1500);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(x - bw / 2, y + 17, bw, 2);
        ctx.fillStyle = pct > 0.7 ? "#ef4444" : pct > 0.4 ? "#eab308" : "#059669";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x - bw / 2, y + 17, bw * pct, 2);
        ctx.globalAlpha = 1;
    }

    // Typing dots when actively coding (and not currently speaking)
    if (agent.isRunning && status === "coding" && !(v.speechTimer > 0 && v.speechText)) {
        const tdy = by - 18;
        const dots = 3;
        const pmetaTint = PLATFORM_META[agent.platform];
        const dotColor = pmetaTint?.color || "#059669";
        for (let i = 0; i < dots; i++) {
            const phase = (t * 0.18) - i * 0.55;
            const bouncY = Math.max(0, Math.sin(phase) * 1.6);
            ctx.fillStyle = dotColor;
            ctx.globalAlpha = 0.35 + Math.max(0, Math.sin(phase)) * 0.55;
            ctx.beginPath();
            ctx.arc(x - 4 + i * 4, tdy - bouncY, 0.95, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Speech bubble (higher position, bigger, distinct from sub-agent bubbles)
    if (v.speechTimer > 0 && v.speechText) {
        drawBubble(x, by - 26, v.speechText, v.speechTimer, v.chatPartner != null);
    }

    // Name label (Korean name + project + platform badge) — clamped width
    const MAX_LABEL_W = 52; // max label width in canvas pixels
    const nameLabel = th.name;
    const rawProj = agent.projectName || `PID:${agent.pid}`;
    const pmeta = PLATFORM_META[agent.platform] || PLATFORM_META.claude;
    const projText = `${pmeta.badge} ${rawProj}`;

    ctx.font = "bold 5px 'Pretendard', sans-serif";
    const nw = Math.min(ctx.measureText(nameLabel).width, MAX_LABEL_W);
    ctx.font = "3.5px 'Pretendard', sans-serif";
    const pw = Math.min(ctx.measureText(projText).width, MAX_LABEL_W);
    const lw = Math.max(nw, pw) + 8;
    const lh = 13;

    ctx.fillStyle = PAL.labelBg;
    roundRect(ctx, x - lw / 2, y + 12, lw, lh, 3);
    ctx.fill();
    ctx.strokeStyle = th.body + "40";
    ctx.lineWidth = 0.5;
    roundRect(ctx, x - lw / 2, y + 12, lw, lh, 3);
    ctx.stroke();

    // Name (clamped)
    ctx.font = "bold 5px 'Pretendard', sans-serif";
    ctx.fillStyle = offline ? PAL.labelTextOff : th.bodyDark;
    ctx.textAlign = "center";
    ctx.fillText(nameLabel, x, y + 19, MAX_LABEL_W);
    // Project + platform badge (clamped)
    ctx.font = "3.5px 'Pretendard', sans-serif";
    ctx.fillStyle = offline ? PAL.labelTextOff : PAL.labelText;
    ctx.textAlign = "center";
    ctx.fillText(projText, x, y + 23.5, MAX_LABEL_W);
    ctx.restore();
}

function drawAgentAura(agent, v, x, y, t, status) {
    if (!agent.isRunning || status === "idle" || status === "coffee") return;

    const ctx = S.ctx;
    const meta = STATUS_META[status] || STATUS_META.coding;
    const pulse = 0.5 + Math.sin(t * 0.08) * 0.5;
    const radius = 12 + pulse * 3;

    ctx.save();
    ctx.strokeStyle = hexToRgba(meta.color, 0.16 + pulse * 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, radius, 5 + pulse * 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (["coding", "reviewing", "searching", "thinking"].includes(status)) {
        for (let i = 0; i < 3; i++) {
            const a = t * 0.045 + i * 2.1;
            const px = x + Math.cos(a) * (11 + i);
            const py = y - 7 + Math.sin(a) * 6;
            ctx.fillStyle = hexToRgba(meta.color, 0.35 + pulse * 0.25);
            roundRect(ctx, px - 1.2, py - 1.2, 2.4, 2.4, 0.8);
            ctx.fill();
        }
    }

    if (agent.currentWork?.prompt) {
        const bx = x - 16;
        const by = y - 22;
        ctx.fillStyle = "rgba(15,23,42,0.58)";
        roundRect(ctx, bx, by, 12, 9, 2);
        ctx.fill();
        ctx.fillStyle = hexToRgba(meta.color, 0.9);
        ctx.fillRect(bx + 2, by + 2, 4 + (t % 18) * 0.18, 1);
        ctx.fillRect(bx + 2, by + 5, 7 - (t % 12) * 0.16, 1);
    }
    ctx.restore();
}

// ── Sub-Agent Rendering (compact dots lined up beside parent) ──
function drawSubAgents() {
    const ctx = S.ctx;
    // Group by parent
    const byParent = {};
    Object.values(S.visualSubAgents).forEach(sub => {
        if (!byParent[sub.parentPid]) byParent[sub.parentPid] = [];
        byParent[sub.parentPid].push(sub);
    });

    Object.entries(byParent).forEach(([pid, subs]) => {
        const parent = S.visualAgents[pid];
        if (!parent) return;
        const agent = S.liveAgents.find(a => a.pid === pid);
        if (!agent) return;

        // Sort by slot index
        subs.sort((a, b) => a.slotIndex - b.slotIndex);

        // Position: neat row to the right of parent, slightly below
        const startX = parent.x + 14;
        const startY = parent.y + 2;
        const spacing = 9; // horizontal spacing between dots
        const maxPerRow = 5;

        subs.forEach((sub, i) => {
            const task = agent.tasks?.find(t => t.id === sub.taskId);
            if (!task) return;

            ctx.save();

            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            const sx = startX + col * spacing;
            const sy = startY + row * 12;
            const t = sub.animTick;
            const isDone = task.status === "completed";
            const isActive = task.status === "in_progress";

            // Gentle bob (very subtle)
            const bob = isActive ? Math.sin(t * 0.06 + sub.bobPhase) * 0.8 : 0;

            if (isActive) {
                ctx.strokeStyle = hexToRgba(sub.color, 0.26);
                ctx.lineWidth = 0.5;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(parent.x + 7, parent.y + 2);
                ctx.quadraticCurveTo(parent.x + 14, parent.y - 4, sx, sy + bob);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (isDone) ctx.globalAlpha = 0.3;

            // ── Dot body (simple colored circle) ──
            const radius = isActive ? 3.5 : 3;
            ctx.fillStyle = sub.color;
            ctx.beginPath();
            ctx.arc(sx, sy + bob, radius, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.beginPath();
            ctx.arc(sx - 0.8, sy + bob - 1, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Eyes (tiny)
            if (!isDone) {
                const blink = t % 120 > 116;
                if (!blink) {
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(sx - 1.5, sy + bob - 1.2, 1, 1);
                    ctx.fillRect(sx + 0.5, sy + bob - 1.2, 1, 1);
                    ctx.fillStyle = "#1a1a2e";
                    ctx.fillRect(sx - 1.2, sy + bob - 0.8, 0.6, 0.6);
                    ctx.fillRect(sx + 0.8, sy + bob - 0.8, 0.6, 0.6);
                }
            }

            // Status indicator
            if (isActive) {
                // Small pulse ring
                const pulse = 0.2 + Math.sin(t * 0.05) * 0.1;
                ctx.strokeStyle = sub.color;
                ctx.globalAlpha = pulse;
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.arc(sx, sy + bob, radius + 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (isDone) {
                // Tiny checkmark
                ctx.strokeStyle = "#059669";
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(sx - 1.5, sy + bob);
                ctx.lineTo(sx - 0.3, sy + bob + 1);
                ctx.lineTo(sx + 1.5, sy + bob - 1);
                ctx.stroke();
            }

            ctx.restore();
        });

        // Draw one compact label for the group (if any tasks)
        if (subs.length > 0) {
            const activeCount = subs.filter(s => {
                const tk = agent.tasks?.find(t => t.id === s.taskId);
                return tk && tk.status === "in_progress";
            }).length;
            const doneCount = subs.filter(s => {
                const tk = agent.tasks?.find(t => t.id === s.taskId);
                return tk && tk.status === "completed";
            }).length;

            if (subs.length > 0) {
                const labelX = startX + Math.min(subs.length, maxPerRow) * spacing / 2 - spacing / 2;
                const rows = Math.ceil(subs.length / maxPerRow);
                const labelY = startY + rows * 12 + 1;
                const text = `${doneCount}/${subs.length} 완료`;
                ctx.font = "3px Pretendard, sans-serif";
                ctx.textAlign = "center";
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillText(text, labelX, labelY);
            }
        }
    });
}

function drawBubble(x, y, text, timer, isChat) {
    const ctx = S.ctx;
    const a = Math.min(1, timer / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = "bold 5px 'Pretendard', sans-serif";
    const tw = ctx.measureText(text).width;
    const bw = tw + 12, bh = 13;
    const bx = x - bw / 2, by2 = y - bh - 3;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    roundRect(ctx, bx + 1, by2 + 1, bw, bh, 5);
    ctx.fill();

    // Bubble bg
    ctx.fillStyle = isChat ? PAL.bubbleChatBg : PAL.bubbleBg;
    roundRect(ctx, bx, by2, bw, bh, 5);
    ctx.fill();
    ctx.strokeStyle = isChat ? "rgba(249,168,212,0.5)" : PAL.bubbleBorder;
    ctx.lineWidth = 0.6;
    roundRect(ctx, bx, by2, bw, bh, 5);
    ctx.stroke();

    // Tail
    ctx.fillStyle = isChat ? PAL.bubbleChatBg : PAL.bubbleBg;
    ctx.beginPath();
    ctx.moveTo(x - 2.5, by2 + bh);
    ctx.lineTo(x, by2 + bh + 3);
    ctx.lineTo(x + 2.5, by2 + bh);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = isChat ? PAL.bubbleChatText : PAL.bubbleText;
    ctx.textAlign = "center";
    ctx.fillText(text, x, by2 + 8.5);
    ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith("#") || hex.length < 7) return `rgba(16,185,129,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawParticles() {
    const ctx = S.ctx;
    S.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = (p.life / 50) * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawHeartParticles() {
    const ctx = S.ctx;
    S.heartParticles.forEach(h => {
        ctx.fillStyle = h.color;
        ctx.globalAlpha = Math.min(1, h.life / 30) * 0.7;
        ctx.font = `${h.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(h.char, h.x, h.y);
    });
    ctx.globalAlpha = 1;
}

// ── Empty State ──
function drawEmptyState() {
    if (S.liveAgents.length > 0) return;
    const ctx = S.ctx;
    const cx = (COLS * TILE) / 2, cy = (ROWS * TILE) / 2;
    const diagnostics = S.serverState?.diagnostics || {};
    const sessionCount = Number.isFinite(Number(diagnostics.sessionCount))
        ? Number(diagnostics.sessionCount)
        : Number(S.serverState?.totalSessions || 0);
    const externalSignals = Number(diagnostics.externalCount || 0)
        + Number(diagnostics.codexSessionCount || 0)
        + Number(diagnostics.cursorWorkspaceCount || 0);
    const mainText = S.connected ? t("empty.waitingTitle") : t("empty.connectingTitle");
    const subText = S.connected
        ? t("empty.signalCount", sessionCount, externalSignals)
        : t("empty.justWait");
    ctx.save();
    ctx.textAlign = "center";

    // Soft card behind the message for readability
    const cardW = 132, cardH = 78;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(ctx, cx - cardW / 2, cy - 36, cardW, cardH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 0.6;
    roundRect(ctx, cx - cardW / 2, cy - 36, cardW, cardH, 6);
    ctx.stroke();

    // Icon
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillText("🪑", cx, cy - 18);

    // Main text
    ctx.font = "bold 7px Pretendard, sans-serif";
    ctx.fillStyle = PAL.emptyText;
    ctx.fillText(mainText, cx, cy - 4);

    // Sub text
    ctx.font = "4.5px Pretendard, sans-serif";
    ctx.fillStyle = PAL.emptySub;
    ctx.fillText(subText, cx, cy + 4);

    // Platform hint row — show supported tools
    if (S.connected) {
        ctx.font = "bold 3.4px Pretendard, sans-serif";
        ctx.fillStyle = PAL.emptySub;
        ctx.fillText(t("empty.tryRunning"), cx, cy + 14);
        const platforms = [
            { c: "#D97757", t: "Claude" },
            { c: "#10A37F", t: "Codex"  },
            { c: "#00B4D8", t: "Cursor" },
            { c: "#6E40C9", t: "Copilot"},
        ];
        const stepX = 28;
        const totalW = stepX * (platforms.length - 1);
        const startX = cx - totalW / 2;
        platforms.forEach((p, i) => {
            const bx = startX + stepX * i;
            const by = cy + 22;
            // chip background
            ctx.fillStyle = `${p.c}26`;
            roundRect(ctx, bx - 11, by - 4, 22, 8, 2);
            ctx.fill();
            // dot
            ctx.fillStyle = p.c;
            ctx.beginPath();
            ctx.arc(bx - 7.5, by, 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = p.c;
            ctx.font = "bold 3.4px Pretendard, sans-serif";
            ctx.fillText(p.t, bx + 1, by + 1.3);
        });
    } else {
        ctx.fillStyle = "rgba(220,38,38,0.6)";
        ctx.font = "bold 4px Pretendard, sans-serif";
        ctx.fillText(t("empty.serverWaiting"), cx, cy + 16);
        ctx.font = "3.5px Pretendard, sans-serif";
        ctx.fillStyle = PAL.emptySub;
        ctx.fillText(t("empty.checkServer"), cx, cy + 24);
    }

    ctx.restore();
}

// ── Zoom UI indicator (drawn on canvas) ──
function drawZoomIndicator() {
    const ctx = S.ctx;
    if (Math.abs(S.zoomLevel - 1.0) < 0.05) return; // don't show at 100%
    ctx.save();
    // Draw in screen space (not world space)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const text = `${Math.round(S.zoomLevel * 100)}%`;
    ctx.font = "bold 11px Pretendard, sans-serif";
    ctx.textAlign = "left";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(8, S.canvasH - 28, tw + 16, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, 16, S.canvasH - 14);
    // Reset button hint
    ctx.font = "9px Pretendard, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("더블클릭: 리셋", 16, S.canvasH - 3);
    ctx.restore();
}
