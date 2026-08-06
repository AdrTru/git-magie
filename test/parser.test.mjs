// Ověření JS parseru proti Python oracle: pro každé kouzlo buď seznam výkladů
// (AST), nebo chyba s pozicí. Věrnost se HLÍDÁ — fixtury vydal `oracle_kouzla.py`
// funkcí `parsuj`. Porovnává se KANONICKY (klíče seřazené), aby na pořadí
// nezáleželo; čísla se srovnávají v JS na obou stranách (fixtura se naparsuje),
// takže formát reprezentace nehraje roli.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { ChybaKouzla } from "../engine/errors.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_parser.json"), "utf-8"));

// -- serializace AST (týž tvar jako oracle) --------------------------------

const serRuna = (r) => ({ id: r.id, nazev: r.nazev, data: serData(r.data) });

function serData(d) {
  const out = {};
  for (const [k, v] of Object.entries(d)) {
    out[k] = k === "filtr" ? v.map(serRuna) : v;
  }
  return out;
}

function serUzel(u) {
  switch (u.typ) {
    case "Fraze":
      return { typ: "Fraze", sloveso: u.sloveso.map(serRuna),
        podstaty: u.podstaty.map(serRuna), cile: u.cile.map(serRuna),
        formy: u.formy.map(serRuna), modifikatory: u.modifikatory.map(serRuna) };
    case "Volani":
      return { typ: "Volani", jmeno: serRuna(u.jmeno),
        podstaty: u.podstaty.map(serRuna), cile: u.cile.map(serRuna),
        formy: u.formy.map(serRuna), modifikatory: u.modifikatory.map(serRuna) };
    case "Skupina":
      return { typ: "Skupina", vyraz: serUzel(u.vyraz),
        cile: u.cile.map(serRuna), modifikatory: u.modifikatory.map(serRuna) };
    case "Spojeni":
      return { typ: "Spojeni", operator: u.operator, casti: u.casti.map(serUzel) };
    case "Podminka":
      return { typ: "Podminka", cil: serRuna(u.cil), stavy: u.stavy.map(serRuna),
        telo: serUzel(u.telo), negace: u.negace };
    case "Skrze":
      return { typ: "Skrze", vyraz: serUzel(u.vyraz),
        kanal: u.kanal ? serRuna(u.kanal) : null };
    default:
      throw new Error(`Neznámý uzel: ${JSON.stringify(u)}`);
  }
}

// Kanonický zápis: klíče objektů seřazené, čísla formátuje JS na obou stranách.
function kanon(x) {
  if (Array.isArray(x)) return "[" + x.map(kanon).join(",") + "]";
  if (x !== null && typeof x === "object") {
    return "{" + Object.keys(x).sort()
      .map((k) => JSON.stringify(k) + ":" + kanon(x[k])).join(",") + "}";
  }
  return JSON.stringify(x);
}

// -- běh -------------------------------------------------------------------

let chyb = 0;
const selhalo = (kde, ceka, dostal) => {
  chyb++;
  console.error(`  ✗ ${kde}\n      čeká:  ${ceka}\n      dostal:${dostal}`);
};

const lex = zakladLexikon();

for (const pripad of fix.parser) {
  const oznaceni = JSON.stringify(pripad.text);
  if (pripad.chyba !== undefined) {
    try {
      parsuj(pripad.text, lex);
      selhalo(`${oznaceni} měl selhat`, `${pripad.chyba}@${pripad.pozice}`, "prošlo");
    } catch (e) {
      if (!(e instanceof ChybaKouzla)) {
        selhalo(`${oznaceni} typ chyby`, pripad.chyba, (e && e.name) || String(e));
      } else if (e.name !== pripad.chyba) {
        selhalo(`${oznaceni} třída chyby`, pripad.chyba, e.name);
      } else if (e.pozice !== pripad.pozice) {
        selhalo(`${oznaceni} pozice chyby`, pripad.pozice, e.pozice);
      }
    }
    continue;
  }

  let vyklady;
  try {
    vyklady = parsuj(pripad.text, lex);
  } catch (e) {
    selhalo(`${oznaceni} neočekávaná chyba`, "výklady", (e && e.toString()) || String(e));
    continue;
  }
  const dostal = kanon(vyklady.map(serUzel));
  const ceka = kanon(pripad.vyklady);
  if (dostal !== ceka) selhalo(`${oznaceni} AST`, ceka, dostal);
}

const celkem = fix.parser.length;
if (chyb === 0) {
  console.log(`PARSER: ${celkem} případů (věta → AST) sedí na Python oracle ✓`);
} else {
  console.error(`PARSER: ${chyb} rozdílů proti Python oracle`);
  process.exit(1);
}
