// Lexer runové věty: text kouzla → tokeny (port `lexuj` z `spelllang/parser.py`).
//
// Slova se párují na runy BEZ ohledu na velikost písmen i DIAKRITIKU
// (`Zazehni Ohen Nepritel` = `Zažehni Oheň Nepřítel`). Závorky jsou tokeny
// bez runy; `:` (zúžení cíle) a `ne`/`a`/`pak`/`skrze` JSOU runy — lexer je
// jen rozpozná, slučování negace i gramatika (→ AST) přijdou dalším dílem.
//
// Pozice tokenu je index prvního znaku v textu (pro šipku u chyb). Čeština je
// v základní rovině Unicode (BMP), takže index po code-unitech (JS) souhlasí
// s indexem po code-pointech (Python).

import { NeznameSlovo } from "./errors.js";

const _LPAREN = "(";
const _RPAREN = ")";
// `:` se odděluje i bez mezer: `Nepřítel:Kov` = `Nepřítel : Kov`.
const _TOKEN_RE = /\(|\)|:|[^\s():]+/g;

// Slovo bez diakritiky pro tolerantní párování run (rozklad NFKD + zahození
// spojovacích akcentů; velikost řeší volající přes toLowerCase).
export function _bezDiakritiky(s) {
  return s.normalize("NFKD").replace(/\p{M}/gu, "");
}

// casefold stand-in — pro češtinu se shoduje s toLowerCase (ověřeno u skloňování).
const _male = (s) => s.toLowerCase();

// Dvě vyhledávací mapy run: podle přesného názvu (male) a fallback bez
// diakritiky. Fallback VYNECHÁ kolize (dvě runy stejné bez diakritiky), ať
// jazyk nehádá — takové runy chtějí přesný název s diakritikou.
function _mapyRun(lex) {
  const podleNazvu = new Map();
  for (const r of Object.values(lex.runy)) podleNazvu.set(_male(r.nazev), r);

  const podleAscii = new Map();
  const kolize = new Set();
  for (const r of Object.values(lex.runy)) {
    const klic = _bezDiakritiky(_male(r.nazev));
    const drzitel = podleAscii.get(klic);
    if (drzitel !== undefined && drzitel.id !== r.id) kolize.add(klic);
    podleAscii.set(klic, r);
  }
  for (const klic of kolize) podleAscii.delete(klic);
  return { podleNazvu, podleAscii };
}

// Rozseká text na tokeny a přeloží slova na runy. Token = { text, pozice, runa }
// (runa je null pro závorky). Na první neznámé slovo vyhodí NeznameSlovo.
export function lexuj(text, lex) {
  const { podleNazvu, podleAscii } = _mapyRun(lex);
  const tokeny = [];
  for (const shoda of text.matchAll(_TOKEN_RE)) {
    const slovo = shoda[0];
    const pozice = shoda.index;
    if (slovo === _LPAREN || slovo === _RPAREN) {
      tokeny.push({ text: slovo, pozice, runa: null });
      continue;
    }
    const klic = _male(slovo);
    const runa = podleNazvu.get(klic) ?? podleAscii.get(_bezDiakritiky(klic)) ?? null;
    if (runa === null) {
      throw new NeznameSlovo(`Neznámé slovo: '${slovo}'`, text, pozice);
    }
    tokeny.push({ text: slovo, pozice, runa });
  }
  return tokeny;
}
