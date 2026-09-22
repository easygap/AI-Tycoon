// Lifecycle regressions for optional audio. No device or third-party runner needed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const uri = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
    const scoreUrl = uri(fs.readFileSync(path.join(root, "js/soundScore.js"), "utf8"));
    const { sceneFor, cueFor } = await import(scoreUrl);
    assert.equal(sceneFor({ hour: 13 }), "day");
    assert.equal(sceneFor({ hour: 23 }), "night");
    assert.equal(sceneFor({ hour: 23, review: 2 }), "review");
    assert.equal(sceneFor({ hour: 23, review: 2 }, "day"), "day");
    assert.equal(cueFor("status"), null, "Routine status changes must stay quiet");
    const hooks = {}, storage = new Map(), nodes = [], notes = [];
    let created = 0, audio;
    const param = () => ({ value: 1, cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; } });
    function node() { const n = { gain: param(), frequency: param(), pan: param(), delayTime: param(), threshold: param(), knee: param(), ratio: param(), connect() { return arguments[0]; }, disconnect() {} }; nodes.push(n); return n; }
    class FakeAudio {
        constructor() { created++; audio = this; this.state = "running"; this.currentTime = 0; this.destination = node(); }
        createGain() { return node(); }
        createDynamicsCompressor() { return node(); }
        createDelay() { return node(); }
        createStereoPanner() { return node(); }
        createOscillator() { const n = node(); n.start = () => notes.push(n.frequency.value); n.stop = () => queueMicrotask(() => n.onended?.()); return n; }
        resume() { this.state = "running"; return Promise.resolve(); }
        suspend() { this.state = "suspended"; return Promise.resolve(); }
    }
    global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
    global.window = { AudioContext: FakeAudio, addEventListener: (name, callback) => hooks[name] = callback };
    global.document = { hidden: false, addEventListener: (name, callback) => hooks[name] = callback };
    const source = fs.readFileSync(path.join(root, "js/sound.js"), "utf8").replace('"./soundScore.js"', JSON.stringify(scoreUrl));
    const sound = await import(uri(source));
    sound.setSoundEnabled(true);
    assert.equal(created, 0, "No AudioContext before a user gesture");
    hooks.pointerdown({ isTrusted: true });
    assert.equal(created, 1);
    assert.equal(sound.sfxTaskDone(), true, "The first real gesture unlocks cues");
    await pause(5);
    assert.equal(window.aiTycoonSound.debug().voices, 0, "Ended voices are released");
    sound.setSoundVolume(4); assert.equal(sound.getSoundVolume(), 1);
    sound.setMusicVolume(-2); assert.equal(sound.getMusicState().volume, 0);
    sound.setMusicVolume(.35);
    sound.setMusicEnabled(true);
    assert.equal(window.aiTycoonSound.debug().scheduler, true);
    sound.setMusicEnabled(true);
    assert.equal(created, 1, "Toggling must reuse the audio graph");
    sound.setMusicMood("night"); assert.equal(sound.getMusicState().scene, "night");
    sound.setMusicMood("invalid"); assert.equal(sound.getMusicState().mood, "night");
    const before = notes.length;
    for (let i = 0; i < 30; i++) sound.queueWorkCue({ type: "join" });
    sound.queueWorkCue({ type: "review" });
    await pause(120);
    assert.equal(notes.length - before, cueFor("review").notes.length, "One packet plays one priority cue");
    sound.queueWorkCue({ type: "review" });
    await pause(120);
    assert.equal(notes.length - before, cueFor("review").notes.length, "Repeated alerts are throttled");
    sound.queueWorkCue({ type: "task-done" });
    document.hidden = true; hooks.visibilitychange();
    assert.equal(audio.state, "suspended");
    assert.equal(window.aiTycoonSound.debug().scheduler, false);
    const hiddenCount = notes.length;
    await pause(120); assert.equal(notes.length, hiddenCount, "Hidden pages discard queued cues");
    document.hidden = false; hooks.visibilitychange();
    assert.equal(audio.state, "running");
    assert.equal(window.aiTycoonSound.debug().scheduler, true);
    assert.equal(sound.toggleMasterMute(), true);
    assert.equal(sound.getMusicState().playing, false);
    assert.equal(sound.sfxReview(), false, "Master mute covers effects too");
    sound.toggleMasterMute(); sound.setMusicEnabled(false); sound.setSoundEnabled(false);
    assert.equal(window.aiTycoonSound.debug().scheduler, false);
    assert.equal(storage.get("ai-tycoon-music"), "false");
    assert.equal(storage.get("ai-tycoon-music-mood"), "night");
    console.log("Audio lifecycle: 25 assertions passed (gesture, mixing, priority, cooldown, visibility, mute, cleanup, persistence).");
}
main().catch(error => { console.error(error); process.exit(1); });
