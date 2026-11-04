'use strict';

// UI language: English by default, Czech through the Settings -> Language button (js/lang.js + js/lang/cs.json).

const { test, expect } = require('@playwright/test');

test('default UI is English, one theme button, language button switches to Czech and back', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018');
	await page.evaluate(() => localStorage.removeItem('swarflyLang'));
	await page.goto('/index.html');
	await page.waitForTimeout(2000);

	expect(await page.evaluate(() => window.swarflyLang)).toBe('en');
	expect(await page.locator('#btnTheme').count()).toBe(1);
	expect(await page.locator('#languageButtonCaption').textContent()).toBe('Česky');
	expect(await page.locator('body').innerText()).toContain('Redo');

	await page.evaluate(() => swarflySwitchLanguage());
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('cs');
	expect(await page.locator('#languageButtonCaption').textContent()).toBe('English');
	expect(await page.locator('body').innerText()).toContain('Znovu');       // Redo
	expect(await page.locator('#languageGroup').textContent()).toContain('Jazyk');   // Language (Settings tab is not visible)

	await page.evaluate(() => swarflySwitchLanguage());
	await page.waitForLoadState('load');
	await page.waitForTimeout(2000);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('en');
	expect(await page.locator('body').innerText()).toContain('Redo');
});
