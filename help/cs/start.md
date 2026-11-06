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

- **Záložka Projekt**: otevřít, nový projekt, uložit/otevřít projekt, text, tvary, zpět/znovu.
- **Záložka Nastavení**: nastavení, záloha, jazyk, vzhled.
- **Záložka Nápověda**: tlačítko *Nápověda* a tlačítko *Verze* (co je nového).
- **Panely vpravo**: 1 výkres, 2 dráhy nástroje, 3 vytvoření G-kódu (s časem a statistikami), 4 export G-kódu.
- **Nápověda**: tlačítko *Nápověda* v záložce Nápověda nebo klávesa F1. Nápověda je volné okno: přetáhneš ho za záhlaví, zvětšíš z rohu a můžeš dál pracovat v aplikaci; pamatuje si velikost i místo.
