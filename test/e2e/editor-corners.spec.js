'use strict';

// Playwright, release 1.6.1: rounded corners, chamfers and offset copies from the properties panel.

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
		editorState.panelOn = true; editorState.snap = false; editorState.measures = [];
		localStorage.setItem('swarflyPlaceMouse', '0');
	});
	await page.waitForTimeout(400);
}

async function rect(w, h) {
	await page.evaluate(({ w, h }) => { document.getElementById('rectX').value = w; document.getElementById('rectY').value = h; document.getElementById('CreateRect').click(); }, { w, h });
	await page.waitForTimeout(600);
}

async function selectLast() {
	await page.evaluate(() => {
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; }));
		const last = objectsInScene[objectsInScene.length - 1];
		last.children[last.children.length - 1].userData.selected = true;
	});
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await page.waitForTimeout(250);
}

const lines = () => page.evaluate(() => {
	const out = [];
	objectsInScene.forEach((o) => o.children.forEach((c) => { const b = editorBox(editorLinePoints(c)); out.push({ verts: c.geometry.vertices.length, minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY, shape: !!c.userData.shape, name: c.name }); }));
	return out;
});
const click = (id) => page.evaluate((id) => document.getElementById(id).click(), id);
async function set(id, v) { await page.fill('#' + id, String(v)); await page.waitForTimeout(50); }
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);
const toastCount = () => page.evaluate(() => document.querySelectorAll('.toast').length);

test('Round corners: more points, same box, parameters dropped; undo brings the rectangle back', async () => {
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epCornerSize', 5);
	await click('epFillet');
	await page.waitForTimeout(300);
	const [l] = await lines();
	expect(l.verts).toBeGreaterThan(20);
	near(l.maxX - l.minX, 40); near(l.maxY - l.minY, 20);
	expect(l.shape).toBe(false);                                           // it is an ordinary outline now
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	const [b] = await lines();
	expect(b.verts).toBe(5);
	expect(b.shape).toBe(true);
});

test('Chamfer cuts every corner of a rectangle', async () => {
	await selectLast();
	await set('epCornerSize', 4);
	await click('epChamfer');
	await page.waitForTimeout(300);
	const [l] = await lines();
	expect(l.verts).toBe(9);
	near(l.maxX - l.minX, 40); near(l.maxY - l.minY, 20);
});

test('A size that does not fit is reduced and a message says so; the outline stays valid', async () => {
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epCornerSize', 80);
	await click('epFillet');
	await page.waitForTimeout(400);
	const [l] = await lines();
	near(l.maxX - l.minX, 40); near(l.maxY - l.minY, 20);
	expect(await toastCount()).toBeGreaterThan(0);
});

test('bad size shows a message and changes nothing; locked objects are not changed', async () => {
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epCornerSize', 'abc');
	await click('epFillet');
	await set('epCornerSize', -2);
	await click('epChamfer');
	expect((await lines())[0].verts).toBe(5);
	await set('epCornerSize', 3);
	await page.check('#epLocked');
	await page.waitForTimeout(250);
	await click('epFillet');
	expect((await lines())[0].verts).toBe(5);
});

test('Offset copy grows the outline: a new outline 6 mm bigger, the original stays, undo removes the copy', async () => {
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epOffset', 3);
	await click('epOffsetCopy');
	await page.waitForTimeout(400);
	const all = await lines();
	expect(all.length).toBe(2);
	const orig = all.find((l) => l.name === 'rectangle'), off = all.find((l) => l.name === 'offset');
	near(orig.maxX - orig.minX, 40);
	near(off.minX, -3, 0.02); near(off.maxX, 43, 0.02); near(off.minY, -3, 0.02); near(off.maxY, 23, 0.02);
	// the new outline is the selection, so the next offset works on it
	expect(await page.evaluate(() => getSelectedObjects().map((l) => l.name))).toEqual(['offset']);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	expect((await lines()).length).toBe(1);
});

test('Offset copy shrinks with a negative distance; too much shrinking leaves nothing; open lines are refused', async () => {
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epOffset', -2);
	await click('epOffsetCopy');
	await page.waitForTimeout(400);
	let all = await lines();
	const off = all.find((l) => l.name === 'offset');
	near(off.minX, 2, 0.02); near(off.maxX, 38, 0.02); near(off.minY, 2, 0.02); near(off.maxY, 18, 0.02);
	await fresh();
	await rect(40, 20);
	await selectLast();
	await set('epOffset', -15);
	await click('epOffsetCopy');
	await page.waitForTimeout(300);
	expect((await lines()).length).toBe(1);
	await set('epOffset', 0);
	await click('epOffsetCopy');
	expect((await lines()).length).toBe(1);
	// an open line
	await fresh();
	await page.evaluate(() => {
		const g = new THREE.Geometry();
		[[0, 0], [30, 0], [30, 20]].forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'open';
		const grp = new THREE.Group(); grp.add(l); grp.name = 'Internal CAD' + Math.random();
		objectsInScene.push(grp); fillTree();
	});
	await page.waitForTimeout(400);
	await selectLast();
	await set('epOffset', 2);
	await click('epOffsetCopy');
	await page.waitForTimeout(300);
	expect((await lines()).length).toBe(1);
});

test('Czech: the new buttons and messages are translated', async ({ browser }) => {
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
	await cz.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await cz.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await cz.waitForTimeout(400);
	const txt = await cz.textContent('#editorPanel');
	expect(txt).toContain('Zaoblit rohy');
	expect(txt).toContain('Zkosit');
	expect(txt).toContain('Odsazená kopie');
	expect(txt).toContain('Rohy a odsazení');
	await cz.close();
});
