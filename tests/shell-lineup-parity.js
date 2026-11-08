// Native St geometry/outline parity: palette, tint and backing opacity are the only allowed differences.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import System from 'system';
import {makeShellStyles} from '../styles.js';
import {readText} from '../prefs-files.js';
import {writeText} from '../files.js';
GLib.setenv('GSETTINGS_BACKEND', 'memory', true);
Gio.resources_register(Gio.Resource.load('/usr/share/gnome-shell/gnome-shell-theme.gresource'));
const root = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const directory = Gio.File.new_for_path(GLib.dir_make_tmp('iridescence-lineup-XXXXXX'));
const context = new St.ThemeContext();
const font = Pango.FontDescription.from_string('Sans'); font.set_absolute_size(12 * Pango.SCALE); context.set_font(font);
const sources = Object.fromEntries(['light', 'dark'].map(mode => [mode, readText(root.get_child(`themes/shell-${mode}.css`)).text]));
const native = readText(Gio.File.new_for_uri('resource:///org/gnome/shell/theme/gnome-shell-dark.css')).text;
const paths = [
'.popup-menu-content', '.popup-menu-content .icon-button', '.popup-menu-content .button', '.popup-menu-content .button.flat',
'.popup-menu-content .quick-toggle.button', '.popup-menu-content .quick-toggle-has-menu .quick-toggle-menu-button.icon-button',
'.popup-menu-content .quick-settings-system-item .icon-button', '.popup-menu-content .quick-settings-system-item .power-item.button',
'.popup-menu-content .quick-slider .icon-button.flat', '.popup-menu-content .quick-toggle-menu',
'.popup-menu-content .quick-toggle-menu .header .icon', '.popup-menu-content .background-app-item .icon-button',
'.popup-menu-content .popup-menu-item', '.popup-menu-content .popup-sub-menu',
'.popup-menu-content .message', '.popup-menu-content .message .message-header .message-close-button',
'.popup-menu-content .message .message-header .message-expand-button', '.popup-menu-content .message-notification-group .message-collapse-button',
'.popup-menu-content .events-button', '.popup-menu-content .world-clocks-button', '.popup-menu-content .weather-button',
'.popup-menu-content .calendar', '.popup-menu-content .calendar .calendar-day', '.popup-menu-content .calendar .calendar-day.calendar-today',
'.popup-menu-content .calendar .calendar-month-header .calendar-month-label', '.popup-menu-content .calendar .calendar-month-header .pager-button',
'.popup-menu-content .datemenu-today-button', '.popup-menu-content .notification-button',
'.message.notification-banner', '.search-entry', '.search-section-content', '.search-section-content .list-search-result',
'.search-section-content .list-search-result .list-search-result-content', '.search-section-content .grid-search-result',
'.app-folder-dialog', '.app-folder-dialog .folder-name-container .folder-name-entry', '.app-folder-dialog .overview-tile',
'#dash .dash-item-container .overview-tile', '#dash .dash-item-container .show-apps', '#dash .dash-background',
'.switcher-list', '.switcher-list .item-box', '.osd-window', '.osd-window .icon-button',
'.modal-dialog', '.modal-dialog .modal-dialog-button-box .modal-dialog-button',
'#keyboard .keyboard-key', '.screenshot-ui-panel .screenshot-ui-type-button', '.screenshot-ui-panel .icon-button',
'.unlock-dialog .login-dialog-prompt-layout .login-dialog-prompt-entry',
];
const states = ['', 'hover', 'focus', 'active', 'checked', 'checked hover', 'checked focus', 'insensitive', 'checked insensitive'];
function theme(mode,tint,level){ const file=directory.get_child(`${mode}-${tint}-${level}.css`);writeText(file,makeShellStyles(sources[mode],mode==='dark',{tint,opacity:level==='dense'?90:65,transparency:level==='opaque'?'solid':'translucent'},native));return new St.Theme({default_stylesheet:Gio.File.new_for_uri(`resource:///org/gnome/shell/theme/gnome-shell-${mode}.css`),application_stylesheet:file}); }
function node(theme,path,state){let parent=St.ThemeNode.new(context,null,theme,GObject.TYPE_NONE,null,'',null,'font-size:12px;');const tokens=path.split(' ');for(let i=0;i<tokens.length;i++){const token=tokens[i];const classes=[...token.matchAll(/\.([\w-]+)/g)].map(m=>m[1]).join(' ');const entry=/entry/.test(classes);parent=St.ThemeNode.new(context,parent,theme,entry?St.Entry.$gtype:St.Button.$gtype,token.match(/#([\w-]+)/)?.[1]??null,classes,i===tokens.length-1?state:null,'font-size:12px;')}return parent;}
function snapshot(node){const result={};for(const side of [St.Side.TOP,St.Side.RIGHT,St.Side.BOTTOM,St.Side.LEFT])for(const p of ['padding','margin','border_width'])result[p+side]=node['get_'+p](side);for(const corner of [St.Corner.TOPLEFT,St.Corner.TOPRIGHT,St.Corner.BOTTOMRIGHT,St.Corner.BOTTOMLEFT])result['radius'+corner]=node.get_border_radius(corner);for(const p of ['width','height','min-width','min-height','max-width','max-height','spacing','icon-size'])result[p]=node.lookup_length(p,false).join(',');for(const p of ['box-shadow','-iridescence-shadow']){const[,s]=node.lookup_shadow(p,false);result[p]=s?[s.inset,s.xoffset,s.yoffset,s.blur,s.spread,s.color.alpha].join(','):null;}return result;}
const baseline=theme('dark','rich','dense');context.set_theme(baseline);const differences=[];let checks=0;
const expectedSnapshots=new Map(paths.flatMap(path=>states.map(state=>[path+'|'+state,snapshot(node(baseline,path,state))])));
for(const mode of ['dark','light'])for(const tint of ['subtle','balanced','rich'])for(const level of ['airy','dense','opaque']){if(ARGV[0]==='quick'&&(tint!=='rich'||level!=='dense'))continue;const current=theme(mode,tint,level);context.set_theme(current);for(const path of paths)for(const state of states){const expected=expectedSnapshots.get(path+'|'+state),actual=snapshot(node(current,path,state));for(const key of Object.keys(expected))if(expected[key]!==actual[key])differences.push({variant:`${mode}-${tint}-${level}`,path,state,key,expected:expected[key],actual:actual[key]});
if(/\.(events-button|world-clocks-button|weather-button)$/.test(path)) {
const card=node(current,path,state), border=card.get_border_color(St.Side.TOP), focus=state.split(' ').includes('focus'), disabled=state.split(' ').includes('insensitive');
const wanted=disabled?0:focus?217:51;
if(card.get_box_shadow()||Math.abs(border.alpha-wanted)>1)differences.push({variant:`${mode}-${tint}-${level}`,path,state,key:'single card border',expected:wanted,actual:border.alpha});
}checks++;}}
const edgePaths=['.popup-menu-content .events-button','.popup-menu-content .world-clocks-button','.popup-menu-content .weather-button','.message.notification-banner'];
const edges=[];for(const mode of ['dark','light']){const t=theme(mode,'rich','dense');for(const path of edgePaths){const n=node(t,path,'');const s=n.get_box_shadow();const c=n.get_border_color(St.Side.TOP);edges.push({mode,path,border:[c.red,c.green,c.blue,c.alpha],inset:s?[s.inset,s.spread,s.color.red,s.color.green,s.color.blue,s.color.alpha]:null});}}
const result={checks,paths:paths.length,states:states.length,variants:ARGV[0]==='quick'?2:18,differences,edges};
print(JSON.stringify(result));
for(const child of directory.enumerate_children('standard::name',Gio.FileQueryInfoFlags.NONE,null))directory.get_child(child.get_name()).delete(null);directory.delete(null);
System.exit(differences.length ? 1 : 0);
