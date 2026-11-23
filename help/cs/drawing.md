# Kreslení a tvary

Nabídka **Tvary** (záložka Projekt, skupina Vložit) přidá hotový uzavřený obrys. Každý tvar má malý dialog; špatná hodnota (třeba hvězda, jejíž vnitřní poloměr není menší než vnější) ukáže červenou zprávu a nic se nevytvoří.

- **Kruh**: poloměr, počet úseků (hladkost)
- **Obdélník**: šířka, výška
- **Zaoblený obdélník**: šířka, výška, poloměr rohů
- **Elipsa**: poloměr X, poloměr Y, počet úseků
- **Mnohoúhelník**: počet stran, poloměr k rohům
- **Hvězda**: počet cípů, vnější poloměr, vnitřní poloměr
- **Drážka**: celková délka, šířka (kulaté konce)

Nový tvar ve výchozím stavu visí na myši, dokud neklikneš (viz [Posun, měřítko, otočení](topic:edit)); při volbě *Na X0 Y0* (nebo po Esc) se všechny tvary, i kruh, umístí levým dolním rohem obalového rámečku na X0 Y0, takže jejich souřadnice nejsou záporné.

## Kreslení čar a úprava bodů

**Čára** (klávesa *L*, skupina Vytvořit): klikni na první bod a pak na další; každý klik přidá rovný úsek. **Tažením** s podrženým tlačítkem kreslíš volnou rukou - tah se vyhladí na pár bodů. S *Shiftem* jdou kroky po 15 stupních. Klik na první bod (nebo tah, který na něm skončí) čáru **uzavře**, otevřenou dokončíš *Enterem*, dvojklikem nebo pravým tlačítkem, *Backspace* vrátí poslední bod, *Esc* zruší. Při kreslení se u kurzoru ukazuje délka a úhel úseku, body se přichytávají na výkres a mřížku a bod můžeš zadat z klávesnice (`x,y`, `@dx,dy`, `@délka<úhel`) do pole vlevo dole. Nástroj zůstane zapnutý pro další čáru, dokud znovu nezmáčkneš Esc.

**Uzly** (klávesa *N*, skupina Úpravy) ukážou body vybrané čáry (nebo nejdřív na čáru klikni):

- **Posun**: klikni na bod a táhni (přichytává se na body a mřížku, *Shift* přichytávání vypne). *Shift*+klik přidá do výběru, okno tažené na prázdném místě vybere všechny body uvnitř, šipky posunou vybrané body (1 mm, *Shift* 10 mm, *Alt* 0,1 mm).
- **Ohnutí**: kosočtverec uprostřed úseku táhni do strany a úsek se stane obloukem přes kurzor. Dvojklik na kosočtverec ho zase narovná.
- **Přidat / smazat**: dvojklik na čáru tam přidá bod (na oblouku oblouk zůstane), *Delete* smaže vybrané body. Čára si nechá aspoň 2 body (uzavřená 3).
- Každá změna je jeden krok zpět. Posunutím bodu tvaru (obdélník, kruh ...) se z něj stane obyčejná čára, jeho parametry zmizí. Čáry s víc než 5000 body jsou na takovou úpravu příliš těžké.

## Text

*Text* ve skupině Vložit vytvoří řezné obrysy z písma; nastav výšku a před vložením se ukáže náhled ve skutečné velikosti. K výběru je 68 písem (všechna s českými znaky kromě tří starších ozdobných); **Noto Emoji**, **Noto Sans Symbols** a **Noto Sans Symbols 2** jsou obrázková písma - do textového pole napiš nebo vlož symboly jako ✂ ★ ☺ → (ve Windows otevře výběr symbolů Win + .).

## Import

*Otevřít* načte SVG, DXF a obrázky (obrázky se převedou na čáry). Načtené objekty se umístí na počátek pracovní plochy tak, aby se nepřekrývaly se stávajícími.

- **DXF** se podle nastavení `$INSUNITS` převede na milimetry (palce, stopy, centimetry, metry); zpráva ti řekne, že k tomu došlo. Soubor bez jednotek se bere jako milimetry.
- **SVG** s rozměry v `px` se čte při 96 dpi (400 px = 105,83 mm). Pro přesné rozměry nastav v kreslicím programu skutečné jednotky (mm).
- **Obrázky** (PNG, JPG, BMP, GIF) otevřou okno **Vektorizace obrázku**: náhled ukazuje blednoucí obrázek a přes něj obrysy. *Práh* určuje, co je kresba (začíná na automatické hodnotě; *automaticky* se k ní vrátí), *Obrátit* je pro bílé kresby na tmavém podkladu, *Středová čára* vytvoří JEDNU cestu uprostřed každého tahu místo dvou obrysů (vnitřního a vnějšího okraje; u tenkých čárových kreseb se zapne sama), *Vyhlazení* přepíná mezi ostrými rohy a hladkými křivkami, *Ignorovat tečky* zahodí prach a šum a *Šířka výsledku* nastaví skutečnou velikost v mm (výška se dopočítá). Průhledné plochy se berou jako papír. Tlačítkem *Importovat* obrysy načteš.
- **Text** uvnitř DXF nebo SVG nelze řezat a nenačte se - objeví se zpráva. Nejdřív ho převeď na křivky/cesty, nebo použij nástroj *Text*.

Viz také [Posun, měřítko, otočení](topic:edit).
