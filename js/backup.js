// ============================================================
//  AI TYCOON — Backup / Restore (localStorage state, JSON)
// ============================================================
//
// Bundles all persisted preferences + stats + achievements into a
// single JSON file the user can download, then re-upload to a new
// machine / browser to restore.
//
// Covered keys (every "ai-tycoon-*" entry):
//   • Visual prefs: theme, dark, pixi-density, time-override, season
//   • Sound + lang + notify + demo + welcomed flag
//   • Daily stats history (14 days)
//   • Achievement unlocks + seen set
//   • Filter / sort / pin preferences

const KEY_PREFIX = "ai-tycoon-";

function collectKeys() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_PREFIX)) {
            out[k] = localStorage.getItem(k);
        }
    }
    return out;
}

export function buildBackup() {
    return {
        format: "ai-tycoon-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: collectKeys(),
    };
}

export function downloadBackup() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `ai-tycoon-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 250);
    return true;
}

export function restoreFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || "{}"));
                if (parsed.format !== "ai-tycoon-backup") {
                    reject(new Error("Not an AI Tycoon backup file"));
                    return;
                }
                if (!parsed.data || typeof parsed.data !== "object") {
                    reject(new Error("Malformed backup payload"));
                    return;
                }
                // Wipe existing ai-tycoon-* keys first
                const toDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(KEY_PREFIX)) toDelete.push(k);
                }
                toDelete.forEach(k => localStorage.removeItem(k));
                // Apply
                Object.entries(parsed.data).forEach(([k, v]) => {
                    if (typeof k === "string" && k.startsWith(KEY_PREFIX) && typeof v === "string") {
                        localStorage.setItem(k, v);
                    }
                });
                resolve(Object.keys(parsed.data).length);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

if (typeof window !== "undefined") {
    window.aiTycoonBackup = {
        build: buildBackup,
        download: downloadBackup,
        restore: restoreFromFile,
    };
}
