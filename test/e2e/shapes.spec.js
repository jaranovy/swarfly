'use strict';

// Playwright: the new Shapes menu entries (rounded rectangle, ellipse, polygon, star, slot) create real objects with the
// requested size, bad input creates nothing (red toast), and the Scale tab keeps proportions / scales by percent.

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	await page.goto('/index.html?reset3018');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /nový projekt|new project/i.test(b.textContent)).forEach((b) => b.click()));
	await page.waitForTimeout(500);
});

test.afterAll(async () => { await page.close(); });

// fills the dialog fields, clicks Create, returns the bounding box of the newest shape (or null when nothing was added)
async function create(buttonId, fields) {
	return page.evaluate(async ({ buttonId, fields }) => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const countBefore = objectsInScene.length;
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
		await sleep(600);
		if (objectsInScene.length <= countBefore) return null;        // every shape becomes its own group, like Rectangle
		const target = objectsInScene[objectsInScene.length - 1];
		const mesh = target.children[target.children.length - 1];
		const box = new THREE.Box3().setFromObject(mesh);
		return { name: mesh.name, w: box.max.x - box.min.x, h: box.max.y - box.min.y, verts: mesh.geometry.vertices.length };
	}, { buttonId, fields });
}

const near = (a, b, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('rounded rectangle has the requested size', async () => {
	const r = await create('CreateRoundRect', { rrW: 80, rrH: 40, rrR: 6 });
	expect(r.name).toBe('rounded rectangle');
	near(r.w, 80); near(r.h, 40);
});

test('ellipse has the requested size', async () => {
	const r = await create('CreateEllipse', { elRX: 25, elRY: 10, elSeg: 72 });
	near(r.w, 50); near(r.h, 20);
	expect(r.verts).toBe(73);
});

test('polygon: hexagon with radius 20 has 6 corners', async () => {
	const r = await create('CreatePolygon', { pgN: 6, pgR: 20 });
	expect(r.verts).toBe(7);
	near(r.h, 40);                       // a corner points up and down
});

test('star: 5 points = 10 corners', async () => {
	const r = await create('CreateStar', { stN: 5, stR: 25, str: 10 });
	expect(r.verts).toBe(11);
});

test('slot has the requested overall size', async () => {
	const r = await create('CreateSlot', { slL: 60, slW: 12 });
	near(r.w, 60); near(r.h, 12);
});

test('bad input (inner radius bigger than outer) creates nothing', async () => {
	const r = await create('CreateStar', { stN: 5, stR: 10, str: 20 });
	expect(r).toBeNull();
});

test('scale tab keeps proportions, can be unlocked, and scales by percent', async () => {
	const res = await page.evaluate(async () => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const slot = objectsInScene.map((o) => o.children.find((c) => c.name === 'slot')).find(Boolean);   // 60 x 12, aspect 5
		showScaleWindow(slot);
		await sleep(400);
		const set = (id, v, ev) => { const el = document.getElementById(id); el.value = v; $(el).trigger(ev); };
		const read = (id) => parseFloat(document.getElementById(id).value);
		const out = {};
		set('scaleWidth', 120, 'keyup'); out.lockedH = read('scaleHeight'); out.lockedPct = read('scalePercent');
		document.getElementById('scaleKeepAspect').checked = false;
		set('scaleWidth', 90, 'keyup'); out.freeH = read('scaleHeight');
		document.getElementById('scaleKeepAspect').checked = true;
		set('scalePercent', 50, 'input'); out.pctW = read('scaleWidth'); out.pctH = read('scaleHeight');
		return out;
	});
	near(res.lockedH, 24, 0.01);
	near(res.lockedPct, 200, 0.01);
	near(res.freeH, 24, 0.01);            // height untouched while unlocked
	near(res.pctW, 30, 0.01);
	near(res.pctH, 6, 0.01);
});
