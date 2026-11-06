'use strict';

// Unit tests for js/shape-generators.js: geometry of the "Shapes" menu (polygon, star, ellipse, rounded rect, slot)
// and the proportional-scale helpers used by the Scale tab.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');
const approx = require('./helpers/approx');

const g = loadBrowserScript('js/shape-generators.js');

function bbox(pts) {
	const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
	return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
function isClosed(pts) {
	return pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
}
function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

test('every shape is closed and starts its bounding box at (0,0)', () => {
	const shapes = {
		polygon: g.shapePolygon(6, 10),
		star: g.shapeStar(5, 10, 4),
		ellipse: g.shapeEllipse(10, 5, 48),
		rounded: g.shapeRoundedRect(40, 20, 5, 6),
		slot: g.shapeSlot(30, 8, 12)
	};
	for (const [name, pts] of Object.entries(shapes)) {
		assert.ok(isClosed(pts), name + ' is closed');
		const b = bbox(pts);
		approx(b.minX, 0, 1e-9, name + ' minX');
		approx(b.minY, 0, 1e-9, name + ' minY');
	}
});

test('polygon: n corners (+1 closing point), all on the circumscribed circle', () => {
	const pts = g.shapePolygon(7, 12);
	assert.equal(pts.length, 8);
	const b = bbox(pts), cx = (b.minX + b.maxX) / 2;
	// centre of a regular polygon = centroid of its vertices
	const c = [pts.slice(0, 7).reduce((s, p) => s + p[0], 0) / 7, pts.slice(0, 7).reduce((s, p) => s + p[1], 0) / 7];
	pts.slice(0, 7).forEach((p) => approx(dist(p, c), 12, 1e-6, 'corner distance'));
	assert.ok(cx > 0);
});

test('polygon: equal side lengths and the known area formula', () => {
	const n = 6, R = 10;
	const pts = g.shapePolygon(n, R);
	const side = 2 * R * Math.sin(Math.PI / n);
	for (let i = 0; i < n; i++) approx(dist(pts[i], pts[i + 1]), side, 1e-6, 'side ' + i);
	approx(g.shapeArea(pts), 0.5 * n * R * R * Math.sin((2 * Math.PI) / n), 1e-6);
});

test('polygon: "inscribed" radius means distance to the side middle (hexagon across flats)', () => {
	const pts = g.shapePolygon(6, 10, true);                      // 20 mm across flats
	const b = bbox(pts);
	approx(b.maxX - b.minX, 20, 1e-6, 'width across flats is 2 x 10 (a corner points up)');
});

test('polygon: first corner points up (a triangle has its apex at the top)', () => {
	const pts = g.shapePolygon(3, 10);
	const b = bbox(pts);
	approx(pts[0][1], b.maxY, 1e-9);
});

test('polygon / star: invalid input throws', () => {
	assert.throws(() => g.shapePolygon(2, 10));
	assert.throws(() => g.shapePolygon(5, 0));
	assert.throws(() => g.shapeStar(5, 10, 10));
	assert.throws(() => g.shapeStar(2, 10, 4));
	assert.throws(() => g.shapeStar(5, 10, -1));
});

test('star: 2n vertices alternating between the two radii, area from the triangle fan', () => {
	const n = 5, R = 10, r = 4;
	const pts = g.shapeStar(n, R, r);
	assert.equal(pts.length, 2 * n + 1);
	// area = n * 2 * (1/2) * R * r * sin(pi/n)
	approx(g.shapeArea(pts), n * R * r * Math.sin(Math.PI / n), 1e-6);
});

test('ellipse: bounding box equals 2rx x 2ry and area is close to pi*rx*ry', () => {
	const pts = g.shapeEllipse(15, 8, 180);
	const b = bbox(pts);
	approx(b.maxX - b.minX, 30, 1e-6);
	approx(b.maxY - b.minY, 16, 1e-6);
	approx(g.shapeArea(pts), Math.PI * 15 * 8, Math.PI * 15 * 8 * 0.002);
});

test('rounded rectangle: bounding box is the requested size, area = w*h - (4-pi)r^2', () => {
	const w = 40, h = 20, r = 5;
	const pts = g.shapeRoundedRect(w, h, r, 64);
	const b = bbox(pts);
	approx(b.maxX, w, 1e-6);
	approx(b.maxY, h, 1e-6);
	approx(g.shapeArea(pts), w * h - (4 - Math.PI) * r * r, 0.05);
});

test('rounded rectangle: radius 0 is a plain rectangle; a too big radius throws', () => {
	const pts = g.shapeRoundedRect(30, 10, 0);
	assert.equal(pts.length, 5);
	approx(g.shapeArea(pts), 300, 1e-9);
	assert.throws(() => g.shapeRoundedRect(30, 10, 6));
	assert.throws(() => g.shapeRoundedRect(30, 10, -1));
});

test('slot: overall size length x width, area = (length-width)*width + pi*(width/2)^2', () => {
	const L = 30, W = 8;
	const pts = g.shapeSlot(L, W, 64);
	const b = bbox(pts);
	approx(b.maxX, L, 1e-6);
	approx(b.maxY, W, 1e-6);
	approx(g.shapeArea(pts), (L - W) * W + Math.PI * (W / 2) * (W / 2), 0.05);
	assert.throws(() => g.shapeSlot(5, 8));
});

test('shapeLinkedSize: locked keeps the aspect, unlocked changes one side only', () => {
	assert.deepEqual([...g.shapeLinkedSize('width', 60, 40, 20, 2, true)], [60, 30]);
	assert.deepEqual([...g.shapeLinkedSize('height', 10, 40, 20, 2, true)], [20, 10]);
	assert.deepEqual([...g.shapeLinkedSize('width', 60, 40, 20, 2, false)], [60, 20]);
	assert.deepEqual([...g.shapeLinkedSize('height', 33, 40, 20, 2, false)], [40, 33]);
});

test('shapeScaleByPercent: 150 % enlarges, 50 % halves, 0 or negative throws', () => {
	assert.deepEqual([...g.shapeScaleByPercent(40, 20, 150)], [60, 30]);
	assert.deepEqual([...g.shapeScaleByPercent(40, 20, 50)], [20, 10]);
	assert.throws(() => g.shapeScaleByPercent(40, 20, 0));
	assert.throws(() => g.shapeScaleByPercent(40, 20, -10));
});
