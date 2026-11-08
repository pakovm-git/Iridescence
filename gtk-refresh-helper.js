#!/usr/bin/gjs -m
// GTK coalesces immediate pulses; finish the 200 ms cleanup outside the disabled Shell extension.
import GLib from 'gi://GLib';
import System from 'system';
import {GtkRefresh} from './gtk-refresh.js';

const refresh = new GtkRefresh();
const loop = new GLib.MainLoop(null, false);
let failed = false;
const signals = [2, 15].map(signal => GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal, () => {
    refresh.destroy();
    return GLib.SOURCE_CONTINUE;
}));
// The controller bounds lock acquisition to 1500 ms and the owned pulse to 200 ms.
refresh.run().catch(error => {
    failed = true;
    console.error(`Iridescence GTK cleanup refresh: ${error.message}`);
}).finally(() => {
    for (const signal of signals) GLib.Source.remove(signal);
    refresh.destroy();
    loop.quit();
});
loop.run();
if (failed) System.exit(1);
