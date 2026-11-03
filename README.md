# @ktivity (dřív Time Source)

Nacenění e-mailového projektu. Na úvodní stránce se vybere šablona, na jedné stránce se upraví úkony a počty a vedle se průběžně počítá cena. Klientovi jdou jen částky (export do `.md` nebo tisk do PDF), hodiny, náklad a marže zůstávají v interním pohledu.

Otevírá se `index.html`. Je to jeden soubor bez závislostí, takže se dá poslat kolegovi jako příloha a otevřít dvojklikem. Nepotřebuje server ani build.

## Co kde je

| Cesta | Co to je |
|---|---|
| `index.html` | výsledná appka, **negenerovat ručně**, vzniká buildem |
| `app/index.template.html` | zdroj appky, sem se píšou změny rozhraní a výpočtu |
| `data/activities.json` | katalog kategorií a úkonů, zdroj pravdy pro obsah |
| `data/activities.raw.json` | katalog stažený z původní verze, podklad pro přestavbu |
| `data/build-catalog.js` | sestaví `activities.json` z raw katalogu a rozhodnutí |
| `build.js` | vloží katalog do šablony a zapíše `index.html` |

```bash
node build.js
```

Build zároveň hlídá dvě věci, na které se jinak zapomene. České texty nesmí obsahovat em pomlčku (v angličtině a němčině je správně) a v souboru musí zůstat Poppins.

## Jak přidat nebo změnit úkon

Editovat `data/build-catalog.js`, pak `node data/build-catalog.js` a `node build.js`. Do `data/activities.json` ani do `index.html` se ručně nesahá, oba se generují a změna by se při dalším buildu tiše ztratila.

Struktura úkonu:

```json
{
  "kind": "hours",
  "id": "co-wave",
  "name": { "cs": "...", "en": "...", "de": "..." },
  "tooltip": { "cs": "...", "en": "...", "de": "..." },
  "role": "specialista",
  "minHours": 1, "maxHours": 4, "avgHours": 2
}
```

`kind: "units"` místo hodin počítá počet jednotek krát sazba podle složitosti (`simple`, `standard`, `complex`). Používá se tam, kde se práce opakuje, typicky kampaně a sekvence.

`role` je `specialista` nebo `account`. Běžná komunikace a schvalovací kola se sem nepíšou, ta se připočítávají procentem z hodin specialisty v zadání projektu.

## Fáze

| id | Význam |
|---|---|
| `before` | rozjezd, jednorázově před startem |
| `during` | měsíční provoz, násobí se počtem měsíců |
| `adhoc` | nepravidelné zásahy nad rámec paušálu |
| `after` | ukončení spolupráce |

Rozdělení na rozjezd a provoz je podstatné. Bez něj vznikne jedna hromada hodin, ve které se jednorázová práce míchá s tou opakovanou a číslo nedává smysl ani nám, ani klientovi.

## Šablony

Šablona předvybere úkony i s počty a složitostí, account pak jen ubírá a ladí. Seznam je v `data/build-catalog.js` v `TYPY_PROJEKTU`: e-shop od nuly, měsíční správa, jednorázový audit, gastro rozjezd newsletteru, gastro audit a převzetí, aktivní oslovování. Build katalogu spadne, když šablona odkazuje na úkon, který v katalogu není.

## Cena, náklad a marže

Klientovi se fakturují částky, hodiny jsou jen interní (rozhodnuto 3. 11. 2026, model balíček za pevnou cenu a ad hoc práce zvlášť).

- **Cena** = hodiny podle katalogu × ceníková sazba, zaokrouhleno na stovky. Hodiny v katalogu jsou standardní náročnost, ne odhad toho, jak dlouho to dnes trvá.
- **Náklad** = skutečné hodiny × nákladová sazba. Skutečné hodiny počítá odhad úspory s Claudem (`uspora` u úkonu: texty 40 %, data 30 %, technika 20 %, schůzky 0 %), dokud se v interním pohledu nevyplní naměřené číslo.
- **Komunikace a schvalování** je procento z hodin specialisty v každé fázi a nezrychluje se.

Sazby a procenta v `NASTAVENI` jsou výchozí odhad (1 200 Kč/h cena, 700 Kč/h náklad, 20 % komunikace). Na úvodní stránce se dají přepsat, pamatují se v prohlížeči a ukládají se do souboru projektu. Odhady úspory i sazby se mají nahradit naměřenými hodnotami.

## Jazyky

Výchozí je čeština. Angličtina a němčina zůstávají v katalogu, ale používají se jen na vyžádání klienta. U názvů se drží české pojmy (uvítací série, opuštěný košík), anglický termín je v tooltipu.

## Sdílecí odkaz

Stav se nese v adrese za mřížkou jako seznam `id:hodiny`. Devět úkonů vyjde na zhruba 210 znaků, takže zkracovač není potřeba. V odkazu není logo ani cíl spolupráce, jen vybrané úkony, hodiny, jméno klienta a sazba.

Projekt se ukládá i jako JSON tlačítkem v souhrnu. Ten patří ke klientovi do `nastroje/strategie-partner/clients/<slug>/`, ne mezi zdrojáky.

## Odkud se vzal katalog

Katalog je vytažený z verze běžící na timesource.davidfichtner.cz (postavené v Macaly) a upravený podle poznámek z 22. 9. 2026. Deset kategorií a 44 úkonů se rozrostlo na dvanáct a 54. Přibylo aktivní oslovování rozdělené na rozjezd a měsíční provoz, ukončení spolupráce a role u každého úkonu. Rozhodnutí bod po bodu jsou v `../ZADANI-v9.md`.

## Co je otevřené

- Běží na https://aktivity-emailing.davidfichtner.cz/ (Vercel projekt `timesource`, nasazuje se sám po každém pushi do `main`). Projekt je statický, žádný build, výstupem je `index.html` v rootu. Stará Macaly verze zůstává na timesource.davidfichtner.cz, dokud se nevypne.
- Presety hodin jsou převzaté z předchozí verze a nikdo neověřil, z jakého období pocházejí. Doplnit je z reálně odpracovaných měsíců, začít u CX Techu.
- Logo klienta v hlavičce se zatím nevkládá. Dřív bylo v JSON jako base64 a nafukovalo odkaz, proto vypadlo.
