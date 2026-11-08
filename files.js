import Gio from 'gi://Gio';

export function decodeUtf8(bytes) {
    const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    // GJS strips the BOM even with ignoreBOM; retain it explicitly for user files.
    return (bom ? '\uFEFF' : '') + new TextDecoder('utf-8', {fatal: true}).decode(bom ? bytes.subarray(3) : bytes);
}

export async function readText(file, cancellable = null) {
    try {
        const [bytes, etag] = await new Promise((resolve, reject) => {
            file.load_contents_async(cancellable, (source, result) => {
                try {
                    const [, contents, tag] = source.load_contents_finish(result);
                    resolve([contents, tag]);
                } catch (error) { reject(error); }
            });
        });
        return {text: decodeUtf8(bytes), etag};
    } catch (error) {
        if (error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
            return {text: '', etag: null};
        throw error;
    }
}

export function writeText(file, text, etag = null) {
    const parent = file.get_parent();
    if (!parent.query_exists(null))
        parent.make_directory_with_parents(null);
    const flags = Gio.FileCreateFlags.PRIVATE | Gio.FileCreateFlags.REPLACE_DESTINATION;
    if (text.length)
        file.replace_contents(new TextEncoder().encode(text), etag, false, flags, null);
    else
        file.replace(etag, false, flags, null).close(null);
}
