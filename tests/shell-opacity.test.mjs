import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeShellStyles} from '../styles.js';
const rules = css => {
    const result = new Map();
    for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g))
        for (const selector of selectors.split(',').map(value => value.trim()))
            result.set(selector, (result.get(selector) ?? '') + body.trim());
    return result;
};
const source = `.popup-menu-content { background-color: #fafafb; border: 1px solid rgba(0,0,0,.12); box-shadow: 0 2px 4px black; }
.quick-toggle { background-color: #e0e0e1; }
.quick-toggle:checked { background-color: -st-accent-color; }
.quick-toggle:focus { background-color: #dddddd; border: 2px solid blue; box-shadow: inset 0 0 0 2px white; }
.message { background-color: rgba(34,34,38,.9); }
.calendar .calendar-day { background-color: #fafafb; }
.button { background-color: #dddddd; }
.modal-dialog { background-color: #fafafb; box-shadow: 0 12px 8px 12px rgba(0,0,0,.03); }
.modal-dialog .button { background-color: #dddddd; }
.run-dialog .run-dialog-entry { background-color: #dddddd; }
.prompt-dialog .prompt-dialog-password-entry { background-color: #dddddd; }
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:hover { background-color: #dddddd; }
.dash-label { background-color: rgba(0,0,0,.9); }
.popup-sub-menu { background-color: #eeeeee; }
.workspace-background { background-color: #333333; }`;
for (const dark of [false, true]) for (const opacity of [65, 90]) {
    const result = rules(makeShellStyles(source, dark, {transparency: 'translucent', opacity}));
    const fade = (100 - opacity) / 100;
    assert.ok(result.get('.popup-menu-content').includes(`st-transparentize(#fafafb, ${fade})`), `${opacity}: shared Shell opacity`);
    assert.ok(result.get('.popup-menu-content').includes(`${opacity}%)`), 'Panel borders follow the selected opacity');
    assert.ok(result.get('.popup-menu-content').includes('box-shadow: 0 2px 4px black;'));
    assert.match(result.get('.quick-toggle:checked'), /background-color: -st-accent-color;/, 'Accented fill stays opaque');
    assert.match(result.get('.message'), /background-color: rgba\(34,34,38,.9\);/, 'original partial alpha remains untouched');
    assert.equal(result.get('.button'), rules(source).get('.button'), 'shared controls only change in approved contexts');
    assert.ok(result.get('.popup-menu-content .button').includes(`st-transparentize(#dddddd, ${fade})`));
    for (const selector of ['.modal-dialog', '.modal-dialog .button', '.run-dialog .run-dialog-entry', '.prompt-dialog .prompt-dialog-password-entry', '.audio-device-selection-dialog .audio-selection-box .audio-selection-device:hover'])
        assert.ok(result.get(selector).includes(`, ${fade})`), `${selector}: dialogs follow shared transparency`);
    assert.ok(result.get('.modal-dialog').includes('box-shadow: 0 12px 8px 12px rgba(0,0,0,.03);'), 'native dialog shadow retained');
    for (const selector of ['.dash-label', '.workspace-background'])
        assert.equal(result.get(selector), rules(source).get(selector), selector);
    assert.ok(result.get('.quick-toggle:focus').includes('border: 2px solid blue; box-shadow: inset 0 0 0 2px white;'));
    assert.ok(result.get('.popup-sub-menu').includes(`st-transparentize(#eeeeee, ${fade})`));
    assert.ok(result.get('.calendar .calendar-day').includes('background-color: transparent'));
}
for (const dark of [false, true]) {
    const original = readFileSync(new URL(`../themes/shell-${dark ? 'dark' : 'light'}.css`, import.meta.url), 'utf8');
    const solid = makeShellStyles(original, dark, {transparency: 'solid'});
    assert.match(solid, /#panel \.iridescence-panel-edge \{ background-color: st-mix\(-st-accent-color,/, 'Solid panel edge uses its original alpha');
    assert.ok(solid.includes('box-shadow: inset 0 0 0 1px'), 'Solid has native contrast');
}
for (const opacity of [0, 85, 100, NaN, '90'])
    assert.throws(() => makeShellStyles(source, false, {opacity}), 'Reject unsupported shared opacity');
console.log('Approved Shell scope, Airy/Dense opacity, partial alpha, accents, borders and exclusions passed');

for (const tint of ['subtle', 'balanced', 'rich']) {
    const source = '.slider { -barlevel-background-color: st-mix(-st-accent-color, #444444, 10%); } .workspace-dot { background-color: st-mix(-st-accent-color, #444444, 10%); }';
    const actual = rules(makeShellStyles(source, false, {tint, transparency: 'translucent'}));
    for (const [selector, body] of rules(source)) assert.equal(actual.get(selector), body, `${tint}: indicator colors are outside the transform`);
}
