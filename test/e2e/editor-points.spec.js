'use strict';

// Playwright, release 1.6.2: point table and hole diameter in the properties panel.

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

async function make(id, vals) {
	await page.evaluate(({ id, vals }) => { Object.keys(vals).forEach((k) => { document.getElementById(k).value = vals[k]; }); document.getElementById(id).click(); }, { id, vals });
	await page.waitForTimeout(600);
}

async function selectLast() {
	await page.evaluate(() => {
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; }));
		const last = objectsInScene[objectsInScene.length - 1];
		last.children[last.children.length - 1].userData.selected = true;
	});
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await page.waitForTimeout(300);
}

const box = () => page.evaluate(() => { const l = editorSelection()[0]; return Object.assign({ n: l.geometry.vertices.length, shape: !!l.userData.shape }, editorBox(editorLinePoints(l))); });
const near = (a, b, tol = 0.011) => expect(Math.abs(a - b)).toBeLessThan(tol);

test('point table lists the corners once and moving one point reshapes the outline; undo restores it', async () => {
	await fresh();
	await make('CreateRect', { rectX: 40, rectY: 20 });
	await selectLast();
	expect(await page.locator('#epPointsBox .epPtX').count()).toBe(4);
	// move the top right corner (third in the list) to 50,30
	await page.locator('#epPointsBox .epPtX').nth(2).fill('50');
	await page.locator('#epPointsBox .epPtY').nth(2).fill('30');
	await page.click('#epApplyPoints');
	await page.waitForTimeout(300);
	let b = await box();
	near(b.maxX, 50); near(b.maxY, 30); near(b.minX, 0); expect(b.n).toBe(5); expect(b.shape).toBe(false);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	b = await box();
	near(b.maxX, 40); near(b.maxY, 20); expect(b.shape).toBe(true);
});

test('bad point text shows a message and changes nothing; locked outline is refused', async () => {
	await fresh();
	await make('CreateRect', { rectX: 40, rectY: 20 });
	await selectLast();
	await page.locator('#epPointsBox .epPtX').nth(1).fill('abc');
	await page.click('#epApplyPoints');
	near((await box()).maxX, 40);
	await page.locator('#epPointsBox .epPtX').nth(1).fill('5');
	await page.check('#epLocked');
	await page.waitForTimeout(250);
	await page.click('#epApplyPoints');
	near((await box()).minX, 0);
});

test('hole diameter: a circle is resized round its centre', async () => {
	await fresh();
	await make('CreateCircle', { circleRadius: 5, circleSegments: 48 });
	await selectLast();
	const before = await box();
	const cx = (before.minX + before.maxX) / 2, cy = (before.minY + before.maxY) / 2;
	expect(await page.inputValue('#epDia')).toBe('10.00');
	await page.fill('#epDia', '16');
	await page.click('#epApplyDia');
	await page.waitForTimeout(300);
	const after = await box();
	near(after.maxX - after.minX, 16, 0.02);
	near((after.minX + after.maxX) / 2, cx, 0.02); near((after.minY + after.maxY) / 2, cy, 0.02);
});

test('a rectangle has no diameter row', async () => {
	await fresh();
	await make('CreateRect', { rectX: 40, rectY: 20 });
	await selectLast();
	expect(await page.locator('#epDia').count()).toBe(0);
});

test('Czech: new labels are translated', async ({ browser }) => {
	const cz = await browser.newPage();
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
	expect(txt).toContain('Body obrysu');
	expect(txt).toContain('Použít body');
	await cz.close();
});
