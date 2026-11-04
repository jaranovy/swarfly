'use strict';

// Unit tests for the 3018 fork additions: js/gcode-validate.js (parser + validator),
// js/gcode-stats.js (path / material statistics, nc83Name) and cardStyleGcode() in js/advanced-cam-gcode.js.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers/load-browser-script');
const approx = require('./helpers/approx');

const v = loadBrowserScript('js/gcode-validate.js');
const validate = v.validateGcode;

const stubs = {
	window: {},
	document: { getElementById: () => null },
	localStorage: { getItem: () => null, setItem: () => {} },
	toolpathsInScene: []
};
const statsCtx = loadBrowserScript('js/gcode-stats.js', stubs);
const gcodeCtx = loadBrowserScript('js/advanced-cam-gcode.js', { window: {} });

function codes(result) {
	return [...result.errors.map((e) => e.code)];   // plain array of this realm (vm arrays are not deepEqual)
}

const GOOD_MILL = [
	'G21', 'G90', 'M3 S10000', 'G0 Z3', 'G0 F1000 X10 Y10', 'G0 Z0', 'G1 F200 Z-0.5',
	'G1 F500 X20 Y10 Z-0.5 S10000', 'G1 F500 X20 Y20 Z-0.5 S10000', 'G0 Z3', 'M5', 'M2'
].join('\r\n');

const GOOD_LASER = [
	'G21', 'G90', 'G0 F1000 X5 Y5', 'M3 S500', 'G1 F500 X15 Y5 S500', 'G1 F500 X15 Y15 S500', 'M5', 'M2'
].join('\r\n');

// ---------------------------------------------------------------------------------------------
// validator: accepted programs
// ---------------------------------------------------------------------------------------------

test('validate: a good milling program passes without errors', () => {
	const r = validate(GOOD_MILL);
	assert.deepEqual(codes(r), []);
	assert.equal(r.ok, true);
	assert.equal(r.stats.mode, 'mill');
	assert.equal(r.stats.minZ, -0.5);
});

test('validate: a good laser program passes and is detected as laser', () => {
	const r = validate(GOOD_LASER);
	assert.deepEqual(codes(r), []);
	assert.equal(r.stats.mode, 'laser');
});

test('validate: comments, blank lines and LF line ends are fine', () => {
	const r = validate('; header\nG21 (mm)\nG90\n\nM3 S1000\nG1 F100 X1 Y1 Z-1 ; cut\nM5\nM2\n');
	assert.deepEqual(codes(r), []);
});

// ---------------------------------------------------------------------------------------------
// validator: the bugs we actually had
// ---------------------------------------------------------------------------------------------

test('validate: several moves glued on one line are an error (laser / plasma / drag knife bug)', () => {
	const glued = GOOD_MILL.replace('G1 F500 X20 Y10 Z-0.5 S10000', 'G1 F500 X20 Y10 Z-0.5G1 F500 X30 Y10 Z-0.5');
	const r = validate(glued);
	assert.ok(codes(r).includes('MULTI_COMMAND'), codes(r).join());
});

test('validate: undefined / NaN in the output is an error', () => {
	assert.ok(codes(validate(GOOD_MILL.replace('X20', 'XNaN'))).includes('BAD_VALUE'));
	assert.ok(codes(validate(GOOD_MILL.replace('F200', 'Fundefined'))).includes('BAD_VALUE'));
});

test('validate: a rapid XY move inside the material is an error', () => {
	const r = validate(GOOD_MILL.replace('G0 Z3\r\nM5', 'G0 X50 Y50\r\nG0 Z3\r\nM5'));
	assert.ok(codes(r).includes('RAPID_IN_MATERIAL'), codes(r).join());
});

test('validate: cutting below Z0 with the spindle off is an error', () => {
	const r = validate(GOOD_MILL.replace('M3 S10000\r\n', ''));
	assert.ok(codes(r).includes('SPINDLE_OFF'));
});

test('validate: Z moves in a laser program are an error', () => {
	const r = validate(GOOD_LASER.replace('G1 F500 X15 Y15 S500', 'G1 F500 X15 Y15 Z-0.1 S500'), { mode: 'laser' });
	assert.ok(codes(r).includes('LASER_Z'));
});

test('validate: laser cutting move with the laser off is an error', () => {
	const r = validate(GOOD_LASER.replace('M3 S500\r\n', ''));
	assert.ok(codes(r).includes('LASER_OFF'));
});

test('validate: G1 before any feedrate is an error', () => {
	const r = validate('G21\nG90\nM3 S1000\nG1 X1 Y1 Z-1\nM5\nM2');
	assert.ok(codes(r).includes('NO_FEED'));
});

test('validate: motion before G21 / G90 is an error', () => {
	const r = validate('G0 X1 Y1\nM5\nM2');
	assert.ok(codes(r).includes('NO_UNITS'));
	assert.ok(codes(r).includes('NO_ABSOLUTE'));
});

test('validate: G20 inches, G91 relative and unknown codes are errors', () => {
	assert.ok(codes(validate('G20\nG90\nG0 X1')).includes('INCHES'));
	assert.ok(codes(validate('G21\nG91\nG0 X1')).includes('RELATIVE'));
	assert.ok(codes(validate('G21\nG90\nG43 Z1')).includes('UNKNOWN_G'));
	assert.ok(codes(validate('G21\nG90\nM6\nG0 X1')).includes('UNKNOWN_M'));
});

test('validate: machine limits (X/Y and Z) are enforced when given', () => {
	const r = validate(GOOD_MILL, { maxX: 15, maxY: 175, minZ: -0.3 });
	assert.ok(codes(r).includes('BOUNDS'));
	assert.ok(codes(r).includes('BOUNDS_Z'));
});

test('validate: S above the allowed maximum is an error', () => {
	assert.ok(codes(validate(GOOD_LASER, { maxS: 400 })).includes('S_RANGE'));
});

test('validate: negative coordinates and a missing M5 / M2 are only warnings', () => {
	const r = validate('G21\nG90\nG0 X-1 Y2\nG0 Z3');
	assert.equal(r.ok, true);
	const w = r.warnings.map((x) => x.code);
	assert.ok(w.includes('NEGATIVE_XY') && w.includes('NO_M5') && w.includes('NO_END'), w.join());
});

test('validate: an empty program is an error', () => {
	assert.ok(codes(validate('')).includes('NO_MOVES'));
});

test('validate: stats count path length', () => {
	const r = validate(GOOD_LASER);
	approx(r.stats.cutLen, 20, 1e-9);        // 10 mm + 10 mm
	approx(r.stats.rapidLen, Math.hypot(5, 5), 1e-9);
});

// ---------------------------------------------------------------------------------------------
// statistics
// ---------------------------------------------------------------------------------------------

test('stats: parse separates cutting and rapid length', () => {
	const p = statsCtx.window.gcodeStatsParse(GOOD_MILL);
	approx(p.cutLen, 0.5 + 10 + 10, 1e-9);
});

test('stats: removed area / volume of one straight pass (stadium shape)', () => {
	const segs = [[0, 0, 10, 0, -1]];
	const r = statsCtx.window.gcodeStatsRemoved(segs, 2);
	const stadium = 10 * 2 + Math.PI;           // length * dia + circle
	approx(r.area, stadium, stadium * 0.05, 'area');
	approx(r.volume, stadium * 1, stadium * 0.05, 'volume (1 mm deep)');
});

test('stats: stepwise passes over the same line are not counted twice', () => {
	const segs = [[0, 0, 10, 0, -0.5], [0, 0, 10, 0, -1], [0, 0, 10, 0, -1.5]];
	const r = statsCtx.window.gcodeStatsRemoved(segs, 2);
	const stadium = 10 * 2 + Math.PI;
	approx(r.area, stadium, stadium * 0.05, 'footprint counted once');
	approx(r.volume, stadium * 1.5, stadium * 1.5 * 0.05, 'volume = footprint x 1.5 mm');
	approx(r.depth, 1.5, 1e-9);
});

test('stats: overlapping neighbour passes (pocket stepover) are counted once', () => {
	const segs = [[0, 0, 10, 0, -1], [0, 1, 10, 1, -1]];          // 1 mm apart, 2 mm tool => 50 % overlap
	const r = statsCtx.window.gcodeStatsRemoved(segs, 2);
	const expected = 10 * 3 + Math.PI + 2;                          // 3 mm wide band + two ends (union of two discs, 1 mm apart)
	approx(r.area, expected, expected * 0.05);
});

test('stats: no segments (laser, pen) removes nothing', () => {
	const r = statsCtx.window.gcodeStatsRemoved([], 3);
	assert.equal(r.volume, 0);
});

test('nc83Name: lower case, ASCII, max 8 characters, .nc', () => {
	const f = statsCtx.nc83Name;
	assert.equal(f('plan_001.svg'), 'plan_001.nc');
	assert.equal(f('Můj dlouhý výkres č.2.svg'), 'muj_dlou.nc');
	assert.equal(f(undefined), 'program.nc');
	assert.equal(f('a b.dxf'), 'a_b.nc');
});

// ---------------------------------------------------------------------------------------------
// card style output
// ---------------------------------------------------------------------------------------------

test('cardStyleGcode: strips comments, G4 P8, duplicate G21 and blank lines; CRLF; reports negative extent', () => {
	const src = '; GCODE Generated\nG21 ; mm-mode\n; Created\nG21; mm-mode\nG90; Absolute\n\nM3 S10000; Start\nG4 P8; Wait\nG0 X-1.5 Y2\nM5 S0; off\n';
	const out = gcodeCtx.cardStyleGcode(src);
	assert.equal(out, 'G21\r\nG90\r\nM3 S10000\r\nG0 X-1.5 Y2\r\nM5 S0\r\n');
	assert.equal(gcodeCtx.window.gcodeNegativeExtent.x, -1.5);
	assert.equal(gcodeCtx.window.gcodeNegativeExtent.y, 0);
});
