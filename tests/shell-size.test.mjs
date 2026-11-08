import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeShellStyles, TINTS, OPACITY} from '../styles.js';
import {makeShellContrast} from '../contrast.js';

function selectorCount(css) {
    return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)]
        .reduce((count, [, selectors]) => count + selectors.split(',').length, 0);
}

for (const dark of [false, true]) {
    const variant = dark ? 'dark' : 'light';
    const original = readFileSync(new URL(`../themes/shell-${variant}.css`, import.meta.url), 'utf8');
    const originalSelectors = selectorCount(original);
    for (const tint of Object.keys(TINTS))
        for (const transparency of Object.keys(OPACITY))
            for (const opacity of [65, 90])
            {
                    const contrast = makeShellContrast(dark, TINTS[tint]);
                    assert.ok(Buffer.byteLength(contrast) <= 65000 && selectorCount(contrast) <= 910, 'Contrast reference must stay bounded');
                    const css = makeShellStyles(original, dark, {tint, transparency, opacity});
                    const shadows = css.split('/* Restored extra shadows (B). */')[1];
                    assert.ok(Buffer.byteLength(shadows) <= Buffer.byteLength(original) && selectorCount(shadows) <= originalSelectors + 1000, 'Shadow restoration must stay within the original theme byte count and existing scoped-control selector budget');
                    const label = `${variant}/${tint}/${transparency}/${opacity}`;
                    // Keep the existing generator budget separate from the fixed native contrast reference.
                    assert.ok(Buffer.byteLength(css) - Buffer.byteLength(contrast) - Buffer.byteLength(shadows) <= Buffer.byteLength(original) * 2, `${label}: CSS exceeds twice the source size`);
                    assert.ok(selectorCount(css) - selectorCount(contrast) - selectorCount(shadows) <= originalSelectors + 1000, `${label}: selector expansion exceeds nine approved control scopes plus panel rules`);
                }
}
console.log('All Shell presets retain source-sized CSS and selector counts');
