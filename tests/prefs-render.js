// Render the actual preferences on an isolated GTK display with temporary settings.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw';
import Graphene from 'gi://Graphene';
import {readText} from '../prefs-files.js';
import {makeGtkStyles} from '../styles.js';
if (GLib.getenv('GSETTINGS_BACKEND') !== 'memory' || !GLib.getenv('XDG_CONFIG_HOME')?.startsWith('/tmp/'))
    throw Error('Use an isolated test display and temporary memory settings.');
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource'));
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const {default: Preferences} = await import(root.get_child('prefs.js').get_uri());
const metadata = JSON.parse(readText(root.get_child('metadata.json')).text);
const prefs = new Preferences({...metadata, path: root.get_path(), dir: root});
const [variant, transparency, page, filename, blurState, opacity = 90] = ARGV;
if (blurState) prefs._hasBlurMyShell = () => blurState !== 'missing';
const settings = prefs.getSettings();
settings.set_enum('gtk-opacity', Number(opacity));
settings.set_boolean('transparency', transparency === 'translucent');
settings.set_boolean('bms-desktop-enabled', blurState === 'active');
Adw.init();
Gtk.Settings.get_default().gtk_enable_animations = false;
Adw.StyleManager.get_default().set_color_scheme(variant === 'dark' ? Adw.ColorScheme.FORCE_DARK : Adw.ColorScheme.FORCE_LIGHT);
const provider = new Gtk.CssProvider();
provider.set_property('prefers-color-scheme', variant === 'dark' ? Gtk.InterfaceColorScheme.DARK : Gtk.InterfaceColorScheme.LIGHT);
provider.load_from_string(makeGtkStyles('balanced', transparency, readText(root.get_child('themes/gtk.css')).text, Number(opacity)));
Gtk.StyleContext.add_provider_for_display(imports.gi.Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_USER);
const window = new Adw.PreferencesWindow({title: 'Iridescence'});
prefs.fillPreferencesWindow(window);
function find(widget) {
    if (widget instanceof Adw.PreferencesPage && widget.title === page) return widget;
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling()) {
        const found = find(child);
        if (found) return found;
    }
}
window.set_visible_page(find(window));
window.present();
const loop = new GLib.MainLoop(null, false);
let failure;
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 450, () => {
    try {
        const snapshot = new Gtk.Snapshot();
        Gtk.WidgetPaintable.new(window).snapshot(snapshot, window.get_width(), window.get_height());
        const node = snapshot.to_node();
        const rect = new Graphene.Rect({origin: new Graphene.Point({x: 0, y: 0}), size: new Graphene.Size({width: window.get_width(), height: window.get_height()})});
        const texture = window.get_renderer().render_texture(node, rect);
        if (!texture.save_to_png(filename)) throw Error('Could not save native preferences preview');
        node.write_to_file(filename + '.node');
    } catch (error) { failure = error; } finally {
        window.destroy();
        loop.quit();
    }
    return GLib.SOURCE_REMOVE;
});
loop.run();
if (failure) throw failure;
