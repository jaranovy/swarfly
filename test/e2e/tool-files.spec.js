'use strict';

// Playwright, release 1.11.0: one G-code file per tool (window with the file list, files written into one folder).

const { test, expect } = require('@playwright/test');

test('one file per tool: the window lists the files, each file holds only its toolpaths', async ({ page }) => {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	// two tools: a 3 mm drill (toolpath 0 and 2) and a 3.175 mm mill (toolpath 1); generated G-code is faked
	await page.evaluate(() => {
		const mk = (op, dia, gcode) => ({ userData: { visible: true, camOperation: op, camToolDia: dia, gcode }, type: 'Group', name: op });
		toolpathsInScene.length = 0;
		toolpathsInScene.push(mk('Drill: Peck (Centered)', '3', 'G0 X1 Y1\nG1 Z-2\n'), mk('CNC: Pocket', '3.175', 'G0 X20 Y20\nG1 Z-1\n'), mk('Drill: Continuous (Centered)', '3', 'G0 X5 Y5\n'));
		window.lastLoadedFileName = 'Plate 7.svg';
		window.__written = {};
		window.showDirectoryPicker = async () => ({ getFileHandle: async (name) => ({ createWritable: async () => ({ write: async (t) => { window.__written[name] = t; }, close: async () => {} }) }) });
	});
	const only = await page.evaluate(() => prepgcodefile([1]));
	expect(only).toContain('X20');
	expect(only).not.toContain('X1 Y1');
	await page.evaluate(() => saveFilePerTool());
	await page.waitForSelector('#toolSplitTable');
	const rows = await page.evaluate(() => [...document.querySelectorAll('#toolSplitTable tr')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
	expect(rows.length).toBe(2);
	expect(rows[0]).toContain('plat_01d.nc');
	expect(rows[0]).toContain('Drill 3 mm');
	expect(rows[0]).toContain('2 toolpaths');
	expect(rows[1]).toContain('plat_02m.nc');
	expect(rows[1]).toContain('Mill 3.175 mm');
	await page.evaluate(() => [...document.querySelectorAll('.dialog button')].filter((b) => /Save files|Uložit soubory/.test(b.textContent))[0].click());
	await page.waitForTimeout(800);
	const written = await page.evaluate(() => window.__written);
	expect(Object.keys(written).sort()).toEqual(['plat_01d.nc', 'plat_02m.nc']);
	expect(written['plat_01d.nc']).toContain('X1 Y1');
	expect(written['plat_01d.nc']).toContain('X5 Y5');
	expect(written['plat_01d.nc']).not.toContain('X20');
	expect(written['plat_02m.nc']).toContain('X20');
	expect(written['plat_02m.nc']).not.toContain('X1 Y1');
});

test('one tool only: a message, no window', async ({ page }) => {
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => {
		toolpathsInScene.length = 0;
		toolpathsInScene.push({ userData: { visible: true, camOperation: 'CNC: Pocket', camToolDia: '3', gcode: 'G0 X1\n' }, type: 'Group', name: 'a' });
		saveFilePerTool();
	});
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => !!document.getElementById('toolSplitTable'))).toBe(false);
	expect(await page.evaluate(() => document.body.innerText)).toContain('Only one tool');
});
