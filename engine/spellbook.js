// Kniha kouzel — pojmenovaná kouzla jako funkce (§6). Port `spelllang/spellbook.py`,
// jen VĚC POJMENOVÁNÍ: `vyloz`, `Zaznam`, `Spellbook.pojmenuj` a kontrola cyklu.
//
// Odvozené LÁTKY (`zaznamenej_latku`, `slozky_latky` z Pythonu, §3.4/#47) sem
// NEPATŘÍ — visí na čerpání many ze zdrojů okolí (§8.1) a přijdou s dílem o
// čerpání. Spellbook se řeže podle věci, ne podle řádků.
//
// `pojmenuj` udělá z hotového kouzla nové slovo: zvaliduje definici, odvodí
// slovní druh z kořene (látkový efekt → podstata, jinak sloveso, §6),
// zaregistruje runu JMENO do lexikonu a uloží záznam s (volitelně ukotveným)
// výkladem. Otevřené sloty definice jsou parametry — doplní je argumenty
// volání (evaluator).
//
// Ukotvení (§9.1): u nejednoznačného textu (víc výkladů) čaroděj v zázemí vybere
// výklad; volba se ukládá jako soukromá glosa záznamu, v textu run vidět není.
//
// Pojistka proti cyklu (§6.2): nové jméno na sebe odkázat nemůže (jeho runa
// při definici neexistuje), cyklus vznikne jen REDEFINICÍ — tu hlídá
// `_zkontrolujCyklus` průchodem odkazovaných jmen.

import { runyV } from "./ast_nodes.js";
import { TypEfektu } from "./effects.js";
import {
  ChybaKouzla,
  CyklusJmen,
  NedostatecnaMastery,
  Nejednoznacnost,
  NepovolenaGramatika,
} from "./errors.js";
import { vyhodnot } from "./evaluator.js";
import { parsuj } from "./parser.js";
import { FAZE_POJMENOVANI } from "./progression.js";
import { DRUH } from "./runy.js";
import { zvaliduj } from "./validator.js";

// Jméno musí být jeden token lexeru (bez mezer a závorek) — víceslovná jména
// spoj pomlčkou: "Ohnivý-šíp".
const _PLATNE_JMENO = /^[^\s()]+$/;

// Odvození slovního druhu z kořene (§6): tyto typy efektu produkují látku/objekt
// → jméno se chová jako podstata; ostatní jsou akce → sloveso. První aproximace;
// zjemní ji latentní význam (§7.1, později). Hodnoty = řetězce z `TypEfektu`.
const _LATKOVE_TYPY = new Set([TypEfektu.UZITEK, TypEfektu.PRIVOLANI]);

// Práh pro zabalení (§10.3): pojmenovat lze jen kouzlo, jehož každou runu
// čaroděj ovládá aspoň takto — cizí runu do jména „nevypereš". K balancování.
export const PRAH_ZABALENI = 0.3;

// Vybere výklad (§9.1): jediný projde sám; víc jich chce ukotvení.
export function vyloz(vyklady, ukotveni = null) {
  if (ukotveni !== null && ukotveni !== undefined) {
    if (!(ukotveni >= 0 && ukotveni < vyklady.length)) {
      throw new ChybaKouzla(
        `Ukotvení ${ukotveni} mimo rozsah — výkladů je ${vyklady.length}.`);
    }
    return vyklady[ukotveni];
  }
  if (vyklady.length > 1) {
    throw new Nejednoznacnost(
      `Kouzlo má ${vyklady.length} výklady — nedrží tvar a nesešle se. ` +
      "V zázemí lze výklad ukotvit (§9.1).");
  }
  return vyklady[0];
}

// Jedna položka knihy: jméno + definice + soukromá glosa (ukotvení). `ast` je
// zvolený výklad — evaluator i ceny ho čtou při rozbalení volání.
export class Zaznam {
  constructor(runa, text, vyklady, ukotveni) {
    this.runa = runa;         // runa JMENO zaregistrovaná v lexikonu
    this.text = text;         // původní zápis definice (runy, veřejně čitelné)
    this.vyklady = vyklady;   // všechny platné výklady textu (§9)
    this.ukotveni = ukotveni; // zvolený výklad; null = text byl jednoznačný
  }

  get ast() {
    return vyloz(this.vyklady, this.ukotveni);
  }
}

// Kniha kouzel jednoho čaroděje.
export class Spellbook {
  constructor() {
    this.zaznamy = {};   // id jména → Zaznam
  }

  zaznam(jmenoId) {
    return jmenoId in this.zaznamy ? this.zaznamy[jmenoId] : null;
  }

  // Pojmenuje kouzlo: text → nové slovo v lexikonu + záznam v knize. Vrací runu
  // nového jména. Redefinice existujícího jména je dovolená (přepíše záznam),
  // ale nesmí vytvořit cyklus (§6.2).
  pojmenuj(nazev, text, lex, znalosti, ukotveni = null) {
    if (znalosti.faze < FAZE_POJMENOVANI) {
      throw new NepovolenaGramatika(
        `Pojmenování vyžaduje fázi gramatiky ${FAZE_POJMENOVANI}, ` +
        `ty máš ${znalosti.faze} (§4.2).`);
    }
    if (!_PLATNE_JMENO.test(nazev)) {
      throw new ChybaKouzla(
        `Jméno '${nazev}' musí být jedno slovo — víceslovné spoj ` +
        'pomlčkou ("Ohnivý-šíp").');
    }
    const jmenoId = _slug(nazev);
    const stavajici = lex.runy[jmenoId];
    if (stavajici !== undefined && stavajici.druh !== DRUH.JMENO) {
      throw new ChybaKouzla(
        `Jméno '${nazev}' koliduje s runou jazyka '${stavajici.nazev}'.`);
    }

    const vyklady = parsuj(text, lex);
    const ast = vyloz(vyklady, ukotveni);  // víc výkladů bez ukotvení → chyba
    zvaliduj(ast, znalosti);               // čaroděj musí runy ovládat (§6)

    // Práh pro zabalení (§10.3): každá runa aspoň PRAH_ZABALENI mastery.
    const obsazene = runyV(ast);
    const slabe = obsazene
      .filter((r) => (znalosti.mastery[r.id] ?? 0.0) < PRAH_ZABALENI)
      .map((r) => r.nazev);
    if (slabe.length) {
      throw new NedostatecnaMastery(
        "Do jména nezabalíš runy, které sotva znáš (§10.3): " +
        `${slabe.join(", ")} — potřebuješ aspoň ${Math.round(PRAH_ZABALENI * 100)}% mastery.`);
    }

    if (jmenoId in this.zaznamy) {   // redefinice — jediná cesta ke vzniku cyklu
      this._zkontrolujCyklus(jmenoId, ast, nazev);
    }

    const efekt = vyhodnot(ast, lex, this);
    const odvozeny = _LATKOVE_TYPY.has(efekt.typ) ? "podstata" : "sloveso";
    const runa = { id: jmenoId, druh: DRUH.JMENO, nazev, data: { odvozeny } };

    lex.runy[jmenoId] = runa;
    znalosti.runy.add(jmenoId);
    // Počáteční mastery jména = min vnitřních run při pojmenování (§10.3).
    znalosti.mastery[jmenoId] = Math.min(
      ...obsazene.map((r) => znalosti.mastery[r.id] ?? 0.0));
    this.zaznamy[jmenoId] = new Zaznam(runa, text, vyklady, ukotveni);
    return runa;
  }

  // Nová definice nesmí (ani přes jiná jména) odkázat sama na sebe.
  _zkontrolujCyklus(jmenoId, ast, nazev) {
    const fronta = [..._jmenaV(ast)];
    const videna = new Set();
    while (fronta.length) {
      const odkaz = fronta.pop();
      if (odkaz === jmenoId) {
        throw new CyklusJmen(
          `Redefinice jména '${nazev}' by vytvořila cyklus — ` +
          "kouzlo by volalo samo sebe (§6.2).");
      }
      if (videna.has(odkaz)) continue;
      videna.add(odkaz);
      const zaznam = this.zaznamy[odkaz];
      if (zaznam !== undefined) fronta.push(..._jmenaV(zaznam.ast));
    }
  }
}

// Id všech jmen, na která AST odkazuje (volání, látky, kanály).
function _jmenaV(uzel) {
  switch (uzel.typ) {
    case "Volani": {
      const s = new Set([uzel.jmeno.id]);
      for (const x of _jmenaRun(uzel.podstaty)) s.add(x);
      return s;
    }
    case "Fraze":
      return _jmenaRun(uzel.podstaty);
    case "Skupina":
      return _jmenaV(uzel.vyraz);
    case "Spojeni": {
      const s = new Set();
      for (const c of uzel.casti) for (const x of _jmenaV(c)) s.add(x);
      return s;
    }
    case "Podminka": {
      const s = _jmenaV(uzel.telo);
      for (const x of _jmenaRun(uzel.stavy)) s.add(x);
      return s;
    }
    case "Skrze": {
      const s = _jmenaV(uzel.vyraz);
      for (const x of _jmenaRun([uzel.kanal])) s.add(x);
      return s;
    }
    default:
      return new Set();
  }
}

function _jmenaRun(runy) {
  return new Set(runy.filter((r) => r.druh === DRUH.JMENO).map((r) => r.id));
}

// Id runy z názvu: bez diakritiky, malými písmeny ("Ohnivý-šíp" → "ohnivy-sip").
// NFKD rozloží akcenty, zahození nad-ASCII je zahodí (jako Python `ascii ignore`),
// toLowerCase je casefold stand-in (pro češtinu ověřeno u skloňování).
function _slug(nazev) {
  return nazev.normalize("NFKD").replace(/[^\x00-\x7F]/g, "").toLowerCase();
}
