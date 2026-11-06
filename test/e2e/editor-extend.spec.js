'use strict';

// Playwright, release 1.6.3: extend / trim ends of an open line; measurements saved with the project.

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
		editorState.panelOn = true; editorState.more = true; editorState.snap = false; editorState.measures = [];
		localStorage.setItem('swarflyPlaceMouse', '0');
	});
	await page.waitForTimeout(400);
}

async function openLine() {
	await page.evaluate(() => {
		const g = new THREE.Geometry();
		[[0, 0], [30, 0], [30, 20]].forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'open';
		const grp = new THREE.Group(); grp.add(l); grp.name = 'Internal CAD' + Math.random();
		objectsInScene.push(grp); fillTree();
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; }));
		l.userData.selected = true;
	});
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	await page.waitForTimeout(300);
}

const pts = () => page.evaluate(() => editorLinePoints(editorSelection()[0]));
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('extend start by 5 and trim end by 4 along the end segments; undo restores', async () => {
	await fresh();
	await openLine();
	await page.fill('#epExtStart', '5');
	await page.fill('#epExtEnd', '-4');
	await page.click('#epExtend');
	await page.waitForTimeout(300);
	let p = await pts();
	near(p[0][0], -5); near(p[0][1], 0); near(p[2][0], 30); near(p[2][1], 16);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	p = await pts();
	near(p[0][0], 0); near(p[2][1], 20);
});

test('a closed outline is refused and unchanged', async () => {
	await fresh();
	await page.evaluate(() => { document.getElementById('rectX').value = 40; document.getElementById('rectY').value = 20; document.getElementById('CreateRect').click(); });
	await page.waitForTimeout(700);
	await page.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	await page.fill('#epExtStart', '3');
	await page.click('#epExtend');
	const n = await page.evaluate(() => editorSelection()[0].geometry.vertices.length);
	expect(n).toBe(5);
});

test('measurements are written into the saved project and come back on load', async () => {
	await fresh();
	await page.evaluate(() => { editorState.measures = [{ type: 'dist', a: [0, 0], b: [10, 0] }]; });
	const saved = await page.evaluate(() => {
		let text = null;
		const orig = window.invokeSaveAsDialog;
		window.invokeSaveAsDialog = (blob) => { text = blob; };
		saveExportWorkspace('t.obc');
		window.invokeSaveAsDialog = orig;
		return text.text();
	});
	const json = JSON.parse(saved);
	expect(json.measures).toEqual([{ type: 'dist', a: [0, 0], b: [10, 0] }]);
	await page.evaluate((j) => { editorState.measures = []; parseLoadWorkspace(j, false); }, saved);
	expect(await page.evaluate(() => editorState.measures.length)).toBe(1);
	// a project without the key clears them; junk entries are dropped
	await page.evaluate(() => parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false));
	expect(await page.evaluate(() => editorState.measures.length)).toBe(0);
	await page.evaluate(() => parseLoadWorkspace('{"objects":{},"toolpaths":{},"measures":[1,{"type":"x"},{"type":"dia","center":[0,0],"r":2,"text":"t"}]}', false));
	expect(await page.evaluate(() => editorState.measures.length)).toBe(1);
});
