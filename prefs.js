import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {readText, writeText} from './files.js';
import {setFlatpakAccess} from './flatpak.js';
import {setGtkImport} from './gtk-import.js';
import {makeGtkStyles} from './styles.js';

export const DONATION_ADDRESS = 'pako@bitbox.cash';

export default class IridescencePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        settings.delay();
        window.set_default_size(540, 520);
        const page = new Adw.PreferencesPage({title: 'Appearance', icon_name: 'preferences-desktop-appearance-symbolic'});
        window.add(page);
        const group = new Adw.PreferencesGroup({title: 'Theme'});
        const tint = new Adw.ComboRow({title: 'Tint strength',
            model: Gtk.StringList.new(['Subtle', 'Balanced', 'Rich']), selected: settings.get_enum('tint')});
        tint.connect('notify::selected', () => settings.set_enum('tint', tint.selected));
        group.add(tint);
        for (const [key, title] of [['transparency', 'Transparency'], ['shell-light-mode', 'Light Shell in light mode']]) {
            const row = new Adw.SwitchRow({title});
            settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        }
        this._addApply(group, settings, window);
        this._addBlurGroup(page, window);
        page.add(group);
        const extras = new Adw.PreferencesPage({title: 'Extras', icon_name: 'preferences-other-symbolic'});
        window.add(extras);
        this._addFlatpakGroup(extras, window);
        const support = new Adw.PreferencesGroup({title: 'Support Iridescence'});
        const row = new Adw.ActionRow({title: 'Donate Bitcoin over Lightning'});
        const button = new Gtk.Button({label: 'Donate', valign: Gtk.Align.CENTER});
        button.connect('clicked', () => this._showDonation(window));
        row.add_suffix(button);
        row.activatable_widget = button;
        support.add(row);
        extras.add(support);
    }

    _addBlurGroup(page, window) {
        const settings = this.getSettings();
        const installed = this._hasBlurMyShell();
        const blur = new Gtk.Switch({valign: Gtk.Align.CENTER, sensitive: installed});
        blur.update_property([Gtk.AccessibleProperty.LABEL], ['Enable Blur My Shell desktop integration']);
        const group = new Adw.PreferencesGroup({title: 'Desktop blur'});
        const row = new Adw.ActionRow({title: 'Blur My Shell integration',
            subtitle: 'Apply Iridescence’s blur preset across the desktop.'});
        row.add_suffix(blur);
        row.activatable_widget = blur;
        group.add(row);
        const update = () => {
            const enabled = settings.get_boolean('bms-desktop-enabled');
            blur.active = enabled;
            blur.state = enabled;
        };
        update();
        group.add(new Gtk.Label({label: 'Requires <a href="https://extensions.gnome.org/extension/3193/blur-my-shell/">Blur My Shell ↗</a>' +
            (installed ? '' : ' · Not installed'), use_markup: true, xalign: 0, wrap: true, margin_top: 8}));
        let pending = false;
        blur.connect('state-set', (_widget, enabled) => {
            if (enabled === settings.get_boolean('bms-desktop-enabled')) return false;
            if (!enabled) { settings.set_boolean('bms-desktop-enabled', false); return true; }
            if (pending) return true;
            pending = true;
            const details = new Adw.PreferencesGroup();
            for (const [title, subtitle] of [
                ['Shell and applications', 'Blur 100 · brightness 1.00 · saturation 1.05 · grain 0.10'],
                ['Overview', 'Theme-aware base and accent colors'],
                ['Styling and behavior', 'Preset backgrounds, corner settings and window behavior'],
                ['Lock screen', 'Use GNOME’s native blur'],
            ]) details.add(new Adw.ActionRow({title, subtitle}));
            const dialog = new Adw.AlertDialog({heading: 'Apply desktop blur preset?',
                body: 'Replaces your current Blur My Shell appearance settings and pipeline assignments with the Iridescence preset.\n\n' +
                    'You can customize the settings in Blur My Shell. Overview colors keep following Iridescence while this option is on.\n\n' +
                    'Turning it off restores previous settings you haven’t edited.', extra_child: details});
            dialog.add_response('cancel', 'Cancel');
            dialog.add_response('apply', 'Apply preset');
            dialog.set_response_appearance('apply', Adw.ResponseAppearance.SUGGESTED);
            dialog.default_response = dialog.close_response = 'cancel';
            dialog.connect('response', (_dialog, response) => {
                pending = false;
                if (response === 'apply') settings.set_boolean('bms-desktop-enabled', true);
                update();
            });
            dialog.present(window);
            return true;
        });
        const signal = settings.connect('changed::bms-desktop-enabled', update);
        window.connect('close-request', () => { settings.disconnect(signal); return false; });
        page.add(group);
    }

    _hasBlurMyShell() {
        try {
            const [info] = Gio.DBus.session.call_sync('org.gnome.Shell', '/org/gnome/Shell',
                'org.gnome.Shell.Extensions', 'GetExtensionInfo', new GLib.Variant('(s)', ['blur-my-shell@aunetx']),
                new GLib.VariantType('(a{sv})'), Gio.DBusCallFlags.NO_AUTO_START, 3000, null).deep_unpack();
            return Object.keys(info).length > 0;
        } catch {
            return false;
        }
    }

    _isExtensionActive() {
        const [info] = Gio.DBus.session.call_sync('org.gnome.Shell', '/org/gnome/Shell',
            'org.gnome.Shell.Extensions', 'GetExtensionInfo', new GLib.Variant('(s)', [this.uuid]),
            new GLib.VariantType('(a{sv})'), Gio.DBusCallFlags.NO_AUTO_START, 3000, null).deep_unpack();
        return info.state?.deep_unpack() === 1;
    }

    _addApply(group, settings, window) {
        const config = Gio.File.new_for_path(GLib.get_user_config_dir());
        const file = config.get_child('gtk-4.0').get_child('gtk.css');
        const stylesheet = config.get_child('iridescence').get_child('gtk.css');
        const source = readText(this.dir.get_child('themes').get_child('gtk.css')).text;
        const row = new Adw.ActionRow({title: 'Apply appearance',
            subtitle: 'Changes pending.'});
        const button = new Gtk.Button({label: 'Apply', valign: Gtk.Align.CENTER});
        let applying = false;
        const signal = settings.connect('changed', (_settings, key) => {
            if (['tint', 'transparency', 'shell-light-mode'].includes(key)) {
                row.subtitle = 'Changes pending.';
                button.sensitive = !applying;
            }
        });
        window.connect('close-request', () => {
            if (applying) return true;
            settings.disconnect(signal); settings.revert(); return false;
        });
        button.connect('clicked', async () => {
            if (applying) return;
            applying = true;
            button.sensitive = false;
            row.subtitle = 'Applying…';
            try {
                const active = this._isExtensionActive();
                writeText(stylesheet, makeGtkStyles(settings.get_string('tint'),
                    settings.get_boolean('transparency') ? 'translucent' : 'solid', source), readText(stylesheet).etag);
                const ownImport = `@import url("${stylesheet.get_uri()}"); /* iridescence */`;
                if (active || readText(file).text.replace(/^\uFEFF/, '').split(/\r?\n/).includes(ownImport))
                    setGtkImport(file, stylesheet, active);
                settings.apply();
                if (active) await this._reloadGtk();
                row.subtitle = !active ? 'Saved. Enable Iridescence, then Apply.' :
                    settings.get_has_unapplied() ? 'Changes pending.' : 'Applied. Reopen apps if needed.';
                button.sensitive = !active || settings.get_has_unapplied();
            } catch (error) {
                row.subtitle = 'Apply failed. Try again.';
                button.sensitive = true;
                const dialog = new Adw.AlertDialog({heading: 'Could not finish applying appearance', body: error.message});
                dialog.add_response('close', 'Close');
                dialog.present(window);
            } finally {
                applying = false;
            }
        });
        row.add_suffix(button);
        row.activatable_widget = button;
        group.add(row);
    }

    async _reloadGtk() {
        const settings = new Gio.Settings({schema_id: 'org.gnome.desktop.a11y.interface'});
        const original = settings.get_boolean('high-contrast');
        try {
            if (!settings.set_boolean('high-contrast', !original))
                throw new Error('GTK refresh is unavailable. Reopen applications to see the changes.');
            Gio.Settings.sync();
            // Apps need time to observe the first write before it is restored.
            await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                resolve();
                return GLib.SOURCE_REMOVE;
            }));
        } finally {
            if (!settings.set_boolean('high-contrast', original))
                throw new Error('Could not restore High Contrast. Check Settings → Accessibility.');
            Gio.Settings.sync();
        }
    }

    _addFlatpakGroup(page, window) {
        const group = new Adw.PreferencesGroup({title: 'Flatpak integration',
            description: 'Allow Flatpak apps to read the theme. Reopen them after changing access.'});
        const row = new Adw.ActionRow({title: 'Theme access',
            subtitle: 'Undo removes only Iridescence’s permissions.'});
        const file = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_data_dir(), 'flatpak', 'overrides', 'global']));
        const state = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'iridescence', 'flatpak-state.json']));
        const apply = new Gtk.Button({label: 'Apply', valign: Gtk.Align.CENTER});
        const undo = new Gtk.Button({label: 'Undo', valign: Gtk.Align.CENTER});
        const available = GLib.find_program_in_path('flatpak') !== null;
        apply.sensitive = available;
        undo.sensitive = available && Boolean(readText(state).text);
        if (!available) row.subtitle = 'Flatpak is not installed.';
        for (const [button, enabled] of [[apply, true], [undo, false]]) {
            button.connect('clicked', () => {
                try {
                    setFlatpakAccess(file, state, enabled);
                    undo.sensitive = Boolean(readText(state).text);
                    window.add_toast(new Adw.Toast({title: enabled ? 'Flatpak access applied' : 'Iridescence permissions removed'}));
                } catch (error) {
                    const dialog = new Adw.AlertDialog({heading: 'Could not update Flatpak access', body: error.message});
                    dialog.add_response('close', 'Close');
                    dialog.present(window);
                }
            });
            row.add_suffix(button);
        }
        group.add(row);
        page.add(group);
    }

    _showDonation(window) {
        const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 16,
            halign: Gtk.Align.CENTER, margin_top: 8, margin_bottom: 8});
        const picture = Gtk.Picture.new_for_filename(this.dir.get_child('assets').get_child('lightning-address.png').get_path());
        picture.set_size_request(240, 240);
        picture.content_fit = Gtk.ContentFit.CONTAIN;
        picture.update_property([Gtk.AccessibleProperty.LABEL], ['Lightning donation QR code for pako@bitbox.cash']);
        content.append(new Adw.Bin({child: picture, css_classes: ['card'], overflow: Gtk.Overflow.HIDDEN}));
        content.append(new Gtk.Label({label: DONATION_ADDRESS, selectable: true}));
        const copy = new Gtk.Button({label: 'Copy address', halign: Gtk.Align.CENTER});
        copy.add_css_class('suggested-action');
        copy.connect('clicked', () => {
            window.get_clipboard().set(DONATION_ADDRESS);
            copy.label = 'Address copied';
        });
        content.append(copy);
        const dialog = new Adw.AlertDialog({heading: 'Support Iridescence',
            body: 'Thank you for helping maintain Iridescence. Scan the QR code or copy the address to donate Bitcoin over Lightning.',
            extra_child: content});
        dialog.add_response('close', 'Close');
        dialog.present(window);
    }
}
