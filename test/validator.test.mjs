// Ověření JS validátoru proti Python oracle: pro zvolenou fázi a sadu znalostí
// buď projde (ok), nebo padne příslušnou chybou (NepovolenaGramatika /
// NeovladaneSlovo). Věrnost se HLÍDÁ — fixtury vydal `oracle_kouzla.py` funkcí
// `zvaliduj`. Validuje se první výklad (parsuj(...)[0]); věty jsou jednoznačné.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { zvaliduj } from "../engine/validator.js";
import { Znalosti } from "../engine/progression.js";
import { ChybaKouzla } from "../engine/errors.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_validator.json"), "utf-8"));

let chyb = 0;
const selhalo = (kde, ceka, dostal) => {
  chyb++;
  console.error(`  ✗ ${kde}\n      čeká:  ${ceka}\n      dostal:${dostal}`);
};

const lex = zakladLexikon();
const vsechnyRuny = Object.keys(lex.runy);

for (const c of fix.validator) {
  const runy = c.runy === "*" ? vsechnyRuny : c.runy;
  const znalosti = new Znalosti({ runy, faze: c.faze });
  const zvenci = new Set(c.zvenci);
  const ast = parsuj(c.text, lex)[0];
  const oznaceni = `f${c.faze} ${JSON.stringify(c.text)}`;

  if (c.ok) {
    try {
      zvaliduj(ast, znalosti, zvenci);
    } catch (e) {
      selhalo(`${oznaceni} měl projít`, "ok", (e && e.name) || String(e));
    }
  } else {
    try {
      zvaliduj(ast, znalosti, zvenci);
      selhalo(`${oznaceni} měl selhat`, c.chyba, "prošlo");
    } catch (e) {
      if (!(e instanceof ChybaKouzla)) {
        selhalo(`${oznaceni} typ chyby`, c.chyba, (e && e.name) || String(e));
      } else if (e.name !== c.chyba) {
        selhalo(`${oznaceni} třída chyby`, c.chyba, e.name);
      }
    }
  }
}

const celkem = fix.validator.length;
if (chyb === 0) {
  console.log(`VALIDÁTOR: ${celkem} případů (znalosti + fáze) sedí na Python oracle ✓`);
} else {
  console.error(`VALIDÁTOR: ${chyb} rozdílů proti Python oracle`);
  process.exit(1);
}
