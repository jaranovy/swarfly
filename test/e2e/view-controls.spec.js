'use strict';

// Playwright, release 1.15.0: camera without wheel / middle button (Zoom +/-, Window, Rotate, Shift = rotate, Ctrl+Shift = zoom).

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => { addRect(100, 50); });
	await page.waitForTimeout(500);
});

test.afterAll(async () => { await page.close(); });

const dist = () => page.evaluate(() => camera.position.distanceTo(controls.target));

test('Zoom + and Zoom - buttons change the distance', async () => {
	const d0 = await dist();
	await page.click('#viewZoomInButton');
	const d1 = await dist();
	expect(d1).toBeLessThan(d0 * 0.8);
	await page.click('#viewZoomOutButton');
	await page.click('#viewZoomOutButton');
	expect(await dist()).toBeGreaterThan(d1 * 1.5);
});

test('Window tool zooms into the dragged rectangle and ends', async () => {
	await page.evaluate(() => resetView());
	await page.waitForTimeout(300);
	const d0 = await dist();
	const box = await page.locator('#renderArea canvas').first().boundingBox();
	await page.click('#viewWindowButton');
	await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 5 });
	await page.mouse.up();
	expect(await dist()).toBeLessThan(d0 * 0.5);
	expect(await page.evaluate(() => viewState.mode)).toBe(null);
});

test('Ctrl+Shift drag zooms, Shift drag rotates, Rotate tool rotates with the plain left button', async () => {
	await page.evaluate(() => resetView());
	await page.waitForTimeout(300);
	const box = await page.locator('#renderArea canvas').first().boundingBox();
	const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
	const d0 = await dist();
	await page.keyboard.down('Control'); await page.keyboard.down('Shift');
	await page.mouse.move(cx, cy); await page.mouse.down();
	await page.mouse.move(cx, cy - 60, { steps: 5 });
	await page.mouse.up();
	await page.keyboard.up('Shift'); await page.keyboard.up('Control');
	expect(await dist()).toBeLessThan(d0);

	const az = () => page.evaluate(() => { const d = camera.position.clone().sub(controls.target); return Math.atan2(d.x, d.z); });
	const a0 = await az();
	await page.keyboard.down('Shift');
	await page.mouse.move(cx, cy); await page.mouse.down();
	await page.mouse.move(cx + 80, cy, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up('Shift');
	const a1 = await az();
	expect(Math.abs(a1 - a0)).toBeGreaterThan(0.05);

	await page.click('#viewRotateButton');
	await page.mouse.move(cx, cy); await page.mouse.down();
	await page.mouse.move(cx - 80, cy, { steps: 6 });
	await page.mouse.up();
	expect(Math.abs((await az()) - a1)).toBeGreaterThan(0.05);
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => viewState.mode)).toBe(null);
});

test('plain left drag still selects (no camera move)', async () => {
	const p0 = await page.evaluate(() => camera.position.toArray());
	const box = await page.locator('#renderArea canvas').first().boundingBox();
	await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
	await page.mouse.move(box.x + 120, box.y + 120, { steps: 5 });
	await page.mouse.up();
	const p1 = await page.evaluate(() => camera.position.toArray());
	expect(p1).toEqual(p0);
});
