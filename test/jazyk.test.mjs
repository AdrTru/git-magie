// Ověření JS portu skloňování proti Python oracle.
//
// HLÍDAČ, NE TVRZENÍ. `oracle_jazyk.py` vydá z živého `cestina.py` očekávané
// tvary (`sklonuj`/`rod`/`vokalizuj`/`zajmeno`/`s_predlozkou`) do
// `fixtury_jazyk.json`; tady se pro každý případ spustí `cestina.js` a porovná
// se, že vrací TÝŽ řetězec. Rozejde-li se, test spadne — port je špatně, nebo
// je fixtura stará (přegeneruj `oracle_jazyk.py`; ten zároveň obnoví `slova.js`).
// Zelená = JS skloňování sedí na Python bod po bodu.
//
// Spuštění:  node test/jazyk.test.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { sklonuj, rodFraze, vokalizuj, zajmeno, sPredlozkou } from "../engine/cestina.js";

const ZDE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(ZDE, "fixtury_jazyk.json"), "utf-8"));

let prosly = 0;
const chyby = [];

// null z fixtury (JSON) i null z JS musí sedět; jinak porovnávám řetězce přesně.
function zkus(druh, klic, dostal, cekal) {
  if (dostal === cekal) { prosly++; return; }
  chyby.push(`  [${druh}] ${klic}: JS=${JSON.stringify(dostal)}  oracle=${JSON.stringify(cekal)}`);
}

for (const c of data.sklonuj) {
  const dostal = sklonuj(c.nazev, c.pad, c.prepis);
  zkus("sklonuj", `"${c.nazev}" ${c.pad}.${c.prepis ? " +přepis" : ""}`, dostal, c.ceka);
}

for (const c of data.rod) {
  zkus("rod", `"${c.nazev}"`, rodFraze(c.nazev), c.ceka);
}

for (const c of data.vokalizuj) {
  zkus("vokalizuj", `"${c.predlozka}" + "${c.slovo}"`, vokalizuj(c.predlozka, c.slovo), c.ceka);
}

for (const c of data.zajmeno) {
  zkus("zajmeno", `"${c.nazev}" (${c.rod ?? "—"})`, zajmeno(c.nazev, c.rod), c.ceka);
}

for (const c of data.s_predlozkou) {
  const dostal = sPredlozkou(c.predlozka, c.nazev, c.pad, c.prepis);
  zkus("s_předložkou", `"${c.predlozka}" + "${c.nazev}" ${c.pad}.`, dostal, c.ceka);
}

const celkem = prosly + chyby.length;
if (chyby.length) {
  console.error(`JAZYK: ${prosly}/${celkem} sedí, ${chyby.length} ROZDÍLŮ:`);
  console.error(chyby.join("\n"));
  process.exit(1);
}
console.log(`JAZYK: ${prosly}/${celkem} tvarů sedí na Python oracle ✓`);
