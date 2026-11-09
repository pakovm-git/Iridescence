import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule, SyntheticModule} from 'node:vm';
import {makeShellStyles, makeGtkStyles, TINTS} from '../styles.js';

const nativeCss = {light: '.unlock-dialog .login-dialog-prompt-layout {width:30em;}', dark: '.unlock-dialog .login-dialog-prompt-layout {width:31em;}'};
const data = {'shell-light-mode': true, 'tint': 'balanced', 'bms-desktop-enabled': false, 'transparency': true, 'gtk-opacity': 90};
function signals() {
    let id = 0;
    const callbacks = new Map();
    return {connect(name, callback) { callbacks.set(++id, [name, callback]); return id; },
        disconnect(key) { callbacks.delete(key); },
        emit(name, ...args) { for (const [event, callback] of [...callbacks.values()]) if (event === name) callback(this, ...args); },
        size() { return callbacks.size; }};
}
const settings = {...signals(), get_boolean: key => data[key], get_string: key => data[key], get_enum: key => data[key],
    set_string(key, value) { data[key] = value; this.emit('changed', key); return true; }};
const st = {...signals(), high_contrast: false, colorScheme: 0,
    notify(name) { this.emit(`notify::${name}`); }};
const file = path => ({get_path: () => path, get_uri: () => `file://${path}`, get_child: name => file(`${path}/${name}`),
    get_parent: () => file(path.slice(0, path.lastIndexOf('/'))), equal: other => path === other?.get_path(),
    query_exists: () => path === '/bms/schemas' ? bmsAvailable : writes.has(path)});
const power = {...signals(), power_saver_enabled: false};
const exports = [], refreshers = [], cleanupHelpers = [], lockedKeys = new Set();
let failGtkWrite = false;
let bmsAvailable = false, bmsSupported = true, idleId = 0;
const idle = new Map(), overviewCalls = [], errors = [];
let restores = 0;
let accent = {red: 53, green: 132, blue: 228};
const settle = () => new Promise(resolve => setImmediate(resolve));
let holdReads = false, pendingReads = [];
function flush() { for (const [id, callback] of [...idle]) { idle.delete(id); callback(); } }
let theme = file('/previous-theme.css');
let reloads = 0;
let shadowStarts = 0, shadowStops = 0;
const writes = new Map();
let writeCount = 0, shellBuilds = 0;
let failShellWrite = false;
const imports = [];
let gtkImport = '';
const customSheets = new Set(['/blur-my-shell.css']);
const shellTheme = {
    load_stylesheet: target => customSheets.add(target.get_path()),
    unload_stylesheet: target => customSheets.delete(target.get_path()),
};
const panel = {...signals(), get_size: () => [1920, 32], add_child(child) { this.edge = child; }};
const main = {panel, sessionMode: {...signals(), colorScheme: 'prefer-dark', currentMode: 'user', parentMode: null, isLocked: false}, extensionManager: {lookup(uuid) { return uuid === 'blur-my-shell@aunetx' && bmsAvailable ? {dir: file('/bms')} : undefined; }},
    notifyError: (_title, message) => errors.push(message),
    layoutManager: {uiGroup: {add_style_class_name() {}, remove_style_class_name() {}}},
    getThemeStylesheet: () => theme, setThemeStylesheet: path => { theme = path ? file(path) : null; },
    loadTheme: () => reloads++, getStyleVariant: () => main.sessionMode.colorScheme === 'force-dark' ? 'dark' : main.sessionMode.colorScheme === 'prefer-light'
        ? st.colorScheme === 1 ? 'dark' : 'light' : st.colorScheme === 2 ? 'light' : 'dark'};
class Extension {
    constructor() { this.path = '/source'; this.dir = file(this.path); }
    getSettings() {
        let pending = null;
        const instance = {...settings,
            delay() { pending = {}; }, is_writable: key => !lockedKeys.has(key),
            get_boolean: key => pending && key in pending ? pending[key] : data[key],
            get_string: key => pending && key in pending ? pending[key] : data[key],
            get_enum: key => pending && key in pending ? pending[key] : data[key],
            apply() { const changed = Object.keys(pending).filter(key => pending[key] !== data[key]); Object.assign(data, pending); pending = {}; for (const key of changed) settings.emit('changed', key); },
            revert() { pending = {}; }};
        for (const setter of ['set_boolean', 'set_string', 'set_enum']) instance[setter] = (key, value) => {
            if (lockedKeys.has(key)) return false;
            if (pending) pending[key] = value;
            else { data[key] = value; settings.emit('changed', key); }
            return true;
        };
        return instance;
    }
}
const modules = {
    'gi://Gio': {default: {File: {new_for_path: file, new_for_uri: file}, PowerProfileMonitor: {dup_default: () => power}, SubprocessFlags: {NONE: 0}, Subprocess: {new(argv) { cleanupHelpers.push(argv); }}, DBus: {session: {}}, DBusExportedObject: {wrapJSObject(_xml, handlers) { const exported = {handlers, export() { this.exported = true; }, unexport() { this.exported = false; }}; exports.push(exported); return exported; }}, Cancellable: class { cancel() { this.cancelled = true; } is_cancelled() { return Boolean(this.cancelled); } }, Settings: class {}, SettingsSchemaSource: {get_default() {}, new_from_directory() { return {lookup: () => ({has_key: () => bmsSupported, list_children: () => ['overview']})}; }}}},
    'gi://GLib': {default: {build_filenamev: parts => parts.join('/'), get_user_config_dir: () => '/config', get_user_cache_dir: () => '/cache',
        idle_add: (_priority, callback) => { idle.set(++idleId, callback); return idleId; }, Source: {remove: id => idle.delete(id)}, SOURCE_REMOVE: false}},
    'gi://Clutter': {default: {ActorBox: class { constructor(box) { Object.assign(this, box); } }}},
    'gi://St': {default: {Widget: class { constructor(options) { Object.assign(this, {visible: true}, options); } allocate(box) { this.box = box; } destroy() { this.destroyed = true; } }, Settings: {get: () => st}, ThemeContext: {get_for_stage: () => ({get_theme: () => shellTheme, get_accent_color: () => [accent]})}}},
    'resource:///org/gnome/shell/extensions/extension.js': {Extension},
    'resource:///org/gnome/shell/ui/main.js': main,
    './gtk-import.js': {setGtkImport: (_file, style, enabled) => {
        imports.push(enabled);
        gtkImport = enabled ? `@import url("${style.get_uri()}"); /* iridescence */\n` : '';
    }},
    './files.js': {readText: async (target, cancellable) => {
            if (holdReads) await new Promise(resolve => pendingReads.push(resolve));
            if (cancellable?.is_cancelled()) throw new Error('Cancelled');
            return {text: target.get_path() === '/config/gtk-4.0/gtk.css' ? gtkImport :
                target.get_path() === '/config/iridescence/gtk.css' ? writes.get(target.get_path()) ?? '' :
                target.get_path().startsWith('resource:') ? nativeCss[target.get_path().includes('-light.css') ? 'light' : 'dark'] : readFileSync(new URL(`../themes/${target.get_path().split('/').pop()}`, import.meta.url), 'utf8')};
        },
        writeText: (target, text) => {
            if (failGtkWrite && target.get_path() === '/config/iridescence/gtk.css') throw new Error('GTK write failed');
            if (failShellWrite && target.get_path().includes('/shell.css')) throw new Error('write failed');
            writeCount++;
            writes.set(target.get_path(), text);
        }},
    './styles.js': {makeGtkStyles, TINTS, makeShellStyles: (...args) => { shellBuilds++; return makeShellStyles(...args); }},
    './blur-my-shell.js': {DesktopIntegration: class {
        sync(dark, value, transparent = data.transparency) { overviewCalls.push({dark, accent: value, tint: data.tint, transparent}); }
        restore() { restores++; }
    }},
    './gtk-refresh.js': {GtkRefresh: class { constructor() { this.runs = 0; refreshers.push(this); } get highContrast() { return st.high_contrast; } run() { this.runs++; return Promise.resolve(); } destroy() { this.destroyed = true; } }},
    './shell-shadows.js': {ShellShadows: class {
        constructor() { shadowStarts++; }
        destroy() { shadowStops++; }
    }},
};
globalThis.global = {stage: {}};
const module = new SourceTextModule(readFileSync(new URL('../extension.js', import.meta.url), 'utf8'));
await module.link(specifier => {
    const exports = modules[specifier];
    assert.ok(exports, specifier);
    return new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
});
await module.evaluate();
const extension = new module.namespace.default();
const shellPath = '/cache/iridescence/shell.css';
const compatibilityPath = '/cache/iridescence/bms-colors.css';
function change(key, value) { data[key] = value; settings.emit('changed', key); }
const shellCss = () => writes.get(shellPath);
const metadata = JSON.parse(readFileSync(new URL('../metadata.json', import.meta.url), 'utf8'));
assert.deepEqual(metadata['session-modes'], ['user', 'unlock-dialog'], 'lock-screen styling declares both supported modes');
extension.enable();
await settle();
const initialReloads = reloads;
for (let count = 0; count < 100; count++) st.notify('high-contrast');
st.notify('color-scheme');
assert.equal(reloads, initialReloads, 'unchanged appearance notifications do not reload the full Shell theme');
const existingShellCss = writes.get(shellPath);
writes.delete(shellPath);
st.notify('color-scheme');
assert.equal(reloads, initialReloads + 1, 'a missing generated stylesheet is rebuilt and loaded');
assert.equal(writes.get(shellPath), existingShellCss);
theme = file('/external-theme.css');
st.notify('color-scheme');
assert.equal(reloads, initialReloads + 2, 'an externally replaced theme is reapplied');
assert.equal(theme.get_path(), shellPath);
main.sessionMode.emit('updated');
assert.equal(reloads, initialReloads + 3, 'session transitions reload even when the stylesheet path is unchanged');
assert.equal(panel.edge.box.y2 - panel.edge.box.y1, 1, 'separator is allocated exactly one pixel high');
assert.equal(panel.edge.box.x2, 1920, 'separator spans panel width');
assert.equal(panel.edge.reactive, false, 'separator does not intercept clicks');
panel.get_size = () => [2560, 36];
panel.emit('notify::allocation');
assert.deepEqual([panel.edge.box.x1, panel.edge.box.y1, panel.edge.box.x2, panel.edge.box.y2], [0, 35, 2560, 36], 'separator follows panel allocation');
assert.equal(theme?.get_path(), shellPath, 'use the native theme slot');
assert.deepEqual([...customSheets], ['/blur-my-shell.css'], 'enabling does not add a second extension stylesheet');
assert.ok(!writes.has(compatibilityPath), 'do not generate a replicated compatibility stylesheet');
assert.equal(main.sessionMode.colorScheme, 'prefer-light');
assert.ok(shellCss().includes('st-transparentize('));
const gtkBeforeLightSwitch = writes.get('/config/iridescence/gtk.css');
change('shell-light-mode', false);
assert.equal(main.sessionMode.colorScheme, 'force-dark');
assert.ok(shellCss().includes('#424247'), 'light-mode switch off keeps the Shell dark');
st.colorScheme = 2;
st.notify('color-scheme');
assert.ok(shellCss().includes('#424247'), 'explicit Prefer light also uses dark Shell when switch is off');
st.high_contrast = true;
st.notify('high-contrast');
assert.equal(main.sessionMode.colorScheme, 'prefer-dark', 'high contrast restores the original policy from forced-dark mode');
st.high_contrast = false;
st.notify('high-contrast');
assert.equal(main.sessionMode.colorScheme, 'force-dark');
st.colorScheme = 1;
change('shell-light-mode', true);
assert.ok(shellCss().includes('#424247'), 'enabling light Shell does not force light over system dark mode');
st.colorScheme = 0;
st.notify('color-scheme');
assert.equal(writes.get('/config/iridescence/gtk.css'), gtkBeforeLightSwitch, 'Shell appearance switch does not change application styling');
const gtk = writes.get('/config/iridescence/gtk.css');
change('tint', 'rich');
assert.equal(writes.get('/config/iridescence/gtk.css'), gtk, 'Shared Apply writes GTK in preferences before notifying Shell');
assert.ok(shellCss().includes('box-shadow: inset 0 0 0 1px'), 'Contrast is always active');
change('transparency', false);
assert.match(shellCss(), /#panel \.iridescence-panel-edge \{ background-color: st-mix\(-st-accent-color,/, 'One shared switch makes Shell surfaces solid');
assert.ok(shellCss().includes('box-shadow: inset 0 0 0 1px'), 'Solid retains contrast');
change('transparency', true);
assert.ok(shellCss().includes('st-transparentize('));
st.colorScheme = 1;
st.notify('color-scheme');
assert.ok(shellCss().includes('#424247'), 'appearance changes select the dark palette');
st.high_contrast = true;
st.notify('high-contrast');
assert.equal(theme.get_path(), '/previous-theme.css', 'high contrast bypasses Iridescence');
assert.deepEqual([...customSheets], ['/blur-my-shell.css'], 'high contrast preserves other extensions');
assert.equal(main.sessionMode.colorScheme, 'prefer-dark');
st.high_contrast = false;
st.notify('high-contrast');
assert.equal(theme.get_path(), shellPath);
failShellWrite = true;
assert.throws(() => change('tint', 'subtle'), /write failed/);
assert.equal(theme.get_path(), '/previous-theme.css', 'failed updates restore the previous theme');
assert.deepEqual([...customSheets], ['/blur-my-shell.css'], 'failed updates preserve other extensions');
assert.equal(main.sessionMode.colorScheme, 'prefer-dark');
failShellWrite = false;
change('tint', 'balanced');
assert.equal(theme.get_path(), shellPath, 'a subsequent successful update can recover');
main.setThemeStylesheet('/later-theme.css');
extension.disable();
await settle();
assert.equal(theme.get_path(), '/later-theme.css', 'disable preserves a theme changed elsewhere');
assert.deepEqual([...customSheets], ['/blur-my-shell.css'], 'disable preserves other extensions');
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0, 'disconnect every signal');
assert.ok(panel.edge.destroyed, 'disable removes the separator');
assert.deepEqual(imports, [true, false]);
const count = reloads;
settings.emit('changed', 'tint');
st.notify('color-scheme');
assert.equal(reloads, count, 'disabled extension does not apply themes');

data.transparency = true;
const later = new module.namespace.default();
later.enable();
await settle();
assert.equal(data.transparency, true, 'Keep the shared appearance preset');
later.disable();
await settle();
assert.equal(gtkImport, '', 'disable removes an import added later through the GTK Apply button');
assert.deepEqual(imports, [true, false, true, false]);
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0);
assert.equal(shadowStarts, shadowStops, 'Every enabled shadow manager is cleaned up on disable or failed startup');

main.sessionMode.isLocked = false;
st.colorScheme = 0;
data['bms-desktop-enabled'] = true;
const integrated = new module.namespace.default();
integrated.enable();
await settle();
assert.equal(idle.size, 1, 'integration startup uses one deferred sync');
flush();
assert.equal(errors.length, 1, 'missing Blur My Shell is reported without breaking Iridescence');
assert.equal(theme.get_path(), shellPath);
st.notify('accent-color'); flush();
assert.equal(errors.length, 1, 'repeat failure is not reported on every accent change');
bmsAvailable = true;
bmsSupported = false;
st.notify('accent-color'); flush();
assert.equal(errors.length, 2, 'an incompatible schema fails gracefully');
bmsSupported = true;
st.notify('accent-color'); flush();
assert.equal(overviewCalls.at(-1).dark, false, 'light colors follow actual light Shell');
const beforeUpdate = overviewCalls.length;
accent = {red: 250, green: 40, blue: 90};
st.notify('accent-color');
st.colorScheme = 1; st.notify('color-scheme');
change('transparency', false);
change('tint', 'rich');
assert.equal(idle.size, 2, 'appearance coalesces into one GTK job and one Overview job');
flush();
assert.equal(overviewCalls.length, beforeUpdate + 1);
assert.deepEqual(overviewCalls.at(-1), {dark: true, accent, tint: 'rich', transparent: false}, 'use only the latest state');
st.colorScheme = 0; st.notify('color-scheme');
change('shell-light-mode', false); flush();
assert.equal(overviewCalls.at(-1).dark, true, 'Light Shell option off always uses dark effects');
change('shell-light-mode', true); flush();
assert.equal(overviewCalls.at(-1).dark, false);
change('bms-desktop-enabled', false); flush();
assert.equal(restores, 1, 'turning integration off restores its selection');
assert.equal(data.transparency, false, 'Turning integration off preserves the shared transparency choice');
change('bms-desktop-enabled', true); flush();
st.notify('accent-color');
assert.equal(idle.size, 1);
integrated.disable();
await settle();
assert.equal(idle.size, 0, 'disable removes pending update source');
assert.equal(restores, 2, 'extension disable also restores selection');
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0, 'integration signals are disconnected');
// Styling remains active while locked; GNOME may still call disable at any time.
data['gtk-opacity'] = 65;
const locked = new module.namespace.default();
locked.enable(); await settle();
assert.equal(writes.get('/config/iridescence/gtk.css'), makeGtkStyles(data.tint, data.transparency ? 'translucent' : 'solid',
    readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8'), 65), 'enable respects saved Airy opacity');
const opacityWork = [shellBuilds, overviewCalls.length, idle.size];
change('gtk-opacity', 90);
assert.equal(shellBuilds, opacityWork[0] + 1, 'Changing to Dense rebuilds the Shell stylesheet');
assert.equal(overviewCalls.length, opacityWork[1], 'Shared opacity does not change Blur My Shell settings');
assert.equal(idle.size, opacityWork[2] + 1, 'Shared opacity queues one GTK update');
const lockedGtk = gtkImport;
for (const dark of [false, true]) {
    st.colorScheme = dark ? 1 : 0;
    st.notify('color-scheme');
    main.sessionMode.isLocked = true;
    main.sessionMode.currentMode = 'unlock-dialog';
    main.sessionMode.colorScheme = 'force-dark';
    main.sessionMode.emit('updated');
    assert.equal(theme.get_path(), shellPath, 'lock screen keeps the Iridescence theme');
    assert.equal(panel.edge.visible, false, 'desktop panel separator is hidden on lock screen');
    assert.equal(gtkImport, lockedGtk, 'lock transition does not rewrite the GTK import');
    assert.equal(main.sessionMode.colorScheme, 'prefer-light', 'lock screen honors the shared Shell appearance policy');
    assert.equal(shellCss(), makeShellStyles(readFileSync(new URL(`../themes/shell-${dark ? 'dark' : 'light'}.css`, import.meta.url), 'utf8'), dark,
        {tint: data.tint, transparency: data.transparency ? 'translucent' : 'solid', opacity: data['gtk-opacity']}, nativeCss[dark ? 'dark' : 'light']));
    main.sessionMode.isLocked = false;
    main.sessionMode.currentMode = 'user';
    main.sessionMode.colorScheme = 'prefer-dark';
    main.sessionMode.emit('updated');
    assert.equal(theme.get_path(), shellPath, 'unlock keeps the selected theme');
    assert.equal(panel.edge.visible, true);
}
main.sessionMode.isLocked = true;
main.sessionMode.emit('updated');
locked.disable(); await settle();
assert.equal(gtkImport, '', 'explicit disable while locked removes the GTK import');
assert.equal(locked._settings, null);
assert.equal(locked._sources, null);
assert.equal(locked._cancellable, null);
assert.equal(locked._previousTheme, null);
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0, 'explicit lock-screen disable disconnects every signal');
// Starting directly in unlock-dialog must also apply the lock-screen theme.
locked.enable(); await settle();
assert.equal(theme.get_path(), shellPath);
assert.equal(panel.edge.visible, false);
locked.disable(); await settle();
main.sessionMode.isLocked = false;
main.sessionMode.currentMode = 'user';
// GNOME can also disable and re-enable across a session transition.

data['bms-desktop-enabled'] = false;
const cycled = new module.namespace.default();
cycled.enable(); await settle();
cycled.disable(); await settle();
assert.equal(gtkImport, '', 'lock-time disable removes the GTK import');
assert.equal(cycled._settings, null);
assert.equal(cycled._sources, null);
assert.equal(cycled._cancellable, null);
assert.equal(cycled._previousTheme, null);
cycled.enable(); await settle();
assert.equal(theme.get_path(), shellPath, 'unlock enable reloads current appearance');
cycled.disable(); await settle();
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0);
// Cancel in-flight reads, then prove old completions cannot resurrect styling.
const raced = new module.namespace.default();
holdReads = true;
const beforeRead = writeCount;
raced.enable();
raced.disable();
holdReads = false;
for (const resolve of pendingReads.splice(0)) resolve();
await settle();
assert.equal(writeCount, beforeRead + 1, 'disable only neutralizes the old owned payload; cancelled startup writes no theme');
assert.match(writes.get('/config/iridescence/gtk.css'), /disabled/);
assert.equal(gtkImport, '');
assert.equal(raced._settings, null);
assert.equal(raced._sources, null);
assert.equal(raced._cancellable, null);
// A pending disable read must not remove a new enable's import.
raced.enable(); await settle();
holdReads = true;
raced.disable();
holdReads = false;
raced.enable(); await settle();
for (const resolve of pendingReads.splice(0)) resolve();
await settle();
assert.ok(gtkImport, 'old asynchronous cleanup preserves the newly enabled import');
assert.equal(theme.get_path(), shellPath);
raced.disable(); await settle();
assert.equal(gtkImport, '');
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0);
// Repeated disable must not cancel the first pending file cleanup.
raced.enable(); await settle();
holdReads = true;
raced.disable();
raced.disable();
holdReads = false;
for (const resolve of pendingReads.splice(0)) resolve();
await settle();
assert.equal(gtkImport, '', 'repeated disable still completes GTK cleanup');
// Cleanup is complete even when no Shell theme was ever applied (e.g. High Contrast).
st.high_contrast = true;
const inactive = new module.namespace.default();
inactive.enable(); await settle();
inactive.disable(); await settle();
assert.equal(inactive._settings, null);
assert.equal(inactive._previousTheme, null);
assert.equal(inactive._sources, null);
assert.equal(inactive._cancellable, null);
assert.equal(st.size() + settings.size() + panel.size() + main.sessionMode.size(), 0);
assert.equal(shadowStarts, shadowStops, 'Shadow managers are removed after repeated disable, cancellation and high-contrast startup');
// Exercise the new automatic paths and the single-writer Apply contract.
st.high_contrast = false;
Object.assign(data, {tint: 'balanced', transparency: true, 'shell-light-mode': true, 'gtk-opacity': 90, 'bms-desktop-enabled': false});
power.power_saver_enabled = true;
const automatic = new module.namespace.default();
automatic.enable(); await settle();
const gtkSource = readFileSync(new URL('../themes/gtk.css', import.meta.url), 'utf8');
const expectGtk = () => makeGtkStyles(data.tint, data.transparency && !power.power_saver_enabled ? 'translucent' : 'solid', gtkSource, data['gtk-opacity']);
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Power Saver startup applies solid GTK directly');
assert.match(shellCss(), /#panel \.iridescence-panel-edge \{ background-color: st-mix\(-st-accent-color,/, 'Power Saver startup applies solid Shell directly');
assert.equal(refreshers.at(-1).runs, 1, 'Enable automatically refreshes GTK once');
assert.ok(exports.at(-1).exported, 'Appearance command is exported only while enabled');
async function drain() { for (let i = 0; i < 4; i++) { flush(); await settle(); } }
power.power_saver_enabled = false; power.emit('notify::power-saver-enabled');
await drain();
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Leaving Power Saver restores Dense GTK');
assert.ok(shellCss().includes('st-transparentize('), 'Leaving Power Saver restores translucent Shell');
holdReads = true;
power.power_saver_enabled = true; power.emit('notify::power-saver-enabled'); flush();
power.power_saver_enabled = false; power.emit('notify::power-saver-enabled');
holdReads = false;
for (const resolve of pendingReads.splice(0)) resolve();
await drain();
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Held automatic reads use the latest power state');
const unchangedSettings = JSON.stringify(data), unchangedWrites = writeCount;
for (const values of [['__proto__', true, true, 90], ['constructor', true, true, 90], ['balanced', true, true, 85], ['balanced', 'true', true, 90]])
    await assert.rejects(automatic._applyAppearance(values), /Invalid/);
assert.equal(writeCount, unchangedWrites, 'Invalid requests write no files');
assert.equal(JSON.stringify(data), unchangedSettings, 'Invalid requests commit no settings');
lockedKeys.add('tint');
await assert.rejects(automatic._applyAppearance(['rich', true, true, 65]), /locked/);
lockedKeys.clear();
assert.equal(writeCount, unchangedWrites, 'Locked settings are detected before writing');
failGtkWrite = true;
await assert.rejects(automatic._applyAppearance(['rich', true, true, 65]), /GTK write failed/);
failGtkWrite = false;
assert.equal(JSON.stringify(data), unchangedSettings, 'Failed CSS writes cannot commit settings');
await drain();
power.power_saver_enabled = true; power.emit('notify::power-saver-enabled');
await drain();
gtkImport = '';
let committedChecks = 0;
const commitCheck = settings.connect('changed', (_settings, key) => {
    if (!['tint', 'transparency', 'shell-light-mode', 'gtk-opacity'].includes(key)) return;
    committedChecks++;
    assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'CSS is correct before committed settings notify observers');
});
await automatic._applyAppearance(['rich', true, true, 65]);
settings.disconnect(commitCheck);
assert.ok(committedChecks > 0 && gtkImport, 'Apply commits only after writing GTK and repairing its import');
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Apply during Power Saver remains opaque');
assert.ok(data.transparency && data['gtk-opacity'] === 65, 'Saved Airy choice survives the temporary override');
await drain();
let releasePulse;
const originalRun = automatic._gtkRefresh.run.bind(automatic._gtkRefresh);
let firstPulse = true;
automatic._gtkRefresh.run = () => firstPulse ? (firstPulse = false, new Promise(resolve => { releasePulse = resolve; })) : originalRun();
const changing = automatic._applyAppearance(['balanced', true, true, 90]);
await settle();
power.power_saver_enabled = false; power.emit('notify::power-saver-enabled');
releasePulse();
await changing;
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Power changes during Apply are reconciled before success');
automatic._gtkRefresh.run = originalRun;
await drain();
const invocation = () => ({results: [], return_value(value) { this.results.push(['success', value]); }, return_dbus_error(name, message) { this.results.push([name, message]); }});
const first = invocation(), concurrent = invocation();
const handler = exports.at(-1).handlers.ApplyAppearanceAsync;
holdReads = true;
handler(['rich', true, true, 65], first);
handler(['subtle', true, true, 90], concurrent);
assert.match(concurrent.results[0][0], /Busy$/, 'Concurrent explicit Apply requests are rejected');
automatic.disable();
assert.match(first.results[0][0], /Disabled$/, 'Disable explicitly rejects a pending D-Bus invocation');
assert.match(writes.get('/config/iridescence/gtk.css'), /disabled/, 'Disable neutralizes the owned payload synchronously');
holdReads = false;
automatic.enable(); await settle();
for (const resolve of pendingReads.splice(0)) resolve();
await drain();
assert.equal(first.results.length, 1, 'Old Apply completion never replies twice');
assert.equal(writes.get('/config/iridescence/gtk.css'), expectGtk(), 'Old Apply and cleanup cannot overwrite a new enable');
automatic.disable(); await settle();
assert.ok(cleanupHelpers.length && cleanupHelpers.every(argv => argv.join(' ') === 'gjs -m /source/gtk-refresh-helper.js'), 'Disable launches only the fixed bounded GTK cleanup helper');
assert.ok(exports.every(item => !item.exported), 'Disable unexports every old appearance command');
assert.equal(power.size() + st.size() + settings.size() + panel.size() + main.sessionMode.size() + idle.size, 0, 'Power monitor, queued jobs and lifecycle signals are completely removed');
console.log('Automatic enable/disable, Power Saver, typed single-writer Apply, cancellation, lock-screen lifecycle and restoration passed');
