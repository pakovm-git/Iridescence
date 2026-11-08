"""Native OSD surface/pixel regression; never change the active desktop."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1]).resolve()
scheme, tint, level = (sys.argv[2:] or ['dark', 'balanced', 'airy'])
assert scheme in ['light', 'dark'] and tint in ['subtle', 'balanced', 'rich'] and level in ['airy', 'dense', 'opaque']
output.mkdir(parents=True, exist_ok=True)
(output / 'barLevel.js').write_bytes(subprocess.check_output([
    'gresource', 'extract', '/usr/lib64/gnome-shell/libshell-51.so', '/org/gnome/shell/ui/barLevel.js']))
result = output / 'result.json'
result.unlink(missing_ok=True)
paths = ':'.join(str(path) for path in [Path('/usr/lib64/gnome-shell'), *Path('/usr/lib64').glob('mutter-*')])
with tempfile.TemporaryDirectory(prefix='iridescence-osd-') as runtime:
    env = dict(os.environ, XDG_RUNTIME_DIR=runtime, XDG_CONFIG_HOME=runtime,
               GSETTINGS_BACKEND='memory', GI_TYPELIB_PATH=paths, LD_LIBRARY_PATH=paths)
    with (output / 'native.log').open('w+') as log:
        server = subprocess.Popen(['gjs', '-m', str(root / 'tests/osd-shadow.js'), str(output), scheme, tint, level],
                                  cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 25
            while not result.exists() and server.poll() is None and time.monotonic() < deadline:
                time.sleep(.05)
            log.flush(); log.seek(0)
            diagnostics = log.read()
            assert result.exists(), diagnostics or 'Native OSD check timed out'
            assert not any(message in diagnostics for message in ['CRITICAL', 'JS ERROR', 'WARNING']), diagnostics
        finally:
            if server.poll() is None:
                server.kill()
            server.wait(timeout=5)

report = json.loads(result.read_text())
before = Image.open(output / 'before.png').convert('RGB')
after = Image.open(output / 'after.png').convert('RGB')
diff = ImageChops.difference(before, after)
pixels = diff.load()
for sample in report['measurements']:
    left, top, width, height = map(round, sample['bounds'])
    radius = sample['radius']
    interior = 0
    for y in range(top + 2, top + height - 2):
        for x in range(left + 2, left + width - 2):
            dx = max(left + radius - x - .5, x + .5 - (left + width - radius), 0)
            dy = max(top + radius - y - .5, y + .5 - (top + height - radius), 0)
            if dx * dx + dy * dy < max(radius - 2, 0) ** 2 or dx == dy == 0:
                assert pixels[x, y] == (0, 0, 0), f"{sample['name']}: exterior effect changed interior at {x},{y}"
                interior += 1
    assert interior > 0, f"{sample['name']}: missing interior sample"
    assert diff.crop((left - 20, top - 20, left + width + 20, top)).getbbox() is None, f"{sample['name']}: shadow extends above top border"
    exterior = diff.crop((left, top + height, left + width, top + height + 32))
    assert exterior.getbbox(), f"{sample['name']}: missing exterior shadow pixels"
    assert all(after.getpixel((x, after.height - 1)) == (120, 147, 141) for x in range(left, left + width)), 'Shadow clipped at stage bottom'
report['pixels'] = 'Seven native OSD and three popup-menu interiors unchanged; exterior shadows visible; no shadow above top border; bottom edge clear.'
result.write_text(json.dumps(report, indent=2) + '\n')
print(f'{scheme}/{tint}/{level}: OSDs and popup menus match notification shadow; native state, bounds, interior pixels, panel clearance, cache and cleanup verified.')
