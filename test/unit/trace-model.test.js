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
