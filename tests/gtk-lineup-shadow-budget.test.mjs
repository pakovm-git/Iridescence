import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeGtkStyles} from '../styles.js';

const source = readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8');
const rules = css => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
for (const tint of ['subtle', 'balanced', 'rich']) {
    for (const [mode, opacity] of [['solid', 90], ['translucent', 65], ['translucent', 90]]) {
        const css = makeGtkStyles(tint, mode, source, opacity);
        for (const selector of ['list.boxed-list', 'list.boxed-list-separate > row:drop(active)', 'tabthumbnail .card', 'toggle-group > toggle:checked']) {
            const body = rules(css).find(([, selectors, declarations]) => selectors.split(',').map(x => x.trim()).includes(selector) && declarations.includes('--iridescence-base-shadow:'))?.[2];
            assert.ok(body, `Find native raised-shadow rule for ${selector}`);
            assert.ok(body.includes('0 1px 3px 1px RGB(0 0 6/4.9%)'), `${tint}/${mode}/${opacity}/${selector}: first native blur alpha reduced 30%`);
            assert.ok(body.includes('0 2px 6px 2px RGB(0 0 6/2.1%)'), `${selector}: second native blur alpha reduced 30%`);
        }
        for (const selector of ['toast', 'toggle-group.osd:not(.flat) > toggle:checked']) {
            const body = rules(css).find(([, selectors, declarations]) => selectors.split(',').map(x => x.trim()).includes(selector) && declarations.includes('--iridescence-base-shadow:'))?.[2];
            assert.ok(body.includes('0 1px 3px 1px RGB(0 0 6/7%)'), `${selector}: notification/OSD blur stays original`);
            assert.ok(body.includes('0 2px 6px 2px RGB(0 0 6/3%)'), `${selector}: notification/OSD blur stays original`);
        }
        assert.ok(css.includes('box-shadow:') && css.includes('currentColor 25%, transparent'), 'Contrast outlines remain present');
    }
}
console.log('GTK native blurred control shadows reduced 30% in every tint/opacity; notification and OSD exceptions retained');
