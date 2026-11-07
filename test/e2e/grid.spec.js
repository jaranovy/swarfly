'use strict';

// Playwright, release 1.18.2: the grid follows the zoom (10 mm lines far away, 5 mm grey and 1 mm faint lines when zoomed in).

const { test, expect } = require('@playwright/test');

test('grid levels appear with the zoom and the 10 mm lines get darker', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	const at = async (d) => {
		await page.evaluate((d) => { controls.target.set(40, 30, 0); camera.position.set(40, 30, d); controls.update(); }, d);
		await page.waitForTimeout(400);
		return page.evaluate(() => Object.fromEntries(['g1', 'g5', 'g10', 'g100'].map((k) => [k, [gridLayers[k].visible, gridLayers[k].material.opacity]])));
	};
	const far = await at(2500);
	expect(far.g1[0]).toBe(false); expect(far.g5[0]).toBe(false); expect(far.g10[0]).toBe(false); expect(far.g100[0]).toBe(true);
	const mid = await at(900);
	expect(mid.g10[0]).toBe(true); expect(mid.g5[0]).toBe(false); expect(mid.g1[0]).toBe(false);
	const near = await at(150);
	expect(near.g5[0]).toBe(true); expect(near.g10[1]).toBeGreaterThan(mid.g10[1]);
	const close = await at(40);
	expect(close.g1[0]).toBe(true); expect(close.g5[0]).toBe(true);
	expect(close.g1[1]).toBeLessThan(close.g5[1]);          // the 1 mm lines are the faintest
});
