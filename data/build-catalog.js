// Sestaví data/activities.json z katalogu vytaženého z živé appky (data/activities.raw.json)
// a z rozhodnutí v ZADANI-v9.md. Pouštět po každé změně raw katalogu:
//   node data/build-catalog.js

const fs = require("fs");
const path = require("path");

const raw = require("./activities.raw.json");

// ── 1. České texty bez em pomlček ──────────────────────────────────────────────
const CZ_FIX = {
  "Výběr správného nástroje a jeho základní konfigurace — základ celé spolupráce.":
    "Výběr správného nástroje a jeho základní konfigurace. Základ celé spolupráce.",
  "Zakládání účtu, základní nastavení — odesílatel, branding, timezone, měna, notifikace.":
    "Zakládání účtu a základní nastavení: odesílatel, branding, časová zóna, měna, notifikace.",
  "Schůzka s klientem — cíle, procesy, odpovědnosti, harmonogram. Online call ~1 h + příprava a zápisky ~1 h.":
    "Schůzka s klientem o cílech, procesech, odpovědnostech a harmonogramu. Hovor zhruba hodina, příprava a zápis další hodina.",
  "Analýza stávajícího stavu — seznam, kampaně, flows, doručitelnost, metriky. Závisí na objemu historických dat.":
    "Analýza stávajícího stavu: databáze, kampaně, automatizace, doručitelnost, metriky. Závisí na objemu historických dat.",
  "Přesun kampaní, flows, šablon, kontaktů z jedné platformy do druhé. Závisí na rozsahu — počet flows, velikost databáze.":
    "Přesun kampaní, automatizací, šablon a kontaktů z jedné platformy do druhé. Závisí na počtu automatizací a velikosti databáze.",
  "Flows které se nastavují jednou a pak běží automaticky — základ každé spolupráce.":
    "Automatizace, které se nastaví jednou a pak běží samy. Základ každé spolupráce.",
  "Série po zakoupení — potvrzení, doporučení, upsell, recenze.":
    "Série po zakoupení: potvrzení, doporučení, upsell, recenze.",
  "Reaktivace neaktivních kontaktů — série se sunset protokolem.":
    "Reaktivace neaktivních kontaktů, série zakončená vyřazením.",
  "Pravidelné kampaně — newslettery, promo, sezónní akce. Hodiny = na 1 kampaň × počet kampaní / měsíc.":
    "Pravidelné kampaně: newslettery, promo akce, sezónní rozesílky. Hodiny se zadávají na jednu kampaň a násobí počtem kampaní za měsíc.",
  "A/B test — příprava a vyhodnocení": "A/B test, příprava a vyhodnocení",
  "Jednorázové strategické aktivity nad rámec retaineru — typicky projektově fakturované.":
    "Jednorázové strategické aktivity nad rámec paušálu, typicky fakturované projektově.",
  "Tvorba komplexní strategie — cíle, kanály, flows, frekvence, segmenty. Menší klient ~4 h; multi-market ~12 h.":
    "Tvorba komplexní strategie: cíle, kanály, automatizace, frekvence, segmenty. Menší klient zhruba 4 hodiny, vícetrhový projekt zhruba 12 hodin.",
  "Nepravidelné technické úkony — řešení problémů s doručitelností, migrace a integrace.":
    "Nepravidelné technické úkony, řešení potíží s doručitelností, migrace a integrace.",
  "Nastavení a řízení B2B studené emailové kampaně — oddělená disciplína od e-mail marketingu.":
    "Nastavení a provoz aktivního oslovování firem. Samostatná disciplína, ne newsletter.",
};

// ── 2. České názvosloví místo anglického ──────────────────────────────────────
// Anglický termín zůstává v tooltipu, v názvu je česky. Rozhodl David 22. 9. 2026.
const CZ_NAME = {
  "if-welcome": "Uvítací série",
  "if-cart": "Opuštěný košík",
  "if-postpurchase": "Série po nákupu",
  "if-winback": "Reaktivační série",
  "if-browse": "Opuštěná prohlídka zboží",
  "if-b2b": "Série pro B2B poptávky",
  "ob-warmup": "Zahřívání nové domény nebo IP",
  "tt-suppression": "Správa seznamu vyřazených kontaktů",
  "st-multimarket": "Vícejazyčný a vícetrhový setup",
};

// ── 3. Role u úkonu ───────────────────────────────────────────────────────────
// Výchozí je specialista. Account jsou úkony, kde je klient u toho.
// Čas na běžnou komunikaci a schvalování se nepočítá tady, ale procentem
// z hodin specialisty, viz ZADANI-v9.md.
const ACCOUNT = new Set([
  "ob-briefing",
  "re-quarterly",
  "st-workshop",
  "st-consult",
  "co-replies",
  "of-handover",
  "co-briefing",
]);

// ── 4. Nové kategorie a úkony ─────────────────────────────────────────────────
const h = (id, cs, tip, min, max, avg) => ({
  kind: "hours",
  id,
  name: { cs, en: cs, de: cs },
  tooltip: { cs: tip, en: tip, de: tip },
  minHours: min,
  maxHours: max,
  avgHours: avg,
});

// Copywriting sekvence z raw katalogu počítal se třemi až pěti kroky. Automatická
// sekvence má ale vždy jen dva e-maily (oslovení a jedno navázání), třetí zpráva
// se píše ručně mimo ni. Složitost se proto liší personalizací, ne počtem kroků.
// Hodiny na jednotku zůstávají z raw katalogu, dokud je nenahradí odpracované.
const SEKVENCE = {
  kind: "units",
  id: "co-sequence",
  name: {
    cs: "Copywriting oslovovací sekvence",
    en: "Outreach sequence copywriting",
    de: "Copywriting der Outreach-Sequenz",
  },
  tooltip: {
    cs: "Dva automatické e-maily: první oslovení a jedno navázání. Třetí zprávu, kde dává smysl, píše obchod ručně mimo sekvenci.",
    en: "Two automated emails: the first touch and one follow-up. Any third message is written by hand outside the sequence.",
    de: "Zwei automatische E-Mails: Erstansprache und ein Follow-up. Eine dritte Nachricht wird manuell außerhalb der Sequenz geschrieben.",
  },
  unitLabel: { cs: "sekvence", en: "sequence", de: "Sequenz" },
  complexity: {
    simple: {
      label: { cs: "Bez personalizace", en: "No personalisation", de: "Ohne Personalisierung" },
      hoursPerUnit: 2,
    },
    standard: {
      label: { cs: "Personalizace podle segmentu", en: "Personalised by segment", de: "Nach Segment personalisiert" },
      hoursPerUnit: 4,
    },
    complex: {
      label: { cs: "Víc person nebo jazyků", en: "Several personas or languages", de: "Mehrere Personas oder Sprachen" },
      hoursPerUnit: 7,
    },
  },
};

const COLD_BEFORE = {
  id: "cold-outreach-setup",
  phase: "before",
  icon: "📤",
  name: {
    cs: "Aktivní oslovování, rozjezd",
    en: "Cold outreach, setup",
    de: "Cold Outreach, Setup",
  },
  description: {
    cs: "Jednorázové nastavení kanálu aktivního oslovování, než odejde první vlna.",
    en: "One-off setup of the outreach channel before the first wave goes out.",
    de: "Einmaliges Setup des Outreach-Kanals vor der ersten Welle.",
  },
  activities: [
    h("co-briefing", "Úvodní schůzka a zadání oslovování",
      "Cílová skupina, nabídka, kdo odpovědi převezme a co se počítá jako úspěch.", 1, 3, 2),
    h("co-setup", "Nastavení nástroje pro oslovování",
      "Konfigurace nástroje (Woodpecker, Instantly), napojení schránek, kroky sekvence, denní stropy.", 2, 6, 3),
    h("co-mailbox", "Zřízení odesílacích schránek a subdomény",
      "Vlastní odesílací subdoména a schránky, aby případný propad doručitelnosti nezasáhl hlavní doménu klienta. SPF, DKIM, DMARC.", 2, 5, 3),
    h("co-warmup", "Zahřívání domény a schránek",
      "Postupné zvyšování objemu na nové subdoméně. Samotná nižší kadence nestačí, zahřívání je placená funkce nástroje a hlídá se týdně.", 1, 4, 2),
    h("co-list-setup", "Sestavení prvního seznamu firem",
      "Zdroj dat, filtry, obohacení o kontaktní osoby, kontrola duplicit proti stávající databázi klienta.", 3, 10, 5),
    SEKVENCE,
  ],
};

const COLD_DURING = {
  id: "cold-outreach-run",
  phase: "during",
  icon: "📨",
  name: {
    cs: "Aktivní oslovování, provoz",
    en: "Cold outreach, monthly run",
    de: "Cold Outreach, Betrieb",
  },
  description: {
    cs: "Co se u aktivního oslovování opakuje každý měsíc. Tohle je hlavní práce, ne rozjezd.",
    en: "The monthly work on an outreach channel. This is where the effort actually sits.",
    de: "Die monatliche Arbeit am Outreach-Kanal.",
  },
  activities: [
    h("co-list-monthly", "Doplnění a čištění seznamu",
      "Nové firmy do fronty, vyřazení těch, které odpověděly nebo se odhlásily.", 1, 4, 2),
    h("co-snippets", "Příprava a kontrola snippetů před vlnou",
      "Personalizační pole se doplňují ručně a prázdný snippet zastaví celou vlnu. Kontrola před spuštěním, ne formalita.", 1, 3, 1.5),
    h("co-wave", "Spuštění a hlídání vlny",
      "Sledování fronty, stropu schránky a pozastavených kampaní v průběhu měsíce.", 1, 4, 2),
    h("co-replies", "Třídění odpovědí a předání obchodu",
      "Odlišení autoresponderu od lidské odpovědi, určení typu zájmu, předání obchodu a zápis, co se s odpovědí stalo.", 1, 5, 2),
    h("co-report", "Měsíční report aktivního oslovování",
      "Jiný formát než u e-shopu. Trychtýř k doručeným, odpovědi po typech, schůzky. Bez CTR a CTOR.", 2, 5, 3),
  ],
};

const OFFBOARDING = {
  id: "offboarding",
  phase: "after",
  icon: "📦",
  name: {
    cs: "Ukončení spolupráce",
    en: "Offboarding",
    de: "Offboarding",
  },
  description: {
    cs: "Co se musí udělat na konci, aby si klient odnesl funkční účet a my čisté předání.",
    en: "What has to happen at the end so the client keeps a working account.",
    de: "Was am Ende passieren muss, damit der Kunde ein funktionierendes Konto behält.",
  },
  activities: [
    h("of-handover", "Předávací dokument a schůzka",
      "Soupis účtů, automatizací, segmentů a pravidelných úkonů, plus schůzka, kde se to předá.", 2, 6, 3),
    h("of-access", "Předání přístupů a odpojení",
      "Převod vlastnictví účtu, odebrání našich uživatelů, API klíčů a integrací.", 1, 3, 1.5),
    h("of-export", "Export dat a podkladů",
      "Databáze, šablony, zadání kampaní, reporty. To, co zůstane klientovi i bez nás.", 1, 4, 2),
  ],
};

// ── sestavení ─────────────────────────────────────────────────────────────────
function fixStrings(node) {
  if (typeof node === "string") return CZ_FIX[node] ?? node;
  if (Array.isArray(node)) return node.map(fixStrings);
  if (node && typeof node === "object") {
    const o = {};
    for (const k of Object.keys(node)) o[k] = fixStrings(node[k]);
    return o;
  }
  return node;
}

let cats = fixStrings(raw).filter((c) => c.id !== "cold-outreach");

cats.forEach((cat) => {
  cat.activities.forEach((a) => {
    if (CZ_NAME[a.id]) {
      const old = a.name.cs;
      a.name.cs = CZ_NAME[a.id];
      if (!a.tooltip.cs.includes(old)) a.tooltip.cs += " Anglicky " + old + ".";
    }
  });
});

// Automatizace se jednou postaví, ale pak se musí hlídat, ladit a obměňovat.
// Bez téhle kategorie by nacenění tvrdilo, že po rozjezdu běží samy. Doplněno 3. 11. 2026.
const AUTOMATIZACE_PECE = {
  id: "automation-care",
  phase: "during",
  icon: "🔁",
  name: { cs: "Péče o automatizace", en: "Automation care", de: "Pflege der Automationen" },
  description: {
    cs: "Automatizace po spuštění nežijí samy. Kontrola, ladění podle výsledků a obměna obsahu.",
    en: "Automations need checking, tuning and fresh content after launch.",
    de: "Automationen brauchen nach dem Start Kontrolle, Optimierung und neue Inhalte.",
  },
  activities: [
    h("au-qa", "Kontrola funkčnosti automatizací",
      "Spouštěče, podmínky, odkazy, slevové kódy a prázdné větve. Rozbitá automatizace mlčí, nikdo si toho nevšimne.", 0.5, 2, 1),
    h("au-tuning", "Ladění automatizací podle výsledků",
      "Úprava textů, předmětů, časování a podmínek podle open rate, prokliků a tržeb. Navazuje na analýzu výkonu.", 1, 4, 2),
    h("au-seasonal", "Obměna obsahu automatizací",
      "Sezónní a akční úpravy, nové produkty, menu nebo ceny. U gastra a sezónního zboží každý měsíc.", 0.5, 3, 1),
  ],
};

const AUTOMATIZACE_ROZSIRENI = {
  id: "automation-extend",
  phase: "adhoc",
  icon: "➕",
  name: { cs: "Rozšíření automatizací", en: "Extending automations", de: "Erweiterung der Automationen" },
  description: {
    cs: "Nové automatizace a úklid starých během spolupráce, mimo rozjezd.",
    en: "New automations and retiring old ones during the engagement.",
    de: "Neue Automationen und Abbau alter während der Zusammenarbeit.",
  },
  activities: [
    {
      kind: "units",
      id: "au-new",
      name: { cs: "Nová automatizace", en: "New automation", de: "Neue Automation" },
      tooltip: {
        cs: "Automatizace přidaná během spolupráce, například narozeninová, po rezervaci nebo pro věrnostní program.",
        en: "An automation added during the engagement.",
        de: "Eine während der Zusammenarbeit hinzugefügte Automation.",
      },
      unitLabel: { cs: "automatizace", en: "automation", de: "Automation" },
      complexity: {
        simple: { label: { cs: "Jeden e-mail", en: "One email", de: "Eine E-Mail" }, hoursPerUnit: 4 },
        standard: { label: { cs: "Série 2 až 4 e-mailů", en: "Series of 2 to 4 emails", de: "Serie mit 2 bis 4 E-Mails" }, hoursPerUnit: 8 },
        complex: { label: { cs: "Větvená série", en: "Branched series", de: "Verzweigte Serie" }, hoursPerUnit: 14 },
      },
    },
    h("au-retire", "Vypnutí nebo sloučení automatizace",
      "Zrušení automatizace, která nefunguje nebo se překrývá s jinou, bez výpadku pro odběratele, kteří jsou zrovna uvnitř.", 0.5, 2, 1),
  ],
};

// cold outreach na své místo: rozjezd za ostatní "before", provoz za ostatní "during"
const byPhase = (p) => cats.filter((c) => c.phase === p);
cats = [
  ...byPhase("before"),
  COLD_BEFORE,
  ...byPhase("during"),
  AUTOMATIZACE_PECE,
  COLD_DURING,
  ...byPhase("adhoc"),
  AUTOMATIZACE_ROZSIRENI,
  OFFBOARDING,
];

// Aktivní oslovování dodává GetLeads, B2B divize CreatiComu. V appce i v nacenění
// má vlastní označení a logo, aby klient viděl, kdo za kterou částí stojí.
COLD_BEFORE.divize = "getleads";
COLD_DURING.divize = "getleads";

// ── 4b. Odhad úspory času s Claudem ───────────────────────────────────────────
// Podíl času, který na úkonu ušetří práce s Claudem. VÝCHOZÍ ODHAD z 3. 11. 2026,
// ne měření. Přepsat podle odpracovaných hodin. Schůzky a práce accounta se
// nezrychlují, texty a podklady nejvíc, technické nastavení nejméně.
const USPORA_TEXTY = 0.4;     // copywriting, šablony, automatizace, reporty, strategie, audit
const USPORA_DATA = 0.3;      // import, čištění, segmenty, seznamy firem
const USPORA_TECHNIKA = 0.2;  // DNS, integrace, nastavení nástrojů, migrace, řešení potíží
const TEXTOVE = /^(if-|ca-|au-tuning|au-seasonal|au-new|re-monthly|re-flows|co-sequence|co-report|ob-template|ob-audit|st-strategy|st-fullaudit|st-multimarket)/;
const DATOVE = /^(ob-import|ob-lists|lm-|co-list|co-snippets|co-wave)/;

cats.forEach((cat) => {
  cat.activities.forEach((a) => {
    a.role = ACCOUNT.has(a.id) ? "account" : "specialista";
    a.uspora = a.role === "account" ? 0
      : TEXTOVE.test(a.id) ? USPORA_TEXTY
      : DATOVE.test(a.id) ? USPORA_DATA
      : USPORA_TECHNIKA;
  });
});

// ── 4c. Popis pro klienta ─────────────────────────────────────────────────────
// Odborný název zůstává, pod ním jde v nacenění jedna věta lidsky: co klient
// dostane a proč. Pravidla pro texty příjemcům platí i tady (bez rodu, bez davu).
const POPIS_KLIENT = {
  "pl-eval": "Doporučení nástroje, který bude odpovídat velikosti databáze, rozpočtu a plánům.",
  "pl-account": "Založení účtu a základní nastavení, aby se z něj dalo hned posílat.",
  "pl-dns": "Ověření domény, aby e-maily nekončily ve spamu a nikdo je nemohl podvrhnout.",
  "pl-senddomain": "E-maily odcházejí z vlastní domény, ne z obecné adresy nástroje.",
  "pl-integration": "Propojení s e-shopem nebo rezervačním systémem, aby se kontakty a nákupy propisovaly samy.",
  "ob-briefing": "Úvodní schůzka o cílech, zákaznících a tom, kdo co schvaluje.",
  "ob-audit": "Rozbor dosavadních kampaní a dat s tím, co funguje a co opravit.",
  "ob-import": "Převod kontaktů do nástroje a vyřazení neplatných nebo duplicitních adres.",
  "ob-lists": "Rozdělení kontaktů do skupin, aby šlo psát každé skupině zvlášť.",
  "ob-template": "Grafická šablona e-mailu v barvách a stylu značky, správně zobrazená i na mobilu.",
  "ob-optin": "Formuláře na webu, přes které se nové kontakty přihlašují k odběru.",
  "ob-doubleoptin": "Potvrzení přihlášení e-mailem. Chrání databázi před falešnými adresami a splňuje GDPR.",
  "ob-utm": "Označení odkazů, aby bylo v analytice vidět, kolik návštěv a tržeb přinesl e-mail.",
  "ob-migration": "Převod kontaktů, šablon a automatizací z dosavadního nástroje bez ztráty dat.",
  "ob-warmup": "Postupné zvyšování objemu u nové domény, aby si ji schránky nezařadily mezi spam.",
  "if-welcome": "E-maily, které nový odběratel dostane hned po přihlášení. Představí značku a nabídnou první důvod k nákupu nebo návštěvě.",
  "if-cart": "Připomenutí zboží, které zůstalo v košíku bez dokončené objednávky.",
  "if-postpurchase": "E-maily po nákupu: poděkování, tipy k produktu a žádost o recenzi.",
  "if-winback": "Série pro zákazníky, kteří delší dobu nenakoupili, s pozvánkou zpět.",
  "if-browse": "Připomenutí produktů, které si někdo prohlížel a nekoupil.",
  "if-b2b": "Navazující e-maily po poptávce, aby obchodní příležitost nevychladla.",
  "co-briefing": "Úvodní schůzka o cílové skupině, nabídce a předávání zájemců obchodu.",
  "co-setup": "Nastavení nástroje, ze kterého se oslovovací e-maily posílají.",
  "co-mailbox": "Samostatné odesílací schránky a doména, aby oslovování neohrozilo běžnou poštu firmy.",
  "co-warmup": "Postupné zahřívání nových schránek, aby e-maily od začátku chodily do doručené pošty.",
  "co-list-setup": "Výběr firem a kontaktních osob, které má smysl oslovit.",
  "co-sequence": "Text prvního oslovení a jednoho navázání.",
  "ca-campaign": "Kompletní e-mail od zadání přes text a grafiku po odeslání správné skupině.",
  "ca-abtest": "Porovnání dvou variant předmětu nebo obsahu a vyhodnocení, která funguje lépe.",
  "lm-cleaning": "Pravidelné vyřazování neaktivních a nefunkčních adres, které zhoršují doručitelnost.",
  "lm-import": "Doplnění nových kontaktů, například z akcí nebo z provozovny.",
  "lm-segment": "Úprava skupin kontaktů podle chování, aby e-maily šly tomu, koho zajímají.",
  "lm-tags": "Údržba štítků a doplňujících údajů u kontaktů.",
  "re-monthly": "Přehled výsledků za měsíc s komentářem a doporučením na další měsíc.",
  "re-flows": "Kontrola výkonu automatických e-mailů a návrh úprav.",
  "re-quarterly": "Čtvrtletní schůzka nad výsledky a plánem na další období.",
  "tt-monitoring": "Hlídání, jestli e-maily dorážejí do doručené pošty a ne do spamu.",
  "tt-dns": "Kontrola, že ověření domény zůstává platné.",
  "tt-suppression": "Správa adres, na které se nesmí posílat, například odhlášených.",
  "co-list-monthly": "Doplnění dalších firem k oslovení a vyřazení těch, které už odpověděly.",
  "co-snippets": "Kontrola personalizace před odesláním, aby žádný e-mail neodešel s prázdným polem.",
  "co-wave": "Spuštění měsíčního oslovování a hlídání, že běží bez potíží.",
  "co-replies": "Roztřídění odpovědí a předání zájemců obchodu.",
  "co-report": "Přehled, kolik firem bylo osloveno, kolik odpovědělo a kolik schůzek vzniklo.",
  "st-strategy": "Plán e-mailingu: komu, co a jak často posílat a jaké automatizace postavit.",
  "st-fullaudit": "Hloubkový rozbor celého e-mailingu s prioritizovanými doporučeními.",
  "st-consult": "Konzultace k aktuální otázce mimo běžnou správu.",
  "st-workshop": "Školení týmu, jak s e-mailingem pracovat.",
  "st-multimarket": "Nastavení pro víc jazyků nebo zemí, aby každý trh dostával vlastní obsah.",
  "ta-blacklist": "Řešení situace, kdy se doména nebo IP adresa dostane na seznam spammerů.",
  "ta-bounce": "Zjištění, proč se e-maily vracejí jako nedoručitelné, a náprava.",
  "ta-api": "Technická pomoc při propojení nástroje s dalšími systémy.",
  "ta-migration": "Převod e-mailingu do jiného nástroje jako samostatný projekt.",
  "of-handover": "Předávací dokument a schůzka se soupisem všeho, co v účtu běží.",
  "of-access": "Předání vlastnictví účtu a odebrání přístupů agentury.",
  "of-export": "Předání databáze, šablon a reportů, aby zůstaly k dispozici i po ukončení spolupráce.",
  "au-qa": "Pravidelná kontrola, že automatické e-maily chodí, odkazy fungují a kódy platí.",
  "au-tuning": "Úpravy textů, časování a podmínek podle toho, co přináší nejlepší výsledky.",
  "au-seasonal": "Aktualizace obsahu automatických e-mailů podle sezóny, akcí a nabídky.",
  "au-new": "Nová automatická série přidaná během spolupráce, třeba k narozeninám nebo po rezervaci.",
  "au-retire": "Vypnutí nebo sloučení automatizace, která už neplní svůj účel.",
};

cats.forEach((cat) => cat.activities.forEach((a) => {
  if (!POPIS_KLIENT[a.id]) throw new Error("Úkon " + a.id + " nemá popis pro klienta v POPIS_KLIENT");
  a.popisKlient = { cs: POPIS_KLIENT[a.id] };
}));

// ── 5. Šablony nacenění ───────────────────────────────────────────────────────
// Předvyberou úkony i s počty, account pak jen ubírá a ladí. Úkon se zapisuje jako
// id (průměrné hodiny, jedna jednotka standardní složitosti), nebo jako objekt
// s hodinami, počtem jednotek a složitostí. E-shop, správa a audit jsou převzaté
// z Macaly verze, oslovování a gastro přibyly 3. 11. 2026.
const TYPY_PROJEKTU = [
  {
    id: "eshop",
    name: { cs: "E-shop od nuly", en: "E-shop from scratch", de: "E-Shop von Grund auf" },
    popis: { cs: "Nový e-shop bez e-mailingu. Nástroj, šablona, základní automatizace a první kampaně." },
    ukony: [
      "pl-eval", "pl-account", "pl-dns", "pl-senddomain", "pl-integration",
      "ob-briefing", "ob-audit", "ob-import", "ob-lists", "ob-template", "ob-optin", "ob-doubleoptin", "ob-utm",
      "if-welcome", "if-cart", "if-postpurchase", "if-winback",
      { id: "ca-campaign", units: 2 }, "lm-cleaning", "lm-segment", "re-monthly", "tt-monitoring",
      "au-qa", "au-tuning",
    ],
  },
  {
    id: "sprava",
    name: { cs: "Měsíční správa stávajícího klienta", en: "Monthly management, existing client", de: "Monatliche Betreuung, Bestandskunde" },
    popis: { cs: "Klient už e-mailing má. Kampaně, péče o databázi a report každý měsíc." },
    ukony: [
      { id: "ca-campaign", units: 2 }, "ca-abtest", "lm-cleaning", "lm-import", "lm-segment",
      "re-monthly", "re-flows", "tt-monitoring", "tt-dns", "au-qa", "au-tuning",
    ],
  },
  {
    id: "audit",
    name: { cs: "Jednorázový audit", en: "One-off audit", de: "Einmaliger Audit" },
    popis: { cs: "Rozbor stávajícího e-mailingu s doporučeními, bez navazující správy." },
    ukony: ["ob-briefing", "st-fullaudit", "st-strategy", "st-consult"],
  },
  {
    id: "gastro-start",
    name: { cs: "Gastro: rozjezd newsletteru", en: "Hospitality: newsletter launch", de: "Gastro: Newsletter-Start" },
    popis: { cs: "Restaurace nebo bar bez e-mailingu. Nástroj, šablona v brandu, sběr kontaktů, uvítací e-mail a dva newslettery měsíčně." },
    ukony: [
      "pl-eval", "pl-account", "pl-dns", "ob-briefing", "ob-import", "ob-lists", "ob-template",
      "ob-optin", "ob-doubleoptin", "ob-utm",
      { id: "if-welcome", cx: "simple" },
      { id: "ca-campaign", units: 2, cx: "simple" }, "lm-cleaning", { id: "re-monthly", cx: "simple" }, "tt-monitoring",
      { id: "au-qa", hours: 0.5 }, "au-seasonal",
    ],
  },
  {
    id: "gastro-audit",
    name: { cs: "Gastro: audit a převzetí newsletteru", en: "Hospitality: audit and takeover", de: "Gastro: Audit und Übernahme" },
    popis: { cs: "Podnik newsletter posílá. Audit, nová šablona a měsíční správa dvou newsletterů." },
    ukony: [
      "ob-briefing", "ob-audit", "ob-template", "ob-lists",
      { id: "if-welcome", cx: "simple" },
      { id: "ca-campaign", units: 2, cx: "simple" }, "lm-cleaning", "lm-segment", { id: "re-monthly", cx: "simple" }, "tt-monitoring",
      { id: "au-qa", hours: 0.5 }, "au-tuning", "au-seasonal",
    ],
  },
  {
    id: "osloveni",
    name: { cs: "Aktivní oslovování", en: "Cold outreach", de: "Cold Outreach" },
    popis: { cs: "Oslovování firem dvěma automatickými e-maily. Rozjezd domény a schránek, pak měsíční vlny." },
    ukony: [
      "co-briefing", "co-setup", "co-mailbox", "co-warmup", "co-list-setup", "co-sequence",
      "co-list-monthly", "co-snippets", "co-wave", "co-replies", "co-report",
    ],
  },
];

const vsechnyId = new Set(cats.flatMap((c) => c.activities.map((a) => a.id)));
TYPY_PROJEKTU.forEach((typ) => {
  typ.ukony = typ.ukony.map((u) => (typeof u === "string" ? { id: u } : u));
  typ.ukony.forEach((u) => {
    if (!vsechnyId.has(u.id)) throw new Error("Šablona " + typ.id + " odkazuje na neexistující úkon " + u.id);
  });
});

// ── 6. Výchozí sazby ──────────────────────────────────────────────────────────
// Klientovi se fakturují částky, hodiny jsou jen interní. VÝCHOZÍ HODNOTY, přepsat
// skutečnými. Nákladová sazba je zvolená tak, aby poměr cena / náklad bez Clauda
// vyšel kolem 1,7, což odpovídá ROI 1,66 hlášenému za CreatiCom v listopadu 2026.
const NASTAVENI = {
  cenovaSazba: 1200,
  nakladovaSazba: 700,
  komunikace: 20,
  zaokrouhleni: 100,
};

const doc = {
  verze: 11,
  zdroj:
    "Katalog vytažený z živé Macaly verze 23. 9. 2026, upravený podle poznámek z 22. 9. 2026 (ZADANI-v9.md). Šablony, úspora s Claudem a sazby doplněny 3. 11. 2026.",
  nastaveni: NASTAVENI,
  typyProjektu: TYPY_PROJEKTU,
  faze: [
    { id: "before", cs: "Rozjezd", en: "Setup", de: "Start", fakturace: { cs: "jednorázově" } },
    { id: "during", cs: "Měsíční správa", en: "Monthly management", de: "Monatliche Betreuung", fakturace: { cs: "měsíčně" } },
    { id: "adhoc", cs: "Na vyžádání", en: "On request", de: "Auf Anfrage", fakturace: { cs: "při objednání" } },
    { id: "after", cs: "Ukončení spolupráce", en: "Offboarding", de: "Offboarding", fakturace: { cs: "jednorázově na konci" } },
  ],
  kategorie: cats,
};

const out = path.join(__dirname, "activities.json");
fs.writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");

const pocet = cats.reduce((a, c) => a + c.activities.length, 0);
console.log("kategorií " + cats.length + ", úkonů " + pocet);

// kontrola: v českých textech nesmí zůstat em pomlčka
const json = fs.readFileSync(out, "utf8");
const bad = [];
JSON.parse(json).kategorie.forEach((c) => {
  const scan = (o, p) => {
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === "string") {
        if (k === "cs" && v.includes("—")) bad.push(p + " :: " + v);
      } else if (v && typeof v === "object") scan(v, p + "." + k);
    }
  };
  scan(c, c.id);
});
console.log(bad.length ? "EM POMLČKY:\n" + bad.join("\n") : "české texty bez em pomlček");
