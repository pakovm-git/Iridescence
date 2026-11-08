import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {setGtkImport} from './gtk-import.js';
import {readText, writeText} from './files.js';
import {makeGtkStyles, makeShellStyles, TINTS} from './styles.js';
import {DesktopIntegration} from './blur-my-shell.js';
import {ShellShadows} from './shell-shadows.js';
import {GtkRefresh} from './gtk-refresh.js';

export default class Iridescence extends Extension {
    enable() {
        this._epoch = (this._epoch ?? 0) + 1;
        this._cancellable = new Gio.Cancellable();
        this._settings = this.getSettings();
        this._gtkFile = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0', 'gtk.css']));
        this._gtkStyle = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'iridescence', 'gtk.css']));
        this._shellStyle = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_cache_dir(), 'iridescence', 'shell.css']));
        this._signals = [];
        this._gtkRevision = 0;
        try {
            this._gtkRefresh = new GtkRefresh();
            this._power = Gio.PowerProfileMonitor.dup_default();
            this._signals.push([this._power, this._power.connect('notify::power-saver-enabled', () => {
                this._syncShellTheme(); this._queueGtk(); this._queueOverview();
            })]);
            this._exportAppearance();
            this._shadows = new ShellShadows(global.stage);
            this._panelEdge = new St.Widget({style_class: 'iridescence-panel-edge', reactive: false});
            Main.panel.add_child(this._panelEdge);
            const allocateEdge = () => {
                const [width, height] = Main.panel.get_size();
                this._panelEdge.allocate(new Clutter.ActorBox({x1: 0, y1: height - 1, x2: width, y2: height}));
            };
            this._signals.push([Main.panel, Main.panel.connect('notify::allocation', allocateEdge)]);
            allocateEdge();
            this._stSettings = St.Settings.get();
            this._signals.push([this._settings, this._settings.connect('changed', (_settings, key) => {
                if (['tint', 'transparency', 'shell-light-mode', 'gtk-opacity'].includes(key)) {
                    this._syncShellTheme(); this._queueGtk();
                }
                if (['bms-desktop-enabled', 'shell-light-mode', 'tint', 'transparency'].includes(key)) this._queueOverview();
            })]);
            for (const signal of ['notify::high-contrast', 'notify::color-scheme'])
                this._signals.push([this._stSettings, this._stSettings.connect(signal, () => { this._syncShellTheme(); this._queueOverview(); })]);
            this._signals.push([this._stSettings, this._stSettings.connect('notify::accent-color', () => this._queueOverview())]);
            this._signals.push([Main.sessionMode, Main.sessionMode.connect('updated', () => {
                this._syncShellTheme(true);
                this._queueOverview();
            })]);
            this._loadStyles(this._cancellable);
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    async _loadStyles(cancellable) {
        try {
            const files = [this.dir.get_child('themes').get_child('gtk.css'),
                ...['light', 'dark'].map(variant => this.dir.get_child('themes').get_child(`shell-${variant}.css`)),
                this._gtkFile, this._gtkStyle,
                ...['light', 'dark'].map(variant => Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${variant}.css`))];
            const [gtk, light, dark, current, generated, nativeLight, nativeDark] = await Promise.all(files.map(file => readText(file, cancellable)));
            if (cancellable.is_cancelled()) return;
            this._sources = {gtk: gtk.text, light: light.text, dark: dark.text, nativeLight: nativeLight.text, nativeDark: nativeDark.text};
            this._writeGtk(this._appearanceValues(), generated);
            setGtkImport(this._gtkFile, this._gtkStyle, true, current);
            this._syncShellTheme();
            this._queueOverview();
            try { await this._gtkRefresh.run(); } catch (error) {
                if (!cancellable.is_cancelled()) Main.notifyError('Iridescence', error.message);
            }
        } catch (error) {
            if (!cancellable.is_cancelled()) {
                this.disable();
                console.error(`Iridescence could not load its styles: ${error.message}`);
                Main.notifyError('Iridescence', error.message);
            }
        }
    }

    _appearanceValues() {
        return [this._settings.get_string('tint'), this._settings.get_boolean('transparency'),
            this._settings.get_boolean('shell-light-mode'), this._settings.get_enum('gtk-opacity')];
    }

    _transparent(saved = this._settings.get_boolean('transparency')) {
        return saved && !this._power?.power_saver_enabled;
    }

    _checkActive(cancellable) {
        if (cancellable.is_cancelled() || this._cancellable !== cancellable)
            throw Error('Iridescence was disabled.');
    }

    _writeGtk([tint, transparency, _light, opacity], current) {
        const css = makeGtkStyles(tint, this._transparent(transparency) ? 'translucent' : 'solid', this._sources.gtk, opacity);
        if (current.text === css) return false;
        writeText(this._gtkStyle, css, current.etag);
        return true;
    }

    _queueGtk() {
        this._gtkRevision++;
        if (!this._sources || this._gtkUpdate || this._gtkJob || this._applying) return;
        const cancellable = this._cancellable;
        this._gtkUpdate = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._gtkUpdate = 0;
            const revision = this._gtkRevision;
            const job = this._reconcileGtk(cancellable).catch(error => {
                if (!cancellable.is_cancelled()) Main.notifyError('Iridescence', error.message);
            }).finally(() => {
                if (this._gtkJob !== job) return;
                this._gtkJob = null;
                if (this._cancellable === cancellable && revision !== this._gtkRevision) this._queueGtk();
            });
            this._gtkJob = job;
            return GLib.SOURCE_REMOVE;
        });
    }

    async _reconcileGtk(cancellable) {
        const current = await readText(this._gtkStyle, cancellable);
        this._checkActive(cancellable);
        if (this._applying) return;
        if (this._writeGtk(this._appearanceValues(), current)) await this._gtkRefresh.run();
    }

    _exportAppearance() {
        const xml = `<node><interface name="org.gnome.Shell.Extensions.Iridescence">
            <method name="ApplyAppearance"><arg type="s" direction="in"/><arg type="b" direction="in"/>
            <arg type="b" direction="in"/><arg type="i" direction="in"/></method>
        </interface></node>`;
        this._appearanceBus = Gio.DBusExportedObject.wrapJSObject(xml, {
            ApplyAppearanceAsync: (values, invocation) => {
                if (this._applyCall) {
                    invocation.return_dbus_error('org.gnome.Shell.Extensions.Iridescence.Busy', 'Appearance is already being applied.');
                    return;
                }
                this._applyCall = invocation;
                this._applyAppearance(values).then(() => {
                    if (this._applyCall !== invocation) return;
                    this._applyCall = null;
                    invocation.return_value(null);
                }, error => {
                    if (this._applyCall !== invocation) return;
                    this._applyCall = null;
                    invocation.return_dbus_error('org.gnome.Shell.Extensions.Iridescence.Failed', error.message);
                });
            },
        });
        this._appearanceBus.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/Iridescence');
    }

    async _applyAppearance(values) {
        if (!this._sources || !this._cancellable || this._applying) throw Error('Iridescence is not ready to apply appearance.');
        const [tint, transparency, light, opacity] = values;
        if (!Object.hasOwn(TINTS, tint) || typeof transparency !== 'boolean' || typeof light !== 'boolean' || ![65, 90].includes(opacity))
            throw Error('Invalid Iridescence appearance.');
        const transaction = this.getSettings();
        transaction.delay();
        for (const [key, value, setter] of [['tint', tint, 'set_string'], ['transparency', transparency, 'set_boolean'],
            ['shell-light-mode', light, 'set_boolean'], ['gtk-opacity', opacity, 'set_enum']]) {
            if (!transaction.is_writable(key) || !transaction[setter](key, value)) throw Error(`Appearance setting is locked: ${key}`);
        }
        const cancellable = this._cancellable, operation = {};
        this._applying = operation;
        try {
            const [current, root] = await Promise.all([readText(this._gtkStyle, cancellable), readText(this._gtkFile, cancellable)]);
            this._checkActive(cancellable);
            setGtkImport(this._gtkFile, this._gtkStyle, true, root);
            this._writeGtk(values, current);
            transaction.apply();
            for (let attempt = 0; attempt < 3; attempt++) {
                await this._gtkRefresh.run();
                this._checkActive(cancellable);
                const latest = await readText(this._gtkStyle, cancellable);
                this._checkActive(cancellable);
                if (!this._writeGtk(this._appearanceValues(), latest)) return;
            }
            throw Error('Appearance kept changing. Apply again when Power Saver has settled.');
        } finally {
            transaction.revert();
            if (this._applying === operation) { this._applying = null; this._queueGtk(); }
        }
    }

    async _removeGtkImport(file, stylesheet, epoch) {
        try {
            const current = await readText(file);
            // A new enable owns the import; an older cleanup must not remove it.
            if (this._epoch === epoch) setGtkImport(file, stylesheet, false, current);
        } catch (error) {
            console.error(`Iridescence could not remove its GTK import: ${error.message}`);
        }
    }

    disable() {
        // unlock-dialog is needed for lock-screen notification and menu styling; disable always cleans up fully.
        this._cancellable?.cancel();
        this._cancellable = null;
        for (const [object, id] of this._signals ?? []) object.disconnect(id);
        this._signals = [];
        this._power = null;
        this._appearanceBus?.unexport();
        this._appearanceBus = null;
        this._applyCall?.return_dbus_error('org.gnome.Shell.Extensions.Iridescence.Disabled', 'Iridescence was disabled.');
        this._applyCall = null;
        this._applying = this._gtkJob = null;
        if (this._gtkUpdate) GLib.Source.remove(this._gtkUpdate);
        this._gtkUpdate = 0;
        try {
            if (this._gtkStyle?.query_exists(null)) {
                writeText(this._gtkStyle, '/* Iridescence is disabled. */\n');
                // A delayed GTK refresh is required; Shell timers must end in disable().
                Gio.Subprocess.new(['gjs', '-m', this.dir.get_child('gtk-refresh-helper.js').get_path()], Gio.SubprocessFlags.NONE);
            }
        } catch (error) { console.error(`Iridescence could not clear its GTK appearance: ${error.message}`); }
        this._gtkRefresh?.destroy();
        this._gtkRefresh = null;
        this._shadows?.destroy();
        this._shadows = null;
        if (this._overviewUpdate) GLib.Source.remove(this._overviewUpdate);
        this._overviewUpdate = 0;
        try { this._bms?.restore(); } catch (error) { Main.notifyError('Iridescence', error.message); }
        this._bms = this._bmsError = null;
        this._panelEdge?.destroy();
        this._panelEdge = null;
        try { this._restoreShellTheme(); } catch (error) { console.error(`Iridescence could not restore the Shell theme: ${error.message}`); }
        if (this._gtkFile && this._gtkStyle)
            this._removeGtkImport(this._gtkFile, this._gtkStyle, this._epoch);
        this._sources = null;
        this._shellKey = null;
        this._settings = null;
        this._stSettings = null;
        this._gtkFile = null;
        this._gtkStyle = null;
        this._shellStyle = null;
    }

    _queueOverview() {
        if (this._overviewUpdate || (!this._settings.get_boolean('bms-desktop-enabled') && !this._bms)) return;
        this._overviewUpdate = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._overviewUpdate = 0;
            try {
                if (!this._settings.get_boolean('bms-desktop-enabled')) {
                    this._bms?.restore();
                    this._bms = null;
                } else if (!Main.sessionMode.isLocked) {
                    if (!this._bms) {
                        const directory = Main.extensionManager.lookup('blur-my-shell@aunetx')?.dir?.get_child('schemas');
                        if (!directory?.query_exists(null)) throw new Error('Install Blur My Shell to use desktop integration');
                        const source = Gio.SettingsSchemaSource.new_from_directory(directory.get_path(), Gio.SettingsSchemaSource.get_default(), false);
                        const schema = source.lookup('org.gnome.shell.extensions.blur-my-shell', false);
                        if (!schema?.has_key('pipelines') || !schema.list_children().includes('overview'))
                            throw new Error('This Blur My Shell version does not support Overview pipelines');
                        this._bms = new DesktopIntegration(new Gio.Settings({settings_schema: schema}), this._settings);
                    }
                    const dark = !this._settings.get_boolean('shell-light-mode') || Main.getStyleVariant() !== 'light';
                    this._bms.sync(dark, St.ThemeContext.get_for_stage(global.stage).get_accent_color()[0], this._transparent());
                }
                this._bmsError = null;
            } catch (error) {
                if (this._bmsError !== error.message) Main.notifyError('Iridescence', error.message);
                this._bmsError = error.message;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _syncShellTheme(force = false) {
        // Our native appearance notification also reaches this handler.
        if (this._updatingTheme || !this._sources) return;
        this._updatingTheme = true;
        try {
            this._panelEdge.visible = !Main.sessionMode.isLocked;
            if (this._gtkRefresh?.highContrast ?? this._stSettings.high_contrast) {
                this._restoreShellTheme();
                return;
            }
            if (!this._shellApplied) {
                this._previousTheme = Main.getThemeStylesheet();
                this._originalColorScheme = Main.sessionMode.colorScheme;
                this._shellApplied = true;
            }
            this._appliedColorScheme = this._settings.get_boolean('shell-light-mode') ? 'prefer-light' : 'force-dark';
            if (Main.sessionMode.colorScheme !== this._appliedColorScheme) {
                Main.sessionMode.colorScheme = this._appliedColorScheme;
                this._stSettings.notify('color-scheme');
            }
            const dark = Main.getStyleVariant() === 'dark';
            const options = {
                tint: this._settings.get_string('tint'),
                transparency: this._transparent() ? 'translucent' : 'solid',
                opacity: this._settings.get_enum('gtk-opacity'),
            };
            const key = JSON.stringify([dark, options]);
            const changed = key !== this._shellKey || !this._shellStyle.query_exists(null);
            if (!force && !changed && Main.getThemeStylesheet()?.equal(this._shellStyle)) return;
            if (changed) {
                const source = this._sources[dark ? 'dark' : 'light'];
                if (!source) throw new Error('Iridescence Shell palette is missing');
                writeText(this._shellStyle, makeShellStyles(source, dark, options, this._sources[dark ? 'nativeDark' : 'nativeLight']));
                this._shellKey = key;
            }
            Main.setThemeStylesheet(this._shellStyle.get_path());
            Main.loadTheme();
        } catch (error) {
            this._restoreShellTheme();
            throw error;
        } finally {
            this._updatingTheme = false;
        }
    }

    _restoreShellTheme() {
        try {
            if (this._shellApplied && Main.getThemeStylesheet()?.equal(this._shellStyle)) {
                Main.setThemeStylesheet(this._previousTheme?.get_path() ?? null);
                Main.loadTheme();
            }
            if (this._shellApplied && Main.sessionMode.colorScheme === this._appliedColorScheme) {
                Main.sessionMode.colorScheme = this._originalColorScheme;
                this._stSettings.notify('color-scheme');
            }
        } finally {
            this._shellApplied = false;
            this._previousTheme = null;
            this._originalColorScheme = undefined;
            this._appliedColorScheme = undefined;
        }
    }
}
