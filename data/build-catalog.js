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
    h("co-setup", "Nastavení nástroje pro oslovování",
      "Konfigurace nástroje (Woodpecker, Instantly), napojení schránek, kroky sekvence, denní stropy.", 2, 6, 3),
    h("co-mailbox", "Zřízení odesílacích schránek a subdomény",
      "Vlastní odesílací subdoména a schránky, aby případný propad doručitelnosti nezasáhl hlavní doménu klienta. SPF, DKIM, DMARC.", 2, 5, 3),
    h("co-warmup", "Zahřívání domény a schránek",
      "Postupné zvyšování objemu na nové subdoméně. Samotná nižší kadence nestačí, zahřívání je placená funkce nástroje a hlídá se týdně.", 1, 4, 2),
    h("co-list-setup", "Sestavení prvního seznamu firem",
      "Zdroj dat, filtry, obohacení o kontaktní osoby, kontrola duplicit proti stávající databázi klienta.", 3, 10, 5),
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

// cold outreach na své místo: rozjezd za ostatní "before", provoz za ostatní "during"
const byPhase = (p) => cats.filter((c) => c.phase === p);
cats = [
  ...byPhase("before"),
  COLD_BEFORE,
  ...byPhase("during"),
  COLD_DURING,
  ...byPhase("adhoc"),
  OFFBOARDING,
];

cats.forEach((cat) => {
  cat.activities.forEach((a) => {
    a.role = ACCOUNT.has(a.id) ? "account" : "specialista";
  });
});

const doc = {
  verze: 9,
  zdroj:
    "Katalog vytažený z živé Macaly verze 23. 9. 2026, upravený podle poznámek z 22. 9. 2026 (ZADANI-v9.md).",
  faze: [
    { id: "before", cs: "Před začátkem", en: "Before start", de: "Vor dem Start" },
    { id: "during", cs: "V průběhu", en: "Ongoing", de: "Laufend" },
    { id: "adhoc", cs: "Ad hoc", en: "Ad hoc", de: "Ad hoc" },
    { id: "after", cs: "Na konci", en: "At the end", de: "Zum Abschluss" },
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
