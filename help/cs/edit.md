# Posun, měřítko, otočení

## Panel vlastností (vyber a piš)

Klikni na objekt (nebo táhni okno kolem více objektů, Ctrl přidává do výběru). Vlevo nahoře ve výkresu se objeví panel **Vlastnosti**:

- **X / Y** a **výběr 3x3**: čísla jsou poloha zvoleného bodu rámečku výběru (výchozí je levý dolní roh; jde i jiný roh, střed hrany nebo střed). Zadej novou hodnotu a stiskni Enter - objekt se posune tak, aby tento bod byl přesně tam. Jako desetinný oddělovač jde i čárka.
- **Šířka / Výška** a **Zachovat poměr stran**: zadej rozměr, objekt se změní; zvolený vztažný bod zůstane na místě. Při výběru více objektů se mění a posouvají společně jako jeden celek.
- **Otočit**: úhel ve stupních, *Proti směru hodin* nebo *Po směru hodin*, kolem středu výběru.
- **Parametry tvaru** (vybraná jedna hvězda, mnohoúhelník, elipsa ...): změň počet cípů, poloměry, počet stran a stiskni *Použít parametry*; levý dolní roh zůstane. Pozdější změna velikosti nebo otočení parametry odstraní (je to pak obyčejný obrys).
- **Zrcadlit vlevo-vpravo / nahoru-dolů** překlopí výběr kolem jeho středu; **Přesunout na X0 Y0** dá jeho levý dolní roh na počátek.
- **Kopie**: *Kopie v řadě* vytvoří zadaný celkový počet objektů (včetně originálu) s krokem X / Y; *Kopie kolem bodu* otáčí kopie kolem středu X / Y (výchozí X0 Y0), 360 = celý kruh rovnoměrně, jiný úhel končí přesně na něm. Kopie se stanou výběrem; kopie jednoho tvaru si ponechají jeho parametry.
- Každá změna je jeden krok zpět (Ctrl+Z).

### Rohy a odsazení

Sekce panelu *Rohy a odsazení* (vyber jeden nebo více obrysů):

- **Velikost** + **Zaoblit rohy**: každý roh se změní na oblouk o tomto poloměru. **Zkosit**: každý roh se odřízne v této vzdálenosti na obou hranách. Roh smí využít nejvýš polovinu sousední hrany; kde velikost nevyjde, použije se menší a zpráva to oznámí. Otevřené čáry si ponechají koncové body. Obrys je pak obyčejný (parametry tvaru se zahodí); krok zpět vrátí původní.
- **Odsazení** + **Odsazená kopie**: přidá rovnoběžný obrys v dané vzdálenosti, ve vypouklých rozích s oblouky. Kladné číslo obrys zvětší, záporné zmenší (třeba přídavek na průměr frézy nebo vnitřní čára kapsy). Originál zůstane, nový obrys je vybraný. Odsadit lze jen uzavřené obrysy; když po zmenšení nic nezbyde, dostaneš zprávu.

### Kóty, měření a body zadané číslem

- Tlačítko **Kóty** (skupina Upravit) přepíná tři stavy: vypnuto, **Celkový rozměr** (šířka a výška výběru, nebo celého výkresu, když nic není vybráno) a **Každý objekt** (každý obrys dostane vlastní šířku a výšku, kruh průměr).
- Nabídka **Měřit**: *Vzdálenost dvou bodů* (délka, dX, dY a směr), *Úhel* (klikni na vrchol, pak na bod každého ramene) a *Průměr vybraných kruhů* (Ø a R). Nástroj zůstává aktivní pro další měření; Esc ho ukončí. Výsledky zůstanou na výkresu do *Smazat měření*. S projektem se neukládají.
- **Body zadané číslem**: když *Přesun A-B* nebo *Měření* čekají na bod, objeví se vlevo dole pole. Zadej `x,y` (absolutně), `@dx,dy` (vůči předchozímu bodu) nebo `@délka<úhel` (úhel ve stupních, proti směru hodin od osy X) a stiskni Enter - stejné jako klik. S desetinnou čárkou piš `12,5;30` nebo `12,5 30`.

### Výběr

- **Klik** na objekt; **Ctrl+klik** přidá nebo odebere objekt.
- **Tažení okna** na prázdném místě. Okno taženo **zleva doprava** (plný modrý rámeček) vybere, co leží **celé uvnitř**; taženo **zprava doleva** (čárkovaný zelený rámeček) vybere vše, čeho se **dotkne**.
- **Dvojklik** vybere všechny obrysy té skupiny objektů (celý importovaný výkres, celý text); Ctrl ponechá dosavadní výběr.
- **Opakovaný klik na stejné místo**, když objekty leží přes sebe: každé kliknutí vybere další (stavový řádek řekne kolik jich je).
- **Esc** zruší výběr; Ctrl+A vybere vše (jako dřív).
- **Zamknuto** (zaškrtnutí v panelu): objekt panel, úchyty, šipky ani Přesun A-B nezmění - hodí se pro hotový díl nebo obrys polotovaru. Kopie zamknuté nejsou.

### Přichytávání a „Přesun A-B“

Při zapnutém **Přichytávání** (skupina Upravit, ve výchozím stavu zapnuto) se ukazatel přitáhne k nejbližšímu užitečnému bodu do asi 10 pixelů: **koncovému bodu** (rohu) jiného objektu, **průsečíku** dvou obrysů, **středu** objektu, **středu úsečky** nebo - když nic jiného není poblíž - bodu **mřížky**. Růžová značka bod pojmenuje. Funguje pro nový tvar na myši (přichytit se může libovolný roh, střed hrany nebo střed tvaru), pro úchyty i pro *Přesun A-B*. Krok mřížky se nastaví v záložce Nastavení (*Mřížka přichytávání*: 1, 5, 10, 0,5, 0,1 mm nebo vypnuto).

**Přesun A-B**: vyber objekty, stiskni *Přesun A-B*, klikni na bod, *odkud* přesouvat (např. roh), a pak na bod, *kam* přesunout (např. roh jiného dílu). Objekty při výběru cíle sledují ukazatel; Esc nebo pravé tlačítko zruší a vrátí vše zpět.

### Úchyty a šipky

Výběr obklopuje čárkovaný rámeček s osmi úchyty. Táhni za **roh** pro poměrné zvětšení (s klávesou **Shift** se šířka a výška mění zvlášť); táhni za **střed hrany** pro změnu jedné strany. Protější roh nebo hrana zůstanou na místě a panel se při tažení mění s tebou. Kliknutí na úchyt bez tažení nic neudělá.

**Šipky** posunou výběr o 1 mm (Shift 10 mm, Alt 0,1 mm); při psaní do pole nic nedělají.

Tlačítko **Vlastnosti** ve skupině *Upravit* panel skryje nebo zobrazí. Tlačítko **Kóty** nakreslí na díl celkovou šířku a výšku výběru (nebo celého výkresu, když nic není vybráno). Řádek dole ve výkresu ukazuje polohu kurzoru a co dělat dál.

## Nové tvary jdou za myší

Po *Vytvořit* v dialogu tvaru visí nový tvar na kurzoru (středem pod ukazatelem). **Klik** ho položí, **Esc** ho dá na X0 Y0, **pravé tlačítko** ho zruší (nic se nepřidá). Záložka Nastavení, skupina *Editor*, tlačítko *Nové tvary*: *Myší* nebo *Na X0 Y0*. Panel pak ukáže přesnou polohu, kterou můžeš přepsat.

## Okno úprav (starý způsob)

Vyber objekt nástrojem pro úpravy a použij záložky **Měřítko**, **Poloha**, **Otočení**.

Vyber objekt a otevři okno úprav (záložky **Měřítko**, **Poloha**, **Otočení**).

### Měřítko

- **Šířka / Výška**: zadej rozměr v mm.
- **Zachovat poměr stran** (ve výchozím stavu zaškrtnuto): změna jedné strany změní i druhou, aby tvar zůstal podobný. Po odškrtnutí se mění jen jedna strana.
- **Měřítko %**: 100 = beze změny, 50 = polovina, 200 = dvojnásobek (vždy z velikosti při otevření okna).

### Poloha

Zadej levý, střední nebo pravý okraj (X) a spodní, střední nebo horní okraj (Y) v mm. Ostatní hodnoty se dopočítají.

### Otočení

Zadej úhel a stiskni *Proti směru hodin* nebo *Po směru hodin*.

> Drž všechny díly na X 0 a víc a Y 0 a víc. Swarfly upozorní, když uložený program zasahuje do záporných souřadnic, protože je stroj nemusí dosáhnout.
