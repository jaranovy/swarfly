'use strict';

// Unit tests for electron/defaults.js: reading the default UI language from swarfly-defaults.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseDefaults, readDefaults, defaultLangScript, defaultsDirs } = require('../../electron/defaults');

test('parseDefaults: cs and en are accepted', () => {
	assert.equal(parseDefaults('{"language":"cs"}').language, 'cs');
	assert.equal(parseDefaults('{"language":"en"}').language, 'en');
});

test('parseDefaults: anything else falls back to English', () => {
	for (const bad of ['', '   ', 'not json', '{}', '{"language":"de"}', '{"language":1}', 'null', '[]', '{"language":null}']) {
		assert.equal(parseDefaults(bad).language, 'en', JSON.stringify(bad));
	}
});

test('defaultLangScript: valid JavaScript that sets the global', () => {
	const code = defaultLangScript({ language: 'cs' });
	const ctx = { window: {} };
	new Function('window', code)(ctx.window);
	assert.equal(ctx.window.SWARFLY_DEFAULT_LANG, 'cs');
});

test('readDefaults: portable folder wins, then the program folder, then English', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swarfly-defaults-'));
	const saved = process.env.PORTABLE_EXECUTABLE_DIR;
	try {
		process.env.PORTABLE_EXECUTABLE_DIR = tmp;
		assert.deepEqual(defaultsDirs()[0], tmp);
		// no file in the portable folder and none next to node.exe -> English
		assert.equal(readDefaults().language, 'en');
		fs.writeFileSync(path.join(tmp, 'swarfly-defaults.json'), '{"language":"cs"}');
		assert.equal(readDefaults().language, 'cs');
		fs.writeFileSync(path.join(tmp, 'swarfly-defaults.json'), 'broken');
		assert.equal(readDefaults().language, 'en');
	} finally {
		if (saved === undefined) delete process.env.PORTABLE_EXECUTABLE_DIR; else process.env.PORTABLE_EXECUTABLE_DIR = saved;
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});
