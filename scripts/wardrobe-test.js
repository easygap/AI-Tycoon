// Persistence must not change a person's identity or leak demo styling to work.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
    const store = new Map();
    global.localStorage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) };
    const source = fs.readFileSync(path.join(__dirname, '../js/wardrobe.js'), 'utf8');
    const w = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const theme = { name: '민지', hair: '#251F32', skin: '#F5D5C8', hairStyle: 'long', accessory: 'ribbon', defaultOutfit: 'atelier' };
    const agent = { platform: 'codex', sessionId: 'same-session', pid: 123, signals: { sources: ['session'] } };
    const look = w.withOutfit(theme, 'cloud');
    for (const key of ['name','hair','skin','hairStyle','accessory','defaultOutfit']) assert.equal(look[key], theme[key], `Identity changed: ${key}`);
    assert.equal(look.body, w.getOutfit('cloud').body);
    assert.equal(w.saveOutfit(agent, 'poet'), true);
    assert.equal(w.outfitForAgent(theme, { ...agent, pid: 789 }).outfit, 'poet', 'A new PID must retain the session outfit');
    assert.equal(w.outfitForAgent(theme, { ...agent, sessionId: 'another' }).outfit, 'atelier');
    assert.equal(w.outfitForAgent(theme, { ...agent, platform: 'claude' }).outfit, 'atelier');
    assert.equal(w.outfitForAgent(theme, { ...agent, signals: { sources: ['demo'] } }).outfit, 'atelier');
    assert.equal(w.saveOutfit(agent, 'not-an-outfit'), false);
    assert.equal(w.outfitForAgent(theme, agent).outfit, 'poet');
    assert.equal(w.saveOutfit(agent, null), true);
    assert.equal(w.outfitForAgent(theme, agent).outfit, 'atelier');
    store.set('ai-tycoon-wardrobe-v1', 'invalid json');
    assert.equal(w.outfitForAgent(theme, agent).outfit, 'atelier');
    store.set('ai-tycoon-wardrobe-v1', JSON.stringify([[w.wardrobeKey(agent), 'removed-style'], null, 'invalid']));
    assert.equal(w.outfitForAgent(theme, agent).outfit, 'atelier');
    global.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
    assert.equal(w.saveOutfit(agent, 'denim'), false, 'The UI must not claim a failed write was saved');
    global.localStorage.getItem = () => { throw new Error('Storage disabled'); };
    assert.equal(w.outfitForAgent(theme, agent).outfit, 'atelier');
    console.log('Wardrobe: identity, session persistence, demo isolation, reset and unavailable storage passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
