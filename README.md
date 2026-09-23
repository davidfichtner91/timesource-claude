# Time Source

Průvodce odhadem času na e-mailový projekt. Vybere se, co se u klienta bude dělat, doplní hodiny a vypadne z toho nacenění ve struktuře fáze 04 playbooku.

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

Editovat `data/activities.json` a spustit `node build.js`. Do `index.html` se nikdy nesahá ručně, při dalším buildu by se změna tiše ztratila.

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

## Jazyky

Výchozí je čeština. Angličtina a němčina zůstávají v katalogu, ale používají se jen na vyžádání klienta. U názvů se drží české pojmy (uvítací série, opuštěný košík), anglický termín je v tooltipu.

## Sdílecí odkaz

Stav se nese v adrese za mřížkou jako seznam `id:hodiny`. Devět úkonů vyjde na zhruba 210 znaků, takže zkracovač není potřeba. V odkazu není logo ani cíl spolupráce, jen vybrané úkony, hodiny, jméno klienta a sazba.

Projekt se ukládá i jako JSON tlačítkem v souhrnu. Ten patří ke klientovi do `nastroje/strategie-partner/clients/<slug>/`, ne mezi zdrojáky.

## Odkud se vzal katalog

Katalog je vytažený z verze běžící na timesource.davidfichtner.cz (postavené v Macaly) a upravený podle poznámek z 22. 9. 2026. Deset kategorií a 44 úkonů se rozrostlo na dvanáct a 54. Přibylo aktivní oslovování rozdělené na rozjezd a měsíční provoz, ukončení spolupráce a role u každého úkonu. Rozhodnutí bod po bodu jsou v `../ZADANI-v9.md`.

## Co je otevřené

- Nasazuje se přes Vercel, ne přes GitHub Pages. Projekt je statický, žádný build, výstupem je `index.html` v rootu. Proto v repozitáři není soubor `CNAME`, ten patří jen GitHub Pages.
- Presety hodin jsou převzaté z předchozí verze a nikdo neověřil, z jakého období pocházejí. Doplnit je z reálně odpracovaných měsíců, začít u CX Techu.
- Logo klienta v hlavičce se zatím nevkládá. Dřív bylo v JSON jako base64 a nafukovalo odkaz, proto vypadlo.
