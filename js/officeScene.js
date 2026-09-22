// Original pixel architecture: an open studio with two connected outbuildings.
import { TILE, COLS, ROWS, BUILDINGS, DESK_LAYOUT, OFFICE_MAP } from './officeLayout.js';
import { PAL, getActiveTheme } from './constants.js';
import { S } from './state.js';
import { getSkyPalette } from './timeOfDay.js';

let cached = null, cacheKey = '';
const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function poly(c, points, fill, stroke, width = 1) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function ellipse(c, x, y, rx, ry, fill, stroke, width = 1) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function text(c, label, x, y, size, color, align = 'left') {
    c.font = `${Math.max(11, size)}px "Galmuri11", "Wanted Sans Variable", sans-serif`; c.fillStyle = color; c.textAlign = align; c.fillText(label, x, y);
}
function sign(c, label, x, y, width, color) {
    rect(c, x + 2, y + 3, width, 19, '#20233433');
    rect(c, x, y, width, 19, color);
    rect(c, x + 3, y + 3, 2, 13, '#FFFFFF4D');
    text(c, label, x + width / 2 + 1, y + 13, 10, '#FFFFFF', 'center');
}
function plant(c, x, y, size = 1) {
    c.save(); c.translate(x, y); c.scale(size, size);
    ellipse(c, 0, 8, 10, 4, '#171E3026');
    rect(c, -6, 0, 12, 10, '#B9686D'); rect(c, -7, -2, 14, 4, '#DA9C94');
    rect(c, -1, -19, 2, 22, '#375B52');
    poly(c, [[0, -5], [-12, -8], [-13, -16], [-5, -14]], PAL.plant1);
    poly(c, [[0, -10], [11, -14], [12, -22], [4, -19]], PAL.plant2);
    poly(c, [[0, -13], [-6, -20], [-4, -27], [2, -20]], PAL.plant1);
    rect(c, -5, 3, 2, 5, '#F0C6B34D'); c.restore();
}

function foundation(c, b, dark) {
    const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
    c.save(); c.shadowColor = dark ? '#0C101957' : '#32394F35'; c.shadowBlur = 18; c.shadowOffsetY = 12;
    rect(c, x - 4, y - 5, w + 8, h + 8, dark ? '#2C3349' : '#858EAA'); c.restore();
    rect(c, x - 4, y + h + 3, w + 8, 10, dark ? '#191F32' : '#737C95');
    rect(c, x - 4, y - 5, w + 8, 3, dark ? '#858BA4' : '#FAFBFF');
    for (let k = 13; k < w; k += 36) rect(c, x + k, y + h + 5, 4, 3, dark ? '#3D4964' : '#ABB2C6');
}

function floor(c, b, dark) {
    const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
    let base = dark ? '#414859' : '#E7EAF0';
    if (getActiveTheme() !== 'classic') base = PAL.floor1;
    if (b.floor === 'H') base = dark ? '#26334F' : '#A9BBD4';
    if (b.floor === 'T') base = dark ? '#745C60' : '#C79280';
    if (b.floor === 'G' || b.floor === 'E') base = dark ? '#56627C' : '#B4BED2';
    rect(c, x, y, w, h, base);
    // Long floorboards replace the repetitive checkerboard.
    if (b.floor === 'T') {
        for (let yy = y + 8; yy < y + h; yy += 12) {
            rect(c, x, yy, w, 1, '#4E3B4D35'); rect(c, x, yy + 1, w, 1, '#FFD7C32B');
            for (let xx = x + 10; xx < x + w; xx += 45) rect(c, xx + (yy % 24 ? 15 : 0), yy + 3, 14, 1, '#62404C18');
        }
    } else if (b.floor === 'H') {
        for (let yy = y; yy < y + h; yy += 32) for (let xx = x; xx < x + w; xx += 32) {
            rect(c, xx, yy, 31, 1, '#DDEAFF50'); rect(c, xx, yy, 1, 31, '#455C7D30');
            rect(c, xx + 14, yy + 14, 2, 2, '#51719340');
        }
    } else {
        for (let yy = y + 20; yy < y + h; yy += 24) {
            rect(c, x, yy, w, 1, dark ? '#7E8A9C20' : '#8794AB25');
            for (let xx = x + ((yy / 24 | 0) % 2 ? 40 : 0); xx < x + w; xx += 96) rect(c, xx, yy - 23, 1, 23, '#697A921C');
        }
    }
    rect(c, x, y + h - 3, w, 3, '#182C422B');
}

function wall(c, x, y, width, dark) {
    rect(c, x + 3, y + 5, width, 30, '#1822382A');
    rect(c, x, y - 13, width, 35, dark ? '#444B61' : '#D6DEE9');
    rect(c, x, y - 17, width, 4, dark ? '#838CA1' : '#FBFCFF');
    rect(c, x, y + 17, width, 5, dark ? '#222C42' : '#838DA7');
    for (let xx = x + 12; xx < x + width; xx += 24) rect(c, xx, y - 8, 1, 20, dark ? '#78819725' : '#A4AFC34D');
}

function windowPane(c, x, y, w, h, dark) {
    const sky = getSkyPalette();
    rect(c, x + 2, y + 3, w, h, '#27334A35'); rect(c, x, y, w, h, '#4E5D79');
    rect(c, x + 3, y + 3, w - 6, h - 6, sky.botCss);
    rect(c, x + 4, y + 4, w - 8, 9, sky.topCss);
    if (sky.body && Math.round(x / TILE) === 11) ellipse(c, x + 28, y + 8 + sky.sunY * 9, 3, 3, sky.sunCss);
    poly(c, [[x + 4, y + h - 6], [x + w / 2, y + 5], [x + w / 2 + 7, y + 5], [x + 11, y + h - 6]], '#FFFFFF25');
    rect(c, x + w / 2 - 1, y + 2, 2, h - 4, '#798AA3');
    rect(c, x - 2, y + h - 2, w + 4, 4, dark ? '#8997AC' : '#FAFBFF');
    if (sky.starDensity > .3) for (const [sx, sy] of [[8, 7], [17, 16], [w - 8, 9]]) rect(c, x + sx, y + sy, 1, 1, '#D4DCF2');
}

function workstation(c, seat, dark) {
    const x = (seat.x + .5) * TILE, y = (seat.y + .5) * TILE;
    ellipse(c, x, y - 2, 15, 7, '#19243B25');
    rect(c, x - 19, y - 31, 41, 14, '#19243B20');
    rect(c, x - 21, y - 43, 42, 22, dark ? '#7B5F60' : '#AF786B');
    rect(c, x - 21, y - 44, 42, 17, dark ? '#B1897C' : '#DEAD94');
    rect(c, x - 20, y - 43, 40, 2, dark ? '#C49A8B' : '#F4D1B7');
    rect(c, x - 19, y - 25, 3, 9, '#535E73'); rect(c, x + 16, y - 25, 3, 9, '#535E73');
    rect(c, x - 11, y - 51, 24, 18, '#303B52'); rect(c, x - 8, y - 48, 18, 12, dark ? '#30466B' : '#6F9DBC');
    rect(c, x - 1, y - 33, 4, 4, '#617089'); rect(c, x - 7, y - 29, 16, 3, '#EBEAF0');
    rect(c, x - 16, y - 38, 5, 5, '#F0E6E7'); rect(c, x - 15, y - 39, 3, 2, '#754D50');
    rect(c, x + 14, y - 37, 5, 5, seat.index % 2 ? '#7D98C6' : '#C75874');
    // Upholstered chair, visible around the seated sprite.
    rect(c, x - 11, y - 6, 22, 13, dark ? '#49658F' : '#668ABC');
    rect(c, x - 9, y - 4, 18, 8, dark ? '#6D88AE' : '#93B2D6');
    rect(c, x - 10, y + 9, 3, 3, '#3A465B'); rect(c, x + 7, y + 9, 3, 3, '#3A465B');
}

function discussionPit(c, dark, en) {
    const x = 12 * TILE, y = 9.2 * TILE;
    ellipse(c, x + 3, y + 9, 85, 73, '#26334D24');
    ellipse(c, x, y, 85, 73, dark ? '#252E44' : '#687792');
    ellipse(c, x, y - 3, 81, 70, dark ? '#856776' : '#E6CBD2');
    ellipse(c, x, y - 2, 68, 58, dark ? '#5B4357' : '#B97089');
    ellipse(c, x, y + 1, 55, 46, dark ? '#44384D' : '#CA95A6');
    // Curved seating with a generous open south entrance.
    c.strokeStyle = dark ? '#BC718C' : '#913E60'; c.lineWidth = 14;
    c.beginPath(); c.ellipse(x, y - 4, 65, 54, 0, Math.PI * .83, Math.PI * 2.17); c.stroke();
    c.strokeStyle = dark ? '#D99CAC' : '#E9B5C3'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(x, y - 7, 64, 53, 0, Math.PI * .83, Math.PI * 2.17); c.stroke();
    rect(c, x - 22, y + 46, 44, 7, dark ? '#B39AA9' : '#E6CDD6');
    rect(c, x - 27, y + 53, 54, 6, dark ? '#917D95' : '#BBA9C2');
    ellipse(c, x, y + 3, 33, 19, '#2F273C40');
    ellipse(c, x, y - 6, 33, 20, '#865D69');
    ellipse(c, x, y - 10, 33, 19, dark ? '#BC8D84' : '#F0C4A7');
    // A shared plan and two cups make this a working place.
    rect(c, x - 16, y - 20, 24, 14, '#E9EDF5'); rect(c, x - 13, y - 17, 13, 2, '#789BD0');
    rect(c, x - 13, y - 12, 6, 3, '#BA496C'); rect(c, x - 4, y - 12, 7, 3, '#83A1C2');
    ellipse(c, x + 18, y - 9, 3, 3, '#FDF7F0'); ellipse(c, x + 18, y - 9, 1.5, 1.5, '#654553');
    // Elevated wall display, visibly distinct from the small desk screens.
    rect(c, x - 36, y - 86, 72, 33, '#303B53'); rect(c, x - 32, y - 82, 64, 23, dark ? '#172A41' : '#F3F5FB');
    rect(c, x - 30, y - 57, 60, 3, '#647D9F');
    text(c, en ? 'REVIEW' : '함께 보는 곳', x, y - 89, 9, dark ? '#CED5E7' : '#536580', 'center');
}

function archive(c, dark, en) {
    const x = 17 * TILE, y = TILE;
    wall(c, x, y, 6 * TILE, dark);
    sign(c, en ? 'Library' : '자료실', x + 47, y - 22, 72, '#416899');
    // Open glass canopy and blue ribs, with light falling onto the rack aisle.
    poly(c, [[x - 4, y - 20], [x + 25, y - 37], [x + 6 * TILE + 5, y - 37], [x + 6 * TILE + 5, y - 20]], dark ? '#48688960' : '#B4D4EB85', '#6E8FB1', 2);
    for (let k = 21; k < 6 * TILE; k += 37) poly(c, [[x + k, y - 20], [x + k + 26, y - 37]], null, '#718CA9', 2);
    for (const tx of [19, 21]) {
        const rx = tx * TILE, ry = 2 * TILE;
        rect(c, rx + 4, ry + 4, 27, 33, '#21364F30');
        rect(c, rx + 2, ry - 13, 28, 43, '#273C5C'); rect(c, rx + 3, ry - 16, 27, 4, '#91AAC7');
        for (let row = 0; row < 4; row++) {
            rect(c, rx + 5, ry - 9 + row * 9, 22, 7, dark ? '#445D7D' : '#6985A7');
            rect(c, rx + 7, ry - 7 + row * 9, 12, 1, '#233C5C');
            rect(c, rx + 23, ry - 7 + row * 9, 2, 2, '#9BD7F0');
        }
    }
    // Floor conduit follows the architecture instead of floating over it.
    rect(c, x + 8, y + 114, 158, 3, dark ? '#5494B8' : '#688EAF');
    for (const tx of [19, 20]) {
        const bx = tx * TILE, by = 5 * TILE;
        rect(c, bx, by - 12, 32, 35, '#6E6274'); rect(c, bx + 2, by - 9, 28, 12, '#3D4860');
        for (let b = 0; b < 6; b++) rect(c, bx + 4 + b * 4, by - 7 + (b % 2), 3, 10 - b % 2, ['#B5657F', '#E3BA85', '#819ECC'][b % 3]);
        rect(c, bx + 2, by + 6, 28, 13, '#E1D2CA'); rect(c, bx + 13, by + 10, 6, 2, '#938395');
    }
    // Side glass catches daylight, but its lower edge stays open at the bridge.
    rect(c, x + 6 * TILE - 4, y + 15, 4, 5 * TILE - 16, '#A5C9E43D');
    for (let gy = y + 18; gy < y + 160; gy += 39) rect(c, x + 6 * TILE - 4, gy, 4, 3, '#7496B2');
}

function terrace(c, dark, en) {
    const x = 17 * TILE, y = 9 * TILE;
    // Cafe counter and a striped fabric awning: the second large silhouette.
    rect(c, x + 82, y + 24, 106, 37, '#714C59'); rect(c, x + 79, y + 21, 110, 13, dark ? '#BA8E7D' : '#F1CBB0');
    for (let k = 86; k < 187; k += 9) rect(c, x + k, y + 39, 2, 19, '#A6746D');
    for (let k = 0; k < 10; k++) {
        const color = k % 2 ? (dark ? '#B899A9' : '#F4E6E8') : (dark ? '#8E415D' : '#B43D60');
        poly(c, [[x + 73 + k * 12, y - 3], [x + 85 + k * 12, y - 3], [x + 90 + k * 12, y + 17], [x + 78 + k * 12, y + 17]], color);
        rect(c, x + 78 + k * 12, y + 17, 12, 5 + k % 2 * 2, color);
    }
    rect(c, x + 77, y - 5, 3, 28, '#624D61'); rect(c, x + 190, y - 5, 3, 28, '#624D61');
    sign(c, en ? 'Coffee break' : '잠깐 쉬어요', x + 5, y + 7, 76, '#805366');
    // Espresso machine, grinder, cups and a pastry tray.
    rect(c, 21 * TILE + 3, 10 * TILE - 16, 25, 23, '#D7DEE8'); rect(c, 21 * TILE + 6, 10 * TILE - 11, 19, 10, '#4B586F');
    rect(c, 21 * TILE + 8, 10 * TILE + 1, 15, 4, '#414D65');
    for (const cx of [21 * TILE + 9, 21 * TILE + 17]) rect(c, cx, 10 * TILE - 3, 5, 5, '#FDF2E6');
    rect(c, 22 * TILE + 4, 10 * TILE - 5, 18, 11, '#92726F');
    for (let i = 0; i < 3; i++) ellipse(c, 22 * TILE + 8 + i * 5, 10 * TILE - 1, 2, 3, '#E2B080');
    // Small record player and record sleeves on the wall, tied to the real radio.
    rect(c, 22 * TILE + 3, 12 * TILE - 12, 25, 34, '#AC5270'); rect(c, 22 * TILE + 6, 12 * TILE - 9, 19, 22, '#2B344C');
    ellipse(c, 22 * TILE + 15, 12 * TILE + 1, 7, 7, '#515E7B'); ellipse(c, 22 * TILE + 15, 12 * TILE + 1, 2, 2, '#EDB0B9');
    rect(c, 22 * TILE + 7, 12 * TILE + 17, 16, 2, '#EDB0B9');
    // The lounge has one long sofa, a glass fish tank and a side table.
    rect(c, 20 * TILE - 2, 14 * TILE - 7, 70, 28, '#5F6084'); rect(c, 20 * TILE, 14 * TILE - 12, 66, 12, '#8791BC');
    for (let s = 0; s < 3; s++) rect(c, 20 * TILE + 3 + s * 20, 14 * TILE + 1, 18, 14, '#ADB4D2');
    rect(c, 20 * TILE - 4, 14 * TILE - 4, 7, 27, '#8584AD'); rect(c, 22 * TILE - 2, 14 * TILE - 4, 7, 27, '#8584AD');
    rect(c, 18 * TILE - 5, 14 * TILE - 18, 40, 27, '#577C9E'); rect(c, 18 * TILE - 2, 14 * TILE - 15, 34, 19, dark ? '#39657C' : '#88C8DA');
    rect(c, 18 * TILE - 2, 14 * TILE + 1, 34, 3, '#C5A78F'); rect(c, 18 * TILE - 3, 14 * TILE + 10, 3, 10, '#735C6C');
    rect(c, 18 * TILE + 29, 14 * TILE + 10, 3, 10, '#735C6C');
    // Railings only around the outside, with an opening to the walkway.
    for (let xx = x + 5; xx < x + 6 * TILE; xx += 30) rect(c, xx, 17 * TILE - 8, 3, 17, '#51617B');
    rect(c, x, 17 * TILE - 9, 6 * TILE, 3, '#D0D6E3');
    plant(c, 22.5 * TILE, 16.5 * TILE, 1.3);
    // Suspended bulbs in a single quiet curve.
    c.strokeStyle = '#444C635C'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x + 10, y - 12); c.quadraticCurveTo(x + 85, y + 1, x + 188, y - 12); c.stroke();
    for (const [lx, ly] of [[x + 17, y - 10], [x + 51, y - 6], [x + 88, y - 5], [x + 125, y - 6], [x + 164, y - 9]]) {
        rect(c, lx, ly, 1, 6, '#646077'); ellipse(c, lx + 1, ly + 7, 2, 3, dark ? '#FFDBA1' : '#F7E7C2');
    }
}

function studio(c, dark, en, desks) {
    wall(c, TILE, TILE, 15 * TILE, dark);
    for (const x of [3, 5, 11, 13]) windowPane(c, x * TILE, TILE - 13, 44, 31, dark);
    // Steel roof sections form an open cutaway; the front stays unobstructed.
    for (const tx of [1, 8, 15.8]) {
        rect(c, tx * TILE - 4, TILE - 14, 8, 50, '#5F708A');
        rect(c, tx * TILE - 3, TILE - 14, 2, 49, '#BDCBDE');
        poly(c, [[tx * TILE, TILE - 13], [tx * TILE + 27, TILE - 37], [tx * TILE + 54, TILE - 13]], null, dark ? '#7E8FA8' : '#99ACC7', 4);
    }
    sign(c, en ? 'The studio' : '작은 제작소', 7.4 * TILE, TILE - 17, 99, '#B63358');
    // Wide task board; paper notes are physical, not an extra UI overlay.
    rect(c, 8 * TILE - 9, TILE + 15, 70, 27, '#5E6984'); rect(c, 8 * TILE - 6, TILE + 18, 64, 20, dark ? '#96A2B2' : '#F4F5F8');
    for (let i = 0; i < 6; i++) rect(c, 8 * TILE + i % 3 * 19, TILE + 20 + (i / 3 | 0) * 9, 13, 6, ['#DC95A7', '#8BAED2', '#DDBF8B'][i % 3]);
    // Each work island has one carpet and a utility spine, not a tiled desk grid.
    for (const [x, y, w, color] of [[2.5, 2.9, 5.3, '#ADC1D9'], [9.5, 2.9, 5.8, '#C9BED7'], [2.5, 7.9, 5.3, '#C9B8CA'], [2.5, 11.9, 5.3, '#A6BCCF']]) {
        rect(c, x * TILE, y * TILE, w * TILE, 2 * TILE, dark ? '#65708855' : color + '80');
        rect(c, x * TILE + 3, y * TILE + 3, w * TILE - 6, 1, '#FFFFFF50');
        rect(c, x * TILE + 4, y * TILE + 2 * TILE - 4, w * TILE - 8, 1, '#FFFFFF50');
    }
    // Tall tool wall at the west end, a pinboard and a little materials trolley.
    rect(c, TILE + 1, 6.8 * TILE, 22, 61, dark ? '#8A6A70' : '#BF9991');
    for (let y = 0; y < 7; y++) for (let x = 0; x < 3; x++) rect(c, TILE + 5 + x * 5, 6.8 * TILE + 5 + y * 7, 1, 1, '#7B6068');
    rect(c, TILE + 6, 7.1 * TILE, 10, 4, '#BAC7D7'); rect(c, TILE + 12, 7.5 * TILE, 3, 13, '#445A78');
    rect(c, 1.25 * TILE, 13.9 * TILE, 26, 21, '#BA6A7E'); rect(c, 1.25 * TILE - 2, 13.9 * TILE - 3, 30, 5, '#DEABB4');
    rect(c, 1.25 * TILE + 3, 14.6 * TILE, 3, 4, '#36435E'); rect(c, 1.25 * TILE + 21, 14.6 * TILE, 3, 4, '#36435E');
    // Shared benches make each pair one coherent work island.
    for (const [sx, sy] of [[3, 4], [10, 4], [3, 9], [3, 13]]) {
        const x = (sx + .5) * TILE - 21, y = (sy + .5) * TILE - 44;
        rect(c, x + 1, y + 6, 106, 23, '#29375022');
        rect(c, x, y, 106, 18, dark ? '#B1897C' : '#DEAD94');
        rect(c, x, y, 106, 2, dark ? '#C49A8B' : '#F4D1B7');
        rect(c, x + 44, y + 7, 17, 9, dark ? '#9F7183' : '#BC748B');
        rect(c, x + 46, y + 7, 12, 1, '#E9CFDA');
    }
    for (const d of DESK_LAYOUT.filter(d => !desks.includes(d))) {
        const x = (d.x + .5) * TILE, y = (d.y - .5) * TILE;
        // Unoccupied flexible spots hold equipment cases, not phantom obstacles.
        rect(c, x - 9, y - 7, 18, 13, dark ? '#56647C' : '#A5B1C6');
        rect(c, x - 9, y - 8, 18, 3, dark ? '#7E8BA2' : '#C6CFDE');
        rect(c, x - 3, y - 1, 6, 2, '#69788E');
    }
    for (const d of desks) workstation(c, d, dark);
    discussionPit(c, dark, en);
    plant(c, 2.5 * TILE, 1.6 * TILE, .9); plant(c, 14.7 * TILE, 1.7 * TILE, 1);
    plant(c, 2.2 * TILE, 11.5 * TILE, 1.2);
    // A sunlit passage remains around all four sides of the conversation pit.
    if (getSkyPalette().starDensity < .3) for (const tx of [3, 5, 11, 13]) poly(c, [[tx * TILE + 4, 1.5 * TILE], [tx * TILE + 30, 1.5 * TILE], [tx * TILE + 80, 3 * TILE], [tx * TILE + 52, 3 * TILE]], '#FFF5DB1F');
    // Reception bench and a physical welcome mat at the projecting entrance.
    rect(c, 10 * TILE, 15 * TILE, 4 * TILE, 20, dark ? '#694858' : '#C17288');
    rect(c, 10 * TILE + 4, 15 * TILE + 2, 4 * TILE - 8, 2, '#F3CFD380');
    text(c, 'AI TYCOON', 12 * TILE, 15 * TILE + 14, 8, '#FFF7F6', 'center');
    for (let i = 0; i < 4; i++) rect(c, 9 * TILE - i * 2, (16.8 + i * .22) * TILE, 5 * TILE + i * 4, 4, dark ? '#8090A8' : '#DCE3ED');
    rect(c, 9.4 * TILE, 16.05 * TILE, 4.2 * TILE, 17, dark ? '#B45979' : '#BC385C');
    text(c, en ? 'HELLO!' : '어서 와요', 11.5 * TILE, 16.05 * TILE + 12, 9, '#FFFFFF', 'center');
}

function bridges(c, dark) {
    for (const y of [5, 11]) {
        for (let xx = 16 * TILE; xx < 17 * TILE; xx += 6) rect(c, xx, y * TILE, 2, 2 * TILE, dark ? '#9CACBE55' : '#F0F4FB70');
        for (const yy of [y * TILE, (y + 2) * TILE - 3]) {
            rect(c, 16 * TILE - 4, yy - 7, 40, 3, '#849DBE');
            rect(c, 16 * TILE - 3, yy - 7, 2, 12, '#566D8F'); rect(c, 17 * TILE + 1, yy - 7, 2, 12, '#566D8F');
        }
    }
    // Narrow courtyard between the two wings: a real gap, not floor to walk on.
    rect(c, 17.5 * TILE, 7.7 * TILE, 5 * TILE, 10, dark ? '#303D5650' : '#7A8DA735');
    for (let i = 0; i < 4; i++) rect(c, (18 + i) * TILE, 7.7 * TILE, 20, 2, dark ? '#637798' : '#A9B9CC');
}

function drawStatic(c, dark, en, desks) {
    for (const b of BUILDINGS) foundation(c, b, dark);
    for (const b of BUILDINGS) floor(c, b, dark);
    studio(c, dark, en, desks); archive(c, dark, en); terrace(c, dark, en); bridges(c, dark);
}

export function drawOfficeScene(ctx, frame) {
    const dark = document.body.classList.contains('dark');
    const en = window.aiTycoonI18n?.getLang?.() === 'en';
    const desks = DESK_LAYOUT.filter((d, i) => i < 8 || Object.values(S.visualAgents).some(v => Math.floor(v.homeX / TILE) === d.x && Math.floor(v.homeY / TILE) === d.y));
    const key = `${dark}|${en}|${getActiveTheme()}|${Math.floor(getSkyPalette().hour * 60)}|${document.fonts.status}|${desks.map(d => d.index).join(',')}`;
    if (key !== cacheKey) {
        cached = document.createElement('canvas'); cached.width = COLS * TILE + 64; cached.height = ROWS * TILE + 64;
        const c = cached.getContext('2d'); c.translate(32, 32); drawStatic(c, dark, en, desks); cacheKey = key;
    }
    ctx.drawImage(cached, -32, -32);
    // Active displays react to actual work; architecture itself stays still.
    for (const d of desks) {
        const a = S.liveAgents.find(agent => {
            const v = S.visualAgents[agent.pid]; return v && Math.floor(v.homeX / TILE) === d.x && Math.floor(v.homeY / TILE) === d.y;
        });
        if (!a?.isRunning) continue;
        const x = (d.x + .5) * TILE - 7, y = (d.y + .5) * TILE - 47;
        rect(ctx, x, y, 16, 10, a.needsReview ? '#E1ABC0' : '#B5D8E5');
        for (let row = 0; row < 3; row++) rect(ctx, x + 2, y + 2 + row * 3, 5 + (row + d.index) % 4 * 2, 1, a.needsReview ? '#963F64' : '#4E7A9A');
        if (Math.floor(frame / 30) % 2 === 0) rect(ctx, x + 13, y + 8, 1, 1, '#F9FDFF');
    }
    const reviews = S.liveAgents.filter(a => a.needsReview).length;
    text(ctx, reviews ? (en ? `Review: ${reviews}` : `확인 ${reviews}건`) : (en ? 'Clear' : '모두 확인'), 12 * TILE, 9.2 * TILE - 67, 9, reviews ? (dark ? '#FFB7CE' : '#AE3159') : (dark ? '#AECCE1' : '#647891'), 'center');
    // Fish and steam belong to their objects, without map-wide sparkles.
    const fishX = 18 * TILE + 13 + Math.sin(frame * .017) * 9;
    rect(ctx, fishX, 14 * TILE - 8, 5, 2, '#EFC28F'); rect(ctx, fishX - 2, 14 * TILE - 9, 2, 4, '#DB9D7D');
    const steam = Math.floor(frame / 22) % 3;
    rect(ctx, 21 * TILE + 13 + steam, 10 * TILE - 16 - steam * 3, 2, 4, '#FFFFFF65');
    if (dark || getSkyPalette().starDensity > .3) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        for (const [x, y, r] of [[21.5 * TILE, 10.7 * TILE, 38], [19 * TILE, 2.5 * TILE, 27], [12 * TILE, 6.7 * TILE, 26]]) {
            const glow = ctx.createRadialGradient(x, y, 2, x, y, r); glow.addColorStop(0, '#E7BDB218'); glow.addColorStop(1, '#E7BDB200');
            ellipse(ctx, x, y, r, r, glow);
        }
        ctx.restore();
    }
}

export function officeSceneDebug() { return { buildings: BUILDINGS.length, seats: DESK_LAYOUT.length, map: OFFICE_MAP }; }
