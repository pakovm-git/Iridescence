import {GTK_CONTRAST, makeShellContrast} from './contrast.js';
import {makeGtkShadows, makeShellShadows} from './shadows.js';

export const TINTS = {subtle: 0.5, balanced: 1, rich: 1.5};
export const OPACITY = {solid: 1, translucent: 0.65};

function tintMixes(css, factor) {
    const edits = [];
    for (const match of css.matchAll(/st-mix\(/g)) {
        let depth = 1;
        let end = match.index + match[0].length;
        const start = end;
        const commas = [];
        for (; end < css.length && depth; end++) {
            if (css[end] === '(') depth++;
            else if (css[end] === ')') depth--;
            else if (css[end] === ',' && depth === 1) commas.push(end);
        }
        if (commas.length !== 2 || css.slice(start, commas[0]).trim() !== '-st-accent-color')
            continue;
        const weight = css.slice(commas[1] + 1, end - 1).trim();
        if (/^\d+(\.\d+)?%$/.test(weight) && parseFloat(weight) <= 20)
            edits.push([commas[1] + 1, end - 1, ` ${parseFloat(weight) * factor}%`]);
    }
    for (const [start, end, value] of edits.sort((a, b) => b[0] - a[0]))
        css = css.slice(0, start) + value + css.slice(end);
    return css;
}

function colorAlpha(color) {
    if (color === 'transparent') return 0;
    const match = color.match(/^([\w-]+)\((.*)\)$/s);
    if (!match) return 1;
    const args = [];
    let depth = 0, start = 0;
    for (let i = 0; i < match[2].length; i++) {
        if (match[2][i] === '(') depth++;
        if (match[2][i] === ')') depth--;
        if (match[2][i] === ',' && depth === 0) {
            args.push(match[2].slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(match[2].slice(start).trim());
    if (match[1] === 'rgba' || match[1] === 'hsla') return Number(args[3]);
    if (match[1] === 'st-mix') {
        const weight = parseFloat(args[2]) / 100;
        return colorAlpha(args[0]) * weight + colorAlpha(args[1]) * (1 - weight);
    }
    if (match[1] === 'st-transparentize') return Math.max(0, Math.min(1, colorAlpha(args[0]) - Number(args[1])));
    return colorAlpha(args[0]);
}

function fadeColors(value, opacity) {
    if (opacity === 1) return value;
    const tokens = /(?:st-[\w-]+|rgba?|hsla?)\(|#[\da-f]{3,8}\b|-st-[\w-]+|\b(?:transparent|black|white)\b/gi;
    const edits = [];
    for (let match; (match = tokens.exec(value));) {
        let end = tokens.lastIndex;
        if (match[0].endsWith('(')) {
            let depth = 1;
            while (end < value.length && depth) {
                if (value[end] === '(') depth++;
                if (value[end++] === ')') depth--;
            }
        }
        tokens.lastIndex = end;
        const color = value.slice(match.index, end);
        if (color !== 'transparent') {
            // Subtraction is enough for opaque colors; partial alpha needs multiplication.
            edits.push([match.index, end, colorAlpha(color) === 1 ? `st-transparentize(${color}, ${Number((1 - opacity).toFixed(2))})`
                : `st-mix(${color}, st-transparentize(${color}, 1), ${opacity * 100}%)`]);
        }
    }
    for (const [start, end, color] of edits.reverse())
        value = value.slice(0, start) + color + value.slice(end);
    return value;
}

// Reuse the installed authentication layout without importing its paint rules.
function nativePasswordGeometry(css) {
    const rules = [];
    // Raise every imported selector by one class so native relative specificity is preserved.
    for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const geometry = [...body.matchAll(/(?:^|;)\s*(?:width|height|spacing|icon-size|border-radius|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?)\s*:[^;{}]+/g)]
            .map(match => match[0].replace(/^;/, '').trim()).join(';');
        if (!geometry) continue;
        const scoped = [];
        for (const selector of selectors.split(',')) {
            const clean = selector.trim();
            if (/^\.unlock-dialog \.login-dialog-(?:prompt-layout|input-well|prompt-entry-area|prompt-entry|default-button-well)(?:[ :].*)?$/.test(clean))
                scoped.push(clean.replace('.unlock-dialog', '.unlock-dialog.unlock-dialog'));
            else if (/^StEntry(?:[ :]|$)/.test(clean) || /^\.login-dialog-button-box$/.test(clean) || /^\.login-dialog-button\.next-button(?:[ :.].*)?$/.test(clean))
                scoped.push(`.unlock-dialog ${clean}`);
        }
        if (scoped.length) rules.push(`${scoped.join(',')}{${geometry};}`);
    }
    return '\n/* Installed native password geometry. */\n' + rules.join('\n');
}

export function makeShellStyles(source, dark, {tint = 'balanced', transparency = 'translucent', opacity = 65} = {}, native = '') {
    if (!(tint in TINTS) || !(transparency in OPACITY) || ![65, 90].includes(opacity))
        throw new Error('Unknown Iridescence preset');
    const factor = TINTS[tint];
    const alpha = transparency === 'solid' ? 1 : opacity / 100;
    const outer = new Set(['panel', 'popup-menu-content', 'popup-sub-menu', 'candidate-popup-content',
        'osd-window', 'pad-osd-window', 'dash-background', 'switcher-list', 'search-section-content',
        'screenshot-ui-panel', 'app-folder-dialog', 'quick-toggle-menu', 'keyboard', 'modal-dialog']);
    const inner = new Set(['quick-toggle', 'quick-toggle-menu-button', 'power-item', 'slider-bin',
        'icon', 'popup-menu-item', 'message', 'message-themed-icon', 'message-close-button',
        'message-expand-button', 'message-collapse-button', 'notification-button', 'message-media-control',
        'calendar', 'calendar-day', 'calendar-day-heading', 'calendar-week-number', 'calendar-month-label',
        'pager-button', 'datemenu-today-button', 'events-button', 'world-clocks-button', 'weather-button',
        'item-box', 'overview-icon', 'overview-tile', 'grid-search-result', 'list-search-result',
        'search-provider-icon', 'app-folder', 'folder-name-entry', 'page-navigation-arrow',
        'keyboard-key', 'screenshot-ui-type-button', 'screenshot-ui-shot-cast-button',
        'screenshot-ui-show-pointer-button', 'candidate-box', 'search-entry', 'modal-dialog-button',
        'audio-selection-device', 'run-dialog-entry', 'prompt-dialog-password-entry']);
    const shared = /^(?:\.(?:button|icon-button)(?:\.[\w-]+)*|StEntry|\.toggle-switch|\.user-icon|\.check-box StBin)$/;
    const scopes = ['.popup-menu-content', '.switcher-list', '.app-folder-dialog',
        '#dash', '.search-section-content', '.osd-window', '.screenshot-ui-panel', '#keyboard', '.candidate-popup-content'];
    const excluded = /(?:LookingGlass|\.lg-|login-dialog|unlock-dialog|lockDialogGroup)/;
    const css = source.replace(/transparent\s+!important(?=\s*,)/g, 'transparent');
    const fills = new Map();
    for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const fill = [...body.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)].at(-1)?.[1];
        if (fill) for (const selector of selectors.trim().split(/\s*,\s*/))
            if (/^[.#][\w-]+$/.test(selector)) fills.set(selector, fill.trim());
    }
    const controlOverrides = new Map();
    let result = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
        const output = new Map();
        const authGeometry = /(^|;)\s*(?:width|height|spacing|icon-size|border-radius|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?)\s*:[^;{}]+/g;
        function add(selector, transformed) {
            const group = output.get(transformed) ?? [];
            group.push(selector);
            output.set(transformed, group);
        }
        function transform(clean, scoped = false) {
            // Let the installed Shell supply authentication geometry; the light baseline predates the overlaid submit button.
            if (/^(?:(?:\.login-dialog|\.unlock-dialog) \.login-dialog-prompt-(?:layout|entry)|\.login-dialog-button-box)$/.test(clean))
                return body.replace(authGeometry, '$1');
            const last = clean.split(/\s+|>/).at(-1);
            const names = last.replace(/:[\w-]+/g, '').split(/[.#]/);
            const panel = /^#panel(?:[:.][\w-]+)*$/.test(clean);
            const isOuter = panel || names.some(name => outer.has(name));
            const eligible = !excluded.test(clean) && (isOuter || scoped || names.some(name => inner.has(name)) || clean.startsWith('.word-suggestions ') || clean.startsWith('.modal-dialog '));
            if (!eligible || clean.includes('.quick-toggle-separator')) return body;
            return body.replace(/([\w-]+)(\s*:\s*)([^;{}]+)(;|$)/g, (declaration, property, colon, value, end) => {
                const background = /^(?:background|background-color)$/.test(property);
                const border = /^border(?:-(?:top|right|bottom|left))?(?:-color)?$/.test(property);
                if (!background && !(border && isOuter && !/:(?:focus|selected|checked|active)/.test(clean))) return declaration;
                const important = value.match(/\s*!important\s*$/)?.[0] ?? '';
                const original = value.slice(0, value.length - important.length).trim();
                const accent = original.includes('-st-accent-color') && colorAlpha(original.replace(
                    /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\([^()]*\)|\b(?:black|white)\b/gi, 'transparent')) >= 0.5;
                let color = original;
                if (background) {
                    const parent = ['.message', '.popup-sub-menu', '.quick-toggle-menu', '.switcher-list', '.app-folder-dialog']
                        .find(role => clean.startsWith(`${role} `)) ?? '.popup-menu-content';
                    const flat = !isOuter && original.replace(/\s+/g, '') === fills.get(parent)?.replace(/\s+/g, '');
                    if (flat) color = 'transparent';
                    else if (!accent && colorAlpha(original) === 1) color = fadeColors(original, alpha);
                } else color = fadeColors(original, alpha);
                return `${property}${colon}${color}${important}${end}`;
            });
        }
        for (const selector of selectors.split(',')) {
            const clean = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
            if (shared.test(clean.replace(/:[\w-]+/g, ''))) {
                add(selector, body);
                const changed = transform(clean, true);
                const fill = [...changed.matchAll(/background(?:-color)?\s*:[^;{}]+;?/g)].at(-1)?.[0];
                if (fill) for (const scope of scopes) add(`${scope} ${clean}`, fill);
            } else {
                const changed = transform(clean);
                add(selector, changed);
                // Scoped shared controls must not outrank their specialized fills or states.
                if (/^(?:\.(?:quick-toggle|search-entry|background-apps-quick-toggle)|\.keyboard-brightness-level \.button)(?:[:.][\w-]+)*$/.test(clean)) {
                    const fill = [...changed.matchAll(/background(?:-color)?\s*:[^;{}]+;?/g)].at(-1)?.[0];
                    if (fill) {
                        const selectors = controlOverrides.get(fill) ?? [];
                        selectors.push(...scopes.map(scope => `${scope} ${clean}`));
                        controlOverrides.set(fill, selectors);
                    }
                }
            }
        }
        return [...output].map(([value, group]) => `${group.join(',')}{${value}}`).join('\n');
    });
    result += '\n' + [...controlOverrides].map(([fill, selectors]) => `${selectors.join(',')}{${fill}}`).join('\n');
    if (factor !== 1) result = result.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
        const marks = /(?:workspace-dot|ws-switcher-indicator|workspace-thumbnail-indicator|app-grid-running-dot|page-indicator-icon|slider|level|vhandle|hhandle|handle|screenshot-ui-capture-button-circle|screenshot-ui-window-selector-check|screenshot-ui-area-selector-handle|screenshot-ui-area-indicator-shade|screenshot-ui-screen-selector|lightbox|flashspot|ripple-box|ripple-pointer-location|pie-timer|tile-preview|select-area-rubberband)(?:[:.][\w-]+)*$/;
        if (marks.test(selectors.trim()) || /\.check-box[^{}]* StIcon/.test(selectors)) return rule;
        return `${selectors}{${body.replace(/(^|;)(\s*(?:background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?)\s*:\s*)([^;{}]+)/g,
            (_declaration, delimiter, prefix, value) => delimiter + prefix + tintMixes(value, factor))}}`;
    });
    const edge = `st-mix(-st-accent-color,${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'},${(dark ? 10 : 7) * factor / 2}%)`;
    result += `\n#panel { border-bottom: 0; box-shadow: none; }\n#panel .iridescence-panel-edge { background-color: ${fadeColors(edge, alpha)}; }\n`;
    result += `
.message .message-header .message-close-button { padding: 6px; }
.quick-toggle-menu { margin-left: 0; margin-right: 0; }
.switcher-list { box-shadow: 0 8px 8px 0 rgba(0, 0, 0, 0.2); }
.unlock-dialog-notifications-container { width: 29em; }
.magnifier-zoom-region.full-screen { border-width: 0; }
`;
    result += '#panel:overview .iridescence-panel-edge { background-color: transparent; }\n';
    const contrast = makeShellContrast(dark, factor);
    // Keep native drag feedback when the corresponding high-contrast fill is not imported.
    return result + contrast + `
.overview-tile:drop, .grid-search-result:drop { box-shadow: inset 0 0 0 1px st-transparentize(-st-accent-color, 0.2); }
` + (dark ? `
#dash .dash-item-container .overview-tile:drop,
#dash .dash-item-container .grid-search-result:drop { box-shadow: inset 0 0 0 1px st-transparentize(-st-accent-color, 0.2); }
` : '') + makeShellShadows(dark, result, scopes, colorAlpha) + nativePasswordGeometry(native);
}

export function makeGtkStyles(tint, transparency, source, opacity = 90) {
    if (!(tint in TINTS) || !(transparency in OPACITY) || ![65, 90].includes(opacity))
        throw new Error('Unknown Iridescence preset');
    const css = source.replace(/(@accent_bg_color,\s*)([\d.]+)/g,
        (_match, prefix, weight) => `${prefix}${Number((Number(weight) * TINTS[tint]).toFixed(4))}`);
    const surfaces = /^(?:window_bg|view_bg|headerbar_(?:bg|backdrop)|(?:secondary_)?sidebar_(?:bg|backdrop))_color$/;
    const flat = ['button.flat', 'menubutton.flat > button', 'splitbutton.flat button',
        ...['headerbar', '.toolbar', 'actionbar', 'searchbar'].map(parent =>
            `${parent} button:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque)`)];
    const styled = (transparency === 'solid' ? css : css.replace(/@define-color (\w+) ([^;]+);/g, (declaration, name, color) => {
        // Composite the original card fill over a solid window; keep native interaction rules.
        if (name === 'card_bg_color')
            return `${declaration}\n    @define-color iridescence_solid_card_bg_color ${color.replace(/rgba\(([^)]+), ([\d.]+)\)/g, 'mix(@iridescence_solid_window_bg_color, rgb($1), $2)')};`;
        if (!surfaces.test(name)) return declaration;
        return `@define-color iridescence_solid_${name} ${color};\n    @define-color ${name} alpha(${color}, ${name === 'window_bg_color' ? opacity / 100 : name.includes('sidebar') ? 0.35 : 0.1});`;
    }) + `
popover, dialog-host > dialog, window.dialog, window.messagedialog, window.nautilus-file-chooser,
overlay-split-view > .background, overlay-split-view > .overlay-pane {
    --window-bg-color: @iridescence_solid_window_bg_color;
    --view-bg-color: @iridescence_solid_view_bg_color;
    --headerbar-bg-color: @iridescence_solid_headerbar_bg_color;
    --headerbar-backdrop-color: @iridescence_solid_headerbar_backdrop_color;
    --sidebar-bg-color: @iridescence_solid_sidebar_bg_color;
    --sidebar-backdrop-color: @iridescence_solid_sidebar_backdrop_color;
    --secondary-sidebar-bg-color: @iridescence_solid_secondary_sidebar_bg_color;
    --secondary-sidebar-backdrop-color: @iridescence_solid_secondary_sidebar_backdrop_color;
}
window.view { background-color: alpha(@iridescence_solid_view_bg_color, ${opacity / 100}); }
window.nautilus-file-chooser { background-color: @iridescence_solid_window_bg_color; }
window.nautilus-file-chooser.view { background-color: @iridescence_solid_view_bg_color; }
.resources-columnview { background-color: @view_bg_color; }
.floating-bar, .floating-bar:backdrop { background-color: @iridescence_solid_view_bg_color; }
:root { --card-bg-color: @iridescence_solid_card_bg_color; }
scale:not(.color) > trough > slider, switch > slider { --view-bg-color: @iridescence_solid_view_bg_color; }
button.opaque, menubutton.opaque, splitbutton.opaque { --window-bg-color: @iridescence_solid_window_bg_color; }
banner, infobar { --window-bg-color: @iridescence_solid_window_bg_color; --sidebar-bg-color: @iridescence_solid_sidebar_bg_color; --secondary-sidebar-bg-color: @iridescence_solid_secondary_sidebar_bg_color; }
dnd tab { --headerbar-bg-color: @iridescence_solid_headerbar_bg_color; }

`) + `
/* Native contrast strokes; midpoint strength and 1px outlines. */
button.link, button.inline, button.accent-button, button.suggested-action, button.destructive-action, button.opaque { box-shadow: none; }
button { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
${flat.join(', ')} { box-shadow: none; }
${flat.flatMap(selector => [':hover', ':active', ':checked', '.keyboard-activating'].map(state => selector + state)).join(', ')} { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
columnview > header > button, treeview > header > button, tabthumbnail button,
bottom-sheet > sheet > stack > button, windowcontrols > button:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque):not(.card) { box-shadow: none; }
menubutton.suggested-action > button:not(.card):not(.link):not(.inline):not(.accent-button), splitbutton.suggested-action button:not(.card):not(.link):not(.inline):not(.accent-button),
menubutton.opaque > button:not(.card):not(.link):not(.inline):not(.accent-button), splitbutton.opaque button:not(.card):not(.link):not(.inline):not(.accent-button), spinbutton > button.image-button:not(.card):not(.link):not(.inline):not(.accent-button) { box-shadow: none; }
splitbutton.suggested-action > menubutton > button:not(.card):not(.link):not(.inline):not(.accent-button):dir(ltr),
splitbutton.opaque > menubutton > button:not(.card):not(.link):not(.inline):not(.accent-button):dir(ltr) { box-shadow: inset 1px 0 color-mix(in srgb, currentColor 55%, transparent); }
splitbutton.suggested-action > menubutton > button:not(.card):not(.link):not(.inline):not(.accent-button):dir(rtl),
splitbutton.opaque > menubutton > button:not(.card):not(.link):not(.inline):not(.accent-button):dir(rtl) { box-shadow: inset -1px 0 color-mix(in srgb, currentColor 55%, transparent); }
button:drop(active) { box-shadow: inset 0 0 0 1px var(--accent-bg-color, @accent_bg_color); }
button.card:drop(active) { box-shadow: inset 0 0 0 1px var(--accent-bg-color, @accent_bg_color); }
@media (prefers-contrast: no-preference) {
window.csd { outline-color: color-mix(in srgb, @accent_bg_color ${3.5 * TINTS[tint]}%, rgba(255, 255, 255, 0.25)); }
@media (prefers-color-scheme: dark) { window.csd { outline-color: color-mix(in srgb, @accent_bg_color ${5 * TINTS[tint]}%, rgba(255, 255, 255, 0.12)); } }
}
` + GTK_CONTRAST;
    return makeGtkShadows(flat, styled);
}
