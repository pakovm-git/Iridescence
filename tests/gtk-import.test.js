import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {setGtkImport as updateGtkImport} from '../gtk-import.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';

function setGtkImport(file, stylesheet, enabled) {
    updateGtkImport(file, stylesheet, enabled, readText(file));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {ignoreBOM: true});
let passed = 0;

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function equal(actual, expected) {
    assert(actual === expected, `${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

function write(file, text) {
    if (text.length)
        file.replace_contents(encoder.encode(text), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
    else
        file.replace(null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null).close(null);
}

function read(file) {
    const bytes = file.load_contents(null)[1];
    const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    return (bom ? '\uFEFF' : '') + decoder.decode(bom ? bytes.subarray(3) : bytes);
}

function throws(callback) {
    let error;
    try { callback(); } catch (caught) { error = caught; }
    assert(error, 'Expected an error');
}

function remove(file) {
    const info = file.query_info('standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    if (info.get_file_type() === Gio.FileType.DIRECTORY) {
        const children = file.enumerate_children('standard::name',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        try {
            let child;
            while ((child = children.next_file(null)))
                remove(file.get_child(child.get_name()));
        } finally { children.close(null); }
    }
    file.delete(null);
}

function test(name, callback) {
    const root = Gio.File.new_for_path(GLib.dir_make_tmp('iridescence-test-XXXXXX'));
    const file = root.get_child('gtk.css');
    const stylesheet = root.get_child('iridescence.css');
    const backup = root.get_child('gtk.css.backup');
    const line = `@import url("${stylesheet.get_uri()}"); /* iridescence */\n`;
    try {
        write(stylesheet, '/* extension style */');
        callback({root, file, stylesheet, backup, line});
        print(`ok - ${name}`);
        passed++;
    } finally { remove(root); }
}

for (const content of ['', 'window { color: red; }', '/* café */\r\n@import "other.css";\r\n']) {
    test(`enable is idempotent and preserves ${JSON.stringify(content)}`, ({file, stylesheet, line}) => {
        write(file, content);
        setGtkImport(file, stylesheet, true);
        setGtkImport(file, stylesheet, true);
        equal(read(file), line + content);
        setGtkImport(file, stylesheet, false);
        equal(read(file), content);
    });
}

test('disable preserves user edits and unrelated imports mentioning extension names', ({file, stylesheet, line}) => {
    const content = '/* iridescence@pakovm */\r\n@import "tint-my-gnome@pakovm.css";\r\n';
    write(file, content);
    setGtkImport(file, stylesheet, true);
    write(file, `/* added before */\n${line}${content}window { color: blue; }`);
    setGtkImport(file, stylesheet, false);
    equal(read(file), `/* added before */\n${content}window { color: blue; }`);
});

test('enable creates an absent user stylesheet', ({file, stylesheet, line}) => {
    setGtkImport(file, stylesheet, true);
    equal(read(file), line);
});

test('preserves a UTF-8 BOM at the beginning of the user stylesheet', ({file, stylesheet, line}) => {
    const original = '\uFEFFwindow { color: red; }\r\n';
    write(file, original);
    setGtkImport(file, stylesheet, true);
    equal(read(file), '\uFEFF' + line + original.slice(1));
    setGtkImport(file, stylesheet, false);
    equal(read(file), original);
});

test('disable leaves an absent stylesheet absent', ({file, stylesheet}) => {
    setGtkImport(file, stylesheet, false);
    assert(!file.query_exists(null), 'Disable created gtk.css');
});

test('enable and disable refuse an unrelated user symlink', ({root, file, stylesheet}) => {
    const target = root.get_child('user-style.css');
    write(target, 'window { color: red; }');
    file.make_symbolic_link(target.get_path(), null);
    for (const enabled of [true, false]) {
        throws(() => setGtkImport(file, stylesheet, enabled));
        equal(file.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            null).get_symlink_target(), target.get_path());
        equal(read(target), 'window { color: red; }');
    }
});

for (const uuid of ['tint-my-gnome@pakovm', 'tinted-shell@pakovm', 'iridescence@pakovm']) {
    test(`refuses ${uuid} symlinks without migrating or touching backups`, ({root, file, stylesheet, backup}) => {
        const target = root.get_child(`${uuid}/gtk-4.0/gtk.css`);
        target.get_parent().make_directory_with_parents(null);
        write(target, '/* legacy extension */');
        write(backup, '/* original user CSS */\r\n');
        file.make_symbolic_link(target.get_path(), null);
        for (const enabled of [true, false]) {
            throws(() => setGtkImport(file, stylesheet, enabled));
            equal(file.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
                null).get_symlink_target(), target.get_path());
            equal(read(backup), '/* original user CSS */\r\n');
            equal(read(target), '/* legacy extension */');
        }
    });
}

test('refuses a broken legacy symlink without a backup', ({root, file, stylesheet}) => {
    file.make_symbolic_link(root.get_child('tint-my-gnome@pakovm/gtk-4.0/gtk.css').get_path(), null);
    throws(() => setGtkImport(file, stylesheet, true));
    equal(file.query_info('standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null).get_file_type(), Gio.FileType.SYMBOLIC_LINK);
});

test('refuses legacy symlinks without reading or changing the backup', ({root, file, stylesheet, backup}) => {
    const original = root.get_child('original.css');
    write(original, '/* precious */');
    backup.make_symbolic_link(original.get_path(), null);
    file.make_symbolic_link(root.get_child('tinted-shell@pakovm/gtk-4.0/gtk.css').get_path(), null);
    throws(() => setGtkImport(file, stylesheet, true));
    equal(read(original), '/* precious */');
    equal(backup.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        null).get_symlink_target(), original.get_path());
});

test('stale writes reject the old etag and preserve newer user content', ({file}) => {
    write(file, '/* old */');
    const {etag} = readText(file);
    write(file, '/* newer user stylesheet with different length */');
    // Local etags use modification time; avoid relying on clock resolution between writes.
    file.set_attribute_uint64('time::modified', 1, Gio.FileQueryInfoFlags.NONE, null);
    assert(readText(file).etag !== etag, 'The newer stylesheet must have a different etag');
    throws(() => writeText(file, '/* stale overwrite */', etag));
    equal(read(file), '/* newer user stylesheet with different length */');
});

test('refuses broken legacy symlinks without touching broken backups', ({root, file, stylesheet, backup}) => {
    backup.make_symbolic_link(root.get_child('missing.css').get_path(), null);
    const legacy = root.get_child('iridescence@pakovm/gtk-4.0/gtk.css').get_path();
    file.make_symbolic_link(legacy, null);
    throws(() => setGtkImport(file, stylesheet, true));
    equal(file.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
        null).get_symlink_target(), legacy);
});

print(`${passed} GTK import tests passed`);
