import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeShellStyles, makeGtkStyles, OPACITY} from '../styles.js';
assert.deepEqual(Object.keys(OPACITY), ['solid', 'translucent'], 'only two transparency modes');

const clean = css => css.replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/transparent\s+!important(?=\s*,)/g, 'transparent');
const normalize = text => text.trim().replace(/\s+/g, ' ');
function declarations(css) {
    const result = new Map();
    for (const [, selectors, body] of clean(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        for (const selector of selectors.trim().split(/\s*,\s*/)) {
            const values = result.get(normalize(selector)) ?? [];
            values.push(...body.split(';').map(normalize).filter(Boolean));
            result.set(normalize(selector), values);
        }
    }
    return result;
}

// The Shell opacity contract is exercised separately, including native St cascade checks.
const source = '.popup-menu-content { background-color: st-mix(-st-accent-color, #fafafb, 10%); }';
const nested = '#custom { background-color: st-mix(-st-accent-color, st-mix(-st-accent-color, #222226, 10%), 10%); }';
assert.ok(makeShellStyles(nested, true, {tint: 'subtle'}).includes(
    'st-mix(-st-accent-color, st-mix(-st-accent-color, #222226, 5%), 5%)'), 'nested tint edits must be applied from the final color position backwards');
for (const [tint, weight] of [['subtle', 5], ['balanced', 10], ['rich', 15]])
    for (const transparency of Object.keys(OPACITY))
        assert.ok(makeShellStyles(source, false, {tint, transparency}).includes(`#fafafb, ${weight}%)`));
for (const dark of [false, true]) {
    const original = readFileSync(new URL(`../themes/shell-${dark ? 'dark' : 'light'}.css`, import.meta.url), 'utf8');
    for (const tint of ['subtle', 'balanced', 'rich']) {
        const solid = declarations(makeShellStyles(original, dark, {tint, transparency: 'solid'}));
        const translucent = declarations(makeShellStyles(original, dark, {tint, transparency: 'translucent'}));
        assert.deepEqual([...solid.keys()].sort(), [...translucent.keys()].sort(), 'Shell modes must generate the same scoped control rules');
        for (const selector of ['.calendar .calendar-day', '.calendar .calendar-day-heading', '.calendar .calendar-month-header .calendar-month-label'])
            assert.deepEqual(solid.get(selector), translucent.get(selector), `${selector}: idle calendar controls must remain flat in both modes`);
    }
    for (const transparency of Object.keys(OPACITY)) {
        const actual = declarations(makeShellStyles(original, dark, {transparency}));
        for (const [selector, values] of declarations(original)) for (const declaration of values) {
            const property = declaration.slice(0, declaration.indexOf(':'));
            const authGeometry = /^(?:width|height|spacing|icon-size|border-radius|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?)$/;
            if (authGeometry.test(property) && /^(?:(?:\.login-dialog|\.unlock-dialog) \.login-dialog-prompt-(?:layout|entry)|\.login-dialog-button-box)$/.test(selector)) {
                assert.ok(!actual.get(selector)?.some(value => value.startsWith(property + ':')),
                    `${selector}: obsolete authentication geometry must fall back to the native theme`);
                continue;
            }
            if (selector.startsWith('#panel') && /^(?:box-shadow|border(?:-.+)?)$/.test(property)) continue;
            if (/^(?:background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?)$/.test(property)) continue;
            assert.ok(actual.get(selector)?.includes(declaration), `${selector}: ${property} must remain original`);
        }
    }
}
const shipped = readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8');
assert.equal(createHash('sha256').update(shipped).digest('hex'),
    '6fac78fda7bd287c74e6eba9ae36a038709a4e9201f456752b16ec7dc16abd54', 'ship the original GTK stylesheet unchanged');
assert.ok(makeGtkStyles('balanced', 'solid', shipped).includes('currentColor 25%, transparent'), 'Solid retains mandatory midpoint contrast');
for (const [tint, factor] of [['subtle', .5], ['balanced', 1], ['rich', 1.5]]) {
    const tinted = shipped.replace(/(@accent_bg_color,\s*)([\d.]+)/g,
        (_match, prefix, weight) => `${prefix}${Number((Number(weight) * factor).toFixed(4))}`);
    const solid = makeGtkStyles(tint, 'solid', shipped);
    for (const [, name, color] of tinted.matchAll(/@define-color (\w+) ([^;]+);/g))
        assert.ok(solid.includes(`@define-color ${name} ${color};`) || solid.includes(`@define-color ${name} alpha(${color}, 1);`), `${name}: Solid preserves original color and alpha`);
    const gtk = makeGtkStyles(tint, 'translucent', shipped);
    for (const [, name, color] of tinted.matchAll(/@define-color (\w+) ([^;]+);/g)) {
        const surface = /^(?:window_bg|view_bg|headerbar_(?:bg|backdrop)|(?:secondary_)?sidebar_(?:bg|backdrop))_color$/.test(name);
        const inner = name !== 'window_bg_color';
        assert.ok(gtk.includes(`@define-color ${name} ${surface ? `alpha(${color}, ${inner ? name.includes('sidebar') ? 0.35 : 0.1 : 0.9})` : color};`), `${name} follows the approved surface list`);
    }
    assert.ok(gtk.includes('window.view { background-color: alpha(@iridescence_solid_view_bg_color, 0.9);'));
    assert.ok(gtk.includes('.resources-columnview { background-color: @view_bg_color; }'));
    assert.ok(!gtk.includes('--iridescence-backing') && !gtk.includes('radial-gradient'), 'no added solid control backings');
    assert.ok(gtk.includes('window.nautilus-file-chooser.view') && gtk.includes('overlay-split-view > .background'), 'file selectors and overlay panes are scoped opaque exceptions');
    const toast = tinted.match(/toast\s*\{[^}]+\}/)[0];
    assert.ok(gtk.includes(toast), 'the original toast rule remains unchanged');
    assert.ok(!gtk.includes('opacity:'), 'text and icons are not faded with the window');
}
for (const tint of ['subtle', 'balanced', 'rich']) {
    const higher = makeGtkStyles(tint, 'translucent', shipped, 90);
    const standard = makeGtkStyles(tint, 'translucent', shipped, 65);
    assert.equal(higher, makeGtkStyles(tint, 'translucent', shipped), 'Dense is the GTK default');
    assert.equal(standard.replace(/(@define-color window_bg_color alpha\([^;]+, )0\.65(?=\);)/g, (_match, backing) => `${backing}0.9`)
        .replace('window.view { background-color: alpha(@iridescence_solid_view_bg_color, 0.65);',
            'window.view { background-color: alpha(@iridescence_solid_view_bg_color, 0.9);'), higher,
        'Only window backings change between Airy and Dense');
    assert.equal(makeGtkStyles(tint, 'solid', shipped, 65), makeGtkStyles(tint, 'solid', shipped, 90), 'Solid mode ignores the opacity choice');
}
for (const opacity of [0, 85, 100, NaN, '90'])
    assert.throws(() => makeGtkStyles('balanced', 'translucent', shipped, opacity), 'Reject unsupported opacity');
assert.throws(() => makeGtkStyles('balanced', 'subtle', shipped));
assert.throws(() => makeGtkStyles('invalid', 'translucent', shipped));
assert.throws(() => makeShellStyles(source, false, {transparency: 'invalid'}));
console.log('Two transparency modes, original geometry/tint, readable labels and distinct root/inner fills passed');

const nativeAuth = makeShellStyles('', false, {}, `
StEntry { padding: 17px; background-color: red; }
.unlock-dialog .login-dialog-prompt-layout { width: 33em; color: red; }
.unlock-dialog .login-dialog-prompt-entry :ltr { padding-right: 3em; }
.login-dialog-button.next-button { padding: 0; background-color: red; }
.popup-menu-content { padding: 99px; }
` ).split('/* Installed native password geometry. */')[1];
assert.ok(nativeAuth.includes('.unlock-dialog StEntry{padding: 17px;}'));
assert.ok(nativeAuth.includes('.unlock-dialog.unlock-dialog .login-dialog-prompt-layout{width: 33em;}'));
assert.ok(nativeAuth.includes('.unlock-dialog.unlock-dialog .login-dialog-prompt-entry :ltr{padding-right: 3em;}'));
assert.ok(nativeAuth.includes('.unlock-dialog .login-dialog-button.next-button{padding: 0;}'));
assert.ok(!/background|color:|popup-menu/.test(nativeAuth), 'Native restoration imports only scoped authentication geometry');
console.log('Installed native authentication geometry is scoped without importing paint rules');
