// Original 32 × 40 pixel cast. Clothes change shape, not only colour.
// The office, portraits and wardrobe all render these same discrete frames.
export const CHARACTER_WIDTH = 32;
export const CHARACTER_HEIGHT = 40;
const frames = new Map(), tones = new Map();
function tone(hex, amount) {
    const key = `${hex}:${amount}`;
    if (!tones.has(key)) {
        const n = parseInt(hex.replace('#', ''), 16);
        const ch = shift => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
        tones.set(key, `rgb(${ch(16)},${ch(8)},${ch(0)})`);
    }
    return tones.get(key);
}

function makeFrame(t, direction, pose, status, blink) {
    const canvas = document.createElement('canvas'); canvas.width = CHARACTER_WIDTH; canvas.height = CHARACTER_HEIGHT;
    const c = canvas.getContext('2d');
    if (direction === 1) { c.translate(32, 0); c.scale(-1, 1); }
    const r = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    const ink = '#352C42', hair = t.hairColor || t.hair, highlight = tone(hair, 31);
    const skin = t.skin, shade = tone(skin, -27), light = tone(skin, 8);
    const body = t.body, seam = t.bodyDark, inner = t.inner || '#FAFCFF', accent = t.accent || '#FF5C34';
    const pants = t.trousers || '#596F93', shoes = t.shoes || '#FAFCFF';
    const back = direction === 3, side = direction === 1 || direction === 2;
    const step = status === 'walk' ? [0, 1, 0, -1][pose % 4] : 0;
    const style = t.hairStyle || 'short', cut = t.cut || 'work';

    // Hair behind the shoulders makes each person recognisable in a crowd.
    if (style === 'long') {
        r(7, 7, 18, 22, ink); r(8, 8, 16, 19, hair); r(8, 10, 2, 15, highlight);
        r(22, 12, 2, 15, tone(hair, -9)); r(9, 27, 5, 2, hair); r(20, 26, 3, 2, hair);
    } else if (style === 'twin') {
        for (const x of [2, 25]) { r(x, 8, 6, 14, ink); r(x + 1, 9, 4, 11, hair); r(x + 1, 10, 1, 8, highlight); r(x + 1, 20, 3, 3, hair); r(x + 1, 10, 4, 2, accent); }
    } else if (style === 'pony') {
        r(25, 6, 6, 12, ink); r(26, 7, 4, 10, hair); r(26, 8, 1, 6, highlight); r(26, 17, 3, 4, hair); r(24, 7, 4, 2, accent);
    }

    // Wide trousers and separate shoes; hems move by one whole pixel.
    r(8, 29, 17, 8, ink); r(9, 30, 7, 6 + step, pants); r(18, 30, 6, 6 - step, tone(pants, -19));
    r(10, 31, 2, 4, tone(pants, 20)); r(17, 31, 1, 6, ink);
    r(7, 35 + step, 9, 4, ink); r(17, 35 - step, 9, 4, ink);
    r(8, 35 + step, 7, 2, shoes); r(18, 35 - step, 7, 2, tone(shoes, -14));
    r(8, 38 + step, 7, 1, '#FAFCFF'); r(18, 38 - step, 7, 1, '#D7EFFF');
    if (cut === 'overalls') { r(10, 31, 4, 3, tone(pants, 28)); r(20, 31, 3, 3, tone(pants, -8)); }

    const sleeve = ['vest', 'overalls'].includes(cut) ? inner : body;
    const swing = step * 2, puff = cut === 'blouson' ? 1 : 0;
    for (const [x, sy, right] of [[3 - puff, 22 + swing, false], [25, 22 - swing, true]]) {
        r(x, sy, 5 + puff, 9, ink); r(x + 1, sy + 1, 4, 6, right ? tone(sleeve, -18) : sleeve);
        r(x + 1, sy + 6, 4, 2, cut === 'blouson' ? accent : seam);
        r(x + 1, sy + 8, 4, 3, shade); r(x + 1, sy + 8, 3, 2, skin);
        if (cut === 'stripe') { r(x + 1, sy + 2, 4, 1, accent); r(x + 1, sy + 5, 4, 1, accent); }
    }
    r(7, 20, 19, 12, ink); r(8, 21, 17, 10, seam); r(8, 21, 15, 8, body);
    r(10, 22, 2, 6, tone(body, 15)); r(10, 30, 13, 1, seam);
    r(13, 20, 7, 3, inner); r(14, 20, 5, 2, shade);
    if (cut === 'work') {
        if (!back) {
            r(14, 23, 5, 7, inner); r(12, 22, 2, 3, seam); r(20, 22, 2, 3, seam);
            r(9, 25, 4, 3, seam); r(10, 25, 3, 1, tone(body, 32)); r(21, 25, 3, 3, seam);
        } else { r(9, 23, 14, 1, seam); r(13, 25, 7, 3, inner); r(15, 25, 2, 3, accent); }
    } else if (cut === 'blouson') {
        r(8, 29, 17, 2, seam); r(9, 30, 15, 1, accent);
        if (!back) { r(15, 22, 3, 7, inner); r(15, 23, 1, 6, accent); r(20, 24, 3, 3, accent); r(20, 24, 2, 1, '#FAFCFF'); }
        else { r(10, 24, 12, 3, inner); r(11, 25, 10, 1, accent); }
    } else if (cut === 'vest') {
        r(8, 21, 3, 9, inner); r(23, 21, 2, 9, tone(inner, -24));
        if (!back) { r(13, 21, 7, 3, inner); r(14, 24, 5, 1, inner); r(15, 25, 3, 1, inner); r(16, 26, 1, 1, inner); }
        for (let y = 25; y < 30; y += 2) for (const x of [12, 20]) { r(x, y, 1, 1, tone(body, 35)); r(x + 1, y + 1, 1, 1, seam); }
        r(11, 30, 12, 1, accent);
    } else if (cut === 'overalls') {
        r(8, 21, 17, 9, inner); r(11, 24, 12, 8, body);
        r(10, 21, 3, 10, body); r(21, 21, 3, 10, seam);
        r(12, 24, 1, 1, accent); r(21, 24, 1, 1, accent);
        r(15, 26, 5, 3, seam); r(15, 26, 5, 1, tone(body, 35));
    } else if (cut === 'cardigan') {
        if (!back) { r(14, 22, 6, 9, inner); r(12, 23, 2, 7, seam); r(20, 23, 1, 8, seam); for (const y of [24, 27, 30]) r(20, y, 1, 1, accent); }
        for (const y of [25, 28]) { r(9, y, 2, 1, tone(body, 22)); r(22, y + 1, 2, 1, seam); }
        r(8, 31, 6, 1, ink); r(20, 31, 5, 1, ink);
    } else if (cut === 'stripe') {
        for (const y of [23, 26, 29]) r(8, y, 17, 1, accent);
        if (!back) { r(15, 22, 3, 9, body); for (const y of [24, 27, 30]) r(16, y, 1, 1, seam); r(20, 24, 3, 3, inner); }
    }
    if (!back && t.detail === 'brooch') { r(21, 22, 1, 5, accent); r(19, 23, 5, 2, accent); r(21, 23, 1, 1, '#FAFCFF'); }
    if (t.detail === 'scarf') { r(12, 21, 9, 2, accent); r(19, 22, 3, 5, accent); r(20, 25, 1, 2, '#F8C4C2'); }
    if (t.detail === 'satchel' || t.detail === 'pouch') {
        if (!back) {
            for (let i = 0; i < 10; i++) r(10 + i, 21 + i, 2, 2, seam);
            r(22, 28, 7, 7, ink); r(23, 29, 5, 5, t.detail === 'satchel' ? accent : '#FF5C34');
            r(23, 29, 5, 2, tone(accent, -15)); r(25, 31, 1, 2, '#FAFCFF');
        } else { for (let i = 0; i < 9; i++) r(21 - i, 21 + i, 2, 2, seam); }
    }

    // Rounded, stepped face with a small nose and restrained highlights.
    r(11, 3, 11, 1, ink); r(8, 4, 17, 3, ink); r(7, 7, 19, 10, ink);
    r(8, 17, 17, 3, ink); r(10, 20, 13, 2, ink);
    r(8, 8, 17, 9, shade); r(9, 8, 14, 11, skin); r(11, 10, 11, 6, light); r(11, 19, 11, 2, skin);
    r(6, 12, 3, 5, shade); r(7, 12, 2, 3, skin); r(24, 12, 3, 5, shade); r(24, 12, 2, 3, skin);
    r(10, 4, 13, 2, hair); r(8, 6, 17, 5, hair); r(9, 5, 11, 2, highlight); r(8, 8, 3, 2, highlight);
    r(7, 9, 2, 5, hair); r(24, 9, 2, 5, hair);
    if (style === 'part') { r(17, 6, 1, 3, shade); r(18, 9, 5, 3, hair); r(10, 9, 4, 2, hair); }
    else if (style === 'crew') { r(9, 10, 15, 1, hair); r(9, 11, 2, 1, hair); }
    else { r(10, 10, 4, 2, hair); r(14, 10, 2, 1, hair); r(20, 10, 4, 2, hair); }
    if (style === 'bob') { r(7, 11, 2, 9, hair); r(24, 11, 2, 9, hair); r(8, 19, 3, 3, ink); r(22, 19, 3, 3, ink); }
    if (back) {
        r(8, 9, 17, 10, hair); r(10, 19, 13, 2, hair); r(9, 10, 2, 8, highlight); r(22, 10, 2, 9, tone(hair, -9));
    } else {
        for (const x of (side ? [21] : [11, 20])) {
            r(x, 14, 2, blink ? 1 : 3, ink);
            if (!blink) r(x, 14, 1, 1, '#FAFCFF');
        }
        r(side ? 24 : 16, 17, 1, 1, tone(skin, -32));
        r(side ? 21 : 15, 19, 3, 1, '#AF7375');
        if (!side) { r(10, 17, 2, 1, '#D9918A'); r(22, 17, 2, 1, '#D9918A'); }
    }
    if (style === 'long' && !back) {
        r(7, 13, 3, 13, hair); r(8, 17, 1, 8, highlight);
        r(23, 12, 3, 15, hair); r(23, 22, 1, 6, ink);
    }
    if (t.accessory === 'glasses' && !back) {
        for (const x of (side ? [19] : [9, 19])) { r(x, 13, 6, 5, '#665363'); r(x + 1, 14, 4, 3, '#D7EFFF'); r(x + 2, 15, 1, 2, ink); }
        if (!side) r(15, 14, 4, 1, '#665363');
    }
    if (t.detail === 'beanie') {
        r(11, 1, 12, 2, ink); r(8, 3, 17, 4, ink); r(9, 3, 15, 3, accent); r(7, 7, 19, 3, ink); r(8, 7, 17, 2, accent);
        for (const x of [11, 15, 19, 23]) r(x, 4, 1, 4, tone(accent, -30)); r(21, 7, 3, 2, inner);
    } else if (t.accessory === 'cap') {
        r(9, 2, 15, 4, ink); r(10, 2, 13, 3, body); r(10, 3, 4, 1, tone(body, 22));
        r(side ? 21 : 16, 6, side ? 10 : 12, 2, ink); r(side ? 22 : 17, 6, side ? 8 : 10, 1, accent);
    } else if (t.accessory === 'ribbon') {
        r(23, 4, 6, 4, ink); r(23, 4, 2, 3, '#FAFCFF'); r(27, 4, 2, 3, '#FAFCFF'); r(25, 5, 2, 2, accent);
    } else if (t.accessory === 'earring') { r(7, 17, 1, 2, accent); r(25, 17, 1, 2, accent); }

    // Props belong to the work, never to the selected outfit.
    if (!back && status === 'thinking') { r(24, 22, 4, 4, seam); r(23, 19, 4, 5, ink); r(23, 19, 3, 4, skin); }
    else if (!back && status === 'reviewing') {
        r(2, 25, 10, 10, ink); r(3, 26, 8, 8, '#FAFCFF'); r(5, 25, 4, 2, '#5278A5');
        r(4, 29, 5, 1, '#829FBE'); r(4, 31, 3, 1, '#829FBE'); r(10, 30, 2, 3, skin);
    } else if (!back && status === 'searching') {
        r(26, 18, 5, 5, ink); r(27, 19, 3, 3, '#D7EFFF'); r(26, 23, 2, 4, ink); r(25, 27, 3, 2, skin);
    } else if (!back && (status === 'coffee' || status === 'idle')) {
        r(25, 28, 6, 6, ink); r(26, 28, 4, 5, '#FAFCFF'); r(27, 28, 2, 1, '#654051'); r(30, 29, 2, 3, '#D7EFFF');
    } else if (!back && status === 'coding') {
        const lift = pose % 2;
        r(7, 29, 19, 5, ink); r(8, 29, 17, 3, '#D7EFFF');
        for (let k = 0; k < 7; k++) r(9 + k * 2, 31, 1, 1, '#5278A5');
        r(8, 28 + lift, 4, 2, skin); r(21, 29 - lift, 4, 2, skin);
    }
    return canvas;
}
export function characterFrame(theme, { direction = 0, pose = 0, status = 'idle', blink = false } = {}) {
    const key = [theme.outfit, theme.body, theme.bodyDark, theme.skin, theme.hairColor || theme.hair, theme.hairStyle, theme.accessory, direction, pose, status, blink].join(':');
    if (!frames.has(key)) {
        if (frames.size >= 640) frames.delete(frames.keys().next().value);
        frames.set(key, makeFrame(theme, direction, pose, status, blink));
    }
    return frames.get(key);
}
export function drawCharacter(ctx, agent, visual, x, y, tick) {
    const moving = visual.moving, pose = Math.floor(tick / (moving ? 7 : 12)) % (moving ? 4 : 2);
    const frame = characterFrame(visual.theme, { direction: moving ? visual.direction : 0, pose, status: moving ? 'walk' : (agent.isRunning ? agent.status : 'idle'), blink: tick % 173 > 166 });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, Math.round(x) - 16, Math.round(y) - 31);
}
