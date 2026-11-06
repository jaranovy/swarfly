'use strict';

// Playwright: every Czech string of the editor in ONE page load (these used to be six separate tests, each loading the app again).

const { test, expect } = require('@playwright/test');

test('Czech: properties bar, drawer, measure and snap texts, prompts and tooltips are translated', async ({ browser }) => {
	const cz = await browser.newPage();
	await cz.route(/\/(config\.json|api\/config)/, (route) => route.fulfill({ status: 204, body: '' }));
	await cz.goto('/index.html?reset3018');
	await cz.evaluate(() => localStorage.setItem('swarflyLang', 'cs'));
	await cz.goto('/index.html');
	await cz.waitForTimeout(2500);
	const text = (sel) => cz.textContent(sel);

	// ribbon and menus that exist without a selection
	expect(await text('#editGroup .title')).toBe('Upravit');
	expect(await text('#editorDimsButton .caption')).toBe('Kóty');
	expect(await text('#editorMeasureButton .caption')).toBe('Měřit');
	expect(await text('#editorMeasureMenu')).toContain('Vzdálenost dvou bodů');
	expect(await text('#editorMoveButton .caption')).toBe('Přesun A-B');
	expect(await text('#editorSnapButton .caption')).toBe('Přichytávání');
	expect(await text('#gridGroup')).toContain('Mřížka');

	// a selected rectangle: bar, drawer, prompt
	await cz.evaluate(() => {
		localStorage.setItem('swarflyPlaceMouse', '0');
		document.getElementById('rectX').value = 30; document.getElementById('rectY').value = 10; document.getElementById('CreateRect').click();
	});
	await cz.waitForTimeout(700);
	await cz.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await cz.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block');
	await cz.waitForTimeout(500);
	expect(await text('#epTitle')).toBe('Vlastnosti');
	const panel = await text('#editorPanel');
	['Levý dolní roh', 'Zachovat poměr stran', 'Zamknuto', 'Zaoblit rohy', 'Zkosit', 'Odsazená kopie', 'Rohy a odsazení', 'Body obrysu', 'Použít body'].forEach((s) => expect(panel, s).toContain(s));
	expect(await text('#editorPrompt')).toMatch(/Vybrán 1 objekt/);
	await cz.evaluate(() => { editorState.pickCount = 3; });
	await cz.waitForTimeout(400);
	expect(await text('#editorPrompt')).toMatch(/Pod ukazatelem objektů: 3/);

	// dimension modes, measuring, snapping
	await cz.evaluate(() => { editorState.pickCount = 0; editorToggleDims(); });
	await cz.waitForTimeout(300);
	expect(await text('#editorDimsButton .caption')).toBe('Celkový rozměr');
	await cz.evaluate(() => { editorStartMeasure('dist'); });
	await cz.waitForTimeout(400);
	expect(await text('#editorPrompt')).toMatch(/Měření: klikni na první bod/);
	expect(await text('#editorCoordHint')).toMatch(/nebo zadej/);
	await cz.evaluate(() => { editorMeasureEnd(); editorShowSnap([10, 10], 'end'); editorState.mv = { step: 2, lines: [], snap: [] }; editorStatusUpdate(null); });
	await cz.waitForTimeout(300);
	expect(await text('#editorSnapText')).toBe('Koncový bod');
	expect(await text('#editorPrompt')).toMatch(/Klikni na bod, kam/);
	await cz.close();
});
