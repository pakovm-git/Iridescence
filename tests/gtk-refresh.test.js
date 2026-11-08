import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {GtkRefresh} from '../gtk-refresh.js';

if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory') throw Error('Use isolated memory settings');
const settings = new Gio.Settings({schema_id: 'org.gnome.desktop.a11y.interface'});
const check = (value, message) => { if (!value) throw Error(message); };
// Unit-test ownership callbacks; distinct-process native tests cover the real bus lock.
const ownName = Gio.bus_own_name, unownName = Gio.bus_unown_name;
let owner = 0;
const queued = new Map();
Gio.bus_own_name = (_type, name, _flags, _bus, acquired) => {
    const id = ++owner;
    queued.set(id, GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        queued.delete(id); acquired({}, name); return GLib.SOURCE_REMOVE;
    }));
    return id;
};
Gio.bus_unown_name = id => { if (queued.has(id)) { GLib.Source.remove(queued.get(id)); queued.delete(id); } };
const wait = () => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const loop = new GLib.MainLoop(null, false);
let failure;
(async () => {
    for (const original of [false, true]) {
        settings.set_boolean('high-contrast', original);
        const refresh = new GtkRefresh();
        const pending = refresh.run();
        check(refresh.run() === pending, 'Concurrent callers join one pulse');
        await wait();
        check(refresh.highContrast === original && settings.get_boolean('high-contrast') !== original, 'Original accessibility state is retained during pulse');
        await pending;
        check(settings.get_boolean('high-contrast') === original && refresh._source === 0, 'Pulse restores original value and releases source');
        const cancelled = refresh.run().catch(error => error);
        await wait();
        refresh.destroy();
        check((await cancelled) instanceof Error, 'Disable cancels pending requests');
        check(settings.get_boolean('high-contrast') === original && refresh._source === 0, 'Disable leaves no source or changed accessibility setting');
        check(refresh._owner === 0 && refresh._wait === 0, 'Cancellation releases bus ownership and wait source');
    }
    const waiting = new GtkRefresh();
    const beforeWaiting = settings.get_boolean('high-contrast');
    const cancelledWait = waiting.run().catch(error => error);
    waiting.destroy();
    check((await cancelledWait) instanceof Error && settings.get_boolean('high-contrast') === beforeWaiting,
        'Cancelling before ownership never restores another owner temporary value');
    check(waiting._wait === 0 && waiting._owner === 0 && queued.size === 0, 'Cancelled acquisition removes all sources');
    const setter = Gio.Settings.prototype.set_boolean;
    const refresh = new GtkRefresh();
    try {
        let interrupted = false;
        Gio.Settings.prototype.set_boolean = function (key, value) {
            const result = setter.call(this, key, value);
            if (!interrupted) { interrupted = true; throw Error('Interrupted pulse'); }
            return result;
        };
        const error = await refresh.run().catch(error => error);
        check(error.message === 'Interrupted pulse' && settings.get_boolean('high-contrast'), 'Interrupted pulse restores original accessibility state');
        check(refresh._source === 0, 'Failed pulse leaves no timer');
    } finally { Gio.Settings.prototype.set_boolean = setter; refresh.destroy(); }
    print('GTK refresh: one owner, joined calls, original accessibility values, cancellation and errors passed');
})().catch(error => { failure = error; }).finally(() => { Gio.bus_own_name = ownName; Gio.bus_unown_name = unownName; loop.quit(); });
loop.run();
if (failure) throw failure;
