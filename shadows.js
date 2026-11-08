// Outer shadows use a separate native effect so the existing inset outlines stay intact.
// Exact A/B/C values: output/shadow-strength-reference.json.
export function makeShellShadows(dark, css, scopes, colorAlpha) {
    const roles = new Set(['app-folder', 'screenshot-ui-show-pointer-button', 'screenshot-ui-type-button',
        'message-expand-button', 'message-close-button', 'icon-button', 'button', 'quick-toggle',
        'calendar-day', 'pager-button', 'quick-toggle-menu', 'events-button', 'world-clocks-button',
        'weather-button', 'folder-name-entry', 'search-entry', 'notification-button', 'modal-dialog-button',
        'osd-window', 'screenshot-ui-panel', 'popup-sub-menu', 'notification-banner', 'pad-osd-window',
        'quick-toggle-menu-button', 'message-media-control', 'search-section-content', 'dash-background',
        'page-navigation-arrow', 'overview-tile', 'grid-search-result', 'list-search-result', 'item-box',
        'popup-menu-item', 'overview-icon', 'search-provider-icon', 'audio-selection-device', 'keyboard-key',
        'calendar-month-label', 'datemenu-today-button', 'screenshot-ui-shot-cast-button', 'background-apps-quick-toggle', 'power-item']);
    const surfaces = new Set(['osd-window', 'pad-osd-window', 'quick-toggle-menu', 'screenshot-ui-panel',
        'popup-sub-menu', 'notification-banner', 'search-section-content', 'dash-background']);
    const groups = [];
    for (const [, selectors, body] of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const fill = [...body.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)].at(-1)?.[1].replace(/\s*!important\s*$/, '').trim();
        if (!fill) continue;
        for (const selector of selectors.split(',')) {
            const clean = selector.trim();
            if (/LookingGlass|\.lg-|login-dialog|unlock-dialog|lockDialogGroup|candidate-popup/.test(clean)) continue;
            const last = clean.split(/\s+|>/).at(-1).replace(/:[\w-]+/g, '');
            const names = last.split(/[.#]/);
            const shared = /^(?:\.(?:button|icon-button)(?:\.[\w-]+)*|StEntry)$/.test(last);
            if (shared && !scopes.some(scope => clean.startsWith(scope + ' '))) continue;
            if (!names.some(name => roles.has(name)) && last !== 'StEntry' && !/\.quick-toggle-menu \.header \.icon/.test(clean)) continue;
            const compact = /#dash\b|switcher-list|item-box|overview-tile|grid-search-result|app-folder|screenshot-ui/.test(clean);
            const search = names.includes('search-entry');
            const prominent = names.includes('notification-banner') || names.includes('osd-window');
            const surface = names.some(name => surfaces.has(name)) || /\.(?:osd-window|pad-osd-window)(?:[ :.]|$)/.test(clean);
            const strength = Number((0.21 / (compact || search ? 2 : 1) * (surface ? 1 : 0.7)).toFixed(4));
            const value = fill !== 'none' && colorAlpha(fill) > 0 && !/:insensitive/.test(clean)
                ? `0 ${prominent ? 10 : 1}px ${prominent ? 10 : search ? 2 : compact ? 4 : 8}px 0 rgba(0, 0, 0, ${strength})` : 'none';
            const group = groups.at(-1);
            if (group?.shadow === value) group.selectors.push(clean);
            else groups.push({shadow: value, selectors: [clean]});
        }
    }
    return '\n/* Restored extra shadows (B). */\n' + groups.map(({shadow, selectors}) => `${selectors.join(',\n')} { -iridescence-shadow: ${shadow}; }`).join('\n') + `
.notification-banner, .osd-window, .popup-menu-content { -iridescence-shadow: 0 10px 10px 0 rgba(0, 0, 0, 0.21); }
`;
}

export function makeGtkShadows(flat, css) {
    const button = 'button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled)';
    // Preserve each native inset/raised shadow in the cascade while adding a clipped outer shadow.
    const base = css.replace(/\bbox-shadow\s*:\s*([^;{}]+);/g, (_declaration, value) => {
        const important = /\s*!important\s*$/.test(value) ? ' !important' : '';
        const shadow = value.replace(/\s*!important\s*$/, '').trim();
        return `--iridescence-base-shadow: ${shadow === 'none' ? '0 0 transparent' : shadow}; box-shadow: var(--iridescence-base-shadow), var(--iridescence-outer-shadow)${important};`;
    });
    const outer = value => `--iridescence-outer-shadow: ${value}; box-shadow: var(--iridescence-base-shadow), var(--iridescence-outer-shadow);`;
    return base + `
/* Restored extra shadows (B). */
:root { --iridescence-shadow: 0 1px 8px rgba(0, 0, 0, 0.196); --iridescence-surface-shadow: 0 1px 8px rgba(0, 0, 0, 0.28); }
.osd { --iridescence-shadow: var(--iridescence-surface-shadow); }
* { --iridescence-base-shadow: 0 0 transparent; --iridescence-outer-shadow: 0 0 transparent; }
button { --iridescence-button-shadow: var(--iridescence-shadow); }
${flat.join(', ')} { --iridescence-button-shadow: 0 0 transparent; }
${flat.flatMap(selector => [':hover', ':active', ':checked', '.keyboard-activating'].map(state => selector + state)).join(', ')} { --iridescence-button-shadow: var(--iridescence-shadow); }
${button} { ${outer('var(--iridescence-button-shadow)')} }
columnview > header > ${button}, treeview > header > ${button}, tabthumbnail ${button}, bottom-sheet > sheet > stack > ${button}, windowcontrols > ${button} { ${outer('0 0 transparent')} }
columnview > header > button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled):hover,
columnview > header > button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled):active,
treeview > header > button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled):hover,
treeview > header > button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled):active { ${outer('var(--iridescence-shadow)')} }
menubutton.suggested-action:not(:disabled),
splitbutton.suggested-action:not(:disabled),
menubutton.opaque:not(:disabled),
splitbutton.opaque:not(:disabled),
windowcontrols > button:not(.card):not(.link):not(.inline):not(.accent-button):not(:disabled) > image,
entry:not(.flat):not(:disabled),
spinbutton:not(.flat):not(:disabled) { ${outer('var(--iridescence-shadow)')} }
menubutton.suggested-action > ${button}, splitbutton.suggested-action ${button}, menubutton.opaque > ${button}, splitbutton.opaque ${button}, spinbutton ${button} { ${outer('0 0 transparent')} }
list:not(.boxed-list):not(.content):not(.boxed-list-separate) > row.activatable:hover:not(:disabled):not(:drop(active)),
list:not(.boxed-list):not(.content):not(.boxed-list-separate) > row.activatable:active:not(:disabled):not(:drop(active)),
list:not(.boxed-list):not(.content):not(.boxed-list-separate) > row:selected:not(:disabled):not(:drop(active)),
list:not(.boxed-list):not(.content):not(.boxed-list-separate) > row.activatable.has-open-popup:not(:disabled):not(:drop(active)),
listview > row.activatable:hover:not(:disabled):not(:drop(active)),
listview > row.activatable:active:not(:disabled):not(:drop(active)),
listview > row:selected:not(:disabled):not(:drop(active)),
listview > row.activatable.has-open-popup:not(:disabled):not(:drop(active)),
gridview > child.activatable:hover:not(:disabled):not(:drop(active)),
gridview > child.activatable:active:not(:disabled):not(:drop(active)),
gridview > child:selected:not(:disabled):not(:drop(active)),
gridview > child.activatable.has-open-popup:not(:disabled):not(:drop(active)),
flowbox > flowboxchild:hover:not(:disabled):not(:drop(active)),
flowbox > flowboxchild:active:not(:disabled):not(:drop(active)),
flowbox > flowboxchild:selected:not(:disabled):not(:drop(active)),
popover.menu modelbutton:hover:not(:disabled):not(:drop(active)),
popover.menu modelbutton:active:not(:disabled):not(:drop(active)),
popover.menu modelbutton:selected:not(:disabled):not(:drop(active)),
tabbar tabbox:not(.single-tab) > tabboxchild tab:hover:not(:disabled):not(:drop(active)),
tabbar tabbox:not(.single-tab) > tabboxchild tab:active:not(:disabled):not(:drop(active)),
tabbar tabbox:not(.single-tab) > tabboxchild tab:selected:not(:disabled):not(:drop(active)),
toggle-group > toggle:hover:not(:disabled):not(:drop(active)),
toggle-group > toggle:active:not(:disabled):not(:drop(active)),
toggle-group > toggle:checked:not(:disabled):not(:drop(active)),
toggle-group > toggle.keyboard-activating:not(:disabled):not(:drop(active)),
notebook > header > tabs > tab:hover:not(:disabled):not(:drop(active)),
notebook > header > tabs > tab:active:not(:disabled):not(:drop(active)),
notebook > header > tabs > tab:checked:not(:disabled):not(:drop(active)),
notebook > header > tabs > tab.keyboard-activating:not(:disabled):not(:drop(active)) { ${outer('var(--iridescence-shadow)')} }
.nautilus-pathbar, .nautilus-pathbar ${button}, popover.menu list > row:selected:not(:hover):not(:active):not(.has-open-popup):not(:disabled):not(:drop(active)), popover.menu listview > row:selected:not(:hover):not(:active):not(.has-open-popup):not(:disabled):not(:drop(active)) { ${outer('0 0 transparent')} }
.card, list.boxed-list, list.content, list.boxed-list-separate > row { ${outer('var(--iridescence-shadow)')} }
${['row', 'child', 'flowboxchild'].flatMap(type => [':selected', '.activatable:hover', '.activatable:active', '.activatable.has-open-popup'].map(state => `.navigation-sidebar > ${type}${state}:not(:disabled)`)).join(', ')} { ${outer('var(--iridescence-shadow)')} }
popover.menu list > row:hover, popover.menu list > row:active, popover.menu list > row.has-open-popup,
popover.menu listview > row:hover, popover.menu listview > row:active, popover.menu listview > row.has-open-popup { ${outer('var(--iridescence-shadow)')} }
calendar > grid > label.day-number:selected:not(:focus),
calendar > grid > label.day-number:checked:not(:focus),
checkbutton:not(:disabled) > check,
checkbutton:not(:disabled) > radio { ${outer('var(--iridescence-shadow)')} }
toast, .floating-bar, dnd tab { ${outer('var(--iridescence-surface-shadow)')} }
`;
}
