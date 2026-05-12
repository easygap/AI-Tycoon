// ============================================================
//  AI TYCOON — Time-of-day sky, ambient lighting, weather
// ============================================================
//
// Drives the live look of the office windows and the Pixi ambient tint.
// The hour drifts continuously between keyframes, so the sky smoothly
// shifts from dawn → day → golden hour → dusk → night.

// Each keyframe defines: top-of-window sky RGB, bottom-of-window RGB,
// celestial body color/y-position, ambient warmth (used for tint),
// and star density.  Frames between keyframes are linearly interpolated.
const SKY_STOPS = [
    { t: 0,  top:[24,28,58],   bot:[44,52,92],   sunColor:[235,235,255], sunY:0.82, body:"moon", warmth:0.00, starDensity:1.00 },
    { t: 4,  top:[42,56,98],   bot:[92,96,140],  sunColor:[255,210,190], sunY:0.82, body:"moon", warmth:0.00, starDensity:0.60 },
    { t: 5.5,top:[230,140,130],bot:[255,200,170],sunColor:[255,180,120], sunY:0.78, body:"sun",  warmth:0.70, starDensity:0.10 },
    { t: 7,  top:[180,210,250],bot:[240,235,210],sunColor:[255,225,170], sunY:0.62, body:"sun",  warmth:0.40, starDensity:0.00 },
    { t: 9,  top:[150,200,255],bot:[230,242,255],sunColor:[255,240,180], sunY:0.45, body:"sun",  warmth:0.10, starDensity:0.00 },
    { t: 12, top:[110,170,255],bot:[210,235,255],sunColor:[255,250,200], sunY:0.18, body:"sun",  warmth:0.00, starDensity:0.00 },
    { t: 15, top:[140,190,250],bot:[225,235,240],sunColor:[255,235,180], sunY:0.30, body:"sun",  warmth:0.05, starDensity:0.00 },
    { t: 17, top:[200,200,240],bot:[245,225,200],sunColor:[255,200,140], sunY:0.55, body:"sun",  warmth:0.30, starDensity:0.00 },
    { t: 18.5,top:[255,140,110],bot:[255,195,170],sunColor:[255,150,90],  sunY:0.72, body:"sun",  warmth:0.85, starDensity:0.00 },
    { t: 19.5,top:[180,90,130], bot:[255,150,140],sunColor:[255,130,90],  sunY:0.85, body:"sun",  warmth:0.65, starDensity:0.05 },
    { t: 20.5,top:[80,70,130],  bot:[160,100,150],sunColor:[230,150,180], sunY:0.92, body:null,   warmth:0.30, starDensity:0.30 },
    { t: 22, top:[34,40,80],    bot:[70,72,118],  sunColor:[235,235,255], sunY:0.58, body:"moon", warmth:0.00, starDensity:0.70 },
    { t: 24, top:[24,28,58],    bot:[44,52,92],   sunColor:[235,235,255], sunY:0.82, body:"moon", warmth:0.00, starDensity:1.00 },
];

/** Optional override (HH:MM) for demos & screenshots. Persisted in localStorage. */
function readOverrideHour() {
    try {
        const raw = localStorage.getItem("ai-tycoon-time-override");
        if (!raw) return null;
        const [h, m] = raw.split(":").map(Number);
        if (!Number.isFinite(h)) return null;
        return Math.max(0, Math.min(23.99, h + (Number.isFinite(m) ? m / 60 : 0)));
    } catch {
        return null;
    }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRgb(A, B, t) {
    return [
        Math.round(lerp(A[0], B[0], t)),
        Math.round(lerp(A[1], B[1], t)),
        Math.round(lerp(A[2], B[2], t)),
    ];
}
const rgbCss = ([r, g, b]) => `rgb(${r},${g},${b})`;
const rgbaCss = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

export function rgbToHex([r, g, b]) {
    return (r << 16) | (g << 8) | b;
}

/** Returns full sky palette for the current (or overridden) time. */
export function getSkyPalette(date) {
    const now = date || new Date();
    const override = readOverrideHour();
    const t = override != null ? override : (now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600);

    let a = SKY_STOPS[0], b = SKY_STOPS[SKY_STOPS.length - 1];
    for (let i = 0; i < SKY_STOPS.length - 1; i++) {
        if (t >= SKY_STOPS[i].t && t < SKY_STOPS[i + 1].t) {
            a = SKY_STOPS[i]; b = SKY_STOPS[i + 1];
            break;
        }
    }
    const span = b.t - a.t;
    const frac = span <= 0 ? 0 : Math.max(0, Math.min(1, (t - a.t) / span));
    const topRgb = lerpRgb(a.top, b.top, frac);
    const botRgb = lerpRgb(a.bot, b.bot, frac);
    const sunColor = lerpRgb(a.sunColor, b.sunColor, frac);
    return {
        hour: t,
        topRgb, botRgb, sunColor,
        topCss: rgbCss(topRgb),
        botCss: rgbCss(botRgb),
        sunCss: rgbCss(sunColor),
        sunY: lerp(a.sunY, b.sunY, frac),
        body: frac < 0.5 ? a.body : b.body,
        warmth: lerp(a.warmth, b.warmth, frac),
        starDensity: lerp(a.starDensity, b.starDensity, frac),
    };
}

/** Label for the current time band, localized via i18n. Honours the override if set. */
export function timeOfDayLabel(date) {
    const t = getSkyPalette(date).hour;
    const tr = (typeof window !== "undefined" && window.aiTycoonI18n?.t) || (k => k);
    if (t < 5) return tr("tod.deepNight");
    if (t < 7) return tr("tod.dawn");
    if (t < 11) return tr("tod.morning");
    if (t < 15) return tr("tod.noon");
    if (t < 17.5) return tr("tod.afternoon");
    if (t < 19.5) return tr("tod.dusk");
    if (t < 22) return tr("tod.evening");
    return tr("tod.night");
}

/** RGBA color for the Pixi ambient overlay (warm sunset, cool night, neutral day). */
export function ambientTint(date) {
    const sky = getSkyPalette(date);
    const t = sky.hour;
    // Strong warm orange during golden hour / sunset
    if (sky.warmth > 0.5) {
        return { color: 0xff8a4c, alpha: 0.08 + (sky.warmth - 0.5) * 0.18 };
    }
    // Deep night: cool blue
    if (t >= 22 || t < 5) {
        return { color: 0x3a4a78, alpha: 0.22 };
    }
    // Dusk: purple-blue
    if (t >= 20) {
        return { color: 0x6a4a90, alpha: 0.16 };
    }
    // Early evening: faint warm
    if (t >= 17.5 && t < 20) {
        return { color: 0xff9d6c, alpha: 0.07 };
    }
    // Dawn: pinkish
    if (t >= 5 && t < 7) {
        return { color: 0xffb2a0, alpha: 0.07 };
    }
    return { color: 0xffffff, alpha: 0 };
}

/** Lamp / monitor warmth multiplier — desks glow harder in evening/night. */
export function indoorLightBoost(date) {
    const sky = getSkyPalette(date);
    const t = sky.hour;
    if (t >= 8 && t < 17) return 0;
    if (t >= 7 && t < 8)  return 0.10;
    if (t >= 17 && t < 18) return 0.20;
    if (t >= 18 && t < 19.5) return 0.50;
    if (t >= 19.5 && t < 21) return 0.75;
    return 1.0;
}

/** Pick the window tile that should host the sun/moon right now. */
export function sunWindowX(minX, maxX, date) {
    const sky = getSkyPalette(date);
    const t = sky.hour;
    // Daytime: sun east→west across the window range (6h → 18h)
    if (t >= 6 && t <= 18) {
        const frac = (t - 6) / 12;
        return minX + frac * (maxX - minX);
    }
    // Nighttime: moon, slower arc from 20h → next-day 5h
    let mt = t < 5 ? t + 24 : t;
    if (mt < 20) return null;
    const frac = (mt - 20) / 9;
    return minX + frac * (maxX - minX);
}

/** Cached helpers for the renderer */
export const skyHelpers = {
    rgbCss, rgbaCss,
};
