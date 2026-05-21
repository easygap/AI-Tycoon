#!/usr/bin/env node
// 가벼운 syntax 린트 — js/ 와 scripts/ 와 server.js 의 모든 .js 파일을
// node --check 로 한 번씩 돌려본다. ESLint 도입은 과해서 보류, 일단 빠르게
// "구문이라도 깨지지 않았는지" 확인하는 용도.
//
// 사용: npm run lint

const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const exec = promisify(execFile);

const ROOT = path.resolve(__dirname, "..");

function listJsFiles(dir) {
    const out = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            // node_modules, dist 등은 건너뛰기
            if (["node_modules", ".git", "dist", "build"].includes(e.name)) continue;
            out.push(...listJsFiles(full));
        } else if (e.isFile() && e.name.endsWith(".js")) {
            out.push(full);
        }
    }
    return out;
}

async function checkOne(file) {
    try {
        await exec(process.execPath, ["--check", file], { cwd: ROOT });
        return { file, ok: true };
    } catch (err) {
        return { file, ok: false, err: err.stderr || err.message };
    }
}

async function main() {
    const targets = [
        ...listJsFiles(path.join(ROOT, "js")),
        ...listJsFiles(path.join(ROOT, "scripts")),
        path.join(ROOT, "server.js"),
        path.join(ROOT, "sw.js"),
    ].filter(p => fs.existsSync(p));

    process.stdout.write(`Lint ${targets.length} files\n────────────────────────\n`);
    const results = await Promise.all(targets.map(checkOne));
    let failed = 0;
    for (const r of results) {
        const rel = path.relative(ROOT, r.file).replace(/\\/g, "/");
        if (r.ok) {
            process.stdout.write(`✔  ${rel}\n`);
        } else {
            process.stdout.write(`✘  ${rel}\n`);
            process.stdout.write(`   ${(r.err || "").trim().split("\n")[0]}\n`);
            failed++;
        }
    }
    process.stdout.write("────────────────────────\n");
    process.stdout.write(`${targets.length - failed}/${targets.length} files OK\n`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
    process.stderr.write(`Lint crashed: ${err.stack || err.message}\n`);
    process.exit(2);
});
