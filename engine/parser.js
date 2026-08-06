// Lexer + parser runové věty: text kouzla → AST (port `spelllang/parser.py`,
// gramatika §3.3). Veřejné API:
//   * `lexuj(text, lex)`  — text → tokeny (párování slov na runy),
//   * `parsuj(text, lex)` — text → seznam VŠECH platných výkladů (AST, §9).
//
// Nejednoznačnost dnes vzniká sloučenými slovesy (#25): každé sloveso může být
// hlava fráze → jeden výklad na hlavu. Vynucovaná pravidla: pevný slovosled
// fráze (sloveso → podstata → cíl → forma → modifikátor), mix spojek žádá bloky,
// podmínka je vždy blok s predikátovým čtením, `skrze` váže kanál na předchozí
// člen, cíl/modifikátor za blokem doplní otevřené sloty, chybí-li sloveso a
// fráze začíná slotem, doplní se výchozí `Zažehni`.

import { NeznameSlovo, ChybaKouzla, ChybaGramatiky } from "./errors.js";
import { DRUH } from "./runy.js";
import { neguj, zuz } from "./lexikon.js";
import { Fraze, Volani, Skupina, Spojeni, Podminka, Skrze } from "./ast_nodes.js";

const _LPAREN = "(";
const _RPAREN = ")";
// `:` (zúžení cíle, #38) se odděluje i bez mezer: `Nepřítel:Kov` = `Nepřítel : Kov`.
const _TOKEN_RE = /\(|\)|:|[^\s():]+/g;

// Pořadí slotů ve frázi (§3.2) — index = pozice ve slovosledu.
const _SLOVOSLED = [DRUH.SLOVESO, DRUH.PODSTATA, DRUH.CIL, DRUH.FORMA, DRUH.MODIFIKATOR];
const _KANAL_DRUHY = [DRUH.PODSTATA, DRUH.CIL, DRUH.JMENO];

// Slovní druh pro gramatiku: jméno se chová podle odvozeného druhu (§6).
function _efektivniDruh(runa) {
  if (runa.druh === DRUH.JMENO) {
    if (runa.data.odvozeny === "podstata") return DRUH.PODSTATA;
    return DRUH.SLOVESO;
  }
  return runa.druh;
}

// ---- lexer ---------------------------------------------------------------

// Slovo bez diakritiky pro tolerantní párování run (NFKD + zahození akcentů).
export function _bezDiakritiky(s) {
  return s.normalize("NFKD").replace(/\p{M}/gu, "");
}

// casefold stand-in — pro češtinu se shoduje s toLowerCase (ověřeno u skloňování).
const _male = (s) => s.toLowerCase();

// Dvě vyhledávací mapy run: podle přesného názvu (male) a fallback bez
// diakritiky. Fallback VYNECHÁ kolize (dvě runy stejné bez diakritiky).
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

// ---- slučování negace + výklady ------------------------------------------

// `ne X` → jeden token s odvozenou runou (§3.5). `ne` před '(' zůstává —
// negaci predikátu zpracuje parser. Sémantiku odvození dodává neguj().
function _slucNegace(tokeny, lex, text) {
  const vysledek = [];
  let i = 0;
  while (i < tokeny.length) {
    const tok = tokeny[i];
    if (tok.runa === null || tok.runa.id !== "ne") {
      vysledek.push(tok);
      i += 1;
      continue;
    }
    const dalsi = i + 1 < tokeny.length ? tokeny[i + 1] : null;
    if (dalsi === null || (dalsi.runa === null && dalsi.text === _RPAREN)) {
      throw new ChybaGramatiky("Za 'ne' patří runa, nebo predikát.", text, tok.pozice);
    }
    if (dalsi.runa === null) {   // 'ne (' — negace predikátu, nechá se parseru
      vysledek.push(tok);
      i += 1;
      continue;
    }
    if (dalsi.runa.id === "ne") {
      throw new ChybaGramatiky("Dvojitá negace nedává smysl — řekni to přímo.", text, tok.pozice);
    }
    if (dalsi.runa.druh === DRUH.JMENO) {
      throw new ChybaGramatiky(
        "Negace jména (zrušení kouzla) je metamagie — zatím mimo rozsah (§3.5).", text, tok.pozice);
    }
    if (dalsi.runa.druh === DRUH.SPOJKA) {
      throw new ChybaGramatiky("Negovat lze runu, ne spojku.", text, tok.pozice);
    }
    let odvozena;
    try {
      odvozena = neguj(dalsi.runa, lex);
    } catch (chyba) {
      if (chyba instanceof ChybaKouzla) {
        throw new chyba.constructor(chyba.zprava, text, tok.pozice);
      }
      throw chyba;
    }
    vysledek.push({ text: `ne ${dalsi.text}`, pozice: tok.pozice, runa: odvozena });
    i += 2;
  }
  return vysledek;
}

// Kartézský součin seznamů (jako itertools.product) — pořadí sedí na Python.
function _kartezsky(seznamy) {
  return seznamy.reduce(
    (acc, sez) => acc.flatMap((pref) => sez.map((x) => [...pref, x])),
    [[]],
  );
}

// Vyjmenuje všechny platné výklady (§9, #25). Sloučená různá slovesa: každé
// může být hlava → jeden výklad na hlavu (hlava první, zbytek v pořadí).
// Výklady složených uzlů jsou kartézský součin výkladů částí.
function _vyklady(uzel) {
  if (uzel.typ === "Fraze") {
    const hlavy = [];
    for (const r of uzel.sloveso) if (!hlavy.includes(r.id)) hlavy.push(r.id);
    if (hlavy.length === 1) return [uzel];
    return hlavy.map((hlava) => ({
      ...uzel,
      sloveso: [
        ...uzel.sloveso.filter((r) => r.id === hlava),
        ...uzel.sloveso.filter((r) => r.id !== hlava),
      ],
    }));
  }
  if (uzel.typ === "Skupina") {
    return _vyklady(uzel.vyraz).map((v) => ({ ...uzel, vyraz: v }));
  }
  if (uzel.typ === "Spojeni") {
    return _kartezsky(uzel.casti.map(_vyklady)).map((komb) => ({ ...uzel, casti: komb }));
  }
  if (uzel.typ === "Podminka") {
    return _vyklady(uzel.telo).map((v) => ({ ...uzel, telo: v }));
  }
  if (uzel.typ === "Skrze") {
    return _vyklady(uzel.vyraz).map((v) => ({ ...uzel, vyraz: v }));
  }
  return [uzel];   // Volani a listové uzly jsou jednoznačné
}

// ---- parser (recursive descent §3.3) -------------------------------------

class _Parser {
  constructor(tokeny, text, lex) {
    this.tokeny = tokeny;
    this.text = text;
    this.lex = lex;
    this.i = 0;
  }

  _tok() { return this.i < this.tokeny.length ? this.tokeny[this.i] : null; }

  _pozice() { const t = this._tok(); return t ? t.pozice : this.text.length; }

  _jeZavorka(znak) {
    const t = this._tok();
    return t !== null && t.runa === null && t.text === znak;
  }

  // Porovnává EFEKTIVNÍ druh — jméno se počítá za svůj odvozený druh (§6).
  _jeDruh(...druhy) {
    const t = this._tok();
    return t !== null && t.runa !== null && druhy.includes(_efektivniDruh(t.runa));
  }

  _jeSpojka(id = null) {
    const t = this._tok();
    return t !== null && t.runa !== null && t.runa.druh === DRUH.SPOJKA
      && (id === null || t.runa.id === id);
  }

  // Nesloučené 'ne' — po _slucNegace zbývá jen před '(' (negace predikátu).
  _jeNe() {
    const t = this._tok();
    return t !== null && t.runa !== null && t.runa.id === "ne";
  }

  _vezmi() { const t = this._tok(); this.i += 1; return t; }

  _ocekavejZavorku(znak, kontext) {
    if (!this._jeZavorka(znak)) {
      throw new ChybaGramatiky(`Očekávám '${znak}' (${kontext}).`, this.text, this._pozice());
    }
    this._vezmi();
  }

  _sber(druh) {
    const runy = [];
    while (this._jeDruh(druh)) {
      runy.push(this._vezmi().runa);
      if (druh === DRUH.CIL && this._jeSpojka("zuzeni")) {
        runy[runy.length - 1] = this._zuzeni(runy[runy.length - 1]);
      }
    }
    return runy;
  }

  // `CÍL : VLASTNOST…` (#38) — vlastnosti jsou podstaty ve stavovém čtení.
  // Řetězení `Cíl : X : Y` je dovolené a rovná se `Cíl : X Y` (průnik).
  _zuzeni(cil) {
    const dvojtecka = this._vezmi();  // :
    const vlastnosti = [];
    for (;;) {
      const tok = this._tok();
      if (tok !== null && tok.runa !== null && tok.runa.druh === DRUH.PODSTATA) {
        vlastnosti.push(this._vezmi().runa);
      } else if (this._jeSpojka("zuzeni")) {
        this._vezmi();
      } else {
        break;
      }
    }
    if (vlastnosti.length === 0) {
      throw new ChybaGramatiky(
        "Za ':' patří vlastnost cíle — runa podstaty ve stavovém čtení "
        + "(`Nepřítel : Oheň` = hořící nepřítel, #38).", this.text, dvojtecka.pozice);
    }
    return zuz(cil, vlastnosti);
  }

  kouzlo() {
    const uzel = this.vyraz();
    if (this._tok() !== null) {
      const tok = this._tok();
      if (tok.runa === null && tok.text === _RPAREN) {
        throw new ChybaGramatiky("Přebývá ')'.", this.text, tok.pozice);
      }
      throw new ChybaGramatiky(
        `Nečekané slovo '${tok.text}' — sem patří spojka, nebo konec kouzla.`,
        this.text, tok.pozice);
    }
    return uzel;
  }

  vyraz() {
    // `pokud` stojí na začátku výrazu: pokud ( predikát ) pak člen
    if (this._jeSpojka("pokud")) return this._podminka();

    const casti = [this._clen()];
    let operator = null;
    while (this._jeSpojka()) {
      const tok = this._tok();
      if (tok.runa.id === "skrze") {
        throw new ChybaGramatiky(
          "'skrze' se váže na předchozí frázi/blok — tady nedává smysl.",
          this.text, tok.pozice);
      }
      if (tok.runa.id === "pokud") {
        throw new ChybaGramatiky(
          "'pokud' patří na začátek výrazu (případně uvnitř bloku).",
          this.text, tok.pozice);
      }
      if (tok.runa.id === "ne") {
        throw new ChybaGramatiky(
          "'ne' neguje runu nebo predikát 'pokud ne ( … )' — jako spojka nefunguje (§3.5).",
          this.text, tok.pozice);
      }
      if (tok.runa.id === "zuzeni") {
        throw new ChybaGramatiky(
          "':' zužuje cíl — patří hned za runu cíle (`Nepřítel : Oheň`, #38).",
          this.text, tok.pozice);
      }
      if (operator !== null && tok.runa.id !== operator) {
        throw new ChybaGramatiky(
          `Mix spojek '${operator}' a '${tok.runa.id}' vyžaduje bloky (§3.2) — `
          + `např. ( A ${operator} B ) ${tok.runa.id} C.`, this.text, tok.pozice);
      }
      operator = tok.runa.id;
      this._vezmi();
      casti.push(this._clen());
    }

    if (casti.length === 1) return casti[0];
    return Spojeni(operator, casti);
  }

  _podminka() {
    this._vezmi();  // pokud
    // Negace predikátu (§3.5): `pokud ne ( … ) pak` i `pokud ( ne ( … ) ) pak`.
    let negace = this._jeNe();
    if (negace) this._vezmi();
    this._ocekavejZavorku(_LPAREN, "podmínka je vždy v bloku");
    const vnorena = !negace && this._jeNe();
    if (vnorena) {
      negace = true;
      this._vezmi();
      this._ocekavejZavorku(_LPAREN, "negovaný predikát je v bloku");
    }
    if (!this._jeDruh(DRUH.CIL)) {
      throw new ChybaGramatiky(
        "Predikát začíná cílem: pokud ( Nepřítel Oheň ) pak …", this.text, this._pozice());
    }
    const cil = this._vezmi().runa;
    if (this._jeSpojka("zuzeni")) {
      throw new ChybaGramatiky(
        "V predikátu se cíl nezužuje — stavy za cílem už popis jsou "
        + "(`( Nepřítel Oheň )` = hořící nepřítel, #38).", this.text, this._pozice());
    }
    const stavy = [];
    while (this._jeDruh(DRUH.PODSTATA, DRUH.FORMA)) stavy.push(this._vezmi().runa);
    this._ocekavejZavorku(_RPAREN, "konec predikátu");
    if (vnorena) this._ocekavejZavorku(_RPAREN, "konec negace predikátu");
    if (!this._jeSpojka("pak")) {
      throw new ChybaGramatiky("Po podmínce následuje 'pak'.", this.text, this._pozice());
    }
    this._vezmi();  // pak
    const telo = this._clen();
    return Podminka(cil, stavy, telo, negace);
  }

  _clen() {
    let uzel;
    if (this._jeZavorka(_LPAREN)) {
      this._vezmi();
      const vyraz = this.vyraz();
      this._ocekavejZavorku(_RPAREN, "konec bloku");
      // cíl/modifikátor za blokem doplní otevřené sloty (§3.3)
      const cile = this._sber(DRUH.CIL);
      const modifikatory = this._sber(DRUH.MODIFIKATOR);
      uzel = Skupina(vyraz, cile, modifikatory);
    } else {
      uzel = this._frazeNeboVolani();
    }

    // postfix: X skrze K (i opakovaně: X skrze K skrze L)
    while (this._jeSpojka("skrze")) {
      const skrzeTok = this._vezmi();
      if (!this._jeDruh(..._KANAL_DRUHY)) {
        throw new ChybaGramatiky(
          "Za 'skrze' patří kanál (podstata, cíl, nebo jméno).",
          this.text, this._tok() ? this._pozice() : skrzeTok.pozice);
      }
      uzel = Skrze(uzel, this._vezmi().runa);
    }
    return uzel;
  }

  // Chybí-li sloveso a fráze začíná slotem, doplň výchozí `Zažehni` (§3.3).
  // Jen když fráze začíná OBSAHEM (podstata/cíl/forma) — holý modifikátor
  // kouzlo netvoří. Cizí lexikon bez `Zažehni` → null (původní chyba).
  _vychoziSloveso() {
    if (!this._jeDruh(DRUH.PODSTATA, DRUH.CIL, DRUH.FORMA)) return null;
    return this.lex.runy.zazehni ?? null;
  }

  _frazeNeboVolani() {
    if (!this._jeDruh(DRUH.SLOVESO)) {
      const vychozi = this._vychoziSloveso();
      if (vychozi !== null) {
        const sloty = this._sberSloty("ve frázi");
        return Fraze([vychozi], sloty[DRUH.PODSTATA], sloty[DRUH.CIL],
                     sloty[DRUH.FORMA], sloty[DRUH.MODIFIKATOR]);
      }
      const tok = this._tok();
      const popis = tok ? ` '${tok.text}'` : "";
      throw new ChybaGramatiky(
        `Fráze musí začínat slovesem, ne${popis}.`, this.text, this._pozice());
    }

    // Jméno s odvozeným druhem sloveso = volání funkce (§6).
    if (this._tok().runa.druh === DRUH.JMENO) {
      const jmeno = this._vezmi().runa;
      const sloty = this._sberSloty(`za voláním jména '${jmeno.nazev}'`);
      return Volani(jmeno, sloty[DRUH.PODSTATA], sloty[DRUH.CIL],
                    sloty[DRUH.FORMA], sloty[DRUH.MODIFIKATOR]);
    }

    const slovesa = [];
    while (this._jeDruh(DRUH.SLOVESO) && this._tok().runa.druh === DRUH.SLOVESO) {
      slovesa.push(this._vezmi().runa);
    }
    const sloty = this._sberSloty("ve frázi");
    return Fraze(slovesa, sloty[DRUH.PODSTATA], sloty[DRUH.CIL],
                 sloty[DRUH.FORMA], sloty[DRUH.MODIFIKATOR]);
  }

  // Sloty za hlavou fráze/volání: podstata → cíl → forma → modifikátor.
  _sberSloty(kontext) {
    const sloty = {};
    for (const d of _SLOVOSLED) sloty[d] = [];
    let fazeSlotu = 1;  // slovesa už má hlava; tady jen doplnění
    while (this._jeDruh(..._SLOVOSLED)) {
      const tok = this._tok();
      const druh = _efektivniDruh(tok.runa);
      if (druh === DRUH.SLOVESO) {
        if (tok.runa.druh === DRUH.JMENO) {
          throw new ChybaGramatiky(
            `Jméno '${tok.text}' má význam akce — může jen zahajovat frázi `
            + "(volání). Vložení do věty přinese 'jako' (krok 8).", this.text, tok.pozice);
        }
        throw new ChybaGramatiky(
          `Sloveso '${tok.text}' nemůže stát ${kontext} `
          + "(pevné pořadí: sloveso → podstata → cíl → forma → modifikátor).",
          this.text, tok.pozice);
      }
      const index = _SLOVOSLED.indexOf(druh);
      if (index < fazeSlotu) {
        throw new ChybaGramatiky(
          `Porušený slovosled: ${druh} nemůže stát za ${_SLOVOSLED[fazeSlotu]} `
          + "(pevné pořadí: sloveso → podstata → cíl → forma → modifikátor).",
          this.text, tok.pozice);
      }
      fazeSlotu = index;
      sloty[druh].push(this._vezmi().runa);
      if (druh === DRUH.CIL && this._jeSpojka("zuzeni")) {
        sloty[druh][sloty[druh].length - 1] = this._zuzeni(sloty[druh][sloty[druh].length - 1]);
      }
    }
    return sloty;
  }
}

// Text kouzla → seznam platných výkladů (AST).
export function parsuj(text, lex) {
  const tokeny = _slucNegace(lexuj(text, lex), lex, text);
  if (tokeny.length === 0) throw new ChybaGramatiky("Prázdné kouzlo.", text, 0);
  const parser = new _Parser(tokeny, text, lex);
  const uzel = parser.kouzlo();
  return _vyklady(uzel);
}
