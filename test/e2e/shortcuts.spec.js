'use strict';

// Playwright, release 1.17.0: keyboard shortcuts (defaults, the Settings window, own keys, typing in a field).

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.evaluate(() => localStorage.removeItem('swarflyShortcuts'));
	await page.reload();
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => { addRect(100, 50); });
	await page.waitForTimeout(500);
});

test.afterAll(async () => { await page.close(); });

const dist = () => page.evaluate(() => camera.position.distanceTo(controls.target));

test('old shortcuts still work: Ctrl+A selects all, Delete removes', async () => {
	await page.keyboard.press('Control+A');
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => objectsInScene.length)).toBeGreaterThan(0);
	await page.keyboard.press('Delete');
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => objectsInScene.length)).toBe(0);
	await page.keyboard.press('Control+Z');
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => objectsInScene.length)).toBeGreaterThan(0);
});

test('plain keys: + zooms in, - zooms out, V / M switch the mouse mode', async () => {
	const d0 = await dist();
	await page.keyboard.press('+');
	expect(await dist()).toBeLessThan(d0 * 0.8);
	await page.keyboard.press('-');
	expect(await dist()).toBeGreaterThan(d0 * 0.9);
	await page.keyboard.press('m');
	expect(await page.evaluate(() => mouseState)).toBe('move');
	await page.keyboard.press('v');
	expect(await page.evaluate(() => mouseState)).toBe('select');
});

test('a key typed into a field does not trigger an action', async () => {
	await page.click('#sizexmax', { force: true }).catch(() => {});
	const before = await page.evaluate(() => mouseState);
	await page.evaluate(() => { const i = document.createElement('input'); i.id = 'scTest'; document.body.appendChild(i); i.focus(); });
	await page.keyboard.press('m');
	expect(await page.evaluate(() => mouseState)).toBe(before);
	expect(await page.inputValue('#scTest')).toBe('m');
	await page.evaluate(() => document.getElementById('scTest').remove());
});

test('Settings window: change a key, it is saved and the old key stops working', async () => {
	await page.evaluate(() => shortcutOpen());
	await expect(page.locator('#shortcutWindow')).toBeVisible();
	await page.click('[data-sc-change="toolMove"]');
	await page.keyboard.press('Control+Alt+G');
	expect(await page.evaluate(() => shortcutState.bindings.toolMove.join())).toBe('Ctrl+Alt+G');
	expect(await page.evaluate(() => JSON.parse(localStorage.swarflyShortcuts).toolMove.join())).toBe('Ctrl+Alt+G');
	await page.evaluate(() => shortcutClose());
	await page.keyboard.press('v');
	await page.keyboard.press('m');
	expect(await page.evaluate(() => mouseState)).toBe('select');
	await page.keyboard.press('Control+Alt+G');
	expect(await page.evaluate(() => mouseState)).toBe('move');
	await page.keyboard.press('v');
});

test('a key that another action uses is refused, Escape cancels, Restore defaults works', async () => {
	await page.evaluate(() => shortcutOpen());
	await page.click('[data-sc-change="toolErase"]');
	await page.keyboard.press('v');                                   // used by Select
	expect(await page.evaluate(() => shortcutState.bindings.toolErase.join())).toBe('E');
	expect(await page.textContent('#shortcutMsg')).toContain('already used');
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => shortcutState.capture)).toBe(null);
	await page.click('#shortcutResetBtn');
	expect(await page.evaluate(() => shortcutState.bindings.toolMove.join())).toBe('M');
	expect(await page.evaluate(() => localStorage.swarflyShortcuts)).toBe('{}');
	await page.evaluate(() => shortcutClose());
});
