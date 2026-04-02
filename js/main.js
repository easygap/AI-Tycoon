// ============================================================
//  AI TYCOON — Entry Point (init, loop, input, visual AI)
// ============================================================

import { S, addLog, getWorkText, spawnParticles, spawnHearts, bossQueueEntry, bossQueueAdd, bossQueueRemove, bossQueueResolve } from "./state.js";
import {
    TILE, COLS, ROWS,
    ZOOM_MIN, ZOOM_MAX, ZOOM_STEP,
    AGENT_THEMES, SPEECH, MOVE_SPEECH, ROLE_META, ROLE_CHAT,
    CHAT_TEMPLATES, POI, REPORT_SPEECH,
    BOSS_ACTIVE_SPOT, BOSS_WAIT_SPOTS, BOSS_WAIT_SPEECH,
    BOSS_YES_REACTIONS, BOSS_NO_REACTIONS,
    updatePalette,
} from "./constants.js";
import { connectWS, setConn } from "./ws.js";
import { render } from "./renderer.js";
import { updatePanel, updateDetailPanel, updateBossQueueUI, onMouseMove } from "./panel.js";

// ── Init ──
function init() {
    S.canvas = document.getElementById("office-canvas");
    S.ctx = S.canvas.getContext("2d");
    S.ctx.imageSmoothingEnabled = false;

    window.addEventListener("resize", () => {
        if (S.resizeTimer) clearTimeout(S.resizeTimer);
        S.resizeTimer = setTimeout(resize, 150);
    });
    S.canvas.addEventListener("mousemove", onMouseMove);
    S.canvas.addEventListener("click", onCanvasClick);
    // Touch support (tap + one-finger pan + two-finger pinch zoom)
    S.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    S.canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    S.canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    S.canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
    // Zoom
    S.canvas.addEventListener("wheel", onWheel, { passive: false });
    // Pan (middle-click or right-drag)
    S.canvas.addEventListener("mousedown", onPanStart);
    S.canvas.addEventListener("mousemove", onPanMove);
    S.canvas.addEventListener("mouseup", onPanEnd);
    S.canvas.addEventListener("mouseleave", onPanEnd);
    S.canvas.addEventListener("contextmenu", e => e.preventDefault());
    S.canvas.addEventListener("dblclick", () => { S.zoomLevel = 1.0; S.panX = 0; S.panY = 0; resize(); });

    // Expose closeDetail state bridge for index.html
    window.__clearDetailPid = () => { S.detailPid = null; S.selectedPid = null; };

    // Expose filter/sort for index.html onclick handlers
    // Boss review queue actions
    window.bossReviewAction = (pid, result) => {
        const entry = bossQueueEntry(pid);
        if (!entry) return;

        if (entry.phase === "waitingAtBossArea" || entry.phase === "queuedForBoss" || entry.phase === "walkingToBoss") {
            // Out-of-order — demote current active (any phase) back to waiting
            if (S.bossActivePid && S.bossActivePid !== pid) {
                const curActive = bossQueueEntry(S.bossActivePid);
                if (curActive && (curActive.phase === "activeReview" || curActive.phase === "walkingToBoss")) {
                    delete curActive._pendingResult; // clear any pending result on demoted agent
                    curActive.phase = "waitingAtBossArea";
                    const cv = S.visualAgents[S.bossActivePid];
                    if (cv) walkTo(cv, BOSS_WAIT_SPOTS[0].x, BOSS_WAIT_SPOTS[0].y);
                }
            }
            S.bossActivePid = pid;
            entry.phase = "walkingToBoss";
            entry._pendingResult = result;  // applied on arrival at active spot
            const v = S.visualAgents[pid];
            if (v) walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
        } else if (entry.phase === "activeReview") {
            bossQueueResolve(pid, result);
        }
        updateBossQueueUI();
    };

    window.setFilter = (f) => { S.activeFilter = f; localStorage.setItem("ai-tycoon-filter", f); updatePanel(); };
    window.setPlatformFilter = (f) => { S.activePlatformFilter = f; localStorage.setItem("ai-tycoon-platform", f); updatePanel(); };
    window.setSortOrder = (s) => { S.sortOrder = s; localStorage.setItem("ai-tycoon-sort", s); updatePanel(); };

    // Restore saved sort order in dropdown
    const sortEl = document.getElementById("sort-select");
    if (sortEl) sortEl.value = S.sortOrder;

    // Delay first resize to let layout settle
    requestAnimationFrame(() => { resize(); connectWS(); loop(); });
}

function resize() {
    const main = document.getElementById("main-content");
    const side = document.getElementById("side-panel");
    // On mobile (<480px) the panel is an overlay, don't subtract its width
    const isMobileOverlay = window.innerWidth <= 480;
    S.canvasW = isMobileOverlay ? main.clientWidth : main.clientWidth - side.offsetWidth;
    S.canvasH = main.clientHeight;
    S.canvas.width = S.canvasW;
    S.canvas.height = S.canvasH;
    S.ctx.imageSmoothingEnabled = false;

    const sx = S.canvasW / (COLS * TILE);
    const sy = S.canvasH / (ROWS * TILE);
    const baseScale = Math.min(sx, sy);
    S.scale = baseScale * S.zoomLevel;
    S.offsetX = (S.canvasW - COLS * TILE * S.scale) / 2 + S.panX;
    S.offsetY = (S.canvasH - ROWS * TILE * S.scale) / 2 + S.panY;
}

// ── Game Loop ──
function loop() {
    S.animFrame++;
    if (S.animFrame % 30 === 0) updatePalette(); // check dark mode every ~0.5s
    // Heartbeat stale detection: if no message in 15s, mark disconnected
    if (S.connected && Date.now() - S.lastHeartbeat > 15000) {
        S.connected = false;
        setConn(false);
        addLog("서버 응답 없음 — 재연결 대기", "system");
    }
    updateVisuals();
    updateParticles();
    render();
    requestAnimationFrame(loop);
}

// ── Visual agent AI ──
function updateVisuals() {
    S.liveAgents.forEach(agent => {
        const v = S.visualAgents[agent.pid];
        if (!v) return;
        v.animTick++;
        const status = agent.isRunning ? agent.status : "offline";

        // Movement
        if (v.moving && v.walkPath.length > 0) {
            const tgt = v.walkPath[v.walkIndex];
            if (tgt) {
                const dx = tgt.x - v.x, dy = tgt.y - v.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 2) {
                    v.x = tgt.x; v.y = tgt.y;
                    v.walkIndex++;
                    if (v.walkIndex >= v.walkPath.length) {
                        v.moving = false; v.walkPath = []; v.walkIndex = 0;
                    }
                } else {
                    const speed = (status === "idle" || status === "offline") ? 0.8 : 1.5;
                    v.x += (dx / dist) * speed;
                    v.y += (dy / dist) * speed;
                    v.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
                }
            }
        }

        if (v.speechTimer > 0) v.speechTimer--;
        // Clear chatPartner when speech ends
        if (v.chatPartner && v.speechTimer <= 0) v.chatPartner = null;

        // React to status change
        if (status !== v.prevStatus) {
            v.prevStatus = status;
            const lines = SPEECH[status] || SPEECH.idle;
            v.speechText = lines[Math.floor(Math.random() * lines.length)];
            v.speechTimer = 120;
        }

        // Status-aware behavior with contextual speech
        // FIX 2: Skip normal behavior AI when agent is in boss queue
        const inBossQueue = !!bossQueueEntry(agent.pid);
        v.behaviorTimer--;
        if (v.behaviorTimer <= 0 && !inBossQueue) {
            v.behaviorTimer = 180 + Math.floor(Math.random() * 300);
            const r = Math.random();

            if (!agent.isRunning) {
                // Offline: 휴게실에서만 활동
                if (r < 0.25) { goTo(v, "lounge"); }
                else if (r < 0.45) { goTo(v, "coffee"); }
                else if (r < 0.60) { goTo(v, "aquarium"); }
                else if (r < 0.75) { goTo(v, "lounge2"); }
                else { goTo(v, "vending"); }

            } else if (status === "coding") {
                if (r < 0.55) {
                    goTo(v, "desk");
                    // Show current work (from latest prompt) or task as speech
                    const workText = getWorkText(agent);
                    if (workText) {
                        v.speechText = workText;
                        v.speechTimer = 100;
                    }
                } else if (r < 0.70) { goTo(v, "server"); }
                else if (r < 0.85) { goTo(v, "whiteboard"); }
                else { goTo(v, "coffee"); }

            } else if (status === "thinking") {
                if (r < 0.30) { goTo(v, "whiteboard"); }
                else if (r < 0.50) { goTo(v, "bookshelf"); }
                else if (r < 0.70) {
                    // Pace near own desk
                    walkTo(v, v.homeX + (Math.random() - 0.5) * TILE * 2, v.homeY + (Math.random() - 0.5) * TILE);
                    say(v, SPEECH.thinking);
                } else { goTo(v, "desk"); }

            } else if (status === "searching") {
                if (r < 0.35) { goTo(v, "bookshelf"); }
                else if (r < 0.65) { goTo(v, "server"); }
                else if (r < 0.80) { goTo(v, "whiteboard"); }
                else { goTo(v, "desk"); }

            } else if (status === "reviewing") {
                const other = S.liveAgents.find(a => a.pid !== agent.pid && a.isRunning);
                if (other && r < 0.45) {
                    const ov = S.visualAgents[other.pid];
                    if (ov) {
                        walkTo(v, ov.homeX + 12, ov.homeY);
                        const lines = MOVE_SPEECH.peerDesk;
                        v.speechText = lines[Math.floor(Math.random() * lines.length)]
                            .replace("{peer}", ov.theme.name);
                        v.speechTimer = 90;
                    }
                } else if (r < 0.75) { goTo(v, "meeting"); }
                else { goTo(v, "desk"); }

            } else if (status === "meeting") {
                goTo(v, "meeting");

            } else if (status === "coffee") {
                if (r < 0.65) goTo(v, "coffee");
                else goTo(v, "vending");

            } else {
                // idle: 휴게실에서 여유롭게 쉬기
                v.behaviorTimer = 300 + Math.floor(Math.random() * 500); // slower pace
                if (r < 0.30) { goTo(v, "lounge"); }
                else if (r < 0.50) { goTo(v, "coffee"); }
                else if (r < 0.65) { goTo(v, "aquarium"); }
                else if (r < 0.75) { goTo(v, "vending"); }
                else if (r < 0.85) { goTo(v, "lounge2"); }
                else { goTo(v, "desk"); say(v, SPEECH.idle); }
            }
        }

        // ── Boss review queue state machine ──
        const qe = bossQueueEntry(agent.pid);

        // FIX 1: Enqueue only if not already queued AND not on cooldown from recent resolve
        if (agent.needsReview && !qe && !v._reviewCooldown && v.speechTimer <= 0 && !v.moving) {
            bossQueueAdd(agent.pid);
            addLog(`${v.theme.name}(${ROLE_META[agent.role]?.label || "개발자"}) 보고 대기열에 합류`, "system");
        }
        // When needsReview clears, also clear cooldown so future reviews work
        if (!agent.needsReview) v._reviewCooldown = false;

        // Remove from queue if needsReview cleared externally
        if (!agent.needsReview && qe && qe.phase !== "reviewResolved" && qe.phase !== "returningToWork") {
            bossQueueRemove(agent.pid);
        }

        if (qe) {
            const qIdx = S.bossQueue.indexOf(qe);

            switch (qe.phase) {
            case "queuedForBoss":
                // Decide target: active spot if no one there, else waiting spot
                if (!S.bossActivePid) {
                    qe.phase = "walkingToBoss";
                    S.bossActivePid = agent.pid;
                    walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
                } else {
                    // FIX 3: Calculate waiting spot index among waiters (excluding active/resolved/returning)
                    const waiters = S.bossQueue.filter(e =>
                        e.phase === "waitingAtBossArea" || e.phase === "queuedForBoss"
                    );
                    const myIdx = waiters.indexOf(qe);
                    const spotIdx = Math.min(Math.max(0, myIdx), BOSS_WAIT_SPOTS.length - 1);
                    if (!v.moving) walkTo(v, BOSS_WAIT_SPOTS[spotIdx].x, BOSS_WAIT_SPOTS[spotIdx].y);
                    qe.phase = "waitingAtBossArea";
                }
                break;

            case "walkingToBoss":
                if (!v.moving) {
                    // FIX 4: If user already clicked yes/no while walking, resolve immediately on arrival
                    if (qe._pendingResult) {
                        const pendingResult = qe._pendingResult;
                        delete qe._pendingResult;
                        qe.phase = "activeReview";
                        bossQueueResolve(agent.pid, pendingResult);
                    } else {
                        qe.phase = "activeReview";
                        v.speechText = REPORT_SPEECH[Math.floor(Math.random() * REPORT_SPEECH.length)];
                        v.speechTimer = 150;
                    }
                    updateBossQueueUI();
                }
                break;

            case "waitingAtBossArea":
                // Periodic waiting animation
                qe.waitTick++;
                if (qe.waitTick % 120 === 0 && v.speechTimer <= 0) {
                    v.speechText = BOSS_WAIT_SPEECH[Math.floor(Math.random() * BOSS_WAIT_SPEECH.length)];
                    v.speechTimer = 80;
                }
                // Promote to active if boss spot is free
                if (!S.bossActivePid) {
                    qe.phase = "walkingToBoss";
                    S.bossActivePid = agent.pid;
                    walkTo(v, BOSS_ACTIVE_SPOT.x, BOSS_ACTIVE_SPOT.y);
                } else {
                    // Reposition to correct waiting spot (handles out-of-order)
                    const myWaitIdx = S.bossQueue.filter(e =>
                        e.phase === "waitingAtBossArea" || e.phase === "queuedForBoss"
                    ).indexOf(qe);
                    const targetSpot = BOSS_WAIT_SPOTS[Math.min(myWaitIdx, BOSS_WAIT_SPOTS.length - 1)];
                    if (targetSpot && !v.moving && Math.hypot(v.x - targetSpot.x, v.y - targetSpot.y) > 8) {
                        walkTo(v, targetSpot.x, targetSpot.y);
                    }
                }
                break;

            case "activeReview":
                // Stay put — waiting for user's yes/no via UI
                // Periodic fidget while waiting
                qe.waitTick++;
                if (qe.waitTick % 180 === 0 && v.speechTimer <= 0) {
                    const fidgets = ["...", "확인 부탁드려요", "(기다리는 중)", "여기 있겠습니다"];
                    v.speechText = fidgets[Math.floor(Math.random() * fidgets.length)];
                    v.speechTimer = 60;
                }
                break;

            case "reviewResolved":
                // Show reaction and start returning
                if (qe.result === "yes") {
                    v.speechText = BOSS_YES_REACTIONS[Math.floor(Math.random() * BOSS_YES_REACTIONS.length)];
                    spawnHearts(v.x, v.y - 16, 3);
                } else {
                    v.speechText = BOSS_NO_REACTIONS[Math.floor(Math.random() * BOSS_NO_REACTIONS.length)];
                }
                v.speechTimer = 100;
                qe.phase = "returningToWork";
                goTo(v, "desk");
                addLog(`${v.theme.name}: ${v.speechText}`, "system");
                updateBossQueueUI();
                break;

            case "returningToWork":
                if (!v.moving && v.speechTimer <= 0) {
                    // FIX 1: Set cooldown to prevent re-enqueue while needsReview still true
                    v._reviewCooldown = true;
                    bossQueueRemove(agent.pid);
                    updateBossQueueUI();
                }
                break;
            }
        }

        // Periodic context-aware solo speech (only if actually working and NOT in boss queue)
        if (v.animTick % 280 === 0 && agent.isRunning && status !== "idle" && !inBossQueue && v.speechTimer <= 0 && Math.random() < 0.35) {
            const workText = getWorkText(agent);
            if (workText && Math.random() < 0.5) {
                v.speechText = workText;
            } else {
                say(v, SPEECH[status] || SPEECH.idle);
            }
            v.speechTimer = 80;
        }
    });

    // Update sub-agents (gentle bobbing only)
    Object.values(S.visualSubAgents).forEach(sub => {
        sub.animTick++;
        if (sub.speechTimer > 0) sub.speechTimer--;
    });

    // Agent-to-agent chat system (more frequent when agents are idle in breakroom)
    S.chatTimer--;
    if (S.chatTimer <= 0 && S.liveAgents.length >= 2) {
        const idleCount = S.liveAgents.filter(a => a.status === "idle" || !a.isRunning).length;
        const interval = idleCount >= 2 ? 150 + Math.floor(Math.random() * 200) : 300 + Math.floor(Math.random() * 300);
        S.chatTimer = interval;
        triggerAgentChat();
    }
}

// ── Agent Chat System (status-pair aware) ──
function triggerAgentChat() {
    const available = S.liveAgents.filter(a => {
        const v = S.visualAgents[a.pid];
        return v && v.speechTimer <= 0 && a.isRunning && a.status !== "idle";
    });
    // Allow casual chat with idle agents only if no working pair exists
    let chatPool = available;
    if (chatPool.length < 2) {
        chatPool = S.liveAgents.filter(a => {
            const v = S.visualAgents[a.pid];
            return v && v.speechTimer <= 0 && a.isRunning;
        });
    }
    if (chatPool.length < 2) return;

    const i1 = Math.floor(Math.random() * chatPool.length);
    let i2 = Math.floor(Math.random() * (chatPool.length - 1));
    if (i2 >= i1) i2++;

    const a1 = chatPool[i1], a2 = chatPool[i2];
    const v1 = S.visualAgents[a1.pid], v2 = S.visualAgents[a2.pid];
    const t1 = v1.theme, t2 = v2.theme;
    const s1 = a1.status, s2 = a2.status;

    // Context
    const proj1 = a1.projectName || "프로젝트";
    const proj2 = a2.projectName || "프로젝트";
    const task1 = (getWorkText(a1) || a1.currentTask?.subject || "").substring(0, 15) || "작업";
    const task2 = (getWorkText(a2) || a2.currentTask?.subject || "").substring(0, 15) || "작업";

    // Pick template set based on role combination first, then status
    const r1 = a1.role || "developer", r2 = a2.role || "developer";
    const working1 = ["coding","thinking","searching","reviewing"].includes(s1);
    const working2 = ["coding","thinking","searching","reviewing"].includes(s2);
    let tpl;

    // 30% chance: role-based cross-check dialogue
    if (working1 && working2 && Math.random() < 0.3) {
        if (r1 === "developer" && r2 === "qa") tpl = ROLE_CHAT.devToQa;
        else if (r1 === "qa" && r2 === "developer") tpl = ROLE_CHAT.qaToDev;
        else if (r1 === "planner" && r2 !== "planner") tpl = ROLE_CHAT.planToDev;
        else if (r1 === "designer" && r2 === "developer") tpl = ROLE_CHAT.designToDev;
        else if (r1 === "developer" && r2 === "reviewer") tpl = ROLE_CHAT.devToReview;
        else if (r1 === "reviewer" && r2 === "developer") tpl = ROLE_CHAT.reviewToDev;
    }

    // Fallback: status-based template
    if (!tpl) {
    if (!working1 && !working2) {
        // 둘 다 쉬는 중 → 휴게실 사담
        tpl = CHAT_TEMPLATES.breakroom;
    } else if (working1 && working2) {
        // 둘 다 일하는 중 → 업무 대화
        if (s1 === "coding" && s2 === "coding") tpl = CHAT_TEMPLATES.bothCoding;
        else if (s1 === "coding" && s2 === "thinking") tpl = CHAT_TEMPLATES.codingThinking;
        else if (s1 === "thinking" && s2 === "coding") tpl = CHAT_TEMPLATES.thinkingCoding;
        else if (s1 === "searching") tpl = CHAT_TEMPLATES.searching;
        else if (s1 === "reviewing" || s2 === "reviewing") tpl = CHAT_TEMPLATES.reviewing;
        else tpl = CHAT_TEMPLATES.bothCoding;
        // 20% 확률로 가벼운 잡담
        if (Math.random() < 0.2) tpl = CHAT_TEMPLATES.casual;
    } else if (s1 === "meeting" || s2 === "meeting") {
        tpl = CHAT_TEMPLATES.meeting;
    } else {
        // 한쪽만 일하는 중 → 가벼운 잡담
        tpl = CHAT_TEMPLATES.casual;
    }
    } // close if (!tpl)

    const pair = tpl[Math.floor(Math.random() * tpl.length)];

    // Fill context
    function fill(s) {
        return s.replace(/\{proj\}/g, proj1).replace(/\{proj2\}/g, proj2)
                .replace(/\{task\}/g, task1).replace(/\{task2\}/g, task2)
                .replace(/\{peer\}/g, t2.name);
    }
    const line1 = fill(pair[0]);
    const line2 = fill(pair[1]);

    v1.speechText = line1.substring(0, 24);
    v1.speechTimer = 160;
    v1.chatPartner = a2.pid;

    // Capture references at call time; re-lookup in callback to avoid stale access
    const pid1 = a1.pid, pid2 = a2.pid;
    const name1 = t1.name, name2 = t2.name;
    const color1 = t1.body, color2 = t2.body;

    setTimeout(() => {
        const fresh2 = S.visualAgents[pid2];
        const fresh1 = S.visualAgents[pid1];
        if (fresh2 && fresh1) {
            fresh2.speechText = line2.substring(0, 24);
            fresh2.speechTimer = 160;
            fresh2.chatPartner = pid1;
            const mx = (fresh1.x + fresh2.x) / 2, my = (fresh1.y + fresh2.y) / 2;
            spawnHearts(mx, my - 10, 2);
        }
    }, 1500);

    addLog(`${name1} → ${name2}: ${line1.substring(0, 35)}`, "chat", color1);
    setTimeout(() => {
        if (S.visualAgents[pid2]) {
            addLog(`${name2} → ${name1}: ${line2.substring(0, 35)}`, "chat", color2);
        }
    }, 1800);
}

function walkTo(v, tx, ty) {
    v.walkPath = [{ x: tx, y: v.y }, { x: tx, y: ty }];
    v.walkIndex = 0;
    v.moving = true;
}

/** Walk to a named POI and say a location-appropriate line */
function goTo(v, dest) {
    if (dest === "desk") {
        walkTo(v, v.homeX, v.homeY);
        say(v, MOVE_SPEECH.desk);
    } else if (POI[dest]) {
        const p = POI[dest];
        walkTo(v, p.x + Math.random() * 8, p.y);
        say(v, MOVE_SPEECH[dest] || SPEECH.idle);
    }
}

/** Pick a random line from an array and set as speech */
function say(v, lines) {
    if (!lines || lines.length === 0) return;
    v.speechText = lines[Math.floor(Math.random() * lines.length)];
    v.speechTimer = 85;
}

// ── Particle Update ──
function updateParticles() {
    for (let i = S.particles.length - 1; i >= 0; i--) {
        const p = S.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--;
        if (p.life <= 0) S.particles.splice(i, 1);
    }
    for (let i = S.heartParticles.length - 1; i >= 0; i--) {
        const h = S.heartParticles[i];
        h.y += h.vy;
        h.x += Math.sin(h.life * 0.1) * 0.3;
        h.life--;
        if (h.life <= 0) S.heartParticles.splice(i, 1);
    }
}

// ── Input Handlers ──
function onCanvasClick(e) {
    if (S.isPanning) return;
    if (e.button && e.button !== 0) return; // only left click

    const rect = S.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - S.offsetX) / S.scale;
    const my = (e.clientY - rect.top - S.offsetY) / S.scale;

    let clicked = null;
    S.liveAgents.forEach(a => {
        const v = S.visualAgents[a.pid];
        if (!v) return;
        if (Math.abs(mx - v.x) < 10 && Math.abs(my - v.y) < 14) clicked = a;
    });

    if (clicked) {
        const wasSelected = S.selectedPid === clicked.pid;
        S.selectedPid = wasSelected ? null : clicked.pid;
        S.detailPid = wasSelected ? null : clicked.pid;
        const v = S.visualAgents[clicked.pid];
        if (v && !wasSelected) {
            spawnParticles(v.x, v.y - 8, AGENT_THEMES[S.liveAgents.indexOf(clicked) % AGENT_THEMES.length].body, 8);
            spawnHearts(v.x, v.y - 16, 2);
        }
    } else {
        S.selectedPid = null;
        S.detailPid = null;
    }
    updatePanel();
    updateDetailPanel();
}

// ── Zoom ──
function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const oldZoom = S.zoomLevel;
    S.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.zoomLevel + delta));
    if (S.zoomLevel !== oldZoom) {
        // Zoom toward mouse position
        const rect = S.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const zr = S.zoomLevel / oldZoom;
        S.panX = mx - zr * (mx - S.panX);
        S.panY = my - zr * (my - S.panY);
        resize();
    }
}

// ── Pan (right-drag or middle-drag) ──
function onPanStart(e) {
    if (e.button === 2 || e.button === 1) {
        S.isPanning = true;
        S.panStartX = e.clientX - S.panX;
        S.panStartY = e.clientY - S.panY;
        S.canvas.style.cursor = "grabbing";
    }
}
function onPanMove(e) {
    if (!S.isPanning) return;
    S.panX = e.clientX - S.panStartX;
    S.panY = e.clientY - S.panStartY;
    resize();
}
function onPanEnd() {
    if (S.isPanning) {
        S.isPanning = false;
        S.canvas.style.cursor = "default";
    }
}

// ── Touch Handlers (tap, one-finger pan, two-finger pinch zoom) ──
let touchState = {
    startX: 0, startY: 0,        // first finger start position
    startTime: 0,
    moved: false,                 // did finger move significantly?
    panning: false,               // one-finger pan active?
    pinching: false,              // two-finger pinch active?
    pinchDist0: 0,               // initial pinch distance
    pinchZoom0: 0,               // zoom level at pinch start
    pinchCX: 0, pinchCY: 0,     // pinch center
};

function touchDist(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function onTouchStart(e) {
    e.preventDefault();
    const ts = e.touches;

    if (ts.length === 1) {
        // Single finger: might be tap or pan
        touchState.startX = ts[0].clientX;
        touchState.startY = ts[0].clientY;
        touchState.startTime = Date.now();
        touchState.moved = false;
        touchState.panning = false;
        touchState.pinching = false;
    } else if (ts.length === 2) {
        // Two fingers: pinch zoom start
        touchState.panning = false;
        touchState.pinching = true;
        touchState.pinchDist0 = touchDist(ts[0], ts[1]);
        touchState.pinchZoom0 = S.zoomLevel;
        touchState.pinchCX = (ts[0].clientX + ts[1].clientX) / 2;
        touchState.pinchCY = (ts[0].clientY + ts[1].clientY) / 2;
    }
}

function onTouchMove(e) {
    e.preventDefault();
    const ts = e.touches;

    if (ts.length === 2 && touchState.pinching) {
        // Pinch zoom
        const dist = touchDist(ts[0], ts[1]);
        const ratio = dist / touchState.pinchDist0;
        const oldZoom = S.zoomLevel;
        S.zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchState.pinchZoom0 * ratio));

        if (S.zoomLevel !== oldZoom) {
            // Zoom toward pinch center
            const rect = S.canvas.getBoundingClientRect();
            const cx = touchState.pinchCX - rect.left;
            const cy = touchState.pinchCY - rect.top;
            const zr = S.zoomLevel / oldZoom;
            S.panX = cx - zr * (cx - S.panX);
            S.panY = cy - zr * (cy - S.panY);
            resize();
        }
    } else if (ts.length === 1 && !touchState.pinching) {
        const dx = ts[0].clientX - touchState.startX;
        const dy = ts[0].clientY - touchState.startY;

        // Start panning after 8px movement threshold
        if (!touchState.panning && Math.hypot(dx, dy) > 8) {
            touchState.panning = true;
            touchState.moved = true;
            // Record pan offset at start of gesture
            touchState.panStartX = S.panX;
            touchState.panStartY = S.panY;
        }

        if (touchState.panning) {
            S.panX = touchState.panStartX + dx;
            S.panY = touchState.panStartY + dy;
            resize();
        }
    }
}

function onTouchEnd(e) {
    // If single finger didn't move much and was quick → treat as tap (click)
    if (!touchState.moved && !touchState.pinching && Date.now() - touchState.startTime < 300) {
        onCanvasClick({ clientX: touchState.startX, clientY: touchState.startY });
    }
    touchState.panning = false;
    touchState.pinching = false;
    touchState.moved = false;
}

window.addEventListener("DOMContentLoaded", init);
