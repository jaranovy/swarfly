'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/shortcuts-model.js');
const ev = (key, mods) => Object.assign({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }, mods);

test('shortcutFromEvent: modifiers in a fixed order, letters upper case, lone modifiers ignored', () => {
	assert.equal(m.shortcutFromEvent(ev('z', { ctrlKey: true })), 'Ctrl+Z');
	assert.equal(m.shortcutFromEvent(ev('Z', { ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+Z');
	assert.equal(m.shortcutFromEvent(ev('v')), 'V');
	assert.equal(m.shortcutFromEvent(ev('z', { metaKey: true })), 'Ctrl+Z');
	assert.equal(m.shortcutFromEvent(ev('Delete')), 'Delete');
	assert.equal(m.shortcutFromEvent(ev('Home', { shiftKey: true })), 'Shift+Home');
	assert.equal(m.shortcutFromEvent(ev(' ')), 'Space');
	assert.equal(m.shortcutFromEvent(ev('Shift', { shiftKey: true })), '');
	assert.equal(m.shortcutFromEvent(ev('Control', { ctrlKey: true })), '');
});

test('shortcutFromEvent: a printable symbol does not carry Shift (+ is Shift+1 on a Czech keyboard)', () => {
	assert.equal(m.shortcutFromEvent(ev('+', { shiftKey: true })), '+');
	assert.equal(m.shortcutFromEvent(ev('+')), '+');
	assert.equal(m.shortcutFromEvent(ev('-')), '-');
	assert.equal(m.shortcutFromEvent(ev('1', { shiftKey: true })), 'Shift+1');
});

test('defaults: every action has a unique id, a known group, and no key is used twice', () => {
	const ids = new Set(), keys = new Set();
	m.SHORTCUT_ACTIONS.forEach((a) => {
		assert.ok(!ids.has(a.id), 'duplicate id ' + a.id);
		ids.add(a.id);
		assert.ok(m.SHORTCUT_GROUPS.includes(a.group), a.id + ' group');
		assert.ok(a.title && a.desc, a.id + ' texts');
		a.keys.forEach((k) => { assert.ok(!keys.has(k), 'duplicate key ' + k); keys.add(k); assert.ok(!m.shortcutReserved(k), a.id + ' uses a reserved key'); });
	});
});

test('the old fixed shortcuts are the defaults', () => {
	const b = m.shortcutBindings(null);
	assert.equal(m.shortcutFind(b, 'Ctrl+Z'), 'undo');
	assert.equal(m.shortcutFind(b, 'Ctrl+Shift+Z'), 'redo');
	assert.equal(m.shortcutFind(b, 'Ctrl+Y'), 'redo');
	assert.equal(m.shortcutFind(b, 'Ctrl+A'), 'selectAll');
	assert.equal(m.shortcutFind(b, 'Ctrl+Shift+A'), 'selectNone');
	assert.equal(m.shortcutFind(b, 'Delete'), 'deleteSelected');
	assert.equal(m.shortcutFind(b, 'Backspace'), 'deleteSelected');
	assert.equal(m.shortcutFind(b, 'F1'), 'help');
	assert.equal(m.shortcutFind(b, 'Q'), null);
	assert.equal(m.shortcutFind(b, ''), null);
});

test('custom keys replace the defaults of that action only; junk is ignored', () => {
	const b = m.shortcutBindings({ undo: ['Ctrl+U'], nonsense: ['X'], redo: 'oops', trim: [] });
	assert.deepEqual(Array.from(b.undo), ['Ctrl+U']);
	assert.equal(m.shortcutFind(b, 'Ctrl+Z'), null);
	assert.deepEqual(Array.from(b.redo), ['Ctrl+Shift+Z', 'Ctrl+Y']);   // not an array: default
	assert.deepEqual(Array.from(b.trim), []);                           // an empty array = deliberately unbound
	assert.equal(b.nonsense, undefined);
});

test('shortcutConflict finds the other action using a key', () => {
	const b = m.shortcutBindings(null);
	assert.equal(m.shortcutConflict(b, 'Ctrl+Z', 'redo'), 'undo');
	assert.equal(m.shortcutConflict(b, 'Ctrl+Z', 'undo'), null);
	assert.equal(m.shortcutConflict(b, 'Q', 'undo'), null);
});

test('shortcutReserved: arrows, Escape, Enter, Tab', () => {
	assert.equal(m.shortcutReserved('Escape'), true);
	assert.equal(m.shortcutReserved('Shift+ArrowLeft'), true);
	assert.equal(m.shortcutReserved('A'), false);
});

test('shortcutCustomOf stores only what differs from the defaults (round trip)', () => {
	const b = m.shortcutBindings({ undo: ['Ctrl+U'], trim: [] });
	const c = m.shortcutCustomOf(b);
	assert.equal(JSON.stringify(c), JSON.stringify({ trim: [], undo: ['Ctrl+U'] }));
	assert.equal(JSON.stringify(m.shortcutBindings(c)), JSON.stringify(b));
	assert.equal(JSON.stringify(m.shortcutCustomOf(m.shortcutBindings(null))), '{}');
});

test('shortcutLabel', () => {
	const b = m.shortcutBindings(null);
	assert.equal(m.shortcutLabel(b, 'undo'), ' (Ctrl+Z)');
	assert.equal(m.shortcutLabel(b, 'tangent'), '');
});
