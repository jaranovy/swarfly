# Extending Swarfly: a language, a skin, a help topic, a machine

Short recipes. Run `npm test` after each change, and the e2e spec `test/e2e/czech.spec.js` / `help.spec.js` where they apply.

## Add a user-interface language

Visible texts are written in English in `index.html` and the scripts. A language file is a **dictionary from the exact English text to the
translation**: `js/lang/cs.json` is the model.

1. Copy `js/lang/cs.json` to `js/lang/<code>.json` (e.g. `de.json`) and translate the values. Keep the keys exactly as they are. A key that
   is missing simply stays English, so a language can be translated step by step.
2. Texts with numbers or names built at run time (for example "Properties - 4 objects") cannot be exact keys; they are the `RULES` list in
   `js/lang.js` (regular expression -> translation with `$1`). Add the same rules for the new language.
3. `js/lang.js` knows two languages at the moment (`"cs"` and `"en"` are written in the code). To add one more:
   - accept the new code where `saved === "cs" || saved === "en"` and in the `?cs` / `?en` URL checks;
   - load `js/lang/<code>.json` instead of the fixed `cs.json`, and use the rules of that language;
   - the Language button (`swarflySwitchLanguage`, Settings tab) toggles between two languages - change it to a list if there are three or more;
   - `js/help.js` has `helpLang()` that returns only `"cs"` or `"en"`.
4. Help: add `help/<code>/<topic>.md` for the topics you translate and a `"<code>"` title in every entry of `help/index.json`. A missing
   file falls back to English.
5. The generated G-code and its comments stay English on purpose (the controller and other tools read them).
6. Test: copy the idea of `test/e2e/czech.spec.js` (set `localStorage.swarflyLang`, reload, check a few captions). A broken JSON file
   shows up there as an untranslated page (the browser console prints "Czech dictionary not loaded"), so check the file with a JSON validator.

Tip: the dictionary is used on text nodes, `title` / `placeholder` attributes and `<option>` labels. Option *values* stay English because the
program reads them (for example `CNC: Pocket`).

## Add a skin (colour theme)

Two places define a theme, both keyed by the theme id (`light`, `dark`):

1. **The 3D view** - `js/theme.js`, object `ThemeData.THEMES`. Copy the `dark` entry, give it an id (e.g. `"night"`), a `DESCRIPTION`, an
   `ICON` (Font Awesome name) and change the colours: sky, grid, rulers, axes, default colour of drawn lines.
2. **The user interface** - `css/swarfly-ui.css`. The colours are variables on `body`: light values in `:root`, dark values under
   `body.theme_dark { --sw-bg: ...; --sw-surface: ...; }`. Add a block `body.theme_night { ... }` with the same variables.
   The help window follows the theme through `body.theme_<id>` rules in `js/help.js`.
3. The ribbon button `#btnTheme` calls `Theme.toggle()`, which only switches between `light` and `dark`. For three or more skins change
   `toggle` in `js/theme.js` to step through `Object.keys(ThemeData.THEMES)`, or add a menu that calls `ThemeData.set("night")`.

The chosen theme is stored in `localStorage.themeId`.

## Add a help topic

1. Write `help/en/<id>.md` (and `help/cs/<id>.md`). Plain Markdown: headings, lists, tables, `code`, links to other topics as `[text](topic:<id>)`.
2. Add `{ "id": "<id>", "en": "Title", "cs": "Název" }` to `help/index.json` - the order there is the order in the window.
3. The first topic (`start`) is the landing page. The "What's new" page is `CHANGELOG.md` itself.
4. Every release must update the help for each new menu item, dialog or setting (see the checklist in [DEVELOPMENT.md](DEVELOPMENT.md)).

## Add a keyboard shortcut / a tool-panel button

1. Add the action to `SHORTCUT_ACTIONS` in `js/shortcuts-model.js` (id, group, English title and description, default keys; keep every default key unique - a unit test checks it) and what it does to `SHORTCUT_RUN` in `js/shortcuts.js`. Add the Czech texts to `js/lang/cs.json`.
2. To put a ribbon button into the tool panel give the button an `id` in `index.html` and add `{ sel: "#myButton", action: "<id>" }` to a group in `js/tool-panel-model.js`; the panel moves the button, so its id, onclick and active class keep working.

## Change the machine defaults (another CNC)

Machine size, spindle, start / end G-code, feeds and depths are in `js/preset-3018.js` (`DEFAULTS`). After editing bump `PRESET_VERSION`
so browsers with old settings reseed them. For the desktop app the defaults shipped with the installer are in `build/swarfly-defaults.json`
(default language and similar). The G-code style (no G54, `M5` `M2` at the end, `S10000`) follows the programs known to run on the 3018 controller;
see `cardStyleGcode()` in `js/advanced-cam-gcode.js`.

## Add an editor tool

Put the maths into `js/editor-model.js` as pure functions and test them in `test/unit/editor-model.test.js`. The DOM part goes into
`js/editor.js`: a mode in `editorState.cut`, a button in the ribbon of `index.html`, the prompt text in `editorPrompt()`, strings in
`js/lang/cs.json`. The tangent and to-corner tools (`editorTangentClick`, `editorReachClick`) are short examples. Add an e2e spec like
`test/e2e/editor-tangent.spec.js`.
