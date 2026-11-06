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

test('marquee rectangle: the drawing direction decides window or crossing', () => {
	const w = m.editorRectFromCorners([0, 0], [10, 5]);
	assert.equal(w.mode, 'window');
	assert.equal(w.minX, 0); assert.equal(w.maxY, 5);
	const c = m.editorRectFromCorners([10, 5], [0, 0]);
	assert.equal(c.mode, 'crossing');
	assert.equal(c.minX, 0); assert.equal(c.maxX, 10);
	const up = m.editorRectFromCorners([0, 8], [10, 0]);
	assert.equal(up.mode, 'window'); assert.equal(up.minY, 0); assert.equal(up.maxY, 8);
});

test('rect relation: outside, inside, overlap', () => {
	const r = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
	assert.equal(m.editorRectRelation({ minX: 11, minY: 0, maxX: 12, maxY: 5 }, r), 'outside');
	assert.equal(m.editorRectRelation({ minX: 2, minY: 2, maxX: 8, maxY: 8 }, r), 'inside');
	assert.equal(m.editorRectRelation({ minX: 5, minY: 5, maxX: 15, maxY: 8 }, r), 'overlap');
	assert.equal(m.editorRectRelation({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, r), 'inside');
});

test('crossing: a line through the rectangle touches it, a line next to it does not', () => {
	const r = { minX: 0, minY: 0, maxX: 10, maxY: 10, mode: 'crossing' };
	assert.equal(m.editorPolylineTouchesRect([[-5, 5], [15, 5]], r), true);           // passes through, no vertex inside
	assert.equal(m.editorPolylineTouchesRect([[-5, 12], [15, 12]], r), false);
	assert.equal(m.editorPolylineTouchesRect([[5, 5], [6, 6]], r), true);             // vertex inside
	assert.equal(m.editorPolylineTouchesRect([[-5, -5], [-1, 20]], r), false);
});

test('marquee hit: window needs the whole object inside, crossing only a touch', () => {
	const rect = (mode) => ({ minX: 0, minY: 0, maxX: 10, maxY: 10, mode });
	const crossing = [[-5, 5], [15, 5]];
	const box = { minX: -5, minY: 5, maxX: 15, maxY: 5 };
	assert.equal(m.editorMarqueeHit(box, () => crossing, rect('window')), false);
	assert.equal(m.editorMarqueeHit(box, () => crossing, rect('crossing')), true);
	const inner = { minX: 2, minY: 2, maxX: 4, maxY: 4 };
	assert.equal(m.editorMarqueeHit(inner, () => { throw new Error('points not needed'); }, rect('window')), true);
	assert.equal(m.editorMarqueeHit({ minX: 20, minY: 20, maxX: 30, maxY: 30 }, () => { throw new Error('not needed'); }, rect('crossing')), false);
	// the bounding box overlaps but the outline does not touch (an L-shape around the corner)
	const ell = [[-5, 20], [-5, 12], [8, 12]];
	assert.equal(m.editorMarqueeHit({ minX: -5, minY: 12, maxX: 8, maxY: 20 }, () => ell, rect('crossing')), false);
});

test('cycling: the same spot picks the next object, another spot or a late click starts again', () => {
	let r = m.editorCycleIndex(null, 100, 100, 1000, 3);
	assert.equal(r.idx, 0);
	r = m.editorCycleIndex(r.state, 102, 99, 1500, 3);
	assert.equal(r.idx, 1);
	r = m.editorCycleIndex(r.state, 101, 100, 2000, 3);
	assert.equal(r.idx, 2);
	r = m.editorCycleIndex(r.state, 100, 100, 2400, 3);
	assert.equal(r.idx, 0);                                                              // wraps around
	r = m.editorCycleIndex(r.state, 140, 100, 2600, 3);
	assert.equal(r.idx, 0);                                                              // moved away
	r = m.editorCycleIndex(r.state, 140, 100, 2700, 3);
	assert.equal(r.idx, 1);
	r = m.editorCycleIndex(r.state, 140, 100, 9000, 3);
	assert.equal(r.idx, 0);                                                              // too late
	assert.equal(m.editorCycleIndex(null, 0, 0, 0, 0).idx, 0);
});

test('typed coordinates: absolute, with decimal commas, relative and polar', () => {
	const last = [10, 20];
	assert.deepEqual(Array.from(m.editorParseCoordinate('12.5,30', null)), [12.5, 30]);
	assert.deepEqual(Array.from(m.editorParseCoordinate('  -3 , 4  ', null)), [-3, 4]);
	assert.deepEqual(Array.from(m.editorParseCoordinate('12,5;30,25', null)), [12.5, 30.25]);        // decimal commas need ;
	assert.deepEqual(Array.from(m.editorParseCoordinate('12,5 30', null)), [12.5, 30]);               // or a space
	assert.deepEqual(Array.from(m.editorParseCoordinate('@5,-2', last)), [15, 18]);
	assert.deepEqual(Array.from(m.editorParseCoordinate('@5;-2,5', last)), [15, 17.5]);
	const p = m.editorParseCoordinate('@10<90', last);
	near(p[0], 10, 1e-9); near(p[1], 30, 1e-9);
	const q = m.editorParseCoordinate('@10<45', [0, 0]);
	near(q[0], 7.0710678, 1e-6); near(q[1], 7.0710678, 1e-6);
});

test('typed coordinates: readable errors', () => {
	assert.throws(() => m.editorParseCoordinate('', null), /Type a point/);
	assert.throws(() => m.editorParseCoordinate('abc,5', null), /Not a number: abc/);
	assert.throws(() => m.editorParseCoordinate('1,2,3', null), /Use x,y/);
	assert.throws(() => m.editorParseCoordinate('@5,5', null), /no previous point/);
	assert.throws(() => m.editorParseCoordinate('10<45', [0, 0]), /start with @/);
	assert.throws(() => m.editorParseCoordinate('@10<', [0, 0]), /Not a number/);
	assert.throws(() => m.editorParseCoordinate('5,', null), /Not a number/);
});

test('distance info: length, components, direction', () => {
	const d = m.editorDistanceInfo([1, 1], [4, 5]);
	near(d.dist, 5); near(d.dx, 3); near(d.dy, 4);
	near(d.angle, Math.atan2(4, 3) * 180 / Math.PI, 1e-9);
	near(m.editorDistanceInfo([0, 0], [-1, 0]).angle, 180);
	near(m.editorDistanceInfo([0, 0], [0, -1]).angle, 270);
	near(m.editorDistanceInfo([2, 2], [2, 2]).dist, 0);
});

test('angle info: right angle, straight, zero, and a degenerate ray', () => {
	near(m.editorAngleInfo([0, 0], [10, 0], [0, 10]), 90, 1e-9);
	near(m.editorAngleInfo([0, 0], [10, 0], [-10, 0]), 180, 1e-9);
	near(m.editorAngleInfo([0, 0], [10, 0], [5, 0]), 0, 1e-9);
	near(m.editorAngleInfo([5, 5], [10, 5], [10, 10]), 45, 1e-9);
	assert.equal(m.editorAngleInfo([0, 0], [0, 0], [1, 1]), null);
});

test('circle fit: a circle polyline is recognised, ellipse / square / open line are not', () => {
	const c = m.editorBuildShape('circle', { radius: 12, segments: 32 }, 5, 7);
	const f = m.editorCircleFit(c);
	near(f.r, 12, 0.2); near(f.cx, 17, 1e-6); near(f.cy, 19, 1e-6);
	assert.equal(m.editorCircleFit(m.editorBuildShape('ellipse', { rx: 25, ry: 10, segments: 72 }, 0, 0)), null);
	assert.equal(m.editorCircleFit(m.editorBuildShape('rectangle', { width: 20, height: 20 }, 0, 0)), null);
	assert.equal(m.editorCircleFit(c.slice(0, 20)), null);                                 // open
	assert.equal(m.editorCircleFit([[0, 0], [1, 1]]), null);
	assert.ok(m.editorCircleFit(m.editorBuildShape('circle', { radius: 10, segments: 64 }, 0, 0)));
});

test('automatic dimensions: diameter for circles, width and height for the rest', () => {
	const circle = m.editorBuildShape('circle', { radius: 12, segments: 48 }, 0, 0);
	const rect = m.editorBuildShape('rectangle', { width: 30, height: 20 }, 50, 50);
	const dims = m.editorAutoDimensions([circle, rect, []]);
	assert.equal(dims.length, 2);
	assert.equal(dims[0].type, 'dia');
	assert.match(dims[0].text, /Ø 24\.0\d$/);
	assert.equal(dims[1].type, 'size');
	assert.equal(dims[1].width.text, '30.00');
	assert.equal(dims[1].height.text, '20.00');
});

test('dimensions mode cycles off -> overall -> each -> off', () => {
	assert.equal(m.editorNextDimsMode(0), 1);
	assert.equal(m.editorNextDimsMode(1), 2);
	assert.equal(m.editorNextDimsMode(2), 0);
});

// ---- 1.6.1: corners and offset ----------------------------------------------------------------------------------------------
const Clipper = require(path.join(__dirname, '..', '..', 'lib', 'clipperjs', 'clipper_unminified.js'));      // the library exports itself under node

const RECT = [[0, 0], [0, 20], [40, 20], [40, 0], [0, 0]];
const area = (pts) => { let a = 0; for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]; return Math.abs(a) / 2; };

test('fillet: every corner of a rectangle becomes an arc of the given radius; the box stays', () => {
	const r = m.editorCornerCut(RECT, 'fillet', 5);
	assert.equal(r.corners, 4); assert.equal(r.clamped, 0);
	const b = m.editorBox(r.points);
	near(b.minX, 0); near(b.maxX, 40); near(b.minY, 0); near(b.maxY, 20);
	assert.deepEqual(Array.from(r.points[0]), Array.from(r.points[r.points.length - 1]));      // still closed
	// area of a rectangle with rounded corners: w*h - (4 - pi) * r^2
	near(area(r.points), 40 * 20 - (4 - Math.PI) * 25, 0.6);            // the arcs are polylines (8 chords per corner), so slightly smaller
	// every arc point lies on a circle of radius 5 round one of the four centres (5,5) (5,15) (35,15) (35,5)
	const centres = [[5, 5], [5, 15], [35, 15], [35, 5]];
	const onArc = r.points.filter((p) => centres.some((c) => Math.abs(Math.hypot(p[0] - c[0], p[1] - c[1]) - 5) < 1e-9));
	assert.ok(onArc.length >= 4 * 3);
});

test('chamfer: corners are cut at the given distance on both edges', () => {
	const r = m.editorCornerCut(RECT, 'chamfer', 4);
	assert.equal(r.corners, 4);
	assert.equal(r.points.length, 9);                                   // 8 corner points + closing point
	near(area(r.points), 40 * 20 - 4 * (4 * 4 / 2), 1e-9);
	const b = m.editorBox(r.points);
	near(b.maxX - b.minX, 40); near(b.maxY - b.minY, 20);
});

test('corner size is reduced when it does not fit and the count says so', () => {
	const r = m.editorCornerCut(RECT, 'fillet', 50);                  // would need 50 mm on a 20 mm edge
	assert.equal(r.clamped, 4);
	const b = m.editorBox(r.points);
	near(b.maxX - b.minX, 40); near(b.maxY - b.minY, 20);
	for (let i = 0; i < r.points.length - 1; i++) assert.ok(isFinite(r.points[i][0]) && isFinite(r.points[i][1]));
	const c = m.editorCornerCut(RECT, 'chamfer', 15);
	assert.equal(c.clamped, 4);
});

test('open polylines keep their end points; straight vertices are left alone', () => {
	const open = [[0, 0], [10, 0], [10, 10]];
	const r = m.editorCornerCut(open, 'fillet', 2);
	assert.deepEqual(Array.from(r.points[0]), [0, 0]);
	assert.deepEqual(Array.from(r.points[r.points.length - 1]), [10, 10]);
	assert.equal(r.corners, 1);
	const straight = [[0, 0], [5, 0], [10, 0], [10, 10]];
	assert.equal(m.editorCornerCut(straight, 'chamfer', 1).corners, 1);       // the vertex at (5,0) is straight
	assert.equal(m.editorCornerCut([[0, 0], [5, 0], [10, 0]], 'fillet', 1).corners, 0);
});

test('corner cut: bad input', () => {
	assert.throws(() => m.editorCornerCut(RECT, 'round', 2), /fillet or chamfer/);
	assert.throws(() => m.editorCornerCut(RECT, 'fillet', 0), /positive/);
	assert.throws(() => m.editorCornerCut(RECT, 'fillet', 'x'), /positive/);
	assert.throws(() => m.editorCornerCut([[0, 0], [1, 1]], 'fillet', 1), /at least 3/);
});

test('offset: growing a rectangle by 2 mm gives 44 x 24 with rounded corners, shrinking gives 36 x 16', () => {
	const grow = m.editorOffsetOutlines(Clipper, [RECT], 2);
	assert.equal(grow.length, 1);
	const g = m.editorBox(grow[0]);
	near(g.minX, -2, 0.01); near(g.maxX, 42, 0.01); near(g.minY, -2, 0.01); near(g.maxY, 22, 0.01);
	near(area(grow[0]), 40 * 20 + 2 * (40 + 20) * 2 + Math.PI * 4, 0.5);        // + edge strips + four quarter circles
	const shrink = m.editorOffsetOutlines(Clipper, [RECT], -2);
	const s = m.editorBox(shrink[0]);
	near(s.minX, 2, 0.01); near(s.maxX, 38, 0.01); near(s.minY, 2, 0.01); near(s.maxY, 18, 0.01);
	assert.deepEqual(Array.from(shrink[0][0]), Array.from(shrink[0][shrink[0].length - 1]));
});

test('offset: shrinking a thin outline away leaves nothing; orientation does not matter; bad input', () => {
	assert.equal(m.editorOffsetOutlines(Clipper, [RECT], -12).length, 0);
	const reversed = RECT.slice().reverse();
	const a = m.editorBox(m.editorOffsetOutlines(Clipper, [reversed], 3)[0]);
	near(a.maxX - a.minX, 46, 0.01);
	assert.throws(() => m.editorOffsetOutlines(Clipper, [RECT], 0), /non-zero/);
	assert.throws(() => m.editorOffsetOutlines(Clipper, [[[0, 0], [5, 5], [9, 0]]], 1), /closed/);
});

test('offset of a circle grows its radius by the distance', () => {
	const c = m.editorBuildShape('circle', { radius: 10, segments: 96 }, 0, 0);
	const o = m.editorOffsetOutlines(Clipper, [c], 3);
	const b = m.editorBox(o[0]);
	near((b.maxX - b.minX) / 2, 13, 0.05);
	const fit = m.editorCircleFit(o[0], 0.01);
	assert.ok(fit);
});

test('extend ends: positive extends along the end segment, negative trims, closed outlines refused', () => {
	const line = [[0, 0], [10, 0], [10, 10]];
	const e = m.editorExtendEnds(line, 2, 3);
	near(e[0][0], -2); near(e[0][1], 0); near(e[2][0], 10); near(e[2][1], 13);
	const t = m.editorExtendEnds(line, -4, -1);
	near(t[0][0], 4); near(t[2][1], 9);
	assert.deepEqual(m.editorExtendEnds(line, 0, 0).map((p) => Array.from(p)), line);
	assert.throws(() => m.editorExtendEnds(line, -10, 0), /Cannot trim/);
	assert.throws(() => m.editorExtendEnds([[0, 0], [5, 0], [5, 5], [0, 0]], 1, 1), /open lines/);
	assert.throws(() => m.editorExtendEnds(line, 'x', 0), /number/);
});

test('size steps: handle factors are rounded to whole millimetres', () => {
	const box = { minX: 0, minY: 0, maxX: 40, maxY: 20 };
	const fixed = [0, 0];
	let r = m.editorSnapSize(box, { fx: 1.4321, fy: 1.4321, fixed }, false, 1);
	near(r.fx * 40, 57); near(r.fx, r.fy, 1e-12);
	r = m.editorSnapSize(box, { fx: 1.0123, fy: 1.2345, fixed }, true, 1);
	near(r.fx * 40, 40); near(r.fy * 20, 25);
	r = m.editorSnapSize(box, { fx: 1, fy: 0.5321, fixed }, false, 1);
	assert.equal(r.fx, 1); near(r.fy * 20, 11);
	r = m.editorSnapSize(box, { fx: 0.01, fy: 0.01, fixed }, false, 1);
	near(r.fx * 40, 1);
	r = m.editorSnapSize({ minX: 0, minY: 0, maxX: 0, maxY: 10 }, { fx: 1, fy: 1.33, fixed }, false, 1);
	near(r.fy * 10, 13);
});

test('rotation snap: whole degrees, magnet to multiples of 15 within 4 degrees', () => {
	assert.equal(m.editorSnapAngle(7.4), 7);
	assert.equal(m.editorSnapAngle(12), 15);
	assert.equal(m.editorSnapAngle(10.4), 10);
	assert.equal(m.editorSnapAngle(-44), -45);
	assert.equal(m.editorSnapAngle(89.6), 90);
	assert.ok(Object.is(m.editorSnapAngle(-0.3), 0));
});
