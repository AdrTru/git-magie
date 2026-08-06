// Cena many, obtížnost a šance na seslání (port `spelllang/costs.py`, §10).
//
// Zásady: cena = součet cen slov × násobky modifikátorů × přirážka za složky,
// z ROZBALENÉHO AST; mastery dává slevu na manu; šance ≈ min(mastery přímo
// sesílaných run) − mírná korekce obtížnosti; živel čerpaný z okolí (§8.1) je
// na manu zdarma a do min za něj vstupuje max(mastery, kvalita zdroje).
// Konstanty jsou ladicí data, ne pevné pravdy.

import { runyV } from "./ast_nodes.js";
import { ChybaKouzla } from "./errors.js";
import { MAX_HLOUBKA_ROZBALENI } from "./evaluator.js";
import { DRUH } from "./runy.js";

// Cena slova, když runa nenese vlastní data.cena.
const ZAKLADNI_CENA = {
  [DRUH.SLOVESO]: 3.0,
  [DRUH.PODSTATA]: 2.0,
  [DRUH.CIL]: 1.0,
  [DRUH.FORMA]: 1.5,
};
const SLEVA_MASTERY = 0.4;       // plné ovládnutí slova = 40% sleva na jeho manu
const NEGACE_NASOBEK = 1.25;     // říct opak je o něco těžší než to říct přímo (§3.5)
const PRIRAZKA_SLOZKY = 0.15;    // každá další složka spojky zdraží celek o 15 %
const VAHA_RUN = 0.5;            // obtížnost: příspěvek počtu run rozbaleného AST
const VAHA_HLOUBKY = 1.0;        // obtížnost: příspěvek hloubky rozbaleného AST
const KOREKCE_OBTIZNOSTI = 0.02; // o kolik šance klesne za bod obtížnosti (§10.2)
const PODLAHA_MASTERY = 0.10;    // i runa s 0 % je castable — podlaha do min-šance (§10.4)

// Ocení kouzlo: mana, obtížnost a šance na čisté seslání. `cerpane` mapuje id
// runy živlu → kvalita zdroje v okolí (0–1), §8.1. Vrací { cenaMany, obtiznost,
// sance, nejslabsi } — nejslabsi je id runy/jména, které min-mastery srazilo.
export function nacen(uzel, lex, znalosti, kniha = null, cerpane = null) {
  cerpane = cerpane || {};
  const [cena, hloubka, pocetRun] = _cena(uzel, znalosti, kniha, cerpane, 0);
  const obtiznost = VAHA_RUN * pocetRun + VAHA_HLOUBKY * hloubka;

  let minimum = 1.0;
  let nejslabsi = null;
  for (const runa of runyV(uzel)) {
    let hodnota = znalosti.mastery[runa.id] ?? 0.0;
    if (runa.id in cerpane) hodnota = Math.max(hodnota, cerpane[runa.id]);
    hodnota = Math.max(hodnota, PODLAHA_MASTERY);
    if (hodnota < minimum) { minimum = hodnota; nejslabsi = runa.id; }
  }

  const sance = Math.max(0.0, Math.min(1.0, minimum - KOREKCE_OBTIZNOSTI * obtiznost));
  return { cenaMany: cena, obtiznost, sance, nejslabsi };
}

// Rekurzivní ocenění: [mana, hloubka AST, počet run] — z rozbaleného AST.
function _cena(uzel, znalosti, kniha, cerpane, hloubka) {
  switch (uzel.typ) {
    case "Fraze": {
      const slova = [...uzel.sloveso, ...uzel.podstaty, ...uzel.cile, ...uzel.formy];
      let cena = slova.reduce((s, r) => s + _cenaSlova(r, znalosti, kniha, cerpane, hloubka), 0);
      for (const m of uzel.modifikatory) cena *= _modifikatorNasobek(m);
      return [cena, 1, slova.length + uzel.modifikatory.length];
    }
    case "Volani": {
      const zaznam = _zaznam(uzel.jmeno, kniha);
      let [obsah, hlObsahu, runObsahu] = _cena(zaznam.ast, znalosti, kniha, cerpane, _oUroven(hloubka));
      obsah *= _sleva(uzel.jmeno.id, znalosti);   // sleva za ovládnutí jména (§10.1)
      const argumenty = [...uzel.podstaty, ...uzel.cile, ...uzel.formy];
      let cena = obsah + argumenty.reduce((s, r) => s + _cenaSlova(r, znalosti, kniha, cerpane, hloubka), 0);
      for (const m of uzel.modifikatory) cena *= _modifikatorNasobek(m);
      return [cena, 1 + hlObsahu, runObsahu + argumenty.length + uzel.modifikatory.length];
    }
    case "Skupina": {
      let [cena, hl, pocet] = _cena(uzel.vyraz, znalosti, kniha, cerpane, hloubka);
      cena += uzel.cile.reduce((s, r) => s + _cenaSlova(r, znalosti, kniha, cerpane, hloubka), 0);
      for (const m of uzel.modifikatory) cena *= _modifikatorNasobek(m);
      return [cena, hl + 1, pocet + uzel.cile.length + uzel.modifikatory.length];
    }
    case "Spojeni": {
      const casti = uzel.casti.map((c) => _cena(c, znalosti, kniha, cerpane, hloubka));
      let cena = casti.reduce((s, [c]) => s + c, 0);
      cena *= 1 + PRIRAZKA_SLOZKY * (casti.length - 1);
      return [cena, 1 + Math.max(...casti.map(([, h]) => h)), casti.reduce((s, [, , p]) => s + p, 0)];
    }
    case "Podminka": {
      let [cena, hl, pocet] = _cena(uzel.telo, znalosti, kniha, cerpane, hloubka);
      const predikat = [uzel.cil, ...uzel.stavy];
      cena += predikat.reduce((s, r) => s + _cenaSlova(r, znalosti, kniha, cerpane, hloubka), 0);
      return [cena, hl + 1, pocet + predikat.length];
    }
    case "Skrze": {
      // Kanál je odkaz, ne seslání — manu nestojí, do min ale vstupuje.
      const [cena, hl, pocet] = _cena(uzel.vyraz, znalosti, kniha, cerpane, hloubka);
      return [cena, hl + 1, pocet + 1];
    }
    default:
      throw new TypeError(`Neznámý uzel AST: ${JSON.stringify(uzel)}`);
  }
}

function _cenaSlova(runa, znalosti, kniha, cerpane, hloubka) {
  if (runa.druh === DRUH.PODSTATA && runa.id in cerpane) return 0.0;  // živel z okolí (§8.1)
  if (runa.druh === DRUH.JMENO) {
    const zaznam = _zaznam(runa, kniha);
    const [obsah] = _cena(zaznam.ast, znalosti, kniha, cerpane, _oUroven(hloubka));
    return obsah * _sleva(runa.id, znalosti);
  }
  let zaklad = Number(runa.data.cena ?? (ZAKLADNI_CENA[runa.druh] ?? 1.0));
  if (runa.data.negace) zaklad *= NEGACE_NASOBEK;   // přirážka za negaci (§3.5)
  let cena = zaklad * _sleva(runa.id, znalosti);
  // Vlastnosti zúženého cíle (#38) se platí jako runy, kterými jsou.
  for (const vlastnost of (runa.data.filtr ?? [])) {
    cena += _cenaSlova(vlastnost, znalosti, kniha, cerpane, hloubka);
  }
  return cena;
}

function _modifikatorNasobek(m) {
  let nasobek = Number(m.data.cena_nasobek ?? 1.25);
  if (m.data.negace) nasobek *= NEGACE_NASOBEK;   // přirážka za negaci (§3.5)
  return nasobek;
}

function _sleva(runaId, znalosti) {
  return 1.0 - SLEVA_MASTERY * (znalosti.mastery[runaId] ?? 0.0);
}

function _zaznam(jmeno, kniha) {
  if (kniha === null || kniha === undefined) {
    throw new ChybaKouzla(`Jméno '${jmeno.nazev}' nejde ocenit bez knihy kouzel.`);
  }
  const zaznam = kniha.zaznam(jmeno.id);
  if (zaznam === null || zaznam === undefined) {
    throw new ChybaKouzla(`Jméno '${jmeno.nazev}' není v knize kouzel.`);
  }
  return zaznam;
}

function _oUroven(hloubka) {
  if (hloubka + 1 >= MAX_HLOUBKA_ROZBALENI) {
    throw new ChybaKouzla(
      `Překročena hloubka rozbalení jmen (${MAX_HLOUBKA_ROZBALENI}) — pojistka §6.2.`);
  }
  return hloubka + 1;
}
