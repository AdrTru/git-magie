// Slovní druhy jazyka (port `SlovniDruh` z `spelllang/tokens.py`, §3.1 návrhu).
//
// Runa je v JS prostý objekt `{ id, druh, nazev, data }` — třída netřeba.
// Hodnota druhu je řetězec ("sloveso"…), tak jak ji nese generovaný lexikon,
// aby porovnání a serializace nemusely nic překládat.

export const DRUH = Object.freeze({
  SLOVESO: "sloveso",       // V — hlavní působení
  PODSTATA: "podstata",     // S — živel
  CIL: "cil",               // C — na koho/co
  FORMA: "forma",           // F — geometrie působení
  MODIFIKATOR: "modifikator", // M — mění parametry
  SPOJKA: "spojka",         // K — spojuje fráze
  JMENO: "jmeno",           // N — pojmenované kouzlo = funkce
});
