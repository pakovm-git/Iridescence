"""Check calendar edge pixels in a private compositor; never touch the active Shell."""
from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import time
from PIL import Image

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
result = output / 'result.json'
result.unlink(missing_ok=True)
paths = '/usr/lib64/gnome-shell:/usr/lib64/mutter-51'
with tempfile.TemporaryDirectory(prefix='iridescence-card-edge-') as runtime:
    env = dict(os.environ, XDG_RUNTIME_DIR=runtime, XDG_CONFIG_HOME=runtime,
               GSETTINGS_BACKEND='memory', GI_TYPELIB_PATH=paths, LD_LIBRARY_PATH=paths)
    with (output / 'native.log').open('w+') as log:
        server = subprocess.Popen(['gjs', '-m', str(root / 'tests/shell-card-edge.js'), str(output)],
                                  cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 20
            while not result.exists() and server.poll() is None and time.monotonic() < deadline:
                time.sleep(.05)
            log.flush(); log.seek(0)
            diagnostics = log.read()
            assert result.exists(), diagnostics or 'Native edge fixture timed out'
            assert not any(word in diagnostics for word in ['CRITICAL', 'JS ERROR', 'WARNING']), diagnostics
        finally:
            if server.poll() is None:
                server.kill()
            server.wait(timeout=5)

image = Image.open(output / 'card-edges.png')
def row(left, y):
    return tuple(sum(image.getpixel((x, y))[channel] for x in range(left + 60, left + 140)) / 80
                 for channel in range(3))

# y74 is the first straight outer edge, after the existing 4px native margin.
# The old outline starts one pixel later, leaving an unpainted strip at the boundary.
assert max(abs(a - b) for a, b in zip(row(40, 76), row(280, 76))) <= 1, 'Interior fill changed'
assert max(abs(a - b) for a, b in zip(row(40, 75), row(280, 74))) <= 1, 'Stroke strength changed'
assert sum(row(280, 74)) > sum(row(40, 74)) + 60, 'Physical border did not replace the gap'
summary = {'passed': True, 'summary': 'Native light calendar card: 1px gap removed, stroke strength and interior pixels preserved'}
result.write_text(json.dumps(summary, indent=2) + '\n')
print(summary['summary'])
