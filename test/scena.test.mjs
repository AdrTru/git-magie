// Ověření JS scény-jako-data proti Python oracle (`oracle_sceny.py`).
//
// Dvě věci: (1) GENEROVANÝ spec polí `scena_data.js` musí sedět na Python
// dataclass Objekt (fixtura nese `pole_objektu`) — hlídač proti zapomenuté
// regeneraci; (2) ROUND-TRIP: `doSlovniku(zeSlovniku(data))` musí dát `data`
// (nebo explicitní `ceka` u nesymetrických případů jako ignorovaná poznámka).
// Chybové případy: `zeSlovniku(data)` musí hodit ChybaSceny.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zeSlovniku, doSlovniku, ChybaSceny } from "../engine/scena.js";
import { POLE_OBJEKTU } from "../engine/scena_data.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_sceny.json"), "utf-8"));

function stejne(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => stejne(x, b[i]));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => stejne(a[k], b[k]));
}

let chyb = 0;
const selhalo = (kde, detail) => {
  chyb++;
  console.error(`  ✗ ${kde}: ${detail}`);
};

// (1) Spec polí — generovaný scena_data.js musí být přesně Python spec.
if (!stejne(POLE_OBJEKTU, fix.pole_objektu)) {
  selhalo("spec polí", "POLE_OBJEKTU (scena_data.js) ≠ oracle — regeneruj oracle_sceny.py");
}

// (2) Scénové případy.
for (const pripad of fix.sceny) {
  const kde = `[${pripad.nazev}]`;
  if (pripad.chyba) {
    let hozeno = null;
    try {
      zeSlovniku(pripad.data);
    } catch (e) {
      hozeno = e;
    }
    if (hozeno === null) {
      selhalo(kde, `čekána chyba ${pripad.chyba}, ale prošlo`);
    } else if (hozeno.constructor.name !== pripad.chyba) {
      selhalo(kde, `čekána ${pripad.chyba}, hozeno ${hozeno.constructor.name}`);
    } else if (!(hozeno instanceof ChybaSceny)) {
      selhalo(kde, "chyba není instance ChybaSceny");
    }
    continue;
  }

  const ceka = pripad.ceka ?? pripad.data;
  let out;
  try {
    out = doSlovniku(zeSlovniku(pripad.data), { sBehem: pripad.sBehem ?? false });
  } catch (e) {
    selhalo(kde, `round-trip hodil ${e.constructor.name}: ${e.message}`);
    continue;
  }
  if (!stejne(out, ceka)) {
    selhalo(kde, "round-trip ≠ oracle\n    dostal: " + JSON.stringify(out)
      + "\n    čekáno: " + JSON.stringify(ceka));
  }
}

if (chyb) {
  console.error(`\n✗ scéna: ${chyb} rozdílů proti oracle`);
  process.exit(1);
}
const kladnych = fix.sceny.filter((s) => !s.chyba).length;
const chybovych = fix.sceny.filter((s) => s.chyba).length;
console.log(
  `✓ scéna: ${POLE_OBJEKTU.length} polí + ${kladnych} round-tripů + `
    + `${chybovych} chybových sedí na oracle`,
);
