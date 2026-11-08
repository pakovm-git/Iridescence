// Pixel fixture for cached native shadows; run only in a private compositor.
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
const wait = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => { resolve(); return GLib.SOURCE_REMOVE; }));
let context, failure, shadows;
const Plugin = GObject.registerClass(class ExteriorTest extends Meta.Plugin {
    vfunc_start() { this.run().catch(error => {failure = error; shadows?.destroy(); context.terminate();}); }
    async run() {
        const stage = context.get_backend().get_stage();
        stage.set_size(400, 240); stage.show();
        stage.add_child(new St.Widget({width: 400, height: 240, style: 'background-color: #78938d;'}));
        const css = directory.get_child('exterior.css');
        writeText(css, `.sample { background-color: rgba(120, 160, 200, 0.35); border: 1px solid rgba(255,255,255,0.4); border-radius: 24px; transition-duration: 180ms; -iridescence-shadow: 0 2px 16px 0 rgba(0,0,0,0.28); }
            .sample:hover { background-color: rgba(180, 140, 200, 0.65); }
            .sample.flat { background-color: transparent; -iridescence-shadow: none; }
            .sample.flat:hover { background-color: rgba(180, 140, 200, 0.2); -iridescence-shadow: 0 2px 16px 0 rgba(0,0,0,0.28); }`);
        St.ThemeContext.get_for_stage(stage).set_theme(new St.Theme({application_stylesheet: css}));
        const button = new St.Button({x: 80, y: 80, width: 240, height: 80, style_class: 'sample'});
        stage.add_child(button); shadows = new ShellShadows(stage);
        await wait(250);
        const capture = () => stage.paint_to_content(new Mtk.Rectangle({x: 0, y: 0, width: 400, height: 240}), 1, stage.get_color_state(), Clutter.PaintFlag.NONE);
        const save = (image, name) => new Promise((resolve, reject) => {
            const stream = directory.get_child(`${name}.png`).replace(null, false, 0, null);
            Shell.Screenshot.composite_to_stream(image.get_texture(), 0, 0, 400, 240, 1, null, 0, 0, 1, stream, (_object, result) => {
                try { Shell.Screenshot.composite_to_stream_finish(result); stream.close(null); resolve(); } catch (error) { reject(error); }
            });
        });
        let cached;
        for (const phase of ['idle', 'hover-start', 'hover-middle', 'hover-end', 'fade', 'flat-start', 'flat-middle', 'flat-end']) {
            if (phase === 'hover-start') button.add_style_pseudo_class('hover');
            if (phase.endsWith('middle')) await wait(70);
            if (phase.endsWith('end')) await wait(220);
            if (phase === 'fade') button.opacity = 128;
            if (phase === 'flat-start') {
                button.opacity = 255; button.remove_style_pseudo_class('hover'); button.add_style_class_name('flat');
                await wait(220); cached = null; button.add_style_pseudo_class('hover');
            }
            const effect = button.get_effect('iridescence-shadow');
            if (!effect) throw Error(`${phase}: missing shadow`);
            effect.enabled = false; const before = capture();
            effect.enabled = true; const after = capture();
            if (cached && effect._texture !== cached) throw Error(`${phase}: unchanged geometry rebuilt cached texture`);
            cached = effect._texture;
            await save(before, `${phase}-before`); await save(after, `${phase}-after`);
        }
        const effect = button.get_effect('iridescence-shadow');
        shadows.destroy(); shadows = null;
        if (effect._texture || effect._mask || effect._key || button.get_effect('iridescence-shadow'))
            throw Error('Teardown retained shadow resources');
        writeText(directory.get_child('result.json'), '{"passed":true}');
    }
});
context = Meta.create_context('Iridescence exterior shadow pixel test');
context.configure(['preview', '--headless', '--wayland', '--no-x11', '--virtual-monitor=400x240']);
context.set_plugin_gtype(Plugin.$gtype); context.setup(); context.start(); context.run_main_loop();
if (failure) throw failure;
