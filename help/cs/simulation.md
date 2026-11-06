# Simulace a statistiky

## Simulace

Po *Vytvořit G-kód* tlačítko **Simulace** přehraje program v 3D pohledu. Tlačítko rychlosti přepíná 1x, 2x, 4x, 8x, 12x, 16x a 20x. Když simulace hned zmizí, vygenerovaný program je vadný: hledej červenou zprávu z kontroly G-kódu.

## Statistiky (panel 3)

- **Odhad doby běhu**: z délky dráhy a posuvů; rychloposuvy se počítají pevnou rychlostí, takže ber údaj jako orientační.
- **Dráha**: délka řezu a rychloposuvu v metrech.
- **Odebráno**: plocha, hloubka a objem odebraného materiálu; po výběru **materiálu** se ukáže i hmotnost v gramech. Materiál odebírají jen frézovací operace.

## Kontrola G-kódu

Každý vygenerovaný program se automaticky zkontroluje (jednotky, absolutní režim, slepené příkazy, chybějící posuv, vypnuté vřeteno při řezání, pohyby Z v laserovém programu, rychloposuvy v materiálu, hodnoty NaN). Chyby se ukážou jako červená zpráva; záporné souřadnice a chybějící konec jsou jen varování.
