import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../shell-shadows.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('export class ShellShadows')).replace('export class', 'class');
let active = true, clears = 0, attached = 0, detached = 0;
const actor = {
    get_stage: () => true,
    get_theme_node: () => ({
        lookup_shadow: () => [active, {color: {alpha: active ? 255 : 0}}],
        get_background_color: () => ({alpha: 255}),
    }),
    add_effect_with_name() { attached++; controller._refresh(actor, record); },
    remove_effect() { detached++; controller._refresh(actor, record); },
};
const FakeEffect = class { clear() { clears++; } };
const ShellShadows = new Function('ShadowEffect', 'EFFECT_NAME', `${code};return ShellShadows`)(FakeEffect, 'test');
const controller = Object.create(ShellShadows.prototype);
controller._masks = {};
const record = {effect: null, updating: false};
controller._refresh(actor, record);
assert.equal(attached, 1);
active = false;
controller._refresh(actor, record);
assert.equal(record.effect, null, 'Leaving shadow state must remove per-frame JS effect');
assert.equal(detached, 1);
assert.equal(clears, 1);
active = true;
controller._refresh(actor, record);
assert.equal(attached, 2, 'Reentering hover restores shadow effect');
for (let i = 0; i < 1000; i++) {
    active = false;
    controller._refresh(actor, record);
    assert.equal(record.effect, null);
    active = true;
    controller._refresh(actor, record);
}
assert.equal(attached - detached, 1, 'Repeated hover cycles keep only the active effect');
assert.equal(record.updating, false, 'Reentrant style notifications leave the controller usable');
console.log('Transient shadows release paint effect and reattach across 1000 reentrant hover cycles');
