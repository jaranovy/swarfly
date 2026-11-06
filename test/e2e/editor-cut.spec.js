'use strict';

// Playwright, release 1.9.0: Trim (remove the part of a line between two crossings) and Split (cut a line where you click).

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

// a 60 x 30 rectangle and a vertical line x = 20 that crosses its top and bottom edge
async function scene() {
	await page.evaluate(() => {
		parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0;
		editorState.snap = false; localStorage.setItem('swarflyPlaceMouse', '0');
		document.getElementById('rectX').value = 60; document.getElementById('rectY').value = 30; document.getElementById('CreateRect').click();
	});
	await page.waitForTimeout(800);
	await page.evaluate(() => {
		const g = new THREE.Geometry();
		[[20, -3], [20, 33]].forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'cross';
		objectsInScene[0].add(l); fillTree();
		objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; }));
		editorRefresh(true);
	});
	await page.waitForTimeout(300);
}

const toClient = (x, y) => page.evaluate(([x, y]) => {
	const s = editorToScreen(x, y), r = document.getElementById('renderArea').getBoundingClientRect();
	return { x: r.left + s[0], y: r.top + s[1] };
}, [x, y]);

const lines = () => page.evaluate(() => editorAllLines().map((l) => editorLinePoints(l).map((p) => p.map((v) => Math.round(v * 100) / 100))));

async function click(x, y) {
	const c = await toClient(x, y);
	await page.mouse.move(c.x, c.y);
	await page.waitForTimeout(150);
	await page.mouse.click(c.x, c.y);
	await page.waitForTimeout(400);
}

test('Trim: the part of the outline between two crossings goes, the rest stays; undo restores', async () => {
	await scene();
	await page.click('#editorTrimButton');
	await click(45, 30);                                   // top edge, right of the crossing line
	let l = await lines();
	expect(l.length).toBe(2);                              // the cutting line and one open outline
	const open = l.find((p) => p.length > 2);
	const ends = [open[0], open[open.length - 1]].map((p) => p.join(',')).sort();
	expect(ends).toEqual(['20,0', '20,30']);               // the left part stays, from one crossing round to the other
	expect(open.some((p) => p[0] === 60)).toBe(false);     // nothing of the right side is left
	await page.keyboard.press('Escape');
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	l = await lines();
	expect(l.length).toBe(2);
	expect(l.some((p) => p.length === 5 && p.some((q) => q[0] === 60))).toBe(true);   // the closed rectangle is back
});

test('Split: a click cuts a line in two, a crossing attracts the cut', async () => {
	await scene();
	await page.click('#editorSplitButton');
	await click(20, 15);                                   // on the vertical line, away from the rectangle edges
	let l = await lines();
	expect(l.length).toBe(3);                              // rectangle + two halves
	await click(45, 0.4);                                  // near the bottom edge, no crossing there -> cut where clicked
	l = await lines();
	expect(l.length).toBe(3);                              // the closed rectangle opened at that point (one piece)
	expect(l.some((p) => p.length > 5 || (p.length === 5 && p[0][0] !== p[4][0]))).toBe(true);
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => editorState.cut)).toBe(null);
});
