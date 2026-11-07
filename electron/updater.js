'use strict';

// Swarfly 1.15.1: automatic updates from GitHub Releases (electron-updater). Only the installed copy updates (the portable exe does not).
// The installer publishes a ".blockmap" next to each release, so an update downloads only the parts that changed (a few MB, not the whole
// ~95 MB). The update is downloaded in the background and installed when the program is closed - or at once, when the user answers "Restart".
// Nothing is sent but the usual GitHub request for the release file list. Switch off: put { "autoUpdate": false } into swarfly-defaults.json.

const TEXTS = {
	en: { title: 'Swarfly update', ready: (v) => `Version ${v} is downloaded and will be installed when you close Swarfly.`, restart: 'Restart now', later: 'Later' },
	cs: { title: 'Aktualizace Swarfly', ready: (v) => `Verze ${v} je stažená a nainstaluje se po zavření Swarfly.`, restart: 'Restartovat teď', later: 'Později' }
};

function updateTexts(lang) { return TEXTS[lang === 'cs' ? 'cs' : 'en']; }

// the installed (NSIS) copy updates; the portable exe, the dev run (npm start) and other systems do not
function canAutoUpdate(env, isPackaged, platform) {
	return !!isPackaged && platform === 'win32' && !env.PORTABLE_EXECUTABLE_FILE;
}

function start(app, dialog, win, lang, log) {
	if (!canAutoUpdate(process.env, app.isPackaged, process.platform)) return null;
	let autoUpdater;
	try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { log('updater not available: ' + e.message); return null; }
	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;
	autoUpdater.logger = { info: (m) => log(String(m)), warn: (m) => log(String(m)), error: (m) => log(String(m)), debug: () => {} };
	autoUpdater.on('update-available', (info) => log('update available: ' + info.version));
	autoUpdater.on('update-not-available', () => log('no update'));
	autoUpdater.on('error', (e) => log('update error: ' + (e && e.message)));
	autoUpdater.on('update-downloaded', (info) => {
		const t = updateTexts(lang);
		dialog.showMessageBox(win, { type: 'info', title: t.title, message: t.ready(info.version), buttons: [t.restart, t.later], defaultId: 1, cancelId: 1 })
			.then((r) => { if (r.response === 0) autoUpdater.quitAndInstall(); })
			.catch(() => {});
	});
	setTimeout(() => { autoUpdater.checkForUpdates().catch((e) => log('update check failed: ' + (e && e.message))); }, 8000);
	return autoUpdater;
}

module.exports = { start, updateTexts, canAutoUpdate };
