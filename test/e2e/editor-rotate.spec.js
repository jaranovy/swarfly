'use strict';

// Playwright, release 1.7.0: resizing with the handles in whole millimetres; second click switches to rotate handles (whole degrees, magnet at 15).

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;
let topY = 20;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
});

test.afterAll(async () => { await page.close(); });

async function setup(w, h) {
	topY = h;
	await page.evaluate(({ w, h }) => {
		parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0;
		editorState.panelOn = false; editorState.snap = false; editorState.rotate = false;
		localStorage.setItem('swarflyPlaceMouse', '0');
		mouseSelectMode();
		document.getElementById('rectX').value = w; document.getElementById('rectY').value = h; document.getElementById('CreateRect').click();
	}, { w, h });
	await page.waitForTimeout(800);
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })); resetView(); });
	await page.waitForTimeout(600);
}

const toClient = (x, y) => page.evaluate(([x, y]) => {
	const s = editorToScreen(x, y), r = document.getElementById('renderArea').getBoundingClientRect();
	return { x: r.left + s[0], y: r.top + s[1] };
}, [x, y]);

const handleCentre = (h) => page.evaluate((h) => {
	const r = document.querySelector('#editorHandles .editorHandle[data-h="' + h + '"]').getBoundingClientRect();
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, h);

const box = () => page.evaluate(() => { const b = editorSelectionBox(editorSelection()); return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY, w: b.maxX - b.minX, h: b.maxY - b.minY }; });
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);
const rotating = () => page.evaluate(() => !!editorState.rotate);

async function dragTo(from, to) {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
	await page.mouse.move(to.x, to.y, { steps: 6 });
	await page.mouse.up();
	await page.waitForTimeout(300);
}

async function clickEdge() {
	const p = await toClient(10, topY);                       // top edge, away from the handles (the bottom edge can be under the status bar)
	await page.mouse.click(p.x, p.y);
	await page.waitForTimeout(700);                           // slower than a double-click
}

test('resizing with a handle ends on whole millimetres', async () => {
	await setup(40, 20);
	await clickEdge();
	await page.waitForFunction(() => document.getElementById('editorHandles').style.display === 'block');
	const ur = await handleCentre('mr');                      // right edge handle: width only
	// drag 13.37 mm to the right, in pixels
	const mm = await page.evaluate(() => editorMmPerPixel());
	await dragTo(ur, { x: ur.x + 13.37 / mm, y: ur.y });
	const b = await box();
	near(b.w, 53, 0.0001); near(b.h, 20, 0.0001); near(b.minX, 0);
});

test('corner drag keeps proportions and a whole-mm longer side', async () => {
	await setup(40, 20);
	await clickEdge();
	await page.waitForFunction(() => document.getElementById('editorHandles').style.display === 'block');
	const ur = await handleCentre('ur'), ll = await handleCentre('ll');
	await dragTo(ur, { x: ll.x + (ur.x - ll.x) * 1.4321, y: ll.y + (ur.y - ll.y) * 1.4321 });
	const b = await box();
	near(b.w, Math.round(b.w), 0.0001); near(b.w / b.h, 2, 0.0001);
});

test('second click on the selected object switches to rotate handles; a third goes back; Esc leaves rotate mode first', async () => {
	await setup(40, 20);
	await clickEdge();                                        // first click: selects
	expect(await rotating()).toBe(false);
	await clickEdge();                                        // second click: rotate
	expect(await rotating()).toBe(true);
	expect(await page.evaluate(() => Array.from(document.querySelectorAll('#editorHandles .editorHandle')).filter((r) => r.style.display !== 'none').length)).toBe(4);
	await clickEdge();                                        // third click: resize again
	expect(await rotating()).toBe(false);
	expect(await page.evaluate(() => Array.from(document.querySelectorAll('#editorHandles .editorHandle')).filter((r) => r.style.display !== 'none').length)).toBe(8);
	await clickEdge();
	expect(await rotating()).toBe(true);
	await page.keyboard.press('Escape');
	expect(await rotating()).toBe(false);
	expect(await page.evaluate(() => editorSelection().length)).toBe(1);         // still selected
});

test('selecting another object starts in resize mode again', async () => {
	await setup(40, 20);
	await clickEdge(); await clickEdge();
	expect(await rotating()).toBe(true);
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })); });
	await page.waitForTimeout(300);
	await clickEdge();
	expect(await rotating()).toBe(false);
});

test('rotating by dragging a corner handle: 45 degrees snaps exactly, one undo step', async () => {
	await setup(40, 40);
	await clickEdge(); await clickEdge();
	expect(await rotating()).toBe(true);
	const c = await toClient(20, 20);
	const ur = await handleCentre('ur');
	const r = Math.hypot(ur.x - c.x, ur.y - c.y), a0 = Math.atan2(ur.y - c.y, ur.x - c.x);
	const a1 = a0 - 44 * Math.PI / 180;                       // 44 deg counter-clockwise on screen: the magnet pulls it to 45
	await dragTo(ur, { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) });
	const pts = await page.evaluate(() => editorLinePoints(editorSelection()[0]));
	// a square rotated by 45 degrees round its centre: its first corner (0,0) lands at (20, 20 - 20*sqrt2)
	near(pts[0][0], 20, 0.02); near(pts[0][1], 20 - 20 * Math.SQRT2, 0.02);
	const b = await box();
	near(b.w, 40 * Math.SQRT2, 0.02);
	expect(await page.evaluate(() => !!editorSelection()[0].userData.shape)).toBe(false);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	const back = await page.evaluate(() => editorBox(editorLinePoints(getSelectedObjects()[0])));
	near(back.maxX - back.minX, 40);
});

test('rotating by a small angle gives whole degrees; a click on a rotate handle without dragging changes nothing', async () => {
	await setup(40, 40);
	await clickEdge(); await clickEdge();
	const c = await toClient(20, 20);
	const ur = await handleCentre('ur');
	const r = Math.hypot(ur.x - c.x, ur.y - c.y), a0 = Math.atan2(ur.y - c.y, ur.x - c.x);
	const a1 = a0 - 8.4 * Math.PI / 180;
	await dragTo(ur, { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) });
	const pts = await page.evaluate(() => editorLinePoints(editorSelection()[0]));
	const ang = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) * 180 / Math.PI - 90;      // the left edge was vertical
	near(Math.abs(ang), 8, 0.1);
	const undoBefore = await page.evaluate(() => undoStore.length);
	const h2 = await handleCentre('ur');
	await page.mouse.click(h2.x, h2.y);
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => undoStore.length)).toBe(undoBefore);
});
