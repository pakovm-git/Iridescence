// Run with GNOME Shell's St typelibs/libraries on the search path.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import {makeShellStyles, OPACITY} from '../styles.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';
GLib.setenv('GSETTINGS_BACKEND', 'memory', true);
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
const opacity = Number(ARGV[0] ?? 65);
if (![65, 90].includes(opacity)) throw Error('Expected Airy or Dense opacity');
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const directory = Gio.File.new_for_path(GLib.dir_make_tmp('iridescence-shell-css-XXXXXX'));
const context = new St.ThemeContext();
// Use pixel fonts in this backendless fixture; source font declarations are checked separately.
const font = Pango.FontDescription.from_string('Sans');
font.set_absolute_size(12 * Pango.SCALE);
context.set_font(font);
const files = [];
const failures = [];
const shadowReference = JSON.parse(readText(root.get_child('output/shadow-strength-reference.json')).text);
function file(name, css) {
    const target = directory.get_child(name);
    writeText(target, css);
    files.push(target);
    return target;
}
function check(value, message) { if (!value) failures.push(message); }
function part(classes, pseudo = null, id = null, type = St.Widget.$gtype) { return [id, classes, pseudo, type]; }
function pathNode(theme, path, parent = null) {
    if (!parent) parent = St.ThemeNode.new(context, null, theme, GObject.TYPE_NONE, null, '', null, 'font-size: 12px;');
    for (const [id, classes, pseudo = null, type = St.Widget.$gtype] of path)
        parent = St.ThemeNode.new(context, parent, theme, type, id, classes, pseudo, 'font-size: 12px;');
    return parent;
}
function color(actual, original, multiplier, label) {
    check(Math.abs(actual.alpha - Math.round(original.alpha * multiplier)) <= 1,
        `${label}: alpha ${actual.alpha}, expected ${Math.round(original.alpha * multiplier)} (original ${original.alpha})`);
    if (original.alpha && actual.alpha)
        for (const channel of ['red', 'green', 'blue']) {
            // St rounds premultiplied RGBA8; low alpha can move the unpremultiplied RGB by several bytes.
            const error = multiplier === 1 ? Math.abs(actual[channel] - original[channel])
                : Math.abs(actual[channel] * actual.alpha - original[channel] * original.alpha * multiplier) / 255;
            check(error <= 1, `${label}: original ${channel} changed (${actual[channel]}/${original[channel]})`);
        }
}
// Each reviewed group has actual selector paths; partial-alpha and checked states are explicit.
const inner = [
    ['01 quick toggle', [part('quick-toggle button')]],
    ['01 active quick toggle', [part('quick-toggle button', 'checked')]],
    ['01 active quick toggle hover', [part('quick-toggle button', 'checked hover')]],
    ['01 active quick toggle focus', [part('quick-toggle button', 'checked focus')]],
    ['01 disabled active quick toggle', [part('quick-toggle button', 'checked insensitive')]],
    ['02 arrow', [part('quick-toggle-has-menu'), part('quick-toggle-menu-button icon-button')]],
    ['02 active arrow', [part('quick-toggle-has-menu', 'checked'), part('quick-toggle-menu-button icon-button', 'checked')]],
    ['02 active arrow hover', [part('quick-toggle-has-menu', 'checked'), part('quick-toggle-menu-button icon-button', 'checked hover')]],
    ['02 active arrow focus', [part('quick-toggle-has-menu', 'checked'), part('quick-toggle-menu-button icon-button', 'checked focus')]],
    ['02 divider', [part('quick-toggle-has-menu'), part('quick-toggle-separator')]],
    ['02 active divider', [part('quick-toggle-has-menu', 'checked'), part('quick-toggle-separator')]],
    ['03 round system button', [part('icon-button')]],
    ['03 power item', [part('quick-settings-system-item'), part('power-item button')]],
    ['04 slider container', [part('quick-slider'), part('slider-bin', 'focus')]],
    ['04 slider icon button', [part('quick-slider'), part('icon-button flat')]],
    ['04 slider normal container', [part('quick-slider'), part('slider-bin')]],
    ['05 submenu header icon', [part('quick-toggle-menu'), part('header'), part('icon')]],
    ['05 active submenu header icon', [part('quick-toggle-menu'), part('header'), part('icon active')]],
    ['05 submenu row', [part('quick-toggle-menu'), part('popup-menu-item', 'hover')]],
    ['06 background apps row', [part('quick-toggle button background-apps-quick-toggle')]],
    ['06 background apps hover', [part('quick-toggle button background-apps-quick-toggle', 'hover')]],
    ['06 background app action', [part('background-app-item'), part('icon-button')]],
    ['07 notification card', [part('message')]],
    ['07 backing notification card', [part('message', 'second-in-stack')]],
    ['07 lower notification card', [part('message', 'lower-in-stack')]],
    ['08 notification action', [part('notification-button')]],
    ['08 notification close', [part('message'), part('message-header'), part('message-close-button')]],
    ['08 notification expand', [part('message'), part('message-header'), part('message-expand-button')]],
    ['08 notification collapse', [part('message-notification-group'), part('message-collapse-button')]],
    ['09 thumbnail', [part('message'), part('message-box'), part('message-icon message-themed-icon')]],
    ['09 media control', [part('message-media-control', 'hover')]],
    ['10 events', [part('events-button')]],
    ['11 world clocks', [part('world-clocks-button')]],
    ['12 weather', [part('weather-button')]],
    ['13 calendar container', [part('calendar')]],
    ['13 inactive calendar container', [part('calendar', 'insensitive')]],
    ['13 date heading', [part('datemenu-today-button', null, null, St.Button.$gtype)]],
    ['13 inactive date heading', [part('datemenu-today-button', 'insensitive', null, St.Button.$gtype)]],
    ['13 hovered date heading', [part('datemenu-today-button', 'hover', null, St.Button.$gtype)]],
    ['13 day', [part('calendar'), part('calendar-day')]],
    ['13 focused day', [part('calendar'), part('calendar-day', 'focus')]],
    ['13 hovered day', [part('calendar'), part('calendar-day', 'hover')]],
    ['13 today', [part('calendar'), part('calendar-day calendar-today')]],
    ['13 weekday', [part('calendar'), part('calendar-day-heading')]],
    ['13 month', [part('calendar'), part('calendar-month-header'), part('calendar-month-label')]],
    ['13 pager', [part('calendar'), part('calendar-month-header'), part('pager-button')]],
    ['14 popup row', [part('popup-menu-item', 'hover')]],
    ['14 disabled popup row', [part('popup-menu-item', 'insensitive')]],
    ['14 nested popup section', [part('popup-sub-menu')]],
    ['14 nested popup layout', [part('popup-sub-menu'), part('', null, null, St.BoxLayout.$gtype)]],
    ['14 general button', [part('button')]],
    ['14 flat button', [part('button flat')]],
    ['14 hovered flat button', [part('button flat', 'hover')]],
    ['15 entry', [part('', null, null, St.Entry.$gtype)]],
    ['15 search entry', [part('search-entry', null, null, St.Entry.$gtype)]],
    ['15 rename entry', [part('app-folder-dialog'), part('folder-name-container'), part('folder-name-entry', null, null, St.Entry.$gtype)]],
    ['16 checkbox backing', [part('check-box', 'focus'), part('', null, null, St.Bin.$gtype)]],
    ['16 switch background', [part('toggle-switch')]],
    ['16 checked switch background', [part('toggle-switch', 'checked')]],
    ['16 scrollbar trough', [part('', null, null, St.ScrollBar.$gtype), part('', null, 'trough', St.Bin.$gtype)]],
    ['17 dialog action', [part('modal-dialog'), part('modal-dialog-button-box'), part('modal-dialog-button')]],
    ['17 device choice', [part('audio-device-selection-dialog'), part('audio-selection-box'), part('audio-selection-device', 'hover')]],
    ['17 prompt warning', [part('prompt-dialog'), part('prompt-dialog-error-label')]],
    ['18 switcher item', [part('switcher-list'), part('item-box', 'selected')]],
    ['19 search section', [part('search-section-content')]],
    ['19 result', [part('list-search-result', 'hover')]],
    ['19 provider', [part('search-provider-icon', 'hover')]],
    ['20 app tile', [part('overview-tile', 'hover')]],
    ['20 app tile pressed', [part('overview-tile', 'active')]],
    ['20 app tile focused', [part('overview-tile', 'focus')]],
    ['20 app tile drop target', [part('overview-tile', 'drop')]],
    ['20 grid result', [part('grid-search-result', 'hover')]],
    ['20 folder', [part('app-folder', 'hover')]],
    ['21 dash app', [part('', null, 'dash'), part('dash-item-container'), part('overview-tile', 'hover'), part('overview-icon')]],
    ['21 dash focused app', [part('', null, 'dash'), part('dash-item-container'), part('overview-tile', 'focus'), part('overview-icon')]],
    ['21 dash drop target', [part('', null, 'dash'), part('dash-item-container'), part('overview-tile', 'drop')]],
    ['21 navigation arrow', [part('app-folder-dialog'), part('page-navigation-arrow', 'hover')]],
    ['22 keyboard key', [part('keyboard-key')]],
    ['22 modifier key', [part('keyboard-key default-key')]],
    ['22 suggestion', [part('word-suggestions'), part('', 'hover', null, St.Button.$gtype)]],
    ['23 screenshot type', [part('screenshot-ui-type-button', 'checked')]],
    ['23 screenshot pointer', [part('screenshot-ui-show-pointer-button')]],
    ['23 capture control', [part('screenshot-ui-shot-cast-button')]],
    ['24 developer window', [part('', null, 'LookingGlassWindows'), part('lg-window')]],
    ['24 developer extension', [part('', null, 'LookingGlassExtensions'), part('lg-extension')]],
    ['24 developer tab', [part('', null, 'LookingGlassDialog'), part('notebook-tab', 'selected')]],
    ['24 developer toolbar', [part('', null, 'LookingGlassDialog'), part('', null, 'Toolbar'), part('lg-toolbar-button', 'hover')]],
];
inner.push(['22 keyboard brightness active', [part('', null, 'keyboard'), part('keyboard-brightness-level'), part('button', 'checked')]]);
const outer = [
    ...['popup-menu-content', 'candidate-popup-content', 'osd-window', 'modal-dialog', 'switcher-list',
        'workspace-switcher', 'screenshot-ui-panel', 'app-folder-dialog', 'resize-popup', 'dash-background',
        'dash-label', 'window-caption', 'screenshot-ui-tooltip', 'pad-osd-window']
        .map(name => [name, [part(name)]]),
    ['notification banner', [part('message notification-banner')]],
    ['keyboard', [part('', null, 'keyboard')]],
    ['Looking Glass', [part('', null, 'LookingGlassDialog')]],
];
const marks = [
    ['workspace dot', [part('', null, 'panel'), part('panel-button', null, 'panelActivities'), part('workspace-dot')]],
    ['running dot', [part('app-grid-running-dot')]],
    ['page dot', [part('page-indicator'), part('page-indicator-icon')]],
    ['workspace switcher mark', [part('ws-switcher-indicator', 'active')]],
    ['scrollbar handle', [part('', null, null, St.ScrollBar.$gtype), part('vhandle')]],
    ['checkbox mark', [part('check-box', 'checked'), part('', null, null, St.Icon.$gtype)]],
    ['screenshot selection check', [part('screenshot-ui-window-selector', 'checked'), part('screenshot-ui-window-selector-check', null, null, St.Icon.$gtype)]],
    ['switch handle', [part('toggle-switch'), part('handle')]],
    ['OSD level', [part('osd-window'), part('level')]],
    ['screenshot shade', [part('screenshot-ui-area-selector'), part('screenshot-ui-area-indicator-shade')]],
    ['screenshot selector handle', [part('screenshot-ui-area-selector-handle')]],
];

const excludedNames = /^(?:24 |workspace-switcher$|resize-popup$|dash-label$|window-caption$|screenshot-ui-tooltip$|Looking Glass$)/;
function sameAppearance(actual, original, multiplier, label, surfaceBorder = false, decorated = false) {
    const before = original.get_background_color();
    color(actual.get_background_color(), before, before.alpha === 255 ? multiplier : 1, `${label} background`);
    color(actual.get_foreground_color(), original.get_foreground_color(), 1, `${label} foreground`);
    if (decorated) return;
    for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT]) {
        check(actual.get_border_width(side) === original.get_border_width(side), `${label}: border geometry`);
        color(actual.get_border_color(side), original.get_border_color(side), surfaceBorder ? multiplier : 1, `${label} border`);
    }
    const shadow = actual.get_box_shadow(), oldShadow = original.get_box_shadow();
    check(Boolean(shadow) === Boolean(oldShadow), `${label}: shadow presence`);
    if (shadow && oldShadow) color(shadow.color, oldShadow.color, 1, `${label} shadow`);
}
try {
    for (const dark of [false, true]) {
        const variant = dark ? 'dark' : 'light';
        const source = readText(root.get_child(`themes/shell-${variant}.css`)).text;
        const native = Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${variant}.css`);
        const baseline = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${variant}-original.css`, source.replace(/transparent\s+!important(?=\s*,)/g, 'transparent'))});
        const menuPath = [part('popup-menu-content')];
        let solidTheme;
        for (const transparency of Object.keys(OPACITY)) {
            const css = makeShellStyles(source, dark, {transparency, opacity});
            const theme = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${variant}-${transparency}-${opacity}.css`, css)});
            const strokes = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${variant}-${transparency}-${opacity}-strokes.css`, css.split('/* Restored extra shadows (B). */')[0])});
            context.set_theme(theme);
            const label = `${variant}/${transparency}/${opacity}`;
            const alpha = transparency === 'solid' ? 1 : opacity / 100;
            const contrastTheme = theme;
            const lockParent = [part('unlock-dialog-notifications-container')];
            for (const role of ['message', 'unlock-dialog-notification-source']) {
                for (const state of [null, 'active', 'hover', 'focus', 'insensitive']) {
                    const path = [...lockParent, part(role, state)];
                    const before = pathNode(baseline, path), after = pathNode(theme, path);
                    color(after.get_foreground_color(), before.get_foreground_color(), 1, `${label}: lock-screen ${role} text`);
                    color(after.get_background_color(), before.get_background_color(), 1, `${label}: lock-screen ${role} keeps original partial-alpha fill`);
                    const stroke = after.get_box_shadow();
                    if (role === 'message' && state === 'insensitive')
                        check(!stroke, `${label}: lock-screen disabled message has no edge`);
                    else
                        check(stroke?.inset && stroke.spread === 1, `${label}: lock-screen ${role} native inset edge`);
                    check(after.get_border_width(St.Side.TOP) === before.get_border_width(St.Side.TOP), `${label}: lock-screen ${role} original border allocation`);
                }
            }
            const passwordPath = [part('unlock-dialog'), part('login-dialog-prompt-entry', null, null, St.PasswordEntry.$gtype)];
            sameAppearance(pathNode(theme, passwordPath), pathNode(baseline, passwordPath), 1, `${label}: password entry retains its original palette`);
            const lockBackground = [part('', null, 'lockDialogGroup')];
            sameAppearance(pathNode(theme, lockBackground), pathNode(baseline, lockBackground), 1, `${label}: native lock background is preserved`);

            const shadowValue = shadow => shadow ? [shadow.xoffset, shadow.yoffset, shadow.blur, shadow.spread, shadow.inset,
                shadow.color.red, shadow.color.green, shadow.color.blue, shadow.color.alpha].join(',') : '';
            for (const selector of shadowReference.outlineRegressionSelectors) {
                const path = selector.split(/\s+/).map(token => {
                    const type = token.match(/^\w+/)?.[0];
                    return part([...token.matchAll(/\.([\w-]+)/g)].map(m => m[1]).join(' '), [...token.matchAll(/:([\w-]+)/g)].map(m => m[1]).join(' '), token.match(/#([\w-]+)/)?.[1] ?? null, type ? St[type.slice(2)].$gtype : St.Widget.$gtype);
                });
                for (const state of ['', 'hover', 'active', 'checked', 'focus', 'insensitive', 'checked hover', 'checked focus', 'checked insensitive']) {
                    const target = path.map(part => [...part]);
                    target.at(-1)[2] = [...new Set(((target.at(-1)[2] ?? '') + ' ' + state).split(' ').filter(Boolean))].join(' ') || null;
                    const before = pathNode(strokes, target), after = pathNode(theme, target);
                    const originalShadow = before.get_box_shadow();
                    if (originalShadow?.inset || originalShadow?.color.alpha)
                        check(shadowValue(originalShadow) === shadowValue(after.get_box_shadow()), `${label}: restored shadow preserves existing outline/elevation for ${selector} ${state}`);
                    for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT])
                        check(before.get_border_width(side) === after.get_border_width(side) && before.get_padding(side) === after.get_padding(side) && before.get_margin(side) === after.get_margin(side), `${label}: shadow preserves geometry for ${selector} ${state}`);
                }
            }
            function midpointShadow(actual, original, reference, description, added = null) {
                if (!reference?.inset) {
                    const expected = added ?? original;
                    check(Boolean(actual) === Boolean(expected), `${description}: original shadow presence`);
                    if (actual && expected) {
                        color(actual.color, expected.color, 1, `${description}: original shadow color`);
                        check(actual.inset === expected.inset && actual.spread === (expected.inset && expected.spread === 2 ? 1 : expected.spread), `${description}: original shadow or 1px drag outline`);
                    }
                    return;
                }
                check(actual?.inset && actual.spread === (reference.spread === 2 ? 1 : reference.spread), `${description}: 1px outline or native inset fill`);
                if (!actual) return;
                const normal = original?.inset ? original.color : {red: 0, green: 0, blue: 0, alpha: 0};
                const alpha = (normal.alpha + reference.color.alpha) / 2;
                check(Math.abs(actual.color.alpha - alpha) <= 2, `${description}: midpoint alpha ${actual.color.alpha}, expected ${alpha}`);
                // New rings fade the contrast color from transparent; existing rings blend both colors.
                for (const channel of ['red', 'green', 'blue']) {
                    const expected = alpha ? (normal[channel] * normal.alpha + reference.color[channel] * reference.color.alpha) / (2 * alpha) : 0;
                    check(Math.abs(actual.color[channel] - expected) <= 2, `${description}: midpoint ${channel} ${actual.color[channel]}, expected ${expected}`);
                }
            }
            const hcText = readText(Gio.File.new_for_uri('resource:///org/gnome/shell/theme/gnome-shell-high-contrast.css')).text;
            const hc = new St.Theme({application_stylesheet: file(`${variant}-hc-reference.css`, dark ? hcText : hcText
                .replaceAll('rgba(255, 255, 255,', 'rgba(0, 0, 0,')
                .replaceAll('st-mix(-st-accent-color, #ffffff, 60%)', '-st-accent-color'))});
            if (transparency === 'solid') solidTheme = theme;
            for (const [name, barePath] of inner) {
                const excluded = excludedNames.test(name);
                const path = excluded || name.startsWith('17 ') ? barePath : [...menuPath, ...barePath];
                const before = pathNode(baseline, path), after = pathNode(theme, path), reference = pathNode(hc, path);
                for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT]) {
                    check(after.get_border_width(side) === (name === 'notification banner' ? 1 : before.get_border_width(side)), `${label}: ${name} border allocation matches approved parity`);
                    if (!name.includes('notification close')) check(after.get_padding(side) === before.get_padding(side), `${label}: ${name} original padding`);
                    check(after.get_margin(side) === before.get_margin(side), `${label}: ${name} original margin`);
                }
                if (name === '07 backing notification card' || name === '07 lower notification card') {
                    const alpha = after.get_border_color(St.Side.TOP).alpha;
                    const main = pathNode(theme, [...menuPath, part('message')]).get_border_color(St.Side.TOP).alpha;
                    check(after.get_border_width(St.Side.TOP) === 1 && !after.get_box_shadow(),
                        `${label}: ${name} paints its physical border without an inset gap`);
                    check(Math.abs(alpha - 255 * 0.1) <= 1 && alpha < main,
                        `${label}: ${name} outline is half the main card strength`);
                } else if (['07 notification card', '10 events', '11 world clocks', '12 weather'].includes(name)) {
                    check(!after.get_box_shadow(), `${label}: ${name} paints its existing physical border without a second inset edge`);
                    midpointShadow({inset: true, spread: 1, color: after.get_border_color(St.Side.TOP)}, before.get_box_shadow(), reference.get_box_shadow(), `${label}: ${name} border stroke`);
                } else {
                    midpointShadow(after.get_box_shadow(), before.get_box_shadow(), !excluded ? reference.get_box_shadow() : null, `${label}: ${name}`);
                }
                if (transparency === 'translucent') {
                    const solid = pathNode(solidTheme, path);
                    check(shadowValue(solid.get_box_shadow()) === shadowValue(after.get_box_shadow()), `${label}: ${name} mode parity shadow`);
                    for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT])
                        check(solid.get_border_width(side) === after.get_border_width(side), `${label}: ${name} mode parity geometry`);
                }
            }
            for (const [name, path] of outer) {
                if (excludedNames.test(name)) continue;
                const before = pathNode(baseline, path), after = pathNode(theme, path);
                const reference = pathNode(hc, path).get_box_shadow();
                if (name === 'popup-menu-content') {
                    const [found, shadow] = after.lookup_shadow('-iridescence-shadow', false);
                    check(!after.get_box_shadow() && found && shadow.yoffset === 10 && shadow.blur === 10 && Math.abs(shadow.color.alpha - 255 * 0.21) <= 1, `${label}: popup replaces native shadow with shared exterior shadow`);
                } else if (name === 'switcher-list') {
                    const shadow = after.get_box_shadow();
                    check(shadow && !shadow.inset && shadow.xoffset === 0 && shadow.yoffset === 8 && shadow.blur === 8 && shadow.spread === 0 && shadow.color.alpha === 51, `${label}: switcher popup uses the shared 20% shadow`);
                } else
                    midpointShadow(name === 'notification banner' ? {inset: true, spread: 1, color: after.get_border_color(St.Side.TOP)} : after.get_box_shadow(), before.get_box_shadow(), reference, `${label}: ${name}`);
                for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT])
                    check(after.get_border_width(side) === (name === 'notification banner' ? 1 : before.get_border_width(side)), `${label}: ${name} border allocation matches approved parity`);
            }
            for (const state of [null, 'hover', 'active', 'active hover']) {
                const node = pathNode(theme, [part('message notification-banner', state)]);
                check(!node.get_box_shadow() && node.get_border_width(St.Side.TOP) === 1 && Math.abs(node.get_border_color(St.Side.TOP).alpha - 255 * 0.2) <= 1, `${label}: stable physical banner border in ${state}`);
            }
            for (const role of ['overview-tile', 'show-apps']) {
                const nodes = [null, 'hover', 'checked', 'active'].map(state => pathNode(theme,
                    [part('', null, 'dash'), part('dash-item-container'), part(role, state), part('overview-icon')]));
                for (const node of nodes) for (const side of [St.Side.TOP, St.Side.RIGHT, St.Side.BOTTOM, St.Side.LEFT])
                    check(node.get_border_width(side) === nodes[0].get_border_width(side), `${label}: ${role} hover does not resize icon`);
                const wrapper = pathNode(theme, [part('', null, 'dash'), part('dash-item-container'), part(role, 'hover')]);
                check(!wrapper.get_box_shadow()?.color.alpha, `${label}: ${role} wrapper stays unpainted`);
            }
            for (const state of ['checked', 'checked hover', 'checked active', 'checked active hover']) {
                for (const [role, classes] of [['arrow', 'quick-toggle-menu-button icon-button'], ['toggle', 'quick-toggle button']]) {
                    const node = pathNode(theme, [...menuPath, part('quick-toggle-has-menu', 'checked'), part(classes, state, null, St.Button.$gtype)]);
                    const [found, shadow] = node.lookup_shadow('-iridescence-shadow', false);
                    check(!node.get_box_shadow()?.color.alpha && found && shadow.blur === 8 && Math.abs(shadow.color.alpha - 255 * 0.147) <= 1, `${label}: checked ${role} gets the reduced control shadow without a decorative edge (${state})`);
                }
            }
            const oldMenu = pathNode(baseline, menuPath).get_background_color();
            for (const [name, barePath] of inner) {
                const excluded = excludedNames.test(name);
                const path = excluded || name.startsWith('17 ') ? barePath : [...menuPath, ...barePath];
                const actual = pathNode(theme, path), original = pathNode(baseline, path);
                const before = original.get_background_color();
                const accent = /^(?:01 (?:disabled )?active|02 active arrow|05 active|13 today|16 checked switch|22 keyboard brightness active)/.test(name);
                const isOuter = /^(?:14 nested popup section|19 search section)/.test(name);
                const flat = !excluded && before.alpha === 255 && before.red === oldMenu.red && before.green === oldMenu.green && before.blue === oldMenu.blue;
                const unchanged = transparency === 'solid' || excluded || accent || name.includes('divider');
                if (flat) {
                    check(actual.get_background_color().alpha === 0, `${label} ${name}: originally unfilled`);
                    sameAppearance(actual, original, 0, `${label} ${name}`, false, !excluded);
                } else sameAppearance(actual, original, unchanged ? 1 : opacity / 100, `${label} ${name}`, isOuter && !unchanged, !excluded);
            }
            for (const [name, path] of outer) {
                const excluded = excludedNames.test(name);
                const banner = name === 'notification banner';
                sameAppearance(pathNode(theme, path), pathNode(baseline, path), transparency === 'solid' || excluded ? 1 : opacity / 100,
                    `${label} ${name}`, !excluded && !banner && !(dark && ['osd-window', 'switcher-list', 'screenshot-ui-panel'].includes(name)), !excluded);
            }
            const override = file(`${variant}-external.css`, '.popup-menu-content .message { background-color: rgba(12,34,56,.58) !important; }');
            const overrideTheme = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${variant}-override-base.css`, makeShellStyles(source, dark, {transparency, opacity}))});
            overrideTheme.load_stylesheet(override);
            const external = pathNode(overrideTheme, [...menuPath, part('message')]).get_background_color();
            check(external.red === 12 && external.green === 34 && external.blue === 56 && Math.abs(external.alpha - 148) <= 1, `${label}: explicit external popup overrides retain priority`);
            for (const [name, path] of marks) sameAppearance(pathNode(theme, path), pathNode(baseline, path), 1, `${label} ${name}`);
            for (const property of ['-barlevel-background-color', '-barlevel-active-background-color', '-barlevel-overdrive-color'])
                color(pathNode(theme, [part('slider')]).get_color(property), pathNode(baseline, [part('slider')]).get_color(property), 1, `${label} ${property}`);
            {
                const panelTheme = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${label.replaceAll('/', '-')}-panel.css`, makeShellStyles(source, dark, {transparency, opacity}))});
                const panelPath = [part('', null, 'panel')], panel = pathNode(panelTheme, panelPath);
                color(panel.get_background_color(), pathNode(baseline, panelPath).get_background_color(), alpha, `${label} panel`);
                const separatorPath = [...panelPath, part('iridescence-panel-edge')];
                const separator = pathNode(panelTheme, separatorPath);
                check(panel.get_border_width(St.Side.BOTTOM) === 0 && !panel.get_box_shadow(), `${label}: no duplicate panel line`);
                const solidTheme = new St.Theme({default_stylesheet: native, application_stylesheet: file(`${variant}-solid-panel.css`, makeShellStyles(source, dark, {transparency: 'solid'}))});
                color(separator.get_background_color(), pathNode(solidTheme, separatorPath).get_background_color(), alpha, `${label} separator follows panel preset`);
                const overview = pathNode(panelTheme, [part('', 'overview', 'panel')]);
                check(overview.get_background_color().alpha === 0, `${label}: panel stays clear in overview`);
                check(pathNode(panelTheme, [part('', 'overview', 'panel'), part('iridescence-panel-edge')]).get_background_color().alpha === 0, `${label}: overview has no panel edge`);
                panelTheme.load_stylesheet(file('panel-matcher.css', '#panel { background-color: rgb(18,52,86); }'));
                const matched = pathNode(panelTheme, panelPath).get_background_color();
                check(matched.red === 18 && matched.green === 52 && matched.blue === 86, `${label}: panel extension priority`);
                panelTheme.load_stylesheet(file('panel-clear.css', '#panel.transparent-panel { background-color: transparent !important; }'));
                const clear = pathNode(panelTheme, [part('transparent-panel', null, 'panel')]);
                check(clear.get_background_color().alpha === 0 && pathNode(panelTheme, [part('transparent-panel', null, 'panel'), part('iridescence-panel-edge')]).get_background_color().alpha > 0, `${label}: transparent desktop panel retains its 1px separator`);
            }
        }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    print(`Native St: reviewed actor paths, ${opacity}% opacity, original partial alpha, exclusions, borders, shadows, foregrounds and panel integration passed in both variants.`);
} finally {
    context.set_theme(new St.Theme());
    for (const target of files) if (target.query_exists(null)) target.delete(null);
    directory.delete(null);
}
