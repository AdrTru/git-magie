// Ověření JS lexeru proti Python oracle: integrita generovaného lexikonu +
// tokenizace bod po bodu. Věrnost se HLÍDÁ, netvrdí — fixtury vydal
// `oracle_kouzla.py` z `spelllang/lexicon.py` a `lexuj`.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { lexuj } from "../engine/parser.js";
import { NeznameSlovo } from "../engine/errors.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_lexer.json"), "utf-8"));

let chyb = 0;
const selhalo = (kde, ceka, dostal) => {
  chyb++;
  console.error(`  ✗ ${kde}\n      čeká:  ${ceka}\n      dostal:${dostal}`);
};

const lex = zakladLexikon();

// 1) Integrita lexikonu: počet run a jejich id/druh/název musí v generovaném
//    modulu sedět (nová/přejmenovaná runa se tu chytne).
{
  const pocet = Object.keys(lex.runy).length;
  if (pocet !== fix.lexikon.pocetRun) {
    selhalo("počet run", fix.lexikon.pocetRun, pocet);
  }
  for (const ocek of fix.lexikon.runy) {
    const r = lex.runy[ocek.id];
    if (r === undefined) { selhalo(`runa ${ocek.id} chybí`, "existuje", "undefined"); continue; }
    if (r.druh !== ocek.druh) selhalo(`runa ${ocek.id} druh`, ocek.druh, r.druh);
    if (r.nazev !== ocek.nazev) selhalo(`runa ${ocek.id} název`, ocek.nazev, r.nazev);
  }
}

// 2) Lexer: pro každý případ buď tokeny (text, pozice, runaId), nebo chyba
//    NeznameSlovo na dané pozici.
for (const pripad of fix.lexer) {
  const oznaceni = JSON.stringify(pripad.text);
  if (pripad.chyba === "NeznameSlovo") {
    try {
      lexuj(pripad.text, lex);
      selhalo(`${oznaceni} měl selhat`, `NeznameSlovo@${pripad.pozice}`, "prošlo");
    } catch (e) {
      if (!(e instanceof NeznameSlovo)) {
        selhalo(`${oznaceni} typ chyby`, "NeznameSlovo", e && e.name);
      } else if (e.pozice !== pripad.pozice) {
        selhalo(`${oznaceni} pozice chyby`, pripad.pozice, e.pozice);
      }
    }
    continue;
  }

  let tokeny;
  try {
    tokeny = lexuj(pripad.text, lex);
  } catch (e) {
    selhalo(`${oznaceni} neočekávaná chyba`, "tokeny", (e && e.toString()) || String(e));
    continue;
  }
  const dostal = tokeny.map((t) => ({
    text: t.text, pozice: t.pozice, runaId: t.runa ? t.runa.id : null,
  }));
  const a = JSON.stringify(dostal);
  const b = JSON.stringify(pripad.tokeny);
  if (a !== b) selhalo(`${oznaceni} tokeny`, b, a);
}

const celkem = fix.lexer.length;
if (chyb === 0) {
  console.log(`LEXER: ${celkem} případů + ${fix.lexikon.pocetRun} run sedí na Python oracle ✓`);
} else {
  console.error(`LEXER: ${chyb} rozdílů proti Python oracle`);
  process.exit(1);
}
