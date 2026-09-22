import { S, esc } from './state.js';
import { OUTFITS, getOutfit, withOutfit, saveOutfit } from './wardrobe.js';
import { characterFrame, CHARACTER_WIDTH, CHARACTER_HEIGHT } from './characters.js';
import { getLang } from './i18n.js';

export function mountWardrobe(host, agent, originalTheme, onChange) {
    if (!host) return;
    const en = getLang() === 'en';
    let theme = originalTheme, direction = 0;
    const outfitName = id => getOutfit(id)[en ? 'en' : 'name'];
    host.innerHTML = `
        <section class="character-profile" aria-label="${en ? 'Character' : '직원 캐릭터'}">
            <button class="character-turn" type="button" aria-label="${en ? 'Turn character' : '캐릭터 돌려 보기'}">
                <canvas width="${CHARACTER_WIDTH}" height="${CHARACTER_HEIGHT}" aria-hidden="true"></canvas>
                <span>${en ? 'Turn' : '돌려 보기'} <span aria-hidden="true">↻</span></span>
            </button>
            <div class="character-profile-copy">
                <strong>${esc(theme.name)}</strong>
                <p class="character-outfit-name">${esc(outfitName(theme.outfit))}</p>
                <button type="button" class="character-map-link">${en ? 'Find on map' : '맵에서 보기'} <span aria-hidden="true">↗</span></button>
            </div>
        </section>
        <details class="wardrobe">
            <summary>${en ? 'Change outfit' : '옷 갈아입기'}<span aria-hidden="true">+</span></summary>
            <p class="wardrobe-help">${en ? 'Choose a look. Your character keeps their face and name.' : '마음에 드는 옷을 골라 주세요. 얼굴과 이름은 그대로예요.'}</p>
            <div class="wardrobe-grid" role="group" aria-label="${en ? 'Outfits' : '옷 고르기'}">
                ${OUTFITS.map(outfit => `<button type="button" class="wardrobe-choice" data-outfit="${outfit.id}" aria-pressed="${theme.outfit === outfit.id}">
                    <canvas width="${CHARACTER_WIDTH}" height="${CHARACTER_HEIGHT}" aria-hidden="true"></canvas>
                    <span>${esc(outfit[en ? 'en' : 'name'])}</span><small>${en ? 'Wear' : '입기'}</small>
                </button>`).join('')}
            </div>
            <div class="wardrobe-footer"><button type="button" class="wardrobe-reset">${en ? 'Original outfit' : '원래 옷으로'}</button><span class="wardrobe-saved" role="status" aria-live="polite">${en ? 'Saved in this browser' : '이 브라우저에 저장돼요'}</span></div>
        </details>`;
    const preview = host.querySelector('.character-turn canvas');
    const draw = (canvas, look, view = 0) => {
        const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
        c.drawImage(characterFrame(look, { direction: view, status: 'portrait' }), 0, 0);
    };
    const choices = [...host.querySelectorAll('[data-outfit]')];
    const refresh = () => {
        draw(preview, theme, direction);
        host.querySelector('.character-outfit-name').textContent = outfitName(theme.outfit);
        for (const button of choices) {
            const selected = button.dataset.outfit === theme.outfit;
            button.setAttribute('aria-pressed', String(selected));
            button.querySelector('small').textContent = selected ? (en ? 'Wearing' : '입는 중') : (en ? 'Wear' : '입기');
            draw(button.querySelector('canvas'), withOutfit(theme, button.dataset.outfit));
        }
        host.querySelector('.wardrobe-reset').disabled = theme.outfit === theme.defaultOutfit;
    };
    const apply = id => {
        const visual = S.visualAgents[agent.pid];
        if (!visual) return;
        theme = withOutfit(theme, id || theme.defaultOutfit);
        visual.theme = theme;
        const persisted = saveOutfit(agent, id);
        refresh();
        host.querySelector('.wardrobe-saved').textContent = persisted
            ? (en ? 'Outfit saved' : '옷을 바꿨어요')
            : (en ? 'Applied for now. Browser storage is unavailable.' : '지금 화면에 적용했어요. 브라우저에 저장할 수는 없어요.');
        onChange?.();
    };
    choices.forEach((button, i) => {
        button.addEventListener('click', () => apply(button.dataset.outfit));
        button.addEventListener('keydown', event => {
            const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }[event.key];
            if (!step) return;
            event.preventDefault(); event.stopPropagation(); choices[(i + step + choices.length) % choices.length].focus();
        });
    });
    host.querySelector('.wardrobe-reset').addEventListener('click', () => apply(null));
    host.querySelector('.character-turn').addEventListener('click', () => { direction = [2, 0, 3, 1][direction]; draw(preview, theme, direction); });
    host.querySelector('.character-map-link').addEventListener('click', () => window.showAgentOnMap?.(agent.pid));
    refresh();
}
