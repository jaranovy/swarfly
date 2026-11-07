/**
 * Swarfly (fork of OpenBuilds CAM) — Electron main process.
 *
 * The app is a dependency-free static web app, so instead of loading it via
 * file:// (which breaks Web Workers and fetch/XHR) we serve the repo root
 * through a custom `app://` protocol with standard-scheme privileges.
 */
const { app, BrowserWindow, protocol, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { readDefaults, defaultLangScript } = require('./defaults');
const updater = require('./updater');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'openbuilds-cam';
const ROOT = path.join(__dirname, '..');

const MIME = {
	'.html': 'text/html',
	'.htm': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.txt': 'text/plain',
	'.xml': 'application/xml',
	'.webmanifest': 'application/manifest+json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.eot': 'application/vnd.ms-fontobject',
	'.map': 'application/json',
	'.wasm': 'application/wasm',
};

// Must be called before app is ready. `standard` makes the scheme behave like
// http:// (relative URLs, Web Workers, importScripts); `supportFetchAPI`
// allows $.get()/fetch() against app:// URLs (workspace .obc files).
protocol.registerSchemesAsPrivileged([
	{
		scheme: SCHEME,
		privileges: {
			standard: true,
			secure: true,
			supportFetchAPI: true,
			stream: true,
			codeCache: true,
		},
	},
]);

function serveFile(absPath) {
	return fs.promises
		.readFile(absPath)
		.then((data) =>
			new Response(data, {
				headers: {
					'content-type': MIME[path.extname(absPath).toLowerCase()] || 'application/octet-stream',
				},
			})
		);
}

function notFound(status, message) {
	return new Response(message, {
		status,
		headers: { 'content-type': 'text/plain' },
	});
}

async function handleAppRequest(request) {
	let pathname;
	try {
		({ pathname } = new URL(request.url));
	} catch {
		return notFound(400, 'Bad request');
	}

	let relPath = decodeURIComponent(pathname).replace(/^\/+/, '');
	if (relPath === '') relPath = 'index.html';
	splashFileLoading(relPath);

	// default UI language comes from swarfly-defaults.json next to the program (English when the file is missing)
	if (relPath === 'js/default-lang.js') {
		return new Response(defaultLangScript(readDefaults()), { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' } });
	}

	const absPath = path.normalize(path.join(ROOT, relPath));
	if (!absPath.startsWith(ROOT + path.sep) && absPath !== ROOT) {
		return notFound(403, 'Forbidden');
	}

	let stat;
	try {
		stat = await fs.promises.stat(absPath);
	} catch {
		return notFound(404, `Not found: ${relPath}`);
	}

	if (stat.isDirectory()) {
		return serveFile(path.join(absPath, 'index.html'));
	}
	return serveFile(absPath);
}

// ---- splash window (3018 fork): logo, spinner and a log of what is being loaded right now ----
let splash = null;
let splashLast = 0;

function splashStatus(text) {
	if (!splash || splash.isDestroyed()) return;
	splash.webContents.executeJavaScript('setStatus(' + JSON.stringify(text) + ')').catch(() => {});
}

// called for every file the app protocol serves; throttled so hundreds of small files do not flood the window
function splashFileLoading(relPath) {
	const now = Date.now();
	if (now - splashLast < 70) return;
	splashLast = now;
	splashStatus('Loading ' + relPath);
}

function createSplash() {
	splash = new BrowserWindow({
		width: 520,
		height: 300,
		frame: false,
		resizable: false,
		movable: true,
		show: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		backgroundColor: '#1d2530',
		webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
	});
	splash.once('ready-to-show', () => splash && !splash.isDestroyed() && splash.show());
	splash.loadFile(path.join(__dirname, 'splash.html'));
}

function closeSplash() {
	if (splash && !splash.isDestroyed()) splash.close();
	splash = null;
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1600,
		height: 960,
		minWidth: 720,
		show: false,
		title: 'Swarfly',
		autoHideMenuBar: true,
		icon: path.join(__dirname, 'splash-logo.png'),
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			spellcheck: false,
		},
	});

	let shown = false;
	const reveal = () => {
		if (shown) return;
		shown = true;
		win.show();
		closeSplash();
	};
	splashStatus('Opening the main window...');
	win.webContents.on('did-start-loading', () => splashStatus('Loading the interface (index.html)...'));
	win.webContents.on('dom-ready', () => splashStatus('Starting the application, building the 3D scene and the 3018 settings...'));
	win.webContents.on('did-finish-load', () => {
		splashStatus('Done');
		setTimeout(reveal, 1200);          // the app finishes its own set-up (3D view, settings) shortly after the load event
	});
	setTimeout(reveal, 30000);            // never keep the splash forever

	win.loadURL(`${SCHEME}://${HOST}/index.html`);
	return win;
}

function blockTelemetry() {
	// Don't phone home when running as a desktop app (Google Analytics / gtag).
	const filter = { urls: ['*://*.googletagmanager.com/*', '*://*.google-analytics.com/*'] };
	session.defaultSession.webRequest.onBeforeRequest(filter, (_details, callback) =>
		callback({ cancel: true })
	);
}

app.whenReady().then(() => {
	protocol.handle(SCHEME, handleAppRequest);
	blockTelemetry();

	createSplash();
	const mainWin = createWindow();
	// automatic updates from GitHub Releases (installed copy only); a note in <userData>/update.log tells what happened
	const defaults = readDefaults();
	if (defaults.autoUpdate !== false) {
		const logFile = path.join(app.getPath('userData'), 'update.log');
		updater.start(app, dialog, mainWin, defaults.language, (m) => { try { fs.appendFileSync(logFile, new Date().toISOString() + ' ' + m + '
'); } catch (e) { /* no log */ } });
	}

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});
