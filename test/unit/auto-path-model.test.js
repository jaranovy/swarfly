
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/auto-path-model.js');

const square = (x, y, s) => ({ closed: true, pts: [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]] });
const circle = (cx, cy, r) => { const pts = []; for (let i = 0; i <= 24; i++) pts.push([cx + r * Math.cos(i / 24 * 2 * Math.PI), cy + r * Math.sin(i / 24 * 2 * Math.PI)]); return { closed: true, pts }; };

test('autoPointInPolygon', () => {
	const sq = square(0, 0, 10).pts;
	assert.equal(m.autoPointInPolygon(5, 5, sq), true);
	assert.equal(m.autoPointInPolygon(15, 5, sq), false);
});

test('autoNesting: hole in a part = 1, island in the hole = 2', () => {
	const shapes = [square(0, 0, 100), square(10, 10, 50), square(20, 20, 10)];
	assert.deepEqual(Array.from(m.autoNesting(shapes)), [0, 1, 2]);
});

test('autoCircle: a circle is found with its diameter, a square is not', () => {
	const c = m.autoCircle(circle(5, 7, 2));
	assert.ok(Math.abs(c.d - 4) < 0.01 && Math.abs(c.cx - 5) < 0.01 && Math.abs(c.cy - 7) < 0.01);
	assert.equal(m.autoCircle(square(0, 0, 4)), null);
	assert.equal(m.autoCircle({ closed: false, pts: circle(0, 0, 2).pts }), null);
});

test('autoPlan: drills, holes, engraving, outside last; depths from the material', () => {
	const shapes = [
		square(0, 0, 100),                       // 0 outside
		circle(20, 20, 1.5),                     // 1 tiny circle -> drill (3 mm <= 3.175 * 1.2)
		circle(60, 60, 10),                      // 2 hole
		{ closed: false, pts: [[10, 90], [90, 90]] }   // 3 open line (inside the part, still engraved)
	];
	const plan = m.autoPlan(shapes, { toolDia: 3.175, thickness: 6, engraveDepth: 0.4 });
	assert.deepEqual(Array.from(plan.map((g) => g.key)), ['drill', 'inside', 'engrave', 'outside']);
	assert.deepEqual(Array.from(plan.map((g) => Array.from(g.indexes))), [[1], [2], [3], [0]]);
	assert.deepEqual(Array.from(plan.map((g) => g.zDepth)), [6, 6, 0.4, 6]);
	assert.equal(plan[3].operation, 'CNC: Vector (path outside)');
	assert.equal(plan[1].operation, 'CNC: Vector (path inside)');
});

test('autoPlan: only the groups that exist; engraving never deeper than the material; bad options fall back', () => {
	const plan = m.autoPlan([square(0, 0, 20)], {});
	assert.equal(plan.length, 1);
	assert.equal(plan[0].zDepth, 3);
	assert.equal(m.autoPlan([{ closed: false, pts: [[0, 0], [5, 5]] }], { thickness: 0.3, engraveDepth: 2 })[0].zDepth, 0.3);
	assert.deepEqual(Array.from(m.autoPlan([], {})), []);
});
