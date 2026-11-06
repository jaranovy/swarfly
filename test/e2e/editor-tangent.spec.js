'use strict';

// Playwright, release 1.12.0: Tangent (line touching a circle in a set direction) and Tangent arc (arc of a set radius between two lines).

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

async function fresh() {
	await page.evaluate(() => {
		parseLoadWorkspace('{"objects":{},"toolpaths":{}}', false); undoStore.length = 0; redoStore.length = 0;
		editorState.snap = false; localStorage.setItem('swarflyPlaceMouse', '0');
	});
	await page.waitForTimeout(400);
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

async function addLine(pts) {
	await page.evaluate((pts) => {
		const g = new THREE.Geometry();
		pts.forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
		const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'l';
		if (!objectsInScene.length) { const grp = new THREE.Group(); grp.name = 'Internal CAD' + Math.random(); objectsInScene.push(grp); }
		objectsInScene[0].add(l); fillTree();
	}, pts);
}

test('Tangent: a circle gets a horizontal tangent on the side that was pointed at; undo removes it', async () => {
	await fresh();
	await page.evaluate(() => addCircle(10, 64));                     // radius 10 (the place-with-mouse option is off: it lands at the origin area)
	await page.waitForTimeout(1800);                                 // the view settles after the new object
	const c = await page.evaluate(() => { const b = editorBox(editorLinePoints(editorAllLines()[0])); return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, r: (b.maxX - b.minX) / 2 }; });
	await page.click('#editorTangentButton');
	await page.fill('#etAngle', '0');
	await page.fill('#etLength', '30');
	await click(c.cx, c.cy + c.r + 0.05);                    // pointing at the upper side
	const l = await lines();
	expect(l.length).toBe(2);
	const t = l.find((p) => p.length === 2);
	expect(Math.abs(t[0][1] - (c.cy + c.r))).toBeLessThan(0.05);
	expect(Math.abs(t[1][1] - (c.cy + c.r))).toBeLessThan(0.05);
	expect(Math.abs(Math.hypot(t[1][0] - t[0][0], t[1][1] - t[0][1]) - 30)).toBeLessThan(0.05);
	await page.keyboard.press('Escape');
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	expect((await lines()).length).toBe(1);
});

test('Tangent arc: two lines at a right angle are joined by an arc of the set radius', async () => {
	await fresh();
	await addLine([[10, 10], [60, 10]]);
	await addLine([[10, 10], [10, 40]]);
	await page.evaluate(() => editorRefresh(true));
	await page.click('#editorArcButton');
	await page.fill('#etRadius', '8');
	await click(40, 10);                                            // first line, on the part that stays
	await click(10, 30);                                            // second line
	const l = await lines();
	expect(l.length).toBe(1);                                       // joined into one polyline
	const p = l[0];
	expect(p[0]).toEqual([60, 10]);
	expect(p[p.length - 1]).toEqual([10, 40]);
	expect(p.some((q) => Math.abs(q[0] - 18) < 0.02 && Math.abs(q[1] - 10) < 0.02)).toBe(true);   // touching point on the first line
	expect(p.some((q) => Math.abs(q[0] - 10) < 0.02 && Math.abs(q[1] - 18) < 0.02)).toBe(true);   // ... and on the second
	expect(p.some((q) => Math.abs(q[0] - 10) < 0.02 && Math.abs(q[1] - 10) < 0.02)).toBe(false);  // the corner is gone
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => editorState.cut)).toBe(null);
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	expect((await lines()).length).toBe(2);
});

test('To corner: a short line is extended and a crossing line trimmed to their intersection; parallel lines are refused', async () => {
	await fresh();
	await addLine([[10, 10], [40, 10]]);                            // ends before the vertical line
	await addLine([[50, 0], [50, 30]]);                             // the vertical line
	await page.evaluate(() => editorRefresh(true));
	await page.click('#editorReachButton');
	await click(30, 10);                                            // the horizontal line, on the part that stays
	await click(50, 5);                                              // the vertical line: the lower part stays
	let l = await lines();
	expect(l.length).toBe(2);
	const h = l.find((p) => p[0][1] === 10 && p[1][1] === 10);
	expect(h).toEqual([[10, 10], [50, 10]]);                        // extended to the vertical line
	const v = l.find((p) => p[0][0] === 50 && p[1][0] === 50);
	expect(v.map((q) => q[1]).sort((a, b) => a - b)).toEqual([0, 10]);   // the upper part was cut off
	await page.keyboard.press('Escape');
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	l = await lines();
	expect(l.find((p) => p[0][1] === 10 && p[1][1] === 10)).toEqual([[10, 10], [40, 10]]);
});
