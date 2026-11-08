import Gtk from 'gi://Gtk?version=4.0';
import {makeGtkStyles} from '../styles.js';
import {readText} from '../prefs-files.js';
import Gio from 'gi://Gio';
const source = readText(Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_child('themes').get_child('gtk.css')).text;
const errors = [];
for (const tint of ['subtle', 'balanced', 'rich']) {
    for (const transparency of ['solid', 'translucent']) for (const opacity of [65, 90]) {
        const provider = new Gtk.CssProvider();
        provider.connect('parsing-error', (_provider, _section, error) => errors.push(error.message));
        provider.load_from_string(makeGtkStyles(tint, transparency, source, opacity));
    }
}
if (errors.length) throw new Error(errors.join('\n'));
print('All 12 GTK opacity/preset combinations parse without warnings or errors');
