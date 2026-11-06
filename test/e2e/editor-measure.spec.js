'use strict';

// Playwright, release 1.6.0: Dimensions modes (overall / every object), the Measure tool (distance, angle, circle), typed coordinates.

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
	await page.evaluate(() => {
		parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0;
		editorState.panelOn = true; editorState.more = true; editorState.snap = true; editorState.gridStep = 1; editorState.dims = 0; editorState.measures = []; editorState.me = null; editorState.lastPoint = null;
		localStorage.setItem('swarflyPlaceMouse', '0');
		mouseSelectMode();
	});
	await page.waitForTimeout(400);
}

async function create(buttonId, fields) {
	await page.evaluate(({ buttonId, fields }) => {
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
	}, { buttonId, fields });
	await page.waitForTimeout(600);
}

const refit = async () => { await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })); resetView(); }); await page.waitForTimeout(600); };
const toClient = (x, y) => page.evaluate(([x, y]) => {
	const s = editorToScreen(x, y), r = document.getElementById('renderArea').getBoundingClientRect();
	return { x: r.left + s[0], y: r.top + s[1] };
}, [x, y]);
const dimTexts = () => page.$$eval('#editorDims text', (t) => t.map((x) => x.textContent));
const typeCoord = async (text) => { await page.fill('#editorCoord', text); await page.press('#editorCoord', 'Enter'); await page.waitForTimeout(150); };
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('Dimensions button cycles off -> overall size -> every object -> off', async () => {
	await fresh();
	await create('CreateRect', { rectX: 30, rectY: 20 });
	await create('CreateCircle', { circleRadius: 12, circleSegments: 48 });
	await page.evaluate(() => { const o = objectsInScene[1].children[0]; o.geometry.vertices.forEach((v) => { v.x += 60; }); });
	await refit();
	await page.click('#editorDimsButton');
	await page.waitForTimeout(350);
	expect(await page.textContent('#editorDimsButton .caption')).toBe('Overall size');
	let t = await dimTexts();
	expect(t).toContain('84.00 mm');                                  // whole drawing: 60 + 24
	expect(t).toContain('24.00 mm');
	await page.click('#editorDimsButton');
	await page.waitForTimeout(350);
	expect(await page.textContent('#editorDimsButton .caption')).toBe('Every object');
	t = await dimTexts();
	expect(t).toContain('30.00 mm');                                  // the rectangle
	expect(t).toContain('20.00 mm');
	expect(t.some((x) => /^Ø 24\.0\d$/.test(x))).toBe(true);      // the circle gets a diameter, not W x H
	expect(t).not.toContain('84.00 mm');
	await page.click('#editorDimsButton');
	await page.waitForTimeout(350);
	expect(await page.$eval('#editorDims', (e) => getComputedStyle(e).display)).toBe('none');
	expect(await page.textContent('#editorDimsButton .caption')).toBe('Dimensions');
});

test('Measure distance with two clicks (snapped to the corners)', async () => {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await refit();
	await page.evaluate(() => editorStartMeasure('dist'));
	expect(await page.textContent('#editorStatus')).toMatch(/first point/);
	const a = await toClient(0, 0), b = await toClient(40, 20);
	await page.mouse.move(a.x + 2, a.y - 1, { steps: 3 });
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(150);
	expect(await page.textContent('#editorStatus')).toMatch(/second point/);
	await page.mouse.move(b.x - 2, b.y + 1, { steps: 3 });
	await page.mouse.down(); await page.mouse.up();
	await page.waitForTimeout(300);
	const t = await dimTexts();
	expect(t).toContain('44.72 mm');
	expect(t.some((x) => /dX 40\.00\s+dY 20\.00\s+26\.6°/.test(x))).toBe(true);
	expect(await page.evaluate(() => editorState.measures.length)).toBe(1);
	expect(await page.textContent('#editorStatus')).toMatch(/first point/);       // ready for the next measurement
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => !!editorState.me)).toBe(false);
	expect(await page.evaluate(() => editorState.measures.length)).toBe(1);        // the result stays
});

test('typed coordinates: absolute then relative, and polar', async () => {
	await fresh();
	await page.evaluate(() => editorStartMeasure('dist'));
	await page.waitForSelector('#editorCoord', { state: 'visible' });
	await typeCoord('0,0');
	await typeCoord('@30,40');
	let t = await dimTexts();
	expect(t).toContain('50.00 mm');
	expect(t.some((x) => /dX 30\.00\s+dY 40\.00\s+53\.1°/.test(x))).toBe(true);
	await typeCoord('5,5');
	await typeCoord('@10<90');
	t = await dimTexts();
	expect(t).toContain('10.00 mm');
	await typeCoord('1,2');
	await typeCoord('4;5,5');                                                       // decimal comma needs the semicolon
	t = await dimTexts();
	expect(t.some((x) => /dX 3\.00\s+dY 3\.50/.test(x))).toBe(true);
	await page.keyboard.press('Escape');
	await page.evaluate(() => editorClearMeasures());
});

test('typed coordinates: bad input is refused with a message and the tool carries on', async () => {
	await page.evaluate(() => { editorState.lastPoint = null; editorStartMeasure('dist'); });
	await typeCoord('@5,5');                                                         // nothing to be relative to
	await typeCoord('abc');
	expect(await page.evaluate(() => editorState.me.pts.length)).toBe(0);
	await typeCoord('2,2');
	expect(await page.evaluate(() => editorState.me.pts.length)).toBe(1);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(150);
	expect(await page.evaluate(() => !!editorState.me)).toBe(false);
	expect(await page.isVisible('#editorCoord')).toBe(false);
});

test('Measure angle from three typed points', async () => {
	await page.evaluate(() => { editorClearMeasures(); editorStartMeasure('angle'); });
	expect(await page.textContent('#editorStatus')).toMatch(/Angle: click the corner/);
	await typeCoord('0,0');
	await typeCoord('10,0');
	await typeCoord('0,10');
	expect(await page.evaluate(() => editorState.measures.length)).toBe(1);
	expect(await dimTexts()).toContain('90.0°');
	await typeCoord('5,5');
	await typeCoord('10,5');
	await typeCoord('10,10');
	expect(await dimTexts()).toContain('45.0°');
	await page.keyboard.press('Escape');
});

test('Measure diameter of the selected circle; Clear measurements removes everything', async () => {
	await fresh();
	await create('CreateCircle', { circleRadius: 12, circleSegments: 48 });
	await refit();
	await page.evaluate(() => editorMeasureCircles());
	expect(await page.evaluate(() => editorState.measures.length)).toBe(0);              // nothing selected
	await page.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await page.waitForTimeout(300);
	await page.evaluate(() => editorMeasureCircles());
	await page.waitForTimeout(300);
	const t = await dimTexts();
	expect(t.some((x) => /^Ø 24\.0\d\s+R 12\.0\d$/.test(x))).toBe(true);
	await page.evaluate(() => editorClearMeasures());
	await page.waitForTimeout(300);
	expect(await page.$eval('#editorDims', (e) => getComputedStyle(e).display)).toBe('none');
});

test('Move A-B with typed points: absolute start, relative target', async () => {
	await fresh();
	await create('CreateRect', { rectX: 30, rectY: 10 });
	await refit();
	await page.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	const depth = await page.evaluate(() => undoStore.length);
	await page.evaluate(() => editorStartMoveAB());
	await page.waitForSelector('#editorCoord', { state: 'visible' });
	await typeCoord('0,0');
	await typeCoord('@25,10');
	const b = await page.evaluate(() => { const bb = editorSelectionBox(getSelectedObjects()); return [bb.minX, bb.minY, bb.maxX, bb.maxY]; });
	near(b[0], 25, 1e-6); near(b[1], 10, 1e-6); near(b[2], 55, 1e-6); near(b[3], 20, 1e-6);
	expect(await page.evaluate(() => undoStore.length)).toBe(depth + 1);
	expect(await page.isVisible('#editorCoord')).toBe(false);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	const back = await page.evaluate(() => { const l = []; objectsInScene.forEach((o) => o.children.forEach((c) => l.push(editorBox(editorLinePoints(c))))); return l[0].minX; });
	near(back, 0, 1e-6);
});

