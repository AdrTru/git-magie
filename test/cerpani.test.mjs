// Ověření JS čerpání a živlového okolí proti Python oracle (`oracle_sceny.py`).
//
// Tři věci:
//  (1) HLÍDAČ TABULEK — generovaný `mechaniky_data.js` musí být přesně to, co
//      má Python. Bez toho by JS mohl běžet na starém vyvážení a zeleň by lhala.
//  (2) ROZKLAD ODVOZENÝCH ŽIVLŮ — `slozkyZivlu` pro každý živel z interakční
//      tabulky (vyčteno z dat, ne vypsáno) plus základní/absence/nesmysl.
//  (3) SCÉNY — fixtura nese scénu v témže formátu jako díl 3b, takže se načte
//      `zeSlovniku` a ptá se týchž otázek na týchž datech: zdroj objektu, co
//      z něj jde čerpat, zádrž a životnost každého jevu, a scéna jako celek
//      (`zdroje`, `zdrojZivlu`).
//
// Čísla se porovnávají s tolerancí 1e-9 (jako u cen a vyhodnocení): násobky
// životnosti dají týž IEEE výsledek jen při stejném pořadí operací.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zeSlovniku } from "../engine/scena.js";
import { zakladLexikon } from "../engine/lexikon.js";
import {
  MECHANIKY_PRIZNAKU, TRVANI_PODLE_TAGU, ZADRZUJICI_TAGY, ZADRZ_VSE,
  cerpatelne, nasobekTrvani, slozkyZivlu, trvaniStavu, zadrzujeSireni,
  zdroje, zdrojObjektu, zdrojZivlu,
} from "../engine/cerpani.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_cerpani.json"), "utf-8"));
const lex = zakladLexikon();

const TOLERANCE = 1e-9;

/** Hloubková rovnost; čísla s relativní tolerancí, množiny jako seřazená pole. */
function stejne(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  const pa = a instanceof Set ? [...a].sort() : a;
  const pb = b instanceof Set ? [...b].sort() : b;
  if (Array.isArray(pa) || Array.isArray(pb)) {
    if (!Array.isArray(pa) || !Array.isArray(pb) || pa.length !== pb.length) return false;
    return pa.every((x, i) => stejne(x, pb[i]));
  }
  const ka = Object.keys(pa), kb = Object.keys(pb);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => stejne(pa[k], pb[k]));
}

let chyb = 0;
const selhalo = (kde, detail) => {
  chyb++;
  if (chyb <= 20) console.error(`  ✗ ${kde}: ${detail}`);
};
const overit = (kde, dostal, ceka) => {
  if (!stejne(dostal, ceka)) {
    selhalo(kde, `dostal ${JSON.stringify(dostal)}, čekáno ${JSON.stringify(ceka)}`);
  }
};

// (1) Hlídač generovaných tabulek.
const tabulky = {
  MECHANIKY_PRIZNAKU, TRVANI_PODLE_TAGU, ZADRZUJICI_TAGY, ZADRZ_VSE,
};
for (const [jmeno, nase] of Object.entries(tabulky)) {
  if (!stejne(nase, fix.mechaniky[jmeno])) {
    selhalo(`tabulka ${jmeno}`,
      "mechaniky_data.js ≠ oracle — přegeneruj `python3 oracle_sceny.py`");
  }
}

// (2) Rozklad odvozených živlů na základní runy receptu.
for (const { nazev, ceka } of fix.slozky_zivlu) {
  overit(`slozkyZivlu(${nazev})`, slozkyZivlu(nazev, lex), ceka);
}

// (3) Scény.
let jevu = 0;
for (const pripad of fix.cerpani) {
  const scena = zeSlovniku(pripad.scena);
  for (const ceka of pripad.objekty) {
    const objekt = scena.objekty[ceka.id];
    const kde = `[${pripad.nazev}] ${ceka.id}`;
    if (objekt === undefined) {
      selhalo(kde, "objekt ve scéně chybí");
      continue;
    }
    overit(`${kde} zdrojObjektu`, zdrojObjektu(objekt), ceka.zdroj);
    overit(`${kde} cerpatelne`, cerpatelne(objekt, lex), ceka.cerpatelne);
    for (const jev of ceka.jevy) {
      jevu++;
      overit(`${kde} zadrzujeSireni(${jev.stav})`,
        zadrzujeSireni(objekt, jev.stav), jev.zadrzuje);
      overit(`${kde} nasobekTrvani(${jev.stav})`,
        nasobekTrvani(jev.stav, objekt), jev.nasobek);
      overit(`${kde} trvaniStavu(${jev.stav})`,
        trvaniStavu(jev.stav, null, objekt), jev.trvani);
      overit(`${kde} trvaniStavu(${jev.stav}, 5)`,
        trvaniStavu(jev.stav, 5.0, objekt), jev.trvaniSKouzlem);
    }
  }
  overit(`[${pripad.nazev}] zdroje`, zdroje(scena).map((o) => o.id), pripad.zdroje);
  for (const [nazevZivlu, cekaId] of Object.entries(pripad.zdrojZivlu)) {
    const nalezeny = zdrojZivlu(scena, nazevZivlu, lex);
    overit(`[${pripad.nazev}] zdrojZivlu(${nazevZivlu})`,
      nalezeny === null ? null : nalezeny.id, cekaId);
  }
}

// Bez objektu je násobek 1,0 a jev si dobu bere sám (nebo od kouzla) — větev,
// kterou scénové případy nechytí, protože ty vždycky nějaký objekt mají.
overit("nasobekTrvani bez objektu", nasobekTrvani("hoří"), 1.0);
overit("trvaniStavu bez objektu (vlastní jev)", trvaniStavu("hoří"), 4);
overit("trvaniStavu bez objektu (od kouzla)", trvaniStavu("ovládnuto", 7.0), 7);
overit("trvaniStavu neznámého jevu bez kouzla", trvaniStavu("neznámý jev"), null);

if (chyb) {
  console.error(`\n✗ čerpání: ${chyb} rozdílů proti oracle`);
  process.exit(1);
}
console.log(
  `✓ čerpání: ${Object.keys(MECHANIKY_PRIZNAKU).length} příznaků + `
    + `${fix.slozky_zivlu.length} rozkladů + ${jevu} jevů na `
    + `${fix.cerpani.reduce((n, p) => n + p.objekty.length, 0)} objektech sedí na oracle`,
);
