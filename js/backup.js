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
                // 버전 호환성 — 알 수 없는 미래 버전은 차단해서 기존 데이터 덮어쓰는 사고 방지
                const fileVersion = Number(parsed.version) || 1;
                if (fileVersion > 1) {
                    reject(new Error(`Backup version ${fileVersion} is newer than this app supports. Update AI Tycoon first.`));
                    return;
                }
                // payload 유효성 미리 검증 — string-only 값만 적용 가능
                const entries = Object.entries(parsed.data).filter(([k, v]) =>
                    typeof k === "string" && k.startsWith(KEY_PREFIX) && typeof v === "string"
                );
                if (entries.length === 0) {
                    reject(new Error("Backup contains no AI Tycoon keys"));
                    return;
                }
                // Atomic restore — 기존 ai-tycoon-* 전체를 메모리에 백업 → setItem 모두 성공해야
                // 옛 키 삭제. 중간에 quota 등으로 실패하면 rollback 으로 원상복구.
                const existingKeys = [];
                const snapshotBefore = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(KEY_PREFIX)) {
                        existingKeys.push(k);
                        snapshotBefore[k] = localStorage.getItem(k);
                    }
                }
                const newKeysApplied = [];
                try {
                    // 1) 새 키 모두 write 시도 (옛 키들은 같은 이름이면 덮어쓰기, 다른 이름이면 공존)
                    entries.forEach(([k, v]) => {
                        localStorage.setItem(k, v);
                        newKeysApplied.push(k);
                    });
                    // 2) 새 페이로드에 없는 옛 키들 삭제 (덮어쓰지 못한 잔여 prefs 정리)
                    const newKeySet = new Set(entries.map(([k]) => k));
                    existingKeys.forEach(k => {
                        if (!newKeySet.has(k)) localStorage.removeItem(k);
                    });
                    resolve(entries.length);
                } catch (writeErr) {
                    // Rollback — 방금 쓴 새 키 지우고, 기존 키 원상복구
                    try {
                        newKeysApplied.forEach(k => localStorage.removeItem(k));
                        Object.entries(snapshotBefore).forEach(([k, v]) => {
                            if (typeof v === "string") localStorage.setItem(k, v);
                        });
                    } catch { /* best effort */ }
                    reject(new Error(`Restore failed midway, rolled back: ${writeErr.message || writeErr}`));
                }
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
