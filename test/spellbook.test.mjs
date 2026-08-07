// Ověření JS knihy kouzel proti Python oracle (`oracle_kouzla.py`,
// `sestav_spellbook_fixtury`). Scénář se ČTE z fixtury (op + parametry) a
// PŘEHRAJE týmiž kroky nad čerstvým lexikonem/knihou/znalostmi — tím se ověří
// právě cesty VOLÁNÍ JMÉNEM (`Volani`), které byly v parseru/cenách/vyhodnocení
// portované, ale bez knihy nešly ověřit.
//
// Efekt se porovnává rekurzivně (čísla s tolerancí, zbytek přesně, stejně jako
// evaluator.test); cena čtyřmi poli; chybové větve názvem třídy (shodná jména
// run v Pythonu i JS). Efekt a cena se u `sesli` čtou NEZÁVISLE — ceny narazí
// na strop rozbalení o úroveň dřív než vyhodnocení (viz scénář hloubky).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { vyhodnot } from "../engine/evaluator.js";
import { nacen } from "../engine/costs.js";
import { Znalosti } from "../engine/progression.js";
import { Spellbook } from "../engine/spellbook.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_spellbook.json"), "utf-8"));

// -- komparátory (týž tvar jako evaluator.test / costs.test) ----------------
const blizko = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

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

// Znalosti scénáře — ZRCADLO `_znalosti_sb` z oracle (fáze + runy + mastery
// se základem na všechny runy a přepisy). Musí počítat stejně jako Python.
function znalostiScenare(scenar, lex) {
  const runy = scenar.runy === "*" ? Object.keys(lex.runy) : scenar.runy;
  const zaklad = scenar.masteryBase ?? 1.0;
  const mastery = {};
  for (const id of Object.keys(lex.runy)) mastery[id] = zaklad;
  for (const [id, v] of Object.entries(scenar.masteryOver ?? {})) mastery[id] = v;
  return new Znalosti({ runy: new Set(runy), faze: scenar.faze, mastery });
}

// Spustí fn; vrátí název třídy vyhozené chyby, nebo null když neselhala.
function chytTridu(fn) {
  try { fn(); return null; } catch (e) { return e.constructor.name; }
}

let chyb = 0;
function selhalo(kde, ceka, dostal) {
  chyb++;
  console.error(`  ✗ ${kde}: čekáno ${JSON.stringify(ceka)}, dostal ${JSON.stringify(dostal)}`);
}

for (const scenar of fix.spellbook) {
  const lex = zakladLexikon();
  const znalosti = znalostiScenare(scenar, lex);
  const kniha = new Spellbook();
  let i = 0;
  for (const krok of scenar.kroky) {
    i++;
    const kde = `[${scenar.nazev}] krok ${i} (${krok.op})`;

    if (krok.op === "retez") {
      // Postav řetěz h0..h{delka-1} stejně jako oracle (každé pojmenuj projde).
      for (let j = 0; j < krok.delka; j++) {
        const text = j === 0 ? krok.zaklad : `${krok.prefix}${j - 1}`;
        try {
          kniha.pojmenuj(`${krok.prefix}${j}`, text, lex, znalosti);
        } catch (e) {
          selhalo(`${kde} staví ${krok.prefix}${j}`, "ok", e.constructor.name);
          break;
        }
      }
      continue;
    }

    const ceka = krok.ceka;

    if (krok.op === "pojmenuj") {
      if (ceka.chyba) {
        const trida = chytTridu(() =>
          kniha.pojmenuj(krok.nazev, krok.text, lex, znalosti, krok.ukotveni ?? null));
        if (trida !== ceka.chyba) selhalo(`${kde} chyba`, ceka.chyba, trida);
        continue;
      }
      let runa;
      try {
        runa = kniha.pojmenuj(krok.nazev, krok.text, lex, znalosti, krok.ukotveni ?? null);
      } catch (e) {
        selhalo(`${kde} nečekaná chyba`, "ok", e.constructor.name);
        continue;
      }
      if (runa.data.odvozeny !== ceka.odvozeny) selhalo(`${kde} odvozeny`, ceka.odvozeny, runa.data.odvozeny);
      if (!blizko(znalosti.mastery[runa.id], ceka.mastery)) selhalo(`${kde} mastery`, ceka.mastery, znalosti.mastery[runa.id]);
      if (znalosti.zna(runa.id) !== ceka.zna) selhalo(`${kde} zna`, ceka.zna, znalosti.zna(runa.id));
      continue;
    }

    if (krok.op === "sesli") {
      // Chyba na horní úrovni = selhal už parser.
      if (ceka.chyba) {
        const trida = chytTridu(() => parsuj(krok.text, lex)[0]);
        if (trida !== ceka.chyba) selhalo(`${kde} parse chyba`, ceka.chyba, trida);
        continue;
      }
      let ast;
      try {
        ast = parsuj(krok.text, lex)[0];
      } catch (e) {
        selhalo(`${kde} parse`, "ok", e.constructor.name);
        continue;
      }

      // efekt (nezávisle)
      if (ceka.efekt.chyba) {
        const trida = chytTridu(() => vyhodnot(ast, lex, kniha));
        if (trida !== ceka.efekt.chyba) selhalo(`${kde} efekt chyba`, ceka.efekt.chyba, trida);
      } else {
        try {
          const got = serEfekt(vyhodnot(ast, lex, kniha));
          const d = porovnej(got, ceka.efekt, `${kde} efekt`);
          if (d) { chyb++; console.error(`  ✗ ${d}`); }
        } catch (e) {
          selhalo(`${kde} efekt`, "hodnota", e.constructor.name);
        }
      }

      // cena (nezávisle)
      if (ceka.cena.chyba) {
        const trida = chytTridu(() => nacen(ast, lex, znalosti, kniha));
        if (trida !== ceka.cena.chyba) selhalo(`${kde} cena chyba`, ceka.cena.chyba, trida);
      } else {
        try {
          const n = nacen(ast, lex, znalosti, kniha);
          if (!blizko(n.cenaMany, ceka.cena.cena_many)) selhalo(`${kde} cena_many`, ceka.cena.cena_many, n.cenaMany);
          if (!blizko(n.obtiznost, ceka.cena.obtiznost)) selhalo(`${kde} obtiznost`, ceka.cena.obtiznost, n.obtiznost);
          if (!blizko(n.sance, ceka.cena.sance)) selhalo(`${kde} sance`, ceka.cena.sance, n.sance);
          if (n.nejslabsi !== ceka.cena.nejslabsi) selhalo(`${kde} nejslabsi`, ceka.cena.nejslabsi, n.nejslabsi);
        } catch (e) {
          selhalo(`${kde} cena`, "hodnota", e.constructor.name);
        }
      }
    }
  }
}

if (chyb) {
  console.error(`\n✗ spellbook: ${chyb} rozdílů proti oracle`);
  process.exit(1);
}
const kroku = fix.spellbook.reduce((s, x) => s + x.kroky.length, 0);
console.log(`✓ spellbook: ${fix.spellbook.length} scénářů, ${kroku} kroků sedí na oracle`);
