"""Check extension rendering/cleanup in private compositor servers, then stop them."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
level = sys.argv[2] if len(sys.argv) > 2 else 'airy'
assert level in ['airy', 'dense', 'opaque']
tint = sys.argv[3] if len(sys.argv) > 3 else 'balanced'
assert tint in ['subtle', 'balanced', 'rich']
typelibs = [Path('/usr/lib64/gnome-shell'), *Path('/usr/lib64').glob('mutter-*')]
paths = ':'.join(str(path) for path in typelibs)
for variant in ['light', 'dark']:
    result = output / f'shell-{variant}-result.json'
    result.unlink(missing_ok=True)
    with tempfile.TemporaryDirectory(prefix='iridescence-shell-') as runtime:
        env = dict(os.environ, XDG_RUNTIME_DIR=runtime, XDG_CONFIG_HOME=runtime,
                   GSETTINGS_BACKEND='memory', GI_TYPELIB_PATH=paths, LD_LIBRARY_PATH=paths)
        with (output / f'shell-{variant}.log').open('w+') as log:
            server = subprocess.Popen(['gjs', '-m', str(root / 'tests/shell-shadow-render.js'), variant, str(output), level, tint],
                                      cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
            try:
                deadline = time.monotonic() + 20
                while not result.exists() and server.poll() is None and time.monotonic() < deadline:
                    time.sleep(.05)
                log.flush(); log.seek(0)
                diagnostics = log.read()
                assert result.exists(), diagnostics or 'Native shadow check timed out'
                assert not any(message in diagnostics for message in ['CRITICAL', 'JS ERROR', 'WARNING']), diagnostics
                report = json.loads(result.read_text())
                assert report['passed'] and server.poll() is None, diagnostics
                print(report['summary'])
            finally:
                # A renderer is a compositor service; exit after checking extension cleanup, without testing Mutter shutdown.
                if server.poll() is None: server.kill()
                server.wait(timeout=5)
