import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {DesktopIntegration, PIPELINE_ID, DESKTOP_PIPELINE_ID} from '../blur-my-shell.js';
if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory') throw Error('Memory settings required');
function assert(value, message) { if (!value) throw Error(message); }
const directory = GLib.dir_make_tmp('iridescence-bms-test-XXXXXX');
const file = Gio.File.new_for_path(`${directory}/test.gschema.xml`);
const children = {
    overview: [['pipeline', 's', "'pipeline_default'"], ['blur', 'b', 'false'], ['style-components', 'i', '1']],
    applications: [['pipeline', 's', "'pipeline_default'"], ['blur', 'b', 'false'], ['opacity', 'i', '150'], ['blacklist', 'as', '[]']],
    panel: [['pipeline', 's', "'pipeline_default'"], ['blur', 'b', 'false'], ['override-background', 'b', 'true']],
    lockscreen: [['blur', 'b', 'true']],
};
const id = 'org.gnome.shell.extensions.bmstest';
file.replace_contents(`<schemalist><schema id="${id}" path="/bmstest/">
<key name="pipelines" type="a{sa{sv}}"><default>{'pipeline_default': {'name': &lt;'Default'&gt;, 'effects': &lt;@av []&gt;}}</default></key>
${Object.keys(children).map(child => `<child name="${child}" schema="${id}.${child}"/>`).join('')}
</schema>${Object.entries(children).map(([child, keys]) => `<schema id="${id}.${child}" path="/bmstest/${child}/">${keys.map(([name,type,value]) => `<key name="${name}" type="${type}"><default>${value}</default></key>`).join('')}</schema>`).join('')}</schemalist>`, null, false, Gio.FileCreateFlags.NONE, null);
Gio.Subprocess.new(['glib-compile-schemas', '--strict', directory], Gio.SubprocessFlags.NONE).wait_check(null);
const source = Gio.SettingsSchemaSource.new_from_directory(directory, Gio.SettingsSchemaSource.get_default(), false);
const bms = new Gio.Settings({settings_schema: source.lookup(id, false)});
const ownSource = Gio.SettingsSchemaSource.new_from_directory(Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_child('schemas').get_path(), Gio.SettingsSchemaSource.get_default(), false);
const settings = new Gio.Settings({settings_schema: ownSource.lookup('org.gnome.shell.extensions.iridescence', false)});
assert(!settings.get_boolean('bms-desktop-enabled'), 'desktop preset requires fresh opt-in');
const overview = bms.get_child('overview'), apps = bms.get_child('applications'), panel = bms.get_child('panel');
const pipelines = () => bms.get_value('pipelines').deep_unpack();
const save = value => bms.set_value('pipelines', new GLib.Variant('a{sa{sv}}', value));
const descriptors = pipeline => pipelines()[pipeline].effects.deep_unpack().map(item => item.deep_unpack());
const params = item => item.params.deep_unpack();
const color = id => params(descriptors(PIPELINE_ID).find(item => item.id.get_string()[0] === id)).color.deep_unpack();
const blue = {red: 53, green: 132, blue: 228};
const integration = new DesktopIntegration(bms, settings);
integration.sync(false, blue);
assert(overview.get_string('pipeline') === PIPELINE_ID && apps.get_string('pipeline') === DESKTOP_PIPELINE_ID && panel.get_string('pipeline') === DESKTOP_PIPELINE_ID, 'assign two distinct pipelines');
assert(!bms.get_child('lockscreen').get_boolean('blur'), 'native lock-screen blur');
assert(apps.get_int('opacity') === 255 && apps.get_strv('blacklist').join() === 'Plank,Conky', 'applications baseline');
const shellEffects = descriptors(DESKTOP_PIPELINE_ID);
assert(shellEffects.length === 3 && params(shellEffects[0]).unscaled_radius.get_int32() === 100 && params(shellEffects[0]).brightness.get_double() === 1, 'neutral blur defaults');
assert(params(shellEffects[1]).saturation_multiplicator.get_double() === 1.05 && params(shellEffects[2]).noise.get_double() === .1, 'saturation and noise defaults');
const unchanged = bms.get_value('pipelines');
integration.sync(false, blue);
assert(unchanged.equal(bms.get_value('pipelines')), 'idempotent sync');
for (const [tint, factor] of [['subtle', .5], ['balanced', 1], ['rich', 1.5]]) {
    settings.set_string('tint', tint);
    for (const dark of [false, true]) for (const transparent of [true, false]) {
        settings.set_boolean('transparency', transparent);
        integration.sync(dark, blue);
        const base = color('iridescence_base'), accent = color('iridescence_accent'), opacity = transparent ? .7 : 1;
        assert(Math.abs(1-(1-base[3])*(1-accent[3])-opacity) < 1e-12, 'combined opacity');
        assert(Math.abs(accent[3]/opacity-(dark ? .1 : .07)*factor) < 1e-12, 'shared tint intensity');
    }
}
settings.set_boolean('transparency', true);
const descriptorsBeforePower = descriptors(DESKTOP_PIPELINE_ID).map(item => item.type.get_string()[0]);
integration.sync(false, blue, false);
assert(Math.abs(1 - (1-color('iridescence_base')[3])*(1-color('iridescence_accent')[3]) - 1) < 1e-12, 'Power Saver uses a solid Overview without changing the saved transparency');
assert(settings.get_boolean('transparency') && overview.get_string('pipeline') === PIPELINE_ID && apps.get_string('pipeline') === DESKTOP_PIPELINE_ID, 'Power Saver preserves choice and pipeline assignments');
assert(descriptors(DESKTOP_PIPELINE_ID).map(item => item.type.get_string()[0]).join() === descriptorsBeforePower.join(), 'Power Saver preserves desktop pipeline effects');
integration.sync(false, blue, true);
assert(Math.abs(1 - (1-color('iridescence_base')[3])*(1-color('iridescence_accent')[3]) - .7) < 1e-12, 'Leaving Power Saver restores translucent Overview');
apps.set_int('opacity', 200);
overview.set_string('pipeline', 'pipeline_default');
const edited = pipelines();
edited[DESKTOP_PIPELINE_ID].name = new GLib.Variant('s', 'Custom blur');
save(edited);
new DesktopIntegration(bms, settings).sync(false, blue);
assert(apps.get_int('opacity') === 200 && overview.get_string('pipeline') === 'pipeline_default', 'restart and sync preserve manual settings');
assert(pipelines()[DESKTOP_PIPELINE_ID].name.get_string()[0] === 'Custom blur', 'preserve edited pipeline');
new DesktopIntegration(bms, settings).restore();
assert(apps.get_int('opacity') === 200 && overview.get_string('pipeline') === 'pipeline_default', 'restore preserves edits');
assert(panel.get_string('pipeline') === 'pipeline_default' && panel.get_user_value('pipeline') === null, 'restore original unset default');
assert(bms.get_child('lockscreen').get_boolean('blur'), 'restore native prior lockscreen setting');
assert(settings.get_string('bms-desktop-state') === '' && pipelines()[DESKTOP_PIPELINE_ID], 'clear record and retain pipelines');
integration.sync(false, blue);
assert(apps.get_int('opacity') === 255, 'new activation reapplies preset');
integration.restore();
assert(apps.get_int('opacity') === 200, 'new activation restores explicit custom value');
const broken = pipelines();
broken[PIPELINE_ID].effects = new GLib.Variant('av', []);
save(broken);
const before = bms.get_value('pipelines');
let rejected = false;
try { integration.sync(false, blue); } catch { rejected = true; }
assert(rejected && bms.get_value('pipelines').equal(before) && settings.get_string('bms-desktop-state') === '', 'invalid effects cause no configuration writes');
save(unchanged.deep_unpack());
const failing = {
    settings_schema: bms.settings_schema,
    get_value: key => bms.get_value(key),
    set_value: (key, value) => bms.set_value(key, value),
    get_child: child => {
        const target = bms.get_child(child);
        if (child !== 'applications') return target;
        return {
            settings_schema: target.settings_schema,
            get_value: key => target.get_value(key),
            get_user_value: key => target.get_user_value(key),
            is_writable: key => target.is_writable(key),
            set_value: (key, value) => key === 'opacity' ? false : target.set_value(key, value),
            reset: key => target.reset(key),
        };
    },
};
rejected = false;
try { new DesktopIntegration(failing, settings).sync(false, blue); } catch { rejected = true; }
assert(rejected && settings.get_string('bms-desktop-state') === '', 'failed apply rolls back and clears record');
assert(apps.get_int('opacity') === 200 && panel.get_string('pipeline') === 'pipeline_default' && !apps.get_boolean('blur'), 'failed apply restores earlier writes');
for (const name of ['gschemas.compiled', 'test.gschema.xml']) Gio.File.new_for_path(`${directory}/${name}`).delete(null);
Gio.File.new_for_path(directory).delete(null);
print('Desktop blur: preset, live colors, variants, manual edits, restart, restore and malformed effects passed');
