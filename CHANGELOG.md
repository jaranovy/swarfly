# Changelog

All notable changes to Swarfly (a fork of OpenBuilds CAM) are listed here, newest first. Format after "Keep a Changelog".
Every release must have an entry here that matches the version in `package.json` (a unit test checks it).

## [1.17.0] - 2026-11-07
### Added
- **Keyboard shortcuts** in Settings (*Keys* group, button *Keyboard Shortcuts*): a list of all actions with a description and their keys, in groups Select, Sketch, Edit, Camera, Other. *Change* + press a new key (with Ctrl / Alt / Shift if you like), *Clear* removes a key, *Restore defaults* resets all. A key already used by another action is refused. Your choices are kept in the browser storage.
- New default keys: V select, M move, E erase, T transform, D measure distance, S snapping, P properties panel, Shift+M move A to B, X trim, C split, + / - zoom, W zoom window, O rotate, Home / Shift+Home show the job / the machine area. The old keys (Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+Shift+A, Del, F1) stay. Plain keys do not fire while you type into a field.
### Changed
- The key handling is now in `js/shortcuts-model.js` (pure, tested) and `js/shortcuts.js`; the old `js/advanced-cam-keyboard-bindings.js` is gone.

## [1.16.0] - 2026-11-07
### Added
- Depth in the 3D view: a blue **Z axis** at the origin with marks every 1 mm (-20 to +10 mm) and a faint vertical grid (XZ and YZ planes, 5 mm steps down to -20 mm). They appear only when the camera is tilted (not in the plain 2D view from above) and show how deep a cut goes.

## [1.15.2] - 2026-11-07
### Fixed
- 1.15.1 did not start (a syntax error in `electron/main.js` in the update code: "JavaScript error occurred in the main process"). `npm test` now checks the syntax of `electron/`, `js/` and `workers/` first.

## [1.15.1] - 2026-11-07
### Added
- Automatic updates of the installed program from GitHub Releases: the new version is downloaded in the background (only the changed parts, a few MB) and installed on close or on *Restart now*. The portable exe does not update itself. Off with `{ "autoUpdate": false }` in `swarfly-defaults.json`.
- Documentation: screenshots in the README, `docs/ARCHITECTURE.md` and `docs/EXTENDING.md` (how to add a language, a skin, a help topic, a machine, an editor tool).

## [1.15.0] - 2026-11-07
### Added
- Camera for a mouse without wheel and middle button (a trackball): **Zoom +** and **Zoom -** buttons, a **Window** tool (drag a rectangle with the left button, the view zooms to it) and a **Rotate** tool (left button drags rotate the view) in the Zoom group. Also **Shift** + left drag rotates and **Ctrl + Shift** + left drag zooms (up = closer). Pan stays on the right button; Esc ends a tool.
### Fixed
- The installed application had an empty help: the `help` folder was not packed into the installer. It is now.

## [1.14.0] - 2026-11-06
### Changed
- The properties bar is always open: with nothing selected it is greyed out instead of hidden (no jumping, nothing to look for).
- Shapes menu: a shape no longer opens a pop-up dialog; the bar turns into a **New shape** form with the parameters of the shape, a blue ghost outline at the origin, Enter / Create to make it and Esc / Cancel to drop it. Values are remembered per shape kind. (The old dialogs stay in the page for scripts and tests.)
- Export panel: the buttons under Save G-Code have space between them.

## [1.13.0] - 2026-11-06
### Added
- **To corner** tool (SAPS "extension to the point of intersection"): two lines are extended or trimmed to where their lines meet; the click side of each stays. Pure maths `editorLineHit`, `editorReachPoint` with unit tests, Playwright test.

## [1.12.0] - 2026-11-06
### Added
- **Tangent** tool (SAPS "tangent under an angle"): point at a circle or arc, the tangent line in the set angle and length is previewed in red, click draws it.
- **Tangent arc** tool (SAPS "tangential arc"): an arc of a set radius between any two lines or arcs; both are trimmed to the touching points and joined with the arc into one polyline. Works with line + line, line + arc / circle and arc / circle + arc / circle (circles through three points are recognised as arcs).
- Pure maths in `editor-model.js` (`editorTangentLine`, `editorFilletCenters`, `editorFilletArc`, `editorFilletJoin`, `editorArcFit`, ...) with unit tests, plus Playwright tests.

## [1.11.0] - 2026-11-06
### Added
- **Save one file per tool**: a button next to Save G-Code lists the files (8.3 names like `plat_01d.nc`, tool letter d = drill, m = mill) with their tool and toolpath count, then writes them into one chosen folder. Toolpaths with the same tool and diameter go into one file. The window reminds you to change the bit and touch off Z between files (GRBL has no tool length offset). No `M0` / `M6` is written - that waits for a test on the offline controller.
- Pure helpers in `js/tool-split-model.js` with unit tests; Playwright test.

## [1.10.0] - 2026-11-06
### Added
- **Trace picture** window for PNG / JPG / BMP / GIF: live preview (picture faint, outlines on top), automatic threshold (Otsu) with a slider, invert, smoothing (sharp / normal / smooth), speck removal, and the width of the result in mm. Cancel imports nothing.
### Fixed
- Transparent PNGs turned into one big black block (transparent pixels were read as black); they are paper now.
- Large pictures are traced at most 1000 px on the longer side (faster, same result).
- Pure helpers in `js/trace-model.js` with unit tests; Playwright test for the dialog.

## [1.9.0] - 2026-11-06
### Added
- **Trim** tool (ribbon, scissors): click the part of a line between two crossings to remove it; the part that goes turns red while you point. Works on open lines and on closed outlines (a circle crossed by a line loses the arc between the crossings).
- **Split** tool: cut a line or outline where you click; crossings attract the cut; a closed outline is opened at that point.
- Pure maths in `editor-model.js` (`editorCrossingPositions`, `editorTrimPolyline`, `editorTrimRange`, `editorSplitPolyline`, ...) with unit tests, plus Playwright tests.
- Help: trim / split, erase by window, erase outside a window.

## [1.8.4] - 2026-11-06
### Changed
- Right dock: Documents panel has small icon buttons (select all / none / invert / delete) with tooltips instead of four big buttons; the tree shows readable names with icons ("Rectangle 60x30", "Circle 20x20", "Drawing") and starts expanded; the panel is taller (38 %) and the toolpath hint paragraph is gone; the buttons of panels 2-4 use the full width.

## [1.8.3] - 2026-11-06
### Fixed
- DXF import now honours `$INSUNITS`: drawings in inches (and feet, cm, m, ...) were imported 25.4x too small; they are scaled to millimetres with a message.
- DXF circles and arcs without a Z value (group 30) produced NaN coordinates.
- Hovering a rectangle filled only half of it (a leaked global loop variable in the hover fill).
- The properties bar slot keeps its height while nothing is selected, so the drawing no longer jumps.
### Added
- Messages when a DXF or SVG contains text, which cannot be cut and is not imported.
- Help: import notes (units, 96 dpi for px SVG and pictures, text).
- Import tests (synthetic DXF/SVG, library DXFs, potrace bitmap) and DXF unit unit-tests.

## [1.8.2] - 2026-11-06
### Added
- Properties bar: **Pocket** button. With closed outlines selected it creates the toolpath and opens its dialog with the operation "CNC: Pocket" already chosen (mills out the whole area inside); an open line is refused with a message.
### Fixed
- The Open button in the compact ribbon no longer draws a grey block under the ribbon (top left corner).

## [1.8.1] - 2026-11-06
### Changed
- Pop-up dialogs (new shapes, status, ...) use the same card style as the rest: light surface, titled header, accent button, tokens from `css/swarfly-ui.css`; the dark theme gets readable button text. The dark theme itself already follows the tokens (checked with the properties bar, drawer and dock).

## [1.8.0] - 2026-11-06
### Changed
- Compact ribbon: icons only (no captions, no group titles), smaller buttons; every button shows its name as a tooltip.
- The Properties panel is now a bar across the top of the drawing (reference point, X, Y, W, H, keep proportions, rotate, mirror, X0 Y0, Locked) instead of a card covering the left part of the drawing. Copies, corners and offset, points, extend / trim and shape parameters are in the **More** drawer on the right of the bar.
- The bottom line with the mouse help is gone; the mouse and key list is now in Help > Getting started. The bottom bar is a single row (coordinates and prompt, simulation buttons, view switches).
- Test suite slimmed: no operation tests for plasma, drag knife and pen plotter (the machine has none), six Czech editor tests merged into one page load, nine help tests into three. Full e2e run 3.8 min instead of 8-11; `npm run test:quick` (unit + editor specs) for everyday work.

## [1.7.1] - 2026-11-06
### Changed
- New `css/swarfly-ui.css`: one set of colour / radius / shadow tokens (light values, dark values under `body.theme_dark`) shared by the new chrome.
- One status bar at the bottom of the drawing: coordinates and prompt, simulation buttons, view switches (Documents / Toolpaths / G-code) and the mouse help line, in two rows. Nothing floats above the canvas any more and the prompt no longer covers the mouse help.
- Right panels 1-4 get light headers instead of black ones; buttons, borders and radii follow the tokens. The Properties panel uses the same tokens.
- Plan for the rest of the redesign: `docs/ui-redesign.md` (compact toolbar and context bar 1.8.0, dialogs 1.8.1, dark theme 1.9.0).

## [1.7.0] - 2026-11-06
### Added
- Resizing with the handles goes in whole millimetres (an edge snaps that side; a corner snaps the longer side, or each side with Shift). Object snapping still wins when it finds a point.
- Rotate mode: a second click on the selected object (no drag) switches the handles to four round rotation handles; dragging turns the selection round the middle of its box in whole degrees, with a magnet to multiples of 15 degrees (4 degree reach), the angle shown at the pointer. Third click or Esc goes back; a new selection starts in resize mode.
### Changed
- The selection box and handles are drawn 7 px outside the objects so the dashed box no longer covers the (red) selected outline and makes it look half coloured. The handle grabs where it was clicked (no jump).
- Unit tests for the size and angle snapping; 6 e2e tests.

## [1.6.4] - 2026-11-06
### Changed
- Dimension and snap texts are drawn in a regular (not bold) sans-serif font with a thinner outline, and dimension lines are thinner, so they are easier to read.

## [1.6.3] - 2026-11-06
### Added
- Properties panel: Extend / trim ends of one open line (start and end, positive extends, negative trims).
- Manual measurements are saved in the project file as an optional `measures` key and restored on load (older versions ignore it; unknown entries are dropped).
- Unit test for `editorExtendEnds`; 3 e2e tests.

## [1.6.2] - 2026-11-06
### Added
- Properties panel: table of the corner points of the selected outline (X / Y editable, Apply points), and Hole - Diameter for circles. One undo step each.
- 5 e2e tests.

## [1.6.1] - 2026-11-06
### Added
- Properties panel, section "Corners and offset": Round corners (radius) and Chamfer (distance) for every corner of the selected outlines, Offset copy (positive grows, negative shrinks, round joins, Clipper) for closed outlines.
- Corners that do not fit are reduced (at most half of each neighbouring edge) with a message; open lines keep their end points; locked objects are refused; everything is one undo step.
- Unit tests for the corner maths (areas, arc radius, clamping, open lines) and for the offset (grow, shrink, vanish, orientation, circle); 7 e2e tests.

## [1.6.0] - 2026-11-06
### Added
- Dimensions button now has three states: off, overall size, every object (own width and height per outline, diameter for circles).
- Measure menu: distance between two points (length, dX, dY, direction), angle from three points, diameter and radius of the selected circles; results stay on the drawing until cleared (not saved with the project).
- Typed points for Move A-B and Measure: `x,y`, `@dx,dy`, `@length<angle` (decimal comma with `;` or a space), same as a click, with readable error messages.
- Unit tests for coordinate parsing, distance / angle maths, circle detection and automatic dimensions; 8 e2e tests.

## [1.5.2] - 2026-11-06
### Added
- Window selection by direction: left to right (solid blue frame) = only objects fully inside, right to left (dashed green frame) = everything the window touches. Before, any object whose centre lay in the window was selected.
- Double-click selects the whole object group under the pointer; Esc clears the selection; clicking again on the same spot picks the next of several overlapping objects (the status line shows how many).
- Locked (tick in the properties panel): the object is not changed by the panel, handles, arrow keys or Move A-B; stays locked through undo / redo and in saved projects; copies are free.
- Unit tests for the marquee rules and the cycling; 9 e2e tests.

## [1.5.1] - 2026-11-06
### Added
- Snapping (Edit group, on by default): end points, intersections, centres, segment middles and a grid, with a pink marker that names the point. Used by new shapes hanging on the mouse, by the selection handles and by the new tool below. Settings tab -> Snapping: grid step 1 / 5 / 10 / 0.5 / 0.1 mm or off (remembered).
- Move A-B: click the point to move from and the point to move to; live preview, Esc / right click cancels and restores, one undo step.
- Unit tests for segment intersections, snap priority and tolerance, object snapping and the grid-step cycle; 8 e2e tests.

## [1.5.0] - 2026-11-06
### Added
- Handles on the selection box: drag a corner to scale proportionally (Shift = width and height separately), drag an edge middle to change one side; the opposite side stays; one undo step per drag, a plain click on a handle changes nothing.
- Arrow keys nudge the selection (1 mm, Shift 10 mm, Alt 0.1 mm).
- Panel: Mirror left-right / up-down, Move to X0 Y0, copies in a row (count, step X / Y) and copies around a point (count, angle, centre X / Y); copies keep the shape parameters when they are only moved; one undo step for a whole set of copies.
- Unit tests for mirror, copy offsets / angles, handle maths and arrow steps; 13 e2e tests for the new commands and the handles.

## [1.4.0] - 2026-11-06
### Added
- Properties panel for the selection: X / Y of a chosen reference point (3x3 picker), width, height with "Keep proportions", rotation, several objects together; every change is one undo step.
- Shape parameters: the shapes you create (circle, rectangle, rounded rectangle, ellipse, polygon, star, slot) remember their parameters; select one and change e.g. the number of points of a star in the panel (saved with the project and kept by undo / redo).
- Placement mode: a new shape hangs on the mouse; click drops it, Esc puts it at X0 Y0, right click cancels (no undo step left). Settings -> Editor -> "New shapes" switches between mouse and X0 Y0.
- Dimensions button (Edit group): overall width and height of the selection, or of the whole drawing, drawn on the part.
- Status line at the bottom of the drawing: cursor X / Y and the next step.
- Creating a shape is now one undo step (Ctrl+Z removes it completely).
- Unit tests for the editor maths (`js/editor-model.js`) and e2e tests for the panel, placement, dimensions and undo.

## [1.3.5] - 2026-11-06
### Changed
- The circle is placed like every other shape: lower-left corner of its bounding box at X0 Y0 (it used to be centred on 0,0, so half of it had negative coordinates).

## [1.3.4] - 2026-11-06
### Fixed
- The help window follows the application theme (light and dark) instead of always being dark; it switches live when the theme is toggled.

## [1.3.3] - 2026-11-06
### Changed
- Help has its own ribbon tab with two buttons: Help and Version (the Version button shows the version and opens What's new). They are gone from the Settings tab.
- The help is a free floating window instead of a modal dialog: wider by default, draggable by the title bar, resizable, remembers its size and place, and you can keep working in the application while it is open.

## [1.3.2] - 2026-11-06
### Added
- In-app Help (Settings tab, key F1): 10 topics in English and Czech (Markdown files in `help/`), "What's new" shows this changelog.
- `docs/DEVELOPMENT.md`: structure, run, test, build and release checklist.
- Unit tests for the help renderer and for the documentation rules (both languages for every topic, links resolve, changelog equals the version); e2e tests for the help dialog.

## [1.3.1] - 2026-11-06
### Changed
- The start-up window text is English; the default UI language in code is English.
- The default language is read from `swarfly-defaults.json` next to the program; the installer and the portable build ship `{ "language": "cs" }`. The Language button still wins.

## [1.3.0] - 2026-11-06
### Added
- Shapes: rounded rectangle, ellipse, polygon, star, slot (with dialogs, validation and Czech texts).
- Scale tab: "Keep proportions" checkbox and "Scale %" field.
- Unit tests for the shape geometry and e2e tests for the new shapes.
### Fixed
- The operations e2e test no longer fails randomly (it waits for the buttons).

## [1.2.1] - 2026-11-04
### Changed
- Czech became the default interface language (later made configurable in 1.3.1).

## [1.2.0] - 2026-11-04
### Added
- Language button in the Settings tab (English / Czech, remembered); Czech dictionary in `js/lang/cs.json`, loader `js/lang.js`.
### Removed
- Duplicate dark-mode button in the main panel (it stays in Settings).

## [1.1.0] - 2026-11-04
### Changed
- Renamed to Swarfly: new icon, start-up image, logo, installer and window titles; README note about the origin and licence.

## [1.0.0] - 2026-11-04
### Added
- NSIS installer (per machine, Program Files) next to the portable exe; version shown in the Settings tab.
- Electron start-up window with a live loading log; larger "Create G-code" panel.
- G-code check after generating (units, glued commands, feed, spindle, laser Z, rapid moves, NaN) with a red message on errors.
- Statistics: path length, estimated time, removed area / volume / weight for a chosen material.
- Simulation speeds 12x, 16x and 20x.
- Unit tests and an e2e test for every operation.
- 3018 preset (machine size, spindle scale, start/end code, tool defaults).
### Changed
- Output in the style of the programs already running on the machine: `.nc` extension, name from the drawing (lower case, 8 characters), no comments, no `G4 P8`, single `G21`, CRLF, ending `M5` / `M2`; warning for negative coordinates.
- Laser program: no Z moves, `M3` / `M5` per outline, S scale 1000.
- Changelog and Fork buttons hidden (they pointed to the original web site).
### Fixed
- Plasma and Drag Knife output had all moves glued on one line, so the simulation vanished.
- Settings form was filled with empty values because the preset lacked keys; the G-code was empty.
- Page freeze in the Czech dictionary (a feedback loop of the translator).

## Before 1.0.0
Upstream OpenBuilds CAM history (see `CHANGELOG.txt` and the git log): ribbon redesign, text tool, simulation speed rework, tests and lint, estimated run time.
