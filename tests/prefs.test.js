import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';
import {makeGtkStyles} from '../styles.js';
import {GtkRefresh} from '../gtk-refresh.js';
import {setGtkImport} from '../gtk-import.js';
if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory' || !GLib.getenv('XDG_CONFIG_HOME')?.startsWith('/tmp/'))
    throw new Error('Use memory settings and a temporary XDG_CONFIG_HOME to protect desktop preferences.');
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'));
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const {default: Preferences} = await import(root.get_child('prefs.js').get_uri());
const metadata = JSON.parse(new TextDecoder().decode(root.get_child('metadata.json').load_contents(null)[1]));
const prefs = new Preferences({...metadata, path: root.get_path(), dir: root});
let active = false;
prefs._isExtensionActive = () => active;
prefs._hasBlurMyShell = () => true;
const settings = prefs.getSettings();
function assert(value, message) { if (!value) throw new Error(message); }
async function settle() {
    await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 350, () => {
        resolve(); return GLib.SOURCE_REMOVE;
    }));
}
assert(settings.get_string('tint') === 'balanced' && settings.get_boolean('transparency'), 'Balanced and translucent defaults');
assert(settings.settings_schema.list_keys().sort().join(',') === 'bms-desktop-enabled,bms-desktop-state,gtk-opacity,shell-light-mode,tint,transparency', 'Only shared appearance and BMS settings remain');
const config = Gio.File.new_for_path(GLib.get_user_config_dir());
const userFile = config.get_child('gtk-4.0').get_child('gtk.css');
const styleFile = config.get_child('iridescence').get_child('gtk.css');
const source = readText(root.get_child('themes').get_child('gtk.css')).text;
const userCss = '@import "user-theme.css";\n/* user colors */\n';
writeText(userFile, userCss);
writeText(userFile.get_parent().get_child('user-theme.css'), '/* user theme */');
writeText(styleFile, '/* stale application stylesheet */');
Adw.init();
const window = new Adw.PreferencesWindow();
prefs.fillPreferencesWindow(window);
const rows = new Map(), groups = new Map(), pages = [], combos = [], switches = [];
function walk(widget) {
    if (widget instanceof Adw.PreferencesPage && widget.title) pages.push(widget.title);
    if (widget instanceof Adw.PreferencesGroup) groups.set(widget.title, widget);
    if (widget instanceof Adw.ActionRow) rows.set(widget.title, widget);
    if (widget instanceof Adw.ComboRow) combos.push(widget);
    if (widget instanceof Adw.SwitchRow) switches.push(widget);
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) walk(child);
}
walk(window);
assert(pages.join(',') === 'Appearance,Extras', 'Two compact pages');
assert(combos.length === 2 && rows.has('Transparency level'), 'Shared tint and one desktop transparency selector');
const opacity = rows.get('Transparency level');
assert(opacity.model.get_n_items() === 3 && ['Airy', 'Dense', 'Opaque'].every((label, i) => opacity.model.get_string(i) === label), 'Exactly the three agreed names, without percentages');
assert(opacity.selected === 1 && opacity.sensitive && settings.get_enum('gtk-opacity') === 90, 'Dense is the default');
assert(switches.map(row => row.title).sort().join(',') === 'Light Shell in light mode', 'Only the light Shell appearance switch remains');
assert(!groups.has('GNOME Shell') && !groups.has('GTK4 applications') && !rows.has('Overview appearance'), 'No duplicate sections or Overview density control');
const tint = rows.get('Tint strength'), light = rows.get('Light Shell in light mode');
assert(!rows.has('Transparency') && !rows.has('GTK4 transparency'), 'No duplicate transparency controls');
const blur = rows.get('Blur My Shell integration').activatable_widget;
assert(blur instanceof Gtk.Switch && blur.sensitive && !blur.active && groups.has('Flatpak integration'), 'Installed dependency allows activation');
const links = [];
function collectLinks(widget) {
    if (widget instanceof Gtk.Label && widget.use_markup && widget.label.includes('https://extensions.gnome.org/extension/3193/blur-my-shell/')) links.push(widget);
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) collectLinks(child);
}
collectLinks(window);
assert(links.length === 1, 'Persistent dependency link targets the extension page');
prefs._hasBlurMyShell = () => false;
const missingWindow = new Adw.PreferencesWindow();
prefs.fillPreferencesWindow(missingWindow);
function missingSwitch(widget) {
    if (widget instanceof Adw.ActionRow && widget.title === 'Blur My Shell integration') return widget.activatable_widget;
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) {
        const result = missingSwitch(child);
        if (result) return result;
    }
}
assert(!missingSwitch(missingWindow).sensitive, 'Missing dependency blocks activation');
missingWindow.emit('close-request');
missingWindow.destroy();
prefs._hasBlurMyShell = () => true;
const applyRow = rows.get('Apply appearance'), apply = applyRow.activatable_widget;
assert(readText(styleFile).text === '/* stale application stylesheet */', 'Opening preferences changes no CSS');
let refreshes = 0;
const a11y = new Gio.Settings({schema_id: 'org.gnome.desktop.a11y.interface'});
a11y.set_boolean('high-contrast', true);
const pulses = [];
const observed = [];
a11y.connect('changed::high-contrast', () => pulses.push(a11y.get_boolean('high-contrast')));
a11y.connect('changed::high-contrast', () => GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    observed.push(a11y.get_boolean('high-contrast'));
    return GLib.SOURCE_REMOVE;
}));
const refresher = new GtkRefresh();
const refresh = () => refresher.run();
prefs._applyAppearance = async pending => {
    const transaction = prefs.getSettings();
    transaction.delay();
    for (const [key, method] of [['tint', 'string'], ['transparency', 'boolean'], ['shell-light-mode', 'boolean'], ['gtk-opacity', 'enum']])
        transaction[`set_${method}`](key, pending[`get_${method}`](key));
    writeText(styleFile, makeGtkStyles(pending.get_string('tint'), pending.get_boolean('transparency') ? 'translucent' : 'solid', source, pending.get_enum('gtk-opacity')), readText(styleFile).etag);
    setGtkImport(userFile, styleFile, true, readText(userFile));
    transaction.apply();
    refreshes++;
    await refresh();
};
apply.emit('clicked');
assert(refreshes === 0 && readText(userFile).text === userCss && readText(styleFile).text === '/* stale application stylesheet */', 'Disabled Apply saves without writing or refreshing theme files');
assert(applyRow.subtitle.includes('Enable Iridescence') && apply.sensitive, 'Disabled feedback allows retry');
const initialCss = readText(styleFile).text;
tint.selected = 2;
opacity.selected = 0;
assert(settings.get_enum('gtk-opacity') === 90, 'Airy changes wait for Apply');
opacity.selected = 2;
assert(opacity.sensitive && opacity.selected === 2, 'Opaque is selected through the same control');
light.active = false;
assert(settings.get_string('tint') === 'balanced' && settings.get_boolean('transparency') && settings.get_boolean('shell-light-mode'), 'All three appearance changes wait for shared Apply');
assert(readText(styleFile).text === initialCss && refreshes === 0, 'Pending changes do not regenerate or refresh GTK');
window.present();
await settle();
blur.active = !blur.active;
await settle();
assert(!settings.get_boolean('bms-desktop-enabled'), 'Activation waits for confirmation');
let confirmation = window.get_visible_dialog();
assert(confirmation instanceof Adw.AlertDialog && confirmation.body.includes('pipeline assignments'), 'Native warning explains replacement');
confirmation.close();
assert(!settings.get_boolean('bms-desktop-enabled'), 'Cancel does not enable integration');
blur.active = !blur.active;
await settle();
confirmation = window.get_visible_dialog();
confirmation.emit('response', 'apply');
confirmation.close();
assert(settings.get_boolean('bms-desktop-enabled') && blur.active && blur.state, 'Confirmed Extras setting synchronizes both switch states');
assert(rows.get('Blur My Shell integration').subtitle === 'Apply Iridescence’s blur preset across the desktop.', 'Activation preserves the inactive description');
blur.active = !blur.active;
await settle();
assert(!settings.get_boolean('bms-desktop-enabled'), 'Disable does not require confirmation');
assert(!blur.active && !blur.state, 'Disabled switch clears both the thumb position and colored backend state');
let commits = 0;
const commitSignal = settings.connect('changed', (_settings, key) => {
    if (!['tint', 'transparency', 'shell-light-mode', 'gtk-opacity'].includes(key)) return;
    commits++;
    assert(readText(styleFile).text === makeGtkStyles(settings.get_string('tint'), settings.get_boolean('transparency') ? 'translucent' : 'solid', source, settings.get_enum('gtk-opacity')), 'GTK is written before committed settings notify Shell');
});
active = true;
const pulseStarted = new Promise(resolve => {
    const id = a11y.connect('changed::high-contrast', () => { a11y.disconnect(id); resolve(); });
});
apply.emit('clicked');
assert(commits > 0 && settings.get_string('tint') === 'rich' && !settings.get_boolean('transparency') && !settings.get_boolean('shell-light-mode'), 'Apply commits shared appearance together');
assert(settings.get_enum('gtk-opacity') === 65, 'Opaque preserves the previous Airy level internally');
await pulseStarted;
assert(!groups.get('Theme').sensitive && pulses.join(',') === 'false' && !apply.sensitive && applyRow.subtitle.includes('Applying'), `Apply holds the pulse: ${JSON.stringify({group: groups.get('Theme').sensitive, pulses, sensitive: apply.sensitive, subtitle: applyRow.subtitle})}`);
apply.emit('clicked');
assert(refreshes === 1, 'Ignore repeated Apply while refreshing');
assert(window.emit('close-request'), 'Keep preferences alive until High Contrast is restored');
await settle();
assert(refreshes === 1 && pulses.join(',') === 'false,true' && a11y.get_boolean('high-contrast'), 'Refresh restores initially enabled High Contrast');
assert(observed.join(',') === 'false,true', 'The main loop observes both High Contrast values');
assert(!apply.sensitive && applyRow.subtitle.includes('Applied'), 'Successful shared Apply feedback');
a11y.set_boolean('high-contrast', false);
await settle();
pulses.length = 0;
observed.length = 0;
opacity.selected = 0;
assert(opacity.sensitive && opacity.selected === 0, 'Airy reenables transparency through the same control');
opacity.selected = 1;
tint.selected = 1;
light.active = true;
apply.emit('clicked');
await settle();
assert(refreshes === 2 && pulses.join(',') === 'true,false' && !a11y.get_boolean('high-contrast'), 'Refresh restores initially disabled High Contrast');
assert(observed.join(',') === 'true,false', 'Initially disabled pulse is observable');
assert(readText(styleFile).text === makeGtkStyles('balanced', 'translucent', source, 90), 'Returning to shared defaults restores their exact CSS');
const setBoolean = Gio.Settings.prototype.set_boolean;
let interrupted = false;
try {
    Gio.Settings.prototype.set_boolean = function (key, value) {
        const result = setBoolean.call(this, key, value);
        if (key === 'high-contrast' && !interrupted) { interrupted = true; throw new Error('interrupted pulse'); }
        return result;
    };
    let failure;
    refresh().catch(error => { failure = error; });
    await settle();
    assert(failure?.message === 'interrupted pulse', 'Refresh errors propagate');
    assert(!a11y.get_boolean('high-contrast'), 'Restore the original setting after an interrupted pulse');
} finally { Gio.Settings.prototype.set_boolean = setBoolean; }
tint.selected = 0;
const replaceContents = Gio.File.prototype.replace_contents;
const beforeFailure = refreshes;
try {
    Gio.File.prototype.replace_contents = function (...args) {
        if (this.equal(styleFile)) throw Error('Simulated write failure');
        return replaceContents.apply(this, args);
    };
    apply.emit('clicked');
    assert(settings.get_string('tint') === 'balanced' && refreshes === beforeFailure, 'Failed CSS writes cannot commit Shell changes or refresh GTK');
    await settle();
    assert(apply.sensitive && applyRow.subtitle === 'Apply failed. Try again.', 'Failed Apply remains retryable without stale busy feedback');
} finally { Gio.File.prototype.replace_contents = replaceContents; }
window.emit('close-request');
assert(settings.get_string('tint') === 'balanced', 'Closing discards uncommitted appearance');
window.destroy();
settings.disconnect(commitSignal);
for (const [transparent, value, expected] of [[true, 65, 0], [true, 90, 1], [false, 65, 2], [false, 90, 2]]) {
    settings.set_boolean('transparency', transparent);
    settings.set_enum('gtk-opacity', value);
    const reopened = new Adw.PreferencesWindow();
    prefs.fillPreferencesWindow(reopened);
    walk(reopened);
    assert(rows.get('Transparency level').selected === expected, 'Saved Airy/Dense/Opaque choices reopen correctly');
    reopened.emit('close-request');
    reopened.destroy();
}
print('Native preferences: three controls, delayed shared Apply, independent Extras, mandatory styling, safe imports and High Contrast restoration passed');
