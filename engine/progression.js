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

// Naučený slovník a odemčená fáze jednoho čaroděje. (Mastery, zkušenost a další
// pole z Pythonu sem přijdou s dílem o učení; validátor je nečte.)
export class Znalosti {
  constructor({ runy = [], faze = 0 } = {}) {
    this.runy = runy instanceof Set ? runy : new Set(runy);
    this.faze = faze;
  }

  zna(runaId) {
    return VZDY_DOSTUPNE.has(runaId) || this.runy.has(runaId);
  }
}

// Vševědoucí znalosti pro vývoj a demo — všechny runy, zvolená fáze.
export function plneZnalosti(lex, faze = FAZE_SMYCKA) {
  return new Znalosti({ runy: new Set(Object.keys(lex.runy)), faze });
}
