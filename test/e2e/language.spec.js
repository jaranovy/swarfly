'use strict';

// UI language: Czech by default (DEFAULT_LANG in js/lang.js), English through the Settings -> Language button.

const { test, expect } = require('@playwright/test');

async function reloaded(page, ms) {
	await page.waitForLoadState('load');
	await page.waitForTimeout(ms);
}

test('default UI is Czech, one theme button, language button switches to English and back', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018');
	await page.evaluate(() => localStorage.removeItem('swarflyLang'));
	await page.goto('/index.html');
	await page.waitForTimeout(2000);

	expect(await page.evaluate(() => window.swarflyLang)).toBe('cs');
	expect(await page.locator('#btnTheme').count()).toBe(1);
	expect(await page.locator('#languageButtonCaption').textContent()).toBe('English');
	expect(await page.locator('body').innerText()).toContain('Znovu');                 // Redo
	expect(await page.locator('#languageGroup').textContent()).toContain('Jazyk');     // Settings tab is not visible, read textContent

	await page.evaluate(() => swarflySwitchLanguage());
	await reloaded(page, 2500);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('en');
	expect(await page.locator('#languageButtonCaption').textContent()).toBe('Česky');
	expect(await page.locator('body').innerText()).toContain('Redo');

	await page.evaluate(() => swarflySwitchLanguage());
	await reloaded(page, 2000);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('cs');
	expect(await page.locator('body').innerText()).toContain('Znovu');
});
