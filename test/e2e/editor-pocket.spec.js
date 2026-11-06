'use strict';

// Playwright, release 1.8.2: the Pocket button in the properties bar opens the toolpath dialog with "CNC: Pocket" chosen.

const { test, expect } = require('@playwright/test');

test('Pocket button: closed outline opens the toolpath dialog with CNC: Pocket; an open line is refused', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => {
		editorState.snap = false;
		localStorage.setItem('swarflyPlaceMouse', '0');
		document.getElementById('rectX').value = 40; document.getElementById('rectY').value = 20; document.getElementById('CreateRect').click();
	});
	await page.waitForTimeout(800);
	// an open line first: refused, no toolpath is created
	await page.evaluate(() => {
		const g = new THREE.Geometry();
		[[0, 0], [30, 0], [30, 20]].forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'open';
		objectsInScene[0].add(l);
		fillTree();
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = c === l; }));
	});
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await page.click('#epPocket');
	await page.waitForTimeout(1500);
	expect(await page.evaluate(() => toolpathsInScene.length)).toBe(0);
	// the rectangle: toolpath created and the dialog shows CNC: Pocket
	await page.evaluate(() => {
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = c.name !== 'open'; }));
	});
	await page.waitForTimeout(400);
	await page.click('#epPocket');
	await page.waitForFunction(() => document.getElementById('toperation0') && document.getElementById('toperation0').value === 'CNC: Pocket', null, { timeout: 15000 });
	expect(await page.evaluate(() => toolpathsInScene.length)).toBe(1);
});
