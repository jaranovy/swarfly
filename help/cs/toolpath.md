# Dráhy nástroje a operace

**Dráha nástroje** je jedna operace použitá na vybrané čáry. V projektu jich může být víc; řežou se v pořadí seznamu v panelu 2.

## Operace

- **Fréza: vektor (po čáře / uvnitř čáry / vně čáry)**: řez podél čáry, uvnitř nebo vně (hrana nástroje sleduje čáru).
- **Fréza: kapsa**: odebere celou plochu uvnitř uzavřeného obrysu.
- **Vrtání: s vybíráním třísek / plynulé**: vrtání děr do středů kružnic.
- **Laser: vektor (po čáře / uvnitř / vně)** a *rastrová výplň (beta)*: viz [Laser](topic:laser).
- **Plazma**, **Tažný nůž**, **Plotr s perem**: další nástroje původního programu, na tomto stroji nezkoušené.

## Hlavní hodnoty

- **Průměr frézy** a **Boční přesah**: velikost nástroje a vzdálenost průchodů v kapse.
- **Bezpečná výška Z**: výška pro rychlé přejezdy nad materiálem.
- **Hloubka řezu: začátek / konečná / na jeden průchod**: jak hluboko a kolik za jeden průchod.
- **Posuv (X/Y)** a **Posuv: zanořování**: rychlost řezání a rychlost zajíždění dolů.
- **Vřeteno: otáčky**: zapíše se jako hodnota S.
- **Směr frézování**: sousledně nebo nesousledně.

Počáteční hodnoty pocházejí z předvolby 3018 a jsou jen výchozí: před řezáním je porovnej s programy, o kterých víš, že na tvém stroji běží (přísuv na průchod, posuvy, velikost nástroje).

> Dráha *vně* / *uvnitř* posune čáru o polovinu průměru nástroje. Špatný průměr znamená špatnou velikost dílu.
