// Makes the screenshots for README.md into docs/img/ (needs a static server: node scripts/static-server.js 8124).
// Usage: node scripts/make-screenshots.js [port]      Uses the installed Chrome; the images are 1400 x 850.
const path = require('path');
const { chromium } = require('@playwright/test');
const PORT = process.argv[2] || '8124';
const OUT = path.join(__dirname, '..', 'docs', 'img');
require('fs').mkdirSync(OUT, { recursive: true });

const SVG = '<svg width="210mm" height="297mm" viewBox="0 0 210 297" version="1.1" xmlns="http://www.w3.org/2000/svg"><g>' +
	'<rect style="fill:none;stroke-width:0.4;stroke:#000000" width="100" height="60" x="20" y="20"/>' +
	'<circle style="fill:none;stroke:#000000;stroke-width:0.4" cx="40" cy="50" r="8"/>' +
	'<circle style="fill:none;stroke:#000000;stroke-width:0.4" cx="100" cy="50" r="8"/>' +
	'<ellipse style="fill:none;stroke:#000000;stroke-width:0.4" cx="70" cy="50" rx="14" ry="9"/></g></svg>';

async function open(browser, lang) {
	const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
	page.on('dialog', (d) => d.accept());
	await page.goto('http://127.0.0.1:' + PORT + '/index.html?reset3018');
	await page.evaluate((l) => localStorage.setItem('swarflyLang', l), lang);   // the language is kept in localStorage
	await page.goto('http://127.0.0.1:' + PORT + '/index.html');
	await page.waitForLoadState('load');
	await page.waitForTimeout(2500);
	await page.evaluate(async (svg) => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		[...document.querySelectorAll('button')].filter((b) => /nový projekt|new project/i.test(b.textContent)).forEach((b) => b.click());
		await sleep(500);
		loadFile(new File([svg], 'plate_001.svg', { type: 'image/svg+xml' }));
		await sleep(1500);
	}, SVG);
	await page.evaluate(() => { localStorage.setItem('swarflyPlaceMouse', '0'); editorState.panelOn = true; resetView(); });
	await page.waitForTimeout(800);
	return page;
}

(async () => {
	const browser = await chromium.launch({ channel: 'chrome' });

	// 1 overview + 2 properties of a selected object + 3 new shape
	let page = await open(browser, 'en');
	await page.screenshot({ path: path.join(OUT, '01-overview.png') });
	await page.evaluate(() => { document.getElementById('selectAll').click(); });
	await page.waitForTimeout(600);
	await page.screenshot({ path: path.join(OUT, '02-properties.png') });
	await page.evaluate(() => { document.getElementById('selectNone').click(); editorNewShape('star'); });
	await page.waitForTimeout(600);
	await page.screenshot({ path: path.join(OUT, '03-new-shape.png') });
	await page.keyboard.press('Escape');

	// 4 toolpath + 5 export panel
	await page.evaluate(async () => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const find = (re) => [...document.querySelectorAll('button,a,div,span')].filter((b) => re.test(b.textContent) && b.children.length <= 3 && b.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0];
		const waitFind = async (re, ms) => { const end = Date.now() + (ms || 10000); for (;;) { const el = find(re); if (el || Date.now() > end) return el; await sleep(150); } };
		document.getElementById('selectAll').click();
		await sleep(500);
		(await waitFind(/Vytvořit dráhu nástroje z vybraných|Create Toolpath using/)).click();
		await sleep(900);
		setupJob(0);
		await sleep(700);
		const sel = document.querySelector('#toperation0');
		sel.value = 'CNC: Vector (path outside)';
		sel.dispatchEvent(new Event('change', { bubbles: true }));
		await sleep(600);
		(await waitFind(/Použít a zobrazit|Apply and Preview/)).click();
		await sleep(3000);
	});
	await page.screenshot({ path: path.join(OUT, '04-toolpath.png') });
	await page.evaluate(async () => {
		const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
		const find = (re) => [...document.querySelectorAll('button,a,div,span')].filter((b) => re.test(b.textContent) && b.children.length <= 3 && b.getBoundingClientRect().width > 0).sort((a, b) => a.textContent.length - b.textContent.length)[0];
		(find(/^\s*(Vytvořit G-kód|Generate G-Code)\s*$/)).click();
		await sleep(3500);
	});
	await page.screenshot({ path: path.join(OUT, '05-gcode.png') });

	// 6 help window
	await page.evaluate(() => openHelp());
	await page.waitForTimeout(1200);
	await page.screenshot({ path: path.join(OUT, '06-help.png') });
	await page.close();

	// 7 Czech
	page = await open(browser, 'cs');
	await page.evaluate(() => { document.getElementById('selectAll').click(); });
	await page.waitForTimeout(600);
	await page.screenshot({ path: path.join(OUT, '07-czech.png') });
	await page.close();

	await browser.close();
	console.log('screenshots written to ' + OUT);
})();
