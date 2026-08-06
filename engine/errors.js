// Typy chyb kouzlení (port `spelllang/errors.py`, §11 návrhu).
//
// Každá chyba umí ukázat, KDE v textu kouzla drhne — chyby učí hráče jazyk.
// Škála vyústění a divoká magie (Vyusteni/zdivocej) sem přijdou až s
// vyhodnocením (potřebují RNG); zatím jen samotné třídy výjimek.

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
