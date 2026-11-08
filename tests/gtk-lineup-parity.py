"""Compare actual GTK layout and custom shadow shapes against dark/Rich/Dense."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
output = root / 'output/gtk-lineup-parity'
output.mkdir(parents=True, exist_ok=True)
source = """import {readFileSync} from 'node:fs';
import {makeGtkStyles} from './styles.js';
process.stdout.write(makeGtkStyles(process.argv[1],process.argv[2],readFileSync('themes/gtk.css','utf8'),Number(process.argv[3])));
"""
records = {}
for scheme in ['dark', 'light']:
    for tint in ['rich', 'balanced', 'subtle']:
        for level, mode, opacity in [('dense', 'translucent', 90), ('airy', 'translucent', 65), ('opaque', 'solid', 90)]:
            name = f'{scheme}-{tint}-{level}'
            css = subprocess.check_output(['node', '--input-type=module', '-e', source, tint, mode, str(opacity)], cwd=root, text=True)
            # These are the explicit extra-shadow variables, not libadwaita's native window shadow.
            colors = set(re.findall(r'--iridescence-[\w-]*shadow\s*:\s*[^;{}]*(rgba\([^()]+\))', css))
            assert colors, 'No generated Iridescence shadow colors'
            with tempfile.TemporaryDirectory(prefix='iridescence-gtk-parity-') as config:
                directory = Path(config) / 'gtk-4.0'
                directory.mkdir()
                (directory / 'gtk.css').write_text(css)
                filename = output / f'{name}.png'
                render = subprocess.run([sys.executable, str(root / 'tests/gtk-shadow-render.py'), '--render', f'{scheme}-{mode}-{tint}', 'on', str(filename)],
                    env=dict(os.environ, XDG_CONFIG_HOME=config, GSETTINGS_BACKEND='memory'), capture_output=True, text=True, timeout=15)
            assert render.returncode == 0, (name, render.stderr)
            assert not any(word in render.stderr for word in ['CRITICAL', 'Theme parser error', 'Traceback']), (name, render.stderr)
            nodes = Path(str(filename) + '.node').read_text()
            canonical_colors = {re.sub(r'\s+', '', color) for color in colors}
            shadows = []
            for match in re.finditer(r'outset-shadow\s*\{([^{}]*)\}', nodes):
                body = match[1]
                color = re.search(r'color:\s*([^;]+);', body)
                if color and re.sub(r'\s+', '', color[1]) in canonical_colors:
                    shadows.append(re.sub(r'\s+', ' ', re.sub(r'color:[^;]+;', '', body)).strip())
            assert shadows, (name, 'Custom exterior shadows were not painted')
            records[name] = {
                'bounds': json.loads(render.stdout),
                'menu_bounds': json.loads(Path(str(filename) + '.menu.json').read_text()),
                'shadow_shapes': shadows,
            }

reference = records['dark-rich-dense']
for name, record in records.items():
    assert record['bounds'] == reference['bounds'], (name, 'Widget geometry differs from dark/Rich/Dense')
    assert record['menu_bounds'] == reference['menu_bounds'], (name, 'Menu geometry differs from dark/Rich/Dense')
    assert record['shadow_shapes'] == reference['shadow_shapes'], (name, 'Custom shadow radii/offsets/blur differ from dark/Rich/Dense')
(output / 'checks.json').write_text(json.dumps(records, indent=2))
print(f'Native GTK lineup: {len(records)} variants match dark/Rich/Dense widget geometry, menu geometry and exterior shadow shapes')
