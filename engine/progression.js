// Progrese čaroděje (port `spelllang/progression.py`, §4, §10.2).
//
// ZATÍM JEN ČÁST, kterou potřebuje validátor: fázové konstanty, vždy dostupné
// runy a `Znalosti` se čtením `zna`/`faze`. Smyčka učení (mastery, zkušenost,
// střípky, otisky) je samostatný díl a přibude sem později — stejně jako se
// parser přidával po lexeru.

// Fáze progrese gramatiky (§4.2): co která fáze odemyká.
export const FAZE_ZIVEL = 1;
export const FAZE_MODIFIKATOR = 2;
export const FAZE_FORMA = 3;
export const FAZE_SPOJKY_BLOKY = 4;     // spojky a/pak + bloky ( … )
export const FAZE_PODMINKA_SKRZE = 5;   // pokud ( … ) pak, skrze
export const FAZE_POJMENOVANI = 6;
export const FAZE_SMYCKA = 7;

// Runy, které zná každý čaroděj od začátku (§3.7): cílit na sebe (`Já`) a
// globální cíl (`Cíl` = id "vse"). Mastery roste užíváním jako u ostatních run.
export const VZDY_DOSTUPNE = new Set(["ja", "vse"]);

// Naučený slovník, odemčená fáze a mastery jednoho čaroděje. (Zkušenost a další
// pole z Pythonu sem přijdou s dílem o učení; validátor a ceny je nečtou.)
export class Znalosti {
  constructor({ runy = [], faze = 0, mastery = {} } = {}) {
    this.runy = runy instanceof Set ? runy : new Set(runy);
    this.faze = faze;
    this.mastery = mastery;   // id -> 0.0–1.0 (§10.2), čtou ceny
  }

  zna(runaId) {
    return VZDY_DOSTUPNE.has(runaId) || this.runy.has(runaId);
  }
}

// Vševědoucí znalosti pro vývoj a demo — všechny runy, plná mastery, zvolená fáze.
export function plneZnalosti(lex, faze = FAZE_SMYCKA) {
  const ids = Object.keys(lex.runy);
  const mastery = {};
  for (const id of ids) mastery[id] = 1.0;
  return new Znalosti({ runy: new Set(ids), faze, mastery });
}
