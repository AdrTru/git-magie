// Validátor AST (port `spelllang/validator.py`): znalosti run + odemčené fáze
// gramatiky. Kontroluje, co parser nemůže — parser zná jazyk, validátor zná
// ČARODĚJE (co se už naučil, §4). Při problému vyhodí NeovladaneSlovo nebo
// NepovolenaGramatika (§11).

import { DRUH } from "./runy.js";
import { NeovladaneSlovo, NepovolenaGramatika } from "./errors.js";
import {
  FAZE_FORMA, FAZE_MODIFIKATOR, FAZE_PODMINKA_SKRZE,
  FAZE_POJMENOVANI, FAZE_SPOJKY_BLOKY, FAZE_ZIVEL,
} from "./progression.js";

// Projde AST; při problému vyhodí příslušnou chybu. `dostupneZvenci` = Set id
// run, které čaroděj NEOVLÁDÁ, ale právě je čerpá z okolního zdroje (§8.1) —
// pro tohle seslání se berou jako použitelné.
export function zvaliduj(uzel, znalosti, dostupneZvenci = new Set()) {
  switch (uzel.typ) {
    case "Fraze":
      _zvalidujFrazi(uzel, znalosti, dostupneZvenci);
      break;
    case "Volani":
      _pozadujFazi(znalosti, FAZE_POJMENOVANI, "volání jména");
      _overRuny(
        [uzel.jmeno, ...uzel.podstaty, ...uzel.cile, ...uzel.formy, ...uzel.modifikatory],
        znalosti, dostupneZvenci);
      if (uzel.modifikatory.length) _pozadujFazi(znalosti, FAZE_MODIFIKATOR, "modifikátory");
      if (uzel.formy.length) _pozadujFazi(znalosti, FAZE_FORMA, "forma");
      break;
    case "Skupina":
      _pozadujFazi(znalosti, FAZE_SPOJKY_BLOKY, "bloky ( … )");
      if (uzel.modifikatory.length) _pozadujFazi(znalosti, FAZE_MODIFIKATOR, "modifikátory");
      _overRuny([...uzel.cile, ...uzel.modifikatory], znalosti, dostupneZvenci);
      zvaliduj(uzel.vyraz, znalosti, dostupneZvenci);
      break;
    case "Spojeni":
      _pozadujFazi(znalosti, FAZE_SPOJKY_BLOKY, `spojka '${uzel.operator}'`);
      for (const cast of uzel.casti) zvaliduj(cast, znalosti, dostupneZvenci);
      break;
    case "Podminka":
      _pozadujFazi(znalosti, FAZE_PODMINKA_SKRZE, "podmínka 'pokud … pak'");
      _overRuny([uzel.cil, ...uzel.stavy], znalosti, dostupneZvenci);
      zvaliduj(uzel.telo, znalosti, dostupneZvenci);
      break;
    case "Skrze":
      _pozadujFazi(znalosti, FAZE_PODMINKA_SKRZE, "spojka 'skrze'");
      if (uzel.kanal.druh === DRUH.JMENO) {
        _pozadujFazi(znalosti, FAZE_POJMENOVANI, "jméno jako kanál");
      }
      _overRuny([uzel.kanal], znalosti, dostupneZvenci);
      zvaliduj(uzel.vyraz, znalosti, dostupneZvenci);
      break;
    default:
      throw new TypeError(`Neznámý uzel AST: ${JSON.stringify(uzel)}`);
  }
}

function _zvalidujFrazi(fraze, znalosti, dostupneZvenci) {
  _overRuny(
    [...fraze.sloveso, ...fraze.podstaty, ...fraze.cile, ...fraze.formy, ...fraze.modifikatory],
    znalosti, dostupneZvenci);
  if (fraze.podstaty.length) {
    _pozadujFazi(znalosti, FAZE_ZIVEL, "podstata (živel)");
    if (fraze.podstaty.some((r) => r.druh === DRUH.JMENO)) {
      _pozadujFazi(znalosti, FAZE_POJMENOVANI, "jméno-látka");
    }
  }
  if (fraze.modifikatory.length) _pozadujFazi(znalosti, FAZE_MODIFIKATOR, "modifikátory");
  if (fraze.formy.length) _pozadujFazi(znalosti, FAZE_FORMA, "forma");
}

function _overRuny(runy, znalosti, dostupneZvenci = new Set()) {
  for (const runa of runy) {
    if (!znalosti.zna(runa.id) && !dostupneZvenci.has(runa.id)) {
      throw new NeovladaneSlovo(
        `Runu '${runa.nazev}' ještě neovládáš — tohle slovo tady neumíš použít. `
        + "(Zkus ho čerpat z okolního zdroje, §8.1.)");
    }
    if (runa.data.negace) {
      _pozadujFazi(znalosti, FAZE_PODMINKA_SKRZE, "negace 'ne'");
    }
    const filtr = runa.data.filtr;
    if (filtr && filtr.length) {   // zúžení cíle (#38) = stavové čtení
      _pozadujFazi(znalosti, FAZE_PODMINKA_SKRZE, "zúžení cíle ':'");
      _overRuny(filtr, znalosti, dostupneZvenci);
    }
  }
}

function _pozadujFazi(znalosti, faze, co) {
  if (znalosti.faze < faze) {
    throw new NepovolenaGramatika(
      `${co} vyžaduje fázi gramatiky ${faze}, ty máš ${znalosti.faze} (§4.2).`);
  }
}
