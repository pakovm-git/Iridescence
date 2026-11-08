import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';
import {setFlatpakAccess} from '../flatpak.js';

const root = Gio.File.new_for_path(GLib.dir_make_tmp('iridescence-flatpak-XXXXXX'));
const file = root.get_child('global');
const state = root.get_child('state.json');
function assert(value, message) { if (!value) throw new Error(message); }
try {
    const initial = '# User preferences\n[Context]\nfilesystems=xdg-download;xdg-config/gtk-4.0:rw;\n[Environment]\nMY_VARIABLE=keep\n';
    writeText(file, initial);
    setFlatpakAccess(file, state, true);
    const applied = readText(file).text;
    assert(applied.includes('xdg-config/gtk-4.0:rw'), 'Existing grant downgraded');
    assert(applied.includes('xdg-config/iridescence:ro'), 'New grant missing');
    setFlatpakAccess(file, state, true);
    assert(readText(file).text === applied, 'Apply not idempotent');
    writeText(file, applied.replace('xdg-download;', 'xdg-download;xdg-pictures;'));
    setFlatpakAccess(file, state, false);
    let restored = readText(file).text;
    assert(!restored.includes('xdg-config/iridescence'), 'Owned grant not removed');
    for (const value of ['xdg-pictures', 'xdg-download', 'xdg-config/gtk-4.0:rw', 'MY_VARIABLE=keep', '# User preferences'])
        assert(restored.includes(value), `Lost user value ${value}`);
    setFlatpakAccess(file, state, false);
    assert(readText(file).text === restored, 'Undo not idempotent');

    setFlatpakAccess(file, state, true);
    writeText(file, readText(file).text.replace('xdg-config/iridescence:ro', 'xdg-config/iridescence:rw'));
    setFlatpakAccess(file, state, false);
    assert(readText(file).text.includes('xdg-config/iridescence:rw'), 'Undo removed a changed grant');

    writeText(file, '[Context]\nfilesystems=!xdg-config/iridescence;\n');
    let refused = false;
    try { setFlatpakAccess(file, state, true); } catch { refused = true; }
    assert(refused, 'Explicit filesystem denial overwritten');
    assert(readText(file).text.includes('!xdg-config/iridescence'), 'Explicit denial changed');

    file.delete(null);
    setFlatpakAccess(file, state, false);
    assert(!file.query_exists(null), 'Undo created absent overrides');
    setFlatpakAccess(file, state, true);
    setFlatpakAccess(file, state, false);
    assert(!readText(file).text.trim(), 'Undo left filesystem permissions behind');
    const managed = root.get_child('managed-global');
    writeText(managed, '[Context]\nfilesystems=xdg-pictures;\n');
    file.delete(null);
    file.make_symbolic_link(managed.get_path(), null);
    for (const enabled of [true, false]) {
        let refused = false;
        try { setFlatpakAccess(file, state, enabled); } catch { refused = true; }
        assert(refused, 'User-managed override symlink was accepted');
        assert(file.query_info('standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null)
            .get_file_type() === Gio.FileType.SYMBOLIC_LINK, 'Override symlink replaced');
        assert(readText(managed).text.includes('xdg-pictures'), 'Symlink target changed');
    }
    file.delete(null);
    state.delete(null);
    state.make_symbolic_link(managed.get_path(), null);
    let stateRefused = false;
    try { setFlatpakAccess(file, state, true); } catch { stateRefused = true; }
    assert(stateRefused, 'User-managed state symlink was accepted');
    state.delete(null);
    managed.delete(null);
    print('Flatpak apply/undo, user permissions, user edits and explicit denial tests passed');
} finally {
    for (const child of [file, state]) {
        if (child.query_exists(null)) child.delete(null);
    }
    root.delete(null);
}
