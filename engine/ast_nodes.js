// Uzly abstraktního syntaktického stromu (port `spelllang/ast_nodes.py`).
//
// Struktura odpovídá gramatice §3.3 (bloky, podmínkový blok, skrze). V JS je
// uzel PROSTÝ OBJEKT s tagem `typ` — třída netřeba; parser (`parser.js`) je
// staví, výklady (`_vyklady`) je kopírují spreadem. Runa je taky prostý objekt
// `{ id, druh, nazev, data }`; každý slot je pole run (víc run = stacking, §3.4).
//
// Pozn.: `runy_v` (runy pro min-mastery, §10.2) přijde s dílem, kde ho čtou
// ceny/validátor — sem patří, ale zatím by byl neověřený.

// Nejmenší smysluplný celek: sloveso(a) + doplnění.
export const Fraze = (sloveso, podstaty = [], cile = [], formy = [], modifikatory = []) =>
  ({ typ: "Fraze", sloveso, podstaty, cile, formy, modifikatory });

// Volání pojmenovaného kouzla (§6): jméno v roli hlavy fráze, runy za ním argumenty.
export const Volani = (jmeno, podstaty = [], cile = [], formy = [], modifikatory = []) =>
  ({ typ: "Volani", jmeno, podstaty, cile, formy, modifikatory });

// Blok `( … )` (§3.2). Cíle a modifikátory za blokem doplní otevřené sloty uvnitř.
export const Skupina = (vyraz, cile = [], modifikatory = []) =>
  ({ typ: "Skupina", vyraz, cile, modifikatory });

// Fráze/bloky spojené operátorem: "a" (paralelně) nebo "pak" (sekvenčně).
export const Spojeni = (operator, casti) => ({ typ: "Spojeni", operator, casti });

// `pokud ( predikát ) pak tělo` (§3.3, §5). Runy predikátu popisují STAV, ne akci.
export const Podminka = (cil, stavy = [], telo = null, negace = false) =>
  ({ typ: "Podminka", cil, stavy, telo, negace });

// `výraz skrze kanál` (§5) — efekt se vede kanálem (pouto, spojenec…).
export const Skrze = (vyraz, kanal = null) => ({ typ: "Skrze", vyraz, kanal });
