"""Compare custom shadow shape against native St using the same opaque silhouette."""
import json, os, subprocess, sys, tempfile, time
from pathlib import Path
from PIL import Image,ImageChops
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]).resolve(); output.mkdir(parents=True,exist_ok=True)
blur=float(sys.argv[2]) if len(sys.argv)>2 else 16
paths=':'.join(map(str,[Path('/usr/lib64/gnome-shell'),*Path('/usr/lib64').glob('mutter-*')]))
with tempfile.TemporaryDirectory(prefix='iridescence-shadow-shapes-') as runtime:
    env=dict(os.environ,XDG_RUNTIME_DIR=runtime,XDG_CONFIG_HOME=runtime,GSETTINGS_BACKEND='memory',GI_TYPELIB_PATH=paths,LD_LIBRARY_PATH=paths)
    result=output/'result.json'; result.unlink(missing_ok=True)
    with (output/'native.log').open('w+') as log:
        server=subprocess.Popen(['gjs','-m',str(root/'tests/shell-shadow-shape.js'),str(output),*sys.argv[2:]],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
        try:
            end=time.monotonic()+25
            while not result.exists() and server.poll() is None and time.monotonic()<end:time.sleep(.05)
            log.flush();log.seek(0);diagnostics=log.read()
            assert result.exists(),diagnostics or 'Native shape test timed out'
            assert not any(x in diagnostics for x in ['CRITICAL','JS ERROR','WARNING']),diagnostics
            silhouette=Image.open(output/'silhouette.png').convert('RGB')
            native=Image.open(output/'native.png').convert('RGB'); custom=Image.open(output/'custom.png').convert('RGB')
            failures=[]
            for sample in json.loads(result.read_text()):
                x,y,w,h=[sample[k] for k in ['x','y','width','height']]
                area=(int(x-22),int(y-22),int(x+w+22),int(y+h+22))
                diff=ImageChops.difference(native.crop(area),custom.crop(area))
                strong=0
                maximum=0
                for py in range(area[1],area[3]):
                    for px in range(area[0],area[2]):
                        if any(silhouette.getpixel((xx,yy)) != (255,255,255) for yy in range(py-1,py+2) for xx in range(px-1,px+2)):continue
                        difference=max(abs(a-b) for a,b in zip(native.getpixel((px,py)),custom.getpixel((px,py))))
                        maximum=max(maximum,difference)
                        strong+=difference>8
                print(sample['name'], 'native radii',sample['nativeRadii'],'outer pixels differing >8:',strong,'max:',maximum)
                # One-pixel antialiasing differs from Cairo; the exterior must retain the native shape.
                raw_max=max(max(pixel) for pixel in diff.get_flattened_data())
                if strong or (not sample['name'].startswith('banner-') and raw_max>28):failures.append((sample['name'],strong,raw_max))
            assert not failures,failures
            # A panel touching the banner top must not intersect its shadow.
            for offset in (2,8,blur):
                sample=next(s for s in json.loads(result.read_text()) if s['name']==f'banner-{offset:g}')
                x,y,w=[int(sample[k]) for k in ['x','y','width']]
                above=[255-min(custom.getpixel((px,py))) for py in range(y-20,y) for px in range(x-20,x+w+20)]
                maximum=max(above)
                print(f'Banner y-offset {offset}px: maximum shadow above border = {maximum}/255')
                assert (maximum==0)==(offset==blur), (offset,maximum)
            print('Native rounded shadow shapes match; moving the banner shadow down by its blur radius avoids panel clipping.')
        finally:
            if server.poll() is None:server.kill()
            server.wait(timeout=5)
