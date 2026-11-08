'use strict';

// Playwright, release 1.22.0: the "Lines" toolbar button cycles the drawing line thickness 2 -> 3 -> 1 -> 2 px and remembers it.

const { test, expect } = require('@playwright/test');

test('Lines button cycles the thickness, shows it and stores it', async ({ page }) => {
	await page.goto('/index.html?reset3018&en');
	await page.evaluate(() => { localStorage.removeItem('swarflyLineWidth'); localStorage.removeItem('swarflyThickLines'); });
	await page.reload();
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	const state = () => page.evaluate(() => [document.getElementById('viewLineBadge').textContent, localStorage.getItem('swarflyLineWidth'), viewCurrentLineWidth()]);
	expect(await state()).toEqual(['2 px', null, 2]);
	await page.evaluate(() => document.getElementById('viewLineBadge').closest('button').click());
	expect(await state()).toEqual(['3 px', '3', 3]);
	await page.evaluate(() => document.getElementById('viewLineBadge').closest('button').click());
	expect(await state()).toEqual(['1 px', '1', 1]);
	await page.evaluate(() => document.getElementById('viewLineBadge').closest('button').click());
	expect(await state()).toEqual(['2 px', '2', 2]);
	// 3 px draws without errors
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.evaluate(() => { localStorage.setItem('swarflyLineWidth', '3'); addRect(30, 20); });
	await page.waitForTimeout(1200);
	expect(errors).toEqual([]);
});
