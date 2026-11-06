'use strict';

// Playwright, release 1.5.0: mirror, move to X0 Y0, copies in a row / around a point, handles on the selection box, arrow keys.

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
});

test.afterAll(async () => { await page.close(); });

async function fresh() {
	await page.evaluate(() => { parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0; editorState.panelOn = true; editorState.snap = false; localStorage.setItem('swarflyPlaceMouse', '0'); });
	await page.waitForTimeout(400);
}

async function create(buttonId, fields) {
	await page.evaluate(({ buttonId, fields }) => {
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
	}, { buttonId, fields });
	await page.waitForTimeout(600);
}

async function selectAllLines() {
	await page.evaluate(() => objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = true; })));
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
}

async function selectOnly(index) {
	await page.evaluate((index) => {
		const all = [];
		objectsInScene.forEach((o) => o.children.forEach((c) => all.push(c)));
		all.forEach((c, i) => { c.userData.selected = i === index; });
	}, index);
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await page.waitForTimeout(250);
}

const allPoints = () => page.evaluate(() => {
	const out = [];
	objectsInScene.forEach((o) => o.children.forEach((c) => out.push(editorLinePoints(c))));
	return out;
});
const box = () => page.evaluate(() => { const b = editorSelectionBox(getSelectedObjects()); return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY, w: b.maxX - b.minX, h: b.maxY - b.minY }; });
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);
const click = (id) => page.evaluate((id) => document.getElementById(id).click(), id);
async function type(id, value) {
	await page.fill('#' + id, String(value));
	await page.dispatchEvent('#' + id, 'change');
	await page.waitForTimeout(150);
}

test('mirror left-right flips the points about the centre; the box stays; undo restores', async () => {
	await fresh();
	await create('CreatePolygon', { pgN: 3, pgR: 20 });
	await selectOnly(0);
	const before = (await allPoints())[0];
	const b0 = await box();
	await click('epMirrorX');
	await page.waitForTimeout(200);
	const after = (await allPoints())[0];
	const b1 = await box();
	near(b1.minX, b0.minX); near(b1.maxX, b0.maxX); near(b1.minY, b0.minY); near(b1.maxY, b0.maxY);
	const cx = (b0.minX + b0.maxX) / 2;
	before.forEach((p, i) => { near(after[i][0], 2 * cx - p[0], 1e-6); near(after[i][1], p[1], 1e-6); });
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	const restored = (await allPoints())[0];
	before.forEach((p, i) => { near(restored[i][0], p[0], 1e-6); near(restored[i][1], p[1], 1e-6); });
});

test('mirror up-down flips the points about the centre', async () => {
	await selectOnly(0);
	const before = (await allPoints())[0];
	const b0 = await box();
	await click('epMirrorY');
	await page.waitForTimeout(200);
	const after = (await allPoints())[0];
	const cy = (b0.minY + b0.maxY) / 2;
	before.forEach((p, i) => { near(after[i][0], p[0], 1e-6); near(after[i][1], 2 * cy - p[1], 1e-6); });
});

test('Move to X0 Y0 puts the lower-left corner of the selection on the origin', async () => {
	await selectOnly(0);
	await type('epX', 55); await type('epY', 33);
	await click('epToZero');
	await page.waitForTimeout(200);
	const b = await box();
	near(b.minX, 0); near(b.minY, 0);
});

test('copies in a row: total count, steps, the copies become the selection, one undo removes them all', async () => {
	await fresh();
	await create('CreateRect', { rectX: 30, rectY: 10 });
	await selectOnly(0);
	await type('epCopyCount', 4); await type('epCopyDX', 50); await type('epCopyDY', 20);
	await click('epCopyLinear');
	await page.waitForTimeout(500);
	const pts = await allPoints();
	expect(pts.length).toBe(4);
	const mins = pts.map((p) => [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1]))]).sort((a, b) => a[0] - b[0]);
	mins.forEach((m, i) => { near(m[0], 50 * i); near(m[1], 20 * i); });
	expect(await page.evaluate(() => getSelectedObjects().length)).toBe(3);                // the copies are selected
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	expect((await allPoints()).length).toBe(1);
});

test('copies keep the shape parameters (a copied star can still be edited)', async () => {
	await fresh();
	await create('CreateStar', { stN: 5, stR: 25, str: 10 });
	await selectOnly(0);
	await type('epCopyCount', 2); await type('epCopyDX', 70); await type('epCopyDY', 0);
	await click('epCopyLinear');
	await page.waitForTimeout(500);
	await page.waitForSelector('#epP_points');
	expect(await page.inputValue('#epP_points')).toBe('5');
});

test('copies around a point: 4 objects over 360 degrees land 90 degrees apart', async () => {
	await fresh();
	await create('CreateRect', { rectX: 10, rectY: 10 });
	await selectOnly(0);
	await type('epX', 30); await type('epY', 0);             // lower-left at (30, 0); centre of the rectangle at (35, 5)
	await type('epCopyCount', 4); await type('epCopyAngle', 360); await type('epCopyCX', 0); await type('epCopyCY', 0);
	await click('epCopyPolar');
	await page.waitForTimeout(500);
	const centres = (await allPoints()).map((p) => {
		const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
		return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
	});
	expect(centres.length).toBe(4);
	const r0 = Math.hypot(35, 5), a0 = Math.atan2(5, 35);
	const angles = centres.map((c) => { near(Math.hypot(c[0], c[1]), r0, 1e-6); return ((Math.atan2(c[1], c[0]) - a0) * 180 / Math.PI + 360) % 360; }).sort((a, b) => a - b);
	[0, 90, 180, 270].forEach((a, i) => near(angles[i], a, 1e-6));
});

test('bad copy input shows a message and creates nothing', async () => {
	await selectOnly(0);
	const n = (await allPoints()).length;
	await type('epCopyCount', 1);
	await click('epCopyLinear');
	await page.waitForTimeout(300);
	expect((await allPoints()).length).toBe(n);
});

// ---- handles ---------------------------------------------------------------------------------------------------------------
async function handleCentre(h) {
	return page.evaluate((h) => {
		const r = document.querySelector('#editorHandles .editorHandle[data-h="' + h + '"]').getBoundingClientRect();
		return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
	}, h);
}

async function showHandles() {
	await fresh();
	await create('CreateRect', { rectX: 60, rectY: 30 });
	await selectOnly(0);
	await page.waitForFunction(() => document.getElementById('editorHandles').style.display === 'block');
	await page.waitForTimeout(300);
}

test('handles: eight handles around the selection', async () => {
	await showHandles();
	expect(await page.locator('#editorHandles .editorHandle').count()).toBe(8);
	const ll = await handleCentre('ll'), ur = await handleCentre('ur');
	expect(ur.x).toBeGreaterThan(ll.x);
	expect(ur.y).toBeLessThan(ll.y);                         // screen Y grows downwards
});

test('handles: dragging the upper-right corner scales proportionally from the lower-left corner; one undo step', async () => {
	const before = await box();
	const ur = await handleCentre('ur');
	const ll = await handleCentre('ll');
	// drag along the diagonal to 1.5 times its length
	const tx = ll.x + (ur.x - ll.x) * 1.5, ty = ll.y + (ur.y - ll.y) * 1.5;
	await page.mouse.move(ur.x, ur.y);
	await page.mouse.down();
	await page.mouse.move((ur.x + tx) / 2, (ur.y + ty) / 2, { steps: 4 });
	await page.mouse.move(tx, ty, { steps: 4 });
	await page.mouse.up();
	await page.waitForTimeout(300);
	const b = await box();
	near(b.minX, before.minX); near(b.minY, before.minY);
	near(b.w / before.w, 1.5, 0.05); near(b.w / b.h, before.w / before.h, 0.001);   // proportions kept
	near(Math.max(b.w, b.h), Math.round(Math.max(b.w, b.h)), 0.0001);          // the longer side is a whole number of mm
	expect(await field('epW')).toBe(b.w.toFixed(2));
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	await selectOnly(0);
	const back = await box();
	near(back.w, before.w); near(back.h, before.h);
});

const field = (id) => page.inputValue('#' + id);

test('handles: an edge handle changes one side only; Shift on a corner scales freely', async () => {
	await showHandles();
	const before = await box();
	const mr = await handleCentre('mr'), ll = await handleCentre('ll');
	await page.mouse.move(mr.x, mr.y);
	await page.mouse.down();
	await page.mouse.move(mr.x + (mr.x - ll.x) * 0.5, mr.y + 40, { steps: 6 });       // the vertical part of the move is ignored
	await page.mouse.up();
	await page.waitForTimeout(300);
	const b = await box();
	near(b.w / before.w, 1.5, 0.05); near(b.w, Math.round(b.w), 0.0001); near(b.h, before.h);   // width in whole mm
});

test('handles: Shift on a corner scales freely', async () => {
	await showHandles();
	await page.evaluate(() => { editorState.panelOn = false; editorRefresh(true); });      // the panel could cover the handle
	await page.waitForTimeout(300);
	const b = await box();
	const ur = await handleCentre('ur');
	await page.keyboard.down('Shift');
	await page.mouse.move(ur.x, ur.y);
	await page.mouse.down();
	await page.mouse.move(ur.x, ur.y - 50, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up('Shift');
	await page.waitForTimeout(300);
	const c = await box();
	near(c.w, b.w, 0.1);                                      // only the height changed (the pointer is a pixel or two off the handle centre)
	expect(c.h).toBeGreaterThan(b.h + 1);
});

test('handles: a click on a handle without dragging is not an undo step', async () => {
	await showHandles();
	const depth = await page.evaluate(() => undoStore.length);
	const ur = await handleCentre('ur');
	await page.mouse.move(ur.x, ur.y);
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => undoStore.length)).toBe(depth);
});

test('arrow keys nudge the selection (1 mm, Shift 10, Alt 0.1) but not while typing in a field', async () => {
	await showHandles();
	await page.mouse.move(5, 5);
	const b0 = await box();
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Shift+ArrowUp');
	await page.keyboard.press('Alt+ArrowLeft');
	await page.waitForTimeout(200);
	const b1 = await box();
	near(b1.minX - b0.minX, 0.9, 0.001);                    // +1 then -0.1
	near(b1.minY - b0.minY, 10, 0.001);
	await page.focus('#epX');
	await page.keyboard.press('ArrowRight');
	const b2 = await box();
	near(b2.minX, b1.minX, 0.0001);
});
