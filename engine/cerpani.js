// Čerpání a živlové okolí — port mechanické části `spelllang/scene.py` (§8.1,
// §5.1, §8.2). Odpovídá na dvě otázky, které scéna klade jazyku:
//
//   CO JDE ČERPAT  — čím objekt zrovna je jako zdroj živlu (`zdrojObjektu`),
//                    a na které ZÁKLADNÍ runy se to rozpadne (`cerpatelne`,
//                    `slozkyZivlu`). Odtud bere validátor `dostupneZvenci`
//                    a ceny slevu za živel z okolí — obojí je v JS už z kroku 3.
//   JAK DLOUHO TO NA ČEM VYDRŽÍ — `nasobekTrvani`, `trvaniStavu` (troje hodiny:
//                    jev, kouzlo, objekt) a `zadrzujeSireni` (§8.2: pec hoří,
//                    ale chalupu nezapálí).
//
// ŘEZ PODLE VĚCI: sem jde jen ČTENÍ. Zápis stavu na objekt (`pridejStav` a jeho
// kaskáda protikladů), šíření a tik scény jsou stavové a patří k chování (3e);
// tady se nic nemění, jen odpovídá.
//
// Tabulky mechaniky jsou GENEROVANÁ DATA (`mechaniky_data.js` z `oracle_sceny.py`).
// Je to autorské vyvážení hry, ne kód — opsat ho sem ručně by znamenalo druhou
// pravdu, která se s Pythonem tiše rozejde.

import {
  MECHANIKY_PRIZNAKU, TRVANI_PODLE_TAGU, ZADRZUJICI_TAGY, ZADRZ_VSE,
} from "./mechaniky_data.js";
import { maTag } from "./geometrie.js";

export { MECHANIKY_PRIZNAKU, TRVANI_PODLE_TAGU, ZADRZUJICI_TAGY, ZADRZ_VSE };

// -- pomocné ----------------------------------------------------------------

/** Množina objektu (`Set` po `zeSlovniku`, pole ze syrového JSONu) → pole. */
function _polozky(mnozina) {
  if (mnozina instanceof Set) return [...mnozina];
  return Array.isArray(mnozina) ? mnozina : [];
}

/**
 * Zaokrouhlení JAKO V PYTHONU — na sudou, ne nahoru.
 *
 * `Math.round(4.5)` je 5, kdežto `round(4.5)` v Pythonu je 4 (bankéřské
 * zaokrouhlení, IEEE 754 „half to even"). A na půlky se tu šlape běžně: `taví`
 * (3 kroky) na kamenné zdi dá 3 × 1,5 = 4,5. Bez tohohle by JS držel lávu na
 * kameni o krok déle než Python a nikdo by nevěděl proč.
 */
export function zaokrouhli(x) {
  const dolu = Math.floor(x);
  const zbytek = x - dolu;
  if (zbytek > 0.5) return dolu + 1;
  if (zbytek < 0.5) return dolu;
  return dolu % 2 === 0 ? dolu : dolu + 1;   // přesná půlka → na sudou
}

// -- zádrž šíření (§8.2, #39) ------------------------------------------------

/**
 * Zůstane tenhle jev na objektu, místo aby přeskočil ven?
 *
 * Ošetřený zdroj: pec hoří, ale chalupu nezapálí; kotlík vře, ale nepolije
 * podlahu. Skládá materiálové tagy (`ZADRZUJICI_TAGY`) s autorským výčtem kusu
 * (`objekt.zadrzuje`); `ZADRZ_VSE` znamená „tenhle nešíří nic".
 *
 * Zádrž je JEDNOSMĚRNÁ a týká se jen cesty VEN — jev na objektu žije dál (pec
 * je pořád zdroj Ohně) a zvenčí objekt chytne normálně.
 */
export function zadrzujeSireni(objekt, stav) {
  const zadrzene = new Set(_polozky(objekt.zadrzuje));
  for (const [tag, stavy] of Object.entries(ZADRZUJICI_TAGY)) {
    if (maTag(objekt, tag)) for (const s of stavy) zadrzene.add(s);
  }
  return zadrzene.has(ZADRZ_VSE) || zadrzene.has(stav);
}

// -- životnost jevu (§5.1, #39) ---------------------------------------------

/**
 * Jak objekt ladí životnost jevu na sobě: součin všech jeho hlasů.
 *
 * Materiálové tagy (`TRVANI_PODLE_TAGU`) plus autorský přepis konkrétního kusu
 * (`objekt.trvani_jevu`). Bez objektu — nebo bez záznamu — je to 1,0.
 * POŘADÍ NÁSOBENÍ zrcadlí Python (pořadí klíčů generované tabulky): plovoucí
 * čárka dá týž IEEE výsledek jen při témže pořadí operací.
 */
export function nasobekTrvani(stav, objekt = null) {
  if (objekt === null || objekt === undefined) return 1.0;
  let nasobek = 1.0;
  for (const [tag, tabulka] of Object.entries(TRVANI_PODLE_TAGU)) {
    if (stav in tabulka && maTag(objekt, tag)) nasobek *= tabulka[stav];
  }
  const vlastni = (objekt.trvani_jevu ?? {})[stav];
  if (vlastni !== undefined && vlastni !== null) nasobek *= Number(vlastni);
  return nasobek;
}

/**
 * Jak dlouho tenhle zápis stavu vydrží? `null` = natrvalo.
 *
 * TROJE HODINY, ne jedny (#39), a v tomhle pořadí:
 *  1. JEV — vlastní životnost z `MECHANIKY_PRIZNAKU[…].trvani`. Výboj projede a
 *     je pryč, promáčení schne pomalu; jak dlouho zůstaneš mokrý, neurčuje síla
 *     čaroděje, ale voda. `trvani: 0` je VÝSLEDEK, ne jev (`spraveno`,
 *     `uhašeno`) — drží natrvalo a nikdo to nepřebije.
 *  2. KOUZLO — jev bez vlastní životnosti si dobu bere od `SpellEffect.trvani`.
 *  3. OBJEKT — materiál a autorský přepis kusu dobu pronásobí; trvalý zápis
 *     nezkrátí a pod jeden krok se dobu zkrátit nedá. `trvani_jevu[stav] = null`
 *     naopak řekne „na tomhle jev nevyhasíná" (věčný plamen, olejová lampa).
 */
export function trvaniStavu(stav, trvaniKouzla = null, objekt = null) {
  const jevy = objekt ? (objekt.trvani_jevu ?? {}) : {};
  if (objekt && stav in jevy && jevy[stav] === null) return null;  // věčný plamen
  const vlastni = (MECHANIKY_PRIZNAKU[stav] ?? {}).trvani;
  const zaklad = (vlastni !== undefined && vlastni !== null)
    ? Number(vlastni)
    : trvaniKouzla;
  if (zaklad === null || zaklad === undefined || zaklad <= 0) return zaklad;
  return Math.max(1.0, zaokrouhli(zaklad * nasobekTrvani(stav, objekt)));
}

// -- zdroje živlů (§8.1) -----------------------------------------------------

/**
 * Čím objekt aktuálně JE jako zdroj živlu: `[id runy | null, kvalita]`.
 *
 * Skládá statický zdroj (`zivel` + `kvalita`) s mechanikou stavů (#39) —
 * hořící dveře jsou slabý zdroj Ohně, dokud hoří. Bere nejsilnější, a PŘI
 * SHODĚ ROZHODUJE ABECEDA: `hoří` i `ozářeno` dávají 0,3, takže bez řazení by
 * hořící lucerna byla jednou zdroj Ohně a jednou Světla (v Pythonu podle pořadí
 * hashů v množině, v JS podle pořadí vložení). Arbitrární, ale stejné pravidlo
 * na obou stranách.
 */
export function zdrojObjektu(objekt) {
  const kv = objekt.kvalita ?? 0.0;
  let zivel = kv > 0 ? (objekt.zivel ?? null) : null;
  let kvalita = zivel ? kv : 0.0;
  for (const stav of _polozky(objekt.stavy).sort()) {
    const odvozeny = (MECHANIKY_PRIZNAKU[stav] ?? {}).zdroj;
    if (odvozeny && odvozeny[1] > kvalita) {
      [zivel, kvalita] = odvozeny;
    }
  }
  return [zivel, kvalita];
}

/** Název živlu → id runy, jíž se v kouzle sesílá; `null`, nezná-li ho lexikon. */
function _zivelNazevNaId(nazev, lex) {
  const cil = nazev.toLowerCase();
  for (const runa of Object.values(lex.runy)) {
    if (runa.druh === "podstata" && runa.nazev.toLowerCase() === cil) return runa.id;
  }
  // Absence (Smrt, Chlad, Tma…) se sesílá NEGACÍ základní runy (`ne Život` =
  // Smrt), takže se vrací id té KLADNÉ runy — negace je gramatika, ne jiné slovo.
  for (const [baseId, absence] of Object.entries(lex.absenceZivlu ?? {})) {
    if ((absence.zivel ?? "").toLowerCase() === cil) return baseId;
  }
  return null;
}

/**
 * Odvozený živel (Jed, Láva, Led…) → id ZÁKLADNÍCH run jeho receptu (§8.1).
 *
 * Recept čte `lex.interakceZivlu` (dvojice názvů → odvozený `zivel`). Složka,
 * která je sama odvozená (Ledovec = Led + Kámen), se rozloží rekurzivně;
 * základní živel (název sedí přímo na runu) vrací sám sebe.
 *
 * POŘADÍ SLOŽEK je pořadí v klíči `A|B`, tedy SEŘAZENÉ — v Pythonu je klíčem
 * `frozenset` (dvojice je neuspořádaná) a procházet ho znamená brát ho podle
 * hashů, což se mezi spuštěními mění. Oracle proto klíč skládá seřazený a
 * Python od dílu 3c prochází recept taky seřazeně; obě strany tím dávají „Voda
 * ne Život" pokaždé stejně.
 */
export function slozkyZivlu(nazev, lex, _videne = new Set()) {
  const primy = _zivelNazevNaId(nazev, lex);
  if (primy !== null) return [primy];
  const cil = nazev.toLowerCase();
  const recept = Object.entries(lex.interakceZivlu ?? {})
    .find(([, data]) => (data.zivel ?? "").toLowerCase() === cil);
  if (recept === undefined || _videne.has(cil)) return [];
  const videne = new Set([..._videne, cil]);
  const slozky = [];
  for (const slozka of recept[0].split("|")) {
    for (const rid of slozkyZivlu(slozka, lex, videne)) {
      if (!slozky.includes(rid)) slozky.push(rid);
    }
  }
  return slozky;
}

/**
 * Živly, které z objektu jde čerpat: `{id základní runy: kvalita}`.
 *
 * Skládá statický/odvozený-ze-stavu zdroj (`zdrojObjektu`) s ODVOZENÝM živlem
 * (`slozeny_zivel`) rozloženým na základní runy receptu (Jed → Voda a ne Život).
 * Kvalita odvozeného zdroje = `objekt.kvalita`. Bere nejsilnější.
 */
export function cerpatelne(objekt, lex) {
  const vysledek = {};
  const [zivel, kvalita] = zdrojObjektu(objekt);
  if (zivel && kvalita > 0) vysledek[zivel] = kvalita;
  const kv = objekt.kvalita ?? 0.0;
  if (objekt.slozeny_zivel && kv > 0) {
    for (const rid of slozkyZivlu(objekt.slozeny_zivel, lex)) {
      vysledek[rid] = Math.max(vysledek[rid] ?? 0.0, kv);
    }
  }
  return vysledek;
}

// -- scéna jako živlové okolí (§8.2) ----------------------------------------

/** Zdroje živlů s kvalitou — první ze tří seznamů, jimiž scéna mluví do jazyka. */
export function zdroje(scena) {
  return Object.values(scena.objekty).filter((o) => zdrojObjektu(o)[0]);
}

/** První zdroj, jehož živel se jmenuje `nazevZivlu` (kontext §9.1), nebo `null`. */
export function zdrojZivlu(scena, nazevZivlu, lex) {
  const cil = nazevZivlu.toLowerCase();
  for (const objekt of zdroje(scena)) {
    const runa = lex.runy[zdrojObjektu(objekt)[0]];
    if (runa !== undefined && runa.nazev.toLowerCase() === cil) return objekt;
  }
  return null;
}
