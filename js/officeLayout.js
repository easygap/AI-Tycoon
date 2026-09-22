// Shared floor plan. Rendering, seating and walking use the same geometry.
export const TILE = 32;
export const COLS = 24;
export const ROWS = 18;

export const BUILDINGS = [
    { id: 'studio', x: 1, y: 1, w: 15, h: 15, floor: 'F' },
    { id: 'archive', x: 17, y: 1, w: 6, h: 6, floor: 'H' },
    { id: 'north-bridge', x: 16, y: 5, w: 1, h: 2, floor: 'G' },
    { id: 'terrace', x: 17, y: 9, w: 6, h: 8, floor: 'T' },
    { id: 'south-bridge', x: 16, y: 11, w: 1, h: 2, floor: 'G' },
    { id: 'entrance', x: 9, y: 16, w: 5, h: 2, floor: 'E' },
];
export const MAP_AREAS = {
    studio: { x: 1.5, y: 2, w: 6.5, h: 12.5 },
    meeting: { x: 8.7, y: 6.1, w: 6.9, h: 6.3 },
    archive: { x: 16.7, y: -.3, w: 6.8, h: 8 },
    terrace: { x: 16.8, y: 8.5, w: 6.6, h: 9 },
};

// Seats sit in front of the desk, so a walking character never crosses its monitor.
export const DESK_LAYOUT = [
    [3, 4], [5, 4], [10, 4], [12, 4], [3, 9], [5, 9], [3, 13], [5, 13],
    [7, 4], [14, 4], [7, 9], [7, 13], [3, 6], [5, 6], [10, 14], [13, 14],
].map(([x, y], index) => ({ x, y, index }));

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('X'));
for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) grid[y][x] = b.floor;
}
// Actual furniture footprints, not just visual decorations.
for (const d of DESK_LAYOUT) grid[d.y - 1][d.x] = 'D';
for (const [x, y] of [[4, 3], [11, 3], [4, 8], [4, 12]]) grid[y][x] = 'D';
for (let x = 1; x < 16; x++) grid[1][x] = 'W';
for (let x = 17; x < 23; x++) grid[1][x] = 'W';
for (const [x, y] of [[10, 7], [11, 7], [12, 7], [13, 7], [9, 8], [9, 9], [10, 8], [10, 9], [13, 8], [13, 9], [14, 8], [14, 9], [10, 10], [13, 10]]) grid[y][x] = 'Q';
for (const [x, y, tile] of [
    [8, 1, 'B'], [9, 1, 'B'], [19, 2, 'S'], [21, 2, 'S'],
    [19, 5, 'K'], [20, 5, 'K'], [21, 10, 'C'], [22, 10, 'C'],
    [22, 12, 'V'], [18, 14, 'A'], [20, 14, 'L'], [21, 14, 'L'],
    [2, 1, 'P'], [14, 1, 'P'], [2, 11, 'P'], [22, 16, 'P'],
    [11, 8, 'Q'], [12, 8, 'Q'], [11, 9, 'Q'], [12, 9, 'Q'],
]) grid[y][x] = tile;
export const OFFICE_MAP = grid.map(row => row.join(''));
const FLOOR_TILES = new Set(['F', 'H', 'T', 'G', 'E', 'R']);
export function isWalkable(x, y) { return FLOOR_TILES.has(OFFICE_MAP[y]?.[x]); }

const at = (x, y) => ({ x: x * TILE, y: y * TILE });
export const POI = {
    whiteboard: at(8.5, 2.5), server: at(19.5, 3.5),
    boss: at(11.5, 10.5), coffee: at(21.5, 11.5),
    aquarium: at(18.5, 15.5), lounge: at(20.5, 15.5),
    lounge2: at(21.5, 15.5), vending: at(21.5, 12.5),
    bookshelf: at(19.5, 6.5), meeting: at(12.5, 10.5),
};
export const BOSS_ACTIVE_SPOT = at(11.5, 10.5);
export const BOSS_WAIT_SPOTS = [[10.5, 12.5], [12.5, 12.5], [13.5, 12.5], [9.5, 13.5], [12.5, 13.5]].map(([x, y]) => at(x, y));
export const ENTRY = at(11.5, 16.5);

// Additional agents get unique standing work positions inside the studio.
// This also keeps old installations with many live sessions inside the map.
const seats = [...DESK_LAYOUT];
for (let y = 2; y < 16; y++) for (let x = 2; x < 16; x++) {
    if (isWalkable(x, y) && !seats.some(p => p.x === x && p.y === y)
        && !Object.values(POI).some(p => Math.floor(p.x / TILE) === x && Math.floor(p.y / TILE) === y)
        && !BOSS_WAIT_SPOTS.some(p => Math.floor(p.x / TILE) === x && Math.floor(p.y / TILE) === y)) {
        seats.push({ x, y, standing: true });
    }
}
export function generateDeskSpots(count) { return seats.slice(0, Math.max(0, count)); }

export function nearestWalkable(point) {
    const tx = Math.floor(point.x / TILE), ty = Math.floor(point.y / TILE);
    if (isWalkable(tx, ty)) return { x: tx, y: ty };
    let best = null, distance = Infinity;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const d = (x + .5 - point.x / TILE) ** 2 + (y + .5 - point.y / TILE) ** 2;
        if (isWalkable(x, y) && d < distance) { best = { x, y }; distance = d; }
    }
    return best;
}

// Four-way breadth-first routing. Paths go through tile centres, including
// bridges; no diagonal shortcut can clip a desk or cross the open courtyard.
export function findOfficePath(from, to) {
    const start = nearestWalkable(from), end = nearestWalkable(to);
    if (!start || !end) return [];
    const key = p => p.y * COLS + p.x;
    const queue = [start], previous = new Map([[key(start), null]]);
    for (let cursor = 0; cursor < queue.length; cursor++) {
        const p = queue[cursor];
        if (key(p) === key(end)) break;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const n = { x: p.x + dx, y: p.y + dy };
            if (!isWalkable(n.x, n.y) || previous.has(key(n))) continue;
            previous.set(key(n), p); queue.push(n);
        }
    }
    if (!previous.has(key(end))) return [];
    const route = [];
    for (let p = end; p; p = previous.get(key(p))) route.unshift(at(p.x + .5, p.y + .5));
    const compact = route.filter((p, i) => i === 0 || i === route.length - 1 ||
        !((route[i - 1].x === p.x && p.x === route[i + 1].x) || (route[i - 1].y === p.y && p.y === route[i + 1].y)));
    if (isWalkable(Math.floor(to.x / TILE), Math.floor(to.y / TILE)) &&
        (compact.at(-1)?.x !== to.x || compact.at(-1)?.y !== to.y)) compact.push({ x: to.x, y: to.y });
    return compact;
}

export function patrolRoute(points) {
    const route = [];
    for (let i = 0; i < points.length; i++) {
        const from = at(...points[i]), to = at(...points[(i + 1) % points.length]);
        route.push(...findOfficePath(from, to).slice(0, -1).map(p => ({ x: p.x / TILE, y: p.y / TILE })));
    }
    return route;
}

export const PATROLS = {
    robot: patrolRoute([[2.5, 5.5], [8.5, 5.5], [8.5, 11.5], [15.5, 11.5], [15.5, 14.5], [8.5, 14.5], [2.5, 14.5]]),
    dog: patrolRoute([[19.5, 12.5], [19.5, 15.5], [21.5, 15.5], [21.5, 13.5], [19.5, 13.5]]),
    guard: patrolRoute([[11.5, 16.5], [8.5, 14.5], [8.5, 5.5], [19.5, 3.5], [19.5, 6.5], [15.5, 6.5], [15.5, 11.5], [19.5, 12.5], [19.5, 15.5], [17.5, 15.5], [17.5, 11.5]]),
};
