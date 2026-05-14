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

const ROOT_ID = "command-palette-overlay";
const INPUT_ID = "command-palette-input";
const LIST_ID = "command-palette-list";
const KIND_AGENT = "agent";
const KIND_ACTION = "action";

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
            <div class="cp-foot">
                <span><kbd>↑</kbd><kbd>↓</kbd> 이동</span>
                <span><kbd>enter</kbd> 선택</span>
                <span><kbd>esc</kbd> 닫기</span>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    // Click outside the card closes
    root.addEventListener("click", (e) => {
        if (e.target === root) close();
    });

    const input = root.querySelector(`#${INPUT_ID}`);
    input.addEventListener("input", () => render());
    input.addEventListener("keydown", onInputKey);
    return root;
}

function open() {
    const root = ensureRoot();
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("is-open"));
    highlightedIndex = 0;
    const input = document.getElementById(INPUT_ID);
    if (input) { input.value = ""; input.focus(); }
    render();
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
    } else if (item.kind === KIND_ACTION && typeof item.action === "function") {
        item.action();
    }
    close();
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
        const score = scoreAgent(agent, theme, query);
        if (score <= 0) return;
        out.push({ kind: KIND_AGENT, score, agent, theme });
    });
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
        { id: "cinema", group: "display", title: "시네마 모드 (오버레이 숨김)", hint: "Z", run: () => { try { window.toggleCinemaMode?.(); } catch { /* ignore */ } } },
        // ── Modals ──
        { id: "insights", group: "modal", title: "인사이트 모달 열기", hint: "I", run: () => { try { window.openInsights?.(); } catch { /* ignore */ } } },
        { id: "settings", group: "modal", title: "설정 열기", hint: ",", run: () => { try { document.getElementById("settings-toggle")?.click(); } catch { /* ignore */ } } },
        { id: "help", group: "modal", title: "단축키 도움말", hint: "?", run: () => { try { document.getElementById("help-toggle")?.click(); } catch { /* ignore */ } } },
        // ── Filters ──
        { id: "filter-all", group: "filter", title: "필터: 전체", run: () => setFilter("all") },
        { id: "filter-coding", group: "filter", title: "필터: 코딩 중", run: () => setFilter("coding") },
        { id: "filter-idle", group: "filter", title: "필터: 대기", run: () => setFilter("idle") },
        { id: "filter-offline", group: "filter", title: "필터: 오프라인", run: () => setFilter("offline") },
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
        { id: "mute", group: "tools", title: "사운드 음소거 토글", hint: "M", run: () => { try { window.aiTycoonSound?.toggle?.(); } catch { /* ignore */ } } },
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

    if (results.length === 0) {
        list.innerHTML = `<li class="cp-empty">결과 없음 — 다른 검색어를 입력해 보세요.</li>`;
        return;
    }

    list.innerHTML = results.map((r, i) => {
        if (r.kind === KIND_AGENT) {
            const a = r.agent;
            const meta = STATUS_META[a.isRunning ? a.status : "offline"] || STATUS_META.idle;
            const platform = (PLATFORM_META[a.platform] || PLATFORM_META.claude || {}).badge || "?";
            return `<li class="cp-row${i === 0 ? " is-active" : ""}" role="option" data-index="${i}">
                <span class="cp-avatar" style="background:${r.theme.body}">${esc(r.theme.name.charAt(0))}</span>
                <div class="cp-info">
                    <div class="cp-title">${esc(r.theme.name)} <em>· ${esc(a.projectName || "")}</em></div>
                    <div class="cp-sub">${esc(meta.label)} · ${esc(platform)} · ${a.memoryMB || 0}MB</div>
                </div>
                <kbd class="cp-row-hint">↵</kbd>
            </li>`;
        }
        // action
        return `<li class="cp-row cp-row-action${i === 0 ? " is-active" : ""}" role="option" data-index="${i}">
            <span class="cp-avatar cp-avatar-action"><iconify-icon icon="solar:command-square-bold"></iconify-icon></span>
            <div class="cp-info">
                <div class="cp-title">${esc(r.title)}</div>
                <div class="cp-sub">명령</div>
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
