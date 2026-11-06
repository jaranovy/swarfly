'use strict';

// Playwright, release 1.14.0: the properties bar is always open (greyed out when nothing is selected) and sets up new shapes.

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
		editorState.panelOn = true; editorState.snap = false; editorState.draft = null;
		localStorage.setItem('swarflyPlaceMouse', '0');
	});
	await page.waitForTimeout(500);
}

const boxes = () => page.evaluate(() => editorAllLines().map((l) => { const b = editorBox(editorLinePoints(l)); return [Math.round((b.maxX - b.minX) * 100) / 100, Math.round((b.maxY - b.minY) * 100) / 100]; }));

test('the bar is open with nothing selected, greyed out, and wakes up with a selection', async () => {
	await fresh();
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => document.getElementById('editorPanel').style.display)).toBe('block');
	expect(await page.evaluate(() => document.getElementById('epTitle').textContent)).toMatch(/nothing selected/);
	expect(await page.evaluate(() => document.getElementById('epX').disabled)).toBe(true);
	await page.evaluate(() => { document.getElementById('rectX').value = 40; document.getElementById('rectY').value = 20; document.getElementById('CreateRect').click(); });
	await page.waitForTimeout(900);
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = true; })); editorRefresh(true); });
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => document.getElementById('epX').disabled)).toBe(false);
	expect(await page.evaluate(() => document.getElementById('epTitle').textContent)).toBe('Properties');
});

test('a new shape is set up in the bar: ghost, typed values, Enter creates it, remembered next time', async () => {
	await fresh();
	await page.evaluate(() => editorNewShape('rectangle'));
	await page.waitForSelector('#epNew input');
	expect(await page.evaluate(() => document.getElementById('epNew').style.display)).toBe('flex');
	expect(await page.evaluate(() => document.getElementById('epMainBar').style.display)).toBe('none');
	expect(await page.evaluate(() => document.getElementById('editorDraftPreview').style.display)).toBe('block');
	expect(await page.evaluate(() => document.getElementById('editorPrompt').textContent)).toMatch(/New shape/);
	await page.fill('#epN_width', '40');
	await page.fill('#epN_height', '20');
	await page.keyboard.press('Enter');
	await page.waitForTimeout(1200);
	expect(await page.evaluate(() => editorState.draft)).toBe(null);
	expect(await boxes()).toEqual([[40, 20]]);
	await page.evaluate(() => editorDropAtOrigin());              // finish the placement
	await page.waitForTimeout(500);
	// the values are remembered for the next rectangle
	await page.evaluate(() => editorNewShape('rectangle'));
	expect(await page.evaluate(() => document.getElementById('epN_width').value)).toBe('40');
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => editorState.draft)).toBe(null);
	expect(await boxes()).toEqual([[40, 20]]);                     // Esc created nothing
});

test('an invalid value is marked and nothing is created; other shapes use their own parameters', async () => {
	await fresh();
	await page.evaluate(() => editorNewShape('star'));
	await page.waitForSelector('#epN_points');
	expect(await page.evaluate(() => [...document.querySelectorAll('#epNew input')].map((i) => i.id))).toEqual(['epN_points', 'epN_outer', 'epN_inner']);
	await page.fill('#epN_outer', 'abc');
	await page.waitForTimeout(200);
	expect(await page.evaluate(() => document.getElementById('editorDraftPreview').style.display)).toBe('none');
	await page.click('#epNewCreate');
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => !!editorState.draft)).toBe(true);
	expect(await boxes()).toEqual([]);
	await page.fill('#epN_outer', '30');
	await page.fill('#epN_inner', '12');
	await page.click('#epNewCreate');
	await page.waitForTimeout(1200);
	expect((await boxes()).length).toBe(1);
	await page.evaluate(() => editorDropAtOrigin());
});
