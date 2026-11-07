'use strict';

// Playwright, release 1.18.0: left tool panel (buttons moved out of the ribbon), switch back to the ribbon, key tooltips, active state.

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.evaluate(() => { localStorage.removeItem('swarflyLayout'); localStorage.removeItem('swarflyShortcuts'); });
	await page.reload();
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => { addRect(100, 50); });
	await page.waitForTimeout(500);
});

test.afterAll(async () => { await page.close(); });

test('the tool panel is the default: tools sit in it, the emptied ribbon groups are hidden', async () => {
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(true);
	for (const id of ['editorTrimButton', 'viewZoomInButton', 'undoButton', 'editorSnapButton']) {
		expect(await page.evaluate((i) => !!document.getElementById(i).closest('#toolPanel'), id), id).toBe(true);
	}
	expect(await page.evaluate(() => [...document.querySelectorAll('#toolPanel .tp-title')].map((e) => e.textContent.trim()))).toEqual(['Select', 'Create', 'Sketch', 'Edit', 'Camera']);
	expect(await page.evaluate(() => document.querySelectorAll('nav[data-role="ribbonmenu"] #editGroup').length)).toBe(1);
	expect(await page.evaluate(() => getComputedStyle(document.getElementById('editGroup')).display)).toBe('none');
});

test('tooltips carry the key; a changed key shows in the tooltip', async () => {
	expect(await page.getAttribute('#editorTrimButton', 'title')).toMatch(/\(X\)$/);
	expect(await page.getAttribute('#undoButton', 'title')).toMatch(/\(Ctrl\+Z\)$/);
	await page.evaluate(() => { shortcutState.bindings.trim = ['Q']; shortcutSave(); });
	expect(await page.getAttribute('#editorTrimButton', 'title')).toMatch(/\(Q\)$/);
	await page.evaluate(() => shortcutResetAll());
});

test('panel buttons work: trim tool turns on (active state), Zoom + changes the distance, Q then X', async () => {
	const dist = () => page.evaluate(() => camera.position.distanceTo(controls.target));
	const d0 = await dist();
	await page.click('#viewZoomInButton');
	expect(await dist()).toBeLessThan(d0 * 0.8);
	await page.click('#editorSnapButton');
	await page.click('#editorSnapButton');
	await page.keyboard.press('x');
	expect(await page.evaluate(() => !!editorState.cut)).toBe(true);
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => !!editorState.cut)).toBe(false);
});

test('the Shapes menu opens from the panel and makes a shape (no drop error)', async () => {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.click('#shapesMenu button');
	await page.click('#shapesMenu li:has-text("Star")');
	await page.waitForTimeout(400);
	expect(await page.evaluate(() => !!editorState.draft || !!editorState.placing)).toBe(true);
	expect(errors).toEqual([]);
	await page.keyboard.press('Escape');
});

test('Layout button moves everything back into the ribbon and forth again', async () => {
	await page.evaluate(() => swarflyToggleLayout());
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(false);
	expect(await page.evaluate(() => !!document.getElementById('editorTrimButton').closest('nav[data-role="ribbonmenu"]'))).toBe(true);
	expect(await page.evaluate(() => document.getElementById('editGroup').style.display)).toBe('');
	expect(await page.evaluate(() => document.querySelectorAll('#toolPanel').length)).toBe(0);
	expect(await page.evaluate(() => localStorage.swarflyLayout)).toBe('ribbon');
	await page.reload();
	await page.waitForTimeout(2500);
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(false);
	await page.evaluate(() => swarflyToggleLayout());
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(true);
	// every id is still unique
	expect(await page.evaluate(() => ['editorTrimButton', 'undoButton', 'viewJobButton'].map((i) => document.querySelectorAll('#' + i).length))).toEqual([1, 1, 1]);
});

test('toolbar: the placement button stays pressed and the grid button shows the step as a number; Ctrl+Alt+L switches layout', async () => {
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '1'); editorShowPlaceButton(); editorState.gridStep = 1; editorShowGridButton(); });
	expect(await page.evaluate(() => document.getElementById('editorPlaceBadge').closest('button').classList.contains('ed-on'))).toBe(true);
	expect(await page.textContent('#editorPlaceBadge')).toBe('Mouse');
	await page.evaluate(() => document.getElementById('editorPlaceBadge').closest('button').click());
	expect(await page.evaluate(() => document.getElementById('editorPlaceBadge').closest('button').classList.contains('ed-on'))).toBe(false);
	expect(await page.textContent('#editorPlaceBadge')).toBe('X0 Y0');
	expect(await page.textContent('#editorGridBadge')).toMatch(/^\d+(\.\d+)? mm$/);
	await page.evaluate(() => document.getElementById('editorGridBadge').closest('button').click());
	expect(await page.textContent('#editorGridBadge')).not.toBe('');
	expect(await page.evaluate(() => document.querySelectorAll('#layoutButton').length)).toBe(0);
	await page.keyboard.press('Control+Alt+L');
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(false);
	await page.keyboard.press('Control+Alt+L');
	expect(await page.evaluate(() => document.body.classList.contains('sw-tools'))).toBe(true);
});
