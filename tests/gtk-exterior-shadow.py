"""Real GTK exterior shadow: identical interior/text/outline pixels, changed exterior only."""
import ctypes
import json
from pathlib import Path
import subprocess
import time
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, Gdk, GLib
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
out = root / 'output/exterior-shadow-native'
out.mkdir(parents=True, exist_ok=True)
Adw.init()
Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
def create_window():
    window = Gtk.Window(default_width=680, default_height=480)
    box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=26, margin_start=50, margin_end=50, margin_top=45, margin_bottom=45)
    window.set_child(box)
    widgets = {}
    for name, classes, flags in [
        ('Filled button', [], None), ('Flat idle', ['flat'], None),
        ('Flat hover', ['flat'], Gtk.StateFlags.PRELIGHT),
        ('Focused button', [], Gtk.StateFlags.FOCUSED | Gtk.StateFlags.FOCUS_VISIBLE),
        ('Checked button', [], Gtk.StateFlags.CHECKED), ('Card', ['card'], None),
    ]:
        widget = Gtk.Box(css_classes=classes) if name == 'Card' else Gtk.Button(label='Interior text unchanged', css_classes=classes)
        widget.set_focusable(False)
        widget.set_size_request(240, 42)
        widget.set_halign(Gtk.Align.START)
        if name == 'Card': widget.append(Gtk.Label(label='Card interior unchanged'))
        if flags: widget.set_state_flags(flags, False)
        box.append(widget)
        widgets[name] = widget
    window.present()
    return window, widgets
context = GLib.MainContext.default()
def settle():
    for _ in range(12):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
gtk = ctypes.CDLL('libgtk-4.so.1')
gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3
gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
gtk.gsk_render_node_write_to_file.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
def save(path):
    snapshot = Gtk.Snapshot.new()
    Gtk.WidgetPaintable.new(window).snapshot(snapshot, window.get_width(), window.get_height())
    node = gtk.gtk_snapshot_to_node(hash(snapshot))
    viewport = (ctypes.c_float * 4)(0, 0, window.get_width(), window.get_height())
    texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
    assert gtk.gdk_texture_save_to_png(texture, str(path).encode())
    gtk.gsk_render_node_write_to_file(node, str(path.with_suffix('.node')).encode(), None)
    return Image.open(path).convert('RGBA')

def bounds():
    return {name: tuple(map(round, (r.get_x(), r.get_y(), r.get_width(), r.get_height())))
            for name, w in widgets.items() for ok, r in [w.compute_bounds(window)] if ok}

zero = Gtk.CssProvider()
zero.load_from_string('* { --iridescence-outer-shadow: 0 0 transparent; }')
report=[]
for dark in [False, True]:
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
    for tint in ['subtle', 'balanced', 'rich']:
        for mode, opacity in [('solid',90), ('translucent',65), ('translucent',90)]:
            name=f'{"dark" if dark else "light"}-{tint}-{mode}-{opacity}'
            source=subprocess.check_output(['node','--input-type=module','-e',f"import {{readFileSync}} from 'node:fs';import {{makeGtkStyles}} from './styles.js';process.stdout.write(makeGtkStyles('{tint}','{mode}',readFileSync('themes/gtk.css','utf8'),{opacity}));"],cwd=root,text=True)
            provider=Gtk.CssProvider()
            errors=[]
            provider.connect('parsing-error',lambda _p,section,error: errors.append(str(error)))
            provider.load_from_string(source)
            assert not errors, errors
            display=Gdk.Display.get_default()
            Gtk.StyleContext.add_provider_for_display(display,provider,Gtk.STYLE_PROVIDER_PRIORITY_USER)
            Gtk.StyleContext.add_provider_for_display(display,zero,Gtk.STYLE_PROVIDER_PRIORITY_USER+1)
            window, widgets = create_window()
            settle()
            before=save(out/f'{name}-off.png')
            previous=bounds()
            window.destroy()
            Gtk.StyleContext.remove_provider_for_display(display,zero)
            window, widgets = create_window()
            settle()
            after=save(out/f'{name}-on.png')
            assert previous == bounds(), (name,'geometry changed')
            checks={}
            for widget,(x,y,w,h) in previous.items():
                # Exclude rounded corners while retaining the complete text/filled center and straight outline edges.
                areas=[(x+14,y,x+w-14,y+h),(x,y+14,x+w,y+h-14)]
                for area in areas:
                    assert ImageChops.difference(before.crop(area),after.crop(area)).convert("RGB").getbbox() is None,(name,widget,'interior or straight outline altered')
                area=(x-12,y-12,x+w+12,y+h+12)
                changed=ImageChops.difference(before.crop(area),after.crop(area)).convert("RGB").getbbox() is not None
                assert changed == (widget != 'Flat idle'),(name,widget,'exterior shadow missing or idle flat shadow present')
                checks[widget]=changed
            node=(out/f'{name}-on.node').read_text()
            assert 'outset-shadow' in node and 'inset-shadow' in node, (name,'native clipped exterior plus inset missing')
            assert 'shadows:' not in node,(name,'whole-widget shadow retained')
            report.append({'variant':name,'checks':checks})
            window.destroy()
            Gtk.StyleContext.remove_provider_for_display(display,provider)
(out/'checks.json').write_text(json.dumps(report,indent=2))
print('Native GTK: all 18 light/dark, tint, opacity combinations retain identical interior/text/straight-outline pixels and geometry; exterior shadows present; idle flat controls unchanged.')
