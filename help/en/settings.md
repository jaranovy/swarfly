# Settings and language

## Language

*Language* in the Settings tab switches between English and Czech. The page reloads, so save your project first. The choice is remembered.

If you have never chosen, the language comes from the file `swarfly-defaults.json` next to the program (`{ "language": "cs" }` or `"en"`). Without that file the program starts in English. The start-up window is always in English.

## Theme

*Dark mode / Light mode* in the Settings tab.

## Settings

- **Settings**: machine size, units, start and end G-code and other values of the original program. The 3018 preset is loaded on the first start.
- **Backup Settings** / **Restore from file**: save your settings to a file and load them back.
- **Factory Reset**: returns to the built-in 3018 preset. Your own changes are lost.

Settings live in the browser storage of this program. The installed program and the portable `.exe` keep **separate** settings.

## Updates

The **installed** program checks GitHub for a newer version a few seconds after it starts and downloads it in the background - only the parts that changed (a few MB, not the whole installer). When it is ready, a window asks *Restart now* or *Later*; with *Later* the update installs when you close the program. The portable `.exe` does not update itself: download the new file from the Releases page. To switch the check off, put `{ "autoUpdate": false }` into `swarfly-defaults.json` next to the program. What happened is written to `update.log` in the program's data folder.
