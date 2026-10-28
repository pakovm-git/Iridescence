import GLib from 'gi://GLib';
import {TINTS} from './styles.js';

export const PIPELINE_ID = 'iridescence_overview';
export const DESKTOP_PIPELINE_ID = 'iridescence_desktop';

const PRESET = {
    appfolder: {blur: true, pipeline: DESKTOP_PIPELINE_ID, 'style-dialogs': 0},
    applications: {blur: true, pipeline: DESKTOP_PIPELINE_ID, 'enable-all': true,
        blacklist: ['Plank', 'Conky'], whitelist: [], opacity: 255, 'dynamic-opacity': false,
        'blur-on-overview': true, 'unblur-when-fullscreen': true, 'static-blur': false,
        'corner-radius': 15, 'rounded-corners': 0, 'corner-when-maximized': false},
    'coverflow-alt-tab': {blur: true, pipeline: DESKTOP_PIPELINE_ID},
    'dash-to-dock': {blur: true, pipeline: DESKTOP_PIPELINE_ID, 'static-blur': false,
        'override-background': false, 'style-dash-to-dock': 3, 'unblur-in-overview': false},
    'dash-to-panel': {'blur-original-panel': false},
    hidetopbar: {compatibility: false},
    lockscreen: {blur: false},
    overview: {blur: true, pipeline: PIPELINE_ID, 'style-components': 0},
    panel: {blur: true, pipeline: DESKTOP_PIPELINE_ID, 'static-blur': false,
        'corner-radius': 0, 'rounded-corners': 0, 'force-light-text': false, 'unblur-in-overview': true,
        'override-background': false, 'style-panel': 0, 'override-background-dynamically': false,
        'override-background-dynamically-mode': 0, 'gradient-panel': true, 'gradient-panel-mode': 0},
    popup: {blur: true, pipeline: DESKTOP_PIPELINE_ID, 'static-blur': false,
        'override-background': false, 'preserve-shell-theme': false, 'style-popup': 3,
        'rounded-corners': 0, 'corner-radius': 18, 'menu-corner-radius': 20,
        'candidate-corner-radius': 12, 'quick-settings-corner-radius': 36, 'submenu-corner-radius': 36,
        'calendar-corner-radius': 30, 'notification-corner-radius': 18, 'osd-corner-radius': 28,
        'osd-window-corner-radius': 48, 'resize-popup-corner-radius': 12, 'dialog-corner-radius': 18,
        'osk-corner-radius': 0},
    screenshot: {blur: true, pipeline: DESKTOP_PIPELINE_ID},
    'window-list': {blur: true, pipeline: DESKTOP_PIPELINE_ID},
};

function effect(type, id, params) {
    return new GLib.Variant('a{sv}', {
        type: new GLib.Variant('s', type), id: new GLib.Variant('s', id),
        params: new GLib.Variant('a{sv}', params),
    });
}

export class DesktopIntegration {
    constructor(bms, settings) {
        this._bms = bms;
        this._overview = bms.get_child('overview');
        if (!this._overview.settings_schema.has_key('pipeline') || this._overview.get_value('pipeline').get_type_string() !== 's')
            throw new Error('This Blur My Shell version does not support Overview pipelines');
        this._settings = settings;
    }

    sync(dark, accent) {
        const original = this._bms.get_value('pipelines');
        if (original.get_type_string() !== 'a{sa{sv}}')
            throw new Error('Unsupported Blur My Shell pipeline format');
        const pipelines = original.deep_unpack();
        if (!Object.hasOwn(pipelines, PIPELINE_ID)) {
            pipelines[PIPELINE_ID] = {
                name: new GLib.Variant('s', 'Iridescence Overview'),
                effects: new GLib.Variant('av', [
                    effect('dual_kawase_blur', 'iridescence_blur', {
                        unscaled_radius: new GLib.Variant('i', 100), brightness: new GLib.Variant('d', 1.0),
                    }),
                    ...['iridescence_base', 'iridescence_accent'].map(id => effect('color', id, {
                        color: new GLib.Variant('(dddd)', [0, 0, 0, 0]),
                        blend_mode: new GLib.Variant('i', 0), opacity_factor: new GLib.Variant('d', 1),
                    })),
                ]),
            };
        }
        if (!Object.hasOwn(pipelines, DESKTOP_PIPELINE_ID)) {
            pipelines[DESKTOP_PIPELINE_ID] = {
                name: new GLib.Variant('s', 'Iridescence Shell & Apps'),
                effects: new GLib.Variant('av', [
                    effect('dual_kawase_blur', 'iridescence_desktop_blur', {
                        unscaled_radius: new GLib.Variant('i', 100), brightness: new GLib.Variant('d', 1),
                    }),
                    effect('luminosity', 'iridescence_luminosity', {
                        saturation_multiplicator: new GLib.Variant('d', 1.05),
                    }),
                    effect('noise', 'iridescence_noise', {
                        noise: new GLib.Variant('d', .1), lightness: new GLib.Variant('d', 1.01),
                    }),
                ]),
            };
        }
        const opacity = this._settings.get_boolean('transparency') ? 0.70 : 1;
        const tint = (dark ? 0.10 : 0.07) * TINTS[this._settings.get_string('tint')];
        const accentAlpha = opacity * tint;
        // These two overlays must combine to the requested opacity, rather than compound it.
        const colors = {
            iridescence_base: [...(dark ? [34, 34, 38] : [224, 224, 224]).map(v => v / 255), opacity * (1 - tint) / (1 - accentAlpha)],
            iridescence_accent: [accent.red / 255, accent.green / 255, accent.blue / 255, accentAlpha],
        };
        const pipeline = pipelines[PIPELINE_ID];
        const effects = pipeline.effects.deep_unpack();
        const found = new Set();
        for (let i = 0; i < effects.length; i++) {
            const item = effects[i].deep_unpack();
            const id = item.id.get_string()[0];
            if (!Object.hasOwn(colors, id)) continue;
            if (found.has(id) || item.type.get_string()[0] !== 'color')
                throw new Error('Iridescence Overview color effects are invalid');
            const params = item.params.deep_unpack();
            params.color = new GLib.Variant('(dddd)', colors[id]);
            effects[i] = new GLib.Variant('a{sv}', {...item, params: new GLib.Variant('a{sv}', params)});
            found.add(id);
        }
        if (found.size !== 2)
            throw new Error('Iridescence Overview needs its base and accent Color effects');
        pipeline.effects = new GLib.Variant('av', effects);
        const updated = new GLib.Variant('a{sa{sv}}', pipelines);
        const changes = this._settings.get_string('bms-desktop-state') ? null : this._prepare();
        if (!original.equal(updated) && !this._bms.set_value('pipelines', updated))
            throw new Error('Could not update Blur My Shell pipelines');
        if (changes) this._apply(changes);
    }

    _prepare() {
        const changes = [], skipped = [];
        for (const [child, values] of Object.entries(PRESET)) {
            if (!this._bms.settings_schema.list_children().includes(child)) {
                skipped.push(child);
                continue;
            }
            const settings = this._bms.get_child(child);
            for (const [key, value] of Object.entries(values)) {
                if (!settings.settings_schema.has_key(key)) { skipped.push(`${child}/${key}`); continue; }
                const old = settings.get_value(key);
                const applied = new GLib.Variant(old.get_type_string(), value);
                if (!settings.settings_schema.get_key(key).range_check(applied))
                    throw new Error(`Unsupported Blur My Shell setting: ${child}/${key}`);
                if (!old.equal(applied)) {
                    if (!settings.is_writable(key)) throw new Error(`Blur My Shell setting is locked: ${child}/${key}`);
                    changes.push({child, key, before: settings.get_user_value(key)?.print(true) ?? null, applied: applied.print(true)});
                }
            }
        }
        if (skipped.length) console.warn(`Iridescence: unavailable Blur My Shell settings skipped: ${skipped.join(', ')}`);
        return changes;
    }

    _apply(changes) {
        // Persist before writing so a failed apply or Shell restart remains reversible.
        if (!this._settings.set_string('bms-desktop-state', JSON.stringify(changes)))
            throw new Error('Could not save Blur My Shell restoration settings');
        try {
            for (const change of changes) {
                if (!this._bms.get_child(change.child).set_value(change.key, GLib.Variant.parse(null, change.applied, null, null)))
                    throw new Error(`Could not apply Blur My Shell setting: ${change.child}/${change.key}`);
            }
        } catch (error) {
            this.restore();
            throw error;
        }
    }

    restore() {
        const state = this._settings.get_string('bms-desktop-state');
        if (!state) return;
        for (const change of JSON.parse(state)) {
            if (!this._bms.settings_schema.list_children().includes(change.child)) continue;
            const settings = this._bms.get_child(change.child);
            if (!settings.settings_schema.has_key(change.key)) continue;
            if (!settings.get_value(change.key).equal(GLib.Variant.parse(null, change.applied, null, null))) continue;
            if (change.before === null) {
                if (!settings.is_writable(change.key)) throw new Error(`Cannot restore ${change.child}/${change.key}`);
                settings.reset(change.key);
            } else if (!settings.set_value(change.key, GLib.Variant.parse(null, change.before, null, null))) {
                throw new Error(`Cannot restore ${change.child}/${change.key}`);
            }
        }
        if (!this._settings.set_string('bms-desktop-state', ''))
            throw new Error('Could not clear Blur My Shell restoration settings');
    }
}
