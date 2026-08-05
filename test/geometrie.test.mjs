// Ověření JS portu geometrie proti Python oracle.
//
// HLÍDAČ, NE TVRZENÍ. `oracle_geometrie.py` vydá z živého enginu očekávané
// `vzdalenost`/`vidi`/`projde` do `fixtury_geometrie.json`; tady se pro každou
// zkoušku postaví JS objekty a porovná se, že `geometrie.js` počítá totéž.
// Když se čísla rozejdou, test spadne — port je špatně, nebo je fixtura stará
// (přegeneruj `oracle_geometrie.py`). Zelená = JS geometrie sedí na Python.
//
// Spuštění:  node test/geometrie.test.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { vzdalenost, vnima, projde, zornyKlin } from "../engine/geometrie.js";

const ZDE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(ZDE, "fixtury_geometrie.json"), "utf-8"));

const TOLERANCE = 1e-9;   // vzdálenosti: float shoda na devět míst
let prosly = 0;
const chyby = [];

function objekt(spec) {
  // Fixtura nese jen pole, která se liší od výchozích; zbytek dopočte `pole()`
  // v geometrie.js. Tagy/stavy nechávám polem — `maTag`/`maStav` je umí.
  const o = { ...spec };
  o.tagy = spec.tagy || [];
  o.stavy = spec.stavy || [];
  return o;
}

function paruj(par) {          // "a|b" -> [a, b]
  const i = par.indexOf("|");
  return [par.slice(0, i), par.slice(i + 1)];
}

for (const [nazev, z] of Object.entries(data)) {
  const objekty = {};
  for (const spec of z.objekty) objekty[spec.id] = objekt(spec);
  const scena = { nazev, objekty };
  const zkus = (druh, par, dostal, cekal, ok) => {
    if (ok) { prosly++; return; }
    chyby.push(`  [${nazev}] ${druh} ${par}: JS=${dostal}  oracle=${cekal}`);
  };

  for (const [par, cekal] of Object.entries(z.vzdalenost)) {
    const [a, b] = paruj(par);
    const dostal = vzdalenost(objekty[a], objekty[b], scena);
    zkus("vzdálenost", par, dostal, cekal, Math.abs(dostal - cekal) < TOLERANCE);
  }
  for (const [par, cekal] of Object.entries(z.vidi)) {
    const [a, b] = paruj(par);
    const dostal = vnima(objekty[a], objekty[b], scena);
    zkus("vidí", par, dostal, cekal, dostal === cekal);
  }
  for (const [par, cekal] of Object.entries(z.projde)) {
    const [a, b] = paruj(par);
    const dostal = projde(objekty[a], objekty[b], scena);
    zkus("projde", par, dostal, cekal, dostal === cekal);
  }
  // Zorný klín: bod po bodu proti oracle (týž dosah/krok, půlení je určité).
  const kl = z.klin;
  for (const [kdo, cekal] of Object.entries(kl.kdo)) {
    const dostal = zornyKlin(objekty[kdo], scena,
                             { dosah: kl.dosah, krokUhlu: kl.krok });
    if (dostal.length !== cekal.length) {
      chyby.push(`  [${nazev}] klín ${kdo}: JS má ${dostal.length} bodů, oracle ${cekal.length}`);
      continue;
    }
    for (let i = 0; i < cekal.length; i++) {
      const ok = Math.abs(dostal[i][0] - cekal[i][0]) < TOLERANCE &&
                 Math.abs(dostal[i][1] - cekal[i][1]) < TOLERANCE;
      zkus("klín", `${kdo}[${i}]`, "…", "…", ok);
    }
  }
}

const celkem = prosly + chyby.length;
if (chyby.length) {
  console.error(`GEOMETRIE: ${prosly}/${celkem} sedí, ${chyby.length} ROZDÍLŮ:`);
  console.error(chyby.join("\n"));
  process.exit(1);
}
console.log(`GEOMETRIE: ${prosly}/${celkem} hodnot sedí na Python oracle ✓`);
