# Changelog

All notable changes to Swarfly (a fork of OpenBuilds CAM) are listed here, newest first. Format after "Keep a Changelog".
Every release must have an entry here that matches the version in `package.json` (a unit test checks it).

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
