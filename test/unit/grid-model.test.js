'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/grid-model.js');

test('gridPxPerMm: closer = more pixels per mm; bad input gives 0', () => {
	const a = m.gridPxPerMm(45, 400, 700), b = m.gridPxPerMm(45, 200, 700);
	assert.ok(b > a * 1.99 && b < a * 2.01);
	assert.equal(m.gridPxPerMm(45, 0, 700), 0);
	assert.equal(m.gridPxPerMm(45, 100, 0), 0);
	// 700 px for 2 * 400 * tan(22.5deg) = 331 mm -> about 2.1 px / mm
	assert.ok(Math.abs(a - 2.11) < 0.05);
});

test('far away only the coarse lines; the finer ones come with zoom', () => {
	const far = m.gridLevels(0.3);            // 3 px per 10 mm
	assert.equal(far.a10, 0); assert.equal(far.a5, 0); assert.equal(far.a1, 0);
	assert.ok(far.a100 > 0);
	const mid = m.gridLevels(1.2);            // 12 px per 10 mm, 6 px per 5 mm
	assert.equal(mid.a10, 1); assert.equal(mid.a5, 0); assert.equal(mid.a1, 0);
	const near = m.gridLevels(4);             // 5 mm lines 20 px apart, 1 mm lines 4 px apart
	assert.equal(near.a5, 1); assert.equal(near.a1, 0);
	const close = m.gridLevels(12);
	assert.equal(close.a1, 1); assert.equal(close.a5, 1);
});

test('the 10 mm lines turn dark when zoomed in; every strength is within 0..1 and grows with zoom', () => {
	assert.equal(m.gridLevels(1.2).s10, 0);
	assert.equal(m.gridLevels(8).s10, 1);
	let prev = null;
	for (let px = 0; px <= 20; px += 0.25) {
		const l = m.gridLevels(px);
		Object.keys(l).forEach((k) => { assert.ok(l[k] >= 0 && l[k] <= 1, k); if (prev) assert.ok(l[k] >= prev[k], k + ' must not shrink when zooming in'); });
		prev = l;
	}
});
