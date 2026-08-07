// Kniha kouzel — pojmenovaná kouzla jako funkce (§6). Port `spelllang/spellbook.py`:
// věc POJMENOVÁNÍ (`vyloz`, `Zaznam`, `Spellbook.pojmenuj`, kontrola cyklu, díl 3a)
// a věc ODVOZENÝCH LÁTEK (`zaznamenejLatku`, `slozkyLatky`, díl 3c) — ta patří
// k čerpání ze zdrojů okolí (§8.1), protože látka se objevuje U ZDROJE.
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

import { Fraze, runyV } from "./ast_nodes.js";
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

  // -- odvozené látky (§3.4, §8.1, #47) -------------------------------------

  // Odvozenou látku (Jed, Láva, Led…) zavede jako JMÉNO-LÁTKU. Definice je
  // BEZSLOVESNÁ FRÁZE základních živlů, z nichž látka vznikla (`Voda ne Život`):
  // na ně se při ocenění rozbalí, takže do látky jde čerpat manu ze zdrojů
  // okolí (základní živel z pramene je zdarma, §8.1).
  //
  // `nauc=true` (objev sesláním) runu rovnou přidá do znalostí. `nauc=false`
  // (naražení U ZDROJE, `prozkoumej` kotlík) jméno jen ZPŘÍSTUPNÍ — runa je
  // v lexikonu a záznam v knize, takže ho čaroděj umí napsat a čerpat, ale
  // NEUMÍ ho: naučí se až úspěšným sesláním. Vidět jméno ≠ umět ho.
  //
  // Vrací id runy jen když se skutečně NAUČILA (`nauc=true`), nebo když se nově
  // zavedlo viděné jméno (`nauc=false`); jinak `null`. Neběží přes `pojmenuj` —
  // objev v terénu nemá fázovou bránu ani práh mastery.
  //
  // PREREKVIZITA (§10.3): naučit látku lze jen se ZNÁMÝMI vnitřními složkami.
  // Neznámá složka = látka viděná a půjčitelná, ale nenaučitelná.
  zaznamenejLatku(zivel, podstaty, lex, znalosti, { nauc = true } = {}) {
    const jmenoId = _slug(zivel);
    if (jmenoId in this.zaznamy) {
      // Už zavedená (třeba viděná z prozkoumání zdroje) — definici NEPŘEPISUJ;
      // jen ji případně douč, zná-li čaroděj složky.
      if (nauc && !znalosti.zna(jmenoId)
          && this._naucLatku(jmenoId, this.zaznamy[jmenoId].ast, znalosti)) {
        return jmenoId;
      }
      return null;
    }
    if (znalosti.zna(jmenoId)) return null;
    const stavajici = lex.runy[jmenoId];
    if (stavajici !== undefined && stavajici.druh !== DRUH.JMENO) {
      return null;   // jméno koliduje s runou jazyka — nepřepisuj
    }
    const defAst = Fraze([], [...podstaty]);   // látka je fráze bez slovesa
    const runa = { id: jmenoId, druh: DRUH.JMENO, nazev: zivel,
                   data: { odvozeny: "podstata" } };
    lex.runy[jmenoId] = runa;
    this.zaznamy[jmenoId] = new Zaznam(
      runa, podstaty.map((p) => p.nazev).join(" "), [defAst], null);
    if (nauc) {
      return this._naucLatku(jmenoId, defAst, znalosti) ? jmenoId : null;
    }
    return jmenoId;   // nauc=false: nově zavedené viděné jméno
  }

  // Vnitřní runy receptu odvozené JMÉNO-LÁTKY (Voda, Život u Jedu), nebo `null`,
  // není-li `runaId` odvozená látka v knize. Prerekvizita naučení (§10.3).
  slozkyLatky(runaId) {
    const zaznam = this.zaznamy[runaId];
    if (zaznam === undefined || zaznam.runa.data.odvozeny !== "podstata") return null;
    return runyV(zaznam.ast);
  }

  // Naučí jméno-látku; mastery = MIN VNITŘNÍCH RUN definice (odvozená míra
  // seslání, jako u `pojmenuj`). Neznámá složka → nenaučí (vrací false).
  _naucLatku(jmenoId, defAst, znalosti) {
    const vnitrni = runyV(defAst);
    if (vnitrni.some((r) => !znalosti.zna(r.id))) return false;
    znalosti.runy.add(jmenoId);
    znalosti.mastery[jmenoId] = vnitrni.length
      ? Math.min(...vnitrni.map((r) => znalosti.mastery[r.id] ?? 0.0))
      : 0.0;
    return true;
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
