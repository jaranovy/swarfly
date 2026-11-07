'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/view-model.js');

test('viewGesture: Shift or Alt rotates, Ctrl+Shift zooms, plain and Ctrl-only drags stay selection', () => {
	assert.equal(m.viewGesture(null, false, false, false), null);
	assert.equal(m.viewGesture(null, false, false, true), null);
	assert.equal(m.viewGesture(null, true, false, false), 'orbit');
	assert.equal(m.viewGesture(null, false, true, false), 'orbit');
	assert.equal(m.viewGesture(null, true, false, true), 'zoom');
});

test('viewGesture: the toggled tools win over plain drags', () => {
	assert.equal(m.viewGesture('orbit', false, false, false), 'orbit');
	assert.equal(m.viewGesture('window', false, false, false), 'window');
	assert.equal(m.viewGesture('window', true, false, false), 'window');
});

test('step and drag factors zoom the right way', () => {
	assert.ok(m.viewStepFactor(true) < 1 && m.viewStepFactor(false) > 1);
	assert.ok(Math.abs(m.viewStepFactor(true) * m.viewStepFactor(false) - 1) < 1e-12);
	assert.ok(m.viewDragFactor(40) > 1 && m.viewDragFactor(-40) < 1);
	assert.equal(m.viewDragFactor(0), 1);
	assert.equal(m.viewDragFactor(100000), m.viewDragFactor(300));
});

test('viewWindowPlan: centre and fill factor; a click is no window', () => {
	const p = m.viewWindowPlan({ x0: 100, y0: 50, x1: 300, y1: 150 }, 1000, 500);
	assert.equal(p.cx, 0.2);
	assert.equal(p.cy, 0.2);
	assert.equal(p.factor, 0.2);
	const q = m.viewWindowPlan({ x0: 300, y0: 150, x1: 100, y1: 50 }, 1000, 500);   // dragged backwards
	assert.equal(q.factor, 0.2);
	assert.equal(m.viewWindowPlan({ x0: 10, y0: 10, x1: 12, y1: 12 }, 1000, 500), null);
});

test('viewIsTilted: false from straight above, true once the camera leans', () => {
	assert.equal(m.viewIsTilted(0, 0, 300), false);
	assert.equal(m.viewIsTilted(2, 3, 300), false);     // under 3 degrees
	assert.equal(m.viewIsTilted(0, -40, 300), true);    // about 7.6 degrees
	assert.equal(m.viewIsTilted(0, -300, 10), true);    // from the front
	assert.equal(m.viewIsTilted(0, 0, 0), false);
});
