"""Render GTK's automatic user-CSS import in an isolated Broadway display.

Run with GDK_BACKEND=broadway, BROADWAY_DISPLAY and XDG_RUNTIME_DIR set;
the argument is a directory under /tmp for isolated configs and screenshots.
No CssProvider is injected: this covers the path real applications use.
"""
import ctypes
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


def render(path, dark, root_view=False, window_control_state="normal"):
    import gi
    gi.require_version('Gtk', '4.0')
    gi.require_version('Adw', '1')
    from gi.repository import Gtk, Adw, GLib
    Adw.init()
    Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
    Gtk.Settings.get_default().set_property('gtk-decoration-layout', ':minimize,maximize,close')
    Adw.StyleManager.get_default().set_color_scheme(
        Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
    # Nautilus's window template puts .view on the top-level ApplicationWindow.
    window_type = Adw.ApplicationWindow if root_view else Adw.Window
    window = window_type(default_width=1000, default_height=800)
    if root_view:
        window.add_css_class('view')
    toolbar = Adw.ToolbarView()
    header = Adw.HeaderBar()
    header_button = Gtk.ToggleButton(icon_name='system-search-symbolic', active=True)
    header.pack_start(header_button)
    toolbar.add_top_bar(header)
    body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=20,
                   margin_start=24, margin_end=24, margin_top=20, margin_bottom=24)
    group = Adw.PreferencesGroup()
    combo = Adw.ComboRow(title='Tint intensity', selected=1,
                        model=Gtk.StringList.new(['Subtle', 'Balanced', 'Rich']))
    combo.set_selected(1)
    group.add(combo)
    entry = Adw.EntryRow(title='Profile name', text='A readable text field')
    group.add(entry)
    body.append(group)
    floating = Gtk.Box(css_classes=['floating-bar'], halign=Gtk.Align.END)
    floating.append(Gtk.Label(label='1 document selected (9.5 kB)'))
    body.append(floating)
    views = Gtk.Box(spacing=20, homogeneous=True, vexpand=True)
    text = Gtk.TextView()
    factory = Gtk.SignalListItemFactory()
    factory.connect('setup', lambda _, item: item.set_child(Gtk.Label()))
    factory.connect('bind', lambda _, item: item.get_child().set_label(item.get_item().get_string()))
    listing = Gtk.ListView(model=Gtk.NoSelection(model=Gtk.StringList.new([])), factory=factory)
    columns = Gtk.ColumnView(model=Gtk.NoSelection(model=Gtk.StringList.new([])))
    columns.append_column(Gtk.ColumnViewColumn(title='Files', factory=factory))
    resources_provider = Gtk.CssProvider()
    # Pin the fixture accent so live desktop accent changes cannot invalidate the comparisons.
    resources_provider.load_from_string('''@define-color accent_bg_color #c88800; .resources-columnview { background-color: @window_bg_color; }
        /* Original Nautilus floating status bar, from its embedded style.css. */
        .floating-bar { padding: 3px; background-color: var(--view-bg-color); box-shadow: inset 0 100px 0 0 color-mix(in srgb, currentColor 10%, transparent); border-radius: 12px; }
        .floating-bar:backdrop { background-color: @view_bg_color; }''')
    Gtk.StyleContext.add_provider_for_display(window.get_display(), resources_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
    resources = Gtk.ColumnView(model=Gtk.NoSelection(model=Gtk.StringList.new([])), css_classes=['resources-columnview'])
    resources.append_column(Gtk.ColumnViewColumn(title='Processes', factory=factory))
    for view in [text, listing, columns, resources]:
        views.append(view)
    body.append(views)
    controls = {}
    grid = Gtk.Grid(column_spacing=16, row_spacing=12, column_homogeneous=True)
    for y, kind in enumerate(['normal', 'flat', 'destructive']):
        for x, state in enumerate(['normal', 'hover', 'pressed', 'checked']):
            button = Gtk.ToggleButton(label=f'{kind.title()} · {state}')
            if kind != 'normal':
                button.add_css_class('destructive-action' if kind == 'destructive' else kind)
            if state == 'checked':
                button.set_active(True)
            elif state != 'normal':
                button.set_state_flags(Gtk.StateFlags.PRELIGHT if state == 'hover' else Gtk.StateFlags.ACTIVE, False)
            grid.attach(button, x, y, 1, 1)
            controls[f'{kind}-{state}'] = button
    controls['search'] = Gtk.SearchEntry(placeholder_text='Search processes')
    controls['suggested'] = Gtk.Button(label='Suggested action', css_classes=['suggested-action'])
    controls['inline'] = Gtk.Button(label='Original inline rule', css_classes=['inline', 'flat'])
    controls['disabled'] = Gtk.Button(label='Disabled', sensitive=False)
    for x, name in enumerate(['search', 'suggested', 'inline', 'disabled']):
        grid.attach(controls[name], x, 3, 1, 1)
    body.append(grid)
    toolbar.set_content(body)
    footer = Gtk.Box(height_request=54, spacing=12)
    footer.append(Gtk.Label(label='Process actions', hexpand=True))
    split = Adw.SplitButton(label='End process', css_classes=['destructive-action'], margin_end=16)
    footer.append(split)
    toolbar.add_bottom_bar(footer)
    window.set_content(toolbar)
    def find(widget, predicate):
        if predicate(widget):
            return widget
        child = widget.get_first_child()
        while child:
            found = find(child, predicate)
            if found:
                return found
            child = child.get_next_sibling()

    window_buttons = {name: find(header, lambda w: isinstance(w, Gtk.Button) and w.has_css_class(name))
                      for name in ['minimize', 'maximize', 'close']}
    assert all(window_buttons.values()), 'missing native window control'
    flags = {'focus': Gtk.StateFlags.FOCUSED, 'hover': Gtk.StateFlags.PRELIGHT, 'pressed': Gtk.StateFlags.ACTIVE}
    for button in window_buttons.values():
        if window_control_state in flags:
            button.set_state_flags(flags[window_control_state], False)
        if window_control_state == 'keyboard':
            button.add_css_class('keyboard-activating')
    window.present()
    context = GLib.MainContext.default()
    for _ in range(40):
        while context.pending():
            context.iteration(False)
        time.sleep(.01)
    # PyGI cannot marshal GskRenderNode; these are the public GTK C functions.
    gtk = ctypes.CDLL('libgtk-4.so.1')
    gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
    gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
    gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3
    gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
    gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    gtk.gdk_texture_save_to_png.restype = ctypes.c_bool
    from PIL import Image

    def capture(widget, filename):
        snapshot = Gtk.Snapshot.new()
        Gtk.WidgetPaintable.new(widget).snapshot(snapshot, widget.get_width(), widget.get_height())
        node = gtk.gtk_snapshot_to_node(hash(snapshot))
        assert node, 'no GTK render node'
        viewport = (ctypes.c_float * 4)(0, 0, widget.get_width(), widget.get_height())
        texture = gtk.gsk_renderer_render_texture(hash(widget.get_native().get_renderer()), node, viewport)
        assert gtk.gdk_texture_save_to_png(texture, str(filename).encode()), 'PNG save failed'
        return Image.open(filename).convert('RGBA')

    image = capture(window, path)

    def pixel(widget, x=.8, y=.8):
        ok, bounds = widget.compute_bounds(window)
        assert ok, 'widget not allocated'
        return image.getpixel((round(bounds.get_x() + bounds.get_width() * x),
                               round(bounds.get_y() + bounds.get_height() * y)))


    samples = {'floating-bar': pixel(floating, .5, .95), 'header': pixel(header, .1, .5),
               'window': image.getpixel((12, window.get_height() // 2)),
               'text': pixel(text), 'list': pixel(listing), 'column': pixel(columns),
               'resources': pixel(resources), 'footer': pixel(footer, .03, .5),
               'header-button': pixel(header_button, .5, .85),
               'combo': pixel(combo, .5, .9), 'entry': pixel(entry, .5, .9),
               'option': pixel(find(combo, lambda w: isinstance(w, Gtk.Label) and w.get_label() == 'Balanced' and w.get_mapped()), .98, .98),
               'column-header': pixel(find(columns, lambda w: w.get_css_name() == 'button'), .5, .85),
               'split': pixel(find(split, lambda w: isinstance(w, Gtk.Button)), .5, .85)}
    samples.update({name: pixel(widget, .5, .85) for name, widget in controls.items()})
    for name, button in window_buttons.items():
        samples[f'window-control-{name}-{window_control_state}'] = pixel(button.get_first_child(), .5, .9)
    if window_control_state != 'normal':
        window.destroy()
        return {'pixels': samples}
    names = list(dict.fromkeys(re.findall(r'@define-color ([\w_]+)',
        (Path(__file__).resolve().parents[1] / 'themes/gtk.css').read_text())))
    names += ['window_fg_color', 'view_fg_color', 'headerbar_fg_color', 'sidebar_fg_color',
              'accent_bg_color', 'accent_fg_color']
    palette = {}
    for name in names:
        found, color = window.get_style_context().lookup_color(name)
        assert found, ('missing original named color', name)
        palette[name] = [getattr(color, channel) for channel in ['red', 'green', 'blue', 'alpha']]

    def settle():
        for _ in range(25):
            while context.pending():
                context.iteration(False)
            time.sleep(.01)

    popup = Gtk.Popover(child=Gtk.Box(width_request=320, height_request=180))
    popup.set_parent(header_button)
    popup.popup()
    settle()
    popup_image = capture(popup, path.with_name(path.stem + '-popover.png'))
    samples['popover'] = popup_image.getpixel((popup_image.width // 2, popup_image.height // 2))
    popup.popdown()
    popup.unparent()
    dialog = Adw.MessageDialog(transient_for=window, heading='Original dialog appearance',
                               body='This dialog should remain solid.')
    dialog.add_response('close', 'Close')
    dialog.present()
    settle()
    dialog_image = capture(dialog, path.with_name(path.stem + '-dialog.png'))
    samples['dialog'] = dialog_image.getpixel((dialog_image.width // 2, 12))
    dialog.destroy()
    _, floating_bounds = floating.compute_bounds(window)
    window.destroy()
    return {'pixels': samples, 'palette': palette, 'floating_rect': [floating_bounds.get_x(), floating_bounds.get_y(), floating_bounds.get_width(), floating_bounds.get_height()]}


if len(sys.argv) > 2 and sys.argv[1] == '--render':
    path = Path(sys.argv[2])
    result = render(path, '--dark' in sys.argv, '--root-view' in sys.argv)
    for state in ['focus', 'hover', 'pressed', 'keyboard']:
        sample = render(path.with_stem(path.stem + '-window-controls-' + state), '--dark' in sys.argv, '--root-view' in sys.argv, state)
        result['pixels'].update({key: value for key, value in sample['pixels'].items() if key.startswith('window-control-')})
    print(json.dumps(result))
    raise SystemExit

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
assert output.is_relative_to('/tmp'), 'use an isolated output directory under /tmp'
output.mkdir(parents=True, exist_ok=True)
presets = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {readFileSync} from 'node:fs';
import {makeGtkStyles, TINTS, OPACITY} from './styles.js';
const source = readFileSync('themes/gtk.css', 'utf8');
console.log(JSON.stringify([{name: 'original', alpha: 1, css: source},
    ...Object.keys(TINTS).flatMap(tint => Object.entries(OPACITY).map(([transparency, alpha]) =>
        ({name: `${tint}-${transparency}`, alpha: transparency === 'solid' ? 1 : .9, css: makeGtkStyles(tint, transparency, source)})))]));
"""], cwd=root, text=True))
results = {}
for dark in [False, True]:
    mode = 'dark' if dark else 'light'
    for preset in presets:
        config = output / f'{mode}-{preset["name"]}'
        (config / 'gtk-4.0').mkdir(parents=True, exist_ok=True)
        (config / 'iridescence').mkdir(exist_ok=True)
        style = config / 'iridescence/gtk.css'
        style.write_text(preset['css'])
        (config / 'gtk-4.0/gtk.css').write_text(f'@import url("{style.as_uri()}");\n')
        environment = dict(os.environ, XDG_CONFIG_HOME=str(config), GSETTINGS_BACKEND='memory')
        for root_view in [False, True]:
            suffix = '-root-view' if root_view else ''
            command = [sys.executable, __file__, '--render', str(config / f'render{suffix}.png')]
            if dark:
                command.append('--dark')
            if root_view:
                command.append('--root-view')
            results[f'{mode}-{preset["name"]}{suffix}'] = json.loads(
                subprocess.check_output(command, env=environment, text=True))
(output / 'pixels.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results, indent=2))
def assert_pixel(actual, expected, *where):
    expected = [round(channel * 255) for channel in expected]
    assert all(abs(a - b) <= 3 for a, b in zip(actual, expected)), (*where, actual, expected)


def over(foreground, background):
    alpha = foreground[3] + background[3] * (1 - foreground[3])
    return [((foreground[c] * foreground[3] + background[c] * background[3] *
              (1 - foreground[3])) / alpha) if alpha else 0 for c in range(3)] + [alpha]


def luminance(color):
    return sum((channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4) * weight
               for channel, weight in zip(color, [.2126, .7152, .0722]))


for mode in ['light', 'dark']:
    for suffix in ['', '-root-view']:
        assert results[f'{mode}-balanced-solid{suffix}']['palette'] == results[f'{mode}-original{suffix}']['palette'], (
            'Balanced Solid changed original GTK colors', mode, suffix)
        for preset in presets:
            name = preset['name']
            rendered = results[f'{mode}-{name}{suffix}']
            sample, palette = rendered['pixels'], rendered['palette']
            if name != 'original':
                for region in ['header', 'window', 'text', 'list', 'column', 'resources', 'footer']:
                    alpha = sample[region][3]
                    assert (alpha == 255 if name.endswith('-solid') else 228 <= alpha <= 235), (
                        'final visible opacity differs between GTK regions', mode, name, suffix, region, alpha)
            if name.endswith('-translucent'):
                solid_pixels = results[f'{mode}-{name.split("-")[0]}-solid{suffix}']['pixels']
                for kind, fills in [('normal', [10, 15, 30, 30]), ('flat', [0, 7, 16, 10]), ('destructive', [15, 20, 35, 35])]:
                    for state, fill in zip(['normal','hover','pressed','checked'], fills):
                        face = fill / 100 * (1 if kind == 'destructive' else palette['window_fg_color'][3])
                        expected_alpha = face + sample['window'][3] / 255 * (1 - face)
                        assert abs(sample[f'{kind}-{state}'][3] - round(expected_alpha * 255)) <= 3, ('native control shading without solid backing', mode,name,kind,state,sample[f'{kind}-{state}'],expected_alpha)
                for control in [key for key in sample if key.startswith('window-control-')]:
                    face = .15 if control.endswith('-hover') else .3 if control.endswith('-pressed') else .1
                    face *= palette['headerbar_fg_color'][3]
                    if control.endswith('-keyboard'):
                        # Native keyboard activation shades the button behind its circular image.
                        face += .16 * palette['headerbar_fg_color'][3] * (1 - face)
                    expected_alpha = face + sample['header'][3] / 255 * (1 - face)
                    assert abs(sample[control][3] - round(expected_alpha * 255)) <= 3, ('native window control face', mode,name,control,sample[control],expected_alpha)
                for control in ['search']:
                    assert sample[control][3] < 255, ('field unexpectedly has an opaque backing',mode,name,control)
                for control in ['flat-normal', 'inline']:
                    assert abs(sample[control][3] - sample['window'][3]) <= 1, (
                        'originally flat control acquired an opaque backing', mode, name, control)
                assert abs(sample['column-header'][3] - sample['column'][3]) <= 1, (
                    'native table headings acquired a button fill', mode, name, sample['column-header'], sample['column'])
                for surface in ['popover', 'dialog']:
                    assert sample[surface] == solid_pixels[surface] and sample[surface][3] == 255, (
                        'popup or dialog lost its original solid appearance', mode, name, surface, sample[surface], solid_pixels[surface])
            base = palette['view_bg_color' if suffix else 'window_bg_color'][:]
            if suffix:
                base[3] = preset['alpha']
            assert_pixel(sample['window'], base, 'wrong original root fill', mode, name, suffix)
            for region in ['combo', 'entry', 'option']:
                card_base = [*palette['window_bg_color'][:3], 1] if name.endswith('-translucent') else base
                assert_pixel(sample[region], over(palette['card_bg_color'], card_base),
                             'text-bearing cards keep their expected fill', mode, name, suffix, region)
                if name != 'original':
                    assert sample[region][3] == 255, ('cards must stay opaque', mode, name, suffix, region)
                for backdrop in [[122 / 255, 150 / 255, 188 / 255, 1], [239 / 255, 177 / 255, 86 / 255, 1]]:
                    background = over([channel / 255 for channel in sample[region]], backdrop)
                    foreground = over(palette['window_fg_color'], background)
                    light, dark = sorted([luminance(background), luminance(foreground)], reverse=True)
                    assert (light + .05) / (dark + .05) >= 4.5, (
                        'card text lacks contrast on preview backgrounds', mode, name, suffix, region)
            # Views keep their original RGB with only enough fill to shade the transparent root.
            for view in ['text', 'list', 'column']:
                assert_pixel(sample[view], over(palette['view_bg_color'], base),
                             'wrong original view composition', mode, name, suffix, view)
            assert_pixel(sample['resources'], over(palette['view_bg_color'] if name.endswith('-translucent') else palette['window_bg_color'], base),
                         'Resources table must not stack a second window background', mode, name, suffix)
            if name != 'original':
                solid = results[f'{mode}-{name.split("-")[0]}-solid{suffix}']['palette']
                inner_roles = {'view_bg_color', 'headerbar_bg_color', 'headerbar_backdrop_color', 'theme_base_color',
                               'sidebar_bg_color', 'sidebar_backdrop_color', 'secondary_sidebar_bg_color', 'secondary_sidebar_backdrop_color'}
                for role, color in palette.items():
                    surface = re.match(r'^(?:window_bg|view_bg|headerbar_(?:bg|backdrop)|(?:secondary_)?sidebar_(?:bg|backdrop)|panel_bg|theme_bg|theme_base)_color$', role)
                    factor = preset['alpha'] if surface else 1
                    if name.endswith('-translucent') and role in inner_roles:
                        factor = .35 if 'sidebar' in role else .1
                    expected_alpha = solid[role][3] * factor
                    assert all(abs(a - b) < 1e-6 for a, b in zip(color[:3], solid[role][:3])), (
                        'original named RGB changed through GTK import', mode, name, role)
                    assert abs(color[3] - expected_alpha) < 1e-6, (
                        'wrong original role alpha through GTK import', mode, name, role)
    for view in ['window', 'text', 'list', 'column']:
        assert results[f'{mode}-subtle-solid']['pixels'][view] != results[f'{mode}-rich-solid']['pixels'][view], (
            'tint intensity did not change through automatic GTK import', mode, view)
print('Automatic GTK imports preserve original Solid styling, native control shading, original card fills, opaque popups and dialogs, flat controls, 90–91% window/view opacity and consistent Resources tables in both variants.')
