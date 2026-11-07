'use strict';

// Swarfly: optional defaults file "swarfly-defaults.json" next to the program (install folder, or the folder of the
// portable exe). Example: { "language": "cs" }. A missing / broken file means English. The language chosen with the
// Settings -> Language button (stored by the app) always wins over this default.

const fs = require('fs');
const path = require('path');

function parseDefaults(text) {
	let language = 'en', autoUpdate = true;
	try {
		const data = JSON.parse(text);
		if (data && (data.language === 'cs' || data.language === 'en')) language = data.language;
		if (data && data.autoUpdate === false) autoUpdate = false;
	} catch (e) { /* broken or empty file: keep English */ }
	return { language, autoUpdate };
}

// where to look: next to the portable exe (a file the user put there wins), then next to the program itself (installer copy)
function defaultsDirs() {
	const dirs = [];
	if (process.env.PORTABLE_EXECUTABLE_DIR) dirs.push(process.env.PORTABLE_EXECUTABLE_DIR);
	dirs.push(path.dirname(process.execPath));
	return dirs;
}

function readDefaults() {
	for (const dir of defaultsDirs()) {
		try {
			return parseDefaults(fs.readFileSync(path.join(dir, 'swarfly-defaults.json'), 'utf8'));
		} catch (e) { /* not there, try the next folder */ }
	}
	return parseDefaults('');
}

// JavaScript served to the page as js/default-lang.js
function defaultLangScript(defaults) {
	return 'window.SWARFLY_DEFAULT_LANG = ' + JSON.stringify(defaults.language) + ';\n';
}

module.exports = { parseDefaults, readDefaults, defaultLangScript, defaultsDirs };
