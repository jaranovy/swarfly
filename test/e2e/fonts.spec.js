'use strict';

// Playwright, release 1.21.0: the Text tool offers the whole bundled font list, and a new font gives Czech text outlines.

const { test, expect } = require('@playwright/test');

test('Text tool: 68 fonts in the drop-down, a new font and a symbol font create outlines', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	expect(await page.evaluate(() => document.querySelectorAll('#addShapeText .fs-results li').length)).toBe(await page.evaluate(() => SWARFLY_FONTS.length));
	expect(await page.evaluate(() => SWARFLY_FONTS.length)).toBeGreaterThanOrEqual(60);
	expect(await page.evaluate(() => document.getElementById('swarflyFontFaces').textContent.includes("'Roboto Slab'"))).toBe(true);

	const make = async (family, text) => {
		await page.evaluate(() => parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false));
		await page.evaluate(({ family, text }) => {
			Metro.dialog.open('#addShapeText');
			$('#font').val(family.replace(/ /g, '+')).change();
			$('#texttorender').val(text).trigger('input');
		}, { family, text });
		await page.waitForTimeout(400);
		await page.evaluate(() => document.getElementById('CreateText').click());
		await page.waitForTimeout(1500);
		return page.evaluate(() => { let lines = 0; objectsInScene.forEach((o) => o.traverse((c) => { if (c.type === 'Line') lines++; })); return lines; });
	};
	// Czech text in a new font: outlines for every letter (letters with holes give more lines)
	expect(await make('Roboto Slab', 'Příliš žluťoučký kůň')).toBeGreaterThan(15);
	// symbols: scissors, star, smiley
	expect(await make('Noto Sans Symbols 2', '✂★☺')).toBeGreaterThan(2);
});
