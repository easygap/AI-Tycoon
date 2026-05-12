// ============================================================
//  AI TYCOON — Konami code easter egg
// ============================================================
//
// Press ↑ ↑ ↓ ↓ ← → ← → B A anywhere on the page to unlock the
// "Hidden" achievement and trigger a celebratory office party
// (confetti burst at the center of the screen).

const SEQUENCE = [
    "ArrowUp", "ArrowUp",
    "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight",
    "ArrowLeft", "ArrowRight",
    "b", "a",
];

let cursor = 0;

function spawnPartyConfetti() {
    if (typeof document === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const layer = document.getElementById("confetti-layer") || (() => {
        const el = document.createElement("div");
        el.id = "confetti-layer";
        el.className = "confetti-layer";
        document.body.appendChild(el);
        return el;
    })();
    const colors = ["#ff8a4c", "#10b981", "#3b82f6", "#facc15", "#ec4899", "#a855f7", "#06b6d4", "#f97316"];
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2;
    // Bigger burst than achievement: 60 pieces
    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.4;
        const dist = 120 + Math.random() * 180;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist + 80;
        piece.style.left = `${originX}px`;
        piece.style.top = `${originY}px`;
        piece.style.background = colors[i % colors.length];
        piece.style.setProperty("--tx", `${tx}px`);
        piece.style.setProperty("--ty", `${ty}px`);
        piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 1080}deg`);
        piece.style.setProperty("--dur", `${1.2 + Math.random() * 0.7}s`);
        piece.style.animationDelay = `${i * 6}ms`;
        layer.appendChild(piece);
        setTimeout(() => piece.remove(), 2200);
    }
}

function flashEgg() {
    if (typeof document === "undefined") return;
    const lang = (window.aiTycoonI18n?.getLang?.()) || "ko";
    // Use the toast system if available
    if (window.aiTycoonToasts?.show) {
        const title = lang === "en" ? "🎮 Konami unlocked!" : "🎮 코나미 해제!";
        const body = lang === "en" ? "Hidden achievement: Party time" : "히든 업적: 파티 타임";
        window.aiTycoonToasts.show("info", title, body);
    }
    spawnPartyConfetti();
    // Mark the hidden achievement
    if (window.aiTycoonAchievements) {
        try {
            const raw = localStorage.getItem("ai-tycoon-achievements-v1");
            const blob = raw ? JSON.parse(raw) : { unlocked: {}, counters: {} };
            blob.counters = blob.counters || {};
            blob.counters.konami = true;
            localStorage.setItem("ai-tycoon-achievements-v1", JSON.stringify(blob));
            window.aiTycoonAchievements.check();
        } catch { /* ignore */ }
    }
    // Subtle screen tilt for a moment
    document.body.classList.add("konami-flash");
    setTimeout(() => document.body.classList.remove("konami-flash"), 1200);
}

function matches(key, expected) {
    return key.toLowerCase() === expected.toLowerCase();
}

if (typeof window !== "undefined") {
    document.addEventListener("keydown", (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
        const next = SEQUENCE[cursor];
        if (matches(event.key, next)) {
            cursor++;
            if (cursor >= SEQUENCE.length) {
                cursor = 0;
                flashEgg();
            }
        } else {
            // Wrong key — restart the cursor (but allow the new key to match the first slot)
            cursor = matches(event.key, SEQUENCE[0]) ? 1 : 0;
        }
    });
    window.aiTycoonKonami = { trigger: flashEgg };
}
