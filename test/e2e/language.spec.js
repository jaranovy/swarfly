'use strict';

// UI language: English by default (js/default-lang.js; the Electron app takes it from swarfly-defaults.json), Czech through the Settings -> Language button.

const { test, expect } = require('@playwright/test');

// waits for the page that the language switch navigates to (not for the old page that is still loaded)
async function reloaded(page, ms, lang) {
	await page.waitForFunction((l) => window.swarflyLang === l, lang);
	await page.waitForLoadState('load');
	await page.waitForTimeout(ms);
}

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
	await reloaded(page, 2500, 'cs');
	expect(await page.evaluate(() => window.swarflyLang)).toBe('cs');
	expect(await page.locator('#languageButtonCaption').textContent()).toBe('English');
	expect(await page.locator('body').innerText()).toContain('Znovu');                 // Redo
	expect(await page.locator('#languageGroup').textContent()).toContain('Jazyk');     // Settings tab is not visible, read textContent

	await page.evaluate(() => swarflySwitchLanguage());
	await reloaded(page, 2000, 'en');
	expect(await page.evaluate(() => window.swarflyLang)).toBe('en');
	expect(await page.locator('body').innerText()).toContain('Redo');
});

test('a default of "cs" from default-lang.js applies, but the saved choice wins', async ({ page }) => {
	await page.route('**/js/default-lang.js', (route) => route.fulfill({ contentType: 'text/javascript', body: 'window.SWARFLY_DEFAULT_LANG = "cs";' }));
	await page.goto('/index.html?reset3018');
	await page.evaluate(() => localStorage.removeItem('swarflyLang'));
	await page.goto('/index.html');
	await page.waitForTimeout(1500);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('cs');
	await page.evaluate(() => localStorage.setItem('swarflyLang', 'en'));
	await page.goto('/index.html');
	await page.waitForTimeout(1500);
	expect(await page.evaluate(() => window.swarflyLang)).toBe('en');
	await page.evaluate(() => localStorage.removeItem('swarflyLang'));
});
