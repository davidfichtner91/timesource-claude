// Sestaví index.html z app/index.template.html a data/activities.json.
// Katalog se vkládá dovnitř, aby soubor šel poslat jako příloha a otevřít dvojklikem.
//   node build.js

const fs = require("fs");
const path = require("path");

const tpl = fs.readFileSync(path.join(__dirname, "app", "index.template.html"), "utf8");
const cat = fs.readFileSync(path.join(__dirname, "data", "activities.json"), "utf8");

const START = "/*__CATALOG__*/";
const END = "/*__END__*/";
const i = tpl.indexOf(START);
const j = tpl.indexOf(END);
if (i < 0 || j < 0) {
  console.error("V šabloně chybí značky " + START + " a " + END + ".");
  process.exit(1);
}

JSON.parse(cat); // spadne dřív, než se vyrobí rozbitý index.html
const out = tpl.slice(0, i + START.length) + cat.trim() + tpl.slice(j);
fs.writeFileSync(path.join(__dirname, "index.html"), out, "utf8");

const d = JSON.parse(cat);
const pocet = d.kategorie.reduce((a, c) => a + c.activities.length, 0);
console.log(
  "index.html hotový: " + d.kategorie.length + " kategorií, " + pocet + " úkonů, " +
  Math.round(out.length / 1024) + " kB"
);

// kontroly, které se jinak zapomenou.
// Em pomlčka se hlídá jen v češtině. V angličtině a němčině je to správná typografie.
const problemy = [];
const EM = String.fromCharCode(8212);
(function scanCs(node, cesta) {
  if (Array.isArray(node)) return node.forEach((x, i) => scanCs(x, cesta + "[" + i + "]"));
  if (!node || typeof node !== "object") return;
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (k === "cs" && typeof v === "string" && v.includes(EM)) problemy.push("em pomlčka v " + cesta + ": " + v);
    else scanCs(v, cesta + "." + k);
  }
})(d, "katalog");

const tplCz = tpl.match(/[^\x00-\x7F][^\n]*/g) || [];
tplCz.forEach((r) => { if (r.includes(EM)) problemy.push("em pomlčka v šabloně: " + r.trim()); });

if (!/Poppins/.test(out)) problemy.push("chybí Poppins");
if (problemy.length) {
  console.log(problemy.join("\n"));
  process.exitCode = 1;
}
