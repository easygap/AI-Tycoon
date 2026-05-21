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
import { getSkyPalette } from "./timeOfDay.js";

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

// ── Office dog ───────────────────────────────────────────
// Wanders the lounge area between sofas and the aquarium, sits and
// wags occasionally, with rare little barks.
const DOG_WAYPOINTS = [
    { x: 16.5, y: 7.5 },   // near vending
    { x: 19, y: 7 },       // mid-lounge
    { x: 21, y: 4.5 },     // toward aquarium
    { x: 17, y: 4.5 },     // near sofa 1
    { x: 16, y: 9.5 },     // sofa 2 area
    { x: 19, y: 10.5 },    // near plant
    { x: 21, y: 14 },      // meeting room corner
    { x: 17.5, y: 14 },    // return through center
];
const dog = {
    idx: 0,
    progress: 0,
    speed: 0.003,
    facing: 1,         // 1 = right, -1 = left
    sitTimer: 0,
    barkTimer: 0,
    waggle: 0,
};

function updateDog() {
    if (dog.sitTimer > 0) {
        dog.sitTimer--;
        dog.waggle += 0.16;
        return;
    }
    const from = DOG_WAYPOINTS[dog.idx];
    const to = DOG_WAYPOINTS[(dog.idx + 1) % DOG_WAYPOINTS.length];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segLen = Math.hypot(dx, dy) || 1;
    dog.progress += dog.speed / segLen;
    if (Math.abs(dx) > 0.05) dog.facing = dx > 0 ? 1 : -1;
    if (dog.progress >= 1) {
        dog.progress = 0;
        dog.idx = (dog.idx + 1) % DOG_WAYPOINTS.length;
        // Occasional sit at waypoint
        if (Math.random() < 0.32) dog.sitTimer = 80 + Math.floor(Math.random() * 140);
    }
    dog.waggle += 0.12;
}

function drawDog(ctx, animFrame) {
    const from = DOG_WAYPOINTS[dog.idx];
    const to = DOG_WAYPOINTS[(dog.idx + 1) % DOG_WAYPOINTS.length];
    const t = dog.progress;
    const tx = from.x + (to.x - from.x) * t;
    const ty = from.y + (to.y - from.y) * t;
    const px = tx * TILE;
    const py = ty * TILE;
    const sitting = dog.sitTimer > 0;
    const dir = dog.facing;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(px, py + 5, 6, 1.6, 0, 0, Math.PI * 2); ctx.fill();

    // Bouncy stride when walking
    const bob = sitting ? 0 : Math.sin(animFrame * 0.25) * 0.5;

    // Body — short tan corgi-ish
    ctx.fillStyle = "#d6a868";
    ctx.fillRect(px - 4, py + 1 + bob, 8, 4);
    ctx.fillStyle = "#b48848";
    ctx.fillRect(px - 4, py + 4 + bob, 8, 1);

    // Head (slightly forward of body)
    ctx.fillStyle = "#e6b878";
    ctx.fillRect(px + dir * 2 - 2, py - 3 + bob, 4, 4);
    ctx.fillStyle = "#d6a868";
    ctx.fillRect(px + dir * 2 - 2, py - 1 + bob, 4, 1);

    // Ears
    ctx.fillStyle = "#9c6f3a";
    ctx.fillRect(px + dir * 2 - 2, py - 4 + bob, 1.4, 2);
    ctx.fillRect(px + dir * 2 + 0.6, py - 4 + bob, 1.4, 2);

    // Eye
    ctx.fillStyle = "#2a1a10";
    ctx.fillRect(px + dir * 3, py - 2 + bob, 0.8, 0.8);

    // Snout
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(px + dir * 4, py - 0.5 + bob, 0.6, 0.6);

    // Legs (4 short stubs)
    ctx.fillStyle = "#9c6f3a";
    if (sitting) {
        // Front legs flat, back legs tucked
        ctx.fillRect(px - 3, py + 5, 2, 2);
        ctx.fillRect(px + 1, py + 5, 2, 2);
    } else {
        const step = Math.sin(animFrame * 0.5) > 0 ? 0.5 : -0.5;
        ctx.fillRect(px - 3 + step, py + 5, 1.5, 2);
        ctx.fillRect(px - 1 - step, py + 5, 1.5, 2);
        ctx.fillRect(px + 1 + step, py + 5, 1.5, 2);
        ctx.fillRect(px + 3 - step, py + 5, 1.5, 2);
    }

    // Tail — wags faster when sitting (happy)
    const wagAmp = sitting ? 3 : 1.5;
    const wagSpeed = sitting ? 0.5 : 0.25;
    const tailX = px - dir * 4;
    const tailY = py + 1 + bob;
    const wag = Math.sin(animFrame * wagSpeed + dog.waggle) * wagAmp;
    ctx.fillStyle = "#d6a868";
    ctx.fillRect(tailX - dir, tailY, dir * -2, 1.4);
    ctx.fillRect(tailX - dir * 2.5, tailY + wag, dir * -1.5, 1.4);

    // Occasional bark (small text bubble)
    dog.barkTimer = (dog.barkTimer + 1) % 600;
    if (dog.barkTimer < 40 && Math.random() < 0.04) {
        // do nothing — handled below by a stable check
    }
    if (animFrame % 540 < 40 && sitting) {
        ctx.font = "bold 3px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        const bx = px, by = py - 7;
        ctx.fillStyle = "rgba(40,30,20,0.85)";
        ctx.fillRect(bx - 6, by - 4, 12, 6);
        ctx.fillStyle = "#fff";
        ctx.fillText("멍!", bx, by + 0.8);
    }
}

// ── Night security guard ─────────────────────────────────
// Patrols a perimeter route, with a torch beam, only at night.
const GUARD_PATH = [
    { x: 2, y: 15.5 },
    { x: 11, y: 15.5 },
    { x: 11, y: 11 },
    { x: 2, y: 11 },
    { x: 2, y: 5 },
    { x: 11, y: 5 },
    { x: 11, y: 1.5 },
    { x: 15, y: 1.5 },
    { x: 21, y: 1.5 },
    { x: 21, y: 15.5 },
    { x: 15, y: 15.5 },
    { x: 13.5, y: 16.5 },   // pass through entrance
];
const guard = {
    idx: 0,
    progress: 0,
    speed: 0.0018,
    facingRight: true,
};
function guardActive() {
    const sky = getSkyPalette();
    return sky.hour >= 21 || sky.hour < 6;
}
function updateGuard() {
    if (!guardActive()) return;
    const from = GUARD_PATH[guard.idx];
    const to = GUARD_PATH[(guard.idx + 1) % GUARD_PATH.length];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segLen = Math.hypot(dx, dy) || 1;
    guard.progress += guard.speed / segLen;
    if (Math.abs(dx) > 0.001) guard.facingRight = dx > 0;
    if (guard.progress >= 1) {
        guard.progress = 0;
        guard.idx = (guard.idx + 1) % GUARD_PATH.length;
    }
}
function drawGuard(ctx, animFrame) {
    if (!guardActive()) return;
    const from = GUARD_PATH[guard.idx];
    const to = GUARD_PATH[(guard.idx + 1) % GUARD_PATH.length];
    const t = guard.progress;
    const tx = from.x + (to.x - from.x) * t;
    const ty = from.y + (to.y - from.y) * t;
    const px = tx * TILE;
    const py = ty * TILE;
    const bob = Math.sin(animFrame * 0.18) * 0.5;
    const dir = guard.facingRight ? 1 : -1;

    // Torch beam — soft warm cone in front of guard
    const beamLen = 36;
    const beamStartX = px + dir * 4;
    const beamY = py - 2 + bob;
    const grad = ctx.createRadialGradient(beamStartX, beamY, 0, beamStartX + dir * beamLen * 0.5, beamY, beamLen);
    grad.addColorStop(0, "rgba(255,235,170,0.45)");
    grad.addColorStop(1, "rgba(255,235,170,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(beamStartX, beamY);
    ctx.lineTo(beamStartX + dir * beamLen, beamY - beamLen * 0.4);
    ctx.lineTo(beamStartX + dir * beamLen, beamY + beamLen * 0.4);
    ctx.closePath();
    ctx.fill();

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(px, py + 8, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();

    // Body — navy uniform
    ctx.fillStyle = "#1a2540"; // pants
    ctx.fillRect(px - 3.5, py + bob, 7, 7);
    ctx.fillStyle = "#23355a"; // shirt
    ctx.fillRect(px - 3.5, py - 5 + bob, 7, 6);
    // Badge
    ctx.fillStyle = "#facc15";
    ctx.fillRect(px - 1.5, py - 3 + bob, 1.5, 1.5);
    // Belt
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(px - 3.5, py + bob - 0.5, 7, 1);
    // Head
    ctx.fillStyle = "#E8C0A0"; // skin
    ctx.fillRect(px - 2.5, py - 11 + bob, 5, 5);
    // Cap
    ctx.fillStyle = "#0d1530";
    ctx.fillRect(px - 3, py - 12 + bob, 6, 2);
    ctx.fillRect(px + (dir > 0 ? 2 : -4), py - 11 + bob, 2, 1);
    // Cap badge
    ctx.fillStyle = "#facc15";
    ctx.fillRect(px - 0.5, py - 11.5 + bob, 1, 1);
    // Eyes — small dot
    ctx.fillStyle = "#1a1a2e";
    if (dir > 0) ctx.fillRect(px + 0.5, py - 9 + bob, 1, 1);
    else ctx.fillRect(px - 1.5, py - 9 + bob, 1, 1);

    // Flashlight (extended arm forward)
    ctx.fillStyle = "#3a3a48";
    ctx.fillRect(px + dir * 2, py - 3 + bob, 3, 2);
    ctx.fillStyle = "#ffeaa3";
    ctx.fillRect(px + dir * 4.5, py - 3 + bob, 1.2, 2);

    // "야간 순찰" speech every once in a while
    if (animFrame % 1400 < 80) {
        ctx.font = "bold 3px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(20,20,28,0.85)";
        ctx.fillRect(px - 14, py - 17 + bob, 28, 6);
        ctx.fillStyle = "#facc15";
        ctx.fillText("야간 순찰 중", px, py - 13 + bob);
    }
    void getSkyPalette;
}

// ── Delivery person ───────────────────────────────────────
// Visits a random work-area corridor spot, drops a package, leaves.
// Phases: idle → entering → dropping (pause) → leaving → idle
const delivery = {
    phase: "idle",
    phaseT: 0,
    targetTx: 0,
    targetTy: 0,
    nextSpawn: 600,    // frames until first appearance
    facingRight: true,
};
const DELIVERY_DROP_FRAMES = 90;

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
        // floor 안 하면 decrement 가 fractional 값 통과해서 정확히 0 안 나옴 → 영원히 멈춤 상태로 갇힘
        if (Math.random() < 0.18) robot.pauseTimer = Math.floor(60 + Math.random() * 120);
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
    const moving = robot.pauseTimer <= 0;

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

// ── Delivery person rendering ──
function deliveryCurrentPos() {
    // Entrance is at row 16, between cols 12-13.
    const entranceX = 12.5;
    const entranceY = 16.5;
    if (delivery.phase === "entering") {
        // Walk from entrance up to target tile
        const t = Math.max(0, Math.min(1, delivery.phaseT / 200));
        const ease = 1 - Math.pow(1 - t, 2);
        const tx = entranceX + (delivery.targetTx - entranceX) * ease;
        const ty = entranceY + (delivery.targetTy - entranceY) * ease;
        return { tx, ty, moving: t < 1 };
    }
    if (delivery.phase === "dropping") {
        return { tx: delivery.targetTx, ty: delivery.targetTy, moving: false };
    }
    if (delivery.phase === "leaving") {
        const t = Math.max(0, Math.min(1, delivery.phaseT / 200));
        const ease = t * t;
        const tx = delivery.targetTx + (entranceX - delivery.targetTx) * ease;
        const ty = delivery.targetTy + (entranceY - delivery.targetTy) * ease;
        return { tx, ty, moving: t < 1, exiting: true };
    }
    return null;
}

function updateDelivery(animFrame) {
    if (delivery.phase === "idle") {
        if (animFrame >= delivery.nextSpawn) {
            // Pick a random corridor tile in work area (col 1-11, even rows)
            delivery.targetTx = 1 + Math.floor(Math.random() * 10);
            const corridorRows = [2, 5, 8, 11, 14];
            delivery.targetTy = corridorRows[Math.floor(Math.random() * corridorRows.length)];
            delivery.phase = "entering";
            delivery.phaseT = 0;
            delivery.facingRight = delivery.targetTx > 12.5 ? false : true;
        }
        return;
    }
    delivery.phaseT++;
    if (delivery.phase === "entering" && delivery.phaseT >= 200) {
        delivery.phase = "dropping";
        delivery.phaseT = 0;
    } else if (delivery.phase === "dropping" && delivery.phaseT >= DELIVERY_DROP_FRAMES) {
        delivery.phase = "leaving";
        delivery.phaseT = 0;
        delivery.facingRight = !delivery.facingRight;
    } else if (delivery.phase === "leaving" && delivery.phaseT >= 200) {
        delivery.phase = "idle";
        delivery.phaseT = 0;
        delivery.nextSpawn = animFrame + 2400 + Math.floor(Math.random() * 3000); // 40-90 sec
    }
}

function drawDelivery(ctx, animFrame) {
    if (delivery.phase === "idle") return;
    const pos = deliveryCurrentPos();
    if (!pos) return;
    const px = pos.tx * TILE;
    const py = pos.ty * TILE;
    const bob = pos.moving ? Math.sin(animFrame * 0.4) * 0.6 : 0;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(px, py + 9, 6, 1.8, 0, 0, Math.PI * 2); ctx.fill();

    // Body — courier uniform (navy with orange vest)
    const skinColor = "#F0D0B8";
    ctx.fillStyle = "#2a4a78"; // pants
    ctx.fillRect(px - 4, py + bob, 8, 6);
    ctx.fillStyle = "#ff8a4c"; // hi-vis vest
    ctx.fillRect(px - 4, py - 5 + bob, 8, 6);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; // reflective stripe
    ctx.fillRect(px - 4, py - 3 + bob, 8, 0.8);
    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(px - 2.5, py - 11 + bob, 5, 5);
    // Cap
    ctx.fillStyle = "#1a2a48";
    ctx.fillRect(px - 3, py - 12 + bob, 6, 2);
    ctx.fillRect(px + (delivery.facingRight ? 2 : -4), py - 11 + bob, 2, 1);
    // Eyes (single line, 8-bit)
    ctx.fillStyle = "#1a1a2e";
    if (delivery.facingRight) {
        ctx.fillRect(px + 0.5, py - 9 + bob, 1, 1);
    } else {
        ctx.fillRect(px - 1.5, py - 9 + bob, 1, 1);
    }

    // Package being carried (during entering only) or dropped (during dropping)
    if (delivery.phase === "entering" || delivery.phase === "dropping") {
        const dropping = delivery.phase === "dropping";
        const phaseProgress = dropping ? (delivery.phaseT / DELIVERY_DROP_FRAMES) : 0;
        const boxY = dropping ? py + 4 + phaseProgress * 4 : py + 1 + bob;
        const boxX = dropping ? px - 4 : px + (delivery.facingRight ? 3 : -7);
        ctx.fillStyle = "#c8a878";
        ctx.fillRect(boxX, boxY, 6, 5);
        ctx.fillStyle = "#8a6848";
        ctx.fillRect(boxX, boxY, 6, 0.6);
        ctx.fillRect(boxX + 2.5, boxY, 1, 5);
        // Sparkle when dropping
        if (dropping && phaseProgress > 0.7 && animFrame % 8 < 4) {
            ctx.fillStyle = "rgba(255,210,140,0.7)";
            ctx.fillRect(boxX - 1, boxY - 1, 1, 1);
            ctx.fillRect(boxX + 6, boxY - 1, 1, 1);
            ctx.fillRect(boxX + 2, boxY - 2, 1, 1);
        }
    } else if (delivery.phase === "leaving") {
        // Box stays at target after delivery, slightly above the desk floor
        ctx.fillStyle = "#c8a878";
        const stayX = delivery.targetTx * TILE - 3;
        const stayY = delivery.targetTy * TILE + 6;
        ctx.fillRect(stayX, stayY, 6, 5);
        ctx.fillStyle = "#8a6848";
        ctx.fillRect(stayX, stayY, 6, 0.6);
        ctx.fillRect(stayX + 2.5, stayY, 1, 5);
    }

    // Speech bubble when dropping
    if (delivery.phase === "dropping" && delivery.phaseT < 50) {
        ctx.font = "bold 3.5px Pretendard, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        const bx = px, by = py - 17 + bob;
        ctx.fillStyle = "rgba(40,30,20,0.85)";
        ctx.fillRect(bx - 12, by - 4, 24, 7);
        ctx.fillStyle = "#fff";
        ctx.fillText("배송 도착!", bx, by + 0.8);
    }
}

// ── Public render entry ──
export function drawNPCs(ctx, animFrame) {
    moveAlongPath(animFrame);
    maybeSpawnAirplane(animFrame);
    updateDelivery(animFrame);
    updateGuard();
    updateDog();
    drawCleaningRobot(ctx, animFrame);
    drawLoungeCat(ctx, animFrame);
    drawDog(ctx, animFrame);
    drawDelivery(ctx, animFrame);
    drawGuard(ctx, animFrame);
    drawAirplane(ctx, animFrame);
}

// Expose state for debugging / overlay diagnostics
export function npcState() {
    return {
        robotPos: ROBOT_PATH[robot.idx],
        robotPause: robot.pauseTimer,
        airplaneActive: airplane.active,
        deliveryPhase: delivery.phase,
    };
}

// Force-trigger the delivery NPC for testing / demos
export function triggerDelivery() {
    delivery.phase = "idle";
    delivery.phaseT = 0;
    delivery.nextSpawn = 0;
}
if (typeof window !== "undefined") window.triggerDelivery = triggerDelivery;
