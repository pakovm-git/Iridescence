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
            edits.push([match.index, end, colorAlpha(color) === 1 ? `st-transparentize(${color}, ${1 - opacity})`
                : `st-mix(${color}, st-transparentize(${color}, 1), ${opacity * 100}%)`]);
        }
    }
    for (const [start, end, color] of edits.reverse())
        value = value.slice(0, start) + color + value.slice(end);
    return value;
}

function shellContrast(css, dark, scopes, edge, nativeSource) {
    const namesOf = selector => selector.trim().split(/\s+|>/).at(-1).replace(/:[\w-]+/g, '').split(/[.#]/).filter(Boolean);
    const selected = new Set(['quick-toggle', 'background-apps-quick-toggle', 'quick-toggle-menu-button', 'power-item', 'message',
        'notification-banner', 'message-close-button', 'message-expand-button', 'message-collapse-button', 'notification-button',
        'message-media-control', 'events-button', 'world-clocks-button', 'weather-button', 'pager-button',
        'datemenu-today-button', 'search-entry', 'folder-name-entry', 'list-search-result',
        'search-provider-icon', 'page-navigation-arrow', 'keyboard-key', 'item-box',
        'overview-icon', 'overview-tile', 'grid-search-result', 'app-folder', 'dash-background',
        'switcher-list', 'osd-window', 'pad-osd-window', 'screenshot-ui-panel', 'screenshot-ui-type-button',
        'screenshot-ui-shot-cast-button', 'screenshot-ui-show-pointer-button', 'popup-menu-item', 'popup-sub-menu',
        'quick-toggle-menu', 'calendar-day', 'calendar-month-label', 'search-section-content', 'window-close', 'screenshot-ui-close-button',
        'message-themed-icon', 'system-action-icon', 'modal-dialog', 'modal-dialog-button', 'audio-selection-device']);
    const nativeShadows = new Map();
    for (const [, selectors, body] of (nativeSource + css).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const shadow = [...body.matchAll(/box-shadow\s*:\s*([^;{}]+)/g)].at(-1)?.[1];
        if (shadow) for (const selector of selectors.split(','))
            if (namesOf(selector).some(name => selected.has(name))) nativeShadows.set(selector.trim(), shadow);
    }
    const seen = new Set();
    const result = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+/gm, '').replace(/([;{}])\s*\n/g, '$1').replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors, body) => {
        const declaredFill = [...body.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)].at(-1)?.[1].replace(/\s*!important\s*$/, '').trim();
        const groups = new Map();
        for (const selector of selectors.split(',')) {
            const clean = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
            seen.add(clean);
            const names = namesOf(clean);
            const originalShadow = nativeShadows.get(clean) ?? names.map(name => nativeShadows.get(`.${name}`)).find(Boolean);
            const shared = names.some(name => ['button', 'icon-button', 'StEntry'].includes(name)) &&
                scopes.some(scope => scope !== '.candidate-popup-content' && clean.startsWith(`${scope} `));
            // Dialog state combinations inherit the same edge instead of repeating its declarations.
            const dialogState = /modal-dialog-button:|audio-selection-device:[\w-]+:/.test(clean);
            // Unfilled Dash wrappers must not outrank native drag-target rings.
            const eligible = !dialogState && !(clean.startsWith('#dash ') && declaredFill === 'transparent') && !/LookingGlass|\.lg-|login-dialog|unlock-dialog|candidate-popup|:focus|:insensitive/.test(clean) &&
                (shared || names.some(name => selected.has(name)) || clean.startsWith('.word-suggestions ') || /\.quick-toggle-menu \.header \.icon/.test(clean));
            const fill = declaredFill;
            let changed = body;
            // Inset shadows can be focus rings or painted fills; never replace them.
            if (eligible && fill && !/box-shadow\s*:[^;]*(?:inset|!important)/.test(body)) {
                const filled = fill !== 'none' && colorAlpha(fill) > 0;
                // Keep contrast strokes out of control layout.
                if (clean.startsWith('#dash ') && names.includes('overview-icon'))
                    changed = body.trim() + `border-width:0;box-shadow:${filled ? `inset 0 0 0 1px ${edge}` : 'none'};`;
                else if (names.some(name => ['message-collapse-button', 'message-themed-icon', 'system-action-icon'].includes(name))) {
                    // Pull the edge inside the 4px spacer, leaving 1px around the painted face.
                    const stroke = names.includes('message-collapse-button') ? '0 0 0 -3px' : 'inset 0 0 0 1px';
                    changed = body.trim() + `box-shadow: ${filled ? `${stroke} ${edge}` : 'none'};`;
                }
                else {
                    const compact = /#dash\b|switcher-list|item-box|overview-icon|overview-tile|grid-search-result|app-folder|screenshot-ui/.test(clean);
                    const shadow = filled ? `0 1px ${compact ? 2 : 4}px 0 rgba(0, 0, 0, ${(dark ? 0.12 : 0.06) / (compact ? 2 : 1)})` : 'none';
                    const border = names.some(name => ['search-section-content', 'window-close', 'screenshot-ui-close-button'].includes(name)) ? 'border-color:' : 'border:1px solid ';
                    changed = body.trim() + `${border}${filled ? edge : 'transparent'};box-shadow:${names.includes('message') && !names.includes('notification-banner') ? 'none' : originalShadow && !/none|transparent/.test(originalShadow) ? originalShadow : shadow};`;
                }
            } else if (originalShadow && !/none|transparent/.test(originalShadow) && !/box-shadow\s*:/.test(body)) {
                changed = body.trim() + `box-shadow: ${originalShadow};`;
            }
            const group = groups.get(changed) ?? [];
            group.push(selector); groups.set(changed, group);
        }
        return [...groups].map(([value, group]) => `${group.join(',')}{${value}}`).join('\n');
    });
    // Reapply original visible shadows after adding edges and shadows to unshadowed controls.
    return result + '\n' + [...nativeShadows].filter(([selector, shadow]) => {
        if (seen.has(selector)) return false;
        const color = shadow.match(/((?:rgba?|st-[\w-]+)\(.*\)|#[\da-f]{3,8}|transparent|black|white)\s*(?:!important)?$/)?.[1];
        return !/^none$/.test(shadow) && (!color || colorAlpha(color) > 0);
    }).map(([selector, shadow]) => `${selector} { box-shadow: ${shadow}; }`).join('\n') + `
#dash .overview-tile { border-width: 0 !important; box-shadow: none; }
#dash .overview-tile:drop { box-shadow: ${dark ? nativeShadows.get('.overview-tile:drop') ?? 'none' : 'none'}; }
.message { box-shadow: none; }
.notification-banner, .notification-banner:hover, .notification-banner:active, .notification-banner:active:hover { box-shadow: 0 2px 8px 0 rgba(0, 0, 0, ${dark ? 0.12 : 0.06}); }
`;
}

export function makeShellStyles(source, dark, {tint = 'balanced', transparency = 'translucent'} = {}, nativeSource = '') {
    if (!(tint in TINTS) || !(transparency in OPACITY))
        throw new Error('Unknown Iridescence preset');
    const factor = TINTS[tint];
    const alpha = OPACITY[transparency];
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
        function add(selector, transformed) {
            const group = output.get(transformed) ?? [];
            group.push(selector);
            output.set(transformed, group);
        }
        function transform(clean, scoped = false) {
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
.notification-banner { border-width: 1px; }
.quick-toggle-menu { margin-left: 0; margin-right: 0; }
.unlock-dialog-notifications-container { width: 29em; }
.magnifier-zoom-region.full-screen { border-width: 0; }
`;
    result += '#panel:overview .iridescence-panel-edge { background-color: transparent; }\n';
    return shellContrast(result, dark, scopes, edge, nativeSource) + `
.popup-menu-content { border-color: ${edge}; }
.app-folder-dialog { box-shadow: inset 0 0 0 1px ${edge}; }
`;
}

export function makeGtkStyles(tint, transparency, source) {
    if (!(tint in TINTS) || !(transparency in OPACITY))
        throw new Error('Unknown Iridescence preset');
    const css = source.replace(/(@accent_bg_color,\s*)([\d.]+)/g,
        (_match, prefix, weight) => `${prefix}${Number((Number(weight) * TINTS[tint]).toFixed(4))}`);
    const surfaces = /^(?:window_bg|view_bg|headerbar_(?:bg|backdrop)|(?:secondary_)?sidebar_(?:bg|backdrop))_color$/;
    const flat = ['button.flat', 'menubutton.flat > button', 'splitbutton.flat button',
        ...['headerbar', '.toolbar', 'actionbar', 'searchbar'].map(parent =>
            `${parent} button:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque)`)];
    const button = 'button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled):not(:focus-visible)';
    const highlights = [
        ...['list:not(.boxed-list):not(.content):not(.boxed-list-separate) > row', 'listview > row', 'gridview > child'].flatMap(selector =>
            ['.activatable:hover', '.activatable:active', ':selected', '.activatable.has-open-popup'].map(state => selector + state)),
        ...['flowbox > flowboxchild', 'popover.menu modelbutton', 'tabbar tabbox:not(.single-tab) > tabboxchild:not(:focus-visible) tab'].flatMap(selector =>
            [':hover', ':active', ':selected'].map(state => selector + state)),
        ...['toggle-group > toggle', 'notebook > header > tabs > tab'].flatMap(selector =>
            [':hover', ':active', ':checked', '.keyboard-activating'].map(state => selector + state)),
    ].map(selector => selector + ':not(:disabled):not(:focus-visible):not(:drop(active))');
    return (transparency === 'solid' ? css : css.replace(/@define-color (\w+) ([^;]+);/g, (declaration, name, color) => {
        // Composite the original card fill over a solid window; keep native interaction rules.
        if (name === 'card_bg_color')
            return `${declaration}\n    @define-color iridescence_solid_card_bg_color ${color.replace(/rgba\(([^)]+), ([\d.]+)\)/g, 'mix(@iridescence_solid_window_bg_color, rgb($1), $2)')};`;
        if (!surfaces.test(name)) return declaration;
        return `@define-color iridescence_solid_${name} ${color};\n    @define-color ${name} alpha(${color}, ${name === 'window_bg_color' ? OPACITY[transparency] : name.includes('sidebar') ? 0.35 : 0.1});`;
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
window.view { background-color: alpha(@iridescence_solid_view_bg_color, ${OPACITY[transparency]}); }
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
:root { --iridescence-edge-color: color-mix(in srgb, @accent_bg_color ${3.75 * TINTS[tint]}%, rgba(0, 0, 0, 0.12)); --iridescence-edge: 1px solid var(--iridescence-edge-color); --iridescence-shadow: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.08)); --sidebar-border-color: var(--iridescence-edge-color); --secondary-sidebar-border-color: var(--iridescence-edge-color); }
@media (prefers-color-scheme: dark) { :root { --iridescence-edge-color: color-mix(in srgb, @accent_bg_color ${5 * TINTS[tint]}%, rgba(255, 255, 255, 0.12)); --iridescence-shadow: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.16)); } }
button { --iridescence-button-edge: var(--iridescence-edge); --iridescence-button-shadow: var(--iridescence-shadow); }
${flat.join(', ')} { --iridescence-button-edge: none; --iridescence-button-shadow: none; }
${flat.flatMap(selector => [':hover', ':active', ':checked', '.keyboard-activating'].map(state => selector + state)).join(', ')} { --iridescence-button-edge: var(--iridescence-edge); --iridescence-button-shadow: var(--iridescence-shadow); }
@media (prefers-contrast: no-preference) {
window.csd { outline-color: color-mix(in srgb, @accent_bg_color ${3.5 * TINTS[tint]}%, rgba(255, 255, 255, 0.25)); }
@media (prefers-color-scheme: dark) { window.csd { outline-color: color-mix(in srgb, @accent_bg_color ${5 * TINTS[tint]}%, rgba(255, 255, 255, 0.12)); } }
}
${button} { outline: var(--iridescence-button-edge); outline-offset: -1px; filter: var(--iridescence-button-shadow); }
columnview > header > ${button}, treeview > header > ${button}, tabthumbnail ${button}, bottom-sheet > sheet > stack > ${button}, windowcontrols > ${button} { outline: none; filter: none; }
${['columnview', 'treeview'].flatMap(view => [':hover', ':active'].map(state => `${view} > header > ${button}${state}`)).join(', ')} { outline: var(--iridescence-edge); outline-offset: -1px; filter: var(--iridescence-shadow); }
menubutton.suggested-action:not(:disabled):not(:focus-within), splitbutton.suggested-action:not(:disabled):not(:focus-within),
menubutton.opaque:not(:disabled):not(:focus-within), splitbutton.opaque:not(:disabled):not(:focus-within),
windowcontrols > ${button} > image,
entry:not(.flat):not(:disabled):not(:focus-within), spinbutton:not(.flat):not(:disabled):not(:focus-within), .floating-bar { outline: var(--iridescence-edge); outline-offset: -1px; filter: var(--iridescence-shadow); }
menubutton.suggested-action > ${button}, splitbutton.suggested-action ${button}, menubutton.opaque > ${button}, splitbutton.opaque ${button}, spinbutton ${button} { outline: none; filter: none; }
${highlights.join(', ')}, .nautilus-pathbar { outline: var(--iridescence-edge); outline-offset: -1px; filter: var(--iridescence-shadow); }
.nautilus-pathbar ${button}, popover.menu list > row:selected:not(:hover):not(:active):not(.has-open-popup):not(:disabled):not(:focus-visible):not(:drop(active)), popover.menu listview > row:selected:not(:hover):not(:active):not(.has-open-popup):not(:disabled):not(:focus-visible):not(:drop(active)) { outline: none; filter: none; }
.card, list.boxed-list, list.content, list.boxed-list-separate > row, dnd tab { outline: var(--iridescence-edge); outline-offset: 0; }
toast { outline: var(--iridescence-edge); outline-offset: -1px; }
@media (prefers-color-scheme: dark) { scrollbar { --scrollbar-outline-color: white; } }
switch:not(:disabled):not(:focus-visible) { outline: var(--iridescence-edge); outline-offset: -1px; }
scale:not(:disabled) { ---slider-border-color: var(--iridescence-edge-color); }
calendar > grid > label.day-number:selected:not(:focus), calendar > grid > label.day-number:checked:not(:focus),
checkbutton:not(:disabled):not(:focus-visible) > check, checkbutton:not(:disabled):not(:focus-visible) > radio { outline: var(--iridescence-edge); outline-offset: -1px; filter: var(--iridescence-shadow); }
`;
}
