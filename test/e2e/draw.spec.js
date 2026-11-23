'use strict';

// Playwright, release 1.23.0: drawing lines with the mouse (click points, freehand, close) and editing the points of a line.

const { test, expect } = require('@playwright/test');

async function open(page) {
	page.on('dialog', (d) => d.accept());
	await page.goto('/index.html?reset3018&en');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(() => { document.querySelectorAll('.dialog').forEach((d) => d.remove()); editorState.snap = true; editorState.gridStep = 1; });
}

// page coordinates of a world point
function at(page, x, y) {
	return page.evaluate(([x, y]) => { const r = document.getElementById('renderArea').getBoundingClientRect(), q = editorToScreen(x, y); return [r.left + q[0], r.top + q[1]]; }, [x, y]);
}

async function click(page, x, y) { const [px, py] = await at(page, x, y); await page.mouse.click(px, py); }

function lines(page) {
	return page.evaluate(() => { const r = []; objectsInScene.forEach((o) => o.children.forEach((c) => { if (c.geometry && c.geometry.vertices.length) r.push(c.geometry.vertices.map((v) => [Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000])); })); return r; });
}

test('Line tool: clicks add points joined by straight segments, Enter finishes, undo removes the line', async ({ page }) => {
	await open(page);
	await page.click('#drawLineButton');
	await click(page, 20, 20); await click(page, 60, 20); await click(page, 60, 50);
	await page.keyboard.press('Enter');
	expect(await lines(page)).toEqual([[[20, 20], [60, 20], [60, 50]]]);
	expect(await page.evaluate(() => drawActive())).toBe(true);        // the tool stays on for the next line
	await page.keyboard.press('Escape');
	expect(await page.evaluate(() => drawActive())).toBe(false);
	await page.evaluate(() => undo());
	await page.waitForTimeout(300);
	expect(await lines(page)).toEqual([]);
});

test('Line tool: a click on the first point closes the line; the L key starts the tool', async ({ page }) => {
	await open(page);
	await page.mouse.move(300, 300);
	await page.keyboard.press('l');
	expect(await page.evaluate(() => drawState.mode)).toBe('line');
	await click(page, 20, 20); await click(page, 60, 20); await click(page, 60, 50); await click(page, 20, 50); await click(page, 20, 20);
	expect(await lines(page)).toEqual([[[20, 20], [60, 20], [60, 50], [20, 50], [20, 20]]]);
	expect(await page.evaluate(() => drawState.pts.length)).toBe(0);
});

test('Line tool: dragging draws freehand, the stroke is simplified to a few points', async ({ page }) => {
	await open(page);
	await page.click('#drawLineButton');
	const [sx, sy] = await at(page, 20, 20), [ex, ey] = await at(page, 60, 20), [mx, my] = await at(page, 40, 50);
	await page.mouse.move(sx, sy);
	await page.mouse.down();
	for (let i = 1; i <= 20; i++) await page.mouse.move(sx + (mx - sx) * i / 20, sy + (my - sy) * i / 20);
	for (let i = 1; i <= 20; i++) await page.mouse.move(mx + (ex - mx) * i / 20, my + (ey - my) * i / 20);
	await page.mouse.up();
	await page.keyboard.press('Enter');
	const l = await lines(page);
	expect(l.length).toBe(1);
	expect(l[0].length).toBeGreaterThanOrEqual(3);
	expect(l[0].length).toBeLessThan(8);                               // 40 mouse moves became a handful of points
	expect(l[0][0]).toEqual([20, 20]);
});

test('Points tool: drag a point, bend a segment into an arc, insert and delete points, undo each step', async ({ page }) => {
	await open(page);
	await page.click('#drawLineButton');
	await click(page, 20, 20); await click(page, 60, 20); await click(page, 60, 50);
	await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
	await page.keyboard.press('n');                                    // the new line is selected: its points show up
	expect(await page.evaluate(() => drawState.mode)).toBe('nodes');
	expect(await page.evaluate(() => drawState.ns && drawState.ns.nodes.length)).toBe(3);

	// move the corner (60,20) to (70,30)
	let [x1, y1] = await at(page, 60, 20), [x2, y2] = await at(page, 70, 30);
	await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2); await page.mouse.move(x2, y2); await page.mouse.up();
	expect((await lines(page))[0]).toEqual([[20, 20], [70, 30], [60, 50]]);

	// bend the first segment: drag its diamond down
	const mid = await page.evaluate(() => drawSegmentMid(drawState.ns.nodes, false, 0));
	[x1, y1] = await at(page, mid[0], mid[1]); [x2, y2] = await at(page, mid[0], mid[1] - 8);
	await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x1, (y1 + y2) / 2); await page.mouse.move(x2, y2); await page.mouse.up();
	const bent = (await lines(page))[0];
	expect(bent.length).toBeGreaterThan(6);                            // the arc is made of short straight pieces
	expect(bent[0]).toEqual([20, 20]);
	expect(await page.evaluate(() => drawState.ns.nodes[0].b !== 0)).toBe(true);
	// double-click on the diamond makes it straight again
	[x1, y1] = await at(page, mid[0], mid[1] - 8);
	await page.mouse.dblclick(x1, y1);
	expect((await lines(page))[0]).toEqual([[20, 20], [70, 30], [60, 50]]);

	// a double-click on the second segment adds a point
	const m2 = await page.evaluate(() => drawSegmentMid(drawState.ns.nodes, false, 1));
	const [dx, dy] = await at(page, m2[0] - 3, m2[1] + 3.5);
	await page.mouse.dblclick(dx, dy);
	expect((await lines(page))[0].length).toBe(4);

	// select that point (it is selected already) and delete it
	await page.keyboard.press('Delete');
	expect((await lines(page))[0]).toEqual([[20, 20], [70, 30], [60, 50]]);

	// undo brings the deleted point back
	await page.evaluate(() => undo());
	await page.waitForTimeout(400);
	expect((await lines(page))[0].length).toBe(4);
});

test('Points tool: a window selects several points, the arrow keys nudge them, a shape loses its parameters', async ({ page }) => {
	await open(page);
	await page.evaluate(() => addPolyline('square', [[20, 20], [60, 20], [60, 60], [20, 60], [20, 20]], { kind: 'rectangle', params: { width: 40, height: 40 } }));
	await page.waitForTimeout(600);
	await page.evaluate(() => { editorState.placing = null; objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = true; })); fillTree(); });
	await page.evaluate(() => resetView(scene.getObjectByName('Grid')));       // the whole bed, so the window below is on the screen
	await page.waitForTimeout(300);
	await page.evaluate(() => drawToggleNodes());
	expect(await page.evaluate(() => drawState.ns && drawState.ns.nodes.length)).toBe(4);   // the closing point is not a node of its own
	// a window round the two top corners (y = 60)
	const [ax, ay] = await at(page, 10, 70), [bx, by] = await at(page, 70, 50);
	await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by); await page.mouse.up();
	expect(await page.evaluate(() => Object.keys(drawState.ns.sel).sort().join())).toBe('2,3');
	await page.keyboard.press('ArrowUp');
	await page.keyboard.press('ArrowUp');
	expect((await lines(page))[0]).toEqual([[20, 20], [60, 20], [60, 62], [20, 62], [20, 20]]);
	expect(await page.evaluate(() => objectsInScene[0].children[0].userData.shape)).toBeUndefined();
});

test('Points tool: soft move drags the neighbours along the line, less with the distance; the setting is remembered', async ({ page }) => {
	await open(page);
	await page.evaluate(() => { const g = new THREE.Geometry(); for (let i = 0; i <= 10; i++) g.vertices.push(new THREE.Vector3(20 + i * 10, 40, 0)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'row'; const grp = new THREE.Group(); grp.add(l); objectsInScene.push(grp); fillTree(); l.userData.selected = true; fillTree(); });
	await page.evaluate(() => resetView(scene.getObjectByName('Grid')));
	await page.waitForTimeout(300);
	await page.evaluate(() => drawToggleNodes());
	await expect(page.locator('#drawBox')).toBeVisible();
	await page.check('#drawSoft');
	await page.fill('#drawSoftR', '30');
	await page.locator('#drawSoftR').press('Tab');
	const [x1, y1] = await at(page, 70, 40), [x2, y2] = await at(page, 70, 50);
	await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x1, (y1 + y2) / 2); await page.mouse.move(x2, y2); await page.mouse.up();
	const ys = (await lines(page))[0].map((p) => p[1]);
	expect(ys[5]).toBe(50);                                              // the grabbed point
	expect(ys[4]).toBeCloseTo(47.5, 1); expect(ys[6]).toBeCloseTo(47.5, 1);   // 10 mm of a 30 mm radius: 75 %
	expect(ys[3]).toBeGreaterThan(40); expect(ys[3]).toBeLessThan(ys[4]);
	expect(ys[2]).toBe(40);                                              // 30 mm away: not moved
	expect(ys[0]).toBe(40); expect(ys[10]).toBe(40);
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('swarflyDraw')))).toMatchObject({ soft: true, radius: 30 });
});

test('Points tool: Simplify removes points on straight parts (undo brings them back); a line with too many points can still be simplified', async ({ page }) => {
	await open(page);
	await page.evaluate(() => { const g = new THREE.Geometry(); for (let i = 0; i <= 6000; i++) g.vertices.push(new THREE.Vector3(20 + i * 0.03, 40 + (i < 3000 ? 0 : (i - 3000) * 0.03), 0)); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 })); l.name = 'dense'; const grp = new THREE.Group(); grp.add(l); objectsInScene.push(grp); fillTree(); l.userData.selected = true; fillTree(); });
	await page.evaluate(() => resetView(scene.getObjectByName('Grid')));
	await page.waitForTimeout(300);
	await page.evaluate(() => drawToggleNodes());
	expect(await page.evaluate(() => drawState.ns.frozen)).toBe(true);      // 6001 points: no single points to grab
	expect(await page.locator('#drawCount').textContent()).toBe('6001');
	await page.click('#drawSimplifyBtn');
	expect(await page.evaluate(() => drawState.ns.frozen)).toBe(false);
	const after = (await lines(page))[0];
	expect(after.length).toBe(3);                                        // an L shape: start, corner, end
	expect(await page.locator('#drawCount').textContent()).toBe('3');
	await page.evaluate(() => undo());
	await page.waitForTimeout(500);
	expect((await lines(page))[0].length).toBe(6001);
});
