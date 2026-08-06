// Ověření JS cen proti Python oracle: mana, obtížnost a šance na seslání.
// Čísla se srovnávají s tolerancí (plovoucí čárka — násobení modifikátorů a
// slev dá stejný IEEE výsledek jen při stejném pořadí operací), `nejslabsi`
// přesně. Fixtury vydal `oracle_kouzla.py` funkcí `nacen`. Oceňuje se první
// výklad (parsuj(...)[0]).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { nacen } from "../engine/costs.js";
import { Znalosti } from "../engine/progression.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_costs.json"), "utf-8"));

let chyb = 0;
const selhalo = (kde, ceka, dostal) => {
  chyb++;
  console.error(`  ✗ ${kde}\n      čeká:  ${ceka}\n      dostal:${dostal}`);
};

const blizko = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const lex = zakladLexikon();
const vsechnyRuny = Object.keys(lex.runy);

function znalostiPro(masterySpec) {
  let mastery;
  if (typeof masterySpec === "number") {
    mastery = {};
    for (const id of vsechnyRuny) mastery[id] = masterySpec;
  } else {
    mastery = masterySpec;
  }
  return new Znalosti({ runy: vsechnyRuny, faze: 7, mastery });
}

for (const c of fix.costs) {
  const znalosti = znalostiPro(c.mastery);
  const ast = parsuj(c.text, lex)[0];
  const n = nacen(ast, lex, znalosti, null, c.cerpane);
  const o = JSON.stringify(c.text);

  if (!blizko(n.cenaMany, c.cena_many)) selhalo(`${o} mana`, c.cena_many, n.cenaMany);
  if (!blizko(n.obtiznost, c.obtiznost)) selhalo(`${o} obtížnost`, c.obtiznost, n.obtiznost);
  if (!blizko(n.sance, c.sance)) selhalo(`${o} šance`, c.sance, n.sance);
  if (n.nejslabsi !== c.nejslabsi) selhalo(`${o} nejslabší`, c.nejslabsi, n.nejslabsi);
}

const celkem = fix.costs.length;
if (chyb === 0) {
  console.log(`CENY: ${celkem} případů (mana + obtížnost + šance) sedí na Python oracle ✓`);
} else {
  console.error(`CENY: ${chyb} rozdílů proti Python oracle`);
  process.exit(1);
}
