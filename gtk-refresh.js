import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class GtkRefresh {
    constructor() {
        this._settings = new Gio.Settings({schema_id: 'org.gnome.desktop.a11y.interface'});
        this._source = 0;
        this._pending = null;
        this._owner = this._wait = 0;
    }

    get highContrast() {
        return this._pending?.original ?? this._settings.get_boolean('high-contrast');
    }

    _set(value) {
        if (!this._settings.set_boolean('high-contrast', value))
            throw Error('GTK refresh is unavailable. Reopen applications to see the changes.');
        Gio.Settings.sync();
    }

    run() {
        if (this._pending) return this._pending.promise;
        const pending = {original: null};
        pending.promise = new Promise((resolve, reject) => Object.assign(pending, {resolve, reject}));
        this._pending = pending;
        this._wait = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
            this._wait = 0;
            this._finish(Error('GTK refresh is busy. Reopen applications or try Apply again.'));
            return GLib.SOURCE_REMOVE;
        });
        this._owner = Gio.bus_own_name(Gio.BusType.SESSION, 'org.gnome.Shell.Extensions.Iridescence.GtkRefresh',
            Gio.BusNameOwnerFlags.NONE, null, () => {
                if (this._pending !== pending) return;
                GLib.Source.remove(this._wait);
                this._wait = 0;
                pending.original = this._settings.get_boolean('high-contrast');
                try {
                    this._set(!pending.original);
                    this._source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                        this._source = 0;
                        this._finish();
                        return GLib.SOURCE_REMOVE;
                    });
                } catch (error) { this._finish(error); }
            }, connection => {
                // A live connection can report name-lost while this request is queued.
                if (!connection && this._pending === pending) this._finish(Error('GTK refresh could not connect to the session bus.'));
            });
        return pending.promise;
    }

    _finish(error = null) {
        if (this._source) GLib.Source.remove(this._source);
        this._source = 0;
        if (this._wait) GLib.Source.remove(this._wait);
        this._wait = 0;
        const pending = this._pending;
        if (!pending) return;
        try {
            if (pending.original !== null && this._settings.get_boolean('high-contrast') !== pending.original)
                this._set(pending.original);
        } catch (restoreError) {
            error = Error(`Could not restore High Contrast. Check Settings → Accessibility. ${restoreError.message}`);
            console.error(error.message);
        }
        if (this._owner) Gio.bus_unown_name(this._owner);
        this._owner = 0;
        this._pending = null;
        if (error) pending.reject(error);
        else pending.resolve();
    }

    destroy() {
        this._finish(Error('Appearance refresh cancelled'));
        this._settings = null;
    }
}
