'use strict';

// Unit tests for js/editor-model.js: boxes, reference points, move / resize / rotate maths, dimensions text,
// placement at the cursor, shape parameters (rebuild a shape from its parameters) and status line prompts.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadBrowserScript } = require('./helpers/load-browser-script');

// editor-model.js uses the generators of shape-generators.js as globals, so both live in one context
const m = loadBrowserScript('js/shape-generators.js');
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'editor-model.js'), 'utf8'), m, { filename: 'js/editor-model.js' });

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);
const BOX = { minX: 10, minY: 20, maxX: 50, maxY: 40 };   // 40 x 20

test('editorBox / editorBoxUnion / editorSize', () => {
	const b = m.editorBox([[1, 2], [5, -1], [3, 7]]);
	assert.deepEqual(JSON.parse(JSON.stringify(b)), { minX: 1, minY: -1, maxX: 5, maxY: 7 });
	const u = m.editorBoxUnion([BOX, { minX: 0, minY: 30, maxX: 20, maxY: 90 }]);
	assert.deepEqual(JSON.parse(JSON.stringify(u)), { minX: 0, minY: 20, maxX: 50, maxY: 90 });
	const s = m.editorSize(BOX);
	near(s.w, 40); near(s.h, 20);
	assert.throws(() => m.editorBox([]));
});

test('reference points: all nine positions', () => {
	const want = { ll: [10, 20], lc: [30, 20], lr: [50, 20], ml: [10, 30], mc: [30, 30], mr: [50, 30], ul: [10, 40], uc: [30, 40], ur: [50, 40] };
	for (const ref of Object.keys(want)) assert.deepEqual(Array.from(m.editorRefPoint(BOX, ref)), want[ref], ref);
	assert.throws(() => m.editorRefPoint(BOX, 'xx'));
});

test('move: the chosen reference point lands exactly on the typed position', () => {
	for (const ref of m.EDITOR_REFS) {
		const d = m.editorMoveDelta(BOX, ref, 100, 200);
		const moved = { minX: BOX.minX + d[0], minY: BOX.minY + d[1], maxX: BOX.maxX + d[0], maxY: BOX.maxY + d[1] };
		const p = m.editorRefPoint(moved, ref);
		near(p[0], 100); near(p[1], 200);
	}
});

test('resize: ratio lock gives equal factors, unlocked changes one side only', () => {
	assert.deepEqual(Array.from(m.editorResizeFactors(BOX, 'w', 80, true)), [2, 2]);
	assert.deepEqual(Array.from(m.editorResizeFactors(BOX, 'h', 10, true)), [0.5, 0.5]);
	assert.deepEqual(Array.from(m.editorResizeFactors(BOX, 'w', 80, false)), [2, 1]);
	assert.deepEqual(Array.from(m.editorResizeFactors(BOX, 'h', 40, false)), [1, 2]);
	assert.throws(() => m.editorResizeFactors(BOX, 'w', 0, true));
	assert.throws(() => m.editorResizeFactors(BOX, 'w', 'abc', true));
	// a straight line has no height: width can still be changed
	const line = { minX: 0, minY: 5, maxX: 10, maxY: 5 };
	assert.deepEqual(Array.from(m.editorResizeFactors(line, 'w', 20, true)), [2, 1]);
});

test('scaling about the reference point keeps that point fixed', () => {
	const fixed = m.editorRefPoint(BOX, 'ur');
	const p = m.editorScalePoint([10, 20], fixed, 2, 2);          // lower-left corner moves away from the upper-right one
	near(p[0], -30); near(p[1], 0);
	const q = m.editorScalePoint(fixed, fixed, 3, 0.5);
	near(q[0], 50); near(q[1], 40);
});

test('rotation: 90 degrees anticlockwise about a centre, and a full turn is identity', () => {
	const r = m.editorRotatePoint([10, 0], [0, 0], 90);
	near(r[0], 0, 1e-12); near(r[1], 10, 1e-12);
	let p = [3, 4];
	for (let i = 0; i < 4; i++) p = m.editorRotatePoint(p, [1, 1], 90);
	near(p[0], 3, 1e-9); near(p[1], 4, 1e-9);
	const c = m.editorRotatePoint([5, 5], [5, 5], 33);
	near(c[0], 5); near(c[1], 5);
});

test('rotating a group of 3 rectangles by 90 degrees moves their centres like the rotated vector from the group centre', () => {
	const centres = [[10, 10], [40, 10], [25, 30]];
	const group = [0, 1, 2].map((i) => ({ minX: centres[i][0] - 5, maxX: centres[i][0] + 5, minY: centres[i][1] - 3, maxY: centres[i][1] + 3 }));
	const gc = m.editorRefPoint(m.editorBoxUnion(group), 'mc');
	for (const c of centres) {
		const want = [gc[0] - (c[1] - gc[1]), gc[1] + (c[0] - gc[0])];     // vector (dx, dy) -> (-dy, dx)
		const got = m.editorRotatePoint(c, gc, 90);
		near(got[0], want[0], 1e-9); near(got[1], want[1], 1e-9);
	}
});

test('dimensions: text for width and height and the places of the lines', () => {
	const d = m.editorDimensions(BOX);
	assert.equal(d.width.text, '40.00');
	assert.equal(d.height.text, '20.00');
	assert.deepEqual(Array.from(d.width.from), [10, 20]);
	assert.deepEqual(Array.from(d.width.to), [50, 20]);
	assert.deepEqual(Array.from(d.height.to), [10, 40]);
	assert.equal(m.editorFormat(-0.0001), '0.00');
	assert.equal(m.editorFormat(1.005 + 1e-9), '1.01');
});

test('placement: shape centre sits under the cursor, lower-left corner follows', () => {
	const ll = m.editorPlaceAtCursor(100, 60, 30, 10);
	near(ll[0], 85); near(ll[1], 55);
});

test('shape parameters: every editable shape rebuilds with the right size at the right place', () => {
	const cases = [
		['circle', { radius: 12, segments: 32 }, 24, 24],
		['rectangle', { width: 30, height: 20 }, 30, 20],
		['rounded rectangle', { width: 80, height: 40, radius: 6 }, 80, 40],
		['ellipse', { rx: 25, ry: 10, segments: 72 }, 50, 20],
		['slot', { length: 60, width: 12 }, 60, 12],
	];
	for (const [kind, params, w, h] of cases) {
		const pts = m.editorBuildShape(kind, params, 15, 7);
		const b = m.editorBox(pts);
		near(b.minX, 15, 1e-6); near(b.minY, 7, 1e-6);
		near(b.maxX - b.minX, w, 1e-6); near(b.maxY - b.minY, h, 1e-6);
		assert.deepEqual(Array.from(pts[0]), Array.from(pts[pts.length - 1]), kind + ' is closed');
	}
	assert.equal(m.editorBuildShape('star', { points: 5, outer: 25, inner: 10 }, 0, 0).length, 11);
	assert.equal(m.editorBuildShape('polygon', { sides: 6, radius: 20 }, 0, 0).length, 7);
});

test('shape parameters: bad values are refused with a readable message', () => {
	assert.throws(() => m.editorBuildShape('star', { points: 2, outer: 10, inner: 5 }), /Points must be at least 3/);
	assert.throws(() => m.editorBuildShape('circle', { radius: 'x', segments: 32 }), /Radius must be a number/);
	assert.throws(() => m.editorBuildShape('circle', { radius: -1, segments: 32 }), /Radius must be at least/);
	assert.throws(() => m.editorBuildShape('star', { points: 5, outer: 10, inner: 20 }), /inner|Radii/i);
	assert.throws(() => m.editorBuildShape('hexagon', {}), /no editable parameters/);
});

test('circle starts at angle 0 and has its lower-left corner at 0,0 once placed', () => {
	const pts = m.editorBuildShape('circle', { radius: 10, segments: 32 }, 0, 0);
	const b = m.editorBox(pts);
	near(b.minX, 0, 1e-9); near(b.minY, 0, 1e-9);
	assert.equal(pts.length, 33);
});

test('status line prompts', () => {
	assert.match(m.editorPrompt({ placing: true, count: 0 }), /Click to place/);
	assert.match(m.editorPrompt({ placing: false, count: 0 }), /select/);
	assert.match(m.editorPrompt({ placing: false, count: 1 }), /1 object selected/);
	assert.match(m.editorPrompt({ placing: false, count: 4 }), /4 objects selected/);
});
