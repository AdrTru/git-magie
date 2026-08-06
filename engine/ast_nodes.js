// Uzly abstraktního syntaktického stromu (port `spelllang/ast_nodes.py`).
//
// Struktura odpovídá gramatice §3.3 (bloky, podmínkový blok, skrze). V JS je
// uzel PROSTÝ OBJEKT s tagem `typ` — třída netřeba; parser (`parser.js`) je
// staví, výklady (`_vyklady`) je kopírují spreadem. Runa je taky prostý objekt
// `{ id, druh, nazev, data }`; každý slot je pole run (víc run = stacking, §3.4).
// `runyV` (runy pro min-mastery, §10.2) používají ceny.

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

// Runy, které kouzlo PŘÍMO sesílá — vstup pro min-mastery (§10.2). Volání jména
// se NErozbaluje: vnitřek kryje mastery jména (odměna za abstrakci, §10.3), ale
// jméno i argumenty do min vstupují. Vlastnosti zúženého cíle (#38) se počítají
// taky; `sFiltry=false` je vynechá (např. kontrola čerpání, §8.1).
export function runyV(uzel, sFiltry = true) {
  const runy = _runyV(uzel);
  if (!sFiltry) return runy;
  const vysledek = [];
  for (const runa of runy) {
    vysledek.push(runa);
    if (runa.data.filtr) vysledek.push(...runa.data.filtr);
  }
  return vysledek;
}

function _runyV(uzel) {
  switch (uzel.typ) {
    case "Fraze":
      return [...uzel.sloveso, ...uzel.podstaty, ...uzel.cile, ...uzel.formy, ...uzel.modifikatory];
    case "Volani":
      return [uzel.jmeno, ...uzel.podstaty, ...uzel.cile, ...uzel.formy, ...uzel.modifikatory];
    case "Skupina":
      return [..._runyV(uzel.vyraz), ...uzel.cile, ...uzel.modifikatory];
    case "Spojeni":
      return uzel.casti.flatMap(_runyV);
    case "Podminka":
      return [uzel.cil, ...uzel.stavy, ..._runyV(uzel.telo)];
    case "Skrze":
      return [..._runyV(uzel.vyraz), uzel.kanal];
    default:
      throw new TypeError(`Neznámý uzel AST: ${JSON.stringify(uzel)}`);
  }
}
