// Exercise the authentication layout in a private compositor without PAM or a live screen lock.
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import {makeShellStyles} from '../styles.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';

const [variant, output, level = 'airy', tint = 'balanced'] = ARGV;
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const directory = Gio.File.new_for_path(output);
if (!directory.query_exists(null)) directory.make_directory_with_parents(null);
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
let context, failure;
const Plugin = GObject.registerClass(class IridescenceLockPasswordTest extends Meta.Plugin {
    vfunc_start() { this.run().catch(error => { failure = error; context.terminate(); }); }
    async run() {
        const stage = context.get_backend().get_stage();
        stage.set_size(800, 650); stage.show();
        stage.add_child(new St.Widget({width: 800, height: 650, style: 'background-color:#52738a;'}));
        const native = Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${variant}.css`);
        const source = readText(root.get_child(`themes/shell-${variant}.css`)).text;
        const stylesheet = directory.get_child(`lock-${variant}.css`);
        const originalStylesheet = directory.get_child(`original-${variant}.css`);
        writeText(originalStylesheet, source.replace(/transparent\s+!important(?=\s*,)/g, 'transparent'));
        writeText(stylesheet, makeShellStyles(source, variant === 'dark', {
            tint, opacity: level === 'dense' ? 90 : 65, transparency: level === 'opaque' ? 'solid' : 'translucent',
        }, readText(native).text));
        const themes = {
            native: new St.Theme({default_stylesheet: native}),
            generated: new St.Theme({default_stylesheet: native, application_stylesheet: stylesheet}),
        };
        const themeContext = St.ThemeContext.get_for_stage(stage);
        const view = new St.BoxLayout({style_class:'unlock-dialog', orientation:Clutter.Orientation.VERTICAL, width:800, height:650});
        stage.add_child(view);
        const prompt = new St.BoxLayout({style_class:'login-dialog-prompt-layout', orientation:Clutter.Orientation.VERTICAL,
            x_expand:true, x_align:Clutter.ActorAlign.CENTER, reactive:true});
        view.add_child(prompt);
        const userWell = new St.Bin({height:180});
        prompt.add_child(userWell);
        const inputWell = new St.BoxLayout({style_class:'login-dialog-input-well', orientation:Clutter.Orientation.VERTICAL, y_align:Clutter.ActorAlign.START});
        prompt.add_child(inputWell);
        const buttonBox = new St.BoxLayout({style_class:'login-dialog-button-box', orientation:Clutter.Orientation.HORIZONTAL, y_expand:false});
        inputWell.add_child(buttonBox);
        const entryArea = new St.Widget({style_class:'login-dialog-prompt-entry-area', layout_manager:new Clutter.BinLayout(), x_expand:true, y_expand:true});
        buttonBox.add_child(entryArea);
        const entry = new St.PasswordEntry({style_class:'login-dialog-prompt-entry', hint_text:'Password', can_focus:true, x_expand:true, y_expand:true});
        entryArea.add_child(entry);
        const buttonWell = new St.Widget({style_class:'login-dialog-default-button-well', layout_manager:new Clutter.BinLayout(),
            x_expand:true, x_align:Clutter.ActorAlign.END, y_align:Clutter.ActorAlign.CENTER});
        entryArea.add_child(buttonWell);
        const next = new St.Button({style_class:'login-dialog-button next-button', icon_name:'go-next-symbolic', reactive:true, can_focus:false});
        next.add_style_pseudo_class('default'); buttonWell.add_child(next);
        const actors = {prompt, inputWell, buttonBox, entryArea, entry, buttonWell, next};
        const rounded = number => Math.round(number * 100) / 100;
        const position = actor => {const [x,y] = actor.get_transformed_position(); return [x,y,actor.width,actor.height].map(rounded);};
        const snapshot = () => Object.fromEntries(Object.entries(actors).map(([name,actor]) => {
            const node = actor.get_theme_node();
            return [name, {bounds:position(actor), padding:[St.Side.TOP,St.Side.RIGHT,St.Side.BOTTOM,St.Side.LEFT].map(side=>node.get_padding(side)),
                radius:[St.Corner.TOPLEFT,St.Corner.TOPRIGHT,St.Corner.BOTTOMRIGHT,St.Corner.BOTTOMLEFT].map(corner=>node.get_border_radius(corner)),
                children:actor.get_children().map(child => ({type:child.constructor.name, classes:child.get_style_class_name?.() ?? '', bounds:position(child),
                    padding:child.get_theme_node ? [St.Side.TOP,St.Side.RIGHT,St.Side.BOTTOM,St.Side.LEFT].map(side=>child.get_theme_node().get_padding(side)) : []}))}];
        }));
        const save = name => new Promise((resolve,reject) => {
            const image = stage.paint_to_content(new Mtk.Rectangle({x:0,y:0,width:800,height:650}),1,stage.get_color_state(),Clutter.PaintFlag.NONE);
            const stream = directory.get_child(`lock-${variant}-${name}.png`).replace(null,false,0,null);
            Shell.Screenshot.composite_to_stream(image.get_texture(),0,0,800,650,1,null,0,0,1,stream,(_object,result)=>{
                try {Shell.Screenshot.composite_to_stream_finish(result);stream.close(null);resolve();} catch(error){reject(error);}
            });
        });
        const results = [], failures = [];
        const search = new St.Entry({style_class:'search-entry', hint_text:'Search', x:20, y:590});
        stage.add_child(search);
        themeContext.set_theme(new St.Theme({default_stylesheet:native, application_stylesheet:originalStylesheet}));
        await wait(350);
        const searchRadius = search.get_theme_node().get_border_radius(St.Corner.TOPLEFT);
        themeContext.set_theme(themes.generated);await wait(350);
        if(search.get_theme_node().get_border_radius(St.Corner.TOPLEFT)!==searchRadius)
            failures.push(`Desktop search radius changed: ${search.get_theme_node().get_border_radius(St.Corner.TOPLEFT)}, original ${searchRadius}`);
        search.destroy();
        for (const order of ['before','after']) {
            const generic = 'StEntry {border-radius:4px;padding:11px;}';
            const specialized = '.custom-entry {border-radius:17px;padding:13px;}';
            const synthetic = order==='before' ? generic+specialized : specialized+generic;
            const geometry = actor => [actor.get_theme_node().get_border_radius(St.Corner.TOPLEFT), ...[St.Side.TOP,St.Side.RIGHT,St.Side.BOTTOM,St.Side.LEFT].map(side=>actor.get_theme_node().get_padding(side))];
            const probes = [new St.Entry(),new St.Entry({style_class:'custom-entry'})];
            for(const probe of probes)stage.add_child(probe);
            const pair = {};
            for(const [name,css] of [['original',synthetic],['generated',makeShellStyles(synthetic,variant==='dark', {}, readText(native).text)]]) {
                const file = directory.get_child(`probe-${variant}-${order}-${name}.css`);writeText(file,css);
                themeContext.set_theme(new St.Theme({default_stylesheet:native,application_stylesheet:file}));await wait(350);
                pair[name]=probes.map(geometry);
            }
            if(JSON.stringify(pair.original)!==JSON.stringify(pair.generated))
                failures.push(`Ordinary entry specificity changed (${order}): ${JSON.stringify(pair.generated)}, original ${JSON.stringify(pair.original)}`);
            for(const probe of probes)probe.destroy();
        }
        for (const [direction, value] of [['ltr',Clutter.TextDirection.LTR],['rtl',Clutter.TextDirection.RTL]]) {
            const setDirection = actor => {actor.set_text_direction(value);for(const child of actor.get_children())setDirection(child);};
            setDirection(view);
            for (const state of ['', 'hover', 'focus', 'insensitive']) {
                for (const actor of [entry,next]) {actor.set_style_pseudo_class('');if(state)actor.add_style_pseudo_class(state);}
                next.add_style_pseudo_class('default');
                const pair = {};
                for (const [name,theme] of Object.entries(themes)) {
                    themeContext.set_theme(theme); await wait(350);
                    pair[name] = snapshot();
                    if(direction==='ltr' && state==='focus')await save(name);
                }
                for(const name of Object.keys(actors)) for(const property of ['bounds','padding','radius','children']) {
                    if(JSON.stringify(pair.native[name][property])!==JSON.stringify(pair.generated[name][property]))
                        failures.push(`${direction}/${state||'idle'} ${name}.${property}: ${JSON.stringify(pair.generated[name][property])}, native ${JSON.stringify(pair.native[name][property])}`);
                }
                results.push({direction,state:state||'idle',...pair});
            }
        }
        const summary = `${variant}/${level}/${tint}: native password hierarchy geometry, radii and padding ${failures.length?'FAILED':'passed'} in both directions and four states`;
        writeText(directory.get_child(`lock-${variant}-result.json`),JSON.stringify({passed:failures.length===0,summary,failures,results},null,2));
        print(summary);for(const message of failures)print(message);
    }
});
context=Meta.create_context('Iridescence password layout checks');
context.configure(['preview','--headless','--wayland','--no-x11','--virtual-monitor=800x650']);
context.set_plugin_gtype(Plugin.$gtype);
context.setup();context.start();context.run_main_loop();
if(failure)throw failure;
