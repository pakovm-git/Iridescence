"""Native pixel test: shadows affect only the exterior, including hover transitions."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from PIL import Image, ImageChops
root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
output.mkdir(parents=True, exist_ok=True)
paths = ':'.join(str(path) for path in [Path('/usr/lib64/gnome-shell'), *Path('/usr/lib64').glob('mutter-*')])
with tempfile.TemporaryDirectory(prefix='iridescence-exterior-') as runtime:
    env = dict(os.environ, XDG_RUNTIME_DIR=runtime, XDG_CONFIG_HOME=runtime,
               GSETTINGS_BACKEND='memory', GI_TYPELIB_PATH=paths, LD_LIBRARY_PATH=paths)
    result = output / 'result.json'
    result.unlink(missing_ok=True)
    with (output / 'native.log').open('w+') as log:
        server = subprocess.Popen(['gjs', '-m', str(root / 'tests/shell-shadow-exterior.js'), str(output)],
                                  cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 25
            while not result.exists() and server.poll() is None and time.monotonic() < deadline:
                time.sleep(.05)
            log.flush(); log.seek(0); diagnostics = log.read()
            assert result.exists(), diagnostics or 'Native exterior check timed out'
            assert not any(message in diagnostics for message in ['CRITICAL', 'JS ERROR', 'WARNING']), diagnostics
            snapshots = list(output.glob('*-before.png'))
            assert len(snapshots) == 8, 'Every transition phase must be rendered'
            for before in snapshots:
                after = before.with_name(before.name.replace('-before', '-after'))
                diff = ImageChops.difference(Image.open(before).convert('RGB'), Image.open(after).convert('RGB'))
                pixels = diff.load()
                for y in range(82, 158):
                    for x in range(82, 318):
                        dx = max(104 - x - .5, x + .5 - 296, 0)
                        dy = max(104 - y - .5, y + .5 - 136, 0)
                        if dx * dx + dy * dy < 22 * 22:
                            assert pixels[x, y] == (0, 0, 0), f'{before.stem}: shadow changed rounded interior at {x},{y}'
                if before.stem != 'flat-start-before':
                    assert diff.getbbox() is not None, f'{before.stem}: missing exterior shadow'
            print('Native exterior shadow: interior pixels unchanged, exterior visible, hover transitions and actor opacity checked; texture reused.')
        finally:
            if server.poll() is None: server.kill()
            server.wait(timeout=5)
