// Scéna jako DATA — port `spelllang/sceny.py`. Definice tam a zpátky (JSON).
//
// FORMÁT JE DEFINICE, NE ULOŽENÁ HRA: nese jen autorské údaje (název, cíl,
// nádrž many, objekty, spouště). Běhový stav (odpočty stavů, zbylá mana,
// vyřešenost) se zapisuje jen s `sBehem:true` — to je uložená hra, jiná úloha.
// Zapisuje se jen to, co se LIŠÍ od výchozí hodnoty; neznámý klíč je chyba,
// ne tiché přeskočení (překlep v poli by jinak dal scénu, která se tváří jinak).
//
// Objekt je PROSTÝ JS objekt (ne třída) se všemi poli — přesně to, co už čte
// `geometrie.js` přes `pole(o, …)`. Množiny drží jako `Set` (geometrie je čte
// tolerantně: `Set` i pole). Které pole do jaké přihrádky patří a jak se
// převádí a co je jeho výchozí hodnota, říká GENEROVANÝ `scena_data.js`
// (spec z `scene.py` + `sceny.py`), takže se sem nic z dataclassu neopisuje.

import { POLE_OBJEKTU } from "./scena_data.js";

export class ChybaSceny extends Error {
  constructor(zprava) {
    super(zprava);
    this.name = "ChybaSceny";
  }
}

// Pole scény držená přímo na scéně (autorská, ne průběh partie).
const POLE_SCENY = ["nazev", "cil", "mana_max"];
const ZNAMA_POLE_OBJEKTU = new Set(POLE_OBJEKTU.map((p) => p.jmeno));
const PODLE_JMENA = new Map(POLE_OBJEKTU.map((p) => [p.jmeno, p]));

// -- hloubková rovnost hodnot JSON (kvůli vynechávání výchozích) -------------
function stejne(a, b) {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => stejne(x, b[i]));
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => stejne(a[k], b[k]));
}

// -- převod hodnoty pole: JSON → běh (null-bezpečné pro brani/pozice/…) ------
function zJson(hodnota, kat) {
  if (hodnota === null || hodnota === undefined) return hodnota;
  switch (kat) {
    case "mnozina":
      return new Set(hodnota);
    case "slovnikMnozin": {
      const o = {};
      for (const [k, v] of Object.entries(hodnota)) o[k] = new Set(v);
      return o;
    }
    case "ntice":
      return [...hodnota];
    case "nticeSeznam":
      return hodnota.map((b) => [...b]);
    case "obsah":
      return hodnota.map(_objektZ);
    case "spousti":
      return hodnota.map(_spoustZ);
    default:
      return hodnota; // skalar / slovník / seznam beze změny
  }
}

// -- převod hodnoty pole: běh → JSON (jak `_objekt_do`) ----------------------
function doJson(hodnota, kat, sBehem) {
  if (hodnota === null || hodnota === undefined) return hodnota;
  switch (kat) {
    case "mnozina":
      return [...hodnota].sort();
    case "slovnikMnozin": {
      const o = {};
      for (const k of Object.keys(hodnota).sort()) o[k] = [...hodnota[k]].sort();
      return o;
    }
    case "ntice":
      return [...hodnota];
    case "nticeSeznam":
      return hodnota.map((b) => [...b]);
    case "obsah":
      return hodnota.map((x) => _objektDo(x, sBehem));
    case "spousti":
      return hodnota.map(_spoustDo);
    default:
      return hodnota;
  }
}

// Běhová výchozí hodnota pole (co má prostý objekt, když se nezadá). Odvozeno
// z `vych` (serializovaná výchozí) přes kategorii — množina = prázdný Set atd.
function vychBeh(p) {
  return zJson(p.vych, p.kat);
}

// -- objekt ------------------------------------------------------------------
function _objektDo(o, sBehem = false) {
  const zaznam = {};
  for (const p of POLE_OBJEKTU) {
    if (p.beh && !sBehem) continue;
    const ser = doJson(o[p.jmeno], p.kat, sBehem);
    if (p.povinne) {
      zaznam[p.jmeno] = ser; // id, nazev se zapíšou vždy
    } else if (!stejne(ser, p.vych)) {
      zaznam[p.jmeno] = ser; // jinak jen když se liší od výchozí
    }
  }
  return zaznam;
}

function _objektZ(zaznam) {
  _hlidejKlice(zaznam, ZNAMA_POLE_OBJEKTU, `objekt ${JSON.stringify(zaznam.id ?? "?")}`);
  for (const povinne of ["id", "nazev"]) {
    if (!(povinne in zaznam)) {
      throw new ChybaSceny(`Objekt musí mít \`${povinne}\`: ${JSON.stringify(zaznam)}`);
    }
  }
  const o = {};
  for (const p of POLE_OBJEKTU) o[p.jmeno] = vychBeh(p); // všechna pole (jako dataclass)
  for (const [klic, hodnota] of Object.entries(zaznam)) {
    o[klic] = zJson(hodnota, PODLE_JMENA.get(klic).kat);
  }
  return o;
}

// -- spouště -----------------------------------------------------------------
function _spoustDo(spoust) {
  for (const strana of ["kdyz", "udelej"]) {
    if (typeof spoust[strana] === "function") {
      throw new ChybaSceny(
        `Spoušť s funkcí v \`${strana}\` nejde uložit jako data — ` +
          "v souboru scény smí být jen slovníková podmínka a akce.",
      );
    }
  }
  return { kdyz: spoust.kdyz, udelej: spoust.udelej, jen_jednou: spoust.jen_jednou };
}

function _spoustZ(zaznam) {
  _hlidejKlice(zaznam, new Set(["kdyz", "udelej", "jen_jednou"]), "spoušť");
  return {
    kdyz: zaznam.kdyz ?? {},
    udelej: zaznam.udelej ?? {},
    jen_jednou: zaznam.jen_jednou ?? true,
    vybito: false, // běhový stav, ne z JSONu
  };
}

// -- scéna -------------------------------------------------------------------
export function zeSlovniku(data) {
  _hlidejKlice(
    data,
    new Set([...POLE_SCENY, "poznamka", "spousti", "objekty", "beh"]),
    "scéna",
  );
  if (!("nazev" in data)) throw new ChybaSceny("Scéna musí mít `nazev`.");

  const objekty = {};
  for (const zaznam of data.objekty ?? []) {
    const o = _objektZ(zaznam);
    objekty[o.id] = o;
  }
  const beh = data.beh ?? {};
  const manaMax = Number(data.mana_max ?? 0);
  return {
    nazev: data.nazev,
    objekty,
    cil: [...(data.cil ?? [])],
    spousti: (data.spousti ?? []).map(_spoustZ),
    mana_max: manaMax,
    uz_vyresena: Boolean(beh.uz_vyresena ?? false),
    // `__post_init__`: chybí-li běhová mana, startuje plná (= mana_max).
    mana: "mana" in beh ? Number(beh.mana) : manaMax,
  };
}

export function doSlovniku(scena, { sBehem = false } = {}) {
  const data = { nazev: scena.nazev };
  if (scena.cil && scena.cil.length) data.cil = scena.cil;
  if (scena.mana_max) data.mana_max = scena.mana_max;
  if (scena.spousti && scena.spousti.length) {
    data.spousti = scena.spousti.map(_spoustDo);
  }
  data.objekty = Object.values(scena.objekty).map((o) => _objektDo(o, sBehem));
  if (sBehem) data.beh = { mana: scena.mana, uz_vyresena: scena.uz_vyresena };
  return data;
}

// -- společné ----------------------------------------------------------------
function _hlidejKlice(zaznam, znama, kde) {
  const navic = Object.keys(zaznam).filter((k) => !znama.has(k));
  if (navic.length) {
    throw new ChybaSceny(
      `${kde}: neznámé klíče ${JSON.stringify(navic.sort())} — překlep, ` +
        "nebo pole, které formát scény nezná.",
    );
  }
}
