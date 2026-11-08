"""Native GTK pixel regressions. Run with an isolated display, e.g. GTK Broadway.
Requires Python GI and Pillow for testing only; writes screenshots to the given directory.
"""
import ctypes
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import gi
from PIL import Image

gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, Gdk, GLib

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
assert output.is_relative_to('/tmp'), 'use an isolated output directory under /tmp'
output.mkdir(parents=True, exist_ok=True)
config = output / 'config'
config.mkdir(exist_ok=True)
os.environ['XDG_CONFIG_HOME'] = str(config)
presets = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {readFileSync} from 'node:fs';
import {makeGtkStyles, TINTS, OPACITY} from './styles.js';
const source = readFileSync('themes/gtk.css', 'utf8');
console.log(JSON.stringify([{name: 'original', alpha: 1, css: source},
    ...Object.keys(TINTS).flatMap(tint => Object.entries(OPACITY).map(([transparency, alpha]) =>
        ({name: `${tint}-${transparency}`, alpha: transparency === 'solid' ? 1 : .9, css: makeGtkStyles(tint, transparency, source)})))]));
"""], cwd=root, text=True))
Adw.init()
Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
accent = Gtk.CssProvider()
accent.load_from_string('@define-color accent_bg_color #c88800;')
Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), accent, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
# Read GTK's actual symbolic colors, including aliases, rather than inferring RGB from CSS text.
def over(foreground, background):
    alpha = foreground[3] + background[3] * (1 - foreground[3])
    return [((foreground[c] * foreground[3] + background[c] * background[3] *
              (1 - foreground[3])) / alpha) if alpha else 0 for c in range(3)] + [alpha]


color_names = list(dict.fromkeys(re.findall(r'@define-color ([\w_]+)', (root / 'themes/gtk.css').read_text())))
untinted = ['window_fg_color', 'view_fg_color', 'headerbar_fg_color', 'sidebar_fg_color',
            'accent_bg_color', 'accent_fg_color', 'theme_selected_bg_color']
inner_roles = {'view_bg_color', 'headerbar_bg_color', 'headerbar_backdrop_color', 'theme_base_color', 'sidebar_bg_color', 'sidebar_backdrop_color', 'secondary_sidebar_bg_color', 'secondary_sidebar_backdrop_color'}
color_names += [name for name in untinted if name not in color_names]
palettes = {}
for dark in [False, True]:
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
    for preset in presets:
        provider = Gtk.CssProvider()
        provider.set_property('prefers-color-scheme', Gtk.InterfaceColorScheme.DARK if dark else Gtk.InterfaceColorScheme.LIGHT)
        provider.load_from_string(preset['css'])
        display = Gdk.Display.get_default()
        Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_USER)
        context = Gtk.Box().get_style_context()
        colors = {}
        for name in color_names:
            found, color = context.lookup_color(name)
            assert found, ('missing original color', dark, preset['name'], name)
            colors[name] = tuple(getattr(color, c) for c in ['red', 'green', 'blue', 'alpha'])
        palettes[dark, preset['name']] = colors
        Gtk.StyleContext.remove_provider_for_display(display, provider)
    assert palettes[dark, 'original'] == palettes[dark, 'balanced-solid'], 'Balanced Solid changed original named colors'
    for preset in presets[1:]:
        solid = palettes[dark, preset['name'].split('-')[0] + '-solid']
        for name, color in palettes[dark, preset['name']].items():
            # The original selected-accent alias is not a tinted surface.
            surface = re.match(r'^(?:window_bg|view_bg|headerbar_(?:bg|backdrop)|(?:secondary_)?sidebar_(?:bg|backdrop)|panel_bg|theme_bg|theme_base)_color$', name)
            factor = preset['alpha'] if surface else 1
            if preset['name'].endswith('-translucent') and name in inner_roles:
                factor = .35 if 'sidebar' in name else .1
            expected_alpha = solid[name][3] * factor
            assert all(abs(a - b) < 1e-6 for a, b in zip(color[:3], solid[name][:3])), (
                'changed original RGB role', dark, preset['name'], name, color, solid[name])
            assert abs(color[3] - expected_alpha) < 1e-6, (
                'wrong original role alpha', dark, preset['name'], name, color[3], expected_alpha)
print('Original GTK named colors retain their RGB roles in all six presets.')
# PyGI cannot marshal GskRenderNode; use the public C functions for snapshots.
gtk = ctypes.CDLL('libgtk-4.so.1')
gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]
gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
gtk.gdk_texture_save_to_png.restype = ctypes.c_bool
gtk.gsk_render_node_unref.argtypes = [ctypes.c_void_p]
gtk.g_object_unref.argtypes = [ctypes.c_void_p]


def render(preset, dark, sidebar=False):
    provider = Gtk.CssProvider()
    provider.set_property('prefers-color-scheme', Gtk.InterfaceColorScheme.DARK if dark else Gtk.InterfaceColorScheme.LIGHT)
    errors = []
    provider.connect('parsing-error', lambda _, section, error: errors.append(error.message))
    provider.load_from_string(preset['css'])
    assert not errors, errors
    display = Gdk.Display.get_default()
    Gtk.StyleContext.add_provider_for_display(display, provider, Gtk.STYLE_PROVIDER_PRIORITY_USER)
    window = Adw.Window(default_width=920 if sidebar else 720, default_height=460)
    view = Adw.ToolbarView()
    view.add_top_bar(Adw.HeaderBar())
    page = Adw.PreferencesPage()
    group = Adw.PreferencesGroup(title='Appearance')
    group.add(Adw.ComboRow(title='Tint intensity', model=Gtk.StringList.new(['Subtle', 'Balanced', 'Rich']), selected=1))
    group.add(Adw.ComboRow(title='Transparency', model=Gtk.StringList.new(['Solid', 'Translucent']),
                         selected=1 if preset['name'].endswith('-translucent') else 0))
    group.add(Adw.SwitchRow(title='Tint applications', active=True))
    group.add(Adw.EntryRow(title='Profile name', text='A readable text field'))
    page.add(group)
    view.set_content(page)
    if sidebar:
        navigation = Gtk.ListBox(css_classes=['navigation-sidebar'])
        navigation.append(Gtk.Label(label='Appearance', margin_top=12, margin_bottom=12))
        split = Adw.NavigationSplitView(sidebar=Adw.NavigationPage(title='Settings', child=navigation),
                                        content=Adw.NavigationPage(title='Appearance', child=view))
        window.set_content(split)
    else:
        window.set_content(view)
    window.present()
    context = GLib.MainContext.default()
    for _ in range(30):
        while context.pending():
            context.iteration(False)
        time.sleep(.01)
    snapshot = Gtk.Snapshot.new()
    Gtk.WidgetPaintable.new(window).snapshot(snapshot, window.get_width(), window.get_height())
    node = gtk.gtk_snapshot_to_node(hash(snapshot))
    assert node, 'GTK produced no render node'
    viewport = (ctypes.c_float * 4)(0, 0, window.get_width(), window.get_height())
    texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
    path = output / f"{'dark' if dark else 'light'}-{preset['name']}{'-sidebar' if sidebar else ''}.png"
    assert gtk.gdk_texture_save_to_png(texture, str(path).encode()), 'could not save GTK snapshot'
    gtk.g_object_unref(texture)
    gtk.gsk_render_node_unref(node)
    window.destroy()
    Gtk.StyleContext.remove_provider_for_display(display, provider)
    return Image.open(path).convert('RGBA')




def assert_pixel(actual, expected, *where):
    expected = [round(channel * 255) for channel in expected]
    assert all(abs(a - b) <= 3 for a, b in zip(actual, expected)), (*where, actual, expected)


for dark in [False, True]:
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
    original = None
    for preset in presets:
        image = render(preset, dark)
        palette = palettes[dark, preset['name']]
        base = palette['window_bg_color']
        assert_pixel(image.getpixel((50, 300)), base, 'wrong original window fill', dark, preset['name'])
        if preset['name'] == 'original':
            original = image
        elif preset['name'] == 'balanced-solid':
            assert image.tobytes() != original.tobytes(), ('Solid must add the mandatory contrast treatment', dark)
        sidebar = render(preset, dark, sidebar=True)
        assert_pixel(sidebar.getpixel((30, 300)), over(palette['sidebar_bg_color'], base),
                     'wrong native sidebar composition', dark, preset['name'])
        assert_pixel(sidebar.getpixel((400, 400)), base,
                     'sidebar changed content fill', dark, preset['name'])
        if preset['name'] != 'original':
            for region, sample in [('header', image.getpixel((100, 20))),
                                   ('sidebar', sidebar.getpixel((30, 300))),
                                   ('body', sidebar.getpixel((400, 400)))]:
                assert (sample[3] == 255 if preset['name'].endswith('-solid') else
                        228 <= sample[3] <= (241 if region == 'sidebar' else 235)), (
                    'final visible GTK opacity is uneven', dark, preset['name'], region, sample)
print('All six GTK presets preserve original Solid colors with mandatory contrast: Translucent windows/headers near 90–91%, sidebars near 94% with original distinct colors.')
