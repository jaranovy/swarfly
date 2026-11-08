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

## Text

*Text* ve skupině Vložit vytvoří řezné obrysy z písma; nastav výšku a před vložením se ukáže náhled ve skutečné velikosti. K výběru je 68 písem (všechna s českými znaky kromě tří starších ozdobných); **Noto Emoji**, **Noto Sans Symbols** a **Noto Sans Symbols 2** jsou obrázková písma - do textového pole napiš nebo vlož symboly jako ✂ ★ ☺ → (ve Windows otevře výběr symbolů Win + .).

## Import

*Otevřít* načte SVG, DXF a obrázky (obrázky se převedou na čáry). Načtené objekty se umístí na počátek pracovní plochy tak, aby se nepřekrývaly se stávajícími.

- **DXF** se podle nastavení `$INSUNITS` převede na milimetry (palce, stopy, centimetry, metry); zpráva ti řekne, že k tomu došlo. Soubor bez jednotek se bere jako milimetry.
- **SVG** s rozměry v `px` se čte při 96 dpi (400 px = 105,83 mm). Pro přesné rozměry nastav v kreslicím programu skutečné jednotky (mm).
- **Obrázky** (PNG, JPG, BMP, GIF) otevřou okno **Vektorizace obrázku**: náhled ukazuje blednoucí obrázek a přes něj obrysy. *Práh* určuje, co je kresba (začíná na automatické hodnotě; *automaticky* se k ní vrátí), *Obrátit* je pro bílé kresby na tmavém podkladu, *Středová čára* vytvoří JEDNU cestu uprostřed každého tahu místo dvou obrysů (vnitřního a vnějšího okraje; u tenkých čárových kreseb se zapne sama), *Vyhlazení* přepíná mezi ostrými rohy a hladkými křivkami, *Ignorovat tečky* zahodí prach a šum a *Šířka výsledku* nastaví skutečnou velikost v mm (výška se dopočítá). Průhledné plochy se berou jako papír. Tlačítkem *Importovat* obrysy načteš.
- **Text** uvnitř DXF nebo SVG nelze řezat a nenačte se - objeví se zpráva. Nejdřív ho převeď na křivky/cesty, nebo použij nástroj *Text*.

Viz také [Posun, měřítko, otočení](topic:edit).
