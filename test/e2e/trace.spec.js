'use strict';

// Playwright, release 1.10.0: the trace dialog (threshold, invert, smoothing, noise, width in mm, preview) and transparent pictures.

const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
});

test.afterAll(async () => { await page.close(); });

// 200 x 100 picture, transparent background, a grey (#444) 100 x 50 rectangle in the middle
const png = () => page.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 100; const x = c.getContext('2d'); x.fillStyle = '#444'; x.fillRect(50, 25, 100, 50); return c.toDataURL('image/png'); });

async function open(dataUrl) {
	await page.evaluate(() => { parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); });
	await page.evaluate(async (u) => { const b = await (await fetch(u)).blob(); loadFile(new File([b], 'logo.png', { type: 'image/png' })); }, dataUrl);
	await page.waitForSelector('#traceBox');
	await page.waitForTimeout(700);
}

const importIt = () => page.evaluate(() => [...document.querySelectorAll('.dialog button')].filter((b) => /Import|Importovat/.test(b.textContent))[0].click());

const size = () => page.evaluate(() => { let box = null; let lines = 0; objectsInScene.forEach((ob) => { ob.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(ob); box = box ? box.union(b) : b; ob.traverse((c) => { if (c.type === 'Line') lines++; }); }); return { lines, w: box.max.x - box.min.x, h: box.max.y - box.min.y }; });

test('transparent background is paper: one outline, automatic threshold, width in mm', async () => {
	await open(await png());
	expect(await page.evaluate(() => document.getElementById('traceInfo').textContent)).toBe('1 outlines');
	expect(await page.evaluate(() => Number(document.getElementById('traceThreshold').value))).toBeGreaterThan(1);
	expect(await page.evaluate(() => document.getElementById('traceOut').src.startsWith('data:image/svg+xml'))).toBe(true);
	await page.fill('#traceWidth', '80');                    // the whole picture (200 px incl. the margin) 80 mm wide -> the rectangle 40 x 20
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => document.getElementById('traceSize').textContent)).toBe('80 x 40 mm');
	await importIt();
	await page.waitForTimeout(2500);
	const s = await size();
	expect(s.lines).toBe(1);
	expect(Math.abs(s.w - 40)).toBeLessThan(0.5);
	expect(Math.abs(s.h - 20)).toBeLessThan(0.5);
});

test('invert and a threshold below the ink give "nothing to trace"; Cancel imports nothing', async () => {
	await open(await png());
	await page.evaluate(() => { const t = document.getElementById('traceThreshold'); t.value = 10; t.dispatchEvent(new Event('input', { bubbles: true })); });
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => document.getElementById('traceInfo').textContent)).toMatch(/Nothing to trace/);
	await page.evaluate(() => { document.getElementById('traceInvert').click(); });
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => document.getElementById('traceInfo').textContent)).toBe('1 outlines');   // the light surround is the ink now
	await page.evaluate(() => [...document.querySelectorAll('.dialog button')].filter((b) => /Cancel|Zrušit|Storno/.test(b.textContent))[0].click());
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => objectsInScene.length)).toBe(0);
});
