// Model výsledného efektu kouzla (port `spelllang/effects.py`) — to, co
// spotřebuje herní engine. `typ` a `rezimTrvani` držíme jako řetězcové HODNOTY
// (Python enum .value), aby serializace a porovnání nemusely nic překládat.

// Typ efektu (name → hodnota). Sloveso nese v data.typ jméno ("POSKOZENI"…),
// evaluator ho přeloží na hodnotu: TypEfektu["POSKOZENI"] === "poškození".
export const TypEfektu = Object.freeze({
  POSKOZENI: "poškození",
  LECENI: "léčení",
  POSILENI: "posílení",
  OSLABENI: "oslabení",
  OVLADNUTI: "ovládnutí",
  UZITEK: "užitek",
  PRIVOLANI: "přivolání",
});

// Kdo platí za udržení efektu (§5.1). Modifikátor `soustředěně` přepne na
// "soustředění"; "trvalé" nastaví engine, když kanál `skrze` rozřeší do zdroje.
export const REZIM_CAS = "čas";
export const REZIM_SOUSTREDENI = "soustředění";
export const REZIM_TRVALE = "trvalé";

// Vyhodnocené kouzlo. Ceny a obtížnost dopočítá costs.js (zůstávají 0). Pole se
// mutují během vyhodnocení, tak jsou přímo na instanci (výchozí kolekce jsou
// čerstvé při každém vytvoření).
export class SpellEffect {
  constructor({
    typ, zivel = null, cile = [], forma = null,
    sila = 0.0, dosah = 0.0, trvani = 0.0,
    rezimTrvani = REZIM_CAS, upkeep = 0.0, priznaky = [],
    filtry = {}, strany = {}, slozky = [], runy = [],
    podminka = null, kanal = null, produkuje = null,
  } = {}) {
    this.typ = typ;
    this.zivel = zivel;
    this.cile = cile;             // seznam — stacking cílů (§3.4)
    this.forma = forma;
    this.sila = sila;
    this.dosah = dosah;
    this.trvani = trvani;
    this.rezimTrvani = rezimTrvani;
    this.upkeep = upkeep;
    this.priznaky = priznaky;     // "hoří", "pára", "zmrazeno"…
    this.filtry = filtry;         // položka z cile → { cil, stavy } (zúžení #38)
    this.strany = strany;         // položka z cile → strana ("enemy", "point"…)
    this.slozky = slozky;         // u složených kouzel (a / pak)
    this.runy = runy;             // id run, ze kterých efekt vznikl (bez negovaných)
    this.podminka = podminka;     // { cil, stavy } (pokud … pak)
    this.kanal = kanal;           // X skrze K
    this.produkuje = produkuje;   // latentní kanál slovesa (Sváž → "Spojení")
    this.cenaMany = 0.0;          // dopočítá costs.js
    this.obtiznost = 0.0;         // dopočítá costs.js
  }
}
