"""Native Settings swatch regression; requires GNOME Settings and a private GTK display.
Run with GDK_BACKEND=broadway and an output directory under /tmp.
"""
import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time

if len(sys.argv) > 2 and sys.argv[1] == '--render':
    import gi
    gi.require_version('Gtk', '4.0')
    gi.require_version('Adw', '1')
    from gi.repository import Gtk, Adw, GLib
    from PIL import Image
    Adw.init()
    Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
    dark = sys.argv[3] == 'dark'
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
    provider = Gtk.CssProvider()
    provider.load_from_string(subprocess.check_output(['gresource', 'extract', '/usr/bin/gnome-control-center', '/org/gnome/control-center/background/preview.css'], text=True))
    window = Adw.Window(title='Settings accent color regression', default_width=560)
    Gtk.StyleContext.add_provider_for_display(window.get_display(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
    body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=18, margin_start=24, margin_end=24, margin_top=24, margin_bottom=24)
    grid = Gtk.Grid(column_spacing=12, row_spacing=12)
    widgets = {}
    colors = ['blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink', 'purple', 'slate']
    for y, state in enumerate(['normal', 'checked', 'hover', 'pressed', 'focus']):
        grid.attach(Gtk.Label(label=state.title(), xalign=0), 0, y, 1, 1)
        for x, name in enumerate(colors):
            button = Gtk.ToggleButton(css_classes=['accent-button', name])
            if state == 'checked': button.set_active(True)
            if state in ['hover', 'pressed', 'focus']:
                button.set_state_flags({'hover': Gtk.StateFlags.PRELIGHT, 'pressed': Gtk.StateFlags.ACTIVE, 'focus': Gtk.StateFlags.FOCUSED | Gtk.StateFlags.FOCUS_VISIBLE}[state], False)
            grid.attach(button, x + 1, y, 1, 1)
            widgets[f'{state}-{name}'] = button
    body.append(grid)
    window.set_content(body)
    window.present()
    context = GLib.MainContext.default()
    for _ in range(40):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
    gtk = ctypes.CDLL('libgtk-4.so.1')
    gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
    gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
    gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3
    gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
    gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    snapshot = Gtk.Snapshot.new()
    Gtk.WidgetPaintable.new(window).snapshot(snapshot, window.get_width(), window.get_height())
    node = gtk.gtk_snapshot_to_node(hash(snapshot))
    viewport = (ctypes.c_float * 4)(0, 0, window.get_width(), window.get_height())
    texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
    assert gtk.gdk_texture_save_to_png(texture, sys.argv[2].encode())
    image = Image.open(sys.argv[2]).convert('RGBA')
    samples = {}
    for name, widget in widgets.items():
        ok, rect = widget.compute_bounds(window)
        assert ok
        samples[name] = image.getpixel((round(rect.get_x() + rect.get_width() / 2), round(rect.get_y() + rect.get_height() / 2)))
    print(json.dumps(samples))
    window.destroy()
    raise SystemExit

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
assert output.is_relative_to('/tmp')
output.mkdir(parents=True, exist_ok=True)
presets = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {readFileSync} from 'node:fs'; import {makeGtkStyles,TINTS,OPACITY} from './styles.js';
const source=readFileSync('themes/gtk.css','utf8');
console.log(JSON.stringify({original:source,...Object.fromEntries(Object.keys(TINTS).flatMap(t=>Object.keys(OPACITY).map(p=>[`${t}-${p}`,makeGtkStyles(t,p,source)])))}));
"""], cwd=root, text=True))
results = {}
for mode in ['light', 'dark']:
    for name, css in presets.items():
        config = output / f'{mode}-{name}'
        (config / 'gtk-4.0').mkdir(parents=True, exist_ok=True)
        (config / 'gtk-4.0/gtk.css').write_text(css)
        result = json.loads(subprocess.check_output([sys.executable, __file__, '--render', str(config / 'render.png'), mode], env=dict(os.environ, XDG_CONFIG_HOME=str(config), GSETTINGS_BACKEND='memory'), text=True))
        results[f'{mode}-{name}'] = result
(output / 'pixels.json').write_text(json.dumps(results, indent=2))
for mode in ['light', 'dark']:
    original = results[f'{mode}-original']
    assert len({tuple(pixel) for key, pixel in original.items() if key.startswith('normal-')}) == 9
    for name in presets:
        for key, pixel in results[f'{mode}-{name}'].items():
            assert pixel[3] == 255, (mode, name, key, 'swatch must be opaque', pixel)
            assert all(abs(a-b) <= 1 for a,b in zip(pixel, original[key])), (mode, name, key, 'original swatch color', pixel, original[key])
print('All nine native Settings swatches match original colors in five states, all presets, Light/Dark.')
