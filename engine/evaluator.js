// Vyhodnocení AST → SpellEffect (port `spelllang/evaluator.py`, §5).
//
// Sémantika více run téhož druhu (§3.4): stejná runa opakovaně → intenzita;
// různé runy téhož druhu → kombinace (živly a formy sekvenčně zleva doprava
// podle datových tabulek lexikonu; emergentní živel vstupuje do dalších
// interakcí; neznámá dvojice = surge). Podmínku a kanál jen zapíše do efektu —
// jejich vyhodnocení nad stavem scény dělá engine. Volání jména se rozbaluje
// (inlining) z knihy kouzel; limit hloubky je pojistka §6.2.

import { Fraze, Podminka, Skrze, Skupina, Spojeni, Volani } from "./ast_nodes.js";
import { SpellEffect, TypEfektu } from "./effects.js";
import { ChybaKouzla } from "./errors.js";
import { interakce, interakceFormy } from "./lexikon.js";
import { DRUH } from "./runy.js";

// O kolik zesílí efekt každá další runa TÉŽE podstaty/cíle (intenzita).
const _INTENZITA = 1.4;
// Pojistka proti nekonečnu (§6.2): strop zanoření při rozbalování jmen.
export const MAX_HLOUBKA_ROZBALENI = 16;

// AST → SpellEffect. `kniha` (Spellbook) je nutná jen pro volání jmen.
export function vyhodnot(uzel, lex, kniha = null, _hloubka = 0) {
  switch (uzel.typ) {
    case "Fraze": return _vyhodnotFrazi(uzel, lex, kniha, _hloubka);
    case "Volani": return _vyhodnotVolani(uzel, lex, kniha, _hloubka);
    case "Skupina": return _vyhodnotSkupinu(uzel, lex, kniha, _hloubka);
    case "Spojeni": return _vyhodnotSpojeni(uzel, lex, kniha, _hloubka);
    case "Podminka": return _vyhodnotPodminku(uzel, lex, kniha, _hloubka);
    case "Skrze": return _vyhodnotSkrze(uzel, lex, kniha, _hloubka);
    default: throw new TypeError(`Neznámý uzel AST: ${JSON.stringify(uzel)}`);
  }
}

// Zapamatuje efektu SLOVA, ze kterých vznikl (§4.1). Negované se vynechávají
// (`ne Sváž` nesváže → žádná stopa), pořadí se drží, duplicity padají.
function _zapisRuny(ef, fraze) {
  const videne = [];
  for (const skupina of [fraze.sloveso, fraze.podstaty, fraze.cile,
                         fraze.formy, fraze.modifikatory]) {
    for (const runa of skupina) {
      if (runa.data.negace || videne.includes(runa.id)) continue;
      videne.push(runa.id);
    }
  }
  ef.runy = videne;
}

function _vyhodnotFrazi(fraze, lex, kniha, hloubka) {
  if (fraze.sloveso.length === 0) {
    // Bezslovesná LÁTKOVÁ fráze (§3.4): jen výraz látky (vzniká synteticky).
    const ef = new SpellEffect({ typ: TypEfektu.UZITEK });
    _slozitZivly(ef, fraze.podstaty, lex, kniha, hloubka);
    return ef;
  }

  // 1) Základ z prvního slovesa; opakování téhož slovesa = intenzita (§3.4).
  const hlava = fraze.sloveso[0].data;
  const ef = new SpellEffect({
    typ: TypEfektu[hlava.typ ?? "POSKOZENI"],
    sila: Number(hlava.sila ?? 0),
    dosah: Number(hlava.dosah ?? 0),
    trvani: Number(hlava.trvani ?? 0),
  });
  const priznakSlovesa = hlava.priznak;   // protiklad slovesa nese vlastní příznak
  if (priznakSlovesa) ef.priznaky.push(priznakSlovesa);
  ef.produkuje = hlava.produkuje ?? null;  // latentní kanál (Sváž → "Spojení")
  for (let i = 1; i < fraze.sloveso.length; i++) ef.sila *= _INTENZITA;
  _zapisRuny(ef, fraze);

  // 2) Živly — intenzita (stejné) nebo kombinace (různé), zleva doprava.
  _slozitZivly(ef, fraze.podstaty, lex, kniha, hloubka);
  // 3) Cíle — opakování = intenzita, různé = víc cílů (zúžení #38).
  for (const c of fraze.cile) _pridejCil(ef, c);
  // 4) Formy — intenzita (stejné) nebo složená forma (různé), zleva doprava.
  _slozitFormy(ef, fraze.formy, lex);
  // 5) Modifikátory — každá runa je transformace parametru (skládá se).
  for (const m of fraze.modifikatory) _uplatniModifikator(ef, m);

  return ef;
}

function _slozitZivly(ef, podstaty, lex, kniha = null, hloubka = 0) {
  for (let p of podstaty) {
    if (p.druh === DRUH.JMENO) {
      // Jméno-látka (§6): rozbalí se a do skládání vstoupí jeho živel.
      const vnitrni = _rozbalJmeno(p, lex, kniha, hloubka);
      for (const priznak of vnitrni.priznaky) {
        if (!ef.priznaky.includes(priznak)) ef.priznaky.push(priznak);
      }
      if (vnitrni.zivel === null) continue;  // látka bez živlu skládání nemění
      p = { id: p.id, druh: DRUH.PODSTATA, nazev: vnitrni.zivel, data: {} };
    }
    const nazev = p.nazev;
    if (ef.zivel === null) {
      ef.zivel = nazev;
      const priznak = p.data.priznak;
      if (priznak && !ef.priznaky.includes(priznak)) ef.priznaky.push(priznak);
    } else if (ef.zivel === nazev) {
      ef.sila *= _INTENZITA;   // stejný živel → intenzita
    } else {
      const inter = interakce(lex, ef.zivel, nazev);
      if (inter) {   // známá kombinace → emergentní efekt
        ef.zivel = inter.zivel;
        ef.sila += inter.sila_bonus ?? 0;
        const pr = inter.priznak;
        if (pr && !ef.priznaky.includes(pr)) ef.priznaky.push(pr);
      } else {   // neznámá dvojice → surge; příznaky rodičů se ale skládají (#39)
        ef.zivel = `${ef.zivel}+${nazev}`;
        const pr = p.data.priznak;
        if (pr && !ef.priznaky.includes(pr)) ef.priznaky.push(pr);
        if (!ef.priznaky.includes("surge")) ef.priznaky.push("surge");
      }
    }
  }
}

// Cíl do efektu: opakování = intenzita; zúžený cíl (#38) nese filtr.
function _pridejCil(ef, cil) {
  if (ef.cile.includes(cil.nazev)) {
    ef.sila *= _INTENZITA;
    return;
  }
  ef.cile.push(cil.nazev);
  const strana = cil.data.strana;
  if (strana) ef.strany[cil.nazev] = strana;
  const filtr = cil.data.filtr;
  if (filtr) {
    ef.filtry[cil.nazev] = {
      cil: cil.data.zaklad ?? cil.nazev,
      stavy: filtr.map((v) => v.data.priznak ?? v.nazev),
    };
  }
}

// Sekvenční skládání forem zleva doprava — zrcadlí _slozitZivly (§3.4).
// NÁSOBKY UPLATNÍ KAŽDÁ FORMA, ať stojí první, nebo se skládá.
function _slozitFormy(ef, formy, lex) {
  for (const f of formy) {
    const nazev = f.nazev;
    if (ef.forma !== null && ef.forma === nazev) {
      ef.dosah *= _INTENZITA;   // táž geometrie → výraznější
      continue;
    }
    // Geometrie je v datech formy (#37) — žádný kód per forma.
    ef.dosah *= Number(f.data.dosah_nasobek ?? 1.0);
    const zaklad = Number(f.data.trvani_zaklad ?? 0.0);
    ef.trvani = Math.max(ef.trvani, zaklad) * Number(f.data.trvani_nasobek ?? 1.0);
    if (ef.forma === null) {
      ef.forma = nazev;
    } else {
      const inter = interakceFormy(lex, ef.forma, nazev);
      if (inter) {   // známá kombinace → složená forma
        ef.forma = inter.forma;
        const pr = inter.priznak;
        if (pr && !ef.priznaky.includes(pr)) ef.priznaky.push(pr);
      } else {
        ef.forma = `${ef.forma}+${nazev}`;
        if (!ef.priznaky.includes("surge")) ef.priznaky.push("surge");
      }
    }
  }
}

function _uplatniModifikator(ef, m) {
  const parametr = m.data.parametr;
  const nasobek = Number(m.data.nasobek ?? 1.0);
  if (parametr && parametr in ef) ef[parametr] *= nasobek;
  // Způsobové modifikátory (§5.2): přepnutí režimu trvání / přidání příznaku.
  const rezim = m.data.rezim;
  if (rezim) ef.rezimTrvani = rezim;
  const priznak = m.data.priznak;
  if (priznak && !ef.priznaky.includes(priznak)) ef.priznaky.push(priznak);
}

// -- volání jména (§6): rozbalení z knihy; kniha netřeba pro základní runy ----

function _vyhodnotVolani(volani, lex, kniha, hloubka) {
  const ef = _rozbalJmeno(volani.jmeno, lex, kniha, hloubka);
  if (volani.podstaty.length) {
    _naListy(ef, (cast) => _slozitZivly(cast, volani.podstaty, lex, kniha, hloubka));
  }
  if (volani.cile.length) _doplnCile(ef, volani.cile);
  if (volani.formy.length) {
    _naListy(ef, (cast) => _slozitFormy(cast, volani.formy, lex));
  }
  for (const m of volani.modifikatory) _uplatniModifikatorRekurzivne(ef, m);
  _preprocitejObalky(ef);
  return ef;
}

function _rozbalJmeno(jmeno, lex, kniha, hloubka) {
  if (kniha === null || kniha === undefined) {
    throw new ChybaKouzla(`Jméno '${jmeno.nazev}' nejde rozbalit bez knihy kouzel.`);
  }
  if (hloubka >= MAX_HLOUBKA_ROZBALENI) {
    throw new ChybaKouzla(
      `Překročena hloubka rozbalení jmen (${MAX_HLOUBKA_ROZBALENI}) — pojistka §6.2.`);
  }
  const zaznam = kniha.zaznam(jmeno.id);
  if (zaznam === null || zaznam === undefined) {
    throw new ChybaKouzla(`Jméno '${jmeno.nazev}' není v knize kouzel.`);
  }
  return vyhodnot(zaznam.ast, lex, kniha, hloubka + 1);
}

// Aplikuje funkci na listové efekty — obálky složených kouzel přeskočí.
function _naListy(ef, funkce) {
  if (ef.slozky.length) {
    for (const slozka of ef.slozky) _naListy(slozka, funkce);
  } else {
    funkce(ef);
  }
}

// Po doplnění argumentů znovu spočítá souhrny obálek složených kouzel.
function _preprocitejObalky(ef) {
  if (ef.slozky.length === 0) return;
  for (const slozka of ef.slozky) _preprocitejObalky(slozka);
  ef.sila = ef.slozky.reduce((s, x) => s + x.sila, 0);
  ef.dosah = Math.max(...ef.slozky.map((s) => s.dosah));
  const agregat = ef.priznaky.includes("sekvence")
    ? (xs) => xs.reduce((s, x) => s + x, 0)
    : (xs) => Math.max(...xs);
  ef.trvani = agregat(ef.slozky.map((s) => s.trvani));
}

function _vyhodnotSkupinu(skupina, lex, kniha, hloubka) {
  const ef = vyhodnot(skupina.vyraz, lex, kniha, hloubka);
  // Cíl za blokem doplní otevřené sloty všech frází uvnitř (§3.3).
  if (skupina.cile.length) _doplnCile(ef, skupina.cile);
  // Modifikátor za blokem platí na celou skupinu — rekurzivně (§3.2).
  for (const m of skupina.modifikatory) _uplatniModifikatorRekurzivne(ef, m);
  return ef;
}

function _doplnCile(ef, cile) {
  if (ef.cile.length === 0) {
    for (const c of cile) _pridejCil(ef, c);
  }
  for (const slozka of ef.slozky) _doplnCile(slozka, cile);
}

function _uplatniModifikatorRekurzivne(ef, m) {
  _uplatniModifikator(ef, m);
  for (const slozka of ef.slozky) _uplatniModifikatorRekurzivne(slozka, m);
}

function _vyhodnotSpojeni(spojeni, lex, kniha, hloubka) {
  const slozky = spojeni.casti.map((c) => vyhodnot(c, lex, kniha, hloubka));
  // Obálka nese jen strukturu; typ přebírá z první složky pro čitelnost.
  const obal = new SpellEffect({ typ: slozky[0].typ });
  obal.priznaky.push(spojeni.operator === "pak" ? "sekvence" : "paralelně");
  obal.slozky = slozky;
  obal.sila = slozky.reduce((s, x) => s + x.sila, 0);
  obal.dosah = Math.max(...slozky.map((s) => s.dosah));
  obal.trvani = spojeni.operator === "pak"
    ? slozky.reduce((s, x) => s + x.trvani, 0)
    : Math.max(...slozky.map((s) => s.trvani));
  return obal;
}

function _vyhodnotPodminku(podminka, lex, kniha, hloubka) {
  const ef = vyhodnot(podminka.telo, lex, kniha, hloubka);
  // Predikátový překlad: runa stavu se čte jako příznak ("Oheň" → "hoří").
  const stavy = podminka.stavy.map((s) => s.data.priznak ?? s.nazev);
  ef.podminka = { cil: podminka.cil.nazev, stavy };
  if (podminka.negace) ef.podminka.negace = true;   // `pokud ne ( … )` (§3.5)
  return ef;
}

function _vyhodnotSkrze(skrze, lex, kniha, hloubka) {
  const ef = vyhodnot(skrze.vyraz, lex, kniha, hloubka);
  // Rozřešení kanálu (zřetězení ve větě / objekt světa, #29) dělá engine.
  ef.kanal = skrze.kanal.nazev;
  return ef;
}
