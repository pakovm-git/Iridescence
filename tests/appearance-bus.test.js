// Run on a private session bus with temporary XDG_CONFIG_HOME.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

if (!GLib.getenv('XDG_CONFIG_HOME')?.startsWith('/tmp/') || !GLib.getenv('DBUS_SESSION_BUS_ADDRESS')?.includes('/tmp/'))
    throw Error('Use a private test bus and temporary configuration.');
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const source = new TextDecoder().decode(root.get_child('extension.js').load_contents(null)[1]);
// Exercise the exact export method without importing GNOME Shell into this GJS test process.
const method = source.slice(source.indexOf('    _exportAppearance() {'), source.indexOf('    async _applyAppearance('));
const Bridge = eval(`(class { ${method} })`);
const bridge = new Bridge();
const check = (condition, message) => { if (!condition) throw Error(message); };
const call = values => new Promise((resolve, reject) => Gio.DBus.session.call(Gio.DBus.session.get_unique_name(),
    '/org/gnome/Shell/Extensions/Iridescence', 'org.gnome.Shell.Extensions.Iridescence', 'ApplyAppearance',
    values, new GLib.VariantType('()'), Gio.DBusCallFlags.NO_AUTO_START, 2000, null, (connection, result) => {
        try { connection.call_finish(result); resolve(); } catch (error) { reject(error); }
    }));
const wait = () => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => { resolve(); return GLib.SOURCE_REMOVE; }));
let failure;
const loop = new GLib.MainLoop(null, false);
(async () => {
    let received;
    bridge._applyAppearance = async values => { received = values; };
    bridge._exportAppearance();
    await call(new GLib.Variant('(sbbi)', ['balanced', true, false, 90]));
    check(JSON.stringify(received) === JSON.stringify(['balanced', true, false, 90]), 'Native D-Bus signature delivers all appearance values');
    const invalid = await call(new GLib.Variant('(s)', ['invalid'])).catch(error => error);
    check(typeof invalid?.message === 'string', 'Native D-Bus rejects malformed arguments');
    bridge._applyAppearance = async () => { throw Error('CSS write failed'); };
    const error = await call(new GLib.Variant('(sbbi)', ['rich', true, true, 65])).catch(error => error);
    check(error.message.includes('CSS write failed'), 'Backend errors reach Preferences');
    let finish;
    bridge._applyAppearance = () => new Promise(resolve => { finish = resolve; });
    const pending = call(new GLib.Variant('(sbbi)', ['subtle', true, true, 65])).catch(error => error);
    await wait();
    const busy = await call(new GLib.Variant('(sbbi)', ['rich', false, true, 90])).catch(error => error);
    check(busy.message.includes('already being applied'), 'Concurrent native calls receive Busy');
    bridge._appearanceBus.unexport();
    bridge._applyCall.return_dbus_error('org.gnome.Shell.Extensions.Iridescence.Disabled', 'Iridescence was disabled.');
    bridge._applyCall = null;
    check((await pending).message.includes('disabled'), 'Disable rejects the outstanding native call');
    finish(); await wait();
    const removed = await call(new GLib.Variant('(sbbi)', ['balanced', true, true, 90])).catch(error => error);
    check(typeof removed?.message === 'string', 'Unexported appearance command cannot be called');
    print('Native D-Bus: typed arguments, void replies, errors, Busy, disable and unexport passed');
})().catch(error => { failure = error; }).finally(() => loop.quit());
loop.run();
if (failure) throw failure;
