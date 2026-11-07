'use strict';

// Playwright, release 1.18.1: New project asks to save when there are unsaved changes (Save / Don't save / Cancel).

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

const count = () => page.evaluate(() => objectsInScene.length);
const dialogOpen = () => page.evaluate(() => [...document.querySelectorAll('.dialog')].some((d) => /Save the project/.test(d.textContent) && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().height > 0));

test('an empty project is cleared at once, no question', async () => {
	await page.evaluate(() => projectNew());
	expect(await dialogOpen()).toBe(false);
});

test('unsaved work: a question appears; Cancel keeps the drawing', async () => {
	await page.evaluate(() => { addRect(100, 50); });
	await page.waitForTimeout(500);
	expect(await count()).toBeGreaterThan(0);
	await page.evaluate(() => projectNew());
	await page.waitForTimeout(400);
	expect(await dialogOpen()).toBe(true);
	await page.click('.dialog:has-text("Save the project") button:has-text("Cancel")');
	await page.waitForTimeout(300);
	expect(await count()).toBeGreaterThan(0);
});

test("Don't save clears the project", async () => {
	await page.evaluate(() => projectNew());
	await page.waitForTimeout(400);
	await page.click('.dialog:has-text("Save the project") button:has-text("Don\'t save")');
	await page.waitForTimeout(400);
	expect(await count()).toBe(0);
});

test('after saving there is nothing to ask; a later change asks again', async () => {
	await page.evaluate(() => { addRect(40, 20); });
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => projectDirty())).toBe(true);
	await page.evaluate(() => projectMarkSaved());
	expect(await page.evaluate(() => projectDirty())).toBe(false);
	await page.evaluate(() => { storeUndo(true); addRect(10, 10); });
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => projectDirty())).toBe(true);
});
