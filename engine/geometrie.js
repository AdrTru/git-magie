// Prostor v JS — kde věci ve scéně jsou (port `spelllang/prostor.py`).
//
// Tohle je PRVNÍ kus enginu přesunutého z Pythonu do prohlížeče. Drží se
// tří rozhodnutí originálu:
//   1. Geometrie je OPT-IN: `pozice=null` = „bez místa", nic se neomezuje.
//   2. Výhled a pohyb jsou DVĚ NEZÁVISLÉ osy (mříží vidíš/neprojdeš, závěsem
//      projdeš/neuvidíš) — proto `PREKAZKY` mapuje tag na dvojici.
//   3. Objekt má tvar, velikost a směr; jedinou pravdou o geometrii je `obrys`.
//
// Věrnost se NEtvrdí, HLÍDÁ se: `oracle_geometrie.py` vydá z Pythonu očekávané
// hodnoty a `test/geometrie.test.mjs` ověří, že tenhle port sedí. Až JS sedne
// na celý engine, Python jde do důchodu; do té doby je oracle.
//
// Jednotka = krok (≈ metr).

export const DOTEK = 1.5;
export const KROKU_ZA_TAH = 3.0;
export const TELO_BYTOSTI = 0.5;      // průměr základního těla „živého"
export const ZORNE_POLE_BYTOSTI = 60.0;
export const TAG_BYTOSTI = "živé";

export const VYHLED = "výhled";
export const POHYB = "pohyb";

// Svislá osa (2.5D): objekt zabírá interval <z, z+vyska>, půdorys je rovinný.
export const STROP = 1e6;             // „až do stropu" pro vyska=null
export const KROK_NAHORU = 0.5;       // co bytost překročí (obrubník)
export const VYSKA_BYTOSTI = 1.8;     // výchozí výška toho, kdo se hýbe

// {tag: [brání výhledu, brání pohybu]} — dvě nezávislé osy.
export const PREKAZKY = {
  "zeď":     [true, true],
  "dveře":   [true, true],
  "sloup":   [true, true],
  "skála":   [true, true],
  "mříž":    [false, true],   // vidíš skrz, neprojdeš
  "plot":    [false, true],
  "propast": [false, true],
  "závěs":   [true, false],   // projdeš, neuvidíš
  "kouř":    [true, false],
  "mlha":    [true, false],
};
export const STAVY_ZRUSENE_PREKAZKY = ["zničeno", "rozbito", "otevřeno"];

// -- objekt: výchozí hodnoty a dotazy ---------------------------------------
// Objekt je prostý JS objekt; chybějící pole se čte podle těchto výchozích,
// stejně jako dataclass v Pythonu (nezadané pole nic nemění — opt-in).

export function pole(o, jmeno) {
  const vych = {
    pozice: null, pozice_do: null, tvar: "bod", rozmer: [0, 0],
    smer: 0, body: [], z: 0, vyska: null, brani: null, obsah: [],
  };
  const v = o[jmeno];
  return v === undefined ? vych[jmeno] : v;
}

export function maTag(o, tag) {
  const t = o.tagy;
  return t instanceof Set ? t.has(tag) : Array.isArray(t) && t.includes(tag);
}

export function maStav(o, stav) {
  const s = o.stavy;
  return s instanceof Set ? s.has(stav) : Array.isArray(s) && s.includes(stav);
}

// -- kde objekt je -----------------------------------------------------------

export function pozObjektu(o, scena = null) {
  if (pole(o, "pozice") !== null) return pole(o, "pozice");
  if (!scena) return null;
  for (const nositel of Object.values(scena.objekty)) {
    if (pole(nositel, "obsah").some((p) => p === o)) {
      return pozObjektu(nositel, scena);
    }
  }
  return null;
}

function otoc(v, stupne) {
  const uhel = (stupne * Math.PI) / 180;
  const kos = Math.cos(uhel), sin = Math.sin(uhel);
  return [v[0] * kos - v[1] * sin, v[0] * sin + v[1] * kos];
}

function posun(bod, o) { return [bod[0] + o[0], bod[1] + o[1]]; }

function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

// Tvar objektu ve světě — JEDINÁ pravda o geometrii.
// Vrací ["kruh", [stred, r]] nebo ["usecky", [[a,b], ...]]; null bez místa.
export function obrys(o, scena = null) {
  const stred = pozObjektu(o, scena);
  if (stred === null) return null;
  const pozDo = pole(o, "pozice_do");
  if (pozDo !== null) return ["usecky", [[stred, pozDo]]];
  const [delka, sirka] = pole(o, "rozmer");
  const smer = pole(o, "smer");
  const tvar = pole(o, "tvar");
  if (tvar === "kruh") return ["kruh", [stred, delka / 2]];
  if (tvar === "usecka" && delka > 0) {
    const pul = otoc([delka / 2, 0], smer);
    return ["usecky", [[[stred[0] - pul[0], stred[1] - pul[1]],
                        [stred[0] + pul[0], stred[1] + pul[1]]]]];
  }
  if (tvar === "obdelnik" && delka > 0 && sirka > 0) {
    const rohy = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(
      ([zx, zy]) => posun(stred, otoc([(zx * delka) / 2, (zy * sirka) / 2], smer)));
    return ["usecky", [0, 1, 2, 3].map((i) => [rohy[i], rohy[(i + 1) % 4]])];
  }
  const body = pole(o, "body");
  if ((tvar === "lomena" || tvar === "polygon") && body.length >= 2) {
    const vrcholy = body.map((b) => posun(stred, otoc(b, smer)));
    if (tvar === "polygon") vrcholy.push(vrcholy[0]);
    const useky = [];
    for (let i = 0; i < vrcholy.length - 1; i++) useky.push([vrcholy[i], vrcholy[i + 1]]);
    return ["usecky", useky];
  }
  if (tvar === "bod" && maTag(o, TAG_BYTOSTI)) return ["kruh", [stred, TELO_BYTOSTI / 2]];
  return ["usecky", [[stred, stred]]];
}

// -- úsečkové primitivy ------------------------------------------------------

function smer3(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function leziNa(a, b, c) {
  return Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) &&
         Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
}

function kriz(p, q) {
  const d1 = smer3(q[0], q[1], p[0]), d2 = smer3(q[0], q[1], p[1]);
  const d3 = smer3(p[0], p[1], q[0]), d4 = smer3(p[0], p[1], q[1]);
  if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0) &&
      d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0) return true;
  const zk = [[d1, q[0], q[1], p[0]], [d2, q[0], q[1], p[1]],
              [d3, p[0], p[1], q[0]], [d4, p[0], p[1], q[1]]];
  return zk.some(([d, u, v, w]) => d === 0 && leziNa(u, v, w));
}

function bodUsecka(bod, u) {           // vzdálenost bodu od úsečky
  const [ax, ay] = u[0], [bx, by] = u[1];
  const dx = bx - ax, dy = by - ay;
  const delka2 = dx * dx + dy * dy;
  if (delka2 === 0) return dist(bod, u[0]);
  const t = Math.max(0, Math.min(1, ((bod[0] - ax) * dx + (bod[1] - ay) * dy) / delka2));
  return dist(bod, [ax + t * dx, ay + t * dy]);
}

function bodNaUsecce(bod, u) {          // bod úsečky nejbližší danému bodu
  const [ax, ay] = u[0], [bx, by] = u[1];
  const dx = bx - ax, dy = by - ay;
  const delka2 = dx * dx + dy * dy;
  if (delka2 === 0) return u[0];
  const t = Math.max(0, Math.min(1, ((bod[0] - ax) * dx + (bod[1] - ay) * dy) / delka2));
  return [ax + t * dx, ay + t * dy];
}

function useckyVzdalenost(p, q) {
  if (kriz(p, q)) return 0;
  return Math.min(bodUsecka(p[0], q), bodUsecka(p[1], q),
                  bodUsecka(q[0], p), bodUsecka(q[1], p));
}

function prusecik(p, q) {               // průsečík nosných přímek; null u rovnoběžek
  const [[ax, ay], [bx, by]] = p, [[cx, cy], [dx_, dy_]] = q;
  const rx = bx - ax, ry = by - ay, sx = dx_ - cx, sy = dy_ - cy;
  const jm = rx * sy - ry * sx;
  if (jm === 0) return null;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / jm;
  return [ax + t * rx, ay + t * ry];
}

function naKruhu(stred, r, k) {         // bod kružnice nejbližší bodu k
  const d = dist(stred, k);
  if (d === 0) return stred;
  const m = Math.min(r, d);
  return [stred[0] + ((k[0] - stred[0]) / d) * m,
          stred[1] + ((k[1] - stred[1]) / d) * m];
}

// -- vzdálenost obrysů -------------------------------------------------------

function obrysyVzdalenost(p, q) {
  if (p[0] === "kruh" && q[0] === "kruh") {
    const [sa, ra] = p[1], [sb, rb] = q[1];
    return Math.max(0, dist(sa, sb) - ra - rb);
  }
  if (p[0] === "kruh") { [p, q] = [q, p]; }
  if (q[0] === "kruh") {
    const [stred, r] = q[1];
    return Math.max(0, Math.min(...p[1].map((u) => bodUsecka(stred, u))) - r);
  }
  let nej = Infinity;
  for (const u of p[1]) for (const v of q[1]) nej = Math.min(nej, useckyVzdalenost(u, v));
  return nej;
}

function nejblizsiObrysy(p, q) {
  if (p[0] === "kruh" && q[0] === "kruh") {
    const [sa, ra] = p[1], [sb, rb] = q[1];
    const x = naKruhu(sa, ra, sb), y = naKruhu(sb, rb, sa);
    if (dist(sa, sb) <= ra + rb) {
      const dotyk = [(x[0] + y[0]) / 2, (x[1] + y[1]) / 2];
      return [dotyk, dotyk];
    }
    return [x, y];
  }
  if (p[0] === "kruh") { const [y, x] = nejblizsiObrysy(q, p); return [x, y]; }
  if (q[0] === "kruh") {
    const [stred, r] = q[1];
    let nej = null, nd = Infinity;
    for (const u of p[1]) { const b = bodNaUsecce(stred, u); const d = dist(b, stred);
      if (d < nd) { nd = d; nej = b; } }
    return [nej, naKruhu(stred, r, nej)];
  }
  let best = null, bd = Infinity;
  for (const u of p[1]) for (const v of q[1]) {
    const par = dvojiceUsecek(u, v); const d = dist(par[0], par[1]);
    if (d < bd) { bd = d; best = par; }
  }
  return best;
}

function dvojiceUsecek(u, v) {
  if (kriz(u, v)) { const pr = prusecik(u, v); if (pr !== null) return [pr, pr]; }
  const kand = [[u[0], bodNaUsecce(u[0], v)], [u[1], bodNaUsecce(u[1], v)],
                [bodNaUsecce(v[0], u), v[0]], [bodNaUsecce(v[1], u), v[1]]];
  let best = kand[0], bd = Infinity;
  for (const par of kand) { const d = dist(par[0], par[1]); if (d < bd) { bd = d; best = par; } }
  return best;
}

function nejblizsiObrysu(tvar, bod) {
  return nejblizsiObrysy(["usecky", [[bod, bod]]], tvar)[1];
}

// -- svislá osa --------------------------------------------------------------

export function vrchol(o) {
  const v = pole(o, "vyska");
  return pole(o, "z") + (v === null ? STROP : v);
}

function vyskaOci(o) {            // odkud se dívá / míří; nezadaná výška = z podlahy
  const v = pole(o, "vyska");
  return pole(o, "z") + (v === null ? 0 : v);
}

function svislyOdstup(a, b) {
  return Math.max(0, pole(a, "z") - vrchol(b), pole(b, "z") - vrchol(a));
}

export function vzdalenost(a, b, scena = null) {
  const ua = obrys(a, scena), ub = obrys(b, scena);
  if (ua === null || ub === null) return null;
  const vodorovne = obrysyVzdalenost(ua, ub);
  const svisle = svislyOdstup(a, b);
  return svisle ? Math.hypot(vodorovne, svisle) : vodorovne;
}

export function nejblizsiBody(a, b, scena = null) {
  const ua = obrys(a, scena), ub = obrys(b, scena);
  if (ua === null || ub === null) return null;
  return nejblizsiObrysy(ua, ub);
}

// -- kdo překáží -------------------------------------------------------------

export function brani(o, co) {
  if (STAVY_ZRUSENE_PREKAZKY.some((s) => maStav(o, s))) return false;
  const vlastni = pole(o, "brani");
  if (vlastni !== null) {
    return vlastni instanceof Set ? vlastni.has(co) :
           Array.isArray(vlastni) ? vlastni.includes(co) : false;
  }
  for (const [tag, [vyhled, pohyb]] of Object.entries(PREKAZKY)) {
    if (maTag(o, tag) && (co === VYHLED ? vyhled : pohyb)) return true;
  }
  return false;
}

function paprsek(a, b, scena) {
  const odkud = pozObjektu(a, scena);
  const tel = obrys(b, scena);
  if (odkud === null || tel === null) return null;
  return [odkud, nejblizsiObrysu(tel, odkud)];
}

function protinaObrys(a, b, cizi) {
  if (cizi[0] === "kruh") {
    const [stred, r] = cizi[1];
    return r > 0 && bodUsecka(stred, [a, b]) <= r;
  }
  return cizi[1].some((u) => (u[0][0] !== u[1][0] || u[0][1] !== u[1][1]) &&
                             useckyVzdalenost([a, b], u) <= 0);
}

function prekaziPohybu(prekazka, kdo, hladina = null) {
  if (kdo === null) return true;
  const z = hladina === null ? pole(kdo, "z") : hladina;
  const spodek = z + KROK_NAHORU;
  const v = pole(kdo, "vyska");
  const vrsek = z + (v === null ? VYSKA_BYTOSTI : v);
  return vrchol(prekazka) > spodek && pole(prekazka, "z") < vrsek;
}

function cloniVRozmezi(prekazka, od, doo) {
  return pole(prekazka, "z") <= doo && od <= vrchol(prekazka);
}

function vyskaDrahy(a, b, podil) {
  return vyskaOci(a) + (vyskaOci(b) - vyskaOci(a)) * podil;
}

function koreneKruhu(a, b, stred, r) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const fx = a[0] - stred[0], fy = a[1] - stred[1];
  const kv = dx * dx + dy * dy;
  if (kv === 0) return null;
  const lin = 2 * (fx * dx + fy * dy);
  const abs = fx * fx + fy * fy - r * r;
  const disk = lin * lin - 4 * kv * abs;
  if (disk < 0) return null;
  const od = Math.sqrt(disk);
  return [(-lin - od) / (2 * kv), (-lin + od) / (2 * kv)];
}

function podilKrizeni(a, b, cizi) {
  const delka = dist(a, b);
  if (delka === 0) return 0;
  const body = cizi[0] === "kruh" ? [cizi[1][0]] : cizi[1].flat();
  let nejb = body[0], nd = Infinity;
  for (const p of body) { const d = bodUsecka(p, [a, b]); if (d < nd) { nd = d; nejb = p; } }
  const s = [(b[0] - a[0]) / delka, (b[1] - a[1]) / delka];
  const t = (nejb[0] - a[0]) * s[0] + (nejb[1] - a[1]) * s[1];
  return Math.max(0, Math.min(1, t / delka));
}

function rozmeziKrizeni(a, b, cizi) {
  if (cizi[0] === "kruh") {
    const [stred, r] = cizi[1];
    const kor = koreneKruhu(a, b, stred, r);
    if (kor !== null) {
      const clip = (x) => Math.max(0, Math.min(1, x));
      return [clip(kor[0]), clip(kor[1])];
    }
  } else {
    const delka = dist(a, b);
    const podily = [];
    for (const u of cizi[1]) {
      if ((u[0][0] === u[1][0] && u[0][1] === u[1][1]) || !kriz([a, b], u)) continue;
      const pr = prusecik([a, b], u);
      if (pr === null || delka === 0) continue;
      podily.push(Math.max(0, Math.min(1, dist(a, pr) / delka)));
    }
    if (podily.length) return [Math.min(...podily), Math.max(...podily)];
  }
  const jeden = podilKrizeni(a, b, cizi);
  return [jeden, jeden];
}

export function prekazkyMezi(a, b, scena, co = VYHLED) {
  const pap = paprsek(a, b, scena);
  if (pap === null) return [];
  const [ua, ub] = pap;
  const stojici = [];
  for (const o of Object.values(scena.objekty)) {
    if (o === a || o === b || !brani(o, co)) continue;
    const cizi = obrys(o, scena);
    if (cizi === null || !protinaObrys(ua, ub, cizi)) continue;
    if (co === POHYB) {
      if (!prekaziPohybu(o, a)) continue;
    } else {
      const [od, doo] = rozmeziKrizeni(ua, ub, cizi);
      const vysky = [vyskaDrahy(a, b, od), vyskaDrahy(a, b, doo)];
      if (!cloniVRozmezi(o, Math.min(...vysky), Math.max(...vysky))) continue;
    }
    stojici.push(o);
  }
  return stojici;
}

export function vidiNa(a, b, scena) { return prekazkyMezi(a, b, scena, VYHLED).length === 0; }
export function projde(a, b, scena) { return prekazkyMezi(a, b, scena, POHYB).length === 0; }

// -- zorné pole --------------------------------------------------------------

export function zornePole(o) {
  if (pole(o, "zorne_pole") !== undefined && o.zorne_pole != null) return o.zorne_pole;
  return maTag(o, TAG_BYTOSTI) ? ZORNE_POLE_BYTOSTI : null;
}

function uhelMezi(vrcholB, a, b) {
  const u = [a[0] - vrcholB[0], a[1] - vrcholB[1]];
  const v = [b[0] - vrcholB[0], b[1] - vrcholB[1]];
  if ((u[0] === 0 && u[1] === 0) || (v[0] === 0 && v[1] === 0)) return 0;
  const kos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]));
  return Math.acos(Math.max(-1, Math.min(1, kos)));
}

function uhelKObrysu(odkud, kouka, tvar) {
  if (tvar[0] === "kruh") {
    const [stred, r] = tvar[1];
    const d = dist(odkud, stred);
    if (d <= r) return 0;
    return Math.max(0, uhelMezi(odkud, kouka, stred) - Math.asin(Math.min(1, r / d)));
  }
  const body = tvar[1].flat();
  const dosah = Math.max(0, ...body.map((b) => dist(odkud, b))) + 1;
  if (dosah <= 1) return 0;
  const smer = [kouka[0] - odkud[0], kouka[1] - odkud[1]];
  const norma = Math.hypot(smer[0], smer[1]) || 1;
  const pap = [odkud, [odkud[0] + (smer[0] / norma) * dosah,
                       odkud[1] + (smer[1] / norma) * dosah]];
  let nej = Math.PI;
  for (const u of tvar[1]) {
    if ((u[0][0] !== u[1][0] || u[0][1] !== u[1][1]) && kriz(pap, u)) return 0;
    for (const b of u) {
      if (b[0] === odkud[0] && b[1] === odkud[1]) return 0;
      nej = Math.min(nej, uhelMezi(odkud, kouka, b));
    }
  }
  return nej;
}

export function vZornemPoli(kdo, co, scena) {
  const vysec = zornePole(kdo);
  if (vysec === null || vysec >= 360) return true;
  const odkud = pozObjektu(kdo, scena);
  const tel = obrys(co, scena);
  if (odkud === null || tel === null) return true;
  const kouka = posun(odkud, otoc([1, 0], pole(kdo, "smer")));
  return uhelKObrysu(odkud, kouka, tel) <= (vysec * Math.PI) / 180 / 2;
}

// Vidí bytost na cíl? Zorné pole A volný výhled (to peče `generuj_pudorys` do
// klíče `vidi`).
export function vnima(kdo, co, scena) {
  return vZornemPoli(kdo, co, scena) && vidiNa(kdo, co, scena);
}
