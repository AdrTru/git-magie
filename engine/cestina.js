// Skloňování hlášek v JS — port `spelllang/cestina.py`.
//
// Krok 3 přesunu enginu z Pythonu do prohlížeče: jazyk kouzel a skloňování.
// Drží se DĚLBY PRÁCE originálu:
//   * PODSTATNÁ JMÉNA SE NEHÁDAJÍ — bydlí v `SLOVA` jako autorská data
//     (`slova.js`, GENEROVANÝ z Pythonu). Co tam není, se neskloní: zůstane
//     v 1. pádě a hlídač si o slovo řekne. Lookup, ne odhad z koncovky.
//   * PŘÍDAVNÁ JMÉNA SE POČÍTAJÍ — jsou pravidelná, jakmile znám rod hlavy.
//   * OCAS FRÁZE SE OPISUJE — „Sud se smůlou", „Zeď (Kámen)": skloní se hlava,
//     zbytek jde beze změny.
//
// Věrnost se NEtvrdí, HLÍDÁ se: `oracle_jazyk.py` vydá z Pythonu očekávané
// tvary a `test/jazyk.test.mjs` ověří, že tenhle port počítá totéž. Slovník
// `SLOVA` je STEJNÁ DATA jako v Pythonu (generovaná, ne opsaná) — druhá kopie
// by se rozešla. Až Python půjde do důchodu (krok 5), zůstane tohle primár.

import { SLOVA } from "./slova.js";

export { SLOVA };
export const RODY = ["m", "mz", "z", "s", "mn"];
export const PADY = [2, 3, 4];

// -- přídavná jména: koncovky podle rodu a pádu (POČÍTÁ se) ------------------
const _TVRDE = {   // kamenný / kamenná / kamenné
  m:  { 2: "ého", 3: "ému", 4: "ý" },
  mz: { 2: "ého", 3: "ému", 4: "ého" },
  z:  { 2: "é",   3: "é",   4: "ou" },
  s:  { 2: "ého", 3: "ému", 4: "é" },
  mn: { 2: "ých", 3: "ým",  4: "é" },
};
const _MEKKE = {   // hřbitovní / severní / chrápající
  m:  { 2: "ího", 3: "ímu", 4: "í" },
  mz: { 2: "ího", 3: "ímu", 4: "ího" },
  z:  { 2: "í",   3: "í",   4: "í" },
  s:  { 2: "ího", 3: "ímu", 4: "í" },
  mn: { 2: "ích", 3: "ím",  4: "í" },
};
const _PRIVLASTNOVACI = {   // nekromantova / Vasilisina / Babin
  m:  { 2: "a",   3: "u",  4: "" },
  mz: { 2: "a",   3: "u",  4: "a" },
  z:  { 2: "y",   3: "ě",  4: "u" },
  s:  { 2: "a",   3: "u",  4: "o" },
  mn: { 2: "ých", 3: "ým", 4: "y" },
};
// Koncovka 1. pádu → [tabulka, kolik znaků useknout ze jmenného tvaru].
const _PRIDAVNA = [
  ["ova", _PRIVLASTNOVACI, 1], ["ina", _PRIVLASTNOVACI, 1],
  ["ovo", _PRIVLASTNOVACI, 1], ["ino", _PRIVLASTNOVACI, 1],
  ["ův", _PRIVLASTNOVACI, 2], ["in", _PRIVLASTNOVACI, 0],
  ["í", _MEKKE, 1],
  ["ý", _TVRDE, 1], ["á", _TVRDE, 1], ["é", _TVRDE, 1],
];

// Python `str.split()` bez argumentu: dělí na libovolné mezery a zahazuje
// prázdné (a s `" ".join` tím sjednotí vícenásobné mezery). `""` → [].
function _slova(s) {
  const orez = s.trim();
  return orez === "" ? [] : orez.split(/\s+/);
}

// Python `str.casefold()` → pro česká data stačí toLowerCase (á→á, Č→č).
function _male(s) {
  return s.toLowerCase();
}

// Python `str[:1].isupper()` — první znak je velké písmeno? Necasované znaky
// („5", „(") nejsou velké (lowercase je nezmění). Prázdný řetězec → false.
function _jeVelke(s) {
  const prvni = s.charAt(0);
  return prvni !== "" && prvni.toLowerCase() !== prvni;
}

function _sklonujPridavne(slovo, rod, pad) {
  const male = _male(slovo);
  for (const [koncovka, tabulka, useknout] of _PRIDAVNA) {
    if (male.endsWith(koncovka)) {
      const kmen = useknout ? slovo.slice(0, slovo.length - useknout) : slovo;
      return kmen + tabulka[rod][pad];
    }
  }
  return null;
}

// Velké písmeno drží podle původního slova („Truhla" → „Truhly").
function _jakoOriginal(vzor, novy) {
  return _jeVelke(vzor) ? novy.slice(0, 1).toUpperCase() + novy.slice(1) : novy;
}

// Index první známé hlavy a její rod. Před hlavou smí stát jen přídavná jména;
// jinak (přívlastek ve 2. pádě) fráze propadne — a to je správně, hádat by se
// nemělo.
function _hlava(nazev) {
  const slova = _slova(nazev);
  for (let i = 0; i < slova.length; i++) {
    const zaznam = Object.hasOwn(SLOVA, _male(slova[i])) ? SLOVA[_male(slova[i])] : null;
    if (zaznam) return [i, zaznam[0]];
    if (_sklonujPridavne(slova[i], "z", 2) === null) return null;
  }
  return null;
}

// Rod podle hlavy fráze.
export function rodFraze(nazev) {
  const hlava = _hlava(nazev);
  return hlava ? hlava[1] : null;
}

// Fráze v daném pádě. Co neumí, vrátí v prvním — nikdy nehádá. Pořadí je dané:
// PŘEPIS VYHRÁVÁ (autorská výjimka), pak slovník, pak beze změny.
export function sklonuj(nazev, pad, prepis = null) {
  if (prepis && prepis[String(pad)]) return prepis[String(pad)];
  if (!PADY.includes(pad)) return nazev;
  const hlava = _hlava(nazev);
  if (hlava === null) return nazev;
  const [kde, rod] = hlava;
  const slova = _slova(nazev);
  const hotovo = [];
  for (let i = 0; i <= kde; i++) {
    const slovo = slova[i];
    const novy = (i === kde)
      ? SLOVA[_male(slovo)][pad - 1]
      : _sklonujPridavne(slovo, rod, pad);
    hotovo.push(_jakoOriginal(slovo, novy));
  }
  return hotovo.concat(slova.slice(kde + 1)).join(" ");
}

// -- předložky a zájmena ----------------------------------------------------
// Slabičné předložky: která PRVNÍ hláska dalšího slova si vyžádá „ke/ze/se/ve"
// — vlastní hláska předložky a její znělý/neznělý protějšek.
const _VOKALIZACE = { k: "kg", z: "szšž", s: "szšž", v: "vf" };
// Začátky, po nichž se vokalizuje bez ohledu na předložku. Schválně krátký
// seznam, ne „dvě souhlásky" (to je moc hrubé a udělalo by „ke Truhle").
const _SHLUKY = ["s", "z", "š", "ž", "dv", "mn"];
const _SAMOHLASKY = "aeiouyáéěíóúůý";
const _ZAJMENA = { m: "ho", mz: "ho", z: "ji", s: "ho", mn: "je" };

function _zadaSiE(slovo) {
  const male = _male(slovo);
  return _SHLUKY.some((s) =>
    male.startsWith(s) && male.length > s.length &&
    !_SAMOHLASKY.includes(male[s.length]));
}

// `k` → `ke` před shlukem a před vlastní hláskou. Závisí jen na první hlásce.
export function vokalizuj(predlozka, slovo) {
  const zaklad = _male(predlozka);
  if (!Object.hasOwn(_VOKALIZACE, zaklad) || !slovo) return predlozka;
  if (_VOKALIZACE[zaklad].includes(_male(slovo)[0]) || _zadaSiE(slovo)) {
    return predlozka + "e";
  }
  return predlozka;
}

// „k" + Pochodeň(3.) → „ke Pochodni". Vokalizace se počítá z TOHO tvaru, který
// se vypíše — z 1. pádu by vyšlo „ke Pochodeň", tedy druhá chyba místo první.
// (Python `s_predlozkou` bere `Objekt`; JS zatím bez něj → bere jméno a pád.)
export function sPredlozkou(predlozka, nazev, pad, prepis = null) {
  const tvar = sklonuj(nazev, pad, prepis);
  return `${vokalizuj(predlozka, tvar)} ${tvar}`;
}

// „neseš ho / ji / je". Rod bere zadaný, jinak z hlavy; bez obojího mužský
// („ho"). (Python `zajmeno` bere `Objekt` a jen 4. pád; JS bere jméno a rod.)
export function zajmeno(nazev, rod = null) {
  const r = rod || rodFraze(nazev) || "m";
  return Object.hasOwn(_ZAJMENA, r) ? _ZAJMENA[r] : "ho";
}
