// Lexikon: veřejná tvář slovníku run. Data (runy + interakční tabulky) jsou
// GENEROVANÁ v `lexikon_data.js`; tady se re-exportují a doplní o FUNKCE, které
// se opsat musí (kód, ne data): `neguj` (`ne X`) a `zuz` (zúžení cíle `:`).
// Port funkční části `spelllang/lexicon.py`. Konzumenti importují vše odtud.

import { DRUH } from "./runy.js";
import { ChybaGramatiky, Nejednoznacnost } from "./errors.js";

export { zakladLexikon } from "./lexikon_data.js";

// Vyhledání interakce dvou živlů / forem (§3.4). Klíč = seřazená dvojice názvů
// spojená "|" — týž tvar, jaký generuje oracle (BMP → JS řazení == Python).
const _klicDvojice = (a, b) => [a, b].sort().join("|");
export const interakce = (lex, a, b) => lex.interakceZivlu[_klicDvojice(a, b)] ?? null;
export const interakceFormy = (lex, a, b) => lex.interakceForem[_klicDvojice(a, b)] ?? null;

// `CÍL : VLASTNOST…` → odvozená runa zúženého cíle (#38, §3.4).// Id zůstává původní (mastery cíle se dědí — zúžení je gramatika, ne nové
// slovo); vlastnosti jedou v data.filtr a do min-mastery i ceny vstupují samy.
export function zuz(cil, vlastnosti) {
  const data = { ...cil.data };
  data.filtr = [...vlastnosti];
  if (!("zaklad" in data)) data.zaklad = cil.nazev;
  const nazev = `${cil.nazev} : ${vlastnosti.map((v) => v.nazev).join(" ")}`;
  return { id: cil.id, druh: cil.druh, nazev, data };
}

// `ne X` → odvozená runa (§3.5). Id zůstává původní (znalosti se dědí z kladné
// runy — negace je gramatika); data nesou `negace: true` pro fázi a přirážku many.
export function neguj(runa, lex) {
  if (runa.druh === DRUH.SLOVESO) {
    const protiklad = lex.protikladySloves[runa.id];
    if (protiklad === undefined) {
      throw new Nejednoznacnost(
        `'ne ${runa.nazev}' nemá ukotvený protiklad — víc možných čtení (§9).`);
    }
    const { vyklad, ...data } = protiklad;   // `vyklad` je jen popisek
    data.negace = true;
    return { id: runa.id, druh: runa.druh, nazev: `ne ${runa.nazev}`, data };
  }

  if (runa.druh === DRUH.PODSTATA) {
    // Negace živlu = ABSENCE kvality (#36): ne Oheň = Chlad, ne Světlo = Tma…
    const absence = lex.absenceZivlu[runa.id];
    if (absence !== undefined) {
      const data = { priznak: absence.priznak,
                     cena: runa.data.cena ?? 2, negace: true };
      return { id: runa.id, druh: runa.druh, nazev: absence.zivel, data };
    }
    // Živel bez kanonické absence = ražení (§9.1), dnes aproximace surge.
    const data = { cena: runa.data.cena ?? 2, priznak: "surge", negace: true };
    return { id: runa.id, druh: runa.druh, nazev: `ne ${runa.nazev}`, data };
  }

  if (runa.druh === DRUH.CIL) {
    const data = { ...runa.data };
    data.strana = `kromě ${runa.data.strana ?? "?"}`;
    data.negace = true;
    return { id: runa.id, druh: runa.druh, nazev: `ne ${runa.nazev}`, data };
  }

  if (runa.druh === DRUH.MODIFIKATOR) {
    const nasobek = runa.data.nasobek;
    const cilId = lex.inverzniRuny[runa.id];
    let data;
    if (cilId !== undefined) {
      // Má samostatnou VÝSLEDNOU runu (silně↔slabě, tiše↔okázale, #46):
      // efekt i cena se berou PODLE NÍ (`ne slabě` = `silně`), ne volná inverze
      // násobku. Tohle se ptá první — vlastní slovo protikladu je odpověď i tam,
      // kde se z čísla nedá dopočítat nic (`tiše` nemá násobek, opak přesto má).
      data = { ...lex.runy[cilId].data };
    } else if (!nasobek) {
      throw new Nejednoznacnost(
        `'ne ${runa.nazev}' nemá definovanou inverzi — modifikátor bez ` +
        "číselného násobku ani vlastního protikladu se neguje až ukotvením (§3.5).");
    } else {
      data = { ...runa.data };
      data.nasobek = 1.0 / Number(nasobek);
    }
    data.negace = true;
    return { id: runa.id, druh: runa.druh, nazev: `ne ${runa.nazev}`, data };
  }

  if (runa.druh === DRUH.FORMA) {
    throw new ChybaGramatiky(
      `Negace formy ('ne ${runa.nazev}') zatím není definována (§3.5, §15).`);
  }

  throw new ChybaGramatiky(`Runu ${JSON.stringify(runa.nazev)} nelze negovat (§3.5).`);
}

// -- recept odvozeného živlu (§3.4, §8.1) ------------------------------------

/** Název složky receptu → runa: přímý živel svou runou, absence negací základu. */
function _slozkaNaRunu(nazev, lex) {
  const cil = nazev.toLowerCase();
  for (const runa of Object.values(lex.runy)) {
    if (runa.druh === DRUH.PODSTATA && runa.nazev.toLowerCase() === cil) return runa;
  }
  for (const [baseId, absence] of Object.entries(lex.absenceZivlu ?? {})) {
    if ((absence.zivel ?? "").toLowerCase() === cil) {
      const base = lex.runy[baseId];
      return base === undefined ? null : neguj(base, lex);
    }
  }
  return null;
}

/**
 * Odvozený živel → podstaty jeho receptu jako RUNY (§3.4, §8.1).
 *
 * `Jed` → `[Smrt, Voda]`: přímá složka je svou runou, absence (Smrt, Chlad…)
 * negovanou runou svého základu. Slouží jako definice jméno-látky objevené
 * u zdroje (kotlík, #47). Vrací `null`, není-li živel v interakční tabulce nebo
 * nejde-li některou složku složit ze základních run (recept s další odvozenou
 * složkou — Ledovec = Led + Kámen — zatím nepodporujeme).
 *
 * POŘADÍ je pořadí v klíči `A|B`, tedy seřazené — viz `slozkyZivlu` v `cerpani.js`.
 */
export function receptPodstaty(zivel, lex) {
  const cil = zivel.toLowerCase();
  const recept = Object.entries(lex.interakceZivlu ?? {})
    .find(([, data]) => (data.zivel ?? "").toLowerCase() === cil);
  if (recept === undefined) return null;
  const podstaty = [];
  for (const nazev of recept[0].split("|")) {
    const runa = _slozkaNaRunu(nazev, lex);
    if (runa === null) return null;
    podstaty.push(runa);
  }
  return podstaty;
}
