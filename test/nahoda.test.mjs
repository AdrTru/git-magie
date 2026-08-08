// Ověření SDÍLENÉ NÁHODY a divoké magie proti Python oracle (`oracle_kouzla.py`).
//
// Tohle je jiná zkouška než ostatní: nekontroluje jeden výsledek, ale PÁSKU.
// Generátor je posloupnost — každý hod posune stav, takže se parita neprokáže
// jednou hodnotou. Ověřuje se proto trojí:
//
//  (1) GENERÁTOR — 500 hodů na šesti semínkách BIT V BIT (žádná tolerance:
//      obě strany počítají po 32bitových celých číslech a dělí týmž dělitelem,
//      takže výsledek musí být totožný, ne blízký). K tomu maskování semínka
//      (záporné i přes 2³²) a obě odvozená rozhraní (`choice`, `uniform`).
//  (2) ŠKÁLA VYÚSTĚNÍ — 60 hodů na každé ze sedmi šancí. Pinuje i POČET hodů
//      na jeden výsledek: čisté seslání stojí jeden hod, surge a fatální dva.
//      Kdyby JS házel jinak často, první výsledky by seděly a rozešlo by se to
//      až o kus dál — proto se srovnává i STAV generátoru po celé sérii.
//  (3) DIVOKÁ MAGIE a OBJEV PODTYPU — efekt před a po zkroucení, a to, že se
//      hází jen na padlé s neznámým podtypem (známý druh hod nespotřebuje).
//
// Stav po každé sérii je tu ta nejcennější kontrola: chytí přeskočený i
// přebytečný hod dřív, než se projeví jako „divná čísla někde jinde".

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Nahoda } from "../engine/nahoda.js";
import { zakladLexikon } from "../engine/lexikon.js";
import { parsuj } from "../engine/parser.js";
import { vyhodnot } from "../engine/evaluator.js";
import { rozhodniVyusteni, zdivocej } from "../engine/errors.js";
import { Znalosti, objevPodtypyZabitim } from "../engine/progression.js";

const zde = dirname(fileURLToPath(import.meta.url));
const fix = JSON.parse(readFileSync(join(zde, "fixtury_nahoda.json"), "utf-8"));
const lex = zakladLexikon();

let chyb = 0;
const selhalo = (kde, detail) => {
  chyb++;
  if (chyb <= 20) console.error(`  ✗ ${kde}: ${detail}`);
};
const shodne = (kde, dostal, ceka) => {
  if (JSON.stringify(dostal) !== JSON.stringify(ceka)) {
    selhalo(kde, `dostal ${JSON.stringify(dostal)}, čekáno ${JSON.stringify(ceka)}`);
  }
};

// (1a) Posloupnosti — bit v bit, bez tolerance.
let hodu = 0;
for (const p of fix.posloupnosti) {
  const n = new Nahoda(p.seminko);
  for (let i = 0; i < p.hodnoty.length; i++) {
    const dostal = n.random();
    hodu++;
    if (dostal !== p.hodnoty[i]) {
      selhalo(`posloupnost(${p.seminko})[${i}]`, `${dostal} ≠ ${p.hodnoty[i]}`);
      break;   // od prvního rozdílu je zbytek pásky bezcenný
    }
  }
  if (n.stav !== p.stavPo) {
    selhalo(`posloupnost(${p.seminko}) stav`, `${n.stav} ≠ ${p.stavPo}`);
  }
}

// (1b) Maskování semínka do uint32 (záporná i přes 2³²).
for (const { vstup, stav } of fix.seminka) {
  const dostal = new Nahoda(vstup).stav;
  if (dostal !== stav) selhalo(`semínko ${vstup}`, `stav ${dostal} ≠ ${stav}`);
}

// (1c) choice / uniform.
for (const p of fix.choice) {
  const n = new Nahoda(p.seminko);
  const vybery = p.delky.map((d) => n.choice([...Array(d).keys()]));
  shodne(`choice(${p.seminko})`, vybery, p.vybery);
  if (n.stav !== p.stavPo) selhalo(`choice(${p.seminko}) stav`, `${n.stav} ≠ ${p.stavPo}`);
}
for (const p of fix.uniform) {
  const n = new Nahoda(p.seminko);
  const hodnoty = p.rozsahy.map(([a, b]) => n.uniform(a, b));
  shodne(`uniform(${p.seminko})`, hodnoty, p.hodnoty);
  if (n.stav !== p.stavPo) selhalo(`uniform(${p.seminko}) stav`, `${n.stav} ≠ ${p.stavPo}`);
}

// (2) Škála vyústění.
for (const p of fix.vyusteni) {
  const n = new Nahoda(p.seminko);
  const vysledky = p.vysledky.map(() => rozhodniVyusteni(p.sance, n));
  shodne(`vyústění(šance ${p.sance})`, vysledky, p.vysledky);
  if (n.stav !== p.stavPo) {
    selhalo(`vyústění(šance ${p.sance}) stav`,
      `${n.stav} ≠ ${p.stavPo} — JS házel jinak často než Python`);
  }
}

// (3a) Divoká magie: efekt spočítat, zkroutit, porovnat s oraclem.
function serEfekt(ef) {
  return {
    typ: ef.typ, zivel: ef.zivel, cile: [...ef.cile], forma: ef.forma,
    sila: ef.sila, dosah: ef.dosah, trvani: ef.trvani,
    rezim_trvani: ef.rezimTrvani, upkeep: ef.upkeep, priznaky: [...ef.priznaky],
    filtry: ef.filtry, strany: ef.strany, runy: [...ef.runy],
    podminka: ef.podminka, kanal: ef.kanal, produkuje: ef.produkuje,
    slozky: ef.slozky.map(serEfekt),
  };
}
for (const p of fix.zdivoceni) {
  const kde = `zdivočení[${p.text} / ${p.seminko}${p.fatalni ? " fatálně" : ""}]`;
  const efekt = vyhodnot(parsuj(p.text, lex)[0], lex);
  shodne(`${kde} před`, serEfekt(efekt), p.pred);
  const n = new Nahoda(p.seminko);
  zdivocej(efekt, lex, n, p.fatalni);
  shodne(`${kde} po`, serEfekt(efekt), p.po);
  if (n.stav !== p.stavPo) selhalo(`${kde} stav`, `${n.stav} ≠ ${p.stavPo}`);
}

// (3b) Objev podtypu zabitím — hází se JEN na neznámé.
for (const p of fix.podtypy) {
  const znalosti = new Znalosti({ faze: 7 });
  for (const podtyp of p.znameDopredu) znalosti.podtypy[podtyp] = 0.0;
  const n = new Nahoda(p.seminko);
  const nove = objevPodtypyZabitim(znalosti, p.padli.map((podtyp) => ({ podtyp })), n);
  shodne(`podtypy(${p.seminko})`, nove, p.nove);
  shodne(`podtypy(${p.seminko}) po`, Object.keys(znalosti.podtypy).sort(), p.podtypyPo);
  if (n.stav !== p.stavPo) {
    selhalo(`podtypy(${p.seminko}) stav`,
      `${n.stav} ≠ ${p.stavPo} — házelo se na jiný počet padlých`);
  }
}

if (chyb) {
  console.error(`\n✗ náhoda: ${chyb} rozdílů proti oracle`);
  process.exit(1);
}
console.log(
  `✓ náhoda: ${hodu} hodů bit v bit + ${fix.vyusteni.length} škál vyústění + `
    + `${fix.zdivoceni.length} zdivočení + ${fix.podtypy.length} objevů sedí na oracle`,
);
