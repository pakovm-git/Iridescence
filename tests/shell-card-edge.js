// Native pixels verify the existing border is painted instead of leaving a strip outside an inset stroke.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import {makeShellStyles} from '../styles.js';
import {ShellShadows} from '../shell-shadows.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';
const directory=Gio.File.new_for_path(ARGV[0]);
const root=Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
let context,failure,shadows;
const wait=ms=>new Promise(resolve=>GLib.timeout_add(GLib.PRIORITY_DEFAULT,ms,()=>{resolve();return GLib.SOURCE_REMOVE;}));
const Plugin=GObject.registerClass(class CardEdgeTest extends Meta.Plugin {
    vfunc_start(){this.run().catch(error=>{failure=error;shadows?.destroy();context.terminate();});}
    async run(){
        const stage=context.get_backend().get_stage();stage.set_size(520,240);stage.show();
        stage.add_child(new St.Widget({width:520,height:240,style:'background-color:#78938d;'}));
        const css=directory.get_child('cards.css');
        writeText(css,makeShellStyles(readText(root.get_child('themes/shell-light.css')).text,false,{tint:'rich',opacity:90})+`
.before { border-color: transparent; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2); }
`);
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({default_stylesheet:Gio.File.new_for_uri('resource:///org/gnome/shell/theme/gnome-shell-light.css'),application_stylesheet:css}));
        for(const [x,name]of[[40,'before'],[280,'after']])stage.add_child(new St.Button({x,y:70,width:200,height:90,style_class:`events-button ${name}`}));
        shadows=new ShellShadows(stage);await wait(250);
        const image=stage.paint_to_content(new Mtk.Rectangle({x:0,y:0,width:520,height:240}),1,stage.get_color_state(),Clutter.PaintFlag.NONE);
        const stream=directory.get_child('card-edges.png').replace(null,false,0,null);
        await new Promise((resolve,reject)=>Shell.Screenshot.composite_to_stream(image.get_texture(),0,0,520,240,1,null,0,0,1,stream,(_object,result)=>{try{Shell.Screenshot.composite_to_stream_finish(result);stream.close(null);resolve();}catch(error){reject(error);}}));
        shadows.destroy();shadows=null;writeText(directory.get_child('result.json'),'{}');
    }
});
context=Meta.create_context('Iridescence card edge test');context.configure(['preview','--headless','--wayland','--no-x11','--virtual-monitor=520x240']);context.set_plugin_gtype(Plugin.$gtype);context.setup();context.start();context.run_main_loop();if(failure)throw failure;
