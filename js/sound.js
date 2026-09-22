// Original electric-piano score and contextual cues, synthesized locally.
import { cueFor, scoreFor, sceneFor } from "./soundScore.js";

function read(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, String(value)); } catch { /* private mode */ } }
const clamp = v => Math.max(0, Math.min(1, Number(v) || 0));
let enabled = read("ai-tycoon-sound", "false") === "true";
let volume = clamp(read("ai-tycoon-sound-volume", "0.45"));
let musicEnabled = read("ai-tycoon-music", "false") === "true";
let musicVolume = clamp(read("ai-tycoon-music-volume", "0.35"));
let mood = read("ai-tycoon-music-mood", "auto");
if (!["auto", "day", "night"].includes(mood)) mood = "auto";
let muted = false, interacted = false;
let ctx, master, effects, music, echo, echoGain, timer;
let step = 0, nextNote = 0, lastCueAt = -Infinity, lastPriority = 0;
let scene = { hour: 12, active: 0, working: 0, review: 0 };
const voices = new Set();
const listeners = new Set(), volumeListeners = new Set(), musicListeners = new Set();
const lastKind = new Map();
let pendingCue = null, cueTimer = null;
const emit = list => list.forEach(fn => { try { fn(); } catch { /* listener isolation */ } });
const visible = () => typeof document === "undefined" || !document.hidden;

function ensureCtx() {
    if (!interacted || !visible()) return null;
    if (!ctx) {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 6;
            master.connect(limiter).connect(ctx.destination);
            effects = ctx.createGain(); effects.connect(master);
            music = ctx.createGain(); music.connect(master);
            echo = ctx.createDelay(1); echo.delayTime.value = 0.28;
            echoGain = ctx.createGain(); echoGain.gain.value = 0.18;
            music.connect(echo); echo.connect(echoGain); echoGain.connect(master);
            syncLevels(true);
        } catch { return null; }
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
}
function ramp(param, value, seconds = 0.12) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now); param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
}
function syncLevels(immediate = false) {
    if (!ctx) return;
    const seconds = immediate ? 0 : 0.14;
    ramp(master.gain, muted ? 0 : 0.72, seconds);
    ramp(effects.gain, enabled ? volume : 0, seconds);
    ramp(music.gain, musicEnabled ? musicVolume * 0.48 : 0, seconds);
}

// Bounded polyphony; every voice disconnects its graph on completion.
function note(midi, when, duration, level, type, bus, pan = 0) {
    if (!ctx || voices.size >= 48) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain(), panner = ctx.createStereoPanner();
    osc.type = type; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12); panner.pan.value = pan;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain).connect(panner).connect(bus);
    voices.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); panner.disconnect(); voices.delete(osc); };
    osc.start(when); osc.stop(when + duration + 0.03);
}
function schedule() {
    if (!musicEnabled || muted || !visible() || !ctx || ctx.state !== "running") return;
    const score = scoreFor(sceneFor(scene, mood)), halfBeat = 30 / score.bpm;
    if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.04;
    while (nextNote < ctx.currentTime + 0.3) {
        const chord = score.chords[Math.floor(step / 16) % score.chords.length], beat = step % 16;
        if (beat === 0 || beat === 8) {
            chord.forEach((m, i) => {
                note(m, nextNote + i * 0.028, halfBeat * 7, 0.075, "sine", music, (i - 1.5) * 0.18);
                note(m + 12, nextNote + i * 0.028, halfBeat * 2.5, 0.012, "sine", music, (i - 1.5) * 0.18);
            });
            note(chord[0] - 24, nextNote, halfBeat * 5, 0.13, "sine", music);
        }
        if (score.melody.includes(beat)) {
            const tone = chord[(Math.floor(step / 2) + Math.floor(step / 16)) % chord.length];
            note(tone + 12, nextNote, halfBeat * 2.2, 0.055, "sine", music, 0.28);
        }
        // Busy scenes add a wooden pulse; review passages leave more space.
        if (scene.working > 2 && !scene.review && beat % 4 === 2) note(42, nextNote, 0.075, 0.045, "triangle", music, -0.25);
        nextNote += halfBeat; step++;
    }
}
function startScheduler() {
    if (timer || !musicEnabled || !ensureCtx()) return;
    nextNote = ctx.currentTime + 0.06; schedule(); timer = setInterval(schedule, 180);
}
function stopScheduler() { if (timer) clearInterval(timer); timer = null; nextNote = 0; }
function unlock(event) {
    if (event && event.isTrusted === false) return;
    interacted = true;
    if (enabled || musicEnabled) { ensureCtx(); startScheduler(); }
}

export function getSoundVolume() { return volume; }
export function setSoundVolume(v) { volume = clamp(v); save("ai-tycoon-sound-volume", volume); syncLevels(); emit(volumeListeners); }
export function isSoundEnabled() { return enabled; }
export function setSoundEnabled(v) {
    enabled = !!v; save("ai-tycoon-sound", enabled);
    if (enabled) ensureCtx(); syncLevels(); emit(listeners);
}
export function toggleSound() { setSoundEnabled(!enabled); if (enabled) playCue("click", true); }
export function onSoundChange(fn) { const cb = () => fn(enabled); listeners.add(cb); return () => listeners.delete(cb); }
export function onSoundVolumeChange(fn) { const cb = () => fn(volume); volumeListeners.add(cb); return () => volumeListeners.delete(cb); }
export function getMusicState() {
    return { enabled: musicEnabled, volume: musicVolume, mood, muted, scene: sceneFor(scene, mood), playing: !!(musicEnabled && !muted && ctx?.state === "running" && visible()), available: !!(window.AudioContext || window.webkitAudioContext) };
}
export function setMusicEnabled(v) {
    musicEnabled = !!v; save("ai-tycoon-music", musicEnabled);
    if (musicEnabled) { ensureCtx(); startScheduler(); } else stopScheduler();
    syncLevels(); emit(musicListeners);
}
export function setMusicVolume(v) { musicVolume = clamp(v); save("ai-tycoon-music-volume", musicVolume); syncLevels(); emit(musicListeners); }
export function setMusicMood(v) { if (!["auto", "day", "night"].includes(v)) return; mood = v; save("ai-tycoon-music-mood", v); emit(musicListeners); }
export function setSoundScene(v) { scene = { ...scene, ...v }; emit(musicListeners); }
export function onMusicChange(fn) { musicListeners.add(fn); return () => musicListeners.delete(fn); }
export function toggleMasterMute() { muted = !muted; syncLevels(); if (!muted) startScheduler(); emit(musicListeners); return muted; }

function playCue(kind, preview = false) {
    if (!enabled || muted || !visible()) return false;
    const cue = cueFor(kind); if (!cue) return false;
    const now = Date.now();
    if (!preview && (now - (lastKind.get(kind) ?? -Infinity) < cue.cooldown || (now - lastCueAt < 750 && cue.priority <= lastPriority))) return false;
    const audio = ensureCtx(); if (!audio) return false;
    lastKind.set(kind, now); lastCueAt = now; lastPriority = cue.priority;
    cue.notes.forEach(([midi, offset, length, gain], i) => note(midi, audio.currentTime + offset, length, gain, cue.wave, effects, (i % 2 ? 1 : -1) * 0.12));
    if (musicEnabled && cue.priority >= 2) {
        ramp(music.gain, musicVolume * 0.14, 0.06);
        music.gain.linearRampToValueAtTime(musicVolume * 0.14, audio.currentTime + 0.65);
        music.gain.linearRampToValueAtTime(musicVolume * 0.48, audio.currentTime + 1.35);
    }
    return true;
}
export function queueWorkCue(event) {
    if (!visible() || !enabled || muted) return;
    const cue = cueFor(event.type); if (!cue) return;
    // A packet may contain dozens of events: play only its most useful cue.
    if (!pendingCue || cue.priority > cueFor(pendingCue).priority) pendingCue = event.type;
    if (!cueTimer) cueTimer = setTimeout(() => { const kind = pendingCue; pendingCue = null; cueTimer = null; playCue(kind); }, 90);
}
export const sfxJoin = () => playCue("join", true);
export const sfxLeave = () => playCue("leave", true);
export const sfxTaskDone = () => playCue("task-done", true);
export const sfxReview = () => playCue("review", true);
export const sfxClick = () => playCue("click");
export const sfxResolve = result => playCue(result === "yes" ? "approve" : "return", true);

if (typeof window !== "undefined") {
    // Capture runs before inline handlers, so the first button press can play.
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopScheduler(); if (cueTimer) clearTimeout(cueTimer); cueTimer = null; pendingCue = null;
            for (const osc of voices) { try { osc.stop(); } catch { /* ended */ } }
            ctx?.suspend().catch(() => {});
        } else if (interacted && (enabled || musicEnabled)) { ensureCtx(); startScheduler(); }
        emit(musicListeners);
    });
    window.addEventListener("pagehide", () => { stopScheduler(); ctx?.suspend().catch(() => {}); });
    window.addEventListener("pageshow", () => { if (interacted && musicEnabled) startScheduler(); });
    window.aiTycoonSound = {
        isEnabled: isSoundEnabled, toggle: toggleSound, setEnabled: setSoundEnabled,
        getVolume: getSoundVolume, setVolume: setSoundVolume, toggleMasterMute,
        sfxJoin, sfxLeave, sfxTaskDone, sfxReview, sfxClick,
        getMusicState, setMusicEnabled, setMusicVolume, setMusicMood,
        debug: () => ({ context: ctx?.state || "locked", voices: voices.size, scheduler: !!timer, step, ...getMusicState() }),
    };
}
