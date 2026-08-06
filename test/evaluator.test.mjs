// Ověření JS vyhodnocení proti Python oracle: AST → SpellEffect. Porovnává se
// rekurzivně (i přes složky u a/pak): čísla s tolerancí (plovoucí čárka),
// řetězce/seznamy/mapy přesně. Fixtury vydal `oracle_kouzla.py` funkcí
// `vyhodnot`. Vyhodnocuje se první výklad (parsuj(...)[0]).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { vyhodnot } from "../engine/evaluator.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_evaluator.json"), "utf-8"));

// Serializace efektu — týž tvar jako oracle (rezimTrvani → "rezim_trvani").
function serEfekt(ef) {
  return {
    typ: ef.typ, zivel: ef.zivel, cile: [...ef.cile], forma: ef.forma,
    sila: ef.sila, dosah: ef.dosah, trvani: ef.trvani,
    rezim_trvani: ef.rezimTrvani, upkeep: ef.upkeep, priznaky: [...ef.priznaky],
    filtry: ef.filtry, strany: ef.strany, runy: [...ef.runy],
    podminka: ef.podminka, kanal: ef.kanal, produkuje: ef.produkuje,
    slozky: ef.slozky.map(serEfekt),
  };
}

const blizko = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

// Vrátí popis prvního rozdílu, nebo null když sedí.
function porovnej(got, exp, cesta) {
  if (typeof exp === "number" || typeof got === "number") {
    if (typeof got !== "number" || typeof exp !== "number") {
      return `${cesta}: číslo vs nečíslo (${got} / ${exp})`;
    }
    return blizko(got, exp) ? null : `${cesta}: ${got} ≠ ${exp}`;
  }
  if (Array.isArray(exp) || Array.isArray(got)) {
    if (!Array.isArray(got) || !Array.isArray(exp)) return `${cesta}: pole vs nepole`;
    if (got.length !== exp.length) return `${cesta}: délka ${got.length} ≠ ${exp.length}`;
    for (let i = 0; i < exp.length; i++) {
      const d = porovnej(got[i], exp[i], `${cesta}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (exp !== null && typeof exp === "object") {
    if (got === null || typeof got !== "object") return `${cesta}: objekt vs ${got}`;
    for (const k of new Set([...Object.keys(exp), ...Object.keys(got)])) {
      const d = porovnej(got[k], exp[k], `${cesta}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return got === exp ? null : `${cesta}: ${JSON.stringify(got)} ≠ ${JSON.stringify(exp)}`;
}

let chyb = 0;
const lex = zakladLexikon();

for (const p of fix.evaluator) {
  let ef;
  try {
    ef = vyhodnot(parsuj(p.text, lex)[0], lex);
  } catch (e) {
    chyb++;
    console.error(`  ✗ ${JSON.stringify(p.text)} neočekávaná chyba: ${(e && e.toString()) || e}`);
    continue;
  }
  const rozdil = porovnej(serEfekt(ef), p.efekt, JSON.stringify(p.text));
  if (rozdil) {
    chyb++;
    console.error(`  ✗ ${rozdil}`);
  }
}

const celkem = fix.evaluator.length;
if (chyb === 0) {
  console.log(`VYHODNOCENÍ: ${celkem} případů (AST → efekt) sedí na Python oracle ✓`);
} else {
  console.error(`VYHODNOCENÍ: ${chyb} rozdílů proti Python oracle`);
  process.exit(1);
}
