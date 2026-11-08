'use strict';

// Release 1.21.0: js/font-list.js is the one list of bundled fonts. Guards: every file exists and parses, no stray TTF, no duplicates,
// the Czech letters are in every text font (picture / symbol fonts and the three old display fonts are exempt).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const root = path.join(__dirname, '..', '..');
const list = Array.from(loadBrowserScript('js/font-list.js').SWARFLY_FONTS).map((f) => Array.from(f));
const SYMBOL = ['Noto Emoji', 'Noto Sans Symbols', 'Noto Sans Symbols 2'];
const NO_CZECH_KEPT = ['Arvo', 'Orbitron', 'Permanent Marker'];      // old display fonts the owner chose to keep

const ctx = {}; ctx.window = ctx; ctx.self = ctx; ctx.global = ctx; ctx.console = console;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'lib/opentypejs/opentype.min.js'), 'utf8'), ctx);
const opentype = ctx.opentype;

test('font list: unique families and files, every file exists, no TTF without an entry', () => {
	assert.ok(list.length >= 60);
	assert.equal(new Set(list.map((f) => f[0])).size, list.length);
	assert.equal(new Set(list.map((f) => f[1])).size, list.length);
	list.forEach((f) => assert.ok(fs.existsSync(path.join(root, 'lib/fonts', f[1])), 'missing ' + f[1]));
	const onDisk = fs.readdirSync(path.join(root, 'lib/fonts')).filter((n) => /\.ttf$/i.test(n));
	const listed = new Set(list.map((f) => f[1]));
	assert.deepEqual(onDisk.filter((n) => !listed.has(n)), []);
});

test('font list: every font parses and has outlines for a sample text; text fonts have the Czech letters', () => {
	const czech = 'ěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ';
	const problems = [];
	list.forEach((f) => {
		const buf = fs.readFileSync(path.join(root, 'lib/fonts', f[1]));
		let font;
		try { font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)); } catch (e) { problems.push(f[0] + ': does not parse'); return; }
		if (SYMBOL.indexOf(f[0]) >= 0) return;
		if (!font.getPath('Ahoj', 0, 0, 20).commands.length) problems.push(f[0] + ': no outlines');
		if (NO_CZECH_KEPT.indexOf(f[0]) >= 0) return;
		const missing = Array.from(czech).filter((c) => !font.charToGlyphIndex(c));
		if (missing.length) problems.push(f[0] + ' lacks ' + missing.join(''));
	});
	assert.deepEqual(problems, []);
});

test('font list: names for the drop-down use + for spaces and match the families', () => {
	const m = loadBrowserScript('js/font-list.js');
	const names = Array.from(m.swarflyFontNames);
	assert.equal(names.length, list.length);
	assert.ok(names.includes('Open+Sans') && names.includes('Noto+Emoji'));
	names.forEach((n, i) => assert.equal(n.replace(/\+/g, ' '), list[i][0]));
});
