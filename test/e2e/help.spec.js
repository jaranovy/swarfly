'use strict';

// Playwright: the in-app help (js/help.js): opens with the Help button and F1, lists every topic, renders Markdown,
// follows internal links, shows What's new from CHANGELOG.md and switches to Czech content with the language.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const topics = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'help', 'index.json'), 'utf8')).topics;
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')).version;

async function fresh(page, lang) {
	await page.route(/\/(config\.json|api\/config)/, (route) => route.fulfill({ status: 204, body: '' }));
	await page.goto('/index.html?reset3018');
	await page.evaluate((l) => { if (l) localStorage.setItem('swarflyLang', l); else localStorage.removeItem('swarflyLang'); }, lang);
	await page.goto('/index.html');
	await page.waitForTimeout(2000);
}

test('Help button opens the dialog with all topics and the first topic', async ({ page }) => {
	await fresh(page, 'en');
	await page.evaluate(() => document.querySelector('#helpGroup button').click());
	await page.waitForSelector('#helpContent h1');
	expect(await page.locator('#helpTopicList a').count()).toBe(topics.length + 1);          // + What's new
	expect(await page.locator('#helpContent h1').first().textContent()).toBe('Getting started');
	expect(await page.locator('#helpTopicList a.active').textContent()).toBe('Getting started');
});

test('F1 opens the help, topics switch and internal links work', async ({ page }) => {
	await fresh(page, 'en');
	await page.keyboard.press('F1');
	await page.waitForSelector('#helpContent h1');
	await page.locator('#helpTopicList a[data-topic="laser"]').click();
	await expect(page.locator('#helpContent h1')).toHaveText('Laser: settings and safety');
	// internal link inside a topic
	await page.locator('#helpTopicList a[data-topic="drawing"]').click();
	await expect(page.locator('#helpContent h1')).toHaveText('Drawing and shapes');
	await page.locator('#helpContent a.help-link[data-topic="edit"]').click();
	await expect(page.locator('#helpContent h1')).toHaveText('Move, scale, rotate');
});

test('every topic renders a non-empty page without raw markdown markers', async ({ page }) => {
	await fresh(page, 'en');
	await page.evaluate(() => openHelp());
	await page.waitForSelector('#helpContent h1');
	for (const t of topics) {
		await page.evaluate((id) => helpOpenTopic(id), t.id);
		await expect(page.locator('#helpContent h1')).toHaveText(t.en);
		const text = await page.locator('#helpContent').innerText();
		expect(text.length, t.id).toBeGreaterThan(300);
		expect(text, t.id + ' has no raw ** markers').not.toContain('**');
		expect(text, t.id + ' has no raw topic: links').not.toContain('(topic:');
	}
});

test("What's new shows the changelog of the running version", async ({ page }) => {
	await fresh(page, 'en');
	await page.evaluate(() => openHelp('changelog'));
	await page.waitForSelector('#helpContent h2');
	expect(await page.locator('#helpContent h2').first().textContent()).toContain('[' + version + ']');
});

test('Czech language shows Czech titles and content', async ({ page }) => {
	await fresh(page, 'cs');
	await page.evaluate(() => openHelp('laser'));
	await expect(page.locator('#helpContent h1')).toHaveText('Laser: nastavení a bezpečnost');
	expect(await page.locator('#helpTopicList a').first().textContent()).toBe('Začínáme');
});

test('no console errors while opening help', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => { if (m.type() === 'error' && !/config\.json|api\/config|favicon/.test(m.text())) errors.push(m.text()); });
	await fresh(page, 'en');
	await page.evaluate(() => openHelp());
	await page.waitForSelector('#helpContent h1');
	expect(errors).toEqual([]);
});
