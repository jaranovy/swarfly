# Changelog

All notable changes to Swarfly (a fork of OpenBuilds CAM) are listed here, newest first. Format after "Keep a Changelog".
Every release must have an entry here that matches the version in `package.json` (a unit test checks it).

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
