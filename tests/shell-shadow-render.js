// Run with the installed Shell/Mutter typelibs and a private XDG_RUNTIME_DIR.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import {makeShellStyles} from '../styles.js';
import {ShellShadows} from '../shell-shadows.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';

const [variant, output, level = 'airy', tint = 'balanced'] = ARGV;
const opacity = level === 'dense' ? 90 : 65;
const transparency = level === 'opaque' ? 'solid' : 'translucent';
const directory = Gio.File.new_for_path(output);
if (!directory.query_exists(null)) directory.make_directory_with_parents(null);
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
const check = (value, message) => { if (!value) throw Error(message); };
let context, failure, shadows;
const Plugin = GObject.registerClass(class IridescenceShadowTest extends Meta.Plugin {
    vfunc_start() { this.run().catch(error => { failure = error; shadows?.destroy(); context.terminate(); }); }

    async run() {
        const stage = context.get_backend().get_stage();
        stage.set_size(600, 860); stage.show();
        stage.add_child(new St.Widget({width: 600, height: 860, style: 'background-color: #78938d;'}));
        const css = makeShellStyles(readText(root.get_child(`themes/shell-${variant}.css`)).text, variant === 'dark', {opacity, transparency, tint});
        const stylesheet = directory.get_child(`shell-${variant}.css`);
        writeText(stylesheet, css);
        const native = Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${variant}.css`);
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({default_stylesheet: native, application_stylesheet: stylesheet}));
        const column = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, x: 36, y: 24, width: 528, style: 'spacing: 20px;'});
        stage.add_child(column);
        column.add_child(new St.Label({text: `${level[0].toUpperCase() + level.slice(1)} · ${variant} · native Shell`, style: 'color:white;font-weight:bold;'}));
        const menu = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'popup-menu-content', style: 'spacing: 16px; padding: 20px;'});
        column.add_child(menu);
        const search = new St.Entry({hint_text: 'Search applications', style_class: 'search-entry', can_focus: false});
        column.insert_child_below(search, menu);
        const controls = [search];
        for (const [text, style_class, state] of [['Idle button', 'button', ''], ['Hover button', 'button', 'hover'],
            ['Focus button', 'button', 'focus'], ['Wi-Fi', 'quick-toggle button', 'checked'],
            ['Neutral quick setting', 'quick-toggle button', ''], ['Hovered menu item', 'popup-menu-item', 'hover']]) {
            const control = new St.Button({label: text, style_class});
            if (state) control.add_style_pseudo_class(state);
            menu.add_child(control); controls.push(control);
        }
        const banner = new St.Button({style_class: 'message notification-banner', label: 'Floating notification · soft shadow'});
        const card = new St.Button({style_class: 'message', label: 'Pending notification · no surface shadow'});
        const flat = new St.Button({style_class: 'button flat', label: 'Flat control · shadow only on hover'});
        menu.add_child(flat);
        const transparent = new St.Button({style_class: 'button', label: 'Transparent control · no shadow', style: 'background-color: transparent;'});
        menu.add_child(transparent);
        column.add_child(banner);
        const stack = new St.Widget({height: 110});
        const stackBackings = ['lower-in-stack', 'second-in-stack'].map((state, i) => {
            const backing = new St.Button({style_class: 'message', x: 12 - i * 6, y: 20 - i * 10, width: 504 + i * 12, height: 70});
            backing.add_style_pseudo_class(state);
            stack.add_child(backing);
            return backing;
        });
        card.set_size(528, 70);
        stack.add_child(card);
        column.add_child(stack);
        await wait(200);
        const geometry = control => [control.x, control.y, control.width, control.height].join(',');
        const outline = control => {
            const shadow = control.get_theme_node().get_box_shadow();
            return shadow ? [shadow.inset, shadow.spread, shadow.color.red, shadow.color.green, shadow.color.blue, shadow.color.alpha].join(',') : '';
        };
        const before = controls.map(control => [geometry(control), outline(control), control.get_parent()]);
        const save = name => new Promise((resolve, reject) => {
            const image = stage.paint_to_content(new Mtk.Rectangle({x: 0, y: 0, width: 600, height: 860}), 1, stage.get_color_state(), Clutter.PaintFlag.NONE);
            const stream = directory.get_child(`shell-${variant}-${name}.png`).replace(null, false, 0, null);
            Shell.Screenshot.composite_to_stream(image.get_texture(), 0, 0, 600, 860, 1, null, 0, 0, 1, stream, (_object, result) => {
                try { Shell.Screenshot.composite_to_stream_finish(result); stream.close(null); resolve(); } catch (error) { reject(error); }
            });
        });
        await save('before');
        shadows = new ShellShadows(stage);
        await wait(200);
        for (let i = 0; i < controls.length; i++) {
            const control = controls[i];
            check(control.get_effect('iridescence-shadow')?._texture, `${variant}: ${control.label} has a painted shadow`);
            check(geometry(control) === before[i][0] && outline(control) === before[i][1] && control.get_parent() === before[i][2], 'Shadow preserves geometry, outline and parent');
        }
        check(search.get_theme_node().lookup_shadow('-iridescence-shadow', false)[1]?.blur === 2, 'Overview search shadow uses the compact blur');
        check(banner.get_effect('iridescence-shadow')?._texture, 'Banner shadow restored');
        check(!card.get_effect('iridescence-shadow'), 'Pending notification cards remain shadow-free');
        for (const backing of stackBackings) {
            const node = backing.get_theme_node();
            const alpha = node.get_border_color(St.Side.TOP).alpha;
            check(node.get_border_width(St.Side.TOP) === 1 && !node.get_box_shadow() && Math.abs(alpha - 26) <= 1,
                'Stack indicator paints its physical 1px border');
            check(alpha < card.get_theme_node().get_border_color(St.Side.TOP).alpha, 'Stack border stays softer than main card');
            check(!backing.get_effect('iridescence-shadow'), 'Stack indicators remain surface-shadow-free');
        }
        check(!flat.get_effect('iridescence-shadow'), 'Unpainted flat controls remain shadow-free');
        check(!transparent.get_effect('iridescence-shadow'), 'Inherited shadow selectors cannot paint an empty control');
        flat.add_style_pseudo_class('hover'); await wait(100);
        check(flat.get_effect('iridescence-shadow')?._texture, 'Flat controls receive shadows when highlighted');
        flat.remove_style_pseudo_class('hover'); await wait(100);
        check(!flat.get_theme_node().lookup_shadow('-iridescence-shadow', false)[1]?.color.alpha, 'Flat controls lose their decorative shadow when unhighlighted');
        check(!flat.get_effect('iridescence-shadow'), 'Unhighlighted controls release their per-frame shadow effect');
        const effect = controls[0].get_effect('iridescence-shadow');
        const texture = effect._texture;
        controls[0].add_style_pseudo_class('hover'); await wait(100);
        check(effect._texture === texture, 'Hover reuses the cached exterior shadow texture');
        const dynamic = new St.Button({label: 'New control', style_class: 'button'});
        menu.add_child(dynamic); await wait(100);
        check(dynamic.get_effect('iridescence-shadow')?._texture, 'New controls receive shadows');
        dynamic.destroy();
        check(!shadows._actors.has(dynamic), 'Destroyed controls are released');
        controls[0].remove_style_pseudo_class('hover'); await wait(100);
        await save('after');
        const masks = shadows._masks;
        shadows.destroy();
        check(shadows._actors.size === 0 && !stage.get_children().includes(masks), 'Disable removes every hook and mask');
        for (const control of controls) check(!control.get_effect('iridescence-shadow'), 'Disable removes effects');
        shadows = null;
        column.destroy();
        const summary = `${variant}: shadows painted for idle/hover/focus/checked controls and banners; geometry, outlines, cache, dynamic actors and cleanup verified.`;
        writeText(directory.get_child(`shell-${variant}-result.json`), JSON.stringify({passed: true, summary}));
        print(summary);
    }
});
context = Meta.create_context('Iridescence shadow checks');
context.configure(['preview', '--headless', '--wayland', '--no-x11', '--virtual-monitor=600x860']);
context.set_plugin_gtype(Plugin.$gtype);
context.setup(); context.start(); context.run_main_loop();
if (failure) throw failure;
