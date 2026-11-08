import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {readText, writeText} from '../files.js';

function assert(value, message) { if (!value) throw new Error(message); }
const directory = Gio.File.new_for_path(GLib.dir_make_tmp('iridescence-files-XXXXXX'));
const file = directory.get_child('style.css');
try {
    assert((await readText(file)).text === '', 'missing file returns empty text');
    const text = '\uFEFF/* café */\r\nwindow { color: red; }\r\n';
    writeText(file, text);
    const current = await readText(file);
    assert(current.text === text && current.etag, 'async read preserves BOM, UTF-8, newlines and etag');
    writeText(file, '/* changed */', current.etag);
    assert((await readText(file)).text === '/* changed */', 'async etag works with existing guarded writer');
    const cancelled = new Gio.Cancellable();
    cancelled.cancel();
    let rejected = false;
    try { await readText(file, cancelled); }
    catch (error) { rejected = error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED); }
    assert(rejected, 'cancelled reads reject instead of returning empty data');
    file.replace_contents(new Uint8Array([0xff]), null, false, Gio.FileCreateFlags.NONE, null);
    rejected = false;
    try { await readText(file); } catch { rejected = true; }
    assert(rejected, 'invalid UTF-8 rejects instead of silently corrupting user CSS');
} finally {
    if (file.query_exists(null)) file.delete(null);
    directory.delete(null);
}
print('Async files: missing file, BOM/UTF-8, etag, cancellation and invalid content passed');
