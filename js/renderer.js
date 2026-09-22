// ============================================================
//  AI TYCOON — Canvas Rendering (Office, Agents, Effects)
// ============================================================

import { S } from "./state.js";
import { drawCharacter } from "./characters.js";
import {
    TILE, COLS, ROWS, PAL,
    PLATFORM_META,
} from "./constants.js";
import { drawOfficeScene } from './officeScene.js';
import { drawNPCs } from "./npcs.js";
import { t } from "./i18n.js";
import { drawSeasonal } from "./seasons.js";


// ── Main Render ──
export function render() {
    // 백버퍼가 논리 크기 × dpr 이므로, 매 프레임 dpr 배율을 베이스 transform 으로
    // 깔아준다. 이렇게 하면 이후 모든 그리기 코드는 예전처럼 논리 좌표(canvasW/H)
    // 기준으로 작성돼도 자동으로 고해상도로 렌더된다. setTransform 은 절대 지정이라
    // 직전 프레임의 잔여 변환도 함께 리셋된다.
    const dpr = S.dpr || 1;
    S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.ctx.clearRect(0, 0, S.canvasW, S.canvasH);
    S.ctx.save();
    if (S.sceneClip) {
        const { x, y, w, h } = S.sceneClip;
        S.ctx.beginPath(); S.ctx.rect(x, y, w, h); S.ctx.clip();
    }
    S.ctx.translate(S.offsetX, S.offsetY);
    S.ctx.scale(S.scale, S.scale);
    drawOfficeScene(S.ctx, S.reducedMotion ? 0 : S.animFrame);
    drawSeasonal(S.ctx, (S.reducedMotion ? 0 : S.animFrame));
    drawNPCs(S.ctx, (S.reducedMotion ? 0 : S.animFrame));
    drawAgents();
    drawSubAgents();
    drawParticles();
    drawHeartParticles();
    drawEmptyState();
    S.ctx.restore();
    drawZoomIndicator();
}

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
    const t = S.reducedMotion ? 0 : v.animTick;
    const th = v.theme;
    const bob = v.moving ? Math.sin(t * 0.3) * 1.5 : 0;
    const sel = agent.pid === S.selectedPid;
    const status = agent.isRunning ? agent.status : "offline";
    const offline = !agent.isRunning;

    // Shadow (soft)
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath(); ctx.ellipse(x, y + 7, 10, 3, 0, 0, Math.PI * 2); ctx.fill();


    // Selection ring — warm pink
    if (sel) {
        ctx.strokeStyle = "rgba(185,45,73,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y + 7, 10, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    }

    if (offline) ctx.globalAlpha = 0.4;

    const by = y + Math.round(bob);

    drawCharacter(ctx, agent, v, x, by, t);
    ctx.globalAlpha = 1;
    if (agent.needsReview && !offline) {
        ctx.fillStyle = "#F05236"; ctx.fillRect(x + 10, by - 30, 9, 9);
        ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x + 14, by - 28, 1, 3); ctx.fillRect(x + 14, by - 24, 1, 1);
    }

    // Thinking dots (warm yellow)
    if (status === "thinking" && !v.moving) {
        const dp = Math.floor(t / 18) % 4;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < dp ? "rgba(217,119,6,0.7)" : "rgba(217,119,6,0.15)";
            ctx.fillRect(x + 7 + i * 3, by - 28 - Math.sin(t * 0.08 + i) * 1.5, 1.5, 1.5);
        }
    }

    // Chat indicator (when chatting with another agent)
    if (v.chatPartner && v.speechTimer > 0) {
        ctx.fillStyle = "rgba(249,168,212,0.6)";
        const heartY = by - 37 - Math.sin(t * 0.1) * 2;
        ctx.font = "4px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♥", x + 8, heartY);
    }

    // Memory bar
    if (sel && agent.memoryMB > 0) {
        const bw = 16;
        const pct = Math.min(1, agent.memoryMB / 1500);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(x - bw / 2, y + 17, bw, 2);
        ctx.fillStyle = pct > 0.7 ? "#ef4444" : pct > 0.4 ? "#eab308" : "#059669";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x - bw / 2, y + 17, bw * pct, 2);
        ctx.globalAlpha = 1;
    }

    // Typing / thinking dots when actively coding or thinking
    // (and not currently speaking)
    const showDots = agent.isRunning &&
        (status === "coding" || status === "thinking") &&
        !(v.speechTimer > 0 && v.speechText);
    if (showDots) {
        const tdy = by - 32;
        const isThinking = status === "thinking";
        const dots = 3;
        const pmetaTint = PLATFORM_META[agent.platform];
        const codingColor = pmetaTint?.color || "#059669";
        // Thinking dots: slower, amber tone, slightly larger
        const dotColor = isThinking ? "#d97706" : codingColor;
        const speed    = isThinking ? 0.09 : 0.18;
        const offset   = isThinking ? 0.75 : 0.55;
        const radius   = isThinking ? 1.15 : 0.95;
        const lift     = isThinking ? 1.1 : 1.6;
        for (let i = 0; i < dots; i++) {
            const phase = (t * speed) - i * offset;
            const bouncY = Math.max(0, Math.sin(phase) * lift);
            ctx.fillStyle = dotColor;
            ctx.globalAlpha = 0.35 + Math.max(0, Math.sin(phase)) * 0.55;
            ctx.beginPath();
            ctx.arc(x - 4 + i * 4, tdy - bouncY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Speech bubble (higher position, bigger, distinct from sub-agent bubbles)
    if (!document.body.classList.contains("privacy-mode") && v.speechTimer > 0 && v.speechText && (sel || (v.chatPartner && agent.pid === S.directorFocusPid))) {
        drawBubble(x, by - 40, v.speechText, v.speechTimer, v.chatPartner != null);
    }

    // Names stay readable; full project and work text belong in the detail panel.
    ctx.font = "bold 5px 'Wanted Sans Variable', sans-serif";
    const nameLabel = th.name;
    const lw = Math.min(52, ctx.measureText(nameLabel).width) + 10;
    ctx.fillStyle = PAL.labelBg;
    roundRect(ctx, x - lw / 2, y + 12, lw, 10, 2);
    ctx.fill();
    ctx.fillStyle = offline ? PAL.labelTextOff : PAL.labelText;
    ctx.textAlign = "center";
    ctx.fillText(nameLabel, x, y + 19, 52);
    ctx.restore();
}

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
        // pid 는 Object.entries() 에서 string 으로 나오는데 a.pid 는 보통 number/string 혼재.
        // strict 비교하면 사일런트로 undefined 반환 → 모든 sub-agent 렌더 스킵되던 잠재 버그.
        const agent = S.liveAgents.find(a => String(a.pid) === pid);
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
                ctx.font = "3px Wanted Sans Variable, sans-serif";
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
    ctx.font = "bold 5px 'Wanted Sans Variable', sans-serif";
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
    ctx.font = "bold 7px Wanted Sans Variable, sans-serif";
    ctx.fillStyle = PAL.emptyText;
    ctx.fillText(mainText, cx, cy - 4);

    // Sub text
    ctx.font = "4.5px Wanted Sans Variable, sans-serif";
    ctx.fillStyle = PAL.emptySub;
    ctx.fillText(subText, cx, cy + 4);

    // Platform hint row — show supported tools
    if (S.connected) {
        ctx.font = "bold 3.4px Wanted Sans Variable, sans-serif";
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
            ctx.font = "bold 3.4px Wanted Sans Variable, sans-serif";
            ctx.fillText(p.t, bx + 1, by + 1.3);
        });
    } else {
        ctx.fillStyle = "rgba(220,38,38,0.6)";
        ctx.font = "bold 4px Wanted Sans Variable, sans-serif";
        ctx.fillText(t("empty.serverWaiting"), cx, cy + 16);
        ctx.font = "3.5px Wanted Sans Variable, sans-serif";
        ctx.fillStyle = PAL.emptySub;
        ctx.fillText(t("empty.checkServer"), cx, cy + 24);
    }

    ctx.restore();
}

// ── Zoom UI indicator (drawn on canvas) ──
function drawZoomIndicator() {
    if (S.mapArea && S.mapArea !== 'all') return;
    const ctx = S.ctx;
    if (Math.abs(S.zoomLevel - 1.0) < 0.05) return; // don't show at 100%
    ctx.save();
    // Draw in screen space (not world space) — 단, dpr 배율은 유지해야
    // 고해상도에서 위치가 어긋나지 않고 글자도 선명하다.
    const dpr = S.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const text = `${Math.round(S.zoomLevel * 100)}%`;
    ctx.font = "bold 11px Wanted Sans Variable, sans-serif";
    ctx.textAlign = "left";
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(8, S.canvasH - 28, tw + 16, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, 16, S.canvasH - 14);
    // Reset button hint
    ctx.font = "9px Wanted Sans Variable, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("더블클릭: 리셋", 16, S.canvasH - 3);
    ctx.restore();
}
