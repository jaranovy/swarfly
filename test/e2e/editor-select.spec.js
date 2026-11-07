'use strict';

// Playwright, release 1.5.2: window / crossing selection, double-click on a group, Esc, cycling through overlapping objects, lock.

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
		editorState.panelOn = true; editorState.more = true; editorState.snap = false; editorState.pick = null; editorState.pickCount = 0;
		localStorage.setItem('swarflyPlaceMouse', '0');
		mouseSelectMode();
	});
	await page.waitForTimeout(400);
}

async function create(buttonId, fields) {
	await page.evaluate(({ buttonId, fields }) => {
		Object.entries(fields).forEach(([id, v]) => { document.getElementById(id).value = v; });
		document.getElementById(buttonId).click();
	}, { buttonId, fields });
	await page.waitForTimeout(600);
}

// moves the newest outline by (dx, dy) and refits the view
async function shiftLast(dx, dy) {
	await page.evaluate(([dx, dy]) => {
		const o = objectsInScene[objectsInScene.length - 1], c = o.children[o.children.length - 1];
		c.geometry.vertices.forEach((v) => { v.x += dx; v.y += dy; });
		c.geometry.verticesNeedUpdate = true;
	}, [dx, dy]);
}

const refit = async () => { await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })); resetView(); }); await page.waitForTimeout(600); };

const toClient = (x, y) => page.evaluate(([x, y]) => {
	const s = editorToScreen(x, y), r = document.getElementById('renderArea').getBoundingClientRect();
	return { x: r.left + s[0], y: r.top + s[1] };
}, [x, y]);

// the starts of the outlines that are selected, sorted
const selectedStarts = () => page.evaluate(() => getSelectedObjects().map((l) => { const b = editorBox(editorLinePoints(l)); return Math.round(b.minX) + ',' + Math.round(b.minY); }).sort());

async function drag(from, to) {
	const a = await toClient(from[0], from[1]), b = await toClient(to[0], to[1]);
	await page.mouse.move(a.x, a.y);
	await page.mouse.down();
	await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
	await page.mouse.move(b.x, b.y, { steps: 5 });
	await page.mouse.up();
	await page.waitForTimeout(250);
}

// A 40x20 at (0,0), C 20x10 at (60,0): A is fully inside a window that reaches x = 45, C is only touched by one that reaches x = 70
async function twoRects() {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await create('CreateRect', { rectX: 20, rectY: 10 });
	await shiftLast(60, 0);
	await refit();
}

test('window drawn left to right selects only what lies fully inside', async () => {
	await twoRects();
	await drag([-5, 25], [70, -5]);                       // upper-left to lower-right: A inside, C only touched
	expect(await selectedStarts()).toEqual(['0,0']);
});

test('window drawn right to left selects everything it touches', async () => {
	await refit();
	await drag([70, -5], [-5, 25]);                       // lower-right to upper-left
	expect(await selectedStarts()).toEqual(['0,0', '60,0']);
});

test('a crossing window that reaches nothing selects nothing; the window turns solid or dashed with the direction', async () => {
	await refit();
	await page.evaluate(() => viewZoomOut());   // the tool panel covers the left edge of the drawing area: keep the window start clear of it
	await drag([100, 40], [90, 30]);
	expect(await selectedStarts()).toEqual([]);
	const a = await toClient(-5, 25), b = await toClient(70, -5);
	await page.mouse.move(a.x, a.y); await page.mouse.down();
	await page.mouse.move(b.x, b.y, { steps: 6 });
	expect(await page.evaluate(() => document.getElementById('selection').style.borderStyle)).toBe('solid');
	await page.mouse.up();
	await page.mouse.move(b.x, b.y); await page.mouse.down();
	await page.mouse.move(a.x, a.y, { steps: 6 });
	expect(await page.evaluate(() => document.getElementById('selection').style.borderStyle)).toBe('dashed');
	await page.mouse.up();
});

test('Esc clears the selection, but not while typing in a field', async () => {
	await refit();
	await drag([70, -5], [-5, 25]);
	expect((await selectedStarts()).length).toBe(2);
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	await page.focus('#epX');
	await page.keyboard.press('Escape');
	expect((await selectedStarts()).length).toBe(2);
	await page.evaluate(() => document.activeElement.blur());
	await page.mouse.move(5, 5);
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
	expect(await selectedStarts()).toEqual([]);
});

test('double-click selects every outline of the object group under the pointer', async () => {
	await fresh();
	// one group with two separate outlines (like an imported drawing) and one rectangle
	await page.evaluate(() => {
		const grp = new THREE.Group(); grp.name = 'Internal CAD' + Math.random();
		[[[0, 0], [50, 0]], [[0, 30], [50, 30]]].forEach((pts, i) => {
			const g = new THREE.Geometry();
			pts.forEach((p) => g.vertices.push(new THREE.Vector3(p[0], p[1], 0)));
			const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffff00 }));
			l.name = 'part' + i; grp.add(l);
		});
		objectsInScene.push(grp); fillTree();
	});
	await page.waitForTimeout(500);
	await create('CreateRect', { rectX: 20, rectY: 10 });
	await shiftLast(70, 10);
	await refit();
	const p = await toClient(25, 0);
	await page.mouse.dblclick(p.x, p.y);
	await page.waitForTimeout(300);
	expect(await selectedStarts()).toEqual(['0,0', '0,30']);
});

test('clicking again on the same spot picks the next of two overlapping objects', async () => {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await refit();
	await page.evaluate(() => { editorState.panelOn = false; });           // the panel would cover the spot after the first click
	const p = await toClient(10, 0);                        // on the bottom edge of both, away from the handles
	const picked = [];
	for (let i = 0; i < 3; i++) {
		await page.mouse.click(p.x, p.y);
		await page.waitForTimeout(700);                     // slower than a double-click
		picked.push(await page.evaluate(() => getSelectedObjects().map((l) => l.uuid).join()));
	}
	expect(picked[0]).not.toBe('');
	expect(picked[1]).not.toBe(picked[0]);
	expect(picked[2]).toBe(picked[0]);
	expect(await page.textContent('#editorStatus')).toMatch(/2 objects under the pointer/);
});

test('lock: a locked object is not changed by the panel, arrow keys, handles or Move A-B', async () => {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await refit();
	await page.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	await page.check('#epLocked');
	await page.waitForTimeout(300);
	const box = () => page.evaluate(() => { const b = editorSelectionBox(getSelectedObjects()); return [b.minX, b.minY, b.maxX, b.maxY]; });
	const before = await box();
	await page.fill('#epX', '50'); await page.dispatchEvent('#epX', 'change');
	await page.mouse.move(5, 5);
	await page.keyboard.press('ArrowRight');
	await page.evaluate(() => editorStartMoveAB());
	expect(await page.evaluate(() => !!editorState.mv)).toBe(false);
	await page.waitForTimeout(300);
	expect(await box()).toEqual(before);
	expect(await page.evaluate(() => document.querySelector('#editorHandles .editorHandle').style.display)).toBe('none');
	expect(await page.inputValue('#epX')).toBe('0.00');                       // the field is restored
	await page.uncheck('#epLocked');
	await page.waitForTimeout(300);
	await page.fill('#epX', '50'); await page.dispatchEvent('#epX', 'change');
	await page.waitForTimeout(200);
	expect((await box())[0]).toBeCloseTo(50, 6);
	expect(await page.evaluate(() => document.querySelector('#editorHandles .editorHandle').style.display)).toBe('');
});

test('lock survives undo / redo and copies of a locked object are not locked', async () => {
	await page.check('#epLocked');
	await page.waitForTimeout(200);
	await page.evaluate(() => undo());                                         // the lock itself is one undo step
	await page.waitForTimeout(500);
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = true; })); });
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	expect(await page.isChecked('#epLocked')).toBe(false);
	await page.check('#epLocked');
	await page.waitForTimeout(200);
	await page.evaluate(() => { document.getElementById('epCopyCount').value = 2; document.getElementById('epCopyDX').value = 60; document.getElementById('epCopyDY').value = 0; });
	await page.evaluate(() => document.getElementById('epCopyLinear').click());
	await page.waitForTimeout(500);
	const flags = await page.evaluate(() => { const out = []; objectsInScene.forEach((o) => o.children.forEach((c) => out.push(!!c.userData.locked))); return out; });
	expect(flags.length).toBe(2);
	expect(flags.filter(Boolean).length).toBe(1);                              // the original stays locked, the copy is free
});

test('hover fill covers the whole rectangle even when a global loop variable is left over', async () => {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	const faces = await page.evaluate(() => {
		window.i = 3;                                              // upstream loops leave a global i behind
		const line = objectsInScene[0].children[0];
		const mesh = shapeFromLine(line, 0x0088ff, 0.4);
		return mesh.geometry.faces.length;
	});
	expect(faces).toBe(2);                                         // two triangles = the whole rectangle (a triangle meant half)
});

test('the drawing does not jump when the properties bar appears and disappears', async () => {
	await fresh();
	await create('CreateRect', { rectX: 40, rectY: 20 });
	await page.evaluate(() => { objectsInScene.forEach((o) => o.children.forEach((c) => { c.userData.selected = false; })); });
	await page.waitForTimeout(400);
	const top = () => page.evaluate(() => document.getElementById('renderArea').getBoundingClientRect().top);
	const none = await top();
	await page.evaluate(() => { objectsInScene[0].children[0].userData.selected = true; });
	await page.waitForFunction(() => document.getElementById('editorPanel').style.display === 'block' && !document.getElementById('epX').disabled);
	await page.waitForTimeout(300);
	expect(await top()).toBe(none);
});
