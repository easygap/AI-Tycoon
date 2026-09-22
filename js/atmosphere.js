import { S } from "./state.js";
import { AGENT_THEMES } from "./constants.js";
import { characterFrame } from "./characters.js";
import { getSkyPalette } from "./timeOfDay.js";
import { getLang, onLangChange } from "./i18n.js";
import { getMusicState, setMusicEnabled, setMusicMood, setMusicVolume, setSoundScene, onMusicChange, isSoundEnabled, setSoundEnabled, onSoundChange, sfxClick, toggleMasterMute } from "./sound.js";

const $ = id => document.getElementById(id);
const tracks = {
    ko: { day: "오후", night: "늦은 밤", review: "확인할 일" },
    en: { day: "An afternoon in the sun", night: "After the city sleeps", review: "A moment to review" },
};
let initialized = false;
function syncRadio() {
    if (!$("office-radio")) return;
    const state = getMusicState(), en = getLang() === "en";
    $("office-radio").dataset.playing = String(state.playing);
    $("radio-play").disabled = !state.available;
    $("radio-play").setAttribute("aria-pressed", String(state.playing));
    $("radio-play").setAttribute("aria-label", state.muted ? (en ? "Unmute all sound" : "전체 음소거 해제") : en ? (state.playing ? "Pause background music" : "Play background music") : (state.playing ? "배경음악 일시정지" : "배경음악 재생"));
    $("radio-play").querySelector(".radio-play-glyph").textContent = state.playing ? "Ⅱ" : "▶";
    $("radio-track").textContent = state.enabled ? tracks[en ? "en" : "ko"][state.scene] : (en ? "Background music" : "배경음악");
    $("radio-status").textContent = !state.available ? (en ? "Audio is unavailable in this browser" : "이 브라우저는 소리를 지원하지 않아요")
        : state.muted ? (en ? "Muted · M to resume" : "전체 음소거 · M으로 해제")
        : state.playing ? (en ? "Playing" : `재생 중 · ${Math.round(state.volume * 100)}%`)
        : state.enabled ? (en ? "Press play to resume" : "재생 버튼을 눌러 이어 들으세요")
        : (en ? "Press play to listen" : "재생 버튼을 눌러 켜세요");
    $("radio-volume").value = Math.round(state.volume * 100);
    $("radio-volume-value").value = `${Math.round(state.volume * 100)}%`;
    $("radio-mood").value = state.mood;
    $("radio-fx").checked = isSoundEnabled();
    document.querySelector(".radio-label").textContent = en ? "Music" : "음악";
    $("radio-mood-label").textContent = en ? "Mood" : "분위기";
    $("radio-volume-label").textContent = en ? "Music volume" : "음악 볼륨";
    $("radio-fx-label").textContent = en ? "Work notification sounds" : "작업 알림 효과음";
    $("radio-help").textContent = en ? "Music pauses in other tabs." : "다른 탭으로 가면 음악이 멈춰요.";
    [...$("radio-mood").options].forEach((option, i) => { option.textContent = (en ? ["Follow the scene", tracks.en.day, tracks.en.night] : ["장면에 맞춰서", tracks.ko.day, tracks.ko.night])[i]; });
}
export function updateAtmosphere() {
    const agents = S.liveAgents.filter(a => a.isRunning);
    const working = agents.filter(a => ["coding", "thinking", "searching", "reviewing", "meeting"].includes(a.status));
    const review = agents.filter(a => a.needsReview).length;
    const { hour } = getSkyPalette();
    setSoundScene({ hour, active: agents.length, working: working.length, review });
    document.querySelector(".stage-shell").dataset.scene = review ? "review" : working.length ? "working" : "quiet";
    const en = getLang() === "en", demo = window.aiTycoonDemo?.isEnabled();
    const area = $("scene-area");
    area.setAttribute('aria-label', en ? 'Explore the map' : '맵 둘러보기');
    [...area.options].forEach((o, i) => { o.textContent = (en ? ['Whole map', 'Studio', 'Meeting', 'Library', 'Terrace'] : ['전체 맵', '작업실', '회의 자리', '자료실', '테라스'])[i]; });
    $("scene-caption").textContent = en
        ? `${demo ? "Demo office. " : ""}${agents.length ? `${agents.length} agents here. ${working.length} making things happen.` : "A little room for your next big idea."}`
        : `${demo ? "예시 직원으로 체험 중이에요." : agents.length ? "직원을 눌러 지금 하는 일을 확인해 보세요." : "AI 도구에서 일을 시작하면 직원이 나타나요."}`;
    $("mobile-team-count").textContent = agents.length;
    syncRadio();
    const cinema = document.body.classList.contains("cinema-mode");
    $("scene-cinema").setAttribute("aria-pressed", String(cinema));
    $("scene-cinema").setAttribute("aria-label", cinema ? (en ? "Show controls" : "조작 화면으로 돌아오기") : (en ? "Watch the office" : "장면만 보기"));
}
export function initAtmosphere() {
    if (initialized) return; initialized = true;
    const cast = $("welcome-cast");
    if (cast) [0, 10, 2, 15, 17].forEach(index => {
        const portrait = document.createElement("img");
        portrait.src = characterFrame(AGENT_THEMES[index], { direction: 0, status: "idle" }).toDataURL();
        portrait.alt = ""; portrait.width = 52; portrait.height = 68;
        cast.appendChild(portrait);
    });
    // Preserve the visible button's intent before the gesture unlocks saved audio.
    let requestedPlay = null;
    const rememberIntent = () => { requestedPlay = $("office-radio").dataset.playing !== "true"; };
    $("radio-play").addEventListener("pointerdown", rememberIntent);
    $("radio-play").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") rememberIntent(); });
    $("radio-play").addEventListener("click", () => {
        if (getMusicState().muted) toggleMasterMute();
        else setMusicEnabled(requestedPlay ?? !getMusicState().playing);
        requestedPlay = null;
    });
    $("radio-mood").addEventListener("change", e => setMusicMood(e.target.value));
    $("radio-volume").addEventListener("input", e => setMusicVolume(Number(e.target.value) / 100));
    $("radio-fx").addEventListener("change", e => { setSoundEnabled(e.target.checked); if (e.target.checked) sfxClick(); window.syncSoundIcon?.(); });
    $("scene-reset").addEventListener("click", () => window.resetCameraView?.());
    $("scene-area").addEventListener("change", e => window.focusOfficeArea?.(e.target.value));
    $("scene-zoom-in").addEventListener("click", () => window.zoomOffice?.(.35));
    $("scene-zoom-out").addEventListener("click", () => window.zoomOffice?.(-.35));
    $("scene-cinema").addEventListener("click", () => { window.toggleCinemaMode?.(); updateAtmosphere(); });
    document.addEventListener("click", event => {
        if (!event.target.closest("#radio-settings")) $("radio-settings").open = false;
        if (event.target.closest(".side-panel-tab, .content-primary-action")) sfxClick();
    });
    $("radio-settings").addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); $("radio-settings").open = false; $("radio-settings").querySelector("summary").focus(); }
    });
    onMusicChange(syncRadio); onSoundChange(syncRadio);
    onLangChange(() => { updateAtmosphere(); syncRadio(); });
    syncRadio();
}
