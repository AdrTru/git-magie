// Sdílená náhoda — jeden generátor pro prohlížeč i pro Python (§11).
// Řádka po řádce dvojče `spelllang/nahoda.py`; jádro je **mulberry32**.
//
// PROČ VLASTNÍ, KDYŽ JS `Math.random()` MÁ. Protože ho nejde nasadit ani
// zopakovat — a celý přepis stojí na tom, že se JS dá porovnat s Pythonem.
// Co je náhodné v každém jazyce jinak, se porovnat nedá. Naopak Pythonův
// `random` (Mersenne Twister) se sem přenést nedá; proto ustupují oba a
// používá se generátor, který je v obou jazycích tentýž.
//
// BITY, NE ČÍSLA. Násobení dvou uint32 přeteče přesnost `Number`, takže se
// násobí přes `Math.imul` (32bitové násobení, spodních 32 bitů — přesně to,
// co v Pythonu dělá `(x * y) & MASKA`). Každý mezikrok se vrací do uint32
// přes `>>> 0`; kdyby se to zanedbalo, obě strany se rozejdou po pár hodech.
//
// Rozhraní sedí na `random.Random` v tom, co engine používá (`random`,
// `choice`, `uniform`) — `choice`/`uniform` si ale definujeme sami, protože
// vnitřek CPythonu (odmítací vzorkování) se replikuje hůř než jedno dělení.
// Neportuje se, co se nepoužívá; přibude to s tím, kdo to zavolá.

export const MASKA = 0xFFFFFFFF;
export const DELIC = 4294967296;   // 2³²
export const KROK = 0x6D2B79F5;    // přírůstek stavu (mulberry32)

export class Nahoda {
  constructor(seminko = 0) {
    this.stav = (Number(seminko) & MASKA) >>> 0;
  }

  // Generátor s nepředvídatelným semínkem — pro hru, ne pro zkoušky. Kdo chce
  // partii zopakovat (nebo uložit), podrží si semínko a použije `new Nahoda(s)`.
  static nahodna() {
    return new Nahoda(Math.floor(Math.random() * DELIC));
  }

  // Další hodnota v [0, 1). Bit v bit totéž co `nahoda.py`.
  random() {
    this.stav = (this.stav + KROK) >>> 0;
    const a = this.stav;
    let t = Math.imul(a ^ (a >>> 15), 1 | a) >>> 0;
    t = ((((t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0) ^ t) >>> 0);
    return ((t ^ (t >>> 14)) >>> 0) / DELIC;
  }

  // Jeden prvek z neprázdné sekvence (index = `random()` × délka).
  choice(moznosti) {
    const polozky = [...moznosti];
    if (!polozky.length) throw new RangeError("Nahoda.choice: prázdná nabídka");
    return polozky[Math.floor(this.random() * polozky.length)];
  }

  // Rovnoměrně mezi `a` a `b` — týž tvar výrazu jako `random.uniform`.
  uniform(a, b) {
    return a + (b - a) * this.random();
  }
}
