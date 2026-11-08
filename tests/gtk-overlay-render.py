"""Native opaque file-selector/overlay-sidebar regression on a private GTK display."""
import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time

if '--render' in sys.argv:
    import gi
    gi.require_version('Gtk', '4.0'); gi.require_version('Adw', '1')
    from gi.repository import Gtk, Adw, GLib
    Adw.init()
    Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
    variant, kind, filename = sys.argv[2:]
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if variant == 'dark' else Adw.ColorScheme.FORCE_LIGHT)
    window = Adw.Window(default_width=680, default_height=420)
    content = Adw.ToolbarView()
    content.add_top_bar(Adw.HeaderBar(title_widget=Adw.WindowTitle(title=kind.replace('-', ' ').title(), subtitle='Native GTK · Translucent')))
    content.set_content(Gtk.Box())
    if kind.startswith('sidebar-'):
        sidebar = Adw.ToolbarView()
        sidebar.add_top_bar(Adw.HeaderBar(title_widget=Gtk.Label(label='Sidebar'), show_end_title_buttons=False))
        sidebar.set_content(Gtk.Box())
        split = Adw.OverlaySplitView(sidebar=sidebar, content=content, max_sidebar_width=240, sidebar_width_fraction=.35)
        split.set_collapsed(kind == 'sidebar-overlay')
        split.set_show_sidebar(True)
        window.set_content(split)
    else:
        window.add_css_class('view')
        if kind == 'file-selector': window.add_css_class('nautilus-file-chooser')
        window.set_content(content)
    window.present()
    context = GLib.MainContext.default()
    for _ in range(45):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
    gtk = ctypes.CDLL('libgtk-4.so.1')
    gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]; gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
    gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3; gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
    gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    snapshot = Gtk.Snapshot.new()
    Gtk.WidgetPaintable.new(window).snapshot(snapshot, window.get_width(), window.get_height())
    node = gtk.gtk_snapshot_to_node(hash(snapshot)); assert node
    viewport = (ctypes.c_float * 4)(0, 0, window.get_width(), window.get_height())
    texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
    assert gtk.gdk_texture_save_to_png(texture, filename.encode())
    window.destroy()
    raise SystemExit

from PIL import Image
root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve(); output.mkdir(parents=True, exist_ok=True)
opacity = int(sys.argv[2]) if len(sys.argv) > 2 else 90
assert opacity in [65, 90]
css = subprocess.check_output(['node','--input-type=module','-e', "import{readFileSync}from'node:fs';import{makeGtkStyles}from'./styles.js';process.stdout.write(makeGtkStyles('balanced','translucent',readFileSync('themes/gtk.css','utf8'),"+str(opacity)+"));"], cwd=root, text=True)
config = Path('/tmp/iridescence-overlay-check-config'); (config/'gtk-4.0').mkdir(parents=True, exist_ok=True)
(config/'gtk-4.0/gtk.css').write_text(css)
results = {}
for variant in ['light','dark']:
    for kind in ['normal','file-selector','sidebar-expanded','sidebar-overlay']:
        filename = output/f'gtk-{variant}-{kind}.png'
        result = subprocess.run([sys.executable,__file__,'--render',variant,kind,str(filename)],env=dict(os.environ,XDG_CONFIG_HOME=str(config),GSETTINGS_BACKEND='memory'),capture_output=True,text=True)
        assert result.returncode == 0, result.stderr
        assert not any(word in result.stderr for word in ['CRITICAL','Theme parser error']), result.stderr
        im = Image.open(filename).convert('RGBA')
        left,right = im.getpixel((100,250)), im.getpixel((500,250))
        if kind == 'file-selector': assert left[3] == right[3] == 255, (variant,kind,left,right)
        elif kind == 'sidebar-overlay': assert left[3] == 255 and right[3] < 255, (variant,kind,left,right)
        else:
            base = opacity / 100
            assert abs(right[3] - round(base * 255)) <= 3, (variant,kind,'root',right)
            expected_left = round((base + (1-base)*.35 if kind == 'sidebar-expanded' else base)*255)
            assert abs(left[3] - expected_left) <= 3, (variant,kind,'sidebar/root',left,expected_left)
        results[f'{variant}-{kind}'] = {'left':left,'right':right}
(output/'opaque-exceptions.json').write_text(json.dumps(results,indent=2))
print('Native GTK: file-selector windows and overlay sidebars opaque; normal windows and expanded sidebars translucent in Light/Dark.')
