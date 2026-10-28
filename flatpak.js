import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {readText, writeText} from './files.js';

const GRANTS = ['xdg-config/gtk-4.0:ro', 'xdg-config/iridescence:ro'];
const pathOf = entry => entry.replace(/^!/, '').replace(/:(?:ro|rw|create)$/, '');

export function setFlatpakAccess(file, stateFile, enabled) {
    for (const candidate of [file, stateFile]) {
        try {
            const info = candidate.query_info('standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
            if (info.get_file_type() === Gio.FileType.SYMBOLIC_LINK)
                throw new Error(`${candidate.get_basename()} is a user-managed symlink. Manage Flatpak access manually to keep it intact.`);
        } catch (error) {
            if (!error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) throw error;
        }
    }
    const current = readText(file);
    const saved = readText(stateFile);
    const state = saved.text ? JSON.parse(saved.text) : {added: []};
    if (!Array.isArray(state.added) || state.added.some(entry => !GRANTS.includes(entry)))
        throw new Error('Invalid Iridescence Flatpak permission record');
    if (!enabled && !state.added.length)
        return;
    const ini = new GLib.KeyFile();
    if (current.text)
        ini.load_from_data(current.text, new TextEncoder().encode(current.text).length, GLib.KeyFileFlags.KEEP_COMMENTS);
    const hasFilesystems = ini.has_group('Context') && ini.get_keys('Context')[0].includes('filesystems');
    let entries = hasFilesystems
        ? ini.get_string_list('Context', 'filesystems') : [];
    if (enabled) {
        for (const grant of GRANTS) {
            const existing = entries.find(entry => pathOf(entry) === pathOf(grant));
            if (existing?.startsWith('!'))
                throw new Error(`Flatpak access to ${pathOf(grant)} is explicitly blocked. Review that permission before applying Iridescence integration.`);
        }
        for (const grant of GRANTS) {
            if (!entries.some(entry => pathOf(entry) === pathOf(grant))) {
                entries.push(grant);
                if (!state.added.includes(grant)) state.added.push(grant);
            }
        }
        // Save ownership first so a failed permission write can still be safely undone.
        writeText(stateFile, JSON.stringify(state), saved.etag);
    } else {
        entries = entries.filter(entry => !state.added.includes(entry));
    }
    if (entries.length)
        ini.set_string_list('Context', 'filesystems', entries);
    else if (ini.has_group('Context')) {
        if (hasFilesystems) ini.remove_key('Context', 'filesystems');
        if (ini.get_keys('Context')[0].length === 0) ini.remove_group('Context');
    }
    const text = ini.to_data()[0];
    // Keep an empty override file after undo; deleting it could race a user's new edit.
    if (text !== current.text) {
        writeText(file, text, current.etag);
    }
    if (!enabled)
        writeText(stateFile, '', saved.etag);
}
