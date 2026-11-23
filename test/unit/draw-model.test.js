'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/draw-model.js');
const J = (v) => JSON.parse(JSON.stringify(v));      // the vm context has its own Array: compare plain copies
const near = (a, b, eps) => Math.abs(a - b) <= (eps || 1e-6);

test('drawArcPoints: a straight segment is just its two ends', () => {
	assert.deepEqual(J(m.drawArcPoints([0, 0], [10, 0], 0)), [[0, 0], [10, 0]]);
});

test('drawArcPoints: a bulge of 1 is a half circle round the middle of the chord, all points on the circle', () => {
	const pts = J(m.drawArcPoints([0, 0], [10, 0], 1));         // counter-clockwise: bulges to the right of a -> b (below)
	assert.ok(pts.length > 10);
	assert.deepEqual(pts[0], [0, 0]);
	assert.ok(near(pts[pts.length - 1][0], 10) && near(pts[pts.length - 1][1], 0));
	pts.forEach((p) => assert.ok(near(Math.hypot(p[0] - 5, p[1]), 5, 1e-6), 'on the circle of radius 5'));
	const lowest = Math.min.apply(null, pts.map((p) => p[1]));
	assert.ok(near(lowest, -5, 0.02));
});

test('drawArcPoints: the straight pieces stay within the tolerance of the arc', () => {
	const a = [0, 0], b = [30, 0], pts = J(m.drawArcPoints(a, b, 0.4, 0.02)), g = m.drawArcGeom(a, b, 0.4);
	for (let i = 1; i < pts.length; i++) {
		const mid = [(pts[i][0] + pts[i - 1][0]) / 2, (pts[i][1] + pts[i - 1][1]) / 2];
		assert.ok(Math.abs(Math.hypot(mid[0] - g.cx, mid[1] - g.cy) - g.r) <= 0.0201);
	}
});

test('drawBulgeThrough: the arc from a to b really passes through p, on either side', () => {
	for (const p of [[5, 3], [5, -3], [2, 4], [8, -1]]) {
		const b = m.drawBulgeThrough([0, 0], [10, 0], p);
		const g = m.drawArcGeom([0, 0], [10, 0], b);
		assert.ok(near(Math.hypot(p[0] - g.cx, p[1] - g.cy), g.r, 1e-9), 'p lies on the circle');
		const ang = Math.atan2(p[1] - g.cy, p[0] - g.cx), rel = (((ang - g.a0) * (g.theta < 0 ? -1 : 1)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
		assert.ok(rel <= Math.abs(g.theta) + 1e-9, 'and on the swept part, not on the other side');
	}
	assert.equal(m.drawBulgeThrough([0, 0], [10, 0], [5, 0]), 0);
	assert.ok(m.drawBulgeThrough([0, 0], [10, 0], [5, 3]) < 0, 'above the chord = clockwise');
	assert.ok(m.drawBulgeThrough([0, 0], [10, 0], [5, -3]) > 0);
});

test('drawNodesToPoints / drawPointsToNodes: open and closed lines', () => {
	const open = [[0, 0], [10, 0], [10, 5]];
	const o = m.drawPointsToNodes(open);
	assert.equal(o.closed, false);
	assert.deepEqual(J(m.drawNodesToPoints(o.nodes, false)), open);
	const sq = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
	const c = m.drawPointsToNodes(sq);
	assert.equal(c.closed, true);
	assert.equal(c.nodes.length, 4);
	assert.deepEqual(J(m.drawNodesToPoints(c.nodes, true)), sq);
});

test('drawSimplify keeps the corners of a noisy line and drops the points on straight parts', () => {
	const pts = [];
	for (let i = 0; i <= 20; i++) pts.push([i, 0.01 * (i % 2)]);
	for (let i = 1; i <= 20; i++) pts.push([20, i + 0.01 * (i % 2)]);
	const s = J(m.drawSimplify(pts, 0.1));
	assert.deepEqual(s, [[0, 0], [20, 0.0], [20, 20.0]].map((p, i) => i === 0 ? p : s[i]));
	assert.equal(s.length, 3);
	assert.deepEqual(s[1], [20, 0]);
});

test('drawLockAngle snaps the direction to the step and keeps the length', () => {
	const p = J(m.drawLockAngle([0, 0], [10, 1], 15));
	assert.ok(near(Math.hypot(p[0], p[1]), Math.hypot(10, 1)));
	assert.ok(near(Math.atan2(p[1], p[0]), 0));
	const q = J(m.drawLockAngle([5, 5], [5 + 7, 5 + 8], 45));
	assert.ok(near(q[0] - 5, q[1] - 5, 1e-6));
});

test('drawInsertNode splits a straight segment in two; a curved one stays the same curve', () => {
	const nodes = [{ x: 0, y: 0, b: 0 }, { x: 10, y: 0, b: 0 }];
	const a = J(m.drawInsertNode(nodes, false, 0, 0.5));
	assert.equal(a.length, 3);
	assert.deepEqual([a[1].x, a[1].y], [5, 0]);
	const arc = [{ x: 0, y: 0, b: 1 }, { x: 10, y: 0, b: 0 }];
	const b = J(m.drawInsertNode(arc, false, 0, 0.5));
	assert.equal(b.length, 3);
	assert.ok(near(Math.hypot(b[1].x - 5, b[1].y), 5, 1e-9), 'the new node lies on the old circle');
	const before = J(m.drawNodesToPoints(arc, false, 0.001)), after = J(m.drawNodesToPoints(b, false, 0.001));
	after.forEach((p) => assert.ok(near(Math.hypot(p[0] - 5, p[1]), 5, 1e-6)));
	assert.ok(before.length > 10 && after.length > 10);
});

test('drawDeleteNodes: joins the neighbours with a straight segment and refuses to go below the minimum', () => {
	const nodes = [{ x: 0, y: 0, b: 0.5 }, { x: 5, y: 0, b: 0.5 }, { x: 10, y: 0, b: 0 }];
	const r = J(m.drawDeleteNodes(nodes, false, [1]));
	assert.equal(r.length, 2);
	assert.equal(r[0].b, 0, 'the old arc is gone');
	assert.equal(m.drawDeleteNodes(nodes, false, [0, 1]), null);
	const tri = [{ x: 0, y: 0, b: 0 }, { x: 5, y: 0, b: 0 }, { x: 0, y: 5, b: 0 }];
	assert.equal(m.drawDeleteNodes(tri, true, [1]), null);
});

test('drawNearestNode, drawNearestMid and drawNearestSegment', () => {
	const nodes = [{ x: 0, y: 0, b: 0 }, { x: 10, y: 0, b: 0 }, { x: 10, y: 10, b: 0 }];
	assert.equal(m.drawNearestNode(nodes, [9.8, 0.1], 0.5), 1);
	assert.equal(m.drawNearestNode(nodes, [5, 5], 0.5), -1);
	assert.equal(m.drawNearestMid(nodes, false, [5.1, 0.1], 0.5), 0);
	assert.equal(m.drawNearestMid(nodes, false, [10.1, 5], 0.5), 1);
	const s = J(m.drawNearestSegment(nodes, false, [3, 2]));
	assert.equal(s.seg, 0);
	assert.ok(near(s.t, 0.3) && near(s.dist, 2));
	const arc = [{ x: 0, y: 0, b: 1 }, { x: 10, y: 0, b: 0 }];
	const t = J(m.drawNearestSegment(arc, false, [5, -6]));
	assert.ok(near(t.t, 0.5, 1e-6) && near(t.dist, 1, 1e-6), JSON.stringify(t));
});

test('drawSignature changes when a point moves', () => {
	const a = [[0, 0], [1, 1], [2, 0]];
	assert.equal(m.drawSignature(a), m.drawSignature(a.map((p) => p.slice())));
	assert.notEqual(m.drawSignature(a), m.drawSignature([[0, 0], [1, 1.01], [2, 0]]));
});
