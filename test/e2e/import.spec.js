'use strict';
// Playwright, release 1.8.3: what the importers do with typical files (DXF units, circles without a Z value, text warnings, SVG units, bitmap trace).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const dxf = (units, body) => ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', String(units), '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', body, '0', 'ENDSEC', '0', 'EOF'].join('\n');
const lw = (pts, closed) => ['0', 'LWPOLYLINE', '8', '0', '90', String(pts.length), '70', closed ? '1' : '0'].concat(...pts.map((p) => ['10', String(p[0]), '20', String(p[1])])).join('\n');

const CASES = {
	'rect-mm.dxf': dxf(4, lw([[0, 0], [100, 0], [100, 50], [0, 50]], true)),
	'rect-inch.dxf': dxf(1, lw([[0, 0], [4, 0], [4, 2], [0, 2]], true)),
	'circle.dxf': dxf(4, ['0', 'CIRCLE', '8', '0', '10', '50', '20', '25', '40', '10'].join('\n')),
	'arc.dxf': dxf(4, ['0', 'ARC', '8', '0', '10', '0', '20', '0', '40', '10', '50', '0', '51', '90'].join('\n')),
	'line.dxf': dxf(4, ['0', 'LINE', '8', '0', '10', '0', '20', '0', '11', '30', '21', '40'].join('\n')),
	'ellipse.dxf': dxf(4, ['0', 'ELLIPSE', '8', '0', '10', '0', '20', '0', '11', '20', '21', '0', '40', '0.5', '41', '0', '42', '6.283185307'].join('\n')),
	'spline.dxf': dxf(4, ['0', 'SPLINE', '8', '0', '70', '8', '71', '3', '72', '8', '73', '4', '40', '0', '40', '0', '40', '0', '40', '0', '40', '1', '40', '1', '40', '1', '40', '1', '10', '0', '20', '0', '10', '10', '20', '20', '10', '20', '20', '20', '10', '30', '20', '0'].join('\n')),
	'text.dxf': dxf(4, ['0', 'TEXT', '8', '0', '10', '0', '20', '0', '40', '5', '1', 'HELLO'].join('\n'))
};

const SVGS = {
	'rect-mm.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="50mm" viewBox="0 0 100 50"><rect x="0" y="0" width="100" height="50" fill="none" stroke="#000"/></svg>',
	'rect-px.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect x="0" y="0" width="400" height="200" fill="none" stroke="#000"/></svg>',
	'rect-noattr.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect x="0" y="0" width="100" height="50" fill="none" stroke="#000"/></svg>',
	'arc.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="#000"/></svg>',
	'bezier.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100"><path d="M10 90 C10 10 90 10 90 90" fill="none" stroke="#000"/></svg>',
	'transform.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="200mm" viewBox="0 0 200 200"><g transform="translate(50 50) rotate(90)"><rect x="0" y="0" width="60" height="20" fill="none" stroke="#000"/></g></svg>',
	'shapes.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="100mm" viewBox="0 0 200 100"><circle cx="30" cy="30" r="20" fill="none" stroke="#000"/><ellipse cx="100" cy="30" rx="30" ry="15" fill="none" stroke="#000"/><polygon points="150,10 190,10 170,50" fill="none" stroke="#000"/><line x1="0" y1="90" x2="200" y2="90" stroke="#000"/><polyline points="10,60 30,80 50,60" fill="none" stroke="#000"/></svg>',
	'text.svg': '<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="50mm" viewBox="0 0 100 50"><text x="5" y="30" font-size="12">Hello</text></svg>'
};

async function load(page, name, text) {
	await page.evaluate(() => { parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); window.__toasts = []; const orig = Metro.toast.create; Metro.toast.create = function (m) { window.__toasts.push(String(m)); return orig.apply(this, arguments); }; });
	await page.evaluate(([n, t]) => loadFile(new File([t], n)), [name, text]);
	await page.waitForTimeout(1000);
	return page.evaluate(() => {
		const out = { objects: objectsInScene.length, lines: 0, closed: 0, toasts: window.__toasts };
		let box = null;
		objectsInScene.forEach((o) => { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); box = box ? box.union(b) : b; o.traverse((c) => { if (c.type === 'Line') { out.lines++; const v = c.geometry.vertices; if (v.length > 3 && v[0].distanceTo(v[v.length - 1]) < 1e-6) out.closed++; } }); });
		out.size = box && !box.isEmpty() ? [Math.round((box.max.x - box.min.x) * 100) / 100, Math.round((box.max.y - box.min.y) * 100) / 100] : null;
		return out;
	});
}

const near = (a, b, tol = 0.05) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('importers: sizes, units, closed outlines and warnings', async ({ page }) => {
	test.setTimeout(120000);
	const errs = [];
	page.on('pageerror', (e) => errs.push(e.message));
	await page.goto('/index.html?reset3018&en');
	await page.waitForTimeout(2500);
	const all = Object.assign({}, CASES, SVGS);
	const r = {};
	for (const n of Object.keys(all)) r[n] = await load(page, n, all[n]);

	// DXF
	expect(r['rect-mm.dxf'].size).toEqual([100, 50]); expect(r['rect-mm.dxf'].closed).toBe(1);
	expect(r['rect-inch.dxf'].size).toEqual([101.6, 50.8]);                    // $INSUNITS 1 = inches, scaled to mm
	expect(r['rect-inch.dxf'].toasts.join(' ')).toContain('inches');
	near(r['circle.dxf'].size[0], 20); near(r['circle.dxf'].size[1], 20);      // a CIRCLE without group 30 used to give NaN
	near(r['arc.dxf'].size[0], 10); near(r['arc.dxf'].size[1], 10);
	expect(r['line.dxf'].size).toEqual([30, 40]);
	near(r['ellipse.dxf'].size[0], 40, 0.1); expect(r['ellipse.dxf'].closed).toBe(1);
	expect(r['spline.dxf'].size[0]).toBeGreaterThan(19);
	expect(r['text.dxf'].toasts.join(' ')).toContain('text');                  // text cannot be cut: the user is told

	// SVG
	expect(r['rect-mm.svg'].size).toEqual([100, 50]);
	near(r['rect-px.svg'].size[0], 105.83); near(r['rect-px.svg'].size[1], 52.92);      // plain px = CSS pixels at 96 dpi
	near(r['arc.svg'].size[0], 80); near(r['arc.svg'].size[1], 40);
	near(r['bezier.svg'].size[0], 80); near(r['bezier.svg'].size[1], 60);
	near(r['transform.svg'].size[0], 20); near(r['transform.svg'].size[1], 60);          // rotated by 90 degrees
	expect(r['shapes.svg'].lines).toBe(5); expect(r['shapes.svg'].closed).toBe(3);
	expect(r['text.svg'].toasts.join(' ')).toContain('text');

	// a few real parts from the OpenBuilds library, when it is checked out next to the fork
	const dir = path.join(__dirname, '..', '..', '..', 'OpenBuilds-CAM', 'partslib', 'DXF');
	if (fs.existsSync(dir)) {
		const pick = ['ENGINEERING/Fan Grill  80mm - Concentric.dxf', 'ENGINEERING/Motor NEMA17 - Mount.dxf', 'ANIMALS/BUTTERFLY.dxf'];
		for (const rel of pick) {
			const f = path.join(dir, rel);
			if (!fs.existsSync(f)) continue;
			const res = await load(page, path.basename(f), fs.readFileSync(f, 'utf8'));
			expect(res.lines, rel).toBeGreaterThan(0);
			expect(res.size && res.size.every((v) => v > 1 && isFinite(v)), rel).toBe(true);
		}
	}

	// bitmap: 200x100 px black rectangle with a round hole -> two outlines (outer + hole), 160x80 px at 96 dpi
	const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 100; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 100); x.fillStyle = '#000'; x.fillRect(20, 10, 160, 80); x.fillStyle = '#fff'; x.beginPath(); x.arc(100, 50, 20, 0, 7); x.fill(); return c.toDataURL('image/png'); });
	await page.evaluate(() => { parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); });
	await page.evaluate(async (u) => { const b = await (await fetch(u)).blob(); loadFile(new File([b], 'bitmap.png', { type: 'image/png' })); }, png);
	await page.waitForSelector('#traceBox');                       // 1.10.0: the trace dialog opens first
	await page.waitForTimeout(600);
	await page.evaluate(() => [...document.querySelectorAll('.dialog button')].filter((b) => /Import|Importovat/.test(b.textContent))[0].click());
	await page.waitForTimeout(2500);
	const bm = await page.evaluate(() => { const o = { lines: 0 }; let box = null; objectsInScene.forEach((ob) => { ob.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(ob); box = box ? box.union(b) : b; ob.traverse((c) => { if (c.type === 'Line') o.lines++; }); }); o.w = box.max.x - box.min.x; o.h = box.max.y - box.min.y; return o; });
	expect(bm.lines).toBe(2);
	near(bm.w, 42.33, 0.1); near(bm.h, 21.17, 0.1);

	expect(errs).toEqual([]);
});
