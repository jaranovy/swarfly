'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { updateTexts, canAutoUpdate } = require('../../electron/updater');

test('canAutoUpdate: only the installed Windows copy', () => {
	assert.equal(canAutoUpdate({}, true, 'win32'), true);
	assert.equal(canAutoUpdate({}, false, 'win32'), false);                                   // npm start
	assert.equal(canAutoUpdate({ PORTABLE_EXECUTABLE_FILE: 'C:/x/Swarfly.exe' }, true, 'win32'), false);   // portable exe
	assert.equal(canAutoUpdate({}, true, 'linux'), false);
});

test('updateTexts: Czech and English, English for anything else', () => {
	assert.match(updateTexts('cs').ready('1.2.3'), /1\.2\.3.*stažená/);
	assert.match(updateTexts('en').ready('1.2.3'), /1\.2\.3.*downloaded/);
	assert.equal(updateTexts('de').restart, 'Restart now');
});
