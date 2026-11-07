# Začínáme

Swarfly převede výkres (SVG, DXF, obrázek) na program v G-kódu pro CNC 3018 Pro (GRBL) s frézou nebo laserem.
Program se uloží jako soubor `.nc` a na stroj se přenese SD kartou.

## Pět kroků

1. **Načti výkres**: *Otevřít* v záložce Projekt, nebo nakresli tvar přes *Tvary* (viz [Kreslení a tvary](topic:drawing)).
2. **Vyber** čáry, které chceš řezat, a použij *Vytvořit dráhu nástroje z vybraných vektorů*.
3. **Vyber operaci** (například *Fréza: vektor (vně čáry)* nebo *Laser: vektor (uvnitř čáry)*), vyplň hloubku, posuv a nástroj a dej *Použít a zobrazit dráhu nástroje*. Viz [Dráhy nástroje a operace](topic:toolpath).
4. **Vytvoř G-kód** (panel 3), podívej se na simulaci a přečti statistiky. Viz [Simulace a statistiky](topic:simulation).
5. **Ulož G-kód** (panel 4) a zkopíruj soubor `.nc` na SD kartu. Viz [Uložení programu](topic:output).

> Před prvním skutečným řezem proveď **řez na prázdno** (vřeteno nahoře, pod ním nic) a zkontroluj velikost a polohu.

## Kde co je

- **Panel nástrojů (vlevo od výkresu)**: kreslicí nástroje ve skupinách - *Výběr* (výběr, posun, mazání, transformace), *Tvoření* (text, tvary), *Skica* (měření, přichytávání, rozměry, panel vlastností), *Upravit* (posun A-B, ořez, rozdělení, tečna, oblouk, do rohu, zpět, znovu) a *Kamera* (zoom, okno, otáčení, ukázat úlohu, ukázat pracovní plochu). Když najedeš na tlačítko, uvidíš název a klávesu; kliknutím na název skupiny ji sbalíš. **Ctrl+Alt+L** vrátí všechno do pásu karet (staré rozložení) a zase zpět.
- **Lišta nahoře** (ve starém rozložení záložky Projekt, Nastavení a Nápověda): otevřít, nový projekt, uložit/otevřít projekt, nastavení, jazyk, motiv, klávesové zkratky, nápověda.
- **Záložka Nastavení**: nastavení, záloha, jazyk, vzhled.
- **Záložka Nápověda**: tlačítko *Nápověda* a tlačítko *Verze* (co je nového).
- **Panely vpravo**: 1 výkres, 2 dráhy nástroje, 3 vytvoření G-kódu (s časem a statistikami), 4 export G-kódu.
- **Nápověda**: tlačítko *Nápověda* v záložce Nápověda nebo klávesa F1. Nápověda je volné okno: přetáhneš ho za záhlaví, zvětšíš z rohu a můžeš dál pracovat v aplikaci; pamatuje si velikost i místo.

## Myš a klávesy

| Akce | Jak |
|---|---|
| Výběr | Levé tlačítko myši (klik na objekt, nebo tažení okna; **Ctrl** přidá do výběru) |
| Úchyty velikosti / otáčení | Dalším kliknutím na vybraný objekt se úchyty přepínají mezi velikostí a otáčením |
| Otáčení pohledu | **Shift** (nebo **Alt**) + tažení levým tlačítkem, tlačítko **Otáčet** (skupina Přiblížení), nebo prostřední tlačítko |
| Posun pohledu | Tažení pravým tlačítkem |
| Zoom | Kolečko myši, tlačítka **Zoom +** / **Zoom -**, **Ctrl + Shift** + tažení levým tlačítkem (nahoru = blíž) |
| Přiblížení oblasti | Tlačítko **Okno**, pak levým tlačítkem natáhni obdélník (Esc zruší) |
| Smazat vybrané | **Del** |
| Ostatní akce | Většina nástrojů má klávesu (V výběr, M posun, X ořez, + / - zoom ...). Celý seznam s popisem je v *Nastavení - Klávesové zkratky*, kde můžeš každou klávesu změnit |
| Posunout vybrané | Šipky (1 mm; **Shift** 10 mm; **Alt** 0,1 mm) |
| Zrušit | **Esc** |
