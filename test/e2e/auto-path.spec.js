'use strict';

// Playwright, release 1.20.0: "Suggest toolpaths" creates drills, holes, engraving and the cut-out (last) from the drawing.

const { test, expect } = require('@playwright/test');

test('Suggest toolpaths: part with a hole, a drill hole and an open line gives four toolpaths in the right order', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => {
		const group = new THREE.Group(); group.name = 'auto-doc';
		const add = (name, pts) => {
			const g = new THREE.Geometry();
			pts.forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
			const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = name; group.add(l);
		};
		const circle = (cx, cy, r) => { const p = []; for (let i = 0; i <= 32; i++) p.push([cx + r * Math.cos(i / 32 * 2 * Math.PI), cy + r * Math.sin(i / 32 * 2 * Math.PI)]); return p; };
		add('part', [[0, 0], [80, 0], [80, 50], [0, 50], [0, 0]]);
		add('hole', circle(40, 25, 8));
		add('drill', circle(10, 10, 1.5));
		add('line', [[10, 40], [70, 40]]);
		objectsInScene.push(group);
		fillTree();
	});
	await page.evaluate(() => autoToolpaths());
	await page.waitForSelector('#autoBox');
	await page.fill('#autoThick', '6');
	await page.waitForTimeout(300);
	expect(await page.evaluate(() => document.getElementById('autoInfo').textContent)).toContain('Cut out: 1 (6 mm deep)');
	await page.evaluate(() => [...document.querySelectorAll('.dialog button')].filter((b) => /Create toolpaths|Vytvořit/.test(b.textContent))[0].click());
	await page.waitForTimeout(600);
	const tps = await page.evaluate(() => toolpathsInScene.map((t) => [t.userData.camOperation, t.children.map((c) => c.name).join(','), Number(t.userData.camZDepth)]));
	expect(tps).toEqual([
		['Drill: Peck (Centered)', 'drill', 6],
		['CNC: Vector (path inside)', 'hole', 6],
		['CNC: Vector (no offset)', 'line', 0.5],
		['CNC: Vector (path outside)', 'part', 6]
	]);
	// the normal dialog opens pre-filled
	await page.evaluate(() => setupJob(3));
	await page.waitForSelector('#toperation3');
	expect(await page.evaluate(() => [document.getElementById('toperation3').value, document.getElementById('tzdepth3').value])).toEqual(['CNC: Vector (path outside)', '6']);
});

test('Suggest toolpaths: the whole proposal generates valid G-code', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	const result = await page.evaluate(async () => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const group = new THREE.Group(); group.name = 'auto-doc2';
		const add = (name, pts) => {
			const g = new THREE.Geometry();
			pts.forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
			const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = name; group.add(l);
		};
		const circle = (cx, cy, r) => { const p = []; for (let i = 0; i <= 32; i++) p.push([cx + r * Math.cos(i / 32 * 2 * Math.PI), cy + r * Math.sin(i / 32 * 2 * Math.PI)]); return p; };
		add('part', [[10, 10], [90, 10], [90, 60], [10, 60], [10, 10]]);
		add('hole', circle(50, 35, 8));
		add('drill', circle(20, 20, 1.5));
		add('line', [[20, 50], [80, 50]]);
		objectsInScene.push(group);
		fillTree();
		autoToolpaths();
		await sleep(500);
		[...document.querySelectorAll('.dialog button')].filter((b) => /Create toolpaths/.test(b.textContent))[0].click();
		for (let i = 0; i < 60 && (toolpathsInScene.some((t) => !t.userData.inflated) || toolpathWorkersBusy()); i++) await sleep(250);
		const btn = document.getElementById('generatetpgcode');
		btn.click();
		await sleep(5000);
		const text = prepgcodefile();
		const check = validateGcode(text, { maxX: 270, maxY: 175 });
		return { n: toolpathsInScene.length, errors: check.errors.slice(0, 5), stats: check.stats, glued: /G1[^\r\n]*G1/.test(text) };
	});
	expect(result.n).toBe(4);
	expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
	expect(result.glued).toBe(false);
	expect(result.stats.moves).toBeGreaterThan(20);
	expect(result.stats.minZ).toBeLessThan(0);
});
