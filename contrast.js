// Stroke/state data adapted from GNOME Shell 50.6 and libadwaita 1.9.4.
// Midpoint strokes use the supplied normal colors; see output/contrast-strength-reference.json.
export function makeShellContrast(dark, tint = 1) {
    const ink = dark ? '255,255,255' : '0,0,0';
    const normalInk = dark ? '250, 250, 251' : '34, 34, 38';
    const borderInk = dark ? '255, 255, 255' : '34, 34, 38';
    const focus = dark ? 'st-mix(-st-accent-color, #ffffff, 60%)' : '-st-accent-color';
    const checkedFocus = dark ? 'st-lighten(-st-accent-color, 30%)' : 'st-darken(-st-accent-color, 20%)';
    const menuBorder = `st-mix(-st-accent-color, ${dark ? '#424247' : '#e6e6eb'}, ${(dark ? 10 : 7) * tint}%)`;
    return `
/* Preserve native banner border allocation in both palettes. */
.notification-banner{border-width: 1px;}
#dash .dash-item-container .show-apps{box-shadow: none;}
#dash .dash-item-container .overview-tile{box-shadow: none;}
#dash .dash-item-container .grid-search-result{box-shadow: none;}
.popup-menu-content .icon-button, .switcher-list .icon-button, .app-folder-dialog .icon-button, #dash .icon-button, .search-section-content .icon-button, .osd-window .icon-button, .screenshot-ui-panel .icon-button, #keyboard .icon-button, .modal-dialog .icon-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .message-collapse-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button, .switcher-list .button, .app-folder-dialog .button, #dash .button, .search-section-content .button, .osd-window .button, .screenshot-ui-panel .button, #keyboard .button, .modal-dialog .button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button:focus, .switcher-list .icon-button:focus, .app-folder-dialog .icon-button:focus, #dash .icon-button:focus, .search-section-content .icon-button:focus, .osd-window .icon-button:focus, .screenshot-ui-panel .icon-button:focus, #keyboard .icon-button:focus, .modal-dialog .icon-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message-notification-group .message-collapse-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.popup-menu-content .button:focus, .switcher-list .button:focus, .app-folder-dialog .button:focus, #dash .button:focus, .search-section-content .button:focus, .osd-window .button:focus, .screenshot-ui-panel .button:focus, #keyboard .button:focus, .modal-dialog .button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.popup-menu-content .icon-button:hover, .switcher-list .icon-button:hover, .app-folder-dialog .icon-button:hover, #dash .icon-button:hover, .search-section-content .icon-button:hover, .osd-window .icon-button:hover, .screenshot-ui-panel .icon-button:hover, #keyboard .icon-button:hover, .modal-dialog .icon-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .message-collapse-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button:hover, .switcher-list .button:hover, .app-folder-dialog .button:hover, #dash .button:hover, .search-section-content .button:hover, .osd-window .button:hover, .screenshot-ui-panel .button:hover, #keyboard .button:hover, .modal-dialog .button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button:insensitive, .switcher-list .icon-button:insensitive, .app-folder-dialog .icon-button:insensitive, #dash .icon-button:insensitive, .search-section-content .icon-button:insensitive, .osd-window .icon-button:insensitive, .screenshot-ui-panel .icon-button:insensitive, #keyboard .icon-button:insensitive, .modal-dialog .icon-button:insensitive{box-shadow: none;}
.message-notification-group .message-collapse-button:insensitive{box-shadow: none;}
.popup-menu-content .button:insensitive, .switcher-list .button:insensitive, .app-folder-dialog .button:insensitive, #dash .button:insensitive, .search-section-content .button:insensitive, .osd-window .button:insensitive, .screenshot-ui-panel .button:insensitive, #keyboard .button:insensitive, .modal-dialog .button:insensitive{box-shadow: none;}
.popup-menu-content .icon-button:selected, .switcher-list .icon-button:selected, .app-folder-dialog .icon-button:selected, #dash .icon-button:selected, .search-section-content .icon-button:selected, .osd-window .icon-button:selected, .screenshot-ui-panel .icon-button:selected, #keyboard .icon-button:selected, .modal-dialog .icon-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-show-pointer-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-expand-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-close-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .message-collapse-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button:selected, .switcher-list .button:selected, .app-folder-dialog .button:selected, #dash .button:selected, .search-section-content .button:selected, .osd-window .button:selected, .screenshot-ui-panel .button:selected, #keyboard .button:selected, .modal-dialog .button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button:active, .switcher-list .icon-button:active, .app-folder-dialog .icon-button:active, #dash .icon-button:active, .search-section-content .icon-button:active, .osd-window .icon-button:active, .screenshot-ui-panel .icon-button:active, #keyboard .icon-button:active, .modal-dialog .icon-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .message-collapse-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button:active, .switcher-list .button:active, .app-folder-dialog .button:active, #dash .button:active, .search-section-content .button:active, .osd-window .button:active, .screenshot-ui-panel .button:active, #keyboard .button:active, .modal-dialog .button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button:checked, .switcher-list .icon-button:checked, .app-folder-dialog .icon-button:checked, #dash .icon-button:checked, .search-section-content .icon-button:checked, .osd-window .icon-button:checked, .screenshot-ui-panel .icon-button:checked, #keyboard .icon-button:checked, .modal-dialog .icon-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .message-collapse-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button:checked, .switcher-list .button:checked, .app-folder-dialog .button:checked, #dash .button:checked, .search-section-content .button:checked, .osd-window .button:checked, .screenshot-ui-panel .button:checked, #keyboard .button:checked, .modal-dialog .button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day-heading{box-shadow: none;}
.calendar .calendar-day{box-shadow: none;}
.calendar .calendar-month-header .calendar-month-label{box-shadow: none;}
.popup-menu-content .icon-button.flat, .switcher-list .icon-button.flat, .app-folder-dialog .icon-button.flat, #dash .icon-button.flat, .search-section-content .icon-button.flat, .osd-window .icon-button.flat, .screenshot-ui-panel .icon-button.flat, #keyboard .icon-button.flat, .modal-dialog .icon-button.flat{box-shadow: none;}
.flat.screenshot-ui-show-pointer-button{box-shadow: none;}
.message .message-header .flat.message-expand-button{box-shadow: none;}
.message .message-header .flat.message-close-button{box-shadow: none;}
.message-notification-group .flat.message-collapse-button{box-shadow: none;}
.calendar .calendar-month-header .pager-button{box-shadow: none;}
.popup-menu-content .button.flat, .switcher-list .button.flat, .app-folder-dialog .button.flat, #dash .button.flat, .search-section-content .button.flat, .osd-window .button.flat, .screenshot-ui-panel .button.flat, #keyboard .button.flat, .modal-dialog .button.flat{box-shadow: none;}
.calendar .calendar-day-heading:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.calendar .calendar-day:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.calendar .calendar-month-header .calendar-month-label:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.popup-menu-content .icon-button.flat:focus, .switcher-list .icon-button.flat:focus, .app-folder-dialog .icon-button.flat:focus, #dash .icon-button.flat:focus, .search-section-content .icon-button.flat:focus, .osd-window .icon-button.flat:focus, .screenshot-ui-panel .icon-button.flat:focus, #keyboard .icon-button.flat:focus, .modal-dialog .icon-button.flat:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.flat.screenshot-ui-show-pointer-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message .message-header .flat.message-expand-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message .message-header .flat.message-close-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message-notification-group .flat.message-collapse-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.calendar .calendar-month-header .pager-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.popup-menu-content .button.flat:focus, .switcher-list .button.flat:focus, .app-folder-dialog .button.flat:focus, #dash .button.flat:focus, .search-section-content .button.flat:focus, .osd-window .button.flat:focus, .screenshot-ui-panel .button.flat:focus, #keyboard .button.flat:focus, .modal-dialog .button.flat:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.calendar .calendar-day-heading:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .calendar-month-label:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button.flat:hover, .switcher-list .icon-button.flat:hover, .app-folder-dialog .icon-button.flat:hover, #dash .icon-button.flat:hover, .search-section-content .icon-button.flat:hover, .osd-window .icon-button.flat:hover, .screenshot-ui-panel .icon-button.flat:hover, #keyboard .icon-button.flat:hover, .modal-dialog .icon-button.flat:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.flat.screenshot-ui-show-pointer-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-expand-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-close-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .flat.message-collapse-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .pager-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button.flat:hover, .switcher-list .button.flat:hover, .app-folder-dialog .button.flat:hover, #dash .button.flat:hover, .search-section-content .button.flat:hover, .osd-window .button.flat:hover, .screenshot-ui-panel .button.flat:hover, #keyboard .button.flat:hover, .modal-dialog .button.flat:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day-heading:insensitive{box-shadow: none;}
.calendar .calendar-day:insensitive{box-shadow: none;}
.calendar .calendar-month-header .calendar-month-label:insensitive{box-shadow: none;}
.popup-menu-content .icon-button.flat:insensitive, .switcher-list .icon-button.flat:insensitive, .app-folder-dialog .icon-button.flat:insensitive, #dash .icon-button.flat:insensitive, .search-section-content .icon-button.flat:insensitive, .osd-window .icon-button.flat:insensitive, .screenshot-ui-panel .icon-button.flat:insensitive, #keyboard .icon-button.flat:insensitive, .modal-dialog .icon-button.flat:insensitive{box-shadow: none;}
.flat.screenshot-ui-show-pointer-button:insensitive{box-shadow: none;}
.message .message-header .flat.message-expand-button:insensitive{box-shadow: none;}
.message .message-header .flat.message-close-button:insensitive{box-shadow: none;}
.message-notification-group .flat.message-collapse-button:insensitive{box-shadow: none;}
.calendar .calendar-month-header .pager-button:insensitive{box-shadow: none;}
.popup-menu-content .button.flat:insensitive, .switcher-list .button.flat:insensitive, .app-folder-dialog .button.flat:insensitive, #dash .button.flat:insensitive, .search-section-content .button.flat:insensitive, .osd-window .button.flat:insensitive, .screenshot-ui-panel .button.flat:insensitive, #keyboard .button.flat:insensitive, .modal-dialog .button.flat:insensitive{box-shadow: none;}
.calendar .calendar-day-heading:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .calendar-month-label:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button.flat:selected, .switcher-list .icon-button.flat:selected, .app-folder-dialog .icon-button.flat:selected, #dash .icon-button.flat:selected, .search-section-content .icon-button.flat:selected, .osd-window .icon-button.flat:selected, .screenshot-ui-panel .icon-button.flat:selected, #keyboard .icon-button.flat:selected, .modal-dialog .icon-button.flat:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.flat.screenshot-ui-show-pointer-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-expand-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-close-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .flat.message-collapse-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .pager-button:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button.flat:selected, .switcher-list .button.flat:selected, .app-folder-dialog .button.flat:selected, #dash .button.flat:selected, .search-section-content .button.flat:selected, .osd-window .button.flat:selected, .screenshot-ui-panel .button.flat:selected, #keyboard .button.flat:selected, .modal-dialog .button.flat:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day-heading:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .calendar-month-label:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button.flat:active, .switcher-list .icon-button.flat:active, .app-folder-dialog .icon-button.flat:active, #dash .icon-button.flat:active, .search-section-content .icon-button.flat:active, .osd-window .icon-button.flat:active, .screenshot-ui-panel .icon-button.flat:active, #keyboard .icon-button.flat:active, .modal-dialog .icon-button.flat:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.flat.screenshot-ui-show-pointer-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-expand-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-close-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .flat.message-collapse-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .pager-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button.flat:active, .switcher-list .button.flat:active, .app-folder-dialog .button.flat:active, #dash .button.flat:active, .search-section-content .button.flat:active, .osd-window .button.flat:active, .screenshot-ui-panel .button.flat:active, #keyboard .button.flat:active, .modal-dialog .button.flat:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day-heading:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-day:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .calendar-month-label:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .icon-button.flat:checked, .switcher-list .icon-button.flat:checked, .app-folder-dialog .icon-button.flat:checked, #dash .icon-button.flat:checked, .search-section-content .icon-button.flat:checked, .osd-window .icon-button.flat:checked, .screenshot-ui-panel .icon-button.flat:checked, #keyboard .icon-button.flat:checked, .modal-dialog .icon-button.flat:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.flat.screenshot-ui-show-pointer-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-expand-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .flat.message-close-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .flat.message-collapse-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .pager-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content .button.flat:checked, .switcher-list .button.flat:checked, .app-folder-dialog .button.flat:checked, #dash .button.flat:checked, .search-section-content .button.flat:checked, .osd-window .button.flat:checked, .screenshot-ui-panel .button.flat:checked, #keyboard .button.flat:checked, .modal-dialog .button.flat:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-brightness-level .button:checked, #keyboard .keyboard-brightness-level .button:checked{box-shadow: none;}
.quick-toggle:checked, .popup-menu-content .quick-toggle:checked, .switcher-list .quick-toggle:checked, .app-folder-dialog .quick-toggle:checked, #dash .quick-toggle:checked, .search-section-content .quick-toggle:checked, .osd-window .quick-toggle:checked, .screenshot-ui-panel .quick-toggle:checked, #keyboard .quick-toggle:checked, .modal-dialog .quick-toggle:checked{box-shadow: none;}
.calendar .calendar-day.calendar-today{box-shadow: none;}
.popup-menu-content .icon-button.default, .switcher-list .icon-button.default, .app-folder-dialog .icon-button.default, #dash .icon-button.default, .search-section-content .icon-button.default, .osd-window .icon-button.default, .screenshot-ui-panel .icon-button.default, #keyboard .icon-button.default, .modal-dialog .icon-button.default{box-shadow: none;}
.default.screenshot-ui-show-pointer-button{box-shadow: none;}
.message .message-header .default.message-expand-button{box-shadow: none;}
.message .message-header .default.message-close-button{box-shadow: none;}
.message-notification-group .default.message-collapse-button{box-shadow: none;}
.calendar .calendar-month-header .default.pager-button{box-shadow: none;}
.popup-menu-content .button.default, .switcher-list .button.default, .app-folder-dialog .button.default, #dash .button.default, .search-section-content .button.default, .osd-window .button.default, .screenshot-ui-panel .button.default, #keyboard .button.default, .modal-dialog .button.default{box-shadow: none;}
.keyboard-brightness-level .button:focus:checked, #keyboard .keyboard-brightness-level .button:focus:checked{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.quick-toggle:focus:checked, .popup-menu-content .quick-toggle:focus:checked, .switcher-list .quick-toggle:focus:checked, .app-folder-dialog .quick-toggle:focus:checked, #dash .quick-toggle:focus:checked, .search-section-content .quick-toggle:focus:checked, .osd-window .quick-toggle:focus:checked, .screenshot-ui-panel .quick-toggle:focus:checked, #keyboard .quick-toggle:focus:checked, .modal-dialog .quick-toggle:focus:checked{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.calendar .calendar-day.calendar-today:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.popup-menu-content .icon-button.default:focus, .switcher-list .icon-button.default:focus, .app-folder-dialog .icon-button.default:focus, #dash .icon-button.default:focus, .search-section-content .icon-button.default:focus, .osd-window .icon-button.default:focus, .screenshot-ui-panel .icon-button.default:focus, #keyboard .icon-button.default:focus, .modal-dialog .icon-button.default:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.default.screenshot-ui-show-pointer-button:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${focus}, 0.2), 50%) !important;}
.message .message-header .default.message-expand-button:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${focus}, 0.2), 50%) !important;}
.message .message-header .default.message-close-button:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${focus}, 0.2), 50%) !important;}
.message-notification-group .default.message-collapse-button:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${focus}, 0.2), 50%) !important;}
.calendar .calendar-month-header .default.pager-button:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${focus}, 0.2), 50%) !important;}
.popup-menu-content .button.default:focus, .switcher-list .button.default:focus, .app-folder-dialog .button.default:focus, #dash .button.default:focus, .search-section-content .button.default:focus, .osd-window .button.default:focus, .screenshot-ui-panel .button.default:focus, #keyboard .button.default:focus, .modal-dialog .button.default:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.keyboard-brightness-level .button:hover:checked, #keyboard .keyboard-brightness-level .button:hover:checked{box-shadow: none;}
.quick-toggle:hover:checked, .popup-menu-content .quick-toggle:hover:checked, .switcher-list .quick-toggle:hover:checked, .app-folder-dialog .quick-toggle:hover:checked, #dash .quick-toggle:hover:checked, .search-section-content .quick-toggle:hover:checked, .osd-window .quick-toggle:hover:checked, .screenshot-ui-panel .quick-toggle:hover:checked, #keyboard .quick-toggle:hover:checked, .modal-dialog .quick-toggle:hover:checked{box-shadow: none;}
.calendar .calendar-day.calendar-today:hover{box-shadow: none;}
.popup-menu-content .icon-button.default:hover, .switcher-list .icon-button.default:hover, .app-folder-dialog .icon-button.default:hover, #dash .icon-button.default:hover, .search-section-content .icon-button.default:hover, .osd-window .icon-button.default:hover, .screenshot-ui-panel .icon-button.default:hover, #keyboard .icon-button.default:hover, .modal-dialog .icon-button.default:hover{box-shadow: none;}
.default.screenshot-ui-show-pointer-button:hover{box-shadow: none;}
.message .message-header .default.message-expand-button:hover{box-shadow: none;}
.message .message-header .default.message-close-button:hover{box-shadow: none;}
.message-notification-group .default.message-collapse-button:hover{box-shadow: none;}
.calendar .calendar-month-header .default.pager-button:hover{box-shadow: none;}
.popup-menu-content .button.default:hover, .switcher-list .button.default:hover, .app-folder-dialog .button.default:hover, #dash .button.default:hover, .search-section-content .button.default:hover, .osd-window .button.default:hover, .screenshot-ui-panel .button.default:hover, #keyboard .button.default:hover, .modal-dialog .button.default:hover{box-shadow: none;}
.keyboard-brightness-level .button:insensitive:checked, #keyboard .keyboard-brightness-level .button:insensitive:checked{box-shadow: none;}
.quick-toggle:insensitive:checked, .popup-menu-content .quick-toggle:insensitive:checked, .switcher-list .quick-toggle:insensitive:checked, .app-folder-dialog .quick-toggle:insensitive:checked, #dash .quick-toggle:insensitive:checked, .search-section-content .quick-toggle:insensitive:checked, .osd-window .quick-toggle:insensitive:checked, .screenshot-ui-panel .quick-toggle:insensitive:checked, #keyboard .quick-toggle:insensitive:checked, .modal-dialog .quick-toggle:insensitive:checked{box-shadow: none;}
.calendar .calendar-day.calendar-today:insensitive{box-shadow: none;}
.popup-menu-content .icon-button.default:insensitive, .switcher-list .icon-button.default:insensitive, .app-folder-dialog .icon-button.default:insensitive, #dash .icon-button.default:insensitive, .search-section-content .icon-button.default:insensitive, .osd-window .icon-button.default:insensitive, .screenshot-ui-panel .icon-button.default:insensitive, #keyboard .icon-button.default:insensitive, .modal-dialog .icon-button.default:insensitive{box-shadow: none;}
.default.screenshot-ui-show-pointer-button:insensitive{box-shadow: none;}
.message .message-header .default.message-expand-button:insensitive{box-shadow: none;}
.message .message-header .default.message-close-button:insensitive{box-shadow: none;}
.message-notification-group .default.message-collapse-button:insensitive{box-shadow: none;}
.calendar .calendar-month-header .default.pager-button:insensitive{box-shadow: none;}
.popup-menu-content .button.default:insensitive, .switcher-list .button.default:insensitive, .app-folder-dialog .button.default:insensitive, #dash .button.default:insensitive, .search-section-content .button.default:insensitive, .osd-window .button.default:insensitive, .screenshot-ui-panel .button.default:insensitive, #keyboard .button.default:insensitive, .modal-dialog .button.default:insensitive{box-shadow: none;}
.keyboard-brightness-level .button:active:checked, #keyboard .keyboard-brightness-level .button:active:checked{box-shadow: none;}
.quick-toggle:active:checked, .popup-menu-content .quick-toggle:active:checked, .switcher-list .quick-toggle:active:checked, .app-folder-dialog .quick-toggle:active:checked, #dash .quick-toggle:active:checked, .search-section-content .quick-toggle:active:checked, .osd-window .quick-toggle:active:checked, .screenshot-ui-panel .quick-toggle:active:checked, #keyboard .quick-toggle:active:checked, .modal-dialog .quick-toggle:active:checked{box-shadow: none;}
.calendar .calendar-day.calendar-today:active{box-shadow: none;}
.popup-menu-content .icon-button.default:active, .switcher-list .icon-button.default:active, .app-folder-dialog .icon-button.default:active, #dash .icon-button.default:active, .search-section-content .icon-button.default:active, .osd-window .icon-button.default:active, .screenshot-ui-panel .icon-button.default:active, #keyboard .icon-button.default:active, .modal-dialog .icon-button.default:active{box-shadow: none;}
.default.screenshot-ui-show-pointer-button:active{box-shadow: none;}
.message .message-header .default.message-expand-button:active{box-shadow: none;}
.message .message-header .default.message-close-button:active{box-shadow: none;}
.message-notification-group .default.message-collapse-button:active{box-shadow: none;}
.calendar .calendar-month-header .default.pager-button:active{box-shadow: none;}
.popup-menu-content .button.default:active, .switcher-list .button.default:active, .app-folder-dialog .button.default:active, #dash .button.default:active, .search-section-content .button.default:active, .osd-window .button.default:active, .screenshot-ui-panel .button.default:active, #keyboard .button.default:active, .modal-dialog .button.default:active{box-shadow: none;}
.quick-toggle-menu{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.events-button{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.world-clocks-button{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.weather-button{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.quick-toggle-menu:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message:hover{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.events-button:hover{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.world-clocks-button:hover{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.weather-button:hover{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.quick-toggle-menu:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message:active{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.events-button:active{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.world-clocks-button:active{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.weather-button:active{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.quick-toggle-menu:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message:focus{border-color: st-transparentize(${focus}, 0.15); box-shadow: none !important;}
.events-button:focus{border-color: st-transparentize(${focus}, 0.15); box-shadow: none !important;}
.world-clocks-button:focus{border-color: st-transparentize(${focus}, 0.15); box-shadow: none !important;}
.weather-button:focus{border-color: st-transparentize(${focus}, 0.15); box-shadow: none !important;}
.message:insensitive{border-color: transparent; box-shadow: none;}
.events-button:insensitive{border-color: transparent; box-shadow: none;}
.world-clocks-button:insensitive{border-color: transparent; box-shadow: none;}
.weather-button:insensitive{border-color: transparent; box-shadow: none;}
.calendar{box-shadow: none;}
.datemenu-today-button{box-shadow: none;}
.calendar:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.datemenu-today-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.datemenu-today-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.datemenu-today-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.calendar:insensitive{box-shadow: none;}
.datemenu-today-button:insensitive{box-shadow: none;}
.popup-menu-content StEntry, .switcher-list StEntry, .app-folder-dialog StEntry, #dash StEntry, .search-section-content StEntry, .osd-window StEntry, .screenshot-ui-panel StEntry, #keyboard StEntry, .modal-dialog StEntry{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content StEntry:hover, .switcher-list StEntry:hover, .app-folder-dialog StEntry:hover, #dash StEntry:hover, .search-section-content StEntry:hover, .osd-window StEntry:hover, .screenshot-ui-panel StEntry:hover, #keyboard StEntry:hover, .modal-dialog StEntry:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content StEntry:focus, .switcher-list StEntry:focus, .app-folder-dialog StEntry:focus, #dash StEntry:focus, .search-section-content StEntry:focus, .osd-window StEntry:focus, .screenshot-ui-panel StEntry:focus, #keyboard StEntry:focus, .modal-dialog StEntry:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.popup-menu-content StEntry:insensitive, .switcher-list StEntry:insensitive, .app-folder-dialog StEntry:insensitive, #dash StEntry:insensitive, .search-section-content StEntry:insensitive, .osd-window StEntry:insensitive, .screenshot-ui-panel StEntry:insensitive, #keyboard StEntry:insensitive, .modal-dialog StEntry:insensitive{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.notification-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-expand-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-close-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.notification-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message .message-header .message-expand-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.message .message-header .message-close-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.notification-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-expand-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-close-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.notification-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-expand-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-close-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.notification-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-expand-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .message-close-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.notification-button:insensitive{box-shadow: none;}
.message .message-header .message-expand-button:insensitive{box-shadow: none;}
.message .message-header .message-close-button:insensitive{box-shadow: none;}
.modal-dialog .modal-dialog-button-box .modal-dialog-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.modal-dialog .modal-dialog-button-box .modal-dialog-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.modal-dialog .modal-dialog-button-box .modal-dialog-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.modal-dialog .modal-dialog-button-box .modal-dialog-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.modal-dialog .modal-dialog-button-box .modal-dialog-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.modal-dialog .modal-dialog-button-box .modal-dialog-button:insensitive{box-shadow: none;}
.screenshot-ui-panel{box-shadow: none;}
.workspace-switcher{box-shadow: none;}
.resize-popup{box-shadow: none;}
.screenshot-ui-show-pointer-button{box-shadow: none;}
.screenshot-ui-type-button{box-shadow: none;}
.screenshot-ui-show-pointer-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.screenshot-ui-type-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.screenshot-ui-show-pointer-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-type-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-show-pointer-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-type-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-show-pointer-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-type-button:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-show-pointer-button:insensitive{box-shadow: none;}
.screenshot-ui-type-button:insensitive{box-shadow: none;}
.app-folder-dialog .folder-name-container .folder-name-entry{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-entry, .popup-menu-content .search-entry, .switcher-list .search-entry, .app-folder-dialog .search-entry, #dash .search-entry, .search-section-content .search-entry, .osd-window .search-entry, .screenshot-ui-panel .search-entry, #keyboard .search-entry, .modal-dialog .search-entry{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .folder-name-container .folder-name-entry:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-entry:hover, .popup-menu-content .search-entry:hover, .switcher-list .search-entry:hover, .app-folder-dialog .search-entry:hover, #dash .search-entry:hover, .search-section-content .search-entry:hover, .osd-window .search-entry:hover, .screenshot-ui-panel .search-entry:hover, #keyboard .search-entry:hover, .modal-dialog .search-entry:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .folder-name-container .folder-name-entry:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.search-entry:focus, .popup-menu-content .search-entry:focus, .switcher-list .search-entry:focus, .app-folder-dialog .search-entry:focus, #dash .search-entry:focus, .search-section-content .search-entry:focus, .osd-window .search-entry:focus, .screenshot-ui-panel .search-entry:focus, #keyboard .search-entry:focus, .modal-dialog .search-entry:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.app-folder-dialog .folder-name-container .folder-name-entry:insensitive{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-entry:insensitive, .popup-menu-content .search-entry:insensitive, .switcher-list .search-entry:insensitive, .app-folder-dialog .search-entry:insensitive, #dash .search-entry:insensitive, .search-section-content .search-entry:insensitive, .osd-window .search-entry:insensitive, .screenshot-ui-panel .search-entry:insensitive, #keyboard .search-entry:insensitive, .modal-dialog .search-entry:insensitive{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.check-box:focus StBin{box-shadow: inset 0 0 0 1px st-transparentize(-st-accent-color, 0.65);}
.popup-menu-item{box-shadow: none;}
.popup-menu-item:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-item:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-item:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-item:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-item:insensitive{box-shadow: none;}
.popup-sub-menu .popup-menu-item{box-shadow: none;}
.popup-sub-menu .popup-menu-item:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-sub-menu .popup-menu-item:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-sub-menu .popup-menu-item:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-sub-menu .popup-menu-item:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-sub-menu .popup-menu-item:insensitive{box-shadow: none;}
.message:second-in-stack{border-color: rgba(${ink}, 0.1); box-shadow: none;}
.message:lower-in-stack{border-color: rgba(${ink}, 0.1); box-shadow: none;}
.candidate-page-button-previous{box-shadow: none;}
.candidate-page-button-next{box-shadow: none;}
.notification-banner{border-color: rgba(${ink}, 0.2); box-shadow: none;}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device{box-shadow: none;}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.audio-device-selection-dialog .audio-selection-box .audio-selection-device:insensitive{box-shadow: none;}
.switcher-list .item-box{box-shadow: none;}
.switcher-list .item-box:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.switcher-list .item-box:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.switcher-list .item-box:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.switcher-list .item-box:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.switcher-list .item-box:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.switcher-list .item-box:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.switcher-list .item-box:insensitive{box-shadow: none;}
.screenshot-ui-shot-cast-container{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.screenshot-ui-shot-cast-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#panel .panel-button:focus{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button:active{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button:checked{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button:active:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel .panel-button:checked:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel .panel-button.screen-recording-indicator{box-shadow: inset 0 0 0 100px #c01c28;}
#panel .panel-button.screen-recording-indicator:focus{box-shadow: inset 0 0 0 100px #d61f2d;}
#panel .panel-button.screen-recording-indicator:hover{box-shadow: inset 0 0 0 100px #d61f2d;}
#panel .panel-button.screen-recording-indicator:active{box-shadow: inset 0 0 0 100px #e02a37;}
#panel .panel-button.screen-recording-indicator:checked{box-shadow: inset 0 0 0 100px #e02a37;}
#panel .panel-button.screen-recording-indicator:active:hover{box-shadow: inset 0 0 0 100px #e13340;}
#panel .panel-button.screen-recording-indicator:checked:hover{box-shadow: inset 0 0 0 100px #e13340;}
#panel .panel-button.screen-sharing-indicator{box-shadow: inset 0 0 0 100px #ff7800;}
#panel .panel-button.screen-sharing-indicator:focus{box-shadow: inset 0 0 0 100px #ff861a;}
#panel .panel-button.screen-sharing-indicator:hover{box-shadow: inset 0 0 0 100px #ff861a;}
#panel .panel-button.screen-sharing-indicator:active{box-shadow: inset 0 0 0 100px #ff902e;}
#panel .panel-button.screen-sharing-indicator:checked{box-shadow: inset 0 0 0 100px #ff902e;}
#panel .panel-button.screen-sharing-indicator:active:hover{box-shadow: inset 0 0 0 100px #ff9638;}
#panel .panel-button.screen-sharing-indicator:checked:hover{box-shadow: inset 0 0 0 100px #ff9638;}
#panel .panel-button.clock-display:focus{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button.clock-display:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button.clock-display:active{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button.clock-display:checked{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button.clock-display:active:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel .panel-button.clock-display:checked:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel .panel-button.clock-display:focus .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button.clock-display:hover .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel .panel-button.clock-display:active .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button.clock-display:checked .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel .panel-button.clock-display:active .clock:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel .panel-button.clock-display:checked .clock:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button.screen-recording-indicator{box-shadow: inset 0 0 0 100px #c01c28;}
#panel:overview .panel-button.screen-recording-indicator:focus{box-shadow: inset 0 0 0 100px #d61f2d;}
#panel:overview .panel-button.screen-recording-indicator:hover{box-shadow: inset 0 0 0 100px #d61f2d;}
#panel:overview .panel-button.screen-recording-indicator:active{box-shadow: inset 0 0 0 100px #e02a37;}
#panel:overview .panel-button.screen-recording-indicator:checked{box-shadow: inset 0 0 0 100px #e02a37;}
#panel:overview .panel-button.screen-recording-indicator:active:hover{box-shadow: inset 0 0 0 100px #e13340;}
#panel:overview .panel-button.screen-recording-indicator:checked:hover{box-shadow: inset 0 0 0 100px #e13340;}
#panel:overview .panel-button.screen-sharing-indicator{box-shadow: inset 0 0 0 100px #ff7800;}
#panel:overview .panel-button.screen-sharing-indicator:focus{box-shadow: inset 0 0 0 100px #ff861a;}
#panel:overview .panel-button.screen-sharing-indicator:hover{box-shadow: inset 0 0 0 100px #ff861a;}
#panel:overview .panel-button.screen-sharing-indicator:active{box-shadow: inset 0 0 0 100px #ff902e;}
#panel:overview .panel-button.screen-sharing-indicator:checked{box-shadow: inset 0 0 0 100px #ff902e;}
#panel:overview .panel-button.screen-sharing-indicator:active:hover{box-shadow: inset 0 0 0 100px #ff9638;}
#panel:overview .panel-button.screen-sharing-indicator:checked:hover{box-shadow: inset 0 0 0 100px #ff9638;}
#panel:overview .panel-button{box-shadow: inset 0 0 0 100px transparent;}
#panel:overview .panel-button:focus{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button:active{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button:checked{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button:active:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button:checked:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button.clock-display:focus{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button.clock-display:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button.clock-display:active{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button.clock-display:checked{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button.clock-display:active:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button.clock-display:checked:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button.clock-display:focus .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button.clock-display:hover .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.17);}
#panel:overview .panel-button.clock-display:active .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button.clock-display:checked .clock{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.28);}
#panel:overview .panel-button.clock-display:active .clock:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
#panel:overview .panel-button.clock-display:checked .clock:hover{box-shadow: inset 0 0 0 100px rgba(${ink}, 0.32);}
.quick-toggle-has-menu .quick-toggle-menu-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.quick-toggle-has-menu .quick-toggle-menu-button:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.quick-toggle-has-menu .quick-toggle-menu-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.quick-toggle-has-menu .quick-toggle-menu-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.quick-toggle-has-menu .quick-toggle-menu-button:checked{box-shadow: none;}
.quick-toggle-has-menu .quick-toggle-menu-button:checked:focus{box-shadow: inset 0 0 0 1px st-mix(st-transparentize(st-lighten(-st-accent-color, 30%), 0.1), st-transparentize(${checkedFocus}, 0.2), 50%) !important;}
.quick-toggle-has-menu .quick-toggle-menu-button:checked:hover{box-shadow: none;}
.quick-toggle-has-menu .quick-toggle-menu-button:checked:active{box-shadow: none;}
.quick-slider .slider-bin:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.quick-toggle-menu:insensitive{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.quick-toggle-menu .header .icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.quick-toggle-menu .header .icon.active{box-shadow: none;}
.quick-settings-system-item .power-item:insensitive{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result{box-shadow: none;}
.search-provider-icon{box-shadow: none;}
.list-search-result:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.search-provider-icon:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.list-search-result:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-provider-icon:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-provider-icon:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-provider-icon:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-provider-icon:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.search-provider-icon:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.list-search-result:insensitive{box-shadow: none;}
.search-provider-icon:insensitive{box-shadow: none;}
#dash .dash-background{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .show-apps .overview-icon{box-shadow: none;}
#dash .dash-item-container .overview-tile .overview-icon{box-shadow: none;}
#dash .dash-item-container .grid-search-result .overview-icon{box-shadow: none;}
#dash .dash-item-container .show-apps:focus .overview-icon{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
#dash .dash-item-container .overview-tile:focus .overview-icon{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
#dash .dash-item-container .grid-search-result:focus .overview-icon{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
#dash .dash-item-container .show-apps:hover .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .overview-tile:hover .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .grid-search-result:hover .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .show-apps:active .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .overview-tile:active .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .grid-search-result:active .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .show-apps:checked .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .overview-tile:checked .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#dash .dash-item-container .grid-search-result:checked .overview-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile{box-shadow: none;}
.grid-search-result{box-shadow: none;}
.overview-tile:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.grid-search-result:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.overview-tile:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.grid-search-result:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.grid-search-result:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.grid-search-result:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.grid-search-result:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.grid-search-result:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.overview-tile:insensitive{box-shadow: none;}
.grid-search-result:insensitive{box-shadow: none;}
.app-folder{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.app-folder:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder:insensitive{box-shadow: none;}
.app-folder-dialog{box-shadow: inset 0 0 0 1px st-mix(rgba(${ink}, 0.4), rgba(${normalInk}, 0.1), 50%);}
.app-folder-dialog .icon-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .calendar .calendar-month-header .pager-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .app-folder-dialog .pager-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message-notification-group .message-collapse-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .app-folder-dialog .message-collapse-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-expand-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-expand-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-close-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-close-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .screenshot-ui-show-pointer-button{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .icon-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .calendar .calendar-month-header .pager-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .app-folder-dialog .pager-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message-notification-group .message-collapse-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .app-folder-dialog .message-collapse-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-expand-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-expand-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-close-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-close-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .screenshot-ui-show-pointer-button:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .icon-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .calendar .calendar-month-header .pager-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.calendar .calendar-month-header .app-folder-dialog .pager-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message-notification-group .message-collapse-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message-notification-group .app-folder-dialog .message-collapse-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-expand-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-expand-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .message .message-header .message-close-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.message .message-header .app-folder-dialog .message-close-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .screenshot-ui-show-pointer-button:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .page-navigation-arrow{box-shadow: none;}
.app-folder-dialog .page-navigation-arrow:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .page-navigation-arrow:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile{box-shadow: none;}
.app-folder-dialog .grid-search-result{box-shadow: none;}
.app-folder-dialog .overview-tile:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.app-folder-dialog .grid-search-result:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.app-folder-dialog .overview-tile:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .grid-search-result:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .grid-search-result:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .grid-search-result:highlighted{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .grid-search-result:selected{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .grid-search-result:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.app-folder-dialog .overview-tile:insensitive{box-shadow: none;}
.app-folder-dialog .grid-search-result:insensitive{box-shadow: none;}
.system-action-icon{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.page-navigation-arrow{box-shadow: none;}
.page-navigation-arrow:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.page-navigation-arrow:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
#keyboard{box-shadow: inset 0 1px 0 0 st-mix(rgba(${ink}, 0.2), rgba(${borderInk}, 0.02), 50%);}
.keyboard-key{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.keyboard-key:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key.default-key{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key.default-key:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key.default-key:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.keyboard-key.default-key:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.word-suggestions StButton{box-shadow: none;}
.word-suggestions StButton:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.word-suggestions StButton:hover{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.word-suggestions StButton:active{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.word-suggestions StButton:checked{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.popup-menu-content{border-color: st-mix(rgba(${ink}, 0.5), ${menuBorder}, 50%); box-shadow: none;}
.switcher-list, .osd-window{border-color: st-mix(rgba(${ink}, 0.4), rgba(${borderInk}, 0.02), 50%);}
.window-close, .screenshot-ui-close-button{border-color: rgba(${ink}, 0.2); border-width: 1px;}
/* Lock-screen cards have no physical border allocation. */
.unlock-dialog-notifications-container .message,
.unlock-dialog-notifications-container .unlock-dialog-notification-source{box-shadow: inset 0 0 0 1px rgba(${ink}, 0.2);}
.unlock-dialog-notifications-container .message:focus{box-shadow: inset 0 0 0 1px st-transparentize(${focus}, 0.15) !important;}
.unlock-dialog-notifications-container .message:insensitive{box-shadow: none;}
`;
}

export const GTK_CONTRAST = `
/* Midpoint contrast strokes, based on libadwaita 1.9.4.
 * Deliberately omits the compiled button families: reuse existing Iridescence flat/button
 * selector coverage with midpoint inset stroke values.
 * No global libadwaita helper-variable overrides, fills, font, widget opacity or layout changes.
 */
button:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }

/* upstream line 542 */
calendar > grid > label:focus { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 558 */
checkbutton:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 566 */
check, radio { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 32.5%, transparent); }
/* upstream line 570 */
check:not(:checked):not(:indeterminate):hover, radio:not(:checked):not(:indeterminate):hover { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 40%, transparent); }
/* upstream line 572 */
check:not(:checked):not(:indeterminate):active, radio:not(:checked):not(:indeterminate):active { box-shadow: none; }
/* upstream line 576 */
check:checked, check:indeterminate, radio:checked, radio:indeterminate { box-shadow: none; }
/* upstream line 624 */
colorswatch > overlay { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--view-fg-color, currentColor) 25%, transparent); }
/* upstream line 630 */
colorswatch.light > overlay { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--view-fg-color, currentColor) 5%, transparent); }
/* upstream line 658 */
columnview:focus:focus-visible, treeview.view:focus:focus-visible, window.print:not(.ssd-frame) treeview.dialog-action-box:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 781 */
iconview:selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 787 */
iconview:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 990 */
spinbutton, entry { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 996 */
spinbutton:focus-within, entry:focus-within { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1000 */
spinbutton.flat:focus-within, spinbutton.flat:disabled, spinbutton.flat, entry.flat:focus-within, entry.flat:disabled, entry.flat { box-shadow: none; }
/* upstream line 1022 */
spinbutton:drop(active), entry:drop(active):focus-within, entry:drop(active) { border-color: var(--accent-bg-color, @accent_color); box-shadow: inset 0 0 0 1px var(--accent-bg-color, @accent_color); }
/* upstream line 1230 */
windowcontrols > button > image { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 1475 */
row:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1578 */
row.entry.focused, row.spin.focused { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1616 */
list.boxed-list-separate > row.expander row.header:focus:focus-visible, list.boxed-list > row:focus:focus-visible, list.content > row:focus:focus-visible, list.boxed-list > row.expander row.header:focus:focus-visible, list.content > row.expander row.header:focus:focus-visible, row.expander list.nested > row:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1618 */
list.boxed-list-separate > row.expander row.header, list.boxed-list > row, list.content > row, list.boxed-list > row.expander row.header, list.content > row.expander row.header, row.expander list.nested > row { border-bottom-color: color-mix(in srgb, var(--card-shade-color, @card_shade_color) 50%, color-mix(in srgb, currentColor 50%, transparent)); }
/* upstream line 1697 */
list.boxed-list-separate > row:drop(active):focus, list.boxed-list-separate > row:drop(active) { box-shadow: 0 0 0 1px color-mix(in srgb, RGB(0 0 6/3%) 50%, color-mix(in srgb, currentColor 50%, transparent)), 0 1px 3px 1px RGB(0 0 6/4.9%), 0 2px 6px 2px RGB(0 0 6/2.1%), inset 0 0 0 1px var(--accent-bg-color, @accent_color); }
/* upstream line 1707 */
list.boxed-list-separate > row:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1739 */
popover.menu box.circular-buttons button.circular.image-button.model:selected { box-shadow: none; }
/* upstream line 1759 */
popover.menu check, popover.menu check:hover:checked, popover.menu check:hover:indeterminate, popover.menu check:hover:not(:checked):not(:indeterminate), popover.menu check:active:checked, popover.menu check:active:indeterminate, popover.menu check:active:not(:checked):not(:indeterminate), popover.menu radio, popover.menu radio:hover:checked, popover.menu radio:hover:indeterminate, popover.menu radio:hover:not(:checked):not(:indeterminate), popover.menu radio:active:checked, popover.menu radio:active:indeterminate, popover.menu radio:active:not(:checked):not(:indeterminate) { box-shadow: none; }
/* upstream line 1765 */
popover.menu radio { border-color: color-mix(in srgb, currentColor 55%, transparent); }
/* upstream line 1777 */
popover.menu modelbutton:hover, popover.menu modelbutton:selected, popover.menu modelbutton:active { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 1805 */
popover.menu list > row:hover, popover.menu list > row:active, popover.menu list > row.has-open-popup, popover.menu listview > row:hover, popover.menu listview > row:active, popover.menu listview > row.has-open-popup { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 1902 */
toast { box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent), 0 1px 3px 1px RGB(0 0 6/7%), 0 2px 6px 2px RGB(0 0 6/3%); }
/* upstream line 1944 */
list.boxed-list, list.content, list.boxed-list-separate > row, .card { box-shadow: 0 0 0 1px color-mix(in srgb, RGB(0 0 6/3%) 50%, color-mix(in srgb, currentColor 50%, transparent)), 0 1px 3px 1px RGB(0 0 6/4.9%), 0 2px 6px 2px RGB(0 0 6/2.1%); }
/* upstream line 1948 */
.osd list.boxed-list, .osd list.content, .osd list.boxed-list-separate > row, list.osd.boxed-list, list.osd.content, list.boxed-list-separate > row.osd, .osd .card, .card.osd { box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 1954 */
.card:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 1981 */
notebook:focus:focus-visible > header > tabs > tab:checked { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2117 */
.solid-csd popover > arrow, .solid-csd popover > contents { box-shadow: none; }
/* upstream line 2121 */
.osd popover > arrow, .osd popover > contents, popover.touch-selection > arrow, popover.touch-selection > contents, popover.magnifier > arrow, popover.magnifier > contents { border-color: RGB(255 255 255/10%); box-shadow: none; }
/* upstream line 2167 */
scale > trough > fill, scale > trough, progressbar > trough { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2177 */
scale:focus:focus-visible > trough > slider { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2179 */
scale { ---slider-border-color: RGB(0 0 6 / 22.5%); }
/* upstream line 2195 */
scale:disabled > trough > slider { outline-color: RGB(0 0 6/35%); }
/* upstream line 2303 */
scrollbar.overlay-indicator > range > trough > slider { outline-color: color-mix(in srgb, var(--scrollbar-outline-color, currentColor) 80%, transparent); }
/* upstream line 2307 */
scrollbar.overlay-indicator:not(.hovering) > range > trough > slider { outline-color: color-mix(in srgb, var(--scrollbar-outline-color, currentColor) 47.5%, transparent); }
/* upstream line 2383 */
shortcut-label:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2461 */
.navigation-sidebar > row:selected, .navigation-sidebar > child:selected, .navigation-sidebar > flowboxchild:selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
.navigation-sidebar > row.activatable:hover, .navigation-sidebar > row.activatable:active, .navigation-sidebar > child.activatable:hover, .navigation-sidebar > child.activatable:active, .navigation-sidebar > flowboxchild:hover, .navigation-sidebar > flowboxchild:active { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
.navigation-sidebar > row.activatable.has-open-popup { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2504 */
spinbutton > button.image-button.up:not(.flat):not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque), spinbutton > button.image-button.down:not(.flat):not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque) { border-color: color-mix(in srgb, currentColor 30%, transparent); }
/* upstream line 2538 */
switch:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2576 */
tabbar tabbox > tabboxchild:focus-within:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2588 */
tabbar tab:hover, tabbar tab:active, tabbar tab:selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2602 */
tabbar tabbox.single-tab tab, tabbar tabbox.single-tab tab:hover, tabbar tabbox.single-tab tab:active { box-shadow: none; }
/* upstream line 2634 */
tabgrid > tabgridchild:focus:focus-visible .card { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2654 */
tabthumbnail .card { box-shadow: 0 0 0 1px RGB(0 0 6/26.5%), 0 1px 3px 1px RGB(0 0 6/4.9%), 0 2px 6px 2px RGB(0 0 6/2.1%); }
/* upstream line 2672 */
tabthumbnail button > image { box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 50%, transparent); }
/* upstream line 2701 */
toggle-group { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
toggle-group:disabled { box-shadow: inset 0 0 0 1px color-mix(in srgb, color-mix(in srgb, currentColor 25%, transparent) var(--disabled-opacity, 50%), transparent); }
/* upstream line 2721 */
toggle-group > toggle:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2727 */
toggle-group > toggle:hover, toggle-group > toggle:active { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2733 */
toggle-group > toggle:checked { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent), 0 1px 3px 1px RGB(0 0 6/4.9%), 0 2px 6px 2px RGB(0 0 6/2.1%); }
toggle-group > toggle:checked:disabled { box-shadow: inset 0 0 0 1px color-mix(in srgb, color-mix(in srgb, currentColor 25%, transparent) var(--disabled-opacity, 50%), transparent); }
/* upstream line 2737 */
toggle-group.osd:not(.flat) > toggle:checked, .osd toggle-group:not(.flat) > toggle:checked { box-shadow: 0 1px 3px 1px RGB(0 0 6/7%), 0 2px 6px 2px RGB(0 0 6/3%); }
/* upstream line 2743 */
toggle-group.osd:not(.flat) > toggle:checked:focus:focus-visible, .osd toggle-group:not(.flat) > toggle:checked:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2747 */
toggle-group.osd:not(.flat) > toggle:checked:focus:focus-visible, .osd toggle-group:not(.flat) > toggle:checked:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, RGB(255 255 255/75%) 65%, transparent); }
/* upstream line 2749 */
toggle-group.osd:not(.flat) > toggle:checked:disabled, .osd toggle-group:not(.flat) > toggle:checked:disabled { box-shadow: none; }
/* upstream line 2773 */
toggle-group.flat { box-shadow: none; }
/* upstream line 2779 */
toggle-group.flat > toggle:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2781 */
toggle-group.flat > toggle:checked { box-shadow: none; }
/* upstream line 2783 */
toggle-group.flat > toggle:checked { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2944 */
flowbox > flowboxchild:focus:focus-visible, gridview > child:focus:focus-visible { outline-width: 1px; outline-color: color-mix(in srgb, var(--accent-color, @accent_color) 65%, transparent); }
/* upstream line 2948 */
flowbox > flowboxchild:selected, gridview > child:selected { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
/* upstream line 2958 */
flowbox > flowboxchild:hover, flowbox > flowboxchild:active, gridview > child.activatable:hover, gridview > child.activatable:active { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }
.nautilus-pathbar { box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent); }`;
