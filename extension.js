import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {setGtkImport} from './gtk-import.js';
import {readText, writeText} from './files.js';
import {makeGtkStyles, makeShellStyles} from './styles.js';
import {DesktopIntegration} from './blur-my-shell.js';

export default class Iridescence extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._gtkFile = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0', 'gtk.css']));
        this._gtkStyle = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'iridescence', 'gtk.css']));
        this._shellStyle = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_cache_dir(), 'iridescence', 'shell.css']));
        this._signals = [];
        try {
            writeText(this._gtkStyle, makeGtkStyles(this._settings.get_string('tint'),
                this._settings.get_boolean('transparency') ? 'translucent' : 'solid',
                readText(this.dir.get_child('themes').get_child('gtk.css')).text));
            setGtkImport(this._gtkFile, this._gtkStyle, true);
            this._gtkApplied = true;
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
                if (['tint', 'transparency', 'shell-light-mode'].includes(key)) this._syncShellTheme();
                if (['bms-desktop-enabled', 'shell-light-mode', 'tint', 'transparency'].includes(key)) this._queueOverview();
            })]);
            for (const signal of ['notify::high-contrast', 'notify::color-scheme'])
                this._signals.push([this._stSettings, this._stSettings.connect(signal, () => { this._syncShellTheme(); this._queueOverview(); })]);
            this._signals.push([this._stSettings, this._stSettings.connect('notify::accent-color', () => this._queueOverview())]);
            this._signals.push([Main.sessionMode, Main.sessionMode.connect('updated', () => { this._syncShellTheme(); this._queueOverview(); })]);
            this._syncShellTheme();
            this._queueOverview();
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    disable() {
        // Keep enablement through unlock-dialog so unlock can restore the cached theme without a visible delay.
        for (const [object, id] of this._signals ?? []) object.disconnect(id);
        this._signals = [];
        if (this._overviewUpdate) GLib.Source.remove(this._overviewUpdate);
        this._overviewUpdate = 0;
        try { this._bms?.restore(); } catch (error) { Main.notifyError('Iridescence', error.message); }
        this._bms = this._bmsError = null;
        this._panelEdge?.destroy();
        this._panelEdge = null;
        this._restoreShellTheme();
        if (this._gtkFile && this._gtkStyle) {
            try {
                const ownImport = `@import url("${this._gtkStyle.get_uri()}"); /* iridescence */`;
                if (this._gtkApplied || readText(this._gtkFile).text.replace(/^\uFEFF/, '').split(/\r?\n/).includes(ownImport))
                    setGtkImport(this._gtkFile, this._gtkStyle, false);
            } catch (error) {
                console.error(`Iridescence could not remove its GTK import: ${error.message}`);
                Main.notifyError('Iridescence', 'Could not remove the GTK stylesheet import. See the journal before editing gtk.css.');
            }
        }
        this._gtkApplied = false;
        this._shellKey = null;
        this._settings = this._stSettings = this._gtkFile = this._gtkStyle = this._shellStyle = null;
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
                    this._bms.sync(dark, St.ThemeContext.get_for_stage(global.stage).get_accent_color()[0]);
                }
                this._bmsError = null;
            } catch (error) {
                if (this._bmsError !== error.message) Main.notifyError('Iridescence', error.message);
                this._bmsError = error.message;
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _syncShellTheme() {
        // Our native appearance notification also reaches this handler.
        if (this._updatingTheme) return;
        this._updatingTheme = true;
        try {
            this._panelEdge.visible = !Main.sessionMode.isLocked;
            if (Main.sessionMode.isLocked || this._stSettings.high_contrast) {
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
                transparency: this._settings.get_boolean('transparency') ? 'translucent' : 'solid',
            };
            const key = JSON.stringify([dark, options]);
            if (key !== this._shellKey || !this._shellStyle.query_exists(null)) {
                const source = readText(this.dir.get_child('themes').get_child(`shell-${dark ? 'dark' : 'light'}.css`)).text;
                if (!source) throw new Error('Iridescence Shell palette is missing');
                writeText(this._shellStyle, makeShellStyles(source, dark, options, readText(Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${dark ? 'dark' : 'light'}.css`)).text));
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
        if (!this._shellApplied) return;
        this._shellApplied = false;
        if (Main.getThemeStylesheet()?.equal(this._shellStyle)) {
            Main.setThemeStylesheet(this._previousTheme?.get_path() ?? null);
            Main.loadTheme();
        }
        if (Main.sessionMode.colorScheme === this._appliedColorScheme) {
            Main.sessionMode.colorScheme = this._originalColorScheme;
            this._stSettings.notify('color-scheme');
        }
        this._previousTheme = null;
        this._originalColorScheme = undefined;
        this._appliedColorScheme = undefined;
    }

}
