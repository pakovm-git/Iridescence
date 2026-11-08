// Compare the custom exterior caster with St's own opaque silhouette in a private compositor.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import {ShellShadows} from '../shell-shadows.js';
import {writeText} from '../files.js';
const directory = Gio.File.new_for_path(ARGV[0]);
const blur = Number(ARGV[1] ?? 16);
if (![16, 10].includes(blur)) throw Error('Expected original or reduced blur');
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
let context, failure, shadows;
const Plugin = GObject.registerClass(class ShapeTest extends Meta.Plugin {
    vfunc_start() { this.run().catch(error => {failure = error; shadows?.destroy(); context.terminate();}); }
    async run() {
        const stage = context.get_backend().get_stage();
        stage.set_size(440, 2100); stage.show();
        stage.add_child(new St.Widget({width: 440, height: 2100, style: 'background-color: white;'}));
        const css = directory.get_child('shape.css');
        writeText(css, `.sample {background-color:white; -iridescence-shadow:0 2px 16px 0 rgba(0,0,0,0.6);} .native {box-shadow:0 2px 16px 0 rgba(0,0,0,0.6); -iridescence-shadow:none;} .silhouette {background-color:black;box-shadow:none;-iridescence-shadow:none;}`);
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({application_stylesheet:css}));
        const samples = [
            ['pill','99px',160,48],['circle','999px',48,48],['split-left','99px 0 0 99px',160,48],
            ['split-right','0 99px 99px 0',48,48],['asymmetric','80px 0 0 0',160,48],
            ['fractional','99px',160.5,47.5],
            ['asymmetric-tr','0 80px 0 0',160,48],['asymmetric-br','0 0 80px 0',160,48],
            ['asymmetric-bl','0 0 0 80px',160,48],['diagonal-tl-br','80px 0 80px 0',100,100],['diagonal-tr-bl','0 80px 0 80px',100,100],
            ['banner-2','16px',280,48,2],['banner-8','16px',280,48,8],[`banner-${blur}`,'16px',280,48,blur]
        ].map(([name,radius,width,height,offset=2], i)=>{
            const control = new St.Button({x:80,y:40+i*140,width,height,style_class:'sample native',style:`border-radius:${radius};`});
            stage.add_child(control); return {name,control,radius,offset,blur:name.startsWith('banner-')?blur:16};
        });
        shadows = new ShellShadows(stage);
        const capture = () => stage.paint_to_content(new Mtk.Rectangle({x:0,y:0,width:440,height:2100}),1,stage.get_color_state(),Clutter.PaintFlag.NONE);
        const save = (image,name) => new Promise((resolve,reject)=>{
            const stream=directory.get_child(`${name}.png`).replace(null,false,0,null);
            Shell.Screenshot.composite_to_stream(image.get_texture(),0,0,440,2100,1,null,0,0,1,stream,(_obj,result)=>{
                try{Shell.Screenshot.composite_to_stream_finish(result);stream.close(null);resolve();}catch(e){reject(e);}
            });
        });
        for(const {control,radius,offset,blur} of samples) control.style=`border-radius:${radius};box-shadow:0 ${offset}px ${blur}px 0 rgba(0,0,0,0.6);-iridescence-shadow:none;`;
        await wait(100); await save(capture(),'native');
        for(const {control,radius,offset,blur} of samples) {control.remove_style_class_name('native');control.style=`border-radius:${radius};box-shadow:none;-iridescence-shadow:0 ${offset}px ${blur}px 0 rgba(0,0,0,0.6);`;}
        await wait(100); await save(capture(),'custom');
        for(const {control,radius} of samples) {control.add_style_class_name('silhouette');control.style=`border-radius:${radius};background-color:black;box-shadow:none;-iridescence-shadow:none;`;}
        await wait(100); await save(capture(),'silhouette');
        const geometry=samples.map(({name,control,radius})=>({name,radius,x:control.x,y:control.y,width:control.width,height:control.height,
            resourceScale:control.get_resource_scale(),viewScales:control.peek_stage_views().map(v=>v.get_scale()),nativeRadii:[St.Corner.TOPLEFT,St.Corner.TOPRIGHT,St.Corner.BOTTOMRIGHT,St.Corner.BOTTOMLEFT].map(c=>control.get_theme_node().get_border_radius(c))}));
        writeText(directory.get_child('result.json'),JSON.stringify(geometry));
        shadows.destroy(); shadows=null;
    }
});
context=Meta.create_context('Iridescence native shadow shapes');
context.configure(['preview','--headless','--wayland','--no-x11','--virtual-monitor=440x2100']);
context.set_plugin_gtype(Plugin.$gtype);context.setup();context.start();context.run_main_loop();if(failure)throw failure;
