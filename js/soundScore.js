// Original musical material. MIDI pitches keep the score readable.
const SCORES = {
    day: { bpm: 76, chords: [[53, 60, 64, 69], [50, 57, 60, 65], [55, 62, 65, 69], [48, 55, 59, 64]], melody: [3, 6, 11, 14] },
    night: { bpm: 60, chords: [[50, 57, 60, 64], [46, 53, 57, 62], [53, 60, 64, 67], [48, 55, 58, 62]], melody: [6, 14] },
    review: { bpm: 64, chords: [[53, 60, 65, 67], [50, 57, 62, 65], [55, 62, 65, 69], [48, 55, 60, 65]], melody: [11] },
};
export function sceneFor({ hour = 12, review = 0 } = {}, mood = "auto") {
    if (mood === "day" || mood === "night") return mood;
    if (review > 0) return "review";
    return hour >= 19 || hour < 7 ? "night" : "day";
}
export function scoreFor(scene) { return SCORES[scene] || SCORES.day; }
const CUES = {
    join: { priority: 1, cooldown: 4000, wave: "sine", notes: [[60, 0, 0.2, 0.13], [67, 0.1, 0.35, 0.09]] },
    leave: { priority: 1, cooldown: 4000, wave: "sine", notes: [[64, 0, 0.2, 0.08], [55, 0.1, 0.3, 0.07]] },
    "task-start": { priority: 1, cooldown: 6500, wave: "triangle", notes: [[48, 0, 0.045, 0.09], [60, 0.065, 0.07, 0.06]] },
    "task-done": { priority: 3, cooldown: 1600, wave: "sine", notes: [[72, 0, 0.27, 0.14], [76, 0.085, 0.3, 0.12], [79, 0.17, 0.5, 0.1], [84, 0.26, 0.65, 0.07]] },
    review: { priority: 4, cooldown: 5000, wave: "sine", notes: [[69, 0, 0.3, 0.14], [69, 0.19, 0.42, 0.11], [64, 0.2, 0.45, 0.06]] },
    approve: { priority: 3, cooldown: 500, wave: "sine", notes: [[67, 0, 0.15, 0.11], [76, 0.1, 0.35, 0.11]] },
    return: { priority: 2, cooldown: 500, wave: "triangle", notes: [[65, 0, 0.14, 0.08], [60, 0.11, 0.23, 0.07]] },
    click: { priority: 0, cooldown: 120, wave: "sine", notes: [[79, 0, 0.04, 0.05]] },
};
export function cueFor(kind) { return CUES[kind] || null; }
