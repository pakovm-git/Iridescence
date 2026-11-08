import Gio from 'gi://Gio';
import {decodeUtf8} from './files.js';

export function readText(file) {
    try {
        const [, bytes, etag] = file.load_contents(null);
        return {text: decodeUtf8(bytes), etag};
    } catch (error) {
        if (error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
            return {text: '', etag: null};
        throw error;
    }
}
