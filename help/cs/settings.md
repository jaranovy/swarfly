# Nastavení a jazyk

## Jazyk

*Jazyk* v záložce Nastavení přepíná mezi angličtinou a češtinou. Stránka se znovu načte, proto si nejdřív ulož projekt. Volba se pamatuje.

Když jsi nikdy nevybral, jazyk se vezme ze souboru `swarfly-defaults.json` vedle programu (`{ "language": "cs" }` nebo `"en"`). Bez tohoto souboru program startuje anglicky. Úvodní okno při startu je vždy anglicky.

## Vzhled

*Tmavý režim / Světlý režim* v záložce Nastavení.

## Nastavení

- **Nastavení**: rozměry stroje, jednotky, začátek a konec G-kódu a další hodnoty původního programu. Předvolba 3018 se nahraje při prvním startu.
- **Záloha nastavení** / **Obnovit ze souboru**: uloží nastavení do souboru a zase je načte.
- **Obnovit tovární nastavení**: vrátí zabudovanou předvolbu 3018. Tvoje vlastní změny se ztratí.

Nastavení jsou uložená v úložišti prohlížeče tohoto programu. Nainstalovaný program a přenosné `.exe` mají nastavení **oddělená**.

## Klávesové zkratky

*Klávesové zkratky* na kartě Nastavení otevřou seznam všech akcí s popisem a jejich klávesami, ve skupinách Výběr, Skica, Úpravy, Kamera a Ostatní. Klikni na *Změnit* a stiskni novou klávesu (součástí může být Ctrl, Alt a Shift); *Odebrat* smaže klávesu té akce, *Výchozí zkratky* vrátí všechny. Klávesu, kterou už používá jiná akce, program odmítne. Šipky, Esc, Enter a Tab jsou pevné. Samotná písmena nefungují, když píšeš do políčka. Volba se ukládá do úložiště prohlížeče (jako ostatní nastavení).

## Aktualizace

**Nainstalovaný** program pár vteřin po spuštění zkontroluje na GitHubu novější verzi a stáhne ji na pozadí - jen změněné části (několik MB, ne celý instalátor). Až je hotová, okno se zeptá *Restartovat teď* nebo *Později*; při *Později* se aktualizace nainstaluje po zavření programu. Přenosné `.exe` se samo neaktualizuje: nový soubor stáhni ze stránky Releases. Kontrolu vypneš zápisem `{ "autoUpdate": false }` do `swarfly-defaults.json` vedle programu. Co se dělo, je zapsáno v `update.log` v datové složce programu.
