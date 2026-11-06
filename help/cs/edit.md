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
