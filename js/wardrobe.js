// Original outfits. Research and palette provenance: docs/STYLE-2026.md.
export const OUTFITS = [
    { id: 'atelier', name: '주황 작업 재킷', en: 'Orange work jacket', cut: 'work', body: '#FF5C34', bodyDark: '#B83E2B', inner: '#F5F9FD', accent: '#D7EFFF', trousers: '#494357', shoes: '#D7EFFF', detail: 'satchel' },
    { id: 'cloud', name: '하늘색 블루종', en: 'Sky blue blouson', cut: 'blouson', body: '#D7EFFF', bodyDark: '#829FBE', inner: '#593647', accent: '#FF5C34', trousers: '#596F93', shoes: '#F5F9FD', detail: 'patch' },
    { id: 'poet', name: '자두색 니트 조끼', en: 'Plum knit vest', cut: 'vest', body: '#654051', bodyDark: '#351E28', inner: '#D7EFFF', accent: '#F7AE73', trousers: '#7B91B1', shoes: '#351E28', detail: 'brooch' },
    { id: 'denim', name: '데님 멜빵바지', en: 'Denim overalls', cut: 'overalls', body: '#5278A5', bodyDark: '#314B74', inner: '#F5F9FD', accent: '#FF5C34', trousers: '#5278A5', shoes: '#FFFDFC', detail: 'beanie' },
    { id: 'orchid', name: '보라 카디건', en: 'Lilac cardigan', cut: 'cardigan', body: '#BAAAD6', bodyDark: '#7C668D', inner: '#FAFCFF', accent: '#FF735D', trousers: '#484A66', shoes: '#F1E9F7', detail: 'scarf' },
    { id: 'stripe', name: '줄무늬 셔츠', en: 'Striped shirt', cut: 'stripe', body: '#F5F9FD', bodyDark: '#A4B7CE', inner: '#D7EFFF', accent: '#5278A5', trousers: '#593647', shoes: '#FF735D', detail: 'pouch' },
];
export const DEFAULT_OUTFITS = ['atelier', 'stripe', 'poet', 'cloud', 'orchid', 'denim', 'cloud', 'poet', 'stripe', 'atelier', 'cloud', 'orchid', 'denim', 'poet', 'atelier', 'stripe', 'orchid', 'denim', 'cloud', 'poet'];
const STORAGE = 'ai-tycoon-wardrobe-v1';
const LIMIT = 240;
export const getOutfit = id => OUTFITS.find(outfit => outfit.id === id) || OUTFITS[0];
export function withOutfit(theme, id) {
    const outfit = getOutfit(id);
    return { ...theme, ...outfit, name: theme.name, outfit: outfit.id };
}
export function wardrobeKey(agent) {
    const demo = agent?.signals?.sources?.includes('demo') === true;
    return JSON.stringify([demo ? 'demo' : 'live', agent?.platform || 'agent', String(agent?.sessionId || agent?.threadId || agent?.pid || '')]);
}
function readLooks() {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE) || '[]');
        return new Map(Array.isArray(value) ? value.filter(entry => Array.isArray(entry) && typeof entry[0] === 'string' && OUTFITS.some(o => o.id === entry[1])).slice(-LIMIT) : []);
    } catch { return new Map(); }
}
export function outfitForAgent(theme, agent) {
    return withOutfit(theme, readLooks().get(wardrobeKey(agent)) || theme.defaultOutfit || theme.outfit);
}
export function saveOutfit(agent, id) {
    if (id !== null && !OUTFITS.some(outfit => outfit.id === id)) return false;
    const looks = readLooks(), key = wardrobeKey(agent);
    looks.delete(key);
    if (id !== null) looks.set(key, id);
    try { localStorage.setItem(STORAGE, JSON.stringify([...looks].slice(-LIMIT))); return true; }
    catch { return false; }
}
