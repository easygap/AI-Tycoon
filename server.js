// ============================================================
//  AI TYCOON — WebSocket Server (Refactored)
//  Monitors real Claude Code sessions, tasks, and processes
// ============================================================

const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { WebSocketServer } = require("ws");

// ── Config (env-overridable) ────────────────────────────────
const HOME = process.env.USERPROFILE || process.env.HOME;
const CLAUDE_DIR = path.join(HOME, ".claude");
const SESSIONS_DIR = path.join(CLAUDE_DIR, "sessions");
const TASKS_DIR = path.join(CLAUDE_DIR, "tasks");
const HISTORY_FILE = path.join(CLAUDE_DIR, "history.jsonl");
const CLAUDE_JSON = path.join(HOME, ".claude.json");
const TEMP_DIR = process.platform === "win32"
    ? path.join(HOME, "AppData", "Local", "Temp", "claude")
    : path.join(os.tmpdir(), "claude");

// External AI directories
const CODEX_DIR = path.join(HOME, ".codex");
const CODEX_SESSION_INDEX = path.join(CODEX_DIR, "session_index.jsonl");
const CODEX_SESSIONS_DIR = path.join(CODEX_DIR, "sessions");
const CURSOR_STORAGE = path.join(HOME, "AppData", "Roaming", "Cursor", "User", "globalStorage", "storage.json");

const PORT = parseInt(process.env.PORT, 10) || 3777;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 2000;
const HEARTBEAT_INTERVAL = 10000; // 10s
const QUIET = process.env.QUIET === "1" || process.env.LOG_LEVEL === "warn" || process.env.LOG_LEVEL === "error";

// ── State ────────────────────────────────────────────────────
const STARTED_AT = Date.now();
const VERSION = "1.4.1";
let lastState = null;
let clients = new Set();
let watchDebounceTimer = null;
let prevMemory = {}; // pid -> previous memoryKB (to detect activity via memory change)
let polling = false; // guard against overlapping polls
let lastStateJSON = ""; // diff baseline for broadcast gating
let lastGoodProcesses = []; // cache: last successful process detection result
let lastGoodExternalAIs = []; // cache: last successful external AI detection
let lastDiagnostics = null; // lightweight detector health shared through heartbeat
let pollTimer = null; // setInterval handle so shutdown can stop it
let heartbeatTimer = null; // setInterval handle for heartbeat
let isShuttingDown = false;

// ── Per-session sticky state (prevents oscillation) ──
// sessionId → { role, roleVotes: {role: count}, status, statusHoldUntil }
const stickyState = {};
const ROLE_HOLD_VOTES = 3; // need 3 prompts of same role to switch
const STATUS_HOLD_MS = 10000; // hold status for at least 10s before downgrade
const CODEX_VISIBLE_MS = 3 * 60 * 60 * 1000; // show recent Codex sessions as separate agents

// ── External AI previous state cache ──
// pid → { status, windowTitle, lastActiveAt }
const extPrevState = {};

// ── HTTP Server ─────────────────────────────────────────────
const MIME = {
    ".html": "text/html",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".ico":  "image/x-icon",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".webmanifest": "application/manifest+json",
    ".json": "application/json",
};

const PUBLIC_FILES = new Set([
    "/index.html",
    "/style.css",
    "/css/tailwind.generated.css",
    "/manifest.webmanifest",
    "/sw.js",
]);

function resolvePublicFile(requestUrl) {
    let pathname;
    try {
        pathname = decodeURIComponent((requestUrl || "/").split("?")[0]);
    } catch (e) {
        return null;
    }

    pathname = pathname.replace(/\\/g, "/");
    if (pathname === "/") pathname = "/index.html";
    if (!pathname.startsWith("/")) return null;
    if (pathname.includes("\0")) return null;

    const segments = pathname.split("/").filter(Boolean);
    if (segments.some(segment => segment === ".." || segment.startsWith("."))) return null;

    const normalized = path.posix.normalize(pathname);
    const allowed = PUBLIC_FILES.has(normalized)
        || /^\/js\/[A-Za-z0-9_-]+\.js$/.test(normalized)
        || /^\/icons\/[A-Za-z0-9_.-]+\.(svg|png|ico)$/.test(normalized);
    if (!allowed) return null;

    const resolved = path.resolve(__dirname, `.${normalized}`);
    if (!resolved.startsWith(`${__dirname}${path.sep}`) && resolved !== path.join(__dirname, "index.html")) {
        return null;
    }
    return resolved;
}

const httpServer = http.createServer((req, res) => {
    const urlPath = req.url.split("?")[0];
    if (urlPath === "/favicon.ico") {
        res.writeHead(204, {
            "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        res.end();
        return;
    }

    // /api/agents — JSON snapshot of currently detected agents (for integrations)
    if (urlPath === "/api/agents") {
        const agents = (lastState?.agents || []).map(a => ({
            pid: a.pid,
            platform: a.platform,
            platformName: a.platformName,
            projectName: a.projectName,
            role: a.role,
            status: a.status,
            isRunning: a.isRunning,
            memoryMB: a.memoryMB,
            needsReview: a.needsReview,
            totalTasks: a.totalTasks,
            completedTasks: a.completedTasks,
            currentTask: a.currentTask ? {
                id: a.currentTask.id,
                subject: a.currentTask.subject,
                status: a.currentTask.status,
            } : null,
        }));
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: true, count: agents.length, agents }, null, 2));
        return;
    }

    // /api/health — JSON status endpoint for monitoring & "About" panel
    if (urlPath === "/api/health") {
        const agents = (lastState?.agents) || [];
        const running = agents.filter(a => a.isRunning);
        const platformsByCount = {};
        agents.forEach(a => {
            const k = a.platform || "unknown";
            platformsByCount[k] = (platformsByCount[k] || 0) + 1;
        });
        const payload = {
            ok: true,
            version: VERSION,
            startedAt: new Date(STARTED_AT).toISOString(),
            uptimeMs: Date.now() - STARTED_AT,
            nodeVersion: process.version,
            platform: process.platform,
            clients: clients.size,
            agents: {
                total: agents.length,
                running: running.length,
                platforms: platformsByCount,
            },
            diagnostics: lastDiagnostics || null,
            pollIntervalMs: POLL_INTERVAL,
        };
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        res.end(JSON.stringify(payload, null, 2));
        return;
    }

    const filePath = resolvePublicFile(req.url);
    if (!filePath) {
        // Friendly 404: small inline page that points back to the dashboard
        const isHtmlRequest = (req.headers.accept || "").includes("text/html");
        if (isHtmlRequest) {
            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><title>404 · AI Tycoon</title>
<style>
  body { font-family: "Pretendard", system-ui, sans-serif; background: linear-gradient(180deg, #fff3df 0%, #ffb88a 100%); margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #2a1a10; }
  .card { background: rgba(255,253,248,0.96); border: 1px solid rgba(217,170,120,0.4); border-radius: 18px; padding: 32px 36px; box-shadow: 0 20px 40px -10px rgba(80,40,20,0.32); text-align: center; max-width: 360px; }
  .kicker { font-size: 11px; font-weight: 700; color: #d97757; letter-spacing: 0.18em; text-transform: uppercase; }
  h1 { font-size: 28px; margin: 8px 0 6px; }
  p { font-size: 13px; color: #5a4438; line-height: 1.55; }
  a { display: inline-block; margin-top: 18px; padding: 9px 22px; background: linear-gradient(180deg, #ff8a4c, #d97757); color: #fff; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 13px; box-shadow: 0 6px 14px -2px rgba(217,119,87,0.45); }
</style>
</head>
<body>
  <div class="card">
    <div class="kicker">404 · NOT FOUND</div>
    <h1>길을 잃으셨네요</h1>
    <p>이 경로는 작업실의 어느 자리도 가리키지 않아요. 책상으로 돌아갈까요?</p>
    <a href="/">작업실로 돌아가기</a>
  </div>
</body>
</html>`);
            return;
        }
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "Not found", path: req.url }));
        return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || "text/plain";

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }
        res.writeHead(200, {
            "Content-Type": contentType + "; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        });
        res.end(data);
    });
});

// ── WebSocket Server ─────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
    clients.add(ws);
    if (!QUIET) console.log(`[WS] Client connected (total: ${clients.size})`);

    // Send current state immediately
    if (lastState) {
        safeSend(ws, JSON.stringify({ type: "full_state", data: lastState }));
    }

    ws.on("close", () => {
        clients.delete(ws);
        if (!QUIET) console.log(`[WS] Client disconnected (total: ${clients.size})`);
    });
});

/** Safe send — won't crash if client disconnected mid-send */
function safeSend(ws, data) {
    try {
        if (ws.readyState === 1) ws.send(data);
    } catch (e) { /* ignore */ }
}

function broadcast(msg) {
    const data = JSON.stringify(msg);
    clients.forEach(ws => safeSend(ws, data));
}

/** Heartbeat — lets client detect stale connections */
function startHeartbeat() {
    heartbeatTimer = setInterval(() => {
        const msg = JSON.stringify({
            type: "heartbeat",
            ts: Date.now(),
            diagnostics: lastDiagnostics,
        });
        clients.forEach(ws => safeSend(ws, msg));
    }, HEARTBEAT_INTERVAL);
}

// ── Data Collectors (async/await) ────────────────────────────

/** Read all session files */
async function readSessions() {
    try {
        const files = await fsp.readdir(SESSIONS_DIR);
        const jsonFiles = files.filter(f => f.endsWith(".json"));

        const sessions = await Promise.allSettled(
            jsonFiles.map(async (file) => {
                const filePath = path.join(SESSIONS_DIR, file);
                const [data, stat] = await Promise.all([
                    fsp.readFile(filePath, "utf8"),
                    fsp.stat(filePath),
                ]);
                const session = JSON.parse(data);
                session._file = file;
                session._pid = file.replace(".json", "");
                session._mtime = stat.mtimeMs; // session file last modified
                return session;
            })
        );

        return sessions
            .filter(r => r.status === "fulfilled")
            .map(r => r.value);
    } catch (e) {
        return [];
    }
}

/** Read task files organized by session */
async function readTasks() {
    try {
        const sessionDirs = await fsp.readdir(TASKS_DIR);
        const tasks = {};

        const results = await Promise.allSettled(
            sessionDirs.map(async (sessionDir) => {
                const sessionPath = path.join(TASKS_DIR, sessionDir);
                const stat = await fsp.stat(sessionPath);
                if (!stat.isDirectory()) return null;

                const files = await fsp.readdir(sessionPath);
                const taskFiles = files.filter(f => f.endsWith(".json"));

                const taskResults = await Promise.allSettled(
                    taskFiles.map(async (tf) => {
                        const data = await fsp.readFile(path.join(sessionPath, tf), "utf8");
                        const task = JSON.parse(data);
                        task._taskId = tf.replace(".json", "");
                        return task;
                    })
                );

                return {
                    sessionDir,
                    tasks: taskResults
                        .filter(r => r.status === "fulfilled")
                        .map(r => r.value),
                };
            })
        );

        results.forEach(r => {
            if (r.status === "fulfilled" && r.value) {
                tasks[r.value.sessionDir] = r.value.tasks;
            }
        });

        return tasks;
    } catch (e) {
        return {};
    }
}

/** Read recent history entries */
async function readHistory(limit = 100) {
    try {
        const data = await fsp.readFile(HISTORY_FILE, "utf8");
        const lines = data.trim().split("\n").filter(Boolean);
        const entries = [];
        const start = Math.max(0, lines.length - limit);
        for (let i = start; i < lines.length; i++) {
            try { entries.push(JSON.parse(lines[i])); } catch (e) {}
        }
        return entries;
    } catch (e) {
        return [];
    }
}

/**
 * Extract latest prompts per sessionId from history.
 * Returns Map<sessionId, { prompt, timestamp, project }>
 */
function extractLatestPrompts(history) {
    const map = new Map();
    // history is chronological, so later entries overwrite
    for (const entry of history) {
        if (!entry.sessionId) continue;
        let prompt = entry.display || "";

        // If display is just "[Pasted text ...]", try to extract from pastedContents
        if (/^\[Pasted text/.test(prompt.trim())) {
            if (entry.pastedContents) {
                // Get the first pasted content's actual text
                const firstKey = Object.keys(entry.pastedContents)[0];
                const pasted = firstKey && entry.pastedContents[firstKey];
                if (pasted && pasted.content) {
                    prompt = pasted.content.split("\n")[0].substring(0, 200);
                } else {
                    // No useful content, try to keep previous entry for this session
                    continue;
                }
            } else {
                continue; // Skip entries with no real text
            }
        }

        // Skip very short or empty prompts
        if (prompt.length < 2) continue;

        // If prompt starts with pasted text reference mixed with real text, extract real text
        prompt = prompt.replace(/\[Pasted text[^\]]*\]\s*/g, "").trim();
        if (prompt.length < 2) continue;

        map.set(entry.sessionId, {
            prompt: prompt.substring(0, 200),
            timestamp: entry.timestamp,
            project: entry.project,
        });
    }
    return map;
}

/** Read main .claude.json for project info */
async function readClaudeConfig() {
    try {
        const data = await fsp.readFile(CLAUDE_JSON, "utf8");
        const config = JSON.parse(data);
        const projects = {};
        if (config.projects) {
            Object.entries(config.projects).forEach(([key, val]) => {
                projects[key] = {
                    allowedTools: val.allowedTools?.length || 0,
                    hasMcpServers: !!val.mcpServers && Object.keys(val.mcpServers).length > 0,
                    mcpServerNames: val.mcpServers ? Object.keys(val.mcpServers) : [],
                };
            });
        }
        return {
            numStartups: config.numStartups,
            firstStart: config.firstStartTime,
            projects,
        };
    } catch (e) {
        return null;
    }
}

/**
 * Check which session PIDs are alive and get their memory.
 * Instead of searching by process name (misses node.exe, IDE-hosted sessions),
 * directly check each session PID — this catches ALL Claude sessions regardless
 * of how they were launched (CLI, Desktop App, IDE extension, etc.)
 */
function readProcesses(sessionPids) {
    if (!sessionPids || sessionPids.length === 0) return Promise.resolve([]);

    const pidList = sessionPids.join(",");
    const psCmd = `powershell -NoProfile -Command "$pids = @(${pidList}); $result = @(); foreach ($id in $pids) { try { $p = Get-Process -Id $id -ErrorAction Stop; $result += @{Id=$p.Id; WS=$p.WorkingSet64; Name=$p.ProcessName} } catch {} }; $result | ConvertTo-Json -Compress"`;

    return new Promise((resolve) => {
        exec(psCmd, { timeout: 4000, shell: "cmd.exe" }, (err, stdout) => {
            if (err || !stdout || !stdout.trim()) return resolve([]);
            try {
                let parsed = JSON.parse(stdout.trim());
                if (!Array.isArray(parsed)) parsed = [parsed];
                const processes = parsed.map(p => ({
                    pid: String(p.Id),
                    memoryKB: Math.round((p.WS || 0) / 1024),
                    processName: p.Name || "",
                })).filter(p => p.pid);
                resolve(processes);
            } catch (e) {
                resolve([]);
            }
        });
    });
}

// ── Multi-AI Platform Detection ─────────────────────────────
const AI_PLATFORMS = {
    cursor: {
        id: "cursor",
        name: "Cursor AI",
        processNames: ["Cursor"],
        icon: "cursor",
        // Cursor runs many sub-processes; the one with the biggest memory is the main one
        aggregate: "main-window",
    },
    ollama: {
        id: "ollama",
        name: "Ollama",
        processNames: ["ollama", "ollama_llama_server"],
        icon: "ollama",
        port: 11434,
        apiUrl: "http://localhost:11434/api/tags",
    },
    lmstudio: {
        id: "lmstudio",
        name: "LM Studio",
        processNames: ["LM Studio"],
        icon: "lmstudio",
        port: 1234,
    },
    jan: {
        id: "jan",
        name: "Jan",
        processNames: ["jan"],
        icon: "jan",
    },
    gpt4all: {
        id: "gpt4all",
        name: "GPT4All",
        processNames: ["chat"],
        icon: "gpt4all",
    },
    codex: {
        id: "codex",
        name: "OpenAI Codex",
        processNames: ["Codex", "codex"],
        icon: "codex",
        aggregate: "main-window",
    },
    copilot: {
        id: "copilot",
        name: "GitHub Copilot",
        processNames: ["copilot-agent"],
        icon: "copilot",
    },
};

/** Read Codex session index for thread names + today's sessions for cwd */
async function readCodexContext() {
    const result = { threads: [], activeSessions: [] };

    try {
        // Read session_index.jsonl for thread names (last 80)
        const indexData = await fsp.readFile(CODEX_SESSION_INDEX, "utf8");
        const lines = indexData.trim().split("\n").filter(Boolean);
        const start = Math.max(0, lines.length - 80);
        for (let i = start; i < lines.length; i++) {
            try {
                const thread = JSON.parse(lines[i]);
                thread._updatedAtMs = Date.parse(thread.updated_at || thread.updatedAt || "");
                result.threads.push(thread);
            } catch (e) {}
        }
    } catch (e) {}

    try {
        // Read today's session files for cwd
        const now = new Date();
        const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, "0"), d = String(now.getDate()).padStart(2, "0");
        const todayDir = path.join(CODEX_SESSIONS_DIR, String(y), m, d);
        if (fs.existsSync(todayDir)) {
            const files = await fsp.readdir(todayDir);
            for (const file of files.filter(f => f.endsWith(".jsonl"))) {
                try {
                    // Read first chunk (session_meta can be large due to base_instructions)
                    const fd = await fsp.open(path.join(todayDir, file), "r");
                    const buf = Buffer.alloc(16384);
                    await fd.read(buf, 0, 16384, 0);
                    await fd.close();
                    const firstLine = buf.toString("utf8").split("\n")[0];
                    const meta = JSON.parse(firstLine);
                    if (meta.type === "session_meta" && meta.payload) {
                        const stat = await fsp.stat(path.join(todayDir, file));
                        result.activeSessions.push({
                            id: meta.payload.id,
                            cwd: meta.payload.cwd,
                            model: meta.payload.model_provider,
                            agentNickname: meta.payload.agent_nickname,
                            agentRole: meta.payload.agent_role,
                            originator: meta.payload.originator,
                            mtime: stat.mtimeMs,
                        });
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
    return result;
}

/** Read Cursor open workspace folders */
async function readCursorWorkspaces() {
    try {
        const data = await fsp.readFile(CURSOR_STORAGE, "utf8");
        const config = JSON.parse(data);
        const bw = config.backupWorkspaces;
        if (!bw) return [];
        const folders = (bw.folders || []).map(f => {
            try { return decodeURIComponent(f.folderUri.replace("file:///", "")).replace(/\//g, "\\"); }
            catch (e) { return ""; }
        }).filter(Boolean);
        return folders;
    } catch (e) {
        return [];
    }
}

/** Detect non-Claude AI platforms running on the system */
function readExternalAIs() {
    const processNames = [];
    for (const platform of Object.values(AI_PLATFORMS)) {
        processNames.push(...platform.processNames);
    }
    const nameFilter = processNames.map(n => `'${n}'`).join(",");

    const psCmd = `powershell -NoProfile -Command "$names = @(${nameFilter}); $result = @(); foreach ($n in $names) { try { $procs = Get-Process -Name $n -ErrorAction Stop; foreach ($p in $procs) { $result += @{Id=$p.Id; WS=$p.WorkingSet64; Name=$p.ProcessName; Title=$p.MainWindowTitle} } } catch {} }; if ($result.Count -gt 0) { $result | ConvertTo-Json -Compress } else { '[]' }"`;

    return new Promise((resolve) => {
        exec(psCmd, { timeout: 4000, shell: "cmd.exe" }, (err, stdout) => {
            if (err || !stdout || !stdout.trim()) return resolve([]);
            try {
                let parsed = JSON.parse(stdout.trim());
                if (!Array.isArray(parsed)) parsed = [parsed];

                const agents = [];

                for (const [key, platform] of Object.entries(AI_PLATFORMS)) {
                    const procs = parsed.filter(p =>
                        platform.processNames.some(n => n.toLowerCase() === (p.Name || "").toLowerCase())
                    );
                    if (procs.length === 0) continue;

                    if (platform.aggregate === "main-window") {
                        // For multi-process apps like Cursor: pick the largest process
                        const main = procs.reduce((a, b) => (a.WS || 0) > (b.WS || 0) ? a : b);
                        const totalMem = procs.reduce((s, p) => s + (p.WS || 0), 0);
                        const title = procs.find(p => p.Title && p.Title.length > 0)?.Title || "";
                        agents.push({
                            pid: `ext-${key}-${main.Id}`,
                            platform: key,
                            platformName: platform.name,
                            icon: platform.icon,
                            processCount: procs.length,
                            memoryKB: Math.round(totalMem / 1024),
                            mainPid: main.Id,
                            windowTitle: title,
                        });
                    } else {
                        // Single-process apps: one agent per instance
                        procs.forEach(p => {
                            agents.push({
                                pid: `ext-${key}-${p.Id}`,
                                platform: key,
                                platformName: platform.name,
                                icon: platform.icon,
                                processCount: 1,
                                memoryKB: Math.round((p.WS || 0) / 1024),
                                mainPid: p.Id,
                                windowTitle: p.Title || "",
                            });
                        });
                    }
                }

                resolve(agents);
            } catch (e) {
                resolve([]);
            }
        });
    });
}

/** Check temp directory for recent tool outputs */
async function readRecentActivity() {
    try {
        const dirs = await fsp.readdir(TEMP_DIR);
        const activity = [];

        for (const dir of dirs) {
            try {
                const stat = await fsp.stat(path.join(TEMP_DIR, dir));
                activity.push({
                    project: dir,
                    lastModified: stat.mtimeMs,
                    isActive: (Date.now() - stat.mtimeMs) < 60000,
                });
            } catch (e) {}
        }

        activity.sort((a, b) => b.lastModified - a.lastModified);
        return activity;
    } catch (e) {
        return [];
    }
}

// ── File Watchers (debounced) ────────────────────────────────

function debouncedPoll() {
    if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
    watchDebounceTimer = setTimeout(() => {
        watchDebounceTimer = null;
        pollAndBroadcast();
    }, 300);
}

function watchSessions() {
    if (!fs.existsSync(SESSIONS_DIR)) return;
    try {
        fs.watch(SESSIONS_DIR, { persistent: false }, (eventType, filename) => {
            if (filename && filename.endsWith(".json")) {
                debouncedPoll();
            }
        });
    } catch (e) {
        console.log("[WATCH] Could not watch sessions directory");
    }
}

function watchTasks() {
    if (!fs.existsSync(TASKS_DIR)) return;
    try {
        fs.watch(TASKS_DIR, { recursive: true, persistent: false }, (eventType, filename) => {
            if (filename) debouncedPoll();
        });
    } catch (e) {
        console.log("[WATCH] Could not watch tasks directory");
    }
}

function watchHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return;
    try {
        fs.watch(HISTORY_FILE, { persistent: false }, () => {
            debouncedPoll();
        });
    } catch (e) {
        console.log("[WATCH] Could not watch history file");
    }
}

function watchTempDir() {
    if (!fs.existsSync(TEMP_DIR)) return;
    try {
        fs.watch(TEMP_DIR, { recursive: true, persistent: false }, () => {
            debouncedPoll();
        });
    } catch (e) {
        console.log("[WATCH] Could not watch temp directory");
    }
}

// ── Main Poll Loop ───────────────────────────────────────────
async function pollAndBroadcast() {
    // Guard: skip if previous poll is still running
    if (polling) return;
    polling = true;

    try {
        const claudeDirExists = fs.existsSync(CLAUDE_DIR);

        // Phase 1: fast local file reads (never slow)
        const [sessions, tasks, history, config, activity] = await Promise.all([
            readSessions(),
            readTasks(),
            readHistory(100),
            readClaudeConfig(),
            readRecentActivity(),
        ]);

        // Phase 2: slow external calls (PowerShell) — with timeout + fallback to cache
        const sessionPids = sessions.map(s => s._pid).filter(Boolean);

        const withTimeout = (promise, ms) =>
            Promise.race([promise, new Promise(r => setTimeout(() => r(null), ms))]);

        const [processResult, externalResult, codexCtxResult, cursorFoldersResult] = await Promise.all([
            withTimeout(readProcesses(sessionPids), 5000),
            withTimeout(readExternalAIs(), 5000),
            withTimeout(readCodexContext(), 3000),
            withTimeout(readCursorWorkspaces(), 1000),
        ]);

        const codexCtx = codexCtxResult || { threads: [], activeSessions: [] };
        const cursorFolders = Array.isArray(cursorFoldersResult) ? cursorFoldersResult : [];

        // Use fresh result if available, otherwise fall back to cached
        const processes = processResult ?? lastGoodProcesses;
        const externalAIs = externalResult ?? lastGoodExternalAIs;
        if (processResult) lastGoodProcesses = processResult;
        if (externalResult) lastGoodExternalAIs = externalResult;

        // Extract latest prompts from history for each session
        const latestPrompts = extractLatestPrompts(history);

        // Build agent state
        const agents = sessions.map(session => {
            const proc = processes.find(p => p.pid === session._pid);
            const isRunning = !!proc;
            const sessionTasks = findTasksForSession(tasks, session.sessionId, session.cwd);

            const cwd = session.cwd || session.workingDirectory || "";
            const projectName = cwd.split(/[/\\]/).filter(Boolean).pop() || "unknown";

            // Get latest prompt for this session from history
            const latestPrompt = latestPrompts.get(session.sessionId);

            // Detect activity from multiple signals
            const tempActivity = activity.find(a =>
                cwd && a.project.toLowerCase().includes(
                    projectName.toLowerCase().replace(/[^a-z0-9]/gi, "-")
                )
            );
            const hasActiveTasks = sessionTasks.some(t => t.status === "in_progress");
            const hasTempActivity = tempActivity && tempActivity.isActive; // temp dir modified <1min
            const sessionFresh = session._mtime && (Date.now() - session._mtime) < 120000; // session file modified <2min
            const memKB = proc ? proc.memoryKB : 0;
            const prevMem = prevMemory[session._pid] || 0;
            const memChanged = proc && prevMem > 0 && Math.abs(memKB - prevMem) > 5000; // >5MB change = active
            if (proc) prevMemory[session._pid] = memKB;

            // Also consider recent prompt as activity signal.
            // history.jsonl entries 는 timestamp 가 ISO string 일 수 있어 Number 변환 필요 —
            // 안 그러면 (Date.now() - "2026-05-19T...") = NaN → < 300000 false → 신호 누락
            const promptTs = latestPrompt
                ? (typeof latestPrompt.timestamp === "number"
                    ? latestPrompt.timestamp
                    : Date.parse(latestPrompt.timestamp))
                : 0;
            const hasRecentPrompt = Number.isFinite(promptTs) && (Date.now() - promptTs) < 300000; // <5min
            const isActive = hasTempActivity || sessionFresh || memChanged || hasRecentPrompt;

            // ── Role: majority-vote with sticky hold ──
            const sid = session.sessionId;
            if (!stickyState[sid]) stickyState[sid] = { role: "developer", roleVotes: {}, status: "idle", statusHoldUntil: 0 };
            const sticky = stickyState[sid];

            const promptLowerForRole = (latestPrompt?.prompt || "").toLowerCase();
            let candidateRole = "developer";
            if (/계획|설계|기획|plan|구조|아키텍처|architect/.test(promptLowerForRole)) {
                candidateRole = "planner";
            } else if (/테스트|검증|qa|test|버그|bug|감사|audit/.test(promptLowerForRole)) {
                candidateRole = "qa";
            } else if (/디자인|css|스타일|ui|ux|레이아웃|color|font|tailwind/.test(promptLowerForRole)) {
                candidateRole = "designer";
            } else if (/검토|리뷰|review|확인|점검|코드리뷰/.test(promptLowerForRole)) {
                candidateRole = "reviewer";
            }

            // Accumulate votes; only switch when candidate reaches threshold
            sticky.roleVotes[candidateRole] = (sticky.roleVotes[candidateRole] || 0) + 1;
            if (candidateRole !== sticky.role) {
                // Switch only if new role has ROLE_HOLD_VOTES more than current
                if ((sticky.roleVotes[candidateRole] || 0) >= ROLE_HOLD_VOTES &&
                    (sticky.roleVotes[candidateRole] || 0) > (sticky.roleVotes[sticky.role] || 0)) {
                    sticky.role = candidateRole;
                    // Reset all votes on switch so next switch also needs evidence
                    sticky.roleVotes = { [candidateRole]: ROLE_HOLD_VOTES };
                }
            }
            const role = sticky.role;

            // needsReview: only when at least 2 of last keywords match
            const reviewKeywords = (promptLowerForRole.match(/검토|확인|리뷰|봐주|부탁|완료|done|check|review/g) || []);
            const needsReview = reviewKeywords.length >= 2;

            // ── Status: with hold timer to prevent rapid flicker ──
            const now = Date.now();
            let candidateStatus;
            if (!isRunning) {
                candidateStatus = "offline";
            } else if (isActive) {
                if (/검토|리뷰|review|check|확인|검증/.test(promptLowerForRole)) {
                    candidateStatus = "reviewing";
                } else if (/검색|찾아|search|find|grep|어디/.test(promptLowerForRole)) {
                    candidateStatus = "searching";
                } else {
                    candidateStatus = "coding";
                }
            } else if (hasActiveTasks) {
                candidateStatus = "thinking";
            } else {
                candidateStatus = "idle";
            }

            // Status hold: upgrading (idle→coding) is instant; downgrading (coding→idle) requires hold period
            const statusRank = { offline: 0, idle: 1, thinking: 2, searching: 3, reviewing: 3, coding: 4 };
            const curRank = statusRank[sticky.status] ?? 1;
            const newRank = statusRank[candidateStatus] ?? 1;

            let status;
            if (candidateStatus === "offline") {
                status = "offline"; // always honor offline immediately
            } else if (newRank >= curRank) {
                // Upgrade or same: apply immediately, reset hold
                status = candidateStatus;
                sticky.statusHoldUntil = now + STATUS_HOLD_MS;
            } else if (now < sticky.statusHoldUntil) {
                // Downgrade but hold period not elapsed: keep current
                status = sticky.status;
            } else {
                // Hold period elapsed: allow downgrade
                status = candidateStatus;
            }
            sticky.status = status;

            const currentTask = sessionTasks.find(t => t.status === "in_progress");
            const completedCount = sessionTasks.filter(t => t.status === "completed").length;
            const totalCount = sessionTasks.length;
            const signalSources = [
                { key: "session", label: "session", ts: session._mtime },
                { key: "process", label: "process", ts: proc ? Date.now() : 0 },
                { key: "history", label: "history", ts: latestPrompt?.timestamp },
                { key: "task", label: "task", ts: sessionTasks.length > 0 ? session._mtime : 0 },
            ].filter(source => Number.isFinite(Number(source.ts)) && Number(source.ts) > 0);
            const lastActivityAt = Math.max(
                0,
                Number(session._mtime) || 0,
                Number(latestPrompt?.timestamp) || 0
            );
            const lastSeenAt = Math.max(0, ...signalSources.map(source => Number(source.ts) || 0));

            return {
                pid: session._pid,
                sessionId: session.sessionId,
                platform: "claude",
                platformName: "Claude Code",
                role,
                needsReview,
                projectName,
                cwd,
                isRunning,
                memoryMB: proc ? Math.round(proc.memoryKB / 1024 / 10) * 10 : 0,
                status,
                currentTask: currentTask ? {
                    id: currentTask._taskId,
                    subject: currentTask.subject,
                    description: currentTask.description,
                    status: currentTask.status,
                } : null,
                // Current work: from latest prompt (real-time) — this is what user is actually doing
                currentWork: latestPrompt ? {
                    prompt: latestPrompt.prompt,
                    timestamp: latestPrompt.timestamp,
                } : null,
                tasks: sessionTasks.map(t => ({
                    id: t._taskId || t.id,
                    subject: t.subject,
                    description: t.description,
                    activeForm: t.activeForm,
                    status: t.status,
                    blocks: t.blocks || [],
                    blockedBy: t.blockedBy || [],
                })),
                completedTasks: completedCount,
                totalTasks: totalCount,
                startTime: session.startedAt || session.startTime,
                signals: {
                    sources: signalSources.map(source => source.key),
                    lastSeenAt,
                    lastActivityAt,
                },
            };
        });

        // Filter: hide offline agents whose sessions are stale
        const THREE_HOURS = 3 * 60 * 60 * 1000;
        const FIVE_MIN = 5 * 60 * 1000;
        const filteredAgents = agents.filter(a => {
            if (a.isRunning) return true; // always show running agents

            const session = sessions.find(s => s._pid === a.pid);

            // Session file was recently modified (written to within 5 min) → likely still active
            if (session && session._mtime && (Date.now() - session._mtime) < FIVE_MIN) return true;

            // Session started within the last 3 hours → show as offline
            const startedAt = a.startTime || (session && session.startedAt);
            if (startedAt && (Date.now() - startedAt) < THREE_HOURS) return true;

            return false; // hide stale offline sessions
        });

        // Convert external AIs into agent format with stabilized activity detection
        const EXT_ACTIVE_HOLD_MS = 15000; // hold "coding" for 15s after last activity signal
        const externalAgents = externalAIs.flatMap(ext => {
            if (ext.platform === "codex" && codexCtx.activeSessions.length > 0) {
                const nowMs = Date.now();
                const sessionsForCodex = [...codexCtx.activeSessions]
                    .filter(session => nowMs - (Number(session.mtime) || 0) < CODEX_VISIBLE_MS)
                    .sort((a, b) => b.mtime - a.mtime);
                if (sessionsForCodex.length === 0) return [];
                const threadById = new Map(codexCtx.threads.filter(t => t.id).map(t => [t.id, t]));
                const perSessionMemKB = Math.max(0, Math.round((ext.memoryKB || 0) / Math.max(1, sessionsForCodex.length)));

                return sessionsForCodex.map((session, index) => {
                    const pid = `ext-codex-${session.id || index}`;
                    if (!extPrevState[pid]) extPrevState[pid] = { status: "idle", windowTitle: "", lastActiveAt: 0 };
                    const prev = extPrevState[pid];

                    const prevMem = prevMemory[pid] || 0;
                    const memChanged = prevMem > 0 && Math.abs(perSessionMemKB - prevMem) > 5000;
                    prevMemory[pid] = perSessionMemKB;

                    const thread = threadById.get(session.id) || null;
                    const threadUpdatedAt = Number(thread?._updatedAtMs) || 0;
                    const latestSignalAt = Math.max(Number(session.mtime) || 0, threadUpdatedAt);
                    if ((latestSignalAt && nowMs - latestSignalAt < 60000) || memChanged) {
                        prev.lastActiveAt = nowMs;
                    }

                    const isRecentlyActive = (nowMs - prev.lastActiveAt) < EXT_ACTIVE_HOLD_MS;
                    const status = isRecentlyActive ? "coding" : (prev.status === "coding" ? "idle" : prev.status || "idle");
                    prev.status = status;

                    const cwd = session.cwd || "";
                    const projectName = cwd.split(/[/\\]/).filter(Boolean).pop() || session.agentNickname || ext.platformName;
                    const currentWorkText = thread?.thread_name || session.agentNickname || projectName;
                    const signalSources = [
                        { key: "process", ts: nowMs },
                        { key: "codex", ts: session.mtime },
                        { key: "thread", ts: threadUpdatedAt },
                        { key: "memory", ts: memChanged ? nowMs : 0 },
                    ].filter(source => Number.isFinite(Number(source.ts)) && Number(source.ts) > 0);
                    const lastActivityAt = Math.max(0, Number(prev.lastActiveAt) || 0, latestSignalAt || 0);
                    const lastSeenAt = Math.max(0, ...signalSources.map(source => Number(source.ts) || 0));

                    return {
                        pid,
                        sessionId: session.id,
                        platform: "codex",
                        platformName: "OpenAI Codex",
                        platformIcon: ext.icon,
                        role: session.agentRole || "developer",
                        projectName,
                        cwd,
                        isRunning: true,
                        memoryMB: Math.round(perSessionMemKB / 1024 / 10) * 10,
                        status,
                        currentTask: null,
                        currentWork: currentWorkText ? {
                            prompt: currentWorkText,
                            timestamp: threadUpdatedAt || session.mtime || 0,
                        } : null,
                        tasks: [],
                        completedTasks: 0,
                        totalTasks: 0,
                        processCount: ext.processCount,
                        signals: {
                            sources: signalSources.map(source => source.key),
                            lastSeenAt,
                            lastActivityAt,
                        },
                    };
                });
            }

            const pid = ext.pid;
            if (!extPrevState[pid]) extPrevState[pid] = { status: "idle", windowTitle: "", lastActiveAt: 0 };
            const prev = extPrevState[pid];

            const memKB = ext.memoryKB;
            const prevMem = prevMemory[pid] || 0;
            const memChanged = prevMem > 0 && Math.abs(memKB - prevMem) > 5000;
            prevMemory[pid] = memKB;

            let projectName = ext.platformName;
            let cwd = "";
            let currentWorkText = "";

            if (ext.platform === "codex") {
                const latestSession = codexCtx.activeSessions
                    .sort((a, b) => b.mtime - a.mtime)[0];
                if (latestSession) {
                    cwd = latestSession.cwd || "";
                    projectName = cwd.split(/[/\\]/).filter(Boolean).pop() || ext.platformName;
                }
                const latestThread = codexCtx.threads[codexCtx.threads.length - 1];
                if (latestThread) currentWorkText = latestThread.thread_name;

                // Codex activity: session file was modified recently
                if (latestSession && (Date.now() - latestSession.mtime) < 60000) {
                    prev.lastActiveAt = Date.now();
                }
            } else if (ext.platform === "cursor") {
                if (ext.windowTitle) {
                    const parts = ext.windowTitle.split(/\s*[-–—]\s*/);
                    if (parts.length >= 3) {
                        currentWorkText = parts[0].trim();
                        projectName = parts[1].trim();
                    } else if (parts.length === 2) {
                        projectName = parts[0].trim();
                    }
                }
                if (cursorFolders.length > 0) cwd = cursorFolders.join(", ");

                // Cursor activity: window title changed (user switched files)
                if (ext.windowTitle && ext.windowTitle !== prev.windowTitle) {
                    prev.lastActiveAt = Date.now();
                    prev.windowTitle = ext.windowTitle;
                }
            } else if (ext.windowTitle) {
                const parts = ext.windowTitle.split(/\s*[-–—]\s*/);
                if (parts.length > 1) projectName = parts[0].trim().substring(0, 30) || ext.platformName;
                if (ext.windowTitle !== prev.windowTitle) {
                    prev.lastActiveAt = Date.now();
                    prev.windowTitle = ext.windowTitle;
                }
            }

            // Memory spike also counts as activity
            if (memChanged) prev.lastActiveAt = Date.now();

            // Status: "coding" if any activity signal within hold window, otherwise keep previous or "idle"
            const isRecentlyActive = (Date.now() - prev.lastActiveAt) < EXT_ACTIVE_HOLD_MS;
            let status;
            if (isRecentlyActive) {
                status = "coding";
            } else if (prev.status === "coding") {
                // Grace period expired → downgrade to idle
                status = "idle";
            } else {
                status = prev.status || "idle";
            }
            prev.status = status;

            const memMB = Math.round(memKB / 1024 / 10) * 10;
            const currentWorkAt = ext.platform === "codex" && codexCtx.activeSessions.length
                ? codexCtx.activeSessions[0].mtime
                : 0;
            const signalSources = [
                { key: "process", ts: Date.now() },
                { key: "window", ts: ext.windowTitle ? Date.now() : 0 },
                { key: "codex", ts: ext.platform === "codex" ? currentWorkAt : 0 },
                { key: "cursor", ts: ext.platform === "cursor" && cursorFolders.length > 0 ? Date.now() : 0 },
                { key: "memory", ts: memChanged ? Date.now() : 0 },
            ].filter(source => Number.isFinite(Number(source.ts)) && Number(source.ts) > 0);
            const lastActivityAt = Math.max(0, Number(prev.lastActiveAt) || 0, Number(currentWorkAt) || 0);
            const lastSeenAt = Math.max(0, ...signalSources.map(source => Number(source.ts) || 0));

            return {
                pid,
                platform: ext.platform,
                platformName: ext.platformName,
                platformIcon: ext.icon,
                projectName,
                cwd,
                isRunning: true,
                memoryMB: memMB,
                status,
                currentTask: null,
                currentWork: currentWorkText ? {
                    prompt: currentWorkText,
                    timestamp: currentWorkAt,
                } : null,
                tasks: [],
                completedTasks: 0,
                totalTasks: 0,
                processCount: ext.processCount,
                signals: {
                    sources: signalSources.map(source => source.key),
                    lastSeenAt,
                    lastActivityAt,
                },
            };
        });

        // Merge Claude + external agents
        const allAgents = [...filteredAgents, ...externalAgents];

        // 메모리 누수 방지 — 사라진 PID 의 prev 상태 정리.
        // 오래 띄워둔 서버에서 ext-codex-${uuid} 같은 외부 세션 keyspace 가 무제한 늘어나던 문제.
        const livePidSet = new Set(allAgents.map(a => String(a.pid)));
        for (const key of Object.keys(prevMemory)) {
            if (!livePidSet.has(key)) delete prevMemory[key];
        }
        for (const key of Object.keys(extPrevState)) {
            if (!livePidSet.has(key)) delete extPrevState[key];
        }
        // stickyState 는 sessionId 키 — 살아있는 세션 ID 들 모아 비교
        const liveSidSet = new Set(allAgents.map(a => String(a.sessionId || "")).filter(Boolean));
        for (const sid of Object.keys(stickyState)) {
            if (!liveSidSet.has(sid)) delete stickyState[sid];
        }

        const diagnostics = {
            lastPollAt: Date.now(),
            pollInterval: POLL_INTERVAL,
            claudeDirExists,
            sessionCount: sessions.length,
            visibleClaudeCount: filteredAgents.length,
            processCount: processes.length,
            externalCount: externalAIs.length,
            codexSessionCount: codexCtx.activeSessions.length,
            codexThreadCount: codexCtx.threads.length,
            cursorWorkspaceCount: cursorFolders.length,
            detectorStatus: {
                processes: processResult === null ? "cached" : "fresh",
                external: externalResult === null ? "cached" : "fresh",
                codex: codexCtxResult === null ? "timeout" : "fresh",
                cursor: cursorFoldersResult === null ? "timeout" : "fresh",
            },
        };
        lastDiagnostics = diagnostics;

        // Debug log: show detected agents (suppressed in quiet mode)
        const prevCount = lastState?.agents?.length ?? -1;
        if (!QUIET && allAgents.length !== prevCount) {
            console.log(`[POLL] ${processes.length} claude + ${externalAIs.length} external → ${allAgents.length} agents`);
            allAgents.forEach(a => {
                console.log(`  → [${a.platform}] ${a.pid} | ${a.projectName} | ${a.status} | mem=${a.memoryMB}MB`);
            });
        }

        const state = {
            agents: allAgents,
            totalProcesses: processes.length,
            totalSessions: sessions.length,
            claudeDirExists,
            diagnostics,
            config: config ? {
                numStartups: config.numStartups,
                projectCount: Object.keys(config.projects || {}).length,
            } : null,
        };

        // Diff: only broadcast when meaningful state changed.
        // Compare a stable fingerprint that excludes volatile heartbeat fields.
        const stateJSON = JSON.stringify({
            ...state,
            diagnostics: { ...diagnostics, lastPollAt: 0 },
        });
        if (stateJSON !== lastStateJSON) {
            lastState = state;
            lastStateJSON = stateJSON;
            broadcast({ type: "full_state", data: state });
        }
    } catch (err) {
        console.error("[POLL] Error:", err.message);
    } finally {
        polling = false;
    }
}

function findTasksForSession(allTasks, sessionId, cwd) {
    // Only exact sessionId match — no stale cross-session fallback
    if (allTasks[sessionId] && allTasks[sessionId].length > 0) {
        return allTasks[sessionId];
    }
    return [];
}

// ── Start ────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log("");
    console.log("  ╔══════════════════════════════════════╗");
    console.log("  ║   AI TYCOON — Pixel Agent Office     ║");
    console.log(`  ║   v${VERSION.padEnd(34)}║`);
    console.log("  ║                                      ║");
    console.log(`  ║   http://localhost:${PORT}              ║`);
    console.log("  ║   WebSocket: ws://localhost:" + PORT + "     ║");
    console.log("  ║                                      ║");
    console.log("  ║   Monitoring Claude Code agents...   ║");
    console.log("  ╚══════════════════════════════════════╝");
    console.log("");
    console.log(`  Claude Dir: ${CLAUDE_DIR}`);
    console.log(`  Sessions:   ${SESSIONS_DIR}`);
    console.log(`  Tasks:      ${TASKS_DIR}`);
    console.log(`  Platform:   ${process.platform} · Node ${process.version}`);
    console.log("");

    pollAndBroadcast();
    pollTimer = setInterval(pollAndBroadcast, POLL_INTERVAL);
    startHeartbeat();
    watchSessions();
    watchTasks();
    watchHistory();
    watchTempDir();
});

// ── Graceful shutdown ────────────────────────────────────────
function gracefulShutdown(signal) {
    if (isShuttingDown) return; // idempotent: double Ctrl+C shouldn't crash
    isShuttingDown = true;
    console.log(`\n[SERVER] ${signal} received, shutting down gracefully...`);

    // 1. Stop background loops so we don't fire new broadcasts mid-shutdown
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (watchDebounceTimer) { clearTimeout(watchDebounceTimer); watchDebounceTimer = null; }

    // 2. Notify all connected clients so the UI can show a friendly toast
    const farewell = JSON.stringify({
        type: "server_shutdown",
        ts: Date.now(),
        message: "서버가 잠시 후 종료됩니다. 곧 다시 연결을 시도할게요.",
    });
    clients.forEach(ws => {
        try {
            safeSend(ws, farewell);
            ws.close(1001, "Server shutting down");
        } catch (e) { /* ignore */ }
    });

    // 3. Close the WS + HTTP server, then exit
    wss.close(() => {
        httpServer.close(() => {
            console.log("[SERVER] All connections closed. Bye! 👋");
            process.exit(0);
        });
    });

    // 4. Force-exit safeguard if something hangs (e.g. lingering sockets)
    setTimeout(() => {
        console.warn("[SERVER] Forced shutdown after 3s timeout.");
        process.exit(1);
    }, 3000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Catch uncaught errors so the process doesn't die silently
process.on("uncaughtException", (err) => {
    console.error("[SERVER] Uncaught exception:", err);
    gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    console.error("[SERVER] Unhandled rejection:", reason);
});
