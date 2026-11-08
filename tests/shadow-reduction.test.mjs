import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeGtkStyles, makeShellStyles, TINTS} from '../styles.js';
function shadow(css, selector) {
    let value;
    for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g))
        if (selectors.split(',').some(part => part.trim() === selector))
            value = body.match(/-iridescence-shadow:\s*([^;]+);/)?.[1] ?? value;
    return value;
}
const gtk = readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8');
for (const variant of ['light', 'dark']) for (const tint of Object.keys(TINTS))
    for (const [transparency, opacity] of [['solid', 90], ['translucent', 65], ['translucent', 90]]) {
        const source = readFileSync(new URL(`../themes/shell-${variant}.css`, import.meta.url), 'utf8');
        const css = makeShellStyles(source, variant === 'dark', {tint, transparency, opacity});
        for (const selector of ['.quick-toggle:checked', '.popup-menu-content .quick-toggle:checked', '.popup-menu-content .button', '.events-button'])
            assert.equal(shadow(css, selector), '0 1px 8px 0 rgba(0, 0, 0, 0.147)', `${variant}/${tint}: ${selector} reduced30%`);
        assert.equal(shadow(css, '.search-entry'), '0 1px 2px 0 rgba(0, 0, 0, 0.0735)');
        for (const selector of ['.osd-window', '.popup-menu-content', '.popup-sub-menu', '.quick-toggle-menu', '.notification-banner'])
            assert.equal(shadow(css, selector), ['.notification-banner', '.osd-window', '.popup-menu-content'].includes(selector) ? '0 10px 10px 0 rgba(0, 0, 0, 0.21)' : '0 1px 8px 0 rgba(0, 0, 0, 0.21)', `${selector}: surface shadow`);
        assert.equal(shadow(css, '.osd-window .button'), '0 1px 8px 0 rgba(0, 0, 0, 0.21)', 'OSD child strength retained');
        assert.equal(shadow(css, '.pad-osd-window'), '0 1px 8px 0 rgba(0, 0, 0, 0.21)', 'Tablet overlay strength retained');
        const apps = makeGtkStyles(tint, transparency, gtk, opacity);
        assert.ok(apps.includes('--iridescence-shadow: 0 1px 8px rgba(0, 0, 0, 0.196);'));
        assert.ok(apps.includes('--iridescence-surface-shadow: 0 1px 8px rgba(0, 0, 0, 0.28);'));
        assert.ok(apps.includes('toast, .floating-bar, dnd tab { --iridescence-outer-shadow: var(--iridescence-surface-shadow);'));
        assert.ok(apps.includes('.osd { --iridescence-shadow: var(--iridescence-surface-shadow); }'));
    }
console.log('All appearance combinations: notification/OSD/menu blur and offset10px; internal and other surface shadows preserved');
