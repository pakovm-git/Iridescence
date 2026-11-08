// Match installed GNOME 51 OSD children; render only in a private compositor.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import Cairo from 'cairo';
import {makeShellStyles} from '../styles.js';
import {ShellShadows} from '../shell-shadows.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';

const [output, scheme = 'dark', tint = 'balanced', level = 'airy'] = ARGV;
const directory = Gio.File.new_for_path(output);
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const width = 1000, height = 1040;
const check = (condition, message) => { if (!condition) throw Error(message); };
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
// GNOME 51 ui/environment.js installs this Cairo helper used by its native BarLevel.
Cairo.Context.prototype.setSourceColor = function (color) {
    const {red, green, blue, alpha} = color;
    const rgb = [red, green, blue].map(value => value / 255.0);
    if (alpha !== 0xff) this.setSourceRGBA(...rgb, alpha / 255.0);
    else this.setSourceRGB(...rgb);
};
let context, failure, shadows;
const Plugin = GObject.registerClass(class OsdShadowTest extends Meta.Plugin {
    vfunc_start() { this.run().catch(error => { failure = error; shadows?.destroy(); context.terminate(); }); }
    async run() {
        const {BarLevel} = await import(directory.get_child('barLevel.js').get_uri());
        const stage = context.get_backend().get_stage();
        stage.set_size(width, height); stage.show();
        stage.add_child(new St.Widget({width, height, style: 'background-color: #78938d;'}));
        const css = directory.get_child('osd.css');
        writeText(css, makeShellStyles(readText(root.get_child(`themes/shell-${scheme}.css`)).text, scheme === 'dark', {
            tint, opacity: level === 'dense' ? 90 : 65, transparency: level === 'opaque' ? 'solid' : 'translucent',
        }));
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({
            default_stylesheet: Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${scheme}.css`),
            application_stylesheet: css,
        }));
        const banner = new St.Button({x: 560, y: 48, width: 370, height: 80, style_class: 'message notification-banner', label: 'Notification shadow reference'});
        stage.add_child(banner);
        const samples = [];
        const cases = [
            ['volume', 'audio-volume-high-symbolic', null, 0.65, 1],
            ['brightness', 'display-brightness-symbolic', null, 0.7, 1],
            ['keyboard-backlight', 'keyboard-brightness-symbolic', null, 0.5, 1],
            ['icon-only', 'touchpad-disabled-symbolic', null, null, 1],
            ['label-icon', 'rotation-locked-symbolic', 'Rotation locked', null, 1],
            ['label-level', 'audio-volume-high-symbolic', 'Headphones', 0.8, 1],
            ['amplified', 'audio-volume-overamplified-symbolic', 'Amplified volume', 1.25, 1.5],
        ];
        for (const [i, [name, iconName, label, value, maximum]] of cases.entries()) {
            const box = new St.BoxLayout({x: 64, y: 40 + i * 140, style_class: 'osd-window'});
            const icon = new St.Icon({y_expand: true, gicon: Gio.Icon.new_for_string(iconName)});
            const vbox = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, y_align: Clutter.ActorAlign.CENTER});
            const text = new St.Label({text: label ?? '', visible: label != null});
            const bar = new BarLevel({style_class: 'level', maximum_value: maximum, visible: value != null});
            bar.value = value ?? 0;
            box.add_child(icon); box.add_child(vbox); vbox.add_child(text); vbox.add_child(bar);
            vbox.visible = vbox.get_children().some(child => child.visible);
            stage.add_child(box);
            samples.push({name, box, icon, text, bar, vbox, label, value, maximum});
        }
        const childBox = new St.BoxLayout({x: 560, y: 220, style_class: 'osd-window'});
        const child = new St.Button({style_class: 'button', label: 'Existing child shadow'});
        childBox.add_child(child); stage.add_child(childBox);
        const pad = new St.Widget({x: 560, y: 410, width: 200, height: 60, style_class: 'pad-osd-window'});
        stage.add_child(pad);
        const menu = new St.BoxLayout({x: 560, y: 580, style_class: 'popup-menu-content'});
        const button = new St.Button({style_class: 'button', label: 'Internal shadow reduction'});
        menu.add_child(button); stage.add_child(menu);
        const quickMenu = new St.BoxLayout({x: 560, y: 740, width: 370, height: 80, style_class: 'popup-menu-content quick-settings'});
        quickMenu.add_child(new St.Label({text: 'Quick Settings'})); stage.add_child(quickMenu);
        const dateMenu = new St.BoxLayout({x: 560, y: 880, width: 370, height: 80, style_class: 'popup-menu-content datemenu-popover'});
        dateMenu.add_child(new St.Label({text: 'Notification center'})); stage.add_child(dateMenu);
        const surfaces = [...samples, {name: 'popup-menu', box: menu}, {name: 'quick-settings', box: quickMenu}, {name: 'notification-center', box: dateMenu}];
        await wait(200);
        const shadow = actor => {
            const [found, value] = actor.get_theme_node().lookup_shadow('-iridescence-shadow', false);
            check(found && value, 'Missing computed exterior shadow');
            return {x: value.xoffset, y: value.yoffset, blur: value.blur, spread: value.spread, alpha: value.color.alpha};
        };
        const expected = shadow(banner);
        check(Math.abs(expected.y - 10) < 1e-5 && Math.abs(expected.blur - 10) < 1e-5 && Math.abs(expected.alpha - 255 * .21) <= 1, 'Notification reference changed');
        for (const sample of samples) {
            check(JSON.stringify(shadow(sample.box)) === JSON.stringify(expected), `${sample.name}: OSD exterior shadow must match notification`);
            check(sample.icon.gicon && sample.text.visible === (sample.label != null) && sample.bar.visible === (sample.value != null), `${sample.name}: native icon/label/bar visibility`);
            check(sample.vbox.visible === (sample.label != null || sample.value != null), `${sample.name}: native vertical box visibility`);
            check(sample.bar.value === (sample.value ?? 0) && sample.bar.maximum_value === sample.maximum, `${sample.name}: native level/maximum`);
        }
        for (const actor of [menu, quickMenu, dateMenu]) {
            check(JSON.stringify(shadow(actor)) === JSON.stringify(expected), 'Popup menu shadow must match notification');
            check(!actor.get_theme_node().get_box_shadow(), 'Popup menu retained a duplicate native shadow');
        }
        check(shadow(child).y === 1 && shadow(child).blur === 8 && Math.abs(shadow(child).alpha - 255 * .21) <= 1, 'OSD child shadow changed');
        check(shadow(pad).y === 1 && shadow(pad).blur === 8 && Math.abs(shadow(pad).alpha - 255 * .21) <= 1, 'Tablet mapping overlay changed');
        check(Math.abs(shadow(button).alpha - 255 * .147) <= 1, 'Internal 30% shadow reduction changed');
        const bounds = actor => [...actor.get_transformed_position(), actor.width, actor.height];
        const beforeBounds = surfaces.map(sample => bounds(sample.box));
        shadows = new ShellShadows(stage); await wait(200);
        const capture = () => stage.paint_to_content(new Mtk.Rectangle({x: 0, y: 0, width, height}), 1, stage.get_color_state(), Clutter.PaintFlag.NONE);
        const save = (image, name) => new Promise((resolve, reject) => {
            const stream = directory.get_child(`${name}.png`).replace(null, false, 0, null);
            Shell.Screenshot.composite_to_stream(image.get_texture(), 0, 0, width, height, 1, null, 0, 0, 1, stream, (_object, result) => {
                try { Shell.Screenshot.composite_to_stream_finish(result); stream.close(null); resolve(); } catch (error) { reject(error); }
            });
        });
        const effects = [banner, ...samples.map(sample => sample.box), childBox, child, pad, menu, button, quickMenu, dateMenu]
            .map(actor => actor.get_effect('iridescence-shadow')).filter(Boolean);
        const surfaceEffects = [banner, ...surfaces.map(sample => sample.box)].map(actor => actor.get_effect('iridescence-shadow'));
        for (const effect of surfaceEffects) effect.enabled = false;
        const before = capture();
        for (const effect of surfaceEffects) effect.enabled = true;
        const after = capture();
        const textures = surfaces.map(sample => sample.box.get_effect('iridescence-shadow')._texture);
        capture();
        const measurements = surfaces.map((sample, i) => {
            const actor = sample.box, theme = actor.get_theme_node();
            const box = bounds(actor);
            check(JSON.stringify(box) === JSON.stringify(beforeBounds[i]), `${sample.name}: effect changed bounds`);
            check(textures[i] && actor.get_effect('iridescence-shadow')._texture === textures[i], `${sample.name}: exterior texture not cached`);
            check(box[1] + box[3] + 32 < height, `${sample.name}: bottom shadow clipped`);
            check(!samples.includes(sample) || theme.get_margin(St.Side.BOTTOM) >= 32, `${sample.name}: native bottom margin lost`);
            const radius = Math.floor(Math.min(theme.get_border_radius(St.Corner.TOPLEFT), box[2] / 2, box[3] / 2));
            return {name: sample.name, bounds: box, radius, shadow: shadow(actor), bottomMargin: theme.get_margin(St.Side.BOTTOM)};
        });
        await save(before, 'before'); await save(after, 'after');
        shadows.destroy(); shadows = null;
        for (const effect of effects) check(!effect._texture && !effect._mask && !effect._key, 'Teardown retained native shadow resources');
        for (const sample of samples) check(!sample.box.get_effect('iridescence-shadow'), 'Teardown retained OSD effect');
        writeText(directory.get_child('result.json'), JSON.stringify({passed: true, scheme, tint, level, measurements}, null, 2));
    }
});
context = Meta.create_context('Iridescence OSD shadow test');
context.configure(['preview', '--headless', '--wayland', '--no-x11', `--virtual-monitor=${width}x${height}`]);
context.set_plugin_gtype(Plugin.$gtype); context.setup(); context.start(); context.run_main_loop();
if (failure) throw failure;
