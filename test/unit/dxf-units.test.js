'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// js/dxf-render.js only declares functions at load time, so it can run without THREE for the pure helpers
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'dxf-render.js'), 'utf8'), ctx);

test('DXF $INSUNITS gives millimetres per unit', () => {
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 4 }), 1);
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 1 }), 25.4);
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 5 }), 10);
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 6 }), 1000);
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 0 }), 1);          // unitless: leave as it is
	assert.equal(ctx.dxfUnitScale({ '$INSUNITS': 99 }), 1);         // unknown code
	assert.equal(ctx.dxfUnitScale({}), 1);
	assert.equal(ctx.dxfUnitScale(undefined), 1);
	assert.equal(ctx.dxfUnitName({ '$INSUNITS': 1 }), 'inches');
});
