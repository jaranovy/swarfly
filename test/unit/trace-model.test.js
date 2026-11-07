'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/trace-model.js');

test('traceBrightness: transparent pixels are paper', () => {
	assert.equal(Math.round(m.traceBrightness(0, 0, 0, 255)), 0);
	assert.equal(Math.round(m.traceBrightness(0, 0, 0, 0)), 255);
	assert.ok(m.traceBrightness(0, 0, 0, 128) > 120 && m.traceBrightness(0, 0, 0, 128) < 135);
});

test('traceOtsu: separates a dark and a light population', () => {
	const h = new Array(256).fill(0); h[30] = 500; h[220] = 500;
	const t = m.traceOtsu(h);
	assert.ok(t > 30 && t <= 220, String(t));
	assert.equal(m.traceOtsu(new Array(256).fill(0)), 128);
});

test('traceMask: ink is darker than the threshold; invert flips it; transparent is never ink', () => {
	const px = [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0];     // black, white, transparent
	assert.deepEqual(Array.from(m.traceMask(px, 3, 1, 128, false)), [1, 0, 0]);
	assert.deepEqual(Array.from(m.traceMask(px, 3, 1, 128, true)), [0, 1, 1]);
});

test('traceWorkSize: only large pictures shrink', () => {
	assert.deepEqual(JSON.parse(JSON.stringify(m.traceWorkSize(500, 250, 1000))), { width: 500, height: 250, factor: 1 });
	const s = m.traceWorkSize(4000, 2000, 1000);
	assert.equal(s.width, 1000); assert.equal(s.height, 500); assert.equal(s.factor, 0.25);
});

test('traceOptions / size helpers', () => {
	assert.equal(m.traceOptions('sharp', 3).alphaMax, 0.3);
	assert.equal(m.traceOptions('nonsense', 3).alphaMax, 1);
	assert.equal(m.traceOptions('normal', -4).turdSize, 0);
	assert.equal(m.traceDefaultWidthMm(160), 42.33);
	assert.ok(Math.abs(m.traceSvgScale(200, 52.9166667) - 1) < 1e-4);
	assert.equal(m.traceSizeText(200, 100, 80), '80 x 40 mm');
	assert.equal(m.traceSizeText(200, 100, 'x'), '');
});

// ---- 1.19.0: centre lines ----
function ring(w, h, cx, cy, r, t) {
	const m = new Uint8Array(w * h);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x - cx, y - cy); if (d >= r - t / 2 && d <= r + t / 2) m[y * w + x] = 1; }
	return m;
}

test('a thick ring gives ONE closed centre line at the middle of the stroke', () => {
	const w = 120, h = 120, mk = ring(w, h, 60, 60, 40, 7);
	const lines = m.traceCenterlines(mk, w, h, 'normal', 5);
	assert.equal(lines.length, 1);
	assert.equal(lines[0].closed, true);
	lines[0].pts.forEach((p) => { assert.ok(Math.abs(Math.hypot(p[0] - 60, p[1] - 60) - 40) < 1.6, 'point off the middle: ' + p); });
	assert.ok(lines[0].pts.length >= 12 && lines[0].pts.length < 120);
});

test('a thick line gives one open path along its middle; a plus gives four arms', () => {
	const w = 100, h = 60, mk = new Uint8Array(w * h);
	for (let y = 26; y < 33; y++) for (let x = 10; x < 90; x++) mk[y * w + x] = 1;
	let lines = m.traceCenterlines(mk, w, h, 'normal', 5);
	assert.equal(lines.length, 1);
	assert.equal(lines[0].closed, false);
	const ys = lines[0].pts.map((p) => p[1]);
	assert.ok(Math.max(...ys) - Math.min(...ys) < 1.5 && Math.abs(ys[0] - 29.5) < 1.5);
	assert.ok(Math.abs(lines[0].pts[0][0] - lines[0].pts[lines[0].pts.length - 1][0]) > 60);

	const p = new Uint8Array(100 * 100);
	for (let i = 15; i < 85; i++) for (let t = 47; t < 53; t++) { p[t * 100 + i] = 1; p[i * 100 + t] = 1; }
	lines = m.traceCenterlines(p, 100, 100, 'normal', 5);
	assert.equal(lines.length, 4);
});

test('specks shorter than the noise limit are dropped; an empty mask gives nothing', () => {
	const w = 60, h = 60, mk = new Uint8Array(w * h);
	mk[10 * w + 10] = 1; mk[10 * w + 11] = 1;
	assert.equal(m.traceCenterlines(mk, w, h, 'normal', 5).length, 0);
	assert.equal(m.traceCenterlines(new Uint8Array(w * h), w, h, 'normal', 5).length, 0);
});

test('traceCenterSvg scales the coordinates and the size; open and closed paths', () => {
	const svg = m.traceCenterSvg([{ pts: [[1, 2], [3, 4]], closed: false }, { pts: [[0, 0], [2, 0], [2, 2]], closed: true }], 10, 20, 2);
	assert.match(svg, /width="20" height="40"/);
	assert.match(svg, /M2\.000 4\.000 L6\.000 8\.000 M0\.000 0\.000 L4\.000 0\.000 L4\.000 4\.000 Z/);
});

test('traceLooksLikeLines: a thin ring yes, a filled disc no', () => {
	const w = 200, h = 200;
	assert.equal(m.traceLooksLikeLines(ring(w, h, 100, 100, 70, 3), w, h), true);
	const disc = new Uint8Array(w * h);
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - 100, y - 100) < 70) disc[y * w + x] = 1;
	assert.equal(m.traceLooksLikeLines(disc, w, h), false);
});
