# Swarfly - development guide

## Layout

- `index.html` - the whole UI and the script list (the order matters).
- `js/` - application code. Swarfly additions: `lang.js` + `lang/cs.json` (language), `default-lang.js`, `preset-3018.js` (machine preset),
  `gcode-validate.js` (G-code check), `gcode-stats.js` (statistics, `nc83Name`), `shape-generators.js` (pure shape geometry), `editor-model.js` (pure editor maths) + `editor.js` (properties panel, placement mode, dimensions, status line), `help.js` (in-app help),
  `basic-cad-shapes.js` (shape dialogs). `advanced-cam-gcode.js` holds the G-code generator and `cardStyleGcode()`.
- `help/` - help topics as Markdown, `help/en/*.md` and `help/cs/*.md`, list in `help/index.json`; `CHANGELOG.md` is shown as "What's new".
- `electron/` - desktop shell: `main.js` (window, `app://` protocol, start-up window), `defaults.js` (reads `swarfly-defaults.json`), `splash.html`.
- `build/` - icons, start-up image, `swarfly-defaults.json` shipped with the installer.
- `test/unit` (node:test) and `test/e2e` (Playwright).

## Run

- In a browser: serve the folder (`python -m http.server 8100`) and open `http://localhost:8100/index.html`. `?reset3018` reseeds the preset, `?en` / `?cs` force a language for one visit.
- Desktop: `npm start`.

## Test

- `npm test` - unit tests.
- `E2E_PORT=8124 E2E_CHANNEL=chrome npx playwright test` - e2e (uses the installed Chrome; pick a free port; the config default 8123 is only a fallback).
- Both must pass before a release.

## Build

`CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win` creates `dist/Swarfly-Setup-<version>.exe` and `dist/Swarfly-<version>.exe`.
Needs free Windows commit memory (the 7z step fails when it is exhausted: restart the leaking service or reboot).

## Release checklist (definition of done)

1. Code and tests (unit + e2e) pass.
2. `package.json` version and the label in `index.html` (`appVersionNo`) bumped.
3. `CHANGELOG.md` has the new version at the top (Added / Changed / Fixed); the unit test compares it with `package.json`.
4. Help topics (EN and CS) updated for every new menu item, dialog or setting; Czech strings in `js/lang/cs.json`.
5. Build, start the portable exe, check version, language and the new feature (debug port `--remote-debugging-port=9333`).
6. Commit, tag `3018-v<version>`; never push without the owner's approval.
7. Update `TODO.md` and `docs/editor-plan.md` in the project folder.
