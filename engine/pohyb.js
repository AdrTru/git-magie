// Pohyb v JS — kam bytost dojde (přepis `zona_pohybu` z prostor.py).
//
// Přebírá už OVĚŘENÝ přepis ze sandboxu (ui/pudorys.html), jen napojený na
// primitiva enginu místo na kopie v té stránce. Zóna je hromadný dotaz na
// dosažitelnost: viditelnostní graf PO PATRECH (rohy překážek odsunuté o
// ODSTUP + přechody jako žebříky), Dijkstra vzdáleností, a pak mřížka bodů,
// které nejbližší uzel téhož patra obslouží do dosahu. UMÍ PATRA: kdo vyleze
// po žebříku, má zónu i nahoře, jen ho stoupání stojí kroky.
//
// Vrací jen VZDÁLENOSTI, ne trasy: hranice „kam dojdu" je jednoznačná bez
// ohledu na pořadí, v jakém Dijkstra uzly bere, takže se dá hlídat proti
// Pythonu. Vzorkovaná schválně — přesná hranice je geodetický kruh kolem
// překážek a ten se nenakreslí, kdežto rastr ano; k rozhodování se nepoužije.

import {
  obrys, pole, maTag, dist, bodUsecka, protinaObrys, brani, prekaziPohybu,
  vrchol, POHYB, KROK_NAHORU, KROKU_ZA_TAH,
} from "./geometrie.js";

const ODSTUP = 0.35;              // jak daleko od rohu vést cestu (i numerická vůle)
const VENEC = 8;                  // kolik uzlů kolem objemné (kruhové) překážky
const PRECHODY = ["žebřík", "schody", "pěšina", "rampa"];

const klicB = (b) => b[0] + "," + b[1];
const klicU = (b, h) => b[0] + "," + b[1] + "," + h;
const zaokrouhli6 = (x) => Math.round(x * 1e6) / 1e6;
const zOf = (o) => pole(o, "z");
const vyskaOf = (o) => pole(o, "vyska");

function poSmeru(z, k, delka) {
  const dx = k[0] - z[0], dy = k[1] - z[1], norma = Math.hypot(dx, dy);
  if (norma === 0 || delka <= 0) return k;
  return [z[0] + (dx / norma) * delka, z[1] + (dy / norma) * delka];
}
function kolmice(stred, kBodu, delka) {
  let dx = kBodu[0] - stred[0], dy = kBodu[1] - stred[1], norma = Math.hypot(dx, dy);
  if (norma === 0) { dx = 1; dy = 0; norma = 1; }
  const kx = (-dy / norma) * delka / 2, ky = (dx / norma) * delka / 2;
  return [[kBodu[0] - kx, kBodu[1] - ky], [kBodu[0] + kx, kBodu[1] + ky]];
}

// Body, přes které se dá překážka obejít — rohy odsunuté o ODSTUP ven.
function uzlyKolem(prekazka) {
  const tvar = obrys(prekazka);
  if (!tvar) return [];
  const ven = [];
  if (tvar[0] === "kruh") {
    const stred = tvar[1][0], r = tvar[1][1] + ODSTUP;
    for (let i = 0; i < VENEC; i++)
      ven.push([stred[0] + r * Math.cos((2 * Math.PI * i) / VENEC),
                stred[1] + r * Math.sin((2 * Math.PI * i) / VENEC)]);
    return ven;
  }
  for (const [a, b] of tvar[1]) {
    if (a[0] === b[0] && a[1] === b[1]) {
      for (let i = 0; i < 4; i++)
        ven.push([a[0] + ODSTUP * Math.cos((2 * Math.PI * i) / 4),
                  a[1] + ODSTUP * Math.sin((2 * Math.PI * i) / 4)]);
      continue;
    }
    ven.push(poSmeru(b, a, dist(a, b) + ODSTUP));
    ven.push(poSmeru(a, b, dist(a, b) + ODSTUP));
    for (const [konec, druhy] of [[a, b], [b, a]]) ven.push(...kolmice(druhy, konec, 2 * ODSTUP));
  }
  return ven;
}

// Leží uzel v překážce (nebo těsně na ní)? Takový se do grafu nepustí.
function uvnitrPrekazky(bod, prekazka) {
  const tvar = obrys(prekazka);
  if (!tvar) return false;
  if (tvar[0] === "kruh") return dist(bod, tvar[1][0]) < tvar[1][1] + ODSTUP / 2;
  return Math.min(...tvar[1].map((u) => bodUsecka(bod, u))) < ODSTUP / 2;
}
function necoVCeste(a, b, prekazky) {
  return prekazky.some((p) => { const t = obrys(p); return !!t && protinaObrys(a, b, t); });
}
function prekazkyPohybu(vsichni, odkud, kam, hladina) {
  return vsichni.filter((o) => o !== odkud && o !== kam && brani(o, POHYB)
                            && prekaziPohybu(o, odkud, hladina));
}

// Dá se na tomhle místě v téhle výšce vůbec stát? Na zemi vždy, výš jedině tam,
// kde něco sahá právě pod nohy (přepis `stoji_se`).
function stojiSe(bod, hladina, vsichni) {
  if (hladina === 0) return true;
  for (const o of vsichni) {
    if (Math.abs(vrchol(o) - hladina) > KROK_NAHORU) continue;
    const tvar = obrys(o);
    if (!tvar) continue;
    if (tvar[0] === "kruh") { if (dist(bod, tvar[1][0]) <= tvar[1][1]) return true; }
    else if (Math.min(...tvar[1].map((u) => bodUsecka(bod, u))) <= ODSTUP) return true;
  }
  return false;
}

// Žebříky a pěšiny jako hrany mezi hladinami: [dole, h, nahoře, h, cena].
function prechodyMezi(vsichni, odkud, kam) {
  const ven = [];
  for (const o of vsichni) {
    if (o === odkud || o === kam || !PRECHODY.some((t) => maTag(o, t))) continue;
    const dole = pole(o, "pozice");
    if (!dole) continue;
    const nahore = pole(o, "pozice_do") || dole;
    const hDole = zOf(o);
    const hNahore = (o.z_do === undefined || o.z_do === null)
      ? (vyskaOf(o) === null ? zOf(o) : zOf(o) + vyskaOf(o)) : o.z_do;
    if (hDole === hNahore) continue;      // vodorovný chodník, ne stoupání
    ven.push([dole, hDole, nahore, hNahore,
              Math.hypot(dist(dole, nahore), Math.abs(hNahore - hDole))]);
  }
  return ven;
}

// Viditelnostní graf PO PATRECH + hrany přechodů (přepis `_graf_pater`).
function grafPater(vsichni, kdo, kam, hladiny, prechody, vlastni, nedotknutelne) {
  const uzly = [], prekazkyH = {};
  for (const h of hladiny) {
    const prekazky = prekazkyPohybu(vsichni, kdo, kam, h);
    prekazkyH[h] = prekazky;
    let body = (vlastni[h] || []).slice();
    for (const p of prekazky) body = body.concat(uzlyKolem(p));
    const konce = new Set();
    for (const [a, ha, b, hb] of prechody) {
      if (ha === h) { body.push(a); konce.add(klicB(a)); }
      if (hb === h) { body.push(b); konce.add(klicB(b)); }
    }
    for (const u of body) {
      if (nedotknutelne.has(klicB(u)) || konce.has(klicB(u))
          || (!prekazky.some((p) => uvnitrPrekazky(u, p)) && stojiSe(u, h, vsichni)))
        uzly.push([u, h]);
    }
  }
  const kde = {};
  uzly.forEach((uzel, i) => { const k = klicU(uzel[0], uzel[1]); if (!(k in kde)) kde[k] = i; });
  const sousedi = uzly.map(() => []);
  for (let i = 0; i < uzly.length; i++) {
    const [ua, ha] = uzly[i];
    for (let j = i + 1; j < uzly.length; j++) {
      const [ub, hb] = uzly[j];
      if (ha !== hb || necoVCeste(ua, ub, prekazkyH[ha])) continue;
      const d = dist(ua, ub);
      sousedi[i].push([j, d]); sousedi[j].push([i, d]);
    }
  }
  for (const [a, ha, b, hb, cena] of prechody) {     // hrany mezi patry
    const i = kde[klicU(a, ha)], j = kde[klicU(b, hb)];
    if (i === undefined || j === undefined) continue;
    sousedi[i].push([j, cena]); sousedi[j].push([i, cena]);
  }
  return { uzly, sousedi, kde, prekazky: prekazkyH };
}

// Dijkstra ze `z`, uříznutá `stropem`. Vrací jen vzdálenosti.
function vzdalenosti(sousedi, z, strop) {
  const vzdal = new Map([[z, 0]]), hotovo = new Set();
  for (;;) {
    let i = -1, d = Infinity;
    for (const [u, du] of vzdal) if (!hotovo.has(u) && du < d) { i = u; d = du; }
    if (i < 0) break;
    hotovo.add(i);
    for (const [j, cena] of sousedi[i]) {
      const nova = d + cena;
      if (strop != null && nova > strop) continue;
      if (nova < (vzdal.has(j) ? vzdal.get(j) : Infinity)) vzdal.set(j, nova);
    }
  }
  return vzdal;
}

// Kam se bytost dostane, než se scéna pohne — mřížka [[x,y,hladina], …].
export function zonaPohybu(kdo, scena, { dosah = KROKU_ZA_TAH, hustota = 0.5 } = {}) {
  const vsichni = Object.values(scena.objekty);
  const start = pole(kdo, "pozice");
  if (!start || dosah <= 0 || hustota <= 0) return [];
  const prechody = prechodyMezi(vsichni, kdo, null);
  const hladiny = [...new Set([zOf(kdo), ...prechody.map((p) => p[1]),
                               ...prechody.map((p) => p[3])])].sort((a, b) => a - b);
  const vlastni = {}; vlastni[zOf(kdo)] = [start];
  const { uzly, sousedi, kde, prekazky } = grafPater(
    vsichni, kdo, null, hladiny, prechody, vlastni, new Set([klicB(start)]));
  const zacatek = kde[klicU(start, zOf(kdo))];
  if (zacatek === undefined) return [];
  const vzdal = vzdalenosti(sousedi, zacatek, dosah);

  // Od nejbližšího uzlu TÉHOŽ patra: první, který bod uvidí, ho i nejlevněji
  // obslouží. Mezi patry se skáče jen přechodem, takže se patra nemíchají.
  const odrazi = {};
  for (const h of hladiny) odrazi[h] = [];
  for (const [i, d] of vzdal) odrazi[uzly[i][1]].push([uzly[i][0], d]);
  for (const h of hladiny) odrazi[h].sort((a, b) => a[1] - b[1]);

  const body = [];
  for (let sx = Math.ceil((start[0] - dosah) / hustota); sx <= Math.floor((start[0] + dosah) / hustota); sx++)
    for (let sy = Math.ceil((start[1] - dosah) / hustota); sy <= Math.floor((start[1] + dosah) / hustota); sy++) {
      const bod = [zaokrouhli6(sx * hustota), zaokrouhli6(sy * hustota)];
      if (dist(start, bod) > dosah) continue;      // vzdušnou čarou daleko => nikdy
      for (const h of hladiny) {
        if (prekazky[h].some((p) => uvnitrPrekazky(bod, p))) continue;
        if (!stojiSe(bod, h, vsichni)) continue;   // ve vzduchu se nestojí
        for (const [uzel, d] of odrazi[h]) {
          if (d > dosah) break;                    // dál jsou uzly mimo dosah
          if (d + dist(uzel, bod) <= dosah && !necoVCeste(uzel, bod, prekazky[h])) {
            body.push([bod[0], bod[1], h]);
            break;
          }
        }
      }
    }
  return body;
}
