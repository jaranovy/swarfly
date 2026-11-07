# Swarfly - how the project is built

Swarfly is a static web application (HTML + JavaScript, no build step, no framework) wrapped in an Electron shell for the desktop.
It is a fork of [OpenBuilds CAM](https://github.com/OpenBuilds/OpenBuilds-CAM); the Swarfly additions are listed below so you know what is
new and what is inherited.

## The big picture

```
index.html            the whole UI and the ordered list of scripts (order matters: there are no modules)
js/                   application code (global functions and variables)
workers/              Web Workers: toolpath generation, bitmap and Gerber processing
lib/                  third-party libraries (three.js, jQuery, Metro UI, ...), each with its own licence
css/                  styles; css/swarfly-ui.css is the Swarfly layer (tokens, dock, status bar, light/dark)
help/                 the in-app help as Markdown: help/en, help/cs, help/index.json
electron/             desktop shell: main.js (window, app:// protocol), defaults.js, splash
build/                icons, splash image, swarfly-defaults.json (shipped with the installer)
scripts/              static-server.js (tests), copy-installers.js, make-screenshots.js
test/unit, test/e2e   node:test unit tests and Playwright browser tests
```

The drawing is a **three.js scene**: every shape is a `THREE.Line` in a group, and the scene is the data model (there is no separate document
object). Toolpaths are generated in a worker from those lines and drawn as extra scene objects; G-code text is kept on the toolpath object.

## Code that Swarfly added

| File | What it does |
|---|---|
| `js/editor-model.js` | **pure maths** of the editor (no DOM): handles, snapping, trim/split, fillets, tangents, polygon positions. Tested in node. |
| `js/editor.js` | DOM glue of the editor: properties bar, placement mode, tools (trim, split, tangent, arc, to-corner, measure, move A-B), status line. |
| `js/shape-generators.js`, `js/basic-cad-shapes.js` | geometry of the shapes and the old shape dialogs. |
| `js/trace-model.js`, `js/potrace.js` | picture tracing (threshold, outline, size) and its dialog. |
| `js/tool-split-model.js` | one G-code file per tool (grouping, file names). |
| `js/view-model.js`, `js/view-controls.js` | camera for a mouse without wheel: Zoom +/-, window, rotate, Shift / Ctrl+Shift gestures. |
| `js/gcode-validate.js`, `js/gcode-stats.js` | checks the generated program; statistics and time estimate; 8.3 file names. |
| `js/preset-3018.js` | machine defaults (bed size, spindle, start/end G-code) seeded into `localStorage`. |
| `js/lang.js`, `js/lang/cs.json` | UI language (see [EXTENDING.md](EXTENDING.md)). |
| `js/help.js` | the help window: Markdown topics, search-free, Czech falls back to English. |
| `css/swarfly-ui.css` | design tokens and the Swarfly chrome (dock panels, status bar, ribbon spacing). |

The rule that keeps the code testable: **maths goes into a `*-model.js` file without any DOM access**, so it can be loaded in node
(`test/unit/helpers/load-browser-script.js`) and tested in a second. The matching glue file only reads the mouse and writes the DOM.

## Data flow of a job

1. A file is loaded (`loadFile`): SVG / DXF / bitmap / Gerber become lines in the scene (`js/svgparser.js`, `js/dxf-render.js`, ...).
2. The user selects lines and creates a **toolpath** (`setupJob`): operation, depth, feed, tool diameter.
3. The worker (`workers/toolpath/`) computes the path; `js/advanced-cam-gcode.js` turns it into G-code (`cardStyleGcode()` writes the plain
   style the 3018 controller likes).
4. `prepgcodefile()` joins the toolpaths, `validateGcode()` checks the text, the viewer simulates it.
5. The program is saved as a `.nc` file (8.3 name for the SD card), or one file per tool.

## Settings and storage

Settings live in `localStorage` (`preset-3018.js` seeds them; `?reset3018` reseeds). Nothing is sent over the network: the desktop app blocks
analytics requests and serves the files through its own `app://` protocol.

## Tests

- `npm test` - unit tests of every `*-model.js` file, the G-code checker, defaults, language dictionary. About a second.
- Playwright (`npx playwright test test/e2e/<file>`) - the real UI in Chrome. Each release has a spec for its features.
  The whole suite takes several minutes; run only the specs that touch your change.
- A unit test checks that `CHANGELOG.md` has an entry for the version in `package.json`.

## Not done yet

- A first real cut on the machine. Check every program in the simulation and with an air cut first.
- Automatic toolpath proposal from material and tool, tool-change pause in the G-code, STL relief (2.0).
