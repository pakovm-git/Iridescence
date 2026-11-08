"""Focused native pathbar regression; run through native-session.py with SCHEME TINT LEVEL."""
import ctypes
import json
from pathlib import Path
import re
import subprocess
import sys
import time

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Adw, Gdk, GLib, Gtk
from PIL import Image, ImageChops, ImageDraw

root = Path(__file__).resolve().parents[1]
scheme, tint, level = sys.argv[1:]
assert scheme in ['light', 'dark'] and tint in ['subtle', 'balanced', 'rich']
mode, opacity = {'airy': ('translucent', 65), 'dense': ('translucent', 90), 'opaque': ('solid', 90)}[level]
name = f'{scheme}-{tint}-{level}'
out = root / 'output/notification-osd-navbar' / name
out.mkdir(parents=True, exist_ok=True)
Adw.init()
Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if scheme == 'dark' else Adw.ColorScheme.FORCE_LIGHT)
display = Gdk.Display.get_default()
native = Gtk.CssProvider()
native.load_from_string(subprocess.check_output(['gresource', 'extract', '/usr/bin/nautilus', '/org/gnome/nautilus/style.css'], text=True))
Gtk.StyleContext.add_provider_for_display(display, native, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
css = subprocess.check_output(['node', '--input-type=module', '-e', "import{readFileSync}from'node:fs';import{makeGtkStyles}from'./styles.js';process.stdout.write(makeGtkStyles(process.argv[1],process.argv[2],readFileSync('themes/gtk.css','utf8'),Number(process.argv[3])));", tint, mode, str(opacity)], cwd=root, text=True)
provider = Gtk.CssProvider()
provider.set_property('prefers-color-scheme', Gtk.InterfaceColorScheme.DARK if scheme == 'dark' else Gtk.InterfaceColorScheme.LIGHT)
errors = []
provider.connect('parsing-error', lambda _p, _section, error: errors.append(str(error)))
provider.load_from_string(css)
assert not errors, errors
Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_USER)
# Reconstruct only the two pre-fix pathbar properties, retaining all current other styling.
before_override = Gtk.CssProvider()
before_override.load_from_string('.nautilus-pathbar { --iridescence-base-shadow: 0 0 transparent; --iridescence-outer-shadow: var(--iridescence-shadow); box-shadow: var(--iridescence-base-shadow), var(--iridescence-outer-shadow); }')
def create_window():
    window = Adw.Window(title=name, default_width=1100)
    body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=30, margin_start=32, margin_end=32, margin_top=30, margin_bottom=30)
    window.set_content(body)
    widgets = {}
    def row(label, widget):
        box = Gtk.Box(spacing=25)
        box.append(Gtk.Label(label=label, width_request=160, xalign=0))
        widget.set_halign(Gtk.Align.START)
        box.append(widget)
        body.append(box)
        widgets[label] = widget

    pathbar = Gtk.Box(css_classes=['linked', 'nautilus-pathbar'], width_request=280)
    scroll = Gtk.ScrolledWindow(hscrollbar_policy=Gtk.PolicyType.EXTERNAL, vscrollbar_policy=Gtk.PolicyType.NEVER)
    buttons = Gtk.Box()
    scroll.set_child(buttons)
    scroll.set_hexpand(True)
    pathbar.append(scroll)
    for label, classes in [('Home', []), ('Documents', ['current-dir'])]:
        button = Gtk.Button(label=label, css_classes=['flat', 'nautilus-path-button'] + classes, focusable=False)
        buttons.append(button)
    buttons.get_first_child().set_state_flags(Gtk.StateFlags.PRELIGHT, False)
    pathbar.append(Gtk.MenuButton(icon_name='view-more-symbolic', css_classes=['flat'], focusable=False))
    row('Native pathbar', pathbar)
    linked = Gtk.Box(css_classes=['linked'])
    linked.append(Gtk.Button(label='Previous', focusable=False))
    linked.append(Gtk.Button(label='Next', focusable=False))
    row('Generic linked', linked)
    controls = Gtk.Box(spacing=22)
    for label, classes, state in [('Filled', [], None), ('Flat', ['flat'], None), ('Hover', ['flat'], Gtk.StateFlags.PRELIGHT), ('Checked', [], Gtk.StateFlags.CHECKED), ('Focus', [], Gtk.StateFlags.FOCUSED | Gtk.StateFlags.FOCUS_VISIBLE), ('Disabled', [], Gtk.StateFlags.INSENSITIVE), ('Opaque', ['opaque'], None)]:
        button = Gtk.Button(label=label, css_classes=classes, focusable=False)
        if state: button.set_state_flags(state, False)
        controls.append(button)
    row('Shared controls', controls)
    window.present()
    return window, widgets, pathbar
window, widgets, pathbar = create_window()
context = GLib.MainContext.default()
def settle():
    for _ in range(16):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
gtk = ctypes.CDLL('libgtk-4.so.1')
gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3
gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
gtk.gsk_render_node_write_to_file.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
def save(widget, filename):
    snapshot = Gtk.Snapshot.new()
    Gtk.WidgetPaintable.new(widget).snapshot(snapshot, widget.get_width(), widget.get_height())
    node = gtk.gtk_snapshot_to_node(hash(snapshot))
    viewport = (ctypes.c_float * 4)(0, 0, widget.get_width(), widget.get_height())
    texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
    assert gtk.gdk_texture_save_to_png(texture, str(filename).encode())
    gtk.gsk_render_node_write_to_file(node, str(filename.with_suffix('.node')).encode(), None)
    return Image.open(filename).convert('RGBA')
def bounds():
    return {name: [round(rect.get_x()), round(rect.get_y()), round(rect.get_width()), round(rect.get_height())] for name, widget in widgets.items() for ok, rect in [widget.compute_bounds(window)] if ok}
Gtk.StyleContext.add_provider_for_display(display, before_override, Gtk.STYLE_PROVIDER_PRIORITY_USER + 1)
settle()
before = save(window, out / 'gtk-navbar-before.png')
window_rgb = before.getpixel((before.width - 30, before.height // 2))[:3]
assert (max(window_rgb) < 128 if scheme == 'dark' else min(window_rgb) > 128), (scheme, 'wrong native window palette', window_rgb)
old_bounds = bounds()
save(pathbar, out / 'gtk-pathbar-before.png')
window.destroy()
Gtk.StyleContext.remove_provider_for_display(display, before_override)
window, widgets, pathbar = create_window()
settle()
after = save(window, out / 'gtk-navbar-after.png')
assert after.getpixel((after.width - 30, after.height // 2))[:3] == window_rgb, 'Native window palette changed'
assert old_bounds == bounds(), 'Widget geometry changed'
save(pathbar, out / 'gtk-pathbar-after.png')
save(widgets['Generic linked'], out / 'gtk-linked-after.png')
linked_nodes = (out / 'gtk-linked-after.node').read_text()
_, _, linked_width, linked_height = old_bounds['Generic linked']
assert not any(f'outline: 0 0 {linked_width} {linked_height}' in shadow for shadow in re.findall(r'inset-shadow\s*\{([^{}]*)\}', linked_nodes)), 'Generic linked group gained a container frame'
for label in ['Generic linked', 'Shared controls']:
    x, y, w, h = old_bounds[label]
    area = (x-12, y-12, x+w+12, y+h+12)
    assert ImageChops.difference(before.crop(area), after.crop(area)).convert('RGB').getbbox() is None, (name, label, 'changed')
x, y, w, h = old_bounds['Native pathbar']
interior = (x+10, y+2, x+w-10, y+h-2)
assert ImageChops.difference(before.crop(interior), after.crop(interior)).convert('RGB').getbbox() is None, 'Native fill/text changed'
assert ImageChops.difference(before.crop((x-12,y-12,x+w+12,y+h+12)), after.crop((x-12,y-12,x+w+12,y+h+12))).convert('RGB').getbbox(), 'Pathbar correction not visible'
old_nodes = (out / 'gtk-pathbar-before.node').read_text()
new_nodes = (out / 'gtk-pathbar-after.node').read_text()
assert 'outset-shadow' in old_nodes and 'outset-shadow' not in new_nodes, 'Exterior shadow not removed'
surface_nodes = new_nodes.split('transform {', 1)[0]
assert 'inset-shadow' in surface_nodes and f'outline: 0 0 {w} {h} / 9;' in surface_nodes and 'spread: 1;' in surface_nodes, 'Native rounded container frame missing'
frame_color = re.search(r'inset-shadow\s*\{\s*color: ([^;]+);', surface_nodes)[1]
assert frame_color in re.findall(r'inset-shadow\s*\{\s*color: ([^;]+);', linked_nodes), 'Pathbar stroke differs from shared control stroke'
comparison = Image.new('RGBA', (before.width, before.height*2), '#1e1e1e' if scheme == 'dark' else '#fafafa')
comparison.alpha_composite(before, (0,0)); comparison.alpha_composite(after, (0,before.height))
ImageDraw.Draw(comparison).text((8,4),'Before: no container stroke / exterior shadow',fill='white' if scheme=='dark' else 'black')
ImageDraw.Draw(comparison).text((8,before.height+4),'After: midpoint container stroke / no exterior shadow',fill='white' if scheme=='dark' else 'black')
comparison.save(out / 'gtk-navbar-comparison.png')
checks = {'variant': name, 'window_rgb': window_rgb, 'bounds': old_bounds, 'geometry_preserved': True, 'generic_linked_identical': True, 'shared_controls_identical': True, 'pathbar_interior_identical': True, 'pathbar_shadow_removed': True, 'native_radius_preserved': True, 'css_parse_errors': errors}
(out / 'gtk-navbar-checks.json').write_text(json.dumps(checks, indent=2))
print(json.dumps(checks))
window.destroy()
