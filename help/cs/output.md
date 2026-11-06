# Uložení programu (.nc, SD karta)

Stiskni **Uložit G-kód** v panelu 4. Soubor se vždy uloží s příponou `.nc`.

## Název souboru

Název se bere z načteného výkresu: malá písmena, jen obyčejné ASCII znaky, nejvýše 8 znaků před tečkou (například `plan_001.svg` dá `plan_001.nc`, `Můj dlouhý výkres.svg` dá `muj_dlou.nc`). Krátké názvy jsou pro offline ovladač nejbezpečnější.

## Styl jako na kartě

Program se zapisuje jako programy, které už na stroji běží:

- bez komentářů a bez čekání `G4 P8`, jedno `G21`, potom `G90`
- konce řádků jako ve Windows (CRLF)
- končí `M5` a `M2`

Pokud souřadnice klesne pod nulu (X nebo Y), objeví se upozornění; stroj to místo nemusí dosáhnout.

## Jeden soubor na nástroj

Stroj sám nástroj nevymění. Když výkres používá víc nástrojů (například vrták 3 mm a frézu 3,175 mm), stiskni tlačítko s **vrstvami** vedle Uložit G-kód: okno vypíše soubory (`plat_01d.nc` = první soubor, vrták; `plat_02m.nc` = druhý soubor, fréza) a kolik drah který obsahuje. *Uložit soubory* je zapíše do jedné složky, kterou vybereš. Spouštěj je v uvedeném pořadí; před každým dalším souborem **vyměň nástroj a znovu nastav nulu Z** - stroj nemá korekci délky nástroje, takže stará nula Z pro nový nástroj neplatí. Když se používá jen jeden nástroj, stačí běžné Uložit G-kód.

## Na stroj

1. Zkopíruj soubor `.nc` na SD kartu (kořenová složka nebo složka, kterou používá tvůj ovladač).
2. Vlož kartu do offline ovladače a vyber soubor.
3. Nejdřív **řez na prázdno**: nástroj zvednutý nebo bez materiálu, sleduj celou dráhu.

> Nic, co Swarfly vyrobil, zatím neběželo na skutečném stroji. První zkouška je vždy řez na prázdno, potom odřezek.
