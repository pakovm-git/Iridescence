"""Cross-process GTK refresh/lock checks. Run through tests/native-session.py."""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def wait_for(path, process, timeout=5):
    deadline = time.monotonic() + timeout
    while not path.exists() and time.monotonic() < deadline:
        assert process.poll() is None, f'Process exited before writing {path.name}'
        time.sleep(.01)
    assert path.exists(), f'Timed out waiting for {path.name}'


def contrast(environment):
    return subprocess.check_output(['gsettings', 'get', 'org.gnome.desktop.a11y.interface',
        'high-contrast'], env=environment, text=True).strip() == 'true'


def observe(ready, output):
    import gi
    gi.require_version('Gtk', '4.0')
    from gi.repository import Gtk, Gio, GLib
    Gtk.init()
    window = Gtk.Window()
    label = Gtk.Label(label='Probe', css_classes=['probe'])
    window.set_child(label)
    window.present()
    settings = Gio.Settings.new('org.gnome.desktop.a11y.interface')
    gtk_settings = Gtk.Settings.get_default()
    events = []

    def update(settings, _key=None):
        enabled = settings.get_boolean('high-contrast')
        events.append(enabled)
        gtk_settings.set_property('gtk-interface-contrast',
            Gtk.InterfaceContrast.MORE if enabled else Gtk.InterfaceContrast.NO_PREFERENCE)

    update(settings)
    settings.connect('changed::high-contrast', update)
    context = GLib.MainContext.default()

    def settle(seconds):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            while context.pending():
                context.iteration(False)
            time.sleep(.005)

    def color():
        value = label.get_style_context().get_color()
        return [round(value.red, 3), round(value.green, 3), round(value.blue, 3)]

    settle(.1)
    before = color()
    ready.write_text('ready')
    settle(1)
    output.write_text(json.dumps({'before': before, 'after': color(), 'events': events}))
    window.destroy()


def run():
    temporary = Path(os.environ['IRIDESCENCE_NATIVE_TEST_ROOT']).resolve()
    configuration = Path(os.environ['XDG_CONFIG_HOME']).resolve()
    assert temporary.is_relative_to('/tmp') and configuration.is_relative_to(temporary)
    assert os.environ['DBUS_SESSION_BUS_ADDRESS'] == f'unix:path={temporary}/bus'
    environment = dict(os.environ, GSETTINGS_BACKEND='dconf')
    gtk = configuration / 'gtk-4.0'
    gtk.mkdir(parents=True, exist_ok=True)
    children = []
    service = subprocess.Popen(['/usr/libexec/dconf-service'], env=environment,
        stdout=subprocess.DEVNULL)
    children.append(service)

    def helper():
        child = subprocess.Popen(['gjs', '-m', str(ROOT / 'gtk-refresh-helper.js')],
            env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        children.append(child)
        return child

    def finished(child, expected):
        stdout, stderr = child.communicate(timeout=4)
        assert child.returncode == expected, (child.returncode, stdout, stderr)
        return stderr

    try:
        results = []
        for original, count, terminate in [(False, 1, False), (False, 2, False),
                (True, 2, False), (False, 1, True)]:
            subprocess.run(['gsettings', 'set', 'org.gnome.desktop.a11y.interface',
                'high-contrast', str(original).lower()], env=environment, check=True)
            payload = gtk / 'payload.css'
            payload.write_text('.probe { color: rgb(255,0,0); }')
            (gtk / 'gtk.css').write_text('@import "payload.css";\n')
            ready, output = configuration / 'ready', configuration / 'result.json'
            ready.unlink(missing_ok=True)
            output.unlink(missing_ok=True)
            observer = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                '--observe', str(ready), str(output)], env=environment,
                stdout=subprocess.DEVNULL)
            children.append(observer)
            wait_for(ready, observer)
            payload.write_text('/* neutralized */\n')
            helpers = []
            for _ in range(count):
                helpers.append(helper())
                time.sleep(.03)
            if terminate:
                deadline = time.monotonic() + 1
                while not contrast(environment) and time.monotonic() < deadline:
                    time.sleep(.01)
                assert contrast(environment), 'Helper never started its pulse'
                helpers[0].send_signal(signal.SIGTERM)
            for child in helpers:
                finished(child, 1 if terminate else 0)
            assert observer.wait(timeout=4) == 0
            result = json.loads(output.read_text())
            assert contrast(environment) == original, result
            assert result['before'] == [1, 0, 0] and result['after'] != result['before'], result
            result.update(original=original, helpers=count, terminated=terminate)
            results.append(result)

        # A distinct owner holds a temporary accessibility value while both queued
        # cancellation and acquisition timeout must leave that value alone.
        lock_ready = configuration / 'lock-ready'
        holder = configuration / 'hold-lock.js'
        holder.write_text("""import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
const settings = new Gio.Settings({schema_id:'org.gnome.desktop.a11y.interface'});
const loop = new GLib.MainLoop(null,false);
let original, timer;
const owner = Gio.bus_own_name(Gio.BusType.SESSION,
 'org.gnome.Shell.Extensions.Iridescence.GtkRefresh', Gio.BusNameOwnerFlags.NONE,
 null, () => {
 original=settings.get_boolean('high-contrast');
 settings.set_boolean('high-contrast',!original); Gio.Settings.sync();
 Gio.File.new_for_path(ARGV[0]).replace_contents('ready',null,false,0,null);
 timer=GLib.timeout_add(GLib.PRIORITY_DEFAULT,2600,()=>{
 settings.set_boolean('high-contrast',original); Gio.Settings.sync();
 Gio.bus_unown_name(owner); loop.quit(); return GLib.SOURCE_REMOVE;
 });
 },null);
loop.run();
""")
        owner = subprocess.Popen(['gjs', '-m', str(holder), str(lock_ready)], env=environment)
        children.append(owner)
        wait_for(lock_ready, owner)
        temporary_value = contrast(environment)
        waiting, cancelled = helper(), helper()
        time.sleep(.08)
        cancelled.send_signal(signal.SIGTERM)
        finished(cancelled, 1)
        assert contrast(environment) == temporary_value, 'Queued cancellation restored another owner\'s value'
        message = finished(waiting, 1)
        assert 'busy' in message, message
        assert contrast(environment) == temporary_value, 'Acquisition timeout restored another owner\'s value'
        assert owner.wait(timeout=4) == 0
        assert not contrast(environment), 'Lock owner failed to restore its initial value'
        print(json.dumps(results))
        print('Native GTK refresh: cross-process CSS reload, serialized helpers, original values, SIGTERM, queued cancellation and acquisition timeout passed')
    finally:
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--observe':
        observe(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        run()
