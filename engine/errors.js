// Typy chyb kouzlení (port `spelllang/errors.py`, §11 návrhu).
//
// Každá chyba umí ukázat, KDE v textu kouzla drhne — chyby učí hráče jazyk.
// Dole je druhá půlka souboru: škála vyústění a divoká magie (§11) — přibyla
// s dílem 3f, protože potřebovala sdílený generátor náhody (`nahoda.js`).

import { DRUH } from "./runy.js";

export class ChybaKouzla extends Error {
  // Nese pozici v textu kouzla pro zpětnou vazbu.
  constructor(zprava, text = null, pozice = null) {
    super(zprava);
    this.name = new.target.name;   // konkrétní podtřída (NeznameSlovo…)
    this.zprava = zprava;
    this.text = text;
    this.pozice = pozice;
  }

  toString() {
    if (this.text === null || this.pozice === null) return this.zprava;
    const sipka = " ".repeat(this.pozice) + "^";
    return `${this.zprava}\n  ${this.text}\n  ${sipka}`;
  }
}

// Slovo v jazyce vůbec neexistuje (překlep, cizí znak). Kouzlo se nesešle.
export class NeznameSlovo extends ChybaKouzla {}

// Runa existuje, ale čaroděj ji ještě neovládá. Kouzlo se nesešle.
export class NeovladaneSlovo extends ChybaKouzla {}

// Věta neodpovídá gramatice (slovosled, mix spojek, chybějící blok…).
export class ChybaGramatiky extends ChybaKouzla {}

// Konstrukce je nad odemčenou fází progrese (§4.2).
export class NepovolenaGramatika extends ChybaKouzla {}

// Víc platných výkladů (§9) — v terénu se běžně nesešle.
export class Nejednoznacnost extends ChybaKouzla {}

// Jméno by (i nepřímo) volalo samo sebe — pojistka z §6.2.
export class CyklusJmen extends ChybaKouzla {}

// Runa pod prahem pro zabalení do jména (§10.3).
export class NedostatecnaMastery extends ChybaKouzla {}

// Gramatický střípek čeká, než jazyk doroste (#26).
export class StripekNelzeVstrebat extends ChybaKouzla {}

// Stav sesilatele zavřel kanál projevu, který kouzlo potřebuje (§5.2).
export class KanalBlokovan extends ChybaKouzla {}

// Na kouzlo nezbývá dost many v nádrži místnosti — tvrdý blok (§10).
export class ChybaMany extends ChybaKouzla {}

// -- škála vyústění a divoká magie (§11) -------------------------------------
// Port druhé půlky `spelllang/errors.py`. Selhání jsou OBSAH, ne frustrace:
// čisté seslání / surge (zajímavá odchylka) / fatální selhání (vzácné, tvrdé).
// Náhoda je sdílená (`nahoda.js`), takže hod se v prohlížeči i v Pythonu
// při stejném semínku odehraje stejně.

export const Vyusteni = Object.freeze({
  CISTE: "čisté seslání",
  SURGE: "surge",
  FATALNI: "fatální selhání",
});

// Pod touto šancí může neúspěch přerůst ve fatální selhání; sklon říká, jak
// rychle s klesající šancí roste podíl fatálních konců (laditelné).
export const PRAH_FATALNI = 0.5;
export const SKLON_FATALNI = 0.5;

// Hod na škále vyústění: vysoká šance → čisté; neúspěch → surge; velmi nízká
// šance + smůla → fatální selhání. DVA HODY, ne jeden — pořadí je součást
// pravidla, protože druhý hod se dělá jen po neúspěchu prvního.
export function rozhodniVyusteni(sance, rng) {
  if (rng.random() < sance) return Vyusteni.CISTE;
  const fatalniPodil = Math.max(0.0, PRAH_FATALNI - sance) * SKLON_FATALNI;
  if (rng.random() < fatalniPodil) return Vyusteni.FATALNI;
  return Vyusteni.SURGE;
}

// Divoká magie zkroutí efekt: jiný živel, odraz, nebo ujetá síla. MUTUJE EFEKT
// NA MÍSTĚ (jako Python). Fatální selhání navíc obrátí kouzlo proti sesilateli
// a nese zpětný ráz; trvalé následky (jizvy, ztráta runy) patří herní vrstvě.
export function zdivocej(efekt, lex, rng, fatalni = false) {
  const zvrat = rng.choice(["zivel", "odraz", "sila"]);
  if (zvrat === "zivel") {
    const podstaty = Object.values(lex.runy).filter((r) => r.druh === DRUH.PODSTATA);
    const zivly = podstaty.filter((r) => r.nazev !== efekt.zivel).map((r) => r.nazev);
    if (zivly.length) {
      // Surge musí živel i PROJEVIT, ne jen přepsat nálepku: sundej příznak
      // PŮVODNÍHO živlu a nasaď příznak NOVÉHO. Jinak by [Oheň] jen svítil
      // v popisu a nic nezapálil („beze stop") — divoká magie je obsah (§11).
      const stary = podstaty.find((r) => r.nazev === efekt.zivel) ?? null;
      if (stary !== null) {
        const staryPriznak = stary.data.priznak;
        const kde = efekt.priznaky.indexOf(staryPriznak);
        if (staryPriznak !== undefined && kde !== -1) efekt.priznaky.splice(kde, 1);
      }
      efekt.zivel = rng.choice(zivly);
      const novy = podstaty.find((r) => r.nazev === efekt.zivel) ?? null;
      const novyPriznak = novy ? novy.data.priznak : null;
      if (novyPriznak && !efekt.priznaky.includes(novyPriznak)) {
        efekt.priznaky.push(novyPriznak);
      }
    }
  } else if (zvrat === "odraz") {
    efekt.cile = ["Já"];
  } else {
    efekt.sila *= rng.uniform(0.3, 1.7);
  }
  if (!efekt.priznaky.includes("divoká magie")) efekt.priznaky.push("divoká magie");

  if (fatalni) {
    efekt.cile = ["Já"];
    efekt.sila *= 1.5;
    efekt.priznaky.push("fatální selhání");
    efekt.priznaky.push("zpětný ráz");
  }
}
