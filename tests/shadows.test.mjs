import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeGtkStyles, makeShellStyles, TINTS} from '../styles.js';
import {GTK_CONTRAST, makeShellContrast} from '../contrast.js';
const gtk = readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8');
const reference = JSON.parse(readFileSync(new URL('../output/contrast-strength-reference.json', import.meta.url), 'utf8'));
const contrastSource = readFileSync(new URL('../contrast.js', import.meta.url), 'utf8');
const shadows = JSON.parse(readFileSync(new URL('../output/shadow-strength-reference.json', import.meta.url), 'utf8'));
assert.equal(shadows.active, 'B');
for (const option of ['A', 'B', 'C']) {
    assert.equal(Object.keys(shadows.options[option]).length, 4, 'Save all four shadow families for every option');
}
assert.equal(reference.active, 'midpoint');
for (const entry of [...reference.shell, ...reference.gtk]) {
    assert.ok(contrastSource.includes(entry.midpoint), 'Saved midpoint reference matches the active stroke rules');
    assert.ok(entry.half, 'Every stroke group has its half-strength alternative recorded');
}
for (const css of [GTK_CONTRAST, makeShellContrast(false), makeShellContrast(true)]) {
    assert.ok(!/[{;]\s*(?:background[\w-]*|color|opacity|padding|margin|font[\w-]*)\s*:/.test(css), 'Contrast cannot alter fills, text, widget opacity or spacing');
    assert.ok(!/\bfilter\s*:/.test(css), 'No added whole-widget shadow filters');
    assert.ok(!/inset 0 0 0 2px|outline-width:\s*2px/.test(css), 'All contrast outlines and focus rings are 1px');
}
for (const variant of ['light', 'dark']) {
    const source = readFileSync(new URL(`../themes/shell-${variant}.css`, import.meta.url), 'utf8');
    for (const transparency of ['solid', 'translucent']) {
        const css = makeShellStyles(source, variant === 'dark', {transparency});
        assert.ok(css.includes('box-shadow: inset 0 0 0 1px'), 'Native control strokes are mandatory in both modes');
        const mode = shadows.options.B.shellCompact[variant];
        assert.ok(css.includes(`-iridescence-shadow: ${mode}`), 'Restore option B compact Shell shadows');
        assert.ok(css.includes(`-iridescence-shadow: ${shadows.options.B.shellControls[variant]}`), 'Restore option B ordinary Shell shadows');
        assert.ok(css.includes(`-iridescence-shadow: ${shadows.options.B.shellBanners[variant]}`), 'Restore floating banner shadows without replacing their inset outlines');
        const extra = css.split('/* Restored extra shadows (B). */')[1];
        assert.ok(/\.popup-menu-content \.button(?:,|\s*\{)/.test(extra), 'Ordinary outlined controls must have shadows in light and dark');
        assert.ok(!/\bbox-shadow\s*:/.test(extra), 'Shell shadow restoration cannot replace native outline properties');
        assert.ok(!css.includes('0 0 0 -3px'), 'Collapse control uses native stroke placement');
        const apps = makeGtkStyles('balanced', transparency, gtk);
        assert.ok(apps.includes('window.csd { outline-color: color-mix'), 'Keep the approved window frame');
        assert.ok(apps.includes('currentColor 25%, transparent'), 'Added GTK strokes use half of the 50% native contrast value');
        assert.ok(apps.includes('currentColor 32.5%, transparent'), 'Existing 15% checkbox strokes move halfway to 50%');
        assert.ok(apps.includes('var(--accent-color, @accent_color) 65%, transparent'), 'Focus strength is the 50% to 80% midpoint');
        assert.ok(apps.includes(shadows.options.B.gtkWidgets.light) && apps.includes(shadows.options.B.gtkWidgets.dark), 'Restore option B GTK shadows in both modes');
        const gtkShadows = apps.split('/* Restored extra shadows (B). */')[1];
        assert.ok(!gtkShadows.includes(':not(:focus-visible)') && !gtkShadows.includes(':not(:focus-within)'), 'Keep GTK shadows while controls are focused');
        assert.ok(gtkShadows.includes('.navigation-sidebar > row:selected:not(:disabled)'), 'Sidebar coverage must not depend on a specific GTK list class');
        assert.ok(gtkShadows.includes('.card, list.boxed-list, list.content, list.boxed-list-separate > row'), 'Restore raised surface shadow coverage');
        assert.ok(!apps.includes('--border-opacity:'), 'Do not change global window-frame helpers');
        assert.ok(!apps.includes('iridescence-backing') && !apps.includes('radial-gradient'));
        if (transparency === 'translucent') assert.ok(apps.includes('.floating-bar, .floating-bar:backdrop { background-color: @iridescence_solid_view_bg_color; }'));
    }
}
console.log('Midpoint strokes, option B shadows, saved A/C alternatives, retained window frame and solid status backing passed');

for (const tint of Object.keys(TINTS)) {
    for (const transparency of ['solid', 'translucent']) {
        for (const opacity of [65, 90]) {
            const shell = ['light', 'dark'].map(variant => makeShellStyles(
                readFileSync(new URL(`../themes/shell-${variant}.css`, import.meta.url), 'utf8'),
                variant === 'dark', {tint, transparency, opacity}));
            for (const css of shell) {
                for (const family of ['shellCompact', 'shellControls', 'shellBanners'])
                    assert.ok(css.includes(`-iridescence-shadow: ${shadows.options.B[family].dark}`),
                        `${tint}/${transparency}/${opacity}: Shell shadows must match dark strength`);
            }
            const css = makeGtkStyles(tint, transparency, gtk, opacity);
            const extra = css.split('/* Restored extra shadows (B). */')[1];
            assert.ok(extra.includes(`--iridescence-shadow: ${shadows.options.B.gtkWidgets.dark}`),
                `${tint}/${transparency}/${opacity}: GTK light shadows must match dark strength`);
            assert.ok(!extra.includes('@media (prefers-color-scheme: dark)'),
                'Widget shadow strength must be shared by light and dark');
        }
    }
}
console.log('Equal light/dark shadows across all tint strengths and opacity modes passed');

for (const variant of ['light', 'dark']) {
    const source = readFileSync(new URL(`../themes/shell-${variant}.css`, import.meta.url), 'utf8');
    for (const tint of Object.keys(TINTS)) for (const transparency of ['solid', 'translucent']) {
        const css = makeShellStyles(source, variant === 'dark', {tint, transparency});
        const extra = css.split('/* Restored extra shadows (B). */')[1];
        let checked = 0;
        for (const [, selectors, body] of extra.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            if (selectors.split(',').some(selector => /^\.search-entry(?::[\w-]+)*$/.test(selector.trim())) && !body.includes(': none')) {
                assert.ok(body.includes('0 1px 2px 0 rgba(0, 0, 0, 0.0735)'),
                    'Overview search uses a small exterior shadow in every state');
                checked++;
            }
        }
        assert.ok(checked > 0, 'Search entry shadow coverage is present');
    }
}
console.log('Compact overview search shadow in both palettes and all tints passed');
