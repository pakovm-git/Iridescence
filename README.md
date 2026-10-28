# Iridescence

Aero-inspired, accent-tinted glass for GNOME Shell and GTK4.

Iridescence brings a coordinated glass appearance to your desktop, combining your GNOME accent color with translucent surfaces, subtle outlines and shadows.

## Features

- Coordinated styling for GNOME Shell and GTK4/libadwaita applications.
- Shared tint strength: Subtle, Balanced or Rich.
- Optional transparency, with an opaque appearance that retains the tint and contrast treatment.
- A light Shell theme that follows your system appearance, or an always-dark Shell.
- Optional Blur My Shell integration.
- Optional theme access for Flatpak applications.

Cards, toasts, file-selection dialogs and sidebars opened over content retain solid backgrounds for readability.

## Compatibility

- GNOME Shell 49, 50 and 51.
- GTK4 and libadwaita applications.
- GTK3 applications are not supported.

Applications with custom styling may look different.

## Installation

Download the extension ZIP, then install it:

```sh
gnome-extensions install --force iridescence@pakovm.zip
```

Log out and back in, then enable **Iridescence** using Extensions or Extension Manager.

When upgrading, log out and back in to load the updated extension code.

Extension ID: `iridescence@pakovm`

## Configuration

Open Iridescence’s preferences to adjust:

- **Tint strength:** changes the accent tint across Shell, GTK and the optional Overview integration.
- **Transparency:** switches between translucent and opaque surfaces.
- **Light Shell in light mode:** lets the Shell follow the system’s light appearance. Disable it to keep the Shell dark.

Click **Apply** to save your appearance changes.

Applying requests a GTK refresh, which may briefly flash as High Contrast is toggled and restored. Reopen applications that do not update immediately.

## Blur My Shell

Blur My Shell provides blur; Iridescence provides the coordinated colors, transparency and outlines.

For popup blur, disable Blur My Shell’s **Override background** option.

Enable **Extras → Blur My Shell integration** to create and select an **Iridescence Overview** pipeline.

The pipeline follows your accent color, tint strength and actual Shell appearance. Its initial settings are:

- Blur radius: **30**
- Brightness: **1.00**
- Translucent Overview opacity: **70%**

You can customize the blur and add effects in Blur My Shell. Iridescence updates only its two color effects and preserves your other pipeline edits.

Existing pipelines retain their saved brightness. Disabling the integration restores the previous Overview pipeline when appropriate.

## Flatpak applications

Under **Extras**, apply Flatpak integration to grant applications read-only access to the generated GTK theme.

Reopen Flatpak applications afterward.

**Undo** removes permissions added by Iridescence while preserving existing grants and unrelated overrides. Disabling the extension does not automatically revoke these permissions.

## Existing GTK customization

Iridescence adds an identified import to:

```text
~/.config/gtk-4.0/gtk.css
```

Your other rules and imports remain intact. Disabling Iridescence removes its import.

Generated application styles are stored in:

```text
~/.config/iridescence/gtk.css
```

User-managed `gtk.css` symlinks are left untouched and require manual integration.

## Building from source

Development requires GJS, Node.js, GLib’s schema compiler and the GNOME Extensions command-line tool.

```sh
make test
make pack
```

The package is written to:

```text
dist/iridescence@pakovm.shell-extension.zip
```

## Credits

Iridescence builds on:

- [Tint my Gnome](https://github.com/pakovm-git/Tint-my-Gnome)
- [Tinted Shell](https://github.com/pakovm-git/tinted-shell)
- A supplied light palette derived from [Luminus]([url](https://gitlab.com/dikasetyaprayogi/luminus-project))

See `LICENSE`, `LICENSE-LGPL-2.1` and `NOTICE` in the source repository for licensing and attribution.

## Support development

You can support development with Bitcoin over Lightning:

<img width="424" height="424" alt="lightning-address" src="https://github.com/user-attachments/assets/c4a19af2-f3f1-4311-8ad2-2577263a68b4" />

**pako@bitbox.cash**

