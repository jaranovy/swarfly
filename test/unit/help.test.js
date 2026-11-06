'use strict';

// Unit tests for the in-app help (js/help.js) and for the documentation rules of a release:
// every topic exists in English and Czech, all internal links resolve, the changelog matches package.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const ROOT = path.join(__dirname, '..', '..');
const h = loadBrowserScript('js/help.js');
const md = h.helpMarkdown;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const index = JSON.parse(read('help/index.json')).topics;

// ---------------------------------------------------------------- renderer
test('helpMarkdown: headings, paragraphs and lists', () => {
	const html = md('# Title\n\nSome text\nsecond line\n\n- one\n- two\n\n1. first\n2. second\n');
	assert.match(html, /<h1>Title<\/h1>/);
	assert.match(html, /<p>Some text second line<\/p>/);
	assert.match(html, /<ul>\n<li>one<\/li>\n<li>two<\/li>\n<\/ul>/);
	assert.match(html, /<ol>\n<li>first<\/li>\n<li>second<\/li>\n<\/ol>/);
});

test('helpMarkdown: inline bold, italic, code and links', () => {
	const html = md('**bold** and *italic* and `code` and [Laser](topic:laser) and [site](https://example.com/x)');
	assert.match(html, /<b>bold<\/b>/);
	assert.match(html, /<i>italic<\/i>/);
	assert.match(html, /<code>code<\/code>/);
	assert.match(html, /<a href="#" class="help-link" data-topic="laser">Laser<\/a>/);
	assert.match(html, /<a href="https:\/\/example.com\/x" target="_blank" rel="noopener">site<\/a>/);
});

test('helpMarkdown: HTML in help text is escaped (no injection)', () => {
	const html = md('# <script>alert(1)</script>\n\n<img src=x onerror=alert(1)> [x](javascript:alert(1))');
	assert.ok(!html.includes('<script>'));
	assert.ok(!html.includes('<img'));
	assert.ok(!/href="javascript:/.test(html));
});

test('helpMarkdown: notes, rules, blank input', () => {
	assert.match(md('> careful'), /<blockquote>careful<\/blockquote>/);
	assert.match(md('---'), /<hr>/);
	assert.equal(md(''), '');
});

// ---------------------------------------------------------------- content rules
test('help index: ids are unique, lower case, and have both titles', () => {
	const ids = index.map((t) => t.id);
	assert.equal(new Set(ids).size, ids.length);
	for (const t of index) {
		assert.match(t.id, /^[a-z0-9-]+$/);
		assert.ok(t.en && t.cs, 'titles for ' + t.id);
	}
});

test('every topic has an English and a Czech file that start with a level-1 heading', () => {
	for (const t of index) {
		for (const lang of ['en', 'cs']) {
			const file = 'help/' + lang + '/' + t.id + '.md';
			assert.ok(fs.existsSync(path.join(ROOT, file)), file + ' exists');
			assert.match(read(file), /^# \S/, file + ' starts with "# Title"');
		}
	}
});

test('English and Czech topics have the same structure (same number of sections, links and list items)', () => {
	const count = (s, re) => (s.match(re) || []).length;
	for (const t of index) {
		const en = read('help/en/' + t.id + '.md'), cs = read('help/cs/' + t.id + '.md');
		assert.equal(count(cs, /^## /gm), count(en, /^## /gm), t.id + ': sections');
		assert.equal(count(cs, /\(topic:/g), count(en, /\(topic:/g), t.id + ': internal links');
		assert.equal(count(cs, /^\s*[-*] /gm), count(en, /^\s*[-*] /gm), t.id + ': bullet items');
	}
});

test('all internal topic: links resolve to an existing topic', () => {
	const ids = new Set(index.map((t) => t.id));
	for (const lang of ['en', 'cs']) {
		for (const t of index) {
			const text = read('help/' + lang + '/' + t.id + '.md');
			for (const m of text.matchAll(/\(topic:([a-z0-9-]+)\)/g)) assert.ok(ids.has(m[1]), lang + '/' + t.id + ' links to unknown topic ' + m[1]);
		}
	}
});

test('no help text is empty or a stub (at least 400 characters)', () => {
	for (const t of index) for (const lang of ['en', 'cs']) assert.ok(read('help/' + lang + '/' + t.id + '.md').length >= 400, lang + '/' + t.id);
});

// ---------------------------------------------------------------- release rules
test('CHANGELOG.md: newest entry equals the version in package.json and in index.html', () => {
	const version = JSON.parse(read('package.json')).version;
	const first = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/m.exec(read('CHANGELOG.md'));
	assert.ok(first, 'a "## [x.y.z] - date" heading exists');
	assert.equal(first[1], version, 'top changelog entry vs package.json');
	assert.match(read('index.html'), new RegExp('id="appVersionNo">v' + version.replace(/\./g, '\.') + '<'), 'version label in index.html');
});

test('CHANGELOG.md: versions are strictly descending and each entry has a section', () => {
	const text = read('CHANGELOG.md');
	const versions = [...text.matchAll(/^## \[(\d+)\.(\d+)\.(\d+)\]/gm)].map((m) => [+m[1], +m[2], +m[3]]);
	assert.ok(versions.length >= 6);
	for (let i = 1; i < versions.length; i++) {
		const a = versions[i - 1], b = versions[i];
		assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), 'descending at entry ' + i);
	}
	for (const block of text.split(/^## \[/m).slice(1)) assert.match(block, /^### (Added|Changed|Fixed|Removed)/m);
});
