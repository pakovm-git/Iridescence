.PHONY: all schemas test pack
all: pack
schemas:
	glib-compile-schemas --strict schemas
test: schemas
	node tests/styles.test.mjs
	node tests/shadows.test.mjs
	node tests/shadow-reduction.test.mjs
	node tests/gtk-lineup-shadow-budget.test.mjs
	node tests/shell-shadow-lifecycle.test.mjs
	node tests/shell-opacity.test.mjs
	node tests/shell-size.test.mjs
	node --experimental-vm-modules tests/shell-lifecycle.test.mjs
	GSETTINGS_BACKEND=memory gjs -m tests/blur-my-shell.test.js
	GSETTINGS_BACKEND=memory gjs -m tests/gtk-refresh.test.js
	gjs -m tests/files.test.js
	gjs -m tests/gtk-import.test.js
	gjs -m tests/flatpak.test.js
	gjs -m tests/gtk-css.test.js
pack: schemas
	mkdir -p dist
	gnome-extensions pack --force --out-dir=dist --extra-source=files.js --extra-source=prefs-files.js --extra-source=gtk-import.js --extra-source=flatpak.js --extra-source=styles.js --extra-source=contrast.js --extra-source=shadows.js --extra-source=shell-shadows.js --extra-source=gtk-refresh.js --extra-source=gtk-refresh-helper.js --extra-source=blur-my-shell.js --extra-source=assets --extra-source=themes .
	mv -f dist/iridescence@pakovm.shell-extension.zip dist/iridescence@pakovm.zip
