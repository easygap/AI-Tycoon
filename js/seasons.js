// ============================================================
//  AI TYCOON — Seasonal decorations
// ============================================================
//
// Auto-detect the current calendar month and decorate the office:
//   • Dec → 크리스마스 (tree + snow)
//   • Oct → 할로윈 (pumpkin + spider web)
//   • Mar-Apr → 봄 (cherry blossom petals drifting)
//   • else → normal
//
// User can override via Settings → Seasonal decorations.

import { TILE, COLS, ROWS } from "./constants.js";

function autoSeason(date) {
    const m = (date || new Date()).getMonth(); // 0-11
    if (m === 11) return "winter";          // December
    if (m === 9 || m === 10) return "halloween"; // October-November
    if (m === 2 || m === 3) return "spring";  // March-April
    return "normal";
}

export function getSeason(date) {
    try {
        const ov = localStorage.getItem("ai-tycoon-season");
        if (ov && ["winter", "halloween", "spring", "normal", "auto"].includes(ov)) {
            return ov === "auto" ? autoSeason(date) : ov;
        }
    } catch { /* ignore */ }
    return autoSeason(date);
}

// ── Particle pools for snow + petals ──
const flakes = [];
const petals = [];
const MAX_PARTICLES = 60;

function ensurePool(pool, count) {
    while (pool.length < count) {
        pool.push({
            x: Math.random() * COLS * TILE,
            y: Math.random() * -100,
            vy: 0.25 + Math.random() * 0.55,
            vx: (Math.random() - 0.5) * 0.6,
            rot: Math.random() * Math.PI * 2,
            vrot: (Math.random() - 0.5) * 0.04,
            size: 0.8 + Math.random() * 1.6,
            phase: Math.random() * Math.PI * 2,
        });
    }
    pool.length = count;
}

function drawSnow(ctx, animFrame) {
    ensurePool(flakes, MAX_PARTICLES);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    flakes.forEach(f => {
        f.y += f.vy;
        f.x += f.vx + Math.sin(animFrame * 0.02 + f.phase) * 0.15;
        if (f.y > ROWS * TILE) { f.y = -4; f.x = Math.random() * COLS * TILE; }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawPetals(ctx, animFrame) {
    ensurePool(petals, Math.floor(MAX_PARTICLES * 0.7));
    ctx.save();
    petals.forEach(p => {
        p.y += p.vy * 0.65;
        p.x += p.vx + Math.sin(animFrame * 0.018 + p.phase) * 0.3;
        p.rot += p.vrot;
        if (p.y > ROWS * TILE) { p.y = -4; p.x = Math.random() * COLS * TILE; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(${250 - p.size * 10},${168},${200 + p.size * 8},0.85)`;
        // Petal: tiny pill
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(-p.size * 0.4, -0.3, p.size * 0.6, 0.5);
        ctx.restore();
    });
    ctx.restore();
}

function drawChristmasTree(ctx, animFrame) {
    // Near the entrance, lower-right of work area
    const tx = 13.2 * TILE;
    const ty = 13.5 * TILE;
    // Trunk
    ctx.fillStyle = "#6F4A33";
    ctx.fillRect(tx - 2, ty + 12, 4, 4);
    // 3 triangle tiers
    const tiers = [
        { y: 0, w: 14, h: 9, c: "#1f6b3d" },
        { y: 6, w: 11, h: 8, c: "#2f8a52" },
        { y: 11, w: 9, h: 7, c: "#3aa365" },
    ];
    tiers.forEach(tier => {
        ctx.fillStyle = tier.c;
        ctx.beginPath();
        ctx.moveTo(tx, ty + tier.y - 4);
        ctx.lineTo(tx - tier.w / 2, ty + tier.y + tier.h);
        ctx.lineTo(tx + tier.w / 2, ty + tier.y + tier.h);
        ctx.closePath();
        ctx.fill();
    });
    // Twinkling lights
    const colors = ["#ff5252", "#ffeb3b", "#4caf50", "#03a9f4", "#e91e63"];
    for (let i = 0; i < 7; i++) {
        const seed = i * 31;
        const x = tx - 6 + ((animFrame * 0.04 + seed) % 12) - 1.5;
        const y = ty - 3 + i * 2.2;
        const blink = Math.sin(animFrame * 0.12 + i * 1.3) > 0.3 ? 1 : 0.3;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = blink;
        ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
    // Star on top
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(tx, ty - 5);
    ctx.lineTo(tx + 1.5, ty - 1);
    ctx.lineTo(tx + 4, ty - 0.5);
    ctx.lineTo(tx + 2, ty + 1.5);
    ctx.lineTo(tx + 3, ty + 4);
    ctx.lineTo(tx, ty + 2.5);
    ctx.lineTo(tx - 3, ty + 4);
    ctx.lineTo(tx - 2, ty + 1.5);
    ctx.lineTo(tx - 4, ty - 0.5);
    ctx.lineTo(tx - 1.5, ty - 1);
    ctx.closePath();
    ctx.fill();
    // Glow ring
    const glow = ctx.createRadialGradient(tx, ty - 4, 0, tx, ty - 4, 14);
    glow.addColorStop(0, "rgba(255,240,170,0.45)");
    glow.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(tx - 14, ty - 18, 28, 28);
}

function drawPumpkin(ctx, animFrame) {
    // Near the entrance
    const px = 14 * TILE - 4;
    const py = 15 * TILE + 16;
    // Pumpkin body (orange)
    ctx.fillStyle = "#e07020";
    ctx.beginPath(); ctx.ellipse(px, py, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c25818";
    ctx.fillRect(px - 7, py - 0.5, 14, 1);
    ctx.fillStyle = "#f0832c";
    ctx.fillRect(px - 1, py - 5.5, 2, 11);
    // Stem
    ctx.fillStyle = "#3a5a28";
    ctx.fillRect(px - 1, py - 8, 2, 3);
    // Glowing face (flicker)
    const flicker = Math.sin(animFrame * 0.18) > 0.2 ? 1 : 0.55;
    ctx.fillStyle = `rgba(255,200,40,${flicker})`;
    // eyes
    ctx.beginPath(); ctx.moveTo(px - 3, py - 2); ctx.lineTo(px - 1.5, py - 0.5); ctx.lineTo(px - 4.5, py - 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + 3, py - 2); ctx.lineTo(px + 1.5, py - 0.5); ctx.lineTo(px + 4.5, py - 0.5); ctx.closePath(); ctx.fill();
    // mouth
    ctx.fillRect(px - 3, py + 1.5, 6, 1);
    ctx.fillRect(px - 2, py + 2.5, 1, 1);
    ctx.fillRect(px + 1, py + 2.5, 1, 1);
    // Halo
    const glow = ctx.createRadialGradient(px, py, 0, px, py, 16);
    glow.addColorStop(0, `rgba(255,160,50,${0.35 * flicker})`);
    glow.addColorStop(1, "rgba(255,160,50,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(px - 16, py - 16, 32, 32);
}

function drawSpiderWeb(ctx) {
    // Top-right corner of work area
    const cx = 11 * TILE - 8;
    const cy = 1 * TILE - 2;
    ctx.strokeStyle = "rgba(220,220,230,0.55)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 9);
        ctx.stroke();
    }
    for (let r = 3; r <= 12; r += 4) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.4, r, r * 0.6, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
    }
    // Spider
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cx + 6, cy + 3.5, 2, 2);
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx + 5 - i * 0.5, cy + 4 + i * 0.5, 1, 0.5);
        ctx.fillRect(cx + 8 + i * 0.5, cy + 4 + i * 0.5, 1, 0.5);
    }
}

function drawCherryBranch(ctx, animFrame) {
    // Tiny pink branch in the work area corner
    const sx = 11 * TILE - 10;
    const sy = 1 * TILE + 4;
    ctx.strokeStyle = "#5a3a28";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 5, sy + 6, sx + 14, sy + 2);
    ctx.stroke();
    // Blossoms
    const blossomColors = ["#FFB7D5", "#FFD0E0", "#FFC2DC"];
    for (let i = 0; i < 5; i++) {
        const bx = sx + 2 + i * 2.5 + Math.sin(animFrame * 0.04 + i) * 0.6;
        const by = sy + 1 + Math.sin(animFrame * 0.05 + i * 0.7) * 0.4;
        ctx.fillStyle = blossomColors[i % blossomColors.length];
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(bx + Math.cos(a) * 0.9, by + Math.sin(a) * 0.9, 0.9, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#FBD0A0";
        ctx.fillRect(bx - 0.3, by - 0.3, 0.7, 0.7);
    }
}

export function drawSeasonal(ctx, animFrame) {
    const season = getSeason();
    switch (season) {
        case "winter":
            drawChristmasTree(ctx, animFrame);
            drawSnow(ctx, animFrame);
            break;
        case "halloween":
            drawPumpkin(ctx, animFrame);
            drawSpiderWeb(ctx);
            break;
        case "spring":
            drawCherryBranch(ctx, animFrame);
            drawPetals(ctx, animFrame);
            break;
        default:
            return;
    }
}

if (typeof window !== "undefined") {
    window.aiTycoonSeason = {
        get: getSeason,
        override(v) {
            try {
                if (v) localStorage.setItem("ai-tycoon-season", v);
                else localStorage.removeItem("ai-tycoon-season");
            } catch { /* ignore */ }
        },
    };
}
