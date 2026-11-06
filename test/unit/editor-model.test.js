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

test('mirror: a point mirrored twice is itself; the mirror line keeps its points', () => {
	assert.deepEqual(Array.from(m.editorMirrorPoint([3, 4], 'x', 10)), [17, 4]);
	assert.deepEqual(Array.from(m.editorMirrorPoint([3, 4], 'y', 10)), [3, 16]);
	assert.deepEqual(Array.from(m.editorMirrorPoint([10, 4], 'x', 10)), [10, 4]);
	assert.deepEqual(Array.from(m.editorMirrorPoint(m.editorMirrorPoint([3, 4], 'x', 7), 'x', 7)), [3, 4]);
	assert.throws(() => m.editorMirrorPoint([1, 1], 'z', 0));
});

test('linear copy offsets: count includes the original', () => {
	assert.deepEqual(JSON.parse(JSON.stringify(m.editorLinearOffsets(4, 10, 5))), [[10, 5], [20, 10], [30, 15]]);
	assert.throws(() => m.editorLinearOffsets(1, 10, 0), /between 2 and 500/);
	assert.throws(() => m.editorLinearOffsets(501, 10, 0), /between 2 and 500/);
	assert.throws(() => m.editorLinearOffsets(3, 0, 0), /both zero/);
	assert.throws(() => m.editorLinearOffsets(3, NaN, 1), /number/);
});

test('polar copy angles: full circle spreads evenly, partial arc ends at the angle', () => {
	assert.deepEqual(JSON.parse(JSON.stringify(m.editorPolarAngles(4, 360))), [90, 180, 270]);
	assert.deepEqual(JSON.parse(JSON.stringify(m.editorPolarAngles(3, 90))), [45, 90]);
	assert.deepEqual(JSON.parse(JSON.stringify(m.editorPolarAngles(3, -90))), [-45, -90]);
	assert.throws(() => m.editorPolarAngles(1, 90));
	assert.throws(() => m.editorPolarAngles(4, 0));
});

test('handles: a corner keeps proportions, the opposite corner stays fixed', () => {
	const r = m.editorHandleFactors(BOX, 'ur', 90, 60, false);         // BOX is 40 x 20 at (10,20); ur corner is (50,40)
	assert.deepEqual(Array.from(r.fixed), [10, 20]);
	near(r.fx, r.fy);
	// dragging exactly along the diagonal to twice the size
	const d = m.editorHandleFactors(BOX, 'ur', 90, 60, false);
	near(d.fx, 2, 1e-9);
	const free = m.editorHandleFactors(BOX, 'ur', 90, 40, true);
	near(free.fx, 2); near(free.fy, 1);
	const free2 = m.editorHandleFactors(BOX, 'ur', 90, 30, true);
	near(free2.fx, 2); near(free2.fy, 0.5);
});

test('handles: edge handles change one side only; the factor never goes below 0.01', () => {
	const e = m.editorHandleFactors(BOX, 'mr', 70, 999, false);
	near(e.fx, 1.5); near(e.fy, 1);
	const t = m.editorHandleFactors(BOX, 'uc', 0, 60, false);
	near(t.fx, 1); near(t.fy, 2);
	const tiny = m.editorHandleFactors(BOX, 'mr', -500, 0, false);
	near(tiny.fx, 0.01);
	assert.throws(() => m.editorHandleFactors(BOX, 'mc', 0, 0, false));
});

test('arrow keys: 1 mm, Shift 10 mm, Alt 0.1 mm, other keys ignored', () => {
	assert.deepEqual(Array.from(m.editorArrowDelta('ArrowLeft', false, false)), [-1, 0]);
	assert.deepEqual(Array.from(m.editorArrowDelta('ArrowUp', true, false)), [0, 10]);
	assert.deepEqual(Array.from(m.editorArrowDelta('ArrowDown', false, true)), [0, -0.1]);
	assert.equal(m.editorArrowDelta('a', false, false), null);
});

test('segment intersection: crossing, parallel, and outside the segments', () => {
	const x = m.editorSegmentIntersection([0, 0], [10, 10], [0, 10], [10, 0]);
	near(x[0], 5); near(x[1], 5);
	assert.equal(m.editorSegmentIntersection([0, 0], [10, 0], [0, 5], [10, 5]), null);          // parallel
	assert.equal(m.editorSegmentIntersection([0, 0], [4, 4], [0, 10], [10, 0]), null);          // lines cross, segments do not
	const t = m.editorSegmentIntersection([0, 0], [10, 0], [5, -5], [5, 5]);
	near(t[0], 5); near(t[1], 0);
});

const SQUARE = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]];

test('snap: end point beats grid, nearest wins, nothing outside the tolerance', () => {
	let s = m.editorSnapFind([0.4, 0.3], [SQUARE], 1, { gridStep: 1 });
	assert.equal(s.kind, 'end');
	assert.deepEqual(Array.from(s.point), [0, 0]);
	s = m.editorSnapFind([50, 50], [SQUARE], 1, { gridStep: 0 });
	assert.equal(s, null);
	s = m.editorSnapFind([50.2, 49.9], [SQUARE], 1, { gridStep: 1 });
	assert.equal(s.kind, 'grid');
	assert.deepEqual(Array.from(s.point), [50, 50]);
});

test('snap: centre of an object, middle of a segment, kinds can be switched off', () => {
	let s = m.editorSnapFind([5.2, 4.8], [SQUARE], 1, {});
	assert.equal(s.kind, 'centre');
	assert.deepEqual(Array.from(s.point), [5, 5]);
	s = m.editorSnapFind([0.2, 5.1], [SQUARE], 1, { centre: false });
	assert.equal(s.kind, 'mid');
	assert.deepEqual(Array.from(s.point), [0, 5]);
	s = m.editorSnapFind([0.2, 5.1], [SQUARE], 1, { centre: false, mid: false });
	assert.equal(s, null);
});

test('snap: intersection of two crossing outlines, but a vertex of one outline stays an end point', () => {
	const cross = [[-5, 5], [15, 5]];
	let s = m.editorSnapFind([10.3, 5.2], [SQUARE, cross], 1, {});
	assert.equal(s.kind, 'intersection');
	near(s.point[0], 10); near(s.point[1], 5);
	s = m.editorSnapFind([10.2, 9.9], [SQUARE, cross], 1, {});
	assert.equal(s.kind, 'end');
});

test('snap move: the closest reference point of the moved box lands on a target', () => {
	const moved = { minX: 0, minY: 0, maxX: 4, maxY: 2 };
	// move by (20.3, 10.2): the lower-left corner would be at (20.3, 10.2) - snap to the grid point (20, 10)
	const r = m.editorSnapMove(moved, 20.3, 10.2, [], 1, { gridStep: 1 });
	near(r.dx, 20); near(r.dy, 10);
	assert.equal(r.kind, 'grid');
	// the upper-right corner (4 + dx, 2 + dy) is close to an end point of SQUARE (10, 10): that wins over the grid
	const e = m.editorSnapMove(moved, 6.3, 8.2, [SQUARE], 1, { gridStep: 1 });
	assert.equal(e.kind, 'end');
	near(e.dx, 6); near(e.dy, 8);
	const none = m.editorSnapMove(moved, 20.5, 10.5, [], 0.2, { gridStep: 1 });
	near(none.dx, 20.5); assert.equal(none.kind, null);
});

test('grid step button cycles through the steps and ends at off', () => {
	let s = 1;
	const seen = [];
	for (let i = 0; i < 6; i++) { s = m.editorNextGridStep(s); seen.push(s); }
	assert.deepEqual(seen, [5, 10, 0.5, 0.1, 0, 1]);
	assert.equal(m.editorNextGridStep(7), 1);          // unknown value -> first step
});
