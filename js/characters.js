// Original 26 × 34 pixel characters. Every edge lands on a whole pixel.
// One light direction, a dark silhouette, four views and discrete action poses.
// The same artwork is used by the office and the employee portraits.
const frames = new Map();
const tones = new Map();

function tone(hex, amount) {
    const key = `${hex}:${amount}`;
    if (!tones.has(key)) {
        const n = parseInt(hex.replace('#', ''), 16);
        const channel = shift => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
        tones.set(key, `rgb(${channel(16)},${channel(8)},${channel(0)})`);
    }
    return tones.get(key);
}

function makeFrame(theme, direction, pose, status, blink) {
    const canvas = document.createElement('canvas');
    canvas.width = 26; canvas.height = 34;
    const ctx = canvas.getContext('2d');
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const ink = '#252B43', hair = theme.hairColor || theme.hair;
    const lightHair = tone(hair, 35), body = theme.body, darkBody = theme.bodyDark;
    const skin = theme.skin, skinShadow = tone(skin, -29), skinLight = tone(skin, 9);
    const style = theme.hairStyle || 'short';
    const back = direction === 3, side = direction === 1 || direction === 2;
    const leftStep = pose === 1 ? 1 : pose === 3 ? -1 : 0;

    // Back hair creates different, recognisable silhouettes before any accessories.
    if (style === 'long') {
        rect(6, 6, 14, 18, ink); rect(7, 7, 12, 16, hair);
        rect(7, 10, 2, 12, lightHair); rect(18, 10, 1, 12, tone(hair, -9));
    } else if (style === 'twin') {
        rect(2, 7, 5, 13, ink); rect(20, 7, 4, 13, ink);
        rect(3, 8, 3, 10, hair); rect(21, 8, 2, 10, hair);
        rect(3, 8, 1, 7, lightHair); rect(3, 18, 2, 3, ink); rect(21, 18, 2, 3, ink);
        rect(4, 8, 3, 2, body); rect(20, 8, 3, 2, body);
    } else if (style === 'pony') {
        rect(19, 5, 5, 11, ink); rect(20, 6, 3, 8, hair);
        rect(20, 7, 1, 6, lightHair); rect(21, 15, 2, 3, ink);
        rect(19, 6, 3, 2, body);
    }

    // Trousers and white-soled sneakers: alternating feet, not rubbery stretching.
    rect(8, 25, 11, 6, ink); rect(9, 26, 4, 5 + leftStep, '#4D5B79');
    rect(15, 26, 3, 5 - leftStep, '#39455F'); rect(10, 26, 1, 4, '#6D7B95');
    rect(7, 30 + leftStep, 6, 3, ink); rect(14, 30 - leftStep, 6, 3, ink);
    rect(8, 31 + leftStep, 4, 1, '#E9EFFC'); rect(15, 31 - leftStep, 4, 1, '#B7C8E6');

    // Structured jacket: collar, seam, cuff and a single embroidered patch.
    rect(7, 17, 13, 10, ink); rect(8, 18, 11, 8, darkBody);
    rect(8, 18, 9, 6, body); rect(9, 19, 2, 4, tone(body, 24));
    rect(9, 25, 8, 1, tone(darkBody, -16));
    rect(11, 17, 5, 3, '#F1F3FA'); rect(12, 17, 3, 2, skinShadow);
    rect(13, 20, 1, 6, tone(darkBody, -10));
    if (!back) { rect(15, 20, 2, 2, '#EAF0FF'); rect(15, 21, 1, 1, '#5778BC'); }
    else { rect(10, 20, 7, 1, tone(body, 25)); rect(12, 21, 3, 1, tone(body, 25)); }

    const handLift = status === 'coding' ? (pose % 2) : 0;
    const swing = status === 'walk' ? leftStep * 2 : 0;
    rect(4, 18 + swing, 4, 8, ink); rect(5, 19 + swing, 3, 5, body);
    rect(5, 23 + swing - handLift, 3, 3, skinShadow); rect(5, 23 + swing - handLift, 2, 2, skin);
    rect(19, 18 - swing, 4, 8, ink); rect(19, 19 - swing, 3, 5, darkBody);
    rect(19, 23 - swing + handLift, 3, 3, skinShadow); rect(19, 23 - swing + handLift, 2, 2, skin);

    // Stepped head outline and three skin planes; the ear stays outside the hair.
    rect(8, 3, 10, 1, ink); rect(6, 4, 14, 11, ink); rect(7, 14, 12, 3, ink);
    rect(9, 17, 8, 1, ink); rect(7, 7, 12, 8, skinShadow);
    rect(8, 7, 9, 9, skin); rect(9, 8, 7, 5, skinLight);
    rect(5, 10, 2, 4, skinShadow); rect(19, 10, 2, 4, skinShadow);
    rect(5, 10, 1, 2, skin); rect(19, 10, 1, 2, skin);
    rect(8, 4, 10, 1, hair); rect(7, 5, 12, 4, hair);
    rect(8, 5, 8, 1, lightHair); rect(7, 6, 3, 1, lightHair);
    rect(6, 7, 2, 4, hair); rect(18, 7, 2, 4, hair);
    if (style === 'part') { rect(13, 5, 1, 3, skinShadow); rect(14, 7, 4, 2, hair); }
    else if (style === 'crew') { rect(8, 7, 10, 1, hair); rect(8, 8, 1, 1, hair); }
    else { rect(8, 8, 3, 2, hair); rect(11, 8, 2, 1, hair); rect(15, 8, 3, 2, hair); }
    if (style === 'bob') { rect(6, 9, 2, 7, hair); rect(18, 9, 2, 7, hair); rect(6, 15, 3, 2, ink); rect(17, 15, 3, 2, ink); }
    if (back) {
        rect(7, 8, 12, 8, hair); rect(8, 8, 2, 7, lightHair);
        rect(9, 16, 8, 1, hair); rect(16, 9, 2, 6, tone(hair, -7));
    } else {
        const offset = direction === 1 ? -1 : direction === 2 ? 1 : 0;
        const eyes = side ? [direction === 1 ? 8 : 16] : [9, 15];
        for (const eye of eyes) {
            if (blink) rect(eye + offset, 12, 2, 1, ink);
            else { rect(eye + offset, 11, 2, 3, ink); rect(eye + offset, 11, 1, 1, '#FAFCFF'); }
        }
        rect(13 + offset, 13, 1, 1, skinShadow);
        rect(11 + offset, 15, 3, 1, '#B57775');
        if (!side) { rect(8, 14, 2, 1, '#E9A59B'); rect(16, 14, 2, 1, '#E9A59B'); }
    }

    // Small accessories stay legible at native scale, without soft half-pixels.
    if (theme.accessory === 'glasses' && !back) {
        rect(7, 10, 5, 4, '#435473'); rect(14, 10, 5, 4, '#435473'); rect(12, 11, 2, 1, '#435473');
        rect(8, 11, 3, 2, '#D3E7EF'); rect(15, 11, 3, 2, '#D3E7EF');
        rect(9, 12, 1, 1, ink); rect(16, 12, 1, 1, ink);
    } else if (theme.accessory === 'ribbon') {
        rect(17, 3, 5, 4, ink); rect(18, 3, 3, 3, '#F9F1F6');
        rect(19, 4, 1, 2, body); rect(17, 6, 2, 2, body);
    } else if (theme.accessory === 'cap') {
        rect(7, 2, 12, 4, ink); rect(8, 2, 10, 3, body);
        rect(8, 3, 4, 1, tone(body, 25)); rect(direction === 1 ? 4 : 14, 6, 8, 2, ink);
        rect(direction === 1 ? 5 : 15, 6, 6, 1, darkBody);
    } else if (theme.accessory === 'earring') rect(5, 14, 1, 2, '#FFE1A6');

    // Work props and gestures communicate what the agent is doing.
    if (status === 'thinking') {
        rect(18, 17, 4, 4, darkBody); rect(17, 15, 3, 4, ink); rect(17, 15, 2, 3, skin);
    } else if (status === 'reviewing') {
        rect(2, 20, 8, 9, ink); rect(3, 21, 6, 7, '#F7FAFF'); rect(5, 20, 3, 2, '#859CC8');
        rect(4, 23, 4, 1, '#7C98BF'); rect(4, 25, 3, 1, '#7C98BF'); rect(8, 25, 2, 2, skin);
    } else if (status === 'searching') {
        rect(20, 15, 5, 5, ink); rect(21, 16, 3, 3, '#9FD9F5'); rect(20, 19, 2, 4, ink); rect(19, 22, 3, 2, skin);
    } else if (status === 'coffee' || status === 'idle') {
        rect(19, 21, 6, 6, ink); rect(20, 21, 4, 5, '#F4F5FB'); rect(21, 21, 2, 1, '#714D48');
        rect(24, 22, 2, 3, '#CED7EC'); rect(19, 24, 2, 2, skin);
    } else if (status === 'coding') {
        rect(7, 24, 13, 4, ink); rect(8, 24, 11, 2, '#B9C9E8');
        for (let k = 0; k < 5; k++) rect(9 + k * 2, 25, 1, 1, '#526B99');
        rect(8, 23 + handLift, 3, 2, skin); rect(16, 24 - handLift, 3, 2, skin);
    }
    return canvas;
}

export function characterFrame(theme, { direction = 0, pose = 0, status = 'idle', blink = false } = {}) {
    const key = [theme.body, theme.bodyDark, theme.skin, theme.hairColor || theme.hair, theme.hairStyle, theme.accessory, direction, pose, status, blink].join(':');
    if (!frames.has(key)) {
        if (frames.size >= 384) frames.delete(frames.keys().next().value);
        frames.set(key, makeFrame(theme, direction, pose, status, blink));
    }
    return frames.get(key);
}

export function drawCharacter(ctx, agent, visual, x, y, tick) {
    const moving = visual.moving;
    const pose = Math.floor(tick / (moving ? 7 : 12)) % (moving ? 4 : 2);
    const status = moving ? 'walk' : (agent.isRunning ? agent.status : 'idle');
    const frame = characterFrame(visual.theme, {
        direction: moving ? visual.direction : 0, pose, status, blink: tick % 173 > 166,
    });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frame, Math.round(x) - 13, Math.round(y) - 25);
}
