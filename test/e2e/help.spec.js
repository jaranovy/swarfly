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

test('English help: dialog, topics, links, every topic renders, What\'s new, ribbon tab, no console errors', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => { if (m.type() === 'error' && !/config\.json|api\/config|favicon/.test(m.text())) errors.push(m.text()); });
	await fresh(page, 'en');
	// ribbon: Help has its own tab with two buttons; Settings has neither
	expect(await page.locator('#section-help #helpGroup button').count()).toBe(2);
	expect(await page.locator('#section-settings #helpGroup').count()).toBe(0);
	expect(await page.locator('#section-settings #appVersionNo').count()).toBe(0);
	expect(await page.locator('#appVersionNo').textContent()).toBe('v' + version);
	// the Help button opens the dialog with all topics and the first topic
	await page.evaluate(() => document.querySelector('#helpGroup button').click());
	await page.waitForSelector('#helpContent h1');
	expect(await page.locator('#helpTopicList a').count()).toBe(topics.length + 1);          // + What's new
	expect(await page.locator('#helpContent h1').first().textContent()).toBe('Getting started');
	expect(await page.locator('#helpTopicList a.active').textContent()).toBe('Getting started');
	// topics switch and internal links work
	await page.locator('#helpTopicList a[data-topic="laser"]').click();
	await expect(page.locator('#helpContent h1')).toHaveText('Laser: settings and safety');
	await page.locator('#helpTopicList a[data-topic="drawing"]').click();
	await expect(page.locator('#helpContent h1')).toHaveText('Drawing and shapes');
	await page.locator('#helpContent a.help-link[data-topic="edit"]').first().click();
	await expect(page.locator('#helpContent h1')).toHaveText('Move, scale, rotate');
	// every topic renders a non-empty page without raw markdown markers
	for (const t of topics) {
		await page.evaluate((id) => helpOpenTopic(id), t.id);
		await expect(page.locator('#helpContent h1')).toHaveText(t.en);
		const text = await page.locator('#helpContent').innerText();
		expect(text.length, t.id).toBeGreaterThan(300);
		expect(text, t.id + ' has no raw ** markers').not.toContain('**');
		expect(text, t.id + ' has no raw topic: links').not.toContain('(topic:');
	}
	// the Version button shows What's new of the running version
	await page.evaluate(() => document.getElementById('versionButton3018').click());
	await expect(page.locator('#helpContent h2').first()).toContainText('[' + version + ']');
	// F1 opens it as well
	await page.locator('#helpCloseBtn').click();
	await page.keyboard.press('F1');
	await expect(page.locator('#helpWindow')).toBeVisible();
	expect(errors).toEqual([]);
});

test('Czech language shows Czech titles and content', async ({ page }) => {
	await fresh(page, 'cs');
	await page.evaluate(() => openHelp('laser'));
	await expect(page.locator('#helpContent h1')).toHaveText('Laser: nastavení a bezpečnost');
	expect(await page.locator('#helpTopicList a').first().textContent()).toBe('Začínáme');
});

test('help is a free window (wide, not modal, movable, remembers its place, closes) and follows the application theme', async ({ page }) => {
	await fresh(page, 'en');
	await page.evaluate(() => openHelp());
	await page.waitForSelector('#helpContent h1');
	const box = await page.locator('#helpWindow').boundingBox();
	expect(box.width).toBeGreaterThanOrEqual(700);
	// not modal: the ribbon still answers while the help is open
	await page.locator('a[href="#section-settings"]').click();
	await expect(page.locator('#section-settings')).toBeVisible();
	await expect(page.locator('#helpWindow')).toBeVisible();
	// theme: light and dark, live while open
	const colors = async () => page.evaluate(() => {
		const cs = getComputedStyle(document.getElementById('helpWindow'));
		return { bg: cs.backgroundColor, fg: cs.color, theme: document.body.className.match(/theme_\w+/)[0] };
	});
	const lum = (rgb) => { const m = rgb.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
	await page.evaluate(() => Theme.set('light'));
	const light = await colors();
	await page.evaluate(() => Theme.set('dark'));
	const dark = await colors();
	expect(light.theme).toBe('theme_light');
	expect(dark.theme).toBe('theme_dark');
	expect(lum(light.bg)).toBeGreaterThan(200);
	expect(lum(light.fg)).toBeLessThan(80);
	expect(lum(dark.bg)).toBeLessThan(80);
	expect(lum(dark.fg)).toBeGreaterThan(180);
	await page.evaluate(() => Theme.set('light'));
	// drag the title bar
	await page.mouse.move(box.x + 200, box.y + 12);
	await page.mouse.down();
	await page.mouse.move(box.x + 120, box.y + 92, { steps: 5 });
	await page.mouse.up();
	const moved = await page.locator('#helpWindow').boundingBox();
	expect(Math.abs(moved.x - (box.x - 80))).toBeLessThan(3);
	expect(Math.abs(moved.y - (box.y + 80))).toBeLessThan(3);
	// geometry is remembered after a reload
	await page.goto('/index.html');
	await page.waitForTimeout(1500);
	await page.evaluate(() => openHelp());
	await page.waitForSelector('#helpContent h1');
	const again = await page.locator('#helpWindow').boundingBox();
	expect(Math.abs(again.x - moved.x)).toBeLessThan(3);
	expect(Math.abs(again.y - moved.y)).toBeLessThan(3);
	expect(Math.abs(again.width - moved.width)).toBeLessThan(3);
	// close button hides it
	await page.locator('#helpCloseBtn').click();
	await expect(page.locator('#helpWindow')).toBeHidden();
});
