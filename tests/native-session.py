"""Run a command on a private session bus, settings directory and Broadway display."""
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time


def stop(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python tests/native-session.py COMMAND [ARGS...]')
    with tempfile.TemporaryDirectory(prefix='iridescence-native-') as temporary:
        root = Path(temporary)
        environment = dict(os.environ, DBUS_SESSION_BUS_ADDRESS=f'unix:path={root}/bus',
            XDG_RUNTIME_DIR=temporary, XDG_CONFIG_HOME=str(root / 'config'),
            XDG_DATA_HOME=str(root / 'data'), XDG_CACHE_HOME=str(root / 'cache'),
            IRIDESCENCE_NATIVE_TEST_ROOT=temporary, GSETTINGS_BACKEND='dconf',
            GDK_BACKEND='broadway', BROADWAY_DISPLAY=f':{100 + os.getpid() % 10000}')
        for directory in ['config', 'data', 'cache']:
            (root / directory).mkdir()
        configuration = root / 'bus.xml'
        configuration.write_text('<busconfig><type>session</type><auth>EXTERNAL</auth>'
            '<policy context="default"><allow send_destination="*"/>'
            '<allow receive_sender="*"/><allow own="*"/></policy></busconfig>')
        listener = socket.socket(socket.AF_UNIX)
        listener.bind(str(root / 'bus'))
        listener.listen(64)
        launcher = ('import os,sys; fd=int(sys.argv[1]); os.dup2(fd,3); '
            'os.set_inheritable(3,True); env=dict(os.environ,LISTEN_FDS="1",'
            'LISTEN_PID=str(os.getpid())); os.execve("/usr/bin/dbus-broker-launch",'
            '["dbus-broker-launch","--scope","user","--config-file",sys.argv[2]],env)')
        processes = []
        try:
            processes.append(subprocess.Popen([sys.executable, '-c', launcher,
                str(listener.fileno()), str(configuration)], pass_fds=(listener.fileno(),),
                env=environment, stdout=subprocess.DEVNULL))
            listener.close()
            with socket.socket() as port:
                port.bind(('127.0.0.1', 0))
                broadway_port = port.getsockname()[1]
            processes.append(subprocess.Popen(['/usr/bin/gtk4-broadwayd',
                f'--port={broadway_port}', environment['BROADWAY_DISPLAY']],
                env=environment, stdout=subprocess.DEVNULL))
            time.sleep(.3)
            assert all(process.poll() is None for process in processes), 'Private native services failed'
            raise SystemExit(subprocess.run(sys.argv[1:], env=environment, timeout=120).returncode)
        finally:
            listener.close()
            for process in reversed(processes):
                stop(process)
