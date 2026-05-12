// ============================================================
//  AI TYCOON — Background NPCs (non-agent ambient characters)
// ============================================================
//
// Adds life to the office even when no AI agents are connected:
//   • A cleaning robot ("로비") that loops along the work corridor.
//   • An occasional paper airplane that glides diagonally across the room.
//
// All draw onto the same Canvas 2D context as the office renderer,
// after furniture and before agent sprites.

import { TILE, COLS, ROWS, OFFICE_MAP } from "./constants.js";

// ── Cleaning robot ──────────────────────────────────────────
// Path: loops counter-clockwise around the work-area corridors.
// All coordinates in tile units.
const ROBOT_PATH = [
    { x: 1.5, y: 14.5 },
    { x: 11, y: 14.5 },
    { x: 11, y: 11.5 },
    { x: 1.5, y: 11.5 },
    { x: 1.5, y: 8.5 },
    { x: 11, y: 8.5 },
    { x: 11, y: 5.5 },
    { x: 1.5, y: 5.5 },
    { x: 1.5, y: 2.5 },
    { x: 11, y: 2.5 },
    { x: 11, y: 5.5 },   // start coming back
    { x: 1.5, y: 8.5 },
    { x: 1.5, y: 11.5 },
    { x: 11, y: 11.5 },
    { x: 11, y: 14.5 },
];

const robot = {
    idx: 0,
    progress: 0,   // 0..1 between idx and idx+1
    speed: 0.0035, // tile-units per frame factor (multiplied by segment length later)
    dustPhase: 0,
    pauseTimer: 0,
};

// Paper airplane — appears occasionally for 4 seconds
const airplane = {
    active: false,
    sx: 0, sy: 0, ex: 0, ey: 0,
    progress: 0,
    nextSpawn: Math.floor(Math.random() * 600) + 300, // frames until first appearance
};

function tileWalkable(tx, ty) {
    const ch = OFFICE_MAP[ty]?.[tx];
    return ch === "F" || ch === "R" || ch === " ";
}

function moveAlongPath(animFrame) {
    if (robot.pauseTimer > 0) {
        robot.pauseTimer--;
        return;
    }
    const from = ROBOT_PATH[robot.idx];
    const to = ROBOT_PATH[(robot.idx + 1) % ROBOT_PATH.length];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segLen = Math.hypot(dx, dy) || 1;
    // Move a fixed world distance per frame, regardless of segment length
    robot.progress += robot.speed / segLen;
    if (robot.progress >= 1) {
        robot.progress = 0;
        robot.idx = (robot.idx + 1) % ROBOT_PATH.length;
        // Occasionally pause to "clean"
        if (Math.random() < 0.18) robot.pauseTimer = 60 + Math.random() * 120;
    }
    robot.dustPhase += 0.18;
    void animFrame;
}

function drawCleaningRobot(ctx, animFrame) {
    const from = ROBOT_PATH[robot.idx];
    const to = ROBOT_PATH[(robot.idx + 1) % ROBOT_PATH.length];
    const t = robot.progress;
    const tx = from.x + (to.x - from.x) * t;
    const ty = from.y + (to.y - from.y) * t;
    const px = tx * TILE;
    const py = ty * TILE;
    const moving = robot.pauseTimer === 0;

    // Tiny dust cloud trail behind, when moving
    if (moving) {
        const dx = (to.x - from.x);
        const dy = (to.y - from.y);
        const len = Math.hypot(dx, dy) || 1;
        const bx = px - (dx / len) * 4;
        const by = py - (dy / len) * 4;
        ctx.fillStyle = `rgba(200,195,185,${0.25 + Math.sin(robot.dustPhase) * 0.08})`;
        ctx.beginPath(); ctx.arc(bx, by + 4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx - 2, by + 3, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Shadow under robot
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(px, py + 5, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();

    // Body (white puck with chrome rim)
    ctx.fillStyle = "#E8EEF4";
    ctx.beginPath(); ctx.arc(px, py + 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#C8D0DA";
    ctx.beginPath(); ctx.arc(px, py + 2, 5, 0, Math.PI, false); ctx.fill();
    // Top cap (mint)
    ctx.fillStyle = "#A8E6C8";
    ctx.beginPath(); ctx.arc(px, py + 1, 3.2, 0, Math.PI * 2); ctx.fill();

    // LED indicator (blinks blue while moving, soft green when paused)
    const ledLit = moving
        ? (Math.floor(animFrame / 18) % 2 === 0)
        : true;
    if (ledLit) {
        ctx.fillStyle = moving ? "#3FB6FF" : "#7CE6A8";
        ctx.fillRect(px - 0.7, py - 0.6, 1.4, 1.4);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(px - 0.5, py - 0.3, 0.7, 0.7);
    }

    // Brush slot (dark line)
    ctx.fillStyle = "rgba(40,46,60,0.55)";
    ctx.fillRect(px - 3, py + 3.4, 6, 0.7);

    // Status text bubble — every ~14 sec, brief
    if (animFrame % 800 < 90 && moving) {
        ctx.font = "bold 3px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText("청소 중…", px, py - 6);
    }
}

function maybeSpawnAirplane(animFrame) {
    if (airplane.active) {
        airplane.progress += 0.014;
        if (airplane.progress >= 1.2) {
            airplane.active = false;
            airplane.progress = 0;
            airplane.nextSpawn = animFrame + 1800 + Math.floor(Math.random() * 2400);
        }
        return;
    }
    if (animFrame >= airplane.nextSpawn) {
        airplane.active = true;
        airplane.progress = 0;
        // Random diagonal: left-to-right or right-to-left, slightly downward
        const leftToRight = Math.random() < 0.5;
        if (leftToRight) {
            airplane.sx = -1;
            airplane.sy = 1 + Math.random() * 4;
            airplane.ex = COLS - 1;
            airplane.ey = airplane.sy + 4 + Math.random() * 4;
        } else {
            airplane.sx = COLS + 1;
            airplane.sy = 1 + Math.random() * 4;
            airplane.ex = 0;
            airplane.ey = airplane.sy + 4 + Math.random() * 4;
        }
    }
}

function drawAirplane(ctx, animFrame) {
    if (!airplane.active) return;
    const t = Math.max(0, Math.min(1, airplane.progress));
    // Gentle arc — slight rise then fall
    const arcLift = Math.sin(t * Math.PI) * 1.2;
    const tx = airplane.sx + (airplane.ex - airplane.sx) * t;
    const ty = airplane.sy + (airplane.ey - airplane.sy) * t - arcLift;
    const px = tx * TILE;
    const py = ty * TILE;
    const dirX = Math.sign(airplane.ex - airplane.sx) || 1;
    const wobble = Math.sin(animFrame * 0.22) * 0.6;

    // Shadow on the floor below
    const shadowY = (ROWS - 2) * TILE - 4;
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.beginPath();
    ctx.ellipse(px, shadowY, 3.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Airplane: three-tone paper triangle
    const cx = px;
    const cy = py + wobble;
    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.moveTo(cx + dirX * 5, cy);
    ctx.lineTo(cx - dirX * 4, cy - 2);
    ctx.lineTo(cx - dirX * 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#D2DAE8";
    ctx.beginPath();
    ctx.moveTo(cx + dirX * 5, cy);
    ctx.lineTo(cx - dirX * 4, cy + 2);
    ctx.lineTo(cx - dirX * 2, cy);
    ctx.closePath();
    ctx.fill();
    // Center fold
    ctx.fillStyle = "rgba(120,130,150,0.4)";
    ctx.fillRect(cx - dirX * 2, cy - 0.3, dirX * 7, 0.6);
}

// ── Sleeping cat in second lounge (mostly stationary, occasional purr) ──
function drawLoungeCat(ctx, animFrame) {
    // Lounge2 is at roughly tx=15.5, ty=8.5
    const px = 15.5 * TILE + 4;
    const py = 9 * TILE + 12;
    // Body
    ctx.fillStyle = "#3D2A20";
    ctx.fillRect(px, py, 10, 5);
    // Head
    ctx.fillRect(px, py - 3, 5, 4);
    // Ears
    ctx.fillStyle = "#241510";
    ctx.fillRect(px + 0.5, py - 5, 1.5, 2);
    ctx.fillRect(px + 3, py - 5, 1.5, 2);
    // Closed eye - little line (always closed, sleeping)
    ctx.fillStyle = "rgba(220,200,180,0.65)";
    ctx.fillRect(px + 0.6, py - 1.5, 1, 0.6);
    ctx.fillRect(px + 3, py - 1.5, 1, 0.6);
    // Tail wraps around — moves gently
    const tailX = Math.sin(animFrame * 0.018) * 0.6;
    ctx.fillStyle = "#3D2A20";
    ctx.fillRect(px + 10, py + 1, 3, 1.6);
    ctx.fillRect(px + 12 + tailX, py - 0.5, 1.6, 2);
    // Z (sleep) every few seconds
    if (animFrame % 200 < 60) {
        ctx.font = "bold 3px Pretendard, sans-serif";
        ctx.fillStyle = "rgba(170,170,200,0.65)";
        ctx.textAlign = "left";
        ctx.fillText("z", px + 5, py - 5 - (animFrame % 200) * 0.12);
    }
}

// ── Public render entry ──
export function drawNPCs(ctx, animFrame) {
    moveAlongPath(animFrame);
    maybeSpawnAirplane(animFrame);
    drawCleaningRobot(ctx, animFrame);
    drawLoungeCat(ctx, animFrame);
    drawAirplane(ctx, animFrame);
}

// Expose state for debugging / overlay diagnostics
export function npcState() {
    return {
        robotPos: ROBOT_PATH[robot.idx],
        robotPause: robot.pauseTimer,
        airplaneActive: airplane.active,
    };
}
