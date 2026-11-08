"""Render native contrast states with real GTK widgets; use a private test display."""
import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import time

if '--render' in sys.argv:
    import gi
    gi.require_version('Gtk', '4.0')
    gi.require_version('Adw', '1')
    from gi.repository import Gtk, Adw, GLib, Gio
    Adw.init()
    Gtk.Settings.get_default().set_property('gtk-enable-animations', False)
    Gtk.Settings.get_default().set_property('gtk-decoration-layout', ':minimize,maximize,close')
    variant, enabled, filename = sys.argv[2:]
    Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if variant.startswith('dark') else Adw.ColorScheme.FORCE_LIGHT)
    provider = Gtk.CssProvider()
    provider.load_from_string(subprocess.check_output(['gresource', 'extract', '/usr/bin/nautilus', '/org/gnome/nautilus/style.css'], text=True))
    window = Adw.Window(title='Iridescence contrast', default_width=780)
    Gtk.StyleContext.add_provider_for_display(window.get_display(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
    body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    header = Adw.HeaderBar(title_widget=Adw.WindowTitle(title=f'{variant.title()} · Contrast {enabled.upper()}', subtitle='Native GTK · Translucent · No blur'))
    body.append(header)
    grid = Gtk.Grid(column_spacing=28, row_spacing=20, margin_start=32, margin_end=32, margin_top=24, margin_bottom=96)
    body.append(grid)
    widgets = {}
    def row(name, widget, state=None):
        y = len(widgets)
        widget.set_focusable(False)
        if state: widget.set_state_flags(state, False)
        widget.set_halign(Gtk.Align.START)
        grid.attach(Gtk.Label(label=name, xalign=0), 0, y, 1, 1)
        grid.attach(widget, 1, y, 1, 1)
        widgets[name] = widget
    row('Filled button', Gtk.Button(label='Button'))
    row('Opaque button', Gtk.Button(label='Opaque button', css_classes=['opaque']))
    row('Opaque menu', Gtk.MenuButton(label='Opaque menu', css_classes=['opaque'], popover=Gtk.Popover()))
    row('Opaque split', Adw.SplitButton(label='Opaque split', css_classes=['opaque'], popover=Gtk.Popover()))
    row('Menu button', Gtk.MenuButton(label='Menu', popover=Gtk.Popover()))
    row('Split button', Adw.SplitButton(label='Split button', popover=Gtk.Popover()))
    row('Flat · idle', Gtk.Button(label='Flat button', css_classes=['flat']))
    row('Flat · hover', Gtk.Button(label='Hovered button', css_classes=['flat']), Gtk.StateFlags.PRELIGHT)
    row('Suggested action', Gtk.Button(label='Apply', css_classes=['suggested-action']))
    row('Suggested menu', Gtk.MenuButton(label='Apply menu', css_classes=['suggested-action'], popover=Gtk.Popover()))
    row('Suggested split', Adw.SplitButton(label='Apply split', css_classes=['suggested-action'], popover=Gtk.Popover()))
    row('Destructive action', Gtk.Button(label='End process', css_classes=['destructive-action']))
    row('Keyboard focus', Gtk.Button(label='Focused button'), Gtk.StateFlags.FOCUSED | Gtk.StateFlags.FOCUS_VISIBLE)
    row('Disabled', Gtk.Button(label='Disabled', sensitive=False))
    row('Search field', Gtk.SearchEntry(placeholder_text='Search processes'))
    row('Text field', Gtk.Entry(text='Text input'))
    row('Focused field', Gtk.Entry(text='Focused input'), Gtk.StateFlags.FOCUS_WITHIN)
    row('Spin field', Gtk.SpinButton.new_with_range(0, 100, 1))
    card = Gtk.Box(css_classes=['card'], margin_top=4)
    card.append(Gtk.Label(label='Card · existing shadow', margin_start=18, margin_end=18, margin_top=12, margin_bottom=12))
    row('Card', card)
    scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
    scale.set_value(50)
    scale.set_draw_value(False)
    scale.set_size_request(220, -1)
    row('Scale', scale)
    switches = {}
    for name, active in [('Switch idle', False), ('Switch checked', True)]:
        switches[name] = Gtk.Switch(active=active)
        row(name, switches[name])
    floating = Gtk.Box(css_classes=['floating-bar'])
    floating.append(Gtk.Label(label='1 file selected (9.5 kB)'))
    row('Nautilus status', floating)
    sidebar = Gtk.ListBox(css_classes=['navigation-sidebar'], selection_mode=Gtk.SelectionMode.NONE)
    for name, state in [('Idle', None), ('Hover', Gtk.StateFlags.PRELIGHT),
                        ('Selected', Gtk.StateFlags.SELECTED), ('Pressed', Gtk.StateFlags.ACTIVE),
                        ('Disabled', Gtk.StateFlags.PRELIGHT | Gtk.StateFlags.INSENSITIVE),
                        ('Focus', Gtk.StateFlags.SELECTED | Gtk.StateFlags.FOCUSED | Gtk.StateFlags.FOCUS_VISIBLE)]:
        item = Gtk.ListBoxRow(child=Gtk.Label(label=name), margin_bottom=12, focusable=False)
        sidebar.append(item)
        if state: item.set_state_flags(state, False)
        widgets['Sidebar ' + name] = item
    row('Sidebar highlights', sidebar)
    factory = Gtk.SignalListItemFactory()
    def setup(_factory, item):
        cell = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8, margin_start=12, margin_end=12, margin_top=12, margin_bottom=12)
        cell.append(Gtk.Image(icon_name='folder', pixel_size=48))
        cell.append(Gtk.Label())
        item.set_child(cell)
    factory.connect('setup', setup)
    factory.connect('bind', lambda _factory, item: item.get_child().get_last_child().set_label(item.get_item().get_string()))
    files = Gtk.GridView(model=Gtk.SingleSelection(model=Gtk.StringList.new(['Projects', 'Documents'])), factory=factory, max_columns=2, min_columns=2)
    row('File selection', Gtk.Box(css_classes=['nautilus-grid-view'], width_request=240))
    widgets['File selection'].append(files)
    group = Adw.PreferencesGroup()
    group.add(Adw.ActionRow(title='Preference card', subtitle='One outer edge'))
    group.add(Adw.ActionRow(title='Another setting'))
    row('Preference card', group)
    for name, role in [('Banner main', None), ('Banner sidebar', 'sidebar-pane'), ('Banner secondary', 'secondary')]:
        banner = Adw.Banner(title='Informational banner', revealed=True)
        container = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, width_request=300, css_classes=['sidebar-pane'] if role else [])
        container.append(banner)
        if role == 'secondary':
            outer = Gtk.Box(css_classes=['content-pane'])
            middle = Gtk.Box()
            middle.append(container)
            outer.append(middle)
            container = outer
        row(name, container)
    info = Gtk.InfoBar(message_type=Gtk.MessageType.WARNING)
    info.add_child(Gtk.Label(label='Warning message'))
    row('InfoBar', info)
    pathbar = Gtk.Box(css_classes=['nautilus-pathbar'])
    for text in ['Home', 'Projects']:
        pathbar.append(Gtk.Button(label=text, css_classes=['flat'], focusable=False))
    pathbar.get_first_child().set_state_flags(Gtk.StateFlags.PRELIGHT, False)
    row('Path bar', pathbar)
    toggles = Adw.ToggleGroup()
    for name in ['First', 'Second']: toggles.add(Adw.Toggle(name=name, label=name))
    row('Segments', toggles)
    tabs = Adw.TabView()
    for title in ['Selected tab', 'Idle tab']:
        tabs.append(Gtk.Label(label=title)).set_title(title)
    tabbar = Adw.TabBar(view=tabs, autohide=False, expand_tabs=False, width_request=360)
    row('Tabs', tabbar)
    class DragSurface(Gtk.Box):
        __gtype_name__ = 'IridescenceTestDragSurface'
    class DragTab(Gtk.Box):
        __gtype_name__ = 'IridescenceTestDragTab'
    DragSurface.set_css_name('dnd')
    DragTab.set_css_name('tab')
    drag_surface = DragSurface()
    drag_tab = DragTab(width_request=220)
    drag_tab.append(Gtk.Label(label='Dragged tab'))
    drag_surface.append(drag_tab)
    row('Dragged tab', drag_surface)
    widgets['Dragged tab body'] = drag_tab
    notebook = Gtk.Notebook()
    for title in ['First', 'Second']: notebook.append_page(Gtk.Box(), Gtk.Label(label=title))
    row('Notebook tabs', notebook)
    menu_model = Gio.Menu()
    menu_model.append('Highlighted menu item', 'test.item')
    menu_model.append('Idle menu item', 'test.item')
    popover = Gtk.PopoverMenu.new_from_model(menu_model)
    actions = Gio.SimpleActionGroup()
    actions.add_action(Gio.SimpleAction.new('item', None))
    body.insert_action_group('test', actions)
    menu_button = Gtk.MenuButton(label='Native popup menu', popover=popover)
    header.pack_start(menu_button)
    toast_overlay = Adw.ToastOverlay(child=body)
    toast_overlay.add_toast(Adw.Toast(title='Toast · native solid backing', timeout=0))
    def find(widget, name):
        if isinstance(widget, Gtk.Button) and widget.has_css_class(name): return widget
        child = widget.get_first_child()
        while child:
            found = find(child, name)
            if found: return found
            child = child.get_next_sibling()
    window.set_content(toast_overlay)
    window.present()
    context = GLib.MainContext.default()
    for _ in range(35):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
    def descendants(widget):
        yield widget
        child = widget.get_first_child()
        while child:
            yield from descendants(child)
            child = child.get_next_sibling()
    widgets['File tile'] = next(w for w in descendants(files) if w.get_css_name() == 'child' and w.get_state_flags() & Gtk.StateFlags.SELECTED)
    for name, switch in switches.items():
        widgets[name + ' thumb'] = next(w for w in descendants(switch) if w.get_css_name() == 'slider')
    widgets['Scale thumb'] = next(w for w in descendants(scale) if w.get_css_name() == 'slider')
    widgets['Toast'] = next(w for w in descendants(toast_overlay) if w.get_css_name() == 'toast')
    controls = {name: find(header, name) for name in ['minimize', 'maximize', 'close']}
    assert all(controls.values())
    controls['maximize'].set_state_flags(Gtk.StateFlags.PRELIGHT, False)
    controls['close'].set_state_flags(Gtk.StateFlags.PRELIGHT | Gtk.StateFlags.ACTIVE, False)
    for _ in range(10):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
    gtk = ctypes.CDLL('libgtk-4.so.1')
    gtk.gtk_snapshot_to_node.argtypes = [ctypes.c_void_p]
    gtk.gtk_snapshot_to_node.restype = ctypes.c_void_p
    gtk.gsk_renderer_render_texture.argtypes = [ctypes.c_void_p] * 3
    gtk.gsk_renderer_render_texture.restype = ctypes.c_void_p
    gtk.gdk_texture_save_to_png.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
    gtk.gsk_render_node_write_to_file.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
    def save(widget, path):
        snapshot = Gtk.Snapshot.new()
        Gtk.WidgetPaintable.new(widget).snapshot(snapshot, widget.get_width(), widget.get_height())
        node = gtk.gtk_snapshot_to_node(hash(snapshot))
        viewport = (ctypes.c_float * 4)(0, 0, widget.get_width(), widget.get_height())
        gtk.gsk_render_node_write_to_file(node, (path + '.node').encode(), None)
        texture = gtk.gsk_renderer_render_texture(hash(window.get_renderer()), node, viewport)
        assert gtk.gdk_texture_save_to_png(texture, path.encode())
    save(window, filename)
    for name in ['Opaque split', 'Suggested split']:
        save(widgets[name], filename + '.' + name.replace(' ', '-') + '.png')
    bounds = {}
    for name, widget in widgets.items():
        ok, rect = widget.compute_bounds(window)
        assert ok
        bounds[name] = [round(rect.get_x()), round(rect.get_y()), round(rect.get_width()), round(rect.get_height())]
    for name, control in controls.items():
        ok, rect = control.compute_bounds(window)
        ok_image, image_rect = control.get_first_child().compute_bounds(window)
        assert ok and ok_image
        bounds['window-' + name] = [round(rect.get_x()), round(rect.get_y()), round(rect.get_width()), round(rect.get_height())]
        bounds['image-' + name] = [round(image_rect.get_x()), round(image_rect.get_y()), round(image_rect.get_width()), round(image_rect.get_height())]
    menu_items = [w for w in descendants(popover) if w.get_css_name() == 'modelbutton']
    assert len(menu_items) == 2
    menu_items[0].set_state_flags(Gtk.StateFlags.PRELIGHT, False)
    popover.popup()
    for _ in range(20):
        while context.pending(): context.iteration(False)
        time.sleep(.01)
    save(popover, filename + '.menu.png')
    menu_bounds = []
    for index, item in enumerate(menu_items):
        ok, rect = item.compute_bounds(popover)
        assert ok
        menu_bounds.append([round(rect.get_x()),round(rect.get_y()),round(rect.get_width()),round(rect.get_height())])
        save(item, filename + f'.menu-{index}.png')
    Path(filename + '.menu.json').write_text(json.dumps(menu_bounds))
    print(json.dumps(bounds))
    Path(filename + '.bounds.json').write_text(json.dumps(bounds, indent=2))
    window.destroy()
    raise SystemExit

from PIL import Image, ImageChops
root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
opacity = int(sys.argv[2]) if len(sys.argv) > 2 else 90
assert opacity in [65, 90]
for variant in [f'{mode}-{transparency}-{tint}' for mode in ['light', 'dark']
                for transparency in ['translucent', 'solid'] for tint in ['subtle', 'balanced', 'rich']]:
    renders = {}
    for enabled in ['off', 'on']:
        config = Path('/tmp/iridescence-shadows-gtk') / f'{variant}-{enabled}'
        (config / 'gtk-4.0').mkdir(parents=True, exist_ok=True)
        css = subprocess.check_output(['node', '--input-type=module', '-e', f"import {{readFileSync}} from 'node:fs'; import {{makeGtkStyles}} from './styles.js'; process.stdout.write(makeGtkStyles('{variant.split('-')[2]}','{variant.split('-')[1]}',readFileSync('themes/gtk.css','utf8'),{opacity}));"], cwd=root, text=True)
        if enabled == 'off':
            css = css.split('/* Native contrast strokes;', 1)[0] + '/* Restored extra shadows (B). */' + css.split('/* Restored extra shadows (B). */', 1)[1]
        (config / 'gtk-4.0/gtk.css').write_text(css)
        filename = output / f'gtk-{variant}-{enabled}.png'
        result = subprocess.run([sys.executable, __file__, '--render', variant, enabled, str(filename)], env=dict(os.environ, XDG_CONFIG_HOME=str(config), GSETTINGS_BACKEND='memory'), text=True, capture_output=True)
        assert result.returncode == 0, result.stderr
        assert not any(word in result.stderr for word in ['CRITICAL', 'Theme parser error', 'Traceback']), result.stderr
        renders[enabled] = (Image.open(filename).convert('RGBA'), json.loads(result.stdout))
    before, bounds = renders['off']
    for effect in ['on']:
        after, after_bounds = renders[effect]
        assert before.size == after.size and bounds == after_bounds, 'Contrast must not change geometry'
        changes = {}
        x,y,w,h = after_bounds['Nautilus status']
        assert after.getpixel((x+w-8,y+h-5))[3] == 255, 'Nautilus selection status must remain opaque'
        assert before.getpixel((x+w-8,y+h-5))[3] == 255, 'Nautilus selection status must be opaque with contrast off too'
        for name in ['Card', 'Preference card']:
            x,y,w,h = after_bounds[name]
            assert before.getpixel((x+w-10,y+h-10))[3] == after.getpixel((x+w-10,y+h-10))[3] == 255, (variant, name, 'cards must stay opaque')
        x,y,w,h = after_bounds['Dragged tab body']
        assert after.getpixel((x+w-10,y+h//2))[3] == 255, (variant, 'dragged tab must stay opaque')
        for name in ['Banner main', 'Banner sidebar', 'Banner secondary', 'InfoBar']:
            x,y,w,h = after_bounds[name]
            assert after.getpixel((x+20,y+10))[3] == 255, (variant, name, 'native alert backing must stay opaque')
        for name in ['Opaque button', 'Opaque menu', 'Opaque split']:
            x,y,w,h = after_bounds[name]
            assert after.getpixel((x+w//2,y+h-6))[3] >= 252, (variant, name, 'preserve native opaque backing')
        for name in ['Scale thumb', 'Switch idle thumb', 'Switch checked thumb']:
            x,y,w,h = after_bounds[name]
            assert after.getpixel((x+w//2,y+4))[3] == 255, (variant, name, 'thumb must stay opaque')
        for control in ['minimize', 'maximize', 'close']:
            x,y,w,h = bounds['window-' + control]
            # The hit-area corners sit outside the circular image and must not acquire an outline.
            for dx,dy in [(1,1),(w-2,1),(1,h-2),(w-2,h-2)]:
                assert before.getpixel((x+dx,y+dy)) == after.getpixel((x+dx,y+dy)), (variant,control,'square hit-area decoration')
        for name, (x,y,w,h) in bounds.items():
            if name.startswith(('window-', 'image-', 'Banner')) or name.endswith(' thumb') or name == 'InfoBar': continue
            area = (x-5,y-5,x+w+5,y+h+5)
            changed = ImageChops.difference(before.crop(area), after.crop(area)).convert('RGB').getbbox() is not None
            changes[name] = changed
            if name == 'Sidebar highlights': continue
            unchanged = ['Opaque button', 'Opaque menu', 'Suggested action', 'Suggested menu', 'Destructive action', 'Flat · idle', 'Switch idle', 'Switch checked', 'Nautilus status', 'Sidebar Idle', 'Dragged tab', 'Dragged tab body', 'Notebook tabs']
            assert changed == (name not in unchanged), (variant,effect,name,changed)
        x,y,w,h = bounds['Toast']
        assert before.getpixel((x+w//2,y+5))[3] == after.getpixel((x+w//2,y+5))[3] == 255, 'Toast must stay solid'
        menu_before = Image.open(output / f'gtk-{variant}-off.png.menu.png').convert('RGBA')
        menu_after = Image.open(output / f'gtk-{variant}-on.png.menu.png').convert('RGBA')
        menu_bounds = json.loads((output / f'gtk-{variant}-off.png.menu.json').read_text())
        assert menu_bounds == json.loads((output / f'gtk-{variant}-on.png.menu.json').read_text()), 'Menu geometry changed'
        for i,(x,y,w,h) in enumerate(menu_bounds):
            # Isolate each item so the hovered neighbor's soft shadow does not count as idle styling.
            item_before = Image.open(output / f'gtk-{variant}-off.png.menu-{i}.png').convert('RGBA')
            item_after = Image.open(output / f'gtk-{variant}-on.png.menu-{i}.png').convert('RGBA')
            changed = ImageChops.difference(item_before, item_after).convert('RGB').getbbox() is not None
            assert changed == (i == 0), ('Menu highlight only', variant, i, changed)
        nodes = (output / f'gtk-{variant}-{effect}.png.node').read_text()
        assert 'inset-shadow' in nodes, 'Native GTK inset strokes must be painted'
        expected_alpha = '0.196'
        assert 'outset-shadow' in nodes and f'color: rgba(0,0,0,{expected_alpha});' in nodes, 'Option B GTK exterior shadow must render at the specified opacity'
        assert f'shadows: rgba(0,0,0,{expected_alpha})' not in nodes, 'Do not shadow widget contents/text with a filter'
        (output / f'gtk-{variant}-{effect}-checks.json').write_text(json.dumps(changes, indent=2))
print('Native GTK contrast: controls, cards, highlighted sidebar/file/menu items, path bars, tabs, segments and toasts covered; native flat/colored/disabled/focus states checked, geometry identical, status/toasts solid in Light/Dark.')
