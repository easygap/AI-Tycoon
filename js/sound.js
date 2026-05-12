// ============================================================
//  AI TYCOON — Subtle Web Audio sound effects (optional)
// ============================================================
//
// Plays small synthesized tones for agent join, task done, etc.
// Off by default — user opts in via the speaker toggle in the header.

const KEY = "ai-tycoon-sound";
const VOL_KEY = "ai-tycoon-sound-volume";
let ctx = null;
let enabled = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) === "true";
let userInteracted = false;
const listeners = new Set();
const volumeListeners = new Set();

let volume = 0.6;
try {
    const v = typeof localStorage !== "undefined" && localStorage.getItem(VOL_KEY);
    if (v != null) {
        const n = parseFloat(v);
        if (Number.isFinite(n)) volume = Math.max(0, Math.min(1, n));
    }
} catch { /* ignore */ }

export function getSoundVolume() { return volume; }
export function setSoundVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    try { localStorage.setItem(VOL_KEY, String(volume)); } catch { /* ignore */ }
    volumeListeners.forEach(fn => { try { fn(volume); } catch { /* ignore */ } });
}
export function onSoundVolumeChange(fn) { volumeListeners.add(fn); return () => volumeListeners.delete(fn); }

export function isSoundEnabled() { return enabled; }

export function setSoundEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(KEY, enabled ? "true" : "false"); } catch { /* ignore */ }
    listeners.forEach(fn => { try { fn(enabled); } catch { /* ignore */ } });
    if (enabled) {
        // Play a soft confirmation chord so user knows it's on
        playChord([523.25, 659.25], 0.18, "sine", 0.1);
    }
}

export function toggleSound() { setSoundEnabled(!enabled); }

export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function ensureCtx() {
    if (!enabled) return null;
    if (!userInteracted) return null;
    if (!ctx) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        } catch { return null; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}

// Track first user interaction to bypass autoplay restrictions
if (typeof window !== "undefined") {
    const markInteract = () => {
        userInteracted = true;
        window.removeEventListener("click", markInteract);
        window.removeEventListener("keydown", markInteract);
        window.removeEventListener("touchstart", markInteract);
    };
    window.addEventListener("click", markInteract, { passive: true });
    window.addEventListener("keydown", markInteract, { passive: true });
    window.addEventListener("touchstart", markInteract, { passive: true });
}

function playTone(freq, duration = 0.15, type = "sine", gain = 0.08, attack = 0.01, release = 0.08) {
    const audio = ensureCtx();
    if (!audio) return;
    try {
        const osc = audio.createOscillator();
        const g = audio.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const now = audio.currentTime;
        const peak = gain * volume;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(peak, now + attack);
        g.gain.linearRampToValueAtTime(0.0001, now + duration);
        osc.connect(g).connect(audio.destination);
        osc.start(now);
        osc.stop(now + duration + release);
    } catch (err) {
        void err;
    }
}

function playChord(freqs, duration = 0.2, type = "sine", gain = 0.06) {
    freqs.forEach((f, i) => {
        setTimeout(() => playTone(f, duration, type, gain), i * 50);
    });
}

// ── Public sound events ──
export function sfxJoin() {
    playChord([523.25, 659.25, 783.99], 0.16, "sine", 0.07);
}
export function sfxLeave() {
    playChord([783.99, 587.33], 0.18, "sine", 0.06);
}
export function sfxTaskDone() {
    playChord([659.25, 783.99, 987.77], 0.22, "triangle", 0.07);
}
export function sfxReview() {
    playTone(880, 0.12, "triangle", 0.06);
    setTimeout(() => playTone(659.25, 0.16, "triangle", 0.05), 100);
}
export function sfxClick() {
    playTone(1200, 0.04, "square", 0.025);
}

if (typeof window !== "undefined") {
    window.aiTycoonSound = {
        isEnabled: isSoundEnabled,
        toggle: toggleSound,
        setEnabled: setSoundEnabled,
        getVolume: getSoundVolume,
        setVolume: setSoundVolume,
        sfxJoin, sfxLeave, sfxTaskDone, sfxReview, sfxClick,
    };
}
