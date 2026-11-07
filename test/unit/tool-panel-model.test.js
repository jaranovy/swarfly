'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadBrowserScript, ROOT } = require('./helpers/load-browser-script');

const t = loadBrowserScript('js/tool-panel-model.js');
const s = loadBrowserScript('js/shortcuts-model.js');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('layout: tools is the default, only "ribbon" switches back; next toggles', () => {
	assert.equal(t.toolPanelLayout(null), 'tools');
	assert.equal(t.toolPanelLayout('junk'), 'tools');
	assert.equal(t.toolPanelLayout('ribbon'), 'ribbon');
	assert.equal(t.toolPanelNextLayout('tools'), 'ribbon');
	assert.equal(t.toolPanelNextLayout('ribbon'), 'tools');
	assert.equal(t.toolPanelNextLayout(undefined), 'ribbon');
});

test('every group is a shortcut group, every action exists, no button is listed twice', () => {
	const actions = new Set(s.SHORTCUT_ACTIONS.map((a) => a.id));
	const seen = new Set();
	t.TOOL_PANEL_GROUPS.forEach((g) => {
		assert.ok(g.title === 'Create' || s.SHORTCUT_GROUPS.includes(g.title), g.title);
		g.items.forEach((it) => {
			assert.ok(!seen.has(it.sel), 'duplicate ' + it.sel);
			seen.add(it.sel);
			if (it.action) assert.ok(actions.has(it.action), it.action);
		});
	});
});

test('every id selector of the panel exists exactly once in index.html', () => {
	t.TOOL_PANEL_GROUPS.forEach((g) => g.items.forEach((it) => {
		if (it.sel[0] === '#') assert.equal((html.match(new RegExp('id="' + it.sel.slice(1) + '"', 'g')) || []).length, 1, it.sel);
		else assert.ok(html.includes(it.sel.slice(1)), it.sel);   // class selectors (.mouseSelectBtn ...)
	}));
});
