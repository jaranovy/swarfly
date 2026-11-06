'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');

const m = loadBrowserScript('js/tool-split-model.js');
const plain = (x) => JSON.parse(JSON.stringify(x));

test('toolOf: cutters differ by diameter, a laser is one tool', () => {
	assert.equal(m.toolOf('Drill: Peck (Centered)', '3').key, 'drill:3');
	assert.equal(m.toolOf('CNC: Pocket', '3.175').label, 'Mill 3.175 mm');
	assert.equal(m.toolOf('CNC: Vector (path outside)', 3.1750001).key, 'mill:3.175');
	assert.equal(m.toolOf('Laser: Vector (path inside)', 0.1).key, 'laser');
	assert.equal(m.toolOf('Laser: Vector (path inside)', 0.1).label, 'Laser');
	assert.equal(m.toolOf('Something', '').key, 'other');
});

test('toolGroups: order of first appearance, toolpaths of one tool stay together', () => {
	const g = plain(m.toolGroups([
		{ index: 0, operation: 'Drill: Peck (Centered)', toolDia: '3' },
		{ index: 1, operation: 'CNC: Pocket', toolDia: '3.175' },
		{ index: 2, operation: 'Drill: Continuous (Centered)', toolDia: '3' },
		{ index: 3, operation: 'CNC: Vector (path outside)', toolDia: '3.175' },
		{ index: 4, operation: 'CNC: Vector (path outside)', toolDia: '1' }
	]));
	assert.deepEqual(g.map((x) => x.key), ['drill:3', 'mill:3.175', 'mill:1']);
	assert.deepEqual(g[0].indexes, [0, 2]);
	assert.deepEqual(g[1].indexes, [1, 3]);
});

test('toolFileNames: 8.3 style, numbered, tool letter', () => {
	const groups = m.toolGroups([{ index: 0, operation: 'Drill: Peck (Centered)', toolDia: '3' }, { index: 1, operation: 'CNC: Pocket', toolDia: '3' }]);
	assert.deepEqual(plain(m.toolFileNames('Plata č. 7.nc', groups)), ['plat_01d.nc', 'plat_02m.nc']);
	assert.deepEqual(plain(m.toolFileNames('', groups)), ['prog_01d.nc', 'prog_02m.nc']);
	assert.ok(m.toolFileNames('abcdefghij', groups).every((n) => n.length <= 12));
});
