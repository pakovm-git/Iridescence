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
const mode=ARGV[1]??'light',tint=ARGV[2]??'balanced',level=ARGV[3]??'airy';
const dark=mode==='dark',ink=dark?'255,255,255':'0,0,0',focus=dark?'st-mix(-st-accent-color, #ffffff, 60%)':'-st-accent-color';
const root=Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
let context,failure,shadows;
const wait=ms=>new Promise(resolve=>GLib.timeout_add(GLib.PRIORITY_DEFAULT,ms,()=>{resolve();return GLib.SOURCE_REMOVE;}));
const Plugin=GObject.registerClass(class CardEdgeTest extends Meta.Plugin {
    vfunc_start(){this.run().catch(error=>{failure=error;shadows?.destroy();context.terminate();});}
    async run(){
        const stage=context.get_backend().get_stage();stage.set_size(520,950);stage.show();
        stage.add_child(new St.Widget({width:520,height:950,style:'background-color:#78938d;'}));
        const css=directory.get_child('notifications.css');
        writeText(css,makeShellStyles(readText(root.get_child(`themes/shell-${mode}.css`)).text,dark,{tint,opacity:level==='dense'?90:65,transparency:level==='opaque'?'solid':'translucent'})+`
.message.before,.message.before:hover,.message.before:active { border-color: transparent; box-shadow: inset 0 0 0 1px rgba(${ink},0.2); }
.message.before:second-in-stack,.message.before:lower-in-stack {border-color:transparent;box-shadow:inset 0 0 0 1px rgba(${ink},0.1);}
.message.before:focus{border-color:transparent;box-shadow:inset 0 0 0 1px st-transparentize(${focus},0.15)!important;}
`);
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({default_stylesheet:Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${mode}.css`),application_stylesheet:css}));
        const nodes=[];for(const [i,pseudo]of ['', 'second-in-stack','lower-in-stack','hover','focus','','active','insensitive'].entries())for(const [x,name]of[[40,'before'],[280,'after']]){const actor=new St.Button({x,y:40+i*110,width:200,height:90,style_class:`message ${i===0?'notification-banner':''} ${name}`});if(pseudo)actor.add_style_pseudo_class(pseudo);stage.add_child(actor);if(name==='after')nodes.push({kind:i===0?'banner':i===5?'pending':pseudo,node:actor});}
        shadows=new ShellShadows(stage);await wait(250);
        writeText(directory.get_child('nodes.json'),JSON.stringify(nodes.map(({kind,node})=>{const theme=node.get_theme_node(),color=theme.get_border_color(St.Side.TOP);return{kind,borderWidth:theme.get_border_width(St.Side.TOP),borderAlpha:color.alpha,boxShadow:Boolean(theme.get_box_shadow()),surfaceShadow:theme.lookup_shadow('-iridescence-shadow',false)[1]?.color.alpha??0};}),null,2));
        const image=stage.paint_to_content(new Mtk.Rectangle({x:0,y:0,width:520,height:950}),1,stage.get_color_state(),Clutter.PaintFlag.NONE);
        const stream=directory.get_child('notification-edges.png').replace(null,false,0,null);
        await new Promise((resolve,reject)=>Shell.Screenshot.composite_to_stream(image.get_texture(),0,0,520,950,1,null,0,0,1,stream,(_object,result)=>{try{Shell.Screenshot.composite_to_stream_finish(result);stream.close(null);resolve();}catch(error){reject(error);}}));
        shadows.destroy();shadows=null;writeText(directory.get_child('result.json'),'{}');
    }
});
context=Meta.create_context('Iridescence notification edge test');context.configure(['preview','--headless','--wayland','--no-x11','--virtual-monitor=520x950']);context.set_plugin_gtype(Plugin.$gtype);context.setup();context.start();context.run_main_loop();if(failure)throw failure;
