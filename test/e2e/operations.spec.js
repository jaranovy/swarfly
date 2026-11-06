'use strict';

// Playwright: generate G-code for EVERY operation type from a small drawing (rectangle + ellipse),
// run the result through the G-code validator (js/gcode-validate.js) and check the viewer parsed it.
// This catches output bugs per operation (glued lines in Laser / Plasma / Drag Knife, Z moves in laser, ...).

const { test, expect } = require('@playwright/test');

const SVG = '<svg width="210mm" height="297mm" viewBox="0 0 210 297" version="1.1" xmlns="http://www.w3.org/2000/svg"><g>' +
	'<rect style="fill:none;stroke-width:0.4;stroke:#000000" width="40.276737" height="33.400219" x="34.38258" y="39.94928"/>' +
	'<ellipse style="fill:none;stroke:#000000;stroke-width:0.4" cx="53.947906" cy="56.117283" rx="14.244212" ry="12.238561"/></g></svg>';

const OPERATIONS = [
	{ op: 'Drill: Peck (Centered)', mill: true },
	{ op: 'Drill: Continuous (Centered)', mill: true },
	{ op: 'CNC: Vector (no offset)', mill: true },
	{ op: 'CNC: Vector (path inside)', mill: true },
	{ op: 'CNC: Vector (path outside)', mill: true },
	{ op: 'CNC: Pocket', mill: true, wait: 8000 },
	{ op: 'Laser: Vector (path outside)', laser: true },
	{ op: 'Laser: Vector (raster fill) (Beta)', laser: true, wait: 6000 }
];

test.describe.configure({ mode: 'serial' });

let page;

test.beforeAll(async ({ browser }) => {
	page = await browser.newPage();
	await page.goto('/index.html?reset3018');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	// start with an empty project, load the drawing, select everything, add one toolpath
	await page.evaluate(async (svg) => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		[...document.querySelectorAll('button')].filter((b) => /nový projekt|new project/i.test(b.textContent)).forEach((b) => b.click());
		await sleep(500);
		loadFile(new File([svg], 'plan_001.svg', { type: 'image/svg+xml' }));
		await sleep(1500);
		const find = (re) => [...document.querySelectorAll('button,a,div,span')].filter((b) => re.test(b.textContent) && b.children.length <= 3 && b.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0];
			// waits for the control instead of guessing a delay (the app builds its dialogs asynchronously)
			const waitFind = async (re, ms) => { const end = Date.now() + (ms || 10000); for (;;) { const el = find(re); if (el || Date.now() > end) return el; await sleep(150); } };
		document.getElementById('selectAll').click();
		await sleep(500);
		(await waitFind(/Vytvořit dráhu nástroje z vybraných|Create Toolpath using/)).click();
		await sleep(900);
	}, SVG);
});

test.afterAll(async () => { await page.close(); });

for (const spec of OPERATIONS) {
	test('operation "' + spec.op + '" generates valid G-code', async () => {
		const result = await page.evaluate(async ({ op, wait }) => {
			const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
			const find = (re) => [...document.querySelectorAll('button,a,div,span')].filter((b) => re.test(b.textContent) && b.children.length <= 3 && b.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0];
			// waits for the control instead of guessing a delay (the app builds its dialogs asynchronously)
			const waitFind = async (re, ms) => { const end = Date.now() + (ms || 10000); for (;;) { const el = find(re); if (el || Date.now() > end) return el; await sleep(150); } };
			setupJob(0);
			await sleep(700);
			const sel = document.querySelector('#toperation0');
			sel.value = op;
			sel.dispatchEvent(new Event('change', { bubbles: true }));
			await sleep(600);
			(await waitFind(/Použít a zobrazit|Apply and Preview/)).click();
			await sleep(wait || 2500);
			(await waitFind(/^\s*(Vytvořit G-kód|Generate G-Code)\s*$/)).click();
			await sleep(3500);
			const text = prepgcodefile();
			const check = validateGcode(text, { maxX: 270, maxY: 175 });
			return { errors: check.errors.slice(0, 5), warnings: check.warnings.map((w) => w.code), stats: check.stats, lines: text.split('\r\n').length, glued: /G1[^\r\n]*G1/.test(text), viewerLines: (typeof object !== 'undefined' && object && object.userData && object.userData.lines) ? object.userData.lines.length : 0 };
		}, { op: spec.op, wait: spec.wait });

		expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
		expect(result.glued).toBe(false);
		expect(result.stats.moves).toBeGreaterThan(3);
		expect(result.viewerLines, 'the 3D viewer / simulation parsed the G-code').toBeGreaterThan(3);
		if (spec.laser) expect(result.stats.mode).toBe('laser');
		if (spec.mill) expect(result.stats.minZ).toBeLessThan(0);
	});
}
