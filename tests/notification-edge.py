"""Check notification edge pixels in a private compositor; never touch the active Shell."""
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
with tempfile.TemporaryDirectory(prefix='iridescence-notification-edge-') as runtime:
    env = dict(os.environ, XDG_RUNTIME_DIR=runtime, XDG_CONFIG_HOME=runtime,
               GSETTINGS_BACKEND='memory', GI_TYPELIB_PATH=paths, LD_LIBRARY_PATH=paths)
    with (output / 'native.log').open('w+') as log:
        server = subprocess.Popen(['gjs', '-m', str(root / 'tests/notification-edge.js'), str(output), *sys.argv[2:]],
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

image = Image.open(output / 'notification-edges.png')
def row(left, y):
    return tuple(sum(image.getpixel((x, y))[channel] for x in range(left + 60, left + 140)) / 80
                 for channel in range(3))

measurements = []
for i, kind in enumerate(['banner', 'second-in-stack', 'lower-in-stack', 'hover', 'focus', 'pending', 'active']):
    y = 40 + i * 110 + (4 if i == 0 else 0)
    old_outer, old_stroke, interior = row(40, y), row(40, y + 1), row(40, y + 2)
    new_outer, new_interior = row(280, y), row(280, y + 2)
    measurements.append({'kind': kind, 'old_outer': old_outer, 'old_stroke': old_stroke, 'new_outer': new_outer, 'interior': interior, 'new_interior': new_interior})
nodes=json.loads((output/'nodes.json').read_text())
result.write_text(json.dumps({'measurements':measurements,'nodes':nodes}, indent=2) + '\n')
for node in nodes:
    alpha=0 if node['kind']=='insensitive' else 217 if node['kind']=='focus' else 26 if 'stack' in node['kind'] else 51
    assert node['borderWidth']==1 and abs(node['borderAlpha']-alpha)<=1 and not node['boxShadow'], f"{node['kind']}: expected a single physical border at alpha {alpha}, got {node}"
    if node['kind']!='banner':
        assert node['surfaceShadow']==0, f"{node['kind']}: pending/stack card gained a surface shadow"
for m in measurements:
    assert max(abs(a-b) for a,b in zip(m['interior'],m['new_interior'])) <= 1, f"{m['kind']}: interior fill changed"
    assert max(abs(a-b) for a,b in zip(m['old_stroke'],m['new_outer'])) <= 1, f"{m['kind']}: stroke strength changed or gap remains"
    assert sum(abs(a-b) for a,b in zip(m['old_outer'],m['new_outer'])) > 1, f"{m['kind']}: outer gap remains"
result.write_text(json.dumps({'passed':True,'variant':sys.argv[2:] or ['light','balanced','airy'],'measurements':measurements,'nodes':nodes},indent=2)+'\n')
print('Native notification banner, pending hover and 10% stack edges: 1px gap removed, stroke and fill preserved')
