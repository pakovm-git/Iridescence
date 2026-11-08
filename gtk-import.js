import Gio from 'gi://Gio';
import {writeText} from './files.js';

export function setGtkImport(file, stylesheet, enabled, current) {
    if (file.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null) === Gio.FileType.SYMBOLIC_LINK)
        throw new Error('gtk.css is a user-managed symlink. Keep it intact and add the Iridescence import manually.');
    const line = `@import url("${stylesheet.get_uri()}"); /* iridescence */\n`;
    const exactLine = line.trimEnd().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bom = current.text.startsWith('\uFEFF') ? '\uFEFF' : '';
    const withoutImport = current.text.slice(bom.length).replace(new RegExp(`^${exactLine}(?:\\r?\\n|$)`, 'gm'), '');
    const text = bom + (enabled ? line + withoutImport : withoutImport);
    if (text !== current.text)
        writeText(file, text, current.etag);
}
