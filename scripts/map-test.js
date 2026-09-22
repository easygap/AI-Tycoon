// Geometry regressions: every seat and destination must be reachable without
// crossing furniture, the courtyard or a gap between the buildings.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
    const source = fs.readFileSync(path.join(__dirname, '../js/officeLayout.js'), 'utf8');
    const m = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const { TILE, COLS, ROWS, OFFICE_MAP, DESK_LAYOUT, POI, ENTRY, BOSS_WAIT_SPOTS, generateDeskSpots, isWalkable, findOfficePath } = m;
    assert.equal(OFFICE_MAP.length, ROWS);
    assert(OFFICE_MAP.every(row => row.length === COLS));
    const seats = generateDeskSpots(100);
    assert.equal(seats.length, 100);
    assert.equal(new Set(seats.map(s => `${s.x},${s.y}`)).size, 100);
    assert(seats.every(s => isWalkable(s.x, s.y)));
    assert(DESK_LAYOUT.every(s => OFFICE_MAP[s.y - 1][s.x] === 'D'));
    const targets = [...Object.values(POI), ...BOSS_WAIT_SPOTS, ...seats.map(s => ({ x: (s.x + .5) * TILE, y: (s.y + .5) * TILE }))];
    let routes = 0, samples = 0;
    function checkRoute(from, to) {
        const route = findOfficePath(from, to); assert(route.length, `Destination must be reachable: ${JSON.stringify(to)}`);
        assert(Math.hypot(route.at(-1).x - to.x, route.at(-1).y - to.y) < .001, `Unreachable exact target ${JSON.stringify(to)}`);
        let previous = from;
        for (const p of route) {
            const distance = Math.hypot(p.x - previous.x, p.y - previous.y);
            for (let step = 0; step <= distance; step += 2) {
                const f = distance ? step / distance : 0;
                const x = previous.x + (p.x - previous.x) * f, y = previous.y + (p.y - previous.y) * f;
                assert(isWalkable(Math.floor(x / TILE), Math.floor(y / TILE)), `Blocked segment at ${x},${y}`); samples++;
            }
            previous = p;
        }
        routes++;
    }
    for (const target of targets) checkRoute(ENTRY, target);
    for (const from of Object.values(POI)) for (const to of Object.values(POI)) checkRoute(from, to);
    let patrolSamples = 0;
    for (const [name, route] of Object.entries(m.PATROLS)) for (let i = 0; i < route.length; i++) {
        const a = route[i], b = route[(i + 1) % route.length];
        const distance = Math.hypot(b.x - a.x, b.y - a.y) * TILE;
        for (let step = 0; step <= distance; step += 2) {
            const f = distance ? step / distance : 0;
            assert(isWalkable(Math.floor(a.x + (b.x - a.x) * f), Math.floor(a.y + (b.y - a.y) * f)), `${name} crosses an obstacle`); patrolSamples++;
        }
    }
    const snapped = findOfficePath(ENTRY, { x: -100, y: -100 }).at(-1);
    assert(isWalkable(Math.floor(snapped.x / TILE), Math.floor(snapped.y / TILE)));
    assert.equal(isWalkable(16, 9), false, 'The courtyard must remain unwalkable');
    for (const row of [5, 6, 11, 12]) assert(isWalkable(16, row), 'Both bridges must stay open');
    console.log(`Office map: ${routes} reachable routes, ${samples} collision samples, ${patrolSamples} NPC samples, 100 unique positions passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
