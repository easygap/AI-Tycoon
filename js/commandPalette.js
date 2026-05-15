// ============================================================
//  AI TYCOON — Command Palette (Ctrl+K / Cmd+K)
// ============================================================
//
// A VS Code-style quick-search modal for jumping to any agent,
// switching theme, or triggering a global action without taking
// hands off the keyboard.
//
// Hotkeys:
//   Ctrl+K / Cmd+K  – toggle
//   ↑ / ↓           – navigate result list
//   Enter           – run the highlighted result
//   Esc             – close
//
// Result types:
//   - "agent"     focuses the camera + opens detail
//   - "action"    fires a callback (theme switch, demo toggle, etc.)
//
// Lightweight scoring: each search token is matched against agent
// name/project/platform with simple substring / prefix bonuses.

import { S } from "./state.js";
import { AGENT_THEMES, STATUS_META, PLATFORM_META } from "./constants.js";
import { isAgentPinned as _isAgentPinned } from "./agentPriority.js";

function isPinned(agent) {
    return _isAgentPinned(agent, S.pinnedAgentKeys || []);
}

const ROOT_ID = "command-palette-overlay";
const INPUT_ID = "command-palette-input";
const LIST_ID = "command-palette-list";
const KIND_AGENT = "agent";
const KIND_ACTION = "action";

// 최근 포커스한 에이전트 sessionId/pid 큐 (LRU, 최대 5개)
// 빈 검색 상태에서 상단에 노출해 자주 보는 에이전트를 빠르게 다시 찾을 수 있게 함
const RECENT_KEY = "ai-tycoon-cmdk-recent";
const RECENT_MAX = 5;
function loadRecent() {
    try {
        const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
    } catch { return []; }
}
function pushRecent(pidOrSid) {
    if (!pidOrSid) return;
    const key = String(pidOrSid);
    const cur = loadRecent().filter(k => k !== key);
    cur.unshift(key);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, RECENT_MAX))); }
    catch { /* localStorage 꽉 찬 경우 무시 */ }
}

let highlightedIndex = 0;
let results = [];

function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "cp-overlay";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Command palette");
    root.hidden = true;
    root.innerHTML = `
        <div class="cp-card" role="presentation">
            <div class="cp-input-row">
                <iconify-icon icon="solar:magnifer-linear" aria-hidden="true"></iconify-icon>
                <input id="${INPUT_ID}" type="text"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="에이전트, 프로젝트, 명령…"
                    aria-label="Command palette input" />
                <kbd class="cp-hint">esc</kbd>
            </div>
            <ul id="${LIST_ID}" class="cp-list" role="listbox" aria-label="검색 결과"></ul>
            <div class="cp-foot" id="cp-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> <span class="cp-foot-tx" data-foot-tx="move">이동</span></span>
                <span><kbd>enter</kbd> <span class="cp-foot-tx" data-foot-tx="select">선택</span></span>
                <span><kbd>esc</kbd> <span class="cp-foot-tx" data-foot-tx="close">닫기</span></span>
                <span class="cp-foot-count" id="cp-foot-count" aria-live="polite"></span>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // Click outside the card closes
    root.addEventListener("click", (e) => {
        if (e.target === root) close();
    });

    const input = root.querySelector(`#${INPUT_ID}`);
    // 한글 IME 조합 중에는 검색 보류 (자모 단위 매칭으로 깜빡이지 않게)
    input.addEventListener("compositionstart", () => { input._imeComposing = true; });
    input.addEventListener("compositionend", () => { input._imeComposing = false; render(); });
    input.addEventListener("input", () => { if (!input._imeComposing) render(); });
    input.addEventListener("keydown", onInputKey);
    return root;
}

function open() {
    const root = ensureRoot();
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("is-open"));
    highlightedIndex = 0;
    const input = document.getElementById(INPUT_ID);
    if (input) {
        input.value = "";
        const lang = window.aiTycoonI18n?.getLang?.() || "ko";
        input.placeholder = lang === "en" ? "Agents, projects, commands…" : "에이전트, 프로젝트, 명령…";
        input.focus();
    }
    render();
    // 업적 카운터 증분 (한 번 열 때마다)
    try { window.aiTycoonAchievements?.bumpCounter?.("paletteOpens"); } catch { /* ignore */ }
}

function close() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    root.classList.remove("is-open");
    setTimeout(() => { root.hidden = true; }, 180);
}

function toggle() {
    const root = document.getElementById(ROOT_ID);
    if (root && !root.hidden && root.classList.contains("is-open")) close();
    else open();
}

function onInputKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); move(+1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); move(-1); return; }
    if (e.key === "Enter") { e.preventDefault(); runHighlighted(); return; }
}

function move(delta) {
    if (results.length === 0) return;
    highlightedIndex = (highlightedIndex + delta + results.length) % results.length;
    refreshHighlight();
}

function refreshHighlight() {
    const list = document.getElementById(LIST_ID);
    if (!list) return;
    [...list.querySelectorAll(".cp-row")].forEach((node, i) => {
        node.classList.toggle("is-active", i === highlightedIndex);
        if (i === highlightedIndex) node.scrollIntoView({ block: "nearest" });
    });
}

function runHighlighted() {
    const item = results[highlightedIndex];
    if (!item) return;
    if (item.kind === KIND_AGENT) {
        const pid = item.agent.pid;
        S.selectedPid = pid;
        S.detailPid = pid;
        S.directorFocusPid = pid;
        S.directorMode = true;
        // 최근 방문 기록 — sessionId 우선 (재시작 후에도 추적), 없으면 pid
        pushRecent(item.agent.sessionId || pid);
    } else if (item.kind === KIND_ACTION && typeof item.action === "function") {
        item.action();
    }
    close();
}

/** 저장된 개인 메모를 sessionId/pid 기준으로 끌어옴 — 팔레트 검색 시 함께 매칭. */
function noteFor(agent) {
    try {
        const all = JSON.parse(localStorage.getItem("ai-tycoon-agent-notes") || "{}") || {};
        const key = String(agent?.sessionId || agent?.pid || "");
        return key ? (all[key] || "") : "";
    } catch { return ""; }
}

/** Score an agent against a query — higher is better, 0 means no match. */
function scoreAgent(agent, theme, query) {
    if (!query) return 1; // empty query = show everything
    const q = query.toLowerCase();
    const haystack = [
        (theme.name || "").toLowerCase(),
        (agent.projectName || "").toLowerCase(),
        (agent.platformName || agent.platform || "").toLowerCase(),
        (agent.currentWork?.prompt || "").toLowerCase(),
        (agent.currentTask?.subject || "").toLowerCase(),
        String(agent.pid).toLowerCase(),
        noteFor(agent).toLowerCase(),
    ];
    let total = 0;
    let matchedAll = true;
    q.split(/\s+/).filter(Boolean).forEach(tok => {
        let best = 0;
        haystack.forEach((s, i) => {
            if (!s) return;
            const idx = s.indexOf(tok);
            if (idx < 0) return;
            // Prefer prefix matches + earlier fields
            let s_ = 10 - i * 0.5;
            if (idx === 0) s_ += 3;
            best = Math.max(best, s_);
        });
        if (best === 0) matchedAll = false;
        total += best;
    });
    return matchedAll ? total : 0;
}

function buildAgentResults(query) {
    const out = [];
    (S.liveAgents || []).forEach((agent, idx) => {
        const theme = AGENT_THEMES[(S.visualAgents[agent.pid] ? AGENT_THEMES.indexOf(S.visualAgents[agent.pid].theme) : idx) % AGENT_THEMES.length] || AGENT_THEMES[0];
        let score = scoreAgent(agent, theme, query);
        if (score <= 0) return;
        // 핀된 에이전트는 약간 가산 — 검색어가 동등하면 핀된 친구가 위로 올라옴.
        const pinned = isPinned(agent);
        if (pinned) score += 2;
        out.push({ kind: KIND_AGENT, score, agent, theme, pinned });
    });

    // 검색어 없을 때: 최근 방문 > 핀 > 나머지 순으로 자동 정렬.
    // 자주 보는 친구가 항상 상단에 위치하도록.
    if (!query) {
        const recent = loadRecent();
        const recentMap = new Map();
        out.forEach(item => {
            const key1 = String(item.agent.sessionId || "");
            const key2 = String(item.agent.pid || "");
            if (key1) recentMap.set(key1, item);
            if (key2) recentMap.set(key2, item);
        });
        const ordered = [];
        const seen = new Set();
        // 1) 최근 방문 (가장 최신 순)
        recent.forEach(key => {
            const it = recentMap.get(key);
            if (it && !seen.has(it.agent.pid)) {
                ordered.push({ ...it, recent: true });
                seen.add(it.agent.pid);
            }
        });
        // 2) 핀된 에이전트 (최근에 없던 친구만)
        out.forEach(item => {
            if (item.pinned && !seen.has(item.agent.pid)) {
                ordered.push(item);
                seen.add(item.agent.pid);
            }
        });
        // 3) 나머지 — 점수 내림차순 (기존 score 가 이미 핀 +2 포함이지만 여기선 이미 핀 처리됨)
        out.sort((a, b) => b.score - a.score).forEach(item => {
            if (!seen.has(item.agent.pid)) ordered.push(item);
        });
        return ordered.slice(0, 8);
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

function buildActions(query) {
    const setFilter = (key) => { try { window.setFilter?.(key); } catch { /* ignore */ } };
    const setTheme = (theme) => {
        try {
            localStorage.setItem("ai-tycoon-theme", theme);
            window.applyTheme?.(theme);
            // Also try clicking the swatch to keep settings UI in sync
            document.querySelector(`.theme-swatch[data-theme="${theme}"]`)?.click();
        } catch { /* ignore */ }
    };
    const setLang = (lang) => {
        try {
            window.aiTycoonI18n?.setLang?.(lang);
            window.dispatchEvent(new Event("ai-tycoon-lang-change"));
        } catch { /* ignore */ }
    };

    const all = [
        // ── Display ──
        { id: "theme-toggle", group: "display", title: "다크 / 라이트 토글", hint: "D", run: () => { try { document.body.classList.toggle("dark"); localStorage.setItem("ai-tycoon-dark", document.body.classList.contains("dark") ? "true" : "false"); } catch { /* ignore */ } } },
        { id: "privacy", group: "display", title: "프라이버시 모드 토글", hint: "⇧P", run: () => { try { window.aiTycoonPrivacy?.toggle?.(); } catch { /* ignore */ } } },
        { id: "privacy-strict", group: "display", title: "Strict 프라이버시 (호버 미리보기 차단)", hint: "⇧P⇧P", run: () => { try { window.aiTycoonPrivacy?.setStrict?.(!window.aiTycoonPrivacy?.isStrict?.()); } catch { /* ignore */ } } },
        { id: "cinema", group: "display", title: "시네마 모드 (오버레이 숨김)", hint: "Z", run: () => { try { window.toggleCinemaMode?.(); } catch { /* ignore */ } } },
        { id: "compact-cards", group: "display", title: "에이전트 카드 컴팩트 보기 토글", run: () => { try { window.toggleAgentsCompact?.(); } catch { /* ignore */ } } },
        // ── Modals ──
        { id: "insights", group: "modal", title: "인사이트 모달 열기", hint: "I", run: () => { try { window.openInsights?.(); } catch { /* ignore */ } } },
        { id: "settings", group: "modal", title: "설정 열기", hint: ",", run: () => { try { document.getElementById("settings-toggle")?.click(); } catch { /* ignore */ } } },
        { id: "help", group: "modal", title: "단축키 도움말", hint: "?", run: () => { try { document.getElementById("help-toggle")?.click(); } catch { /* ignore */ } } },
        // ── Filters ──
        { id: "filter-all", group: "filter", title: "필터: 전체", run: () => setFilter("all") },
        { id: "filter-coding", group: "filter", title: "필터: 코딩 중", run: () => setFilter("coding") },
        { id: "filter-idle", group: "filter", title: "필터: 대기", run: () => setFilter("idle") },
        { id: "filter-offline", group: "filter", title: "필터: 오프라인", run: () => setFilter("offline") },
        // 검색·필터·핀 빠른 초기화 — 화면이 너무 좁아졌을 때 한 번에 깨끗하게
        { id: "reset-search", group: "filter", title: "검색 비우기", run: () => { try { window.clearAgentSearch?.(); } catch { /* ignore */ } } },
        { id: "reset-filters", group: "filter", title: "필터 모두 초기화 (전체 보기)", run: () => {
            try {
                window.setFilter?.("all");
                window.setPlatformFilter?.("all");
                window.setActionFilter?.("all");
                window.clearAgentSearch?.();
            } catch { /* ignore */ }
        } },
        { id: "clear-pins", group: "filter", title: "모든 핀 해제", run: () => {
            try {
                S.pinnedAgentKeys = [];
                localStorage.setItem("ai-tycoon-pinned-agents", "[]");
                localStorage.setItem("ai-tycoon-pinned-pids", "[]");
                // setFilter 호출하면 내부에서 updatePanel() 트리거됨 — 패널 즉시 갱신용
                window.setFilter?.(S.activeFilter || "all");
                const lang = window.aiTycoonI18n?.getLang?.() || "ko";
                window.aiTycoonToasts?.show?.("info",
                    lang === "en" ? "Pins cleared" : "고정 모두 해제",
                    lang === "en" ? "All pinned agents released." : "고정된 에이전트가 모두 해제됐어요.");
            } catch { /* ignore */ }
        } },
        // ── Sort ── 정렬 기준 5종 — Ctrl+K 에서도 마우스 없이 빠르게 전환
        { id: "sort-status",   group: "filter", title: "정렬: 상태순",        run: () => { try { window.setSortOrder?.("status"); } catch { /* ignore */ } } },
        { id: "sort-memory",   group: "filter", title: "정렬: 메모리순",      run: () => { try { window.setSortOrder?.("memory"); } catch { /* ignore */ } } },
        { id: "sort-platform", group: "filter", title: "정렬: 플랫폼순",      run: () => { try { window.setSortOrder?.("platform"); } catch { /* ignore */ } } },
        { id: "sort-project",  group: "filter", title: "정렬: 프로젝트순",    run: () => { try { window.setSortOrder?.("project"); } catch { /* ignore */ } } },
        { id: "sort-recent",   group: "filter", title: "정렬: 최근 활동순",   run: () => { try { window.setSortOrder?.("recent"); } catch { /* ignore */ } } },
        // ── Theme ──
        { id: "theme-classic", group: "theme", title: "테마: 클래식", run: () => setTheme("classic") },
        { id: "theme-cafe", group: "theme", title: "테마: 카페", run: () => setTheme("cafe") },
        { id: "theme-forest", group: "theme", title: "테마: 숲속", run: () => setTheme("forest") },
        { id: "theme-midnight", group: "theme", title: "테마: 심야", run: () => setTheme("midnight") },
        { id: "theme-sakura", group: "theme", title: "테마: 사쿠라", run: () => setTheme("sakura") },
        { id: "theme-ocean", group: "theme", title: "테마: 바다", run: () => setTheme("ocean") },
        // ── Language ──
        { id: "lang-ko", group: "lang", title: "언어: 한국어", run: () => setLang("ko") },
        { id: "lang-en", group: "lang", title: "Language: English", run: () => setLang("en") },
        // ── Tools ──
        { id: "demo-toggle", group: "tools", title: "데모 모드 전환", run: () => { try { window.aiTycoonDemo?.toggle?.(); } catch { /* ignore */ } } },
        { id: "snapshot", group: "tools", title: "스냅샷 저장", hint: "P", run: () => { try { window.aiTycoonSnapshot?.download?.(); } catch { /* ignore */ } } },
        { id: "backup", group: "tools", title: "설정 백업 (JSON)", run: () => { try { window.aiTycoonBackup?.download?.(); } catch { /* ignore */ } } },
        { id: "standup", group: "tools", title: "일일 리포트 (Markdown)", run: () => { try { window.aiTycoonStandup?.download?.(); } catch { /* ignore */ } } },
        { id: "notes-export", group: "tools", title: "에이전트 메모 내보내기 (Markdown)", run: () => { try { window.aiTycoonNotes?.download?.(); } catch { /* ignore */ } } },
        { id: "mute", group: "tools", title: "사운드 음소거 토글", hint: "M", run: () => { try { window.aiTycoonSound?.toggle?.(); } catch { /* ignore */ } } },
        { id: "reconnect", group: "tools", title: "WebSocket 즉시 재연결", run: () => { try { window.aiTycoonReconnect?.(); } catch { /* ignore */ } } },
        { id: "clear-logs", group: "tools", title: "활동 로그 비우기", run: () => {
            // 사이드 패널 하단 활동 타임라인 + 시스템 로그 + 캔버스 work-stream 모두 비움.
            // 실제 에이전트 상태는 그대로 — 표시만 깨끗하게.
            try {
                S.workEvents.length = 0;
                S.activityLog.length = 0;
                const logEl = document.getElementById("activity-log");
                if (logEl) logEl.innerHTML = "";
                // 패널 다시 그리면서 빈 상태 메시지로 갱신
                window.setFilter?.(S.activeFilter || "all");
                const lang = window.aiTycoonI18n?.getLang?.() || "ko";
                window.aiTycoonToasts?.show?.("info",
                    lang === "en" ? "Activity log cleared" : "활동 로그 비움",
                    lang === "en" ? "Stream reset, new events will fill up." : "다시 새 이벤트가 쌓이기 시작해요.");
            } catch { /* ignore */ }
        } },
    ];
    if (!query) {
        // Pick a relevant default starter set
        return all.filter(a => ["display", "modal", "filter"].includes(a.group)).slice(0, 6);
    }
    const q = query.toLowerCase();
    return all.filter(a => a.title.toLowerCase().includes(q) || a.id.includes(q) || (a.hint || "").toLowerCase() === q);
}

function render() {
    const input = document.getElementById(INPUT_ID);
    const list = document.getElementById(LIST_ID);
    if (!input || !list) return;
    const q = input.value.trim();
    const agents = buildAgentResults(q);
    const actions = buildActions(q).map(a => ({ kind: KIND_ACTION, score: 1, ...a, action: a.run }));
    results = [...agents, ...actions];
    highlightedIndex = 0;

    // 푸터 안내 문구 i18n — 매 render 마다 동기화 (언어 전환 즉시 반영)
    const langCp = (window.aiTycoonI18n?.getLang?.() || "ko");
    const footTx = langCp === "en"
        ? { move: "move", select: "select", close: "close" }
        : { move: "이동", select: "선택", close: "닫기" };
    document.querySelectorAll("#cp-foot .cp-foot-tx").forEach(el => {
        const k = el.dataset.footTx;
        if (k && footTx[k]) el.textContent = footTx[k];
    });

    // 결과 개수 푸터에 표시 — 에이전트 / 명령 별도 카운트로 분리
    const countEl = document.getElementById("cp-foot-count");
    if (countEl) {
        const agentCount = results.filter(r => r.kind === KIND_AGENT).length;
        const actionCount = results.filter(r => r.kind === KIND_ACTION).length;
        if (results.length < 3) {
            countEl.textContent = "";
        } else {
            const parts = [];
            if (agentCount > 0) parts.push(`${agentCount} agents`);
            if (actionCount > 0) parts.push(`${actionCount} cmds`);
            countEl.textContent = parts.join(" · ");
        }
    }

    if (results.length === 0) {
        list.innerHTML = `<li class="cp-empty">결과 없음 — 다른 검색어를 입력해 보세요.</li>`;
        return;
    }

    // 검색어가 있을 때 결과 줄에서 매칭 부분 하이라이트하기 위한 헬퍼
    const hlQ = q;
    list.innerHTML = results.map((r, i) => {
        if (r.kind === KIND_AGENT) {
            const a = r.agent;
            const meta = STATUS_META[a.isRunning ? a.status : "offline"] || STATUS_META.idle;
            const platform = (PLATFORM_META[a.platform] || PLATFORM_META.claude || {}).badge || "?";
            const recentChip = r.recent ? `<span class="cp-recent-chip">최근</span>` : "";
            const pinStar = r.pinned ? `<span class="cp-pin-star" title="고정됨" aria-label="고정됨">★</span>` : "";
            const noteText = (typeof noteFor === "function") ? noteFor(a) : "";
            const noteChip = noteText
                ? `<span class="cp-note-chip" title="${esc(noteText.slice(0, 140))}" aria-label="메모 있음">📝</span>`
                : "";
            // 상태 색상 점 — 아바타 우하단에 배치해서 살아있는지 한눈에 인지
            const statusDot = `<span class="cp-status-dot" style="background:${meta.color}" title="${esc(meta.label)}" aria-hidden="true"></span>`;
            return `<li class="cp-row${i === 0 ? " is-active" : ""}${r.pinned ? " is-pinned" : ""}" role="option" data-index="${i}">
                <span class="cp-avatar" style="background:${r.theme.body}">${esc(r.theme.name.charAt(0))}${pinStar}${statusDot}</span>
                <div class="cp-info">
                    <div class="cp-title">${highlight(esc(r.theme.name), hlQ)} <em>· ${highlight(esc(a.projectName || ""), hlQ)}</em>${recentChip}${noteChip}</div>
                    <div class="cp-sub">${esc(meta.label)} · ${esc(platform)} · ${a.memoryMB || 0}MB</div>
                </div>
                <kbd class="cp-row-hint">↵</kbd>
            </li>`;
        }
        // action — 그룹별로 좌측 strip 색상이 다르게 (display/modal/filter/theme/lang/tools)
        const group = r.group || "tools";
        return `<li class="cp-row cp-row-action${i === 0 ? " is-active" : ""}" role="option" data-index="${i}" data-group="${esc(group)}">
            <span class="cp-avatar cp-avatar-action"><iconify-icon icon="solar:command-square-bold"></iconify-icon></span>
            <div class="cp-info">
                <div class="cp-title">${highlight(esc(r.title), hlQ)}</div>
                <div class="cp-sub">${esc(group)}</div>
            </div>
            ${r.hint ? `<kbd class="cp-row-hint">${esc(r.hint)}</kbd>` : ""}
        </li>`;
    }).join("");

    // Click handlers
    list.querySelectorAll(".cp-row").forEach(node => {
        node.addEventListener("mousedown", (e) => {
            e.preventDefault();
            highlightedIndex = Number(node.getAttribute("data-index")) || 0;
            runHighlighted();
        });
        node.addEventListener("mouseenter", () => {
            highlightedIndex = Number(node.getAttribute("data-index")) || 0;
            refreshHighlight();
        });
    });
}

function esc(str) {
    return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** esc 처리된 안전한 텍스트에서 query 토큰을 <mark class="search-match">로 감쌈.
 *  사이드바 카드의 highlightTokens 와 같은 동작 (스타일 일치). */
function highlight(safeText, query) {
    if (!safeText || !query) return safeText;
    const tokens = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return safeText;
    const reSrc = tokens
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
    if (!reSrc) return safeText;
    try {
        const re = new RegExp(`(${reSrc})`, "ig");
        return safeText.replace(re, '<mark class="search-match">$1</mark>');
    } catch {
        return safeText;
    }
}

// ── Global hotkey ───────────────────────────────────────────
if (typeof document !== "undefined") {
    document.addEventListener("keydown", (e) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod) return;
        if (e.key === "k" || e.key === "K") {
            const target = e.target;
            // Don't hijack Ctrl+K inside the palette's own input (still close on Esc)
            if (target && target.id === INPUT_ID) return;
            e.preventDefault();
            toggle();
        }
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonCommandPalette = { open, close, toggle };
}
