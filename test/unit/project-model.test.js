'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/project-model.js');

test('an empty project is never dirty', () => {
	assert.equal(m.projectIsDirty(0, 0, null, null), false);
	assert.equal(m.projectIsDirty(0, 0, 'x', { top: 'y', n: 3 }), false);
});

test('content that was never saved is dirty', () => {
	assert.equal(m.projectIsDirty(2, 0, 'u1', null), true);
	assert.equal(m.projectIsDirty(0, 1, 'u1', null), true);
});

test('unchanged since the save is clean, any change makes it dirty again', () => {
	const u = {};
	const saved = { top: u, n: 3 };
	assert.equal(m.projectIsDirty(2, 1, u, saved), false);
	assert.equal(m.projectIsDirty(2, 1, {}, saved), true);      // a new undo snapshot = a change
	assert.equal(m.projectIsDirty(3, 1, u, saved), true);       // a different number of objects
});
