'use strict';

// Playwright: the editor of release 1.4.0 - properties panel (position by reference point, size with ratio lock, rotation,
// shape parameters), placement mode with the mouse, Dimensions button, status line, undo.

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());      // "New project" asks for confirmation when the drawing is not empty
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
});

test.afterAll(async () => { await page.close(); });

async function newProject() {
	// an empty workspace (same loader that undo uses), empty undo history
	await page.evaluate(() => { parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0; editorState.snap = false; });
	await page.waitForTimeout(500);
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '0'); });   // most tests want the shape at X0 Y0
}

// create a shape through its dialog button; returns after the 250 ms creation timer
async function create(buttonId, fields) {
	await page.evaluate(({ buttonId, fields }) => {
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
	}, { buttonId, fields });
	await page.waitForTimeout(600);
}

// select the newest line (only that one) and wait for the panel
async function selectLast() {
	await page.evaluate(() => {
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; }));
		const last = objectsInScene[objectsInScene.length - 1];
		last.children[last.children.length - 1].userData.selected = true;
	});
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
}

const box = () => page.evaluate(() => {
	const lines = getSelectedObjects();
	const b = editorSelectionBox(lines);
	return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY, w: b.maxX - b.minX, h: b.maxY - b.minY };
});
const field = (id) => page.inputValue('#' + id);
async function type(id, value) {
	await page.fill('#' + id, String(value));
	await page.dispatchEvent('#' + id, 'change');
	await page.waitForTimeout(150);
}
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('panel shows position and size of the selected shape', async () => {
	await newProject();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await selectLast();
	expect(await field('epX')).toBe('0.00');
	expect(await field('epY')).toBe('0.00');
	expect(await field('epW')).toBe('40.00');
	expect(await field('epH')).toBe('20.00');
});

test('typing X / Y moves the lower-left corner; a comma works as decimal separator', async () => {
	await type('epX', '12,5');
	await type('epY', 30);
	const b = await box();
	near(b.minX, 12.5); near(b.minY, 30);
	near(b.w, 40); near(b.h, 20);
});

test('the 3x3 picker changes which point the numbers refer to', async () => {
	await page.check('#epRef_mc');
	expect(await field('epX')).toBe('32.50');          // 12.5 + 20
	expect(await field('epY')).toBe('40.00');          // 30 + 10
	await type('epX', 100); await type('epY', 100);
	const b = await box();
	near(b.minX + b.w / 2, 100); near(b.minY + b.h / 2, 100);
	await page.check('#epRef_ur');
	await type('epX', 200); await type('epY', 150);
	const c = await box();
	near(c.maxX, 200); near(c.maxY, 150);
	await page.check('#epRef_ll');
});

test('width with proportions kept scales both sides from the reference point', async () => {
	const before = await box();
	await type('epW', 80);
	const b = await box();
	near(b.w, 80); near(b.h, 40);
	near(b.minX, before.minX); near(b.minY, before.minY);        // lower-left stays
	expect(await field('epH')).toBe('40.00');
});

test('unlocking proportions changes one side only', async () => {
	await page.uncheck('#epLock');
	await type('epH', 10);
	const b = await box();
	near(b.w, 80); near(b.h, 10);
	await page.check('#epLock');
});

test('bad input shows a message and changes nothing', async () => {
	const before = await box();
	await type('epW', 'abc');
	const after = await box();
	near(after.w, before.w);
	expect(await field('epW')).toBe(before.w.toFixed(2));        // the field is restored
});

test('rotating by 90 degrees swaps width and height around the centre', async () => {
	await page.fill('#epAngle', '90');
	const before = await box();
	await page.click('#epCCW');
	await page.waitForTimeout(150);
	const b = await box();
	near(b.w, before.h); near(b.h, before.w);
	near(b.minX + b.w / 2, before.minX + before.w / 2); near(b.minY + b.h / 2, before.minY + before.h / 2);
});

test('several selected shapes move and scale together', async () => {
	await newProject();
	await create('CreateRect', { rectX: 20, rectY: 10 });
	await create('CreateRect', { rectX: 10, rectY: 10 });
	await page.evaluate(() => {
		// put the second one at x = 40
		const last = objectsInScene[objectsInScene.length - 1];
		last.children[0].geometry.vertices.forEach((v) => { v.x += 40; });
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = true; }));
	});
	await page.waitForFunction(() => document.getElementById('epTitle').textContent.includes('2 objects'));
	expect(await field('epW')).toBe('50.00');
	await type('epW', 100);
	const b = await box();
	near(b.w, 100); near(b.h, 20);
	await type('epX', 5);
	const c = await box();
	near(c.minX, 5);
});

test('shape parameters: a star changes its number of points and keeps its place', async () => {
	await newProject();
	await create('CreateStar', { stN: 5, stR: 25, str: 10 });
	await selectLast();
	await type('epX', 70); await type('epY', 40);
	await page.waitForSelector('#epP_points');
	await type('epP_points', 8);
	await page.click('#epApplyParams');
	await page.waitForTimeout(200);
	const r = await page.evaluate(() => {
		const l = getSelectedObjects()[0];
		const b = editorBox(editorLinePoints(l));
		return { verts: l.geometry.vertices.length, minX: b.minX, minY: b.minY, kind: l.userData.shape.kind, points: l.userData.shape.params.points };
	});
	expect(r.verts).toBe(17);
	near(r.minX, 70); near(r.minY, 40);
	expect(r.kind).toBe('star'); expect(r.points).toBe(8);
});

test('parameters survive undo / redo and scaling drops them', async () => {
	await type('epW', 90);                                   // scaling: no longer exactly the parameter shape
	expect(await page.locator('#epApplyParams').count()).toBe(0);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	await selectLast();
	await page.waitForSelector('#epP_points');               // the 8-point star is back with its parameters
	expect(await field('epP_points')).toBe('8');
});

test('bad shape parameters are refused', async () => {
	await type('epP_points', 2);
	await page.click('#epApplyParams');
	await page.waitForTimeout(200);
	const verts = await page.evaluate(() => getSelectedObjects()[0].geometry.vertices.length);
	expect(verts).toBe(17);
});

test('Dimensions button draws the overall width and height of the selection', async () => {
	await newProject();
	await create('CreateRect', { rectX: 123.456, rectY: 50 });
	await selectLast();
	await page.click('#editorDimsButton');
	await page.waitForTimeout(400);
	const texts = await page.$$eval('#editorDims text', (t) => t.map((x) => x.textContent));
	expect(texts).toContain('123.46 mm');
	expect(texts).toContain('50.00 mm');
	await page.click('#editorDimsButton');
	await page.waitForTimeout(300);
	expect(await page.$eval('#editorDims', (e) => getComputedStyle(e).display)).toBe('none');
});

test('new shape at X0 Y0 when placement with the mouse is off; undo removes it completely', async () => {
	await newProject();
	await create('CreateStar', { stN: 5, stR: 25, str: 10 });
	let n = await page.evaluate(() => objectsInScene.length);
	expect(n).toBe(1);
	const b = await page.evaluate(() => { const b = editorAllBox(); return [b.minX, b.minY]; });
	near(b[0], 0); near(b[1], 0);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	n = await page.evaluate(() => objectsInScene.length);
	expect(n).toBe(0);
});

// ---- placement mode (real mouse) -------------------------------------------------------------------------------------
async function canvasPoint(dx, dy) {
	const r = await page.evaluate(() => { const b = document.querySelector('#renderArea canvas').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
	return { x: r.x + dx, y: r.y + dy };
}

async function startPlacement() {
	await newProject();
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); });
	await create('CreateRect', { rectX: 30, rectY: 10 });
	expect(await page.evaluate(() => !!editorState.placing)).toBe(true);
}

const centreOfNewest = () => page.evaluate(() => {
	const o = objectsInScene[objectsInScene.length - 1];
	const b = editorBox(editorLinePoints(o.children[o.children.length - 1]));
	return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, minX: b.minX, minY: b.minY };
});

test('placement: the shape follows the mouse, a click drops it with its centre at the cursor', async () => {
	await startPlacement();
	for (const [dx, dy] of [[0, 0], [120, -60], [-150, 80]]) {
		const p = await canvasPoint(dx, dy);
		await page.mouse.move(p.x, p.y, { steps: 3 });
		await page.waitForTimeout(100);
		const cur = await page.evaluate(() => ({ x: editorState.cursor.x, y: editorState.cursor.y }));
		const c = await centreOfNewest();
		near(c.cx, cur.x); near(c.cy, cur.y);
	}
	const p = await canvasPoint(40, 30);
	await page.mouse.move(p.x, p.y);
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => !!editorState.placing)).toBe(false);
	const cur = await page.evaluate(() => ({ x: editorState.cursor.x, y: editorState.cursor.y }));
	const c = await centreOfNewest();
	near(c.cx, cur.x); near(c.cy, cur.y);
	// the panel shows lower-left = centre - half the size
	await selectLast();
	near(Number(await field('epX')), c.cx - 15); near(Number(await field('epY')), c.cy - 5);
});

test('placement: Esc drops the shape at X0 Y0', async () => {
	await startPlacement();
	const p = await canvasPoint(90, 40);
	await page.mouse.move(p.x, p.y, { steps: 3 });
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
	const c = await centreOfNewest();
	near(c.minX, 0); near(c.minY, 0);
	expect(await page.evaluate(() => !!editorState.placing)).toBe(false);
});

test('placement: right click cancels and leaves the undo history as it was', async () => {
	await newProject();
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); });
	const depth = await page.evaluate(() => undoStore.length);
	await create('CreateRect', { rectX: 30, rectY: 10 });
	const p = await canvasPoint(60, 20);
	await page.mouse.move(p.x, p.y, { steps: 3 });
	await page.mouse.click(p.x, p.y, { button: 'right' });
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => objectsInScene.length)).toBe(0);
	expect(await page.evaluate(() => undoStore.length)).toBe(depth);
	expect(await page.evaluate(() => !!editorState.placing)).toBe(false);
});

test('status line shows cursor coordinates and a prompt', async () => {
	await startPlacement();
	const p = await canvasPoint(10, 10);
	await page.mouse.move(p.x, p.y, { steps: 2 });
	await page.waitForTimeout(300);
	const t = await page.textContent('#editorStatus');
	expect(t).toMatch(/X -?\d+\.\d\d\s+Y -?\d+\.\d\d/);
	expect(t).toMatch(/Click to place/);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
	expect(await page.textContent('#editorStatus')).toMatch(/select/i);
});

test('the Editor button in Settings switches placement and remembers it', async () => {
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); editorShowPlaceButton(); });
	expect(await page.textContent('#editorPlaceCaption')).toBe('With mouse');
	await page.evaluate(() => document.querySelector('#placeGroup button').click());   // the Settings tab is not the visible one
	expect(await page.textContent('#editorPlaceCaption')).toBe('At X0 Y0');
	expect(await page.evaluate(() => localStorage.getItem('swarflyPlaceMouse'))).toBe('0');
});

test('Czech: panel, buttons and status line are translated', async ({ browser }) => {
	const cz = await browser.newPage();
	await cz.route(/\/(config\.json|api\/config)/, (route) => route.fulfill({ status: 204, body: '' }));
	await cz.goto('/index.html?reset3018');
	await cz.evaluate(() => localStorage.setItem('swarflyLang', 'cs'));
	await cz.goto('/index.html');
	await cz.waitForTimeout(2500);
	await cz.evaluate(() => {
		localStorage.setItem('swarflyPlaceMouse', '0');
		document.getElementById('rectX').value = 30; document.getElementById('rectY').value = 10; document.getElementById('CreateRect').click();
	});
	await cz.waitForTimeout(700);
	await cz.evaluate(() => { const o = objectsInScene[0]; o.children[0].userData.selected = true; });
	await cz.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await cz.waitForTimeout(400);
	expect(await cz.textContent('#epTitle')).toBe('Vlastnosti');
	expect(await cz.textContent('#editorPanel')).toContain('Levý dolní roh');
	expect(await cz.textContent('#editorPanel')).toContain('Zachovat poměr stran');
	expect(await cz.textContent('#editorPrompt')).toMatch(/Vybrán 1 objekt/);
	expect(await cz.textContent('#editGroup .title')).toBe('Upravit');
	expect(await cz.textContent('#editorDimsButton .caption')).toBe('Kóty');
	await cz.close();
});
