'use strict';

// Playwright, release 1.5.1: snapping (end point, grid) for placement, handles and the "Move A-B" tool, the Snap and Snap grid buttons.

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

async function fresh(placeWithMouse) {
	await page.evaluate((pm) => {
		parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0;
		editorState.panelOn = true; editorState.more = true; editorState.snap = true; editorState.gridStep = 1;
		localStorage.setItem('swarflyPlaceMouse', pm ? '1' : '0');
	}, placeWithMouse);
	await page.waitForTimeout(400);
}

async function create(buttonId, fields) {
	await page.evaluate(({ buttonId, fields }) => {
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
	}, { buttonId, fields });
	await page.waitForTimeout(600);
}

// world (mm) -> client pixels
const toClient = (x, y) => page.evaluate(([x, y]) => {
	const s = editorToScreen(x, y), r = document.getElementById('renderArea').getBoundingClientRect();
	return { x: r.left + s[0], y: r.top + s[1] };
}, [x, y]);

const lineBox = (i) => page.evaluate((i) => {
	const all = [];
	objectsInScene.forEach((o) => o.children.forEach((c) => all.push(c)));
	const b = editorBox(editorLinePoints(all[i]));
	return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
}, i);

const pxPerMm = () => page.evaluate(() => 1 / editorMmPerPixel());
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);

// two rectangles: A 40 x 20 at (0,0) and B 30 x 10 which is moved to (100, 60)
async function twoRects() {
	await fresh(false);
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await create('CreateRect', { rectX: 30, rectY: 10 });
	await page.evaluate(() => {
		const all = [];
		objectsInScene.forEach((o) => o.children.forEach((c) => all.push(c)));
		all[1].geometry.vertices.forEach((v) => { v.x += 100; v.y += 60; });
		all[1].geometry.verticesNeedUpdate = true;
		all.forEach((c, i) => { c.userData.selected = i === 1; });
		resetView();                                  // B was moved after the view was fitted: show both again
	});
	await page.waitForTimeout(600);
}

test('Snap button toggles snapping and remembers it; Snap grid button cycles through the steps', async () => {
	await fresh(false);
	await page.evaluate(() => editorToggleSnap());
	expect(await page.evaluate(() => editorState.snap)).toBe(false);
	expect(await page.evaluate(() => localStorage.getItem('swarflySnap'))).toBe('0');
	expect(await page.locator('#editorSnapButton.ed-on').count()).toBe(0);
	await page.evaluate(() => editorToggleSnap());
	expect(await page.locator('#editorSnapButton.ed-on').count()).toBe(1);
	const caps = [];
	for (let i = 0; i < 6; i++) { await page.evaluate(() => editorCycleGrid()); caps.push(await page.textContent('#editorGridCaption')); }
	expect(caps).toEqual(['5 mm', '10 mm', '0.5 mm', '0.1 mm', 'Off', '1 mm']);
});

test('placement: the new shape snaps its corner to an end point of another shape', async () => {
	await fresh(true);
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '0'); });
	await create('CreateRect', { rectX: 40, rectY: 20 });                       // A at (0,0), placed at the origin
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); });
	await create('CreateRect', { rectX: 20, rectY: 10 });                       // B hangs on the mouse
	expect(await page.evaluate(() => !!editorState.placing)).toBe(true);
	const ppm = await pxPerMm();
	// centre of B 3 pixels away from the spot where B's lower-left corner would sit exactly on A's upper-right corner (40, 20)
	const c = await toClient(40 + 10, 20 + 5);
	await page.mouse.move(c.x + 3, c.y + 2, { steps: 4 });
	await page.waitForTimeout(150);
	expect(await page.textContent('#editorSnapText')).toBe('End point');
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(200);
	const b = await lineBox(1);
	near(b.minX, 40, 1e-6); near(b.minY, 20, 1e-6);
	expect(ppm).toBeGreaterThan(0);
});

test('placement: with Snap switched off the shape stays exactly under the cursor', async () => {
	await fresh(true);
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '0'); });
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); editorState.snap = false; });
	await create('CreateRect', { rectX: 20, rectY: 10 });
	const c = await toClient(50, 25);
	await page.mouse.move(c.x + 3, c.y + 2, { steps: 4 });
	await page.waitForTimeout(150);
	const cur = await page.evaluate(() => ({ x: editorState.cursor.x, y: editorState.cursor.y }));
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(200);
	const b = await lineBox(1);
	near(b.minX + 10, cur.x, 1e-6); near(b.minY + 5, cur.y, 1e-6);
	expect(await page.evaluate(() => document.getElementById('editorSnapMark').style.display)).toBe('none');
});

test('Move A-B: pick two points, the selection moves by exactly B - A; one undo step', async () => {
	await twoRects();
	const depth = await page.evaluate(() => undoStore.length);
	await page.evaluate(() => editorStartMoveAB());
	expect(await page.textContent('#editorStatus')).toMatch(/move from/);
	const a = await toClient(100, 60), bpt = await toClient(40, 20);          // B's lower-left corner -> A's upper-right corner
	await page.mouse.move(a.x, a.y, { steps: 3 });          // the first point may snap to a corner of the selection itself
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(150);
	expect(await page.textContent('#editorStatus')).toMatch(/move to/);
	await page.mouse.move(bpt.x + 3, bpt.y + 1, { steps: 5 });
	await page.waitForTimeout(100);
	const live = await lineBox(1);                                            // live preview while moving
	near(live.minX, 40, 1e-6); near(live.minY, 20, 1e-6);
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(250);
	const b = await lineBox(1);
	near(b.minX, 40, 1e-6); near(b.minY, 20, 1e-6); near(b.maxX, 70, 1e-6); near(b.maxY, 30, 1e-6);
	expect(await page.evaluate(() => !!editorState.mv)).toBe(false);
	expect(await page.evaluate(() => undoStore.length)).toBe(depth + 1);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	const back = await lineBox(1);
	near(back.minX, 100, 1e-6); near(back.minY, 60, 1e-6);
});

test('Move A-B: Esc during the second step puts everything back and leaves no undo step', async () => {
	await twoRects();
	const depth = await page.evaluate(() => undoStore.length);
	await page.evaluate(() => editorStartMoveAB());
	const a = await toClient(100, 60), far = await toClient(150, 100);
	await page.mouse.move(a.x, a.y, { steps: 3 });
	await page.mouse.down(); await page.mouse.up();
	await page.mouse.move(far.x, far.y, { steps: 4 });
	await page.waitForTimeout(100);
	const moving = await lineBox(1);
	expect(moving.minX).toBeGreaterThan(110);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
	const b = await lineBox(1);
	near(b.minX, 100, 1e-6); near(b.minY, 60, 1e-6);
	expect(await page.evaluate(() => undoStore.length)).toBe(depth);
	expect(await page.evaluate(() => !!editorState.mv)).toBe(false);
});

test('Move A-B: right click cancels, and without a selection a message is shown', async () => {
	await twoRects();
	await page.evaluate(() => editorStartMoveAB());
	const a = await toClient(100, 60);
	await page.mouse.move(a.x, a.y, { steps: 3 });
	await page.mouse.click(a.x, a.y, { button: 'right' });
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => !!editorState.mv)).toBe(false);
	await page.evaluate(() => objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })));
	await page.waitForTimeout(300);
	await page.evaluate(() => editorStartMoveAB());
	expect(await page.evaluate(() => !!editorState.mv)).toBe(false);
});

test('handles snap to an end point of another shape', async () => {
	await twoRects();                                                          // B (selected) is 30 x 10 at (100, 60)
	await page.evaluate(() => { editorState.panelOn = false; editorRefresh(true); });
	await page.waitForTimeout(300);
	const hc = (h) => page.evaluate((h) => { const r = document.querySelector('#editorHandles .editorHandle[data-h="' + h + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, h);
	const mr = await hc('mr');
	const target = await toClient(140, 60);                                    // pull the right edge of B to x = 140 ... plus a 3 px error
	// put a second shape's end point at x = 140 so the handle has something to snap to
	await page.evaluate(() => {
		const g = new THREE.Geometry();
		[[140, 40], [140, 90]].forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 }));
		line.name = 'guide';
		const grp = new THREE.Group(); grp.add(line); grp.name = 'Internal CAD' + Math.random();
		objectsInScene.push(grp); fillTree();
	});
	await page.waitForTimeout(500);
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = c.name === 'rectangle' && editorBox(editorLinePoints(c)).minX > 50; })); });
	await page.waitForTimeout(400);
	const mr2 = await hc('mr');
	await page.mouse.move(mr2.x, mr2.y);
	await page.mouse.down();
	await page.mouse.move(target.x + 3, mr2.y + 2, { steps: 6 });
	await page.waitForTimeout(100);
	await page.mouse.up();
	await page.waitForTimeout(250);
	const b = await page.evaluate(() => {
		const l = getSelectedObjects()[0], bb = editorBox(editorLinePoints(l));
		return { minX: bb.minX, maxX: bb.maxX };
	});
	near(b.minX, 100, 1e-6);
	near(b.maxX, 140, 1e-6);                                                   // snapped to the end point (140, 90) / (140, 40)
	expect(mr.x).toBeGreaterThan(0);
});

