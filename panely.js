/* Panely — rozvržení ovládacích ploch dílny.
 *
 * PROČ TO EXISTUJE
 * Dílna má dnes rozvržení zadrátované v CSS (`grid-template-columns: 1fr 320px`)
 * a osm panelů napevno pod sebou. Na telefonu je jádro smyčky — vidím cíl,
 * složím runy, sešlu — rozházené přes celý scroll. Dokud se rozmístění zadává
 * kódem, je každá další obrazovka další ručně udržovaná kopie.
 *
 * Tenhle modul je ta vrstva pod tím: panel se DEKLARUJE (co je zač a kde má
 * být v kterém rozvržení), obsah se do něj vlije POZDĚJI. Nový panel je nový
 * záznam v datech, ne nový kód.
 *
 * ROZDĚLENÍ NA DVĚ POLOVINY
 * `rozmisti()` je čistý výpočet: seznam panelů + rozvržení → seznam pozic.
 * Nesahá na DOM, takže se dá zkoušet z Node (`tests/panely.mjs`). Teprve
 * `pripoj()` a spol. výsledek zapíšou do stránky. Bez tohohle řezu by se
 * rozmístění dalo ověřit jedině okem v prohlížeči.
 *
 * PROČ MŘÍŽKA A NE PIXELY
 * Pozice v pixelech je pozice pro jednu obrazovku. Telefon na výšku má poměr
 * ~1:2, monitor 16:9 — souřadnice zadaná pro jedno je pro druhé nesmysl.
 * Rozvržení tu proto říká POČET SLOUPCŮ a panel svoje místo v nich; přechod
 * mezi mobilem a stolem je změna počtu sloupců, ne přepis souřadnic.
 */

const chyba = (zprava) => { throw new Error("Panely: " + zprava); };

/* Pevné umístění vyžaduje VŠECHNY čtyři údaje (sloupec, řádek, šířka, výška).
 *
 * Není to formalita. Kdyby stačila část, měl by panel pozici, ale neznámou
 * výšku — a překryv dvou panelů by pak nešlo spočítat, jen doufat. CSS mřížka
 * překryv nehlásí, tiše je vykreslí přes sebe; taková vada se pozná až okem na
 * konkrétní obrazovce. Buď je umístění úplné a překryvy se hlídají, nebo je
 * panel v toku a mřížka si ho umístí sama. Nic mezi tím.
 */
const JE_PEVNE = (m) => m != null
  && m.s != null && m.r != null && m.w != null && m.h != null;

/** Jeden panel po rozmístění. `sloupec`/`radek`/`vyska` jsou null v toku. */
function _misto(panel, rozvrzeni) {
  const m = (panel.misto || {})[rozvrzeni.nazev];
  const neumisten = m === undefined;      // ne totéž co `{}` — viz níž

  if (!JE_PEVNE(m)) {
    /* V TOKU. Nevyplněná šířka je 1 sloupec, ne celá řada: nevyplněné pole
     * nesmí svého majitele zvýhodnit. Panel, na který se zapomnělo, má být
     * vidět a být zjevně nedodělaný — ne dostat nejvíc místa ze všech. */
    const w = m && m.w != null ? m.w : 1;
    if (w < 1) chyba(`panel '${panel.id}': šířka ${w} < 1`);
    return {
      id: panel.id, sloupec: null, radek: null,
      sirka: Math.min(w, rozvrzeni.sloupcu), vyska: null, neumisten,
    };
  }

  if (m.w < 1 || m.h < 1) {
    chyba(`panel '${panel.id}': rozměr ${m.w}×${m.h} musí být aspoň 1×1`);
  }
  if (m.s < 1 || m.r < 1) {
    chyba(`panel '${panel.id}': mřížka se počítá od 1, ne od ${m.s},${m.r}`);
  }
  /* Přetečení pevného umístění se NEOŘEZÁVÁ. Ořez by zachránil vykreslení a
   * zamlčel, že rozvržení lže — panel by byl užší, než si autor napsal, a
   * nikdo by se to nedozvěděl. */
  if (m.s + m.w - 1 > rozvrzeni.sloupcu) {
    chyba(`panel '${panel.id}' přetéká rozvržení '${rozvrzeni.nazev}': `
      + `sloupec ${m.s} + šířka ${m.w} > ${rozvrzeni.sloupcu} sloupců`);
  }
  return {
    id: panel.id, sloupec: m.s, radek: m.r,
    sirka: m.w, vyska: m.h, neumisten: false,
  };
}

/** Překrývají se dvě pevná umístění? Obdélníky v mřížce, tedy průnik intervalů. */
function _kolize(a, b) {
  return a.sloupec <= b.sloupec + b.sirka - 1 && b.sloupec <= a.sloupec + a.sirka - 1
    && a.radek <= b.radek + b.vyska - 1 && b.radek <= a.radek + a.vyska - 1;
}

/**
 * Spočítá rozmístění panelů v daném rozvržení.
 *
 * Pořadí výstupu je pořadí deklarace — mřížka plní tok podle pořadí v DOM,
 * takže by přeházení výstupu tiše přeházelo obrazovku.
 *
 * @param {Array} panely — deklarace panelů
 * @param {Object} rozvrzeni — {nazev, sloupcu}
 * @returns {Array} [{id, sloupec, radek, sirka, vyska, neumisten}]
 */
export function rozmisti(panely, rozvrzeni) {
  if (!rozvrzeni || !(rozvrzeni.sloupcu >= 1)) {
    chyba(`rozvržení '${rozvrzeni && rozvrzeni.nazev}' nemá počet sloupců`);
  }
  const hotovo = panely.map((p) => _misto(p, rozvrzeni));

  const pevne = hotovo.filter((m) => m.sloupec != null);
  for (let i = 0; i < pevne.length; i++) {
    for (let j = i + 1; j < pevne.length; j++) {
      if (_kolize(pevne[i], pevne[j])) {
        chyba(`v rozvržení '${rozvrzeni.nazev}' se překrývají panely `
          + `'${pevne[i].id}' a '${pevne[j].id}'`);
      }
    }
  }
  return hotovo;
}

/**
 * Vybere rozvržení podle šířky okna.
 *
 * `prah` je nejmenší šířka v pixelech, od které rozvržení platí; vyhrává
 * nejvyšší práh, který se ještě vejde. Rozvržení s prahem 0 je záchranná síť —
 * bez něj by úzká obrazovka nedostala žádné.
 */
export function vyberRozvrzeni(rozvrzeni, sirkaOkna) {
  const vhodna = Object.values(rozvrzeni)
    .filter((r) => sirkaOkna >= r.prah)
    .sort((a, b) => b.prah - a.prah);
  if (!vhodna.length) {
    chyba(`pro šířku ${sirkaOkna}px není žádné rozvržení `
      + "(chybí rozvržení s prahem 0)");
  }
  return vhodna[0];
}

/** Rejstřík panelů — deklarace, obsah, vykreslení. */
export function vytvor() {
  const panely = [];                 // deklarace v pořadí, v jakém přišly
  const rozvrzeni = {};              // nazev → {nazev, sloupcu, prah}
  const obsahy = new Map();          // id → funkce(telo)
  let koren = null;
  let aktivni = null;                // nazev právě vykresleného rozvržení
  const tela = new Map();            // id → element, do kterého píše obsah

  const najdi = (id) => panely.find((p) => p.id === id);

  const api = {
    /** Deklaruje panel. `misto` je mapa nazevRozvrzeni → {s,r,w,h}. */
    deklaruj(panel) {
      if (!panel || !panel.id) chyba("panel bez `id`");
      if (najdi(panel.id)) chyba(`panel '${panel.id}' je deklarovaný dvakrát`);
      panely.push(panel);
      return api;
    },

    /** Deklaruje rozvržení. `prah` = od jaké šířky okna platí (výchozí 0). */
    rozvrzeni(nazev, def) {
      if (rozvrzeni[nazev]) chyba(`rozvržení '${nazev}' je deklarované dvakrát`);
      rozvrzeni[nazev] = { nazev, prah: 0, ...def };
      return api;
    },

    /* Obsah se věší AŽ POTOM, a schválně jinou cestou než deklarace: panel je
     * rozvržení (kde co leží), obsah je dílna (co to dělá). Kdyby přicházely
     * jedním zápisem, nešlo by přerovnat obrazovku bez sáhnutí do vykreslování. */
    obsah(id, fn) {
      if (!najdi(id)) chyba(`obsah pro nedeklarovaný panel '${id}'`);
      obsahy.set(id, fn);
      if (tela.has(id)) api.obnov(id);   // panel už visí → naplň hned
      return api;
    },

    /** Rozmístění panelů v daném (nebo aktivním) rozvržení — bez DOM. */
    rozmisteni(nazev) {
      const r = rozvrzeni[nazev || aktivni];
      if (!r) chyba(`neznámé rozvržení '${nazev || aktivni}'`);
      return rozmisti(panely, r);
    },

    /** Postaví panely do `korenElement` a drží je při změně šířky okna. */
    pripoj(korenElement) {
      koren = korenElement;
      api.prekresli();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", () => {
          const r = vyberRozvrzeni(rozvrzeni, window.innerWidth);
          if (r.nazev !== aktivni) api.prekresli();   // jen při skutečné změně
        });
      }
      return api;
    },

    /** Vynutí konkrétní rozvržení (přepínač v dílně, zkušebna). */
    prepni(nazev) {
      if (!rozvrzeni[nazev]) chyba(`neznámé rozvržení '${nazev}'`);
      api.prekresli(nazev);
      return api;
    },

    /** Postaví rámy panelů znovu a nechá do nich obsah napsat. */
    prekresli(nazev) {
      if (!koren) chyba("prekresli() před pripoj()");
      const sirka = typeof window !== "undefined" ? window.innerWidth : 0;
      const r = nazev ? rozvrzeni[nazev] : vyberRozvrzeni(rozvrzeni, sirka);
      const plan = rozmisti(panely, r);

      aktivni = r.nazev;
      koren.innerHTML = "";
      koren.style.display = "grid";
      koren.style.gridTemplateColumns = `repeat(${r.sloupcu}, minmax(0, 1fr))`;
      koren.dataset.rozvrzeni = r.nazev;
      tela.clear();

      for (const m of plan) {
        const def = najdi(m.id);
        const ram = document.createElement("section");
        ram.className = "panel";
        ram.dataset.panel = m.id;
        ram.style.gridColumn = m.sloupec != null
          ? `${m.sloupec} / span ${m.sirka}` : `span ${m.sirka}`;
        if (m.radek != null) ram.style.gridRow = `${m.radek} / span ${m.vyska}`;
        /* Panel, na který rozvržení zapomnělo, se OZNAČÍ. Kdyby jen tiše spadl
         * do toku, vypadalo by rozvržení hotově a chyběl by v něm kus. */
        if (m.neumisten) ram.dataset.neumisten = "1";

        if (def.titulek) {
          const h = document.createElement("h2");
          h.textContent = def.titulek;
          ram.appendChild(h);
        }
        const telo = document.createElement("div");
        telo.className = "panel-telo";
        ram.appendChild(telo);
        koren.appendChild(ram);
        tela.set(m.id, telo);
      }
      api.obnov();
      return api;
    },

    /** Nechá obsah přepsat jeden panel, nebo (bez `id`) všechny. */
    obnov(id) {
      for (const [klic, telo] of tela) {
        if (id && klic !== id) continue;
        const fn = obsahy.get(klic);
        if (fn) {
          fn(telo);
        } else {
          /* Deklarovaný panel bez obsahu není prázdné místo, je to nedodělek.
           * Prázdný rám by na obrazovce splynul s hotovým; tohle je vidět. */
          telo.innerHTML = "";
          const cedule = document.createElement("div");
          cedule.className = "panel-prazdny";
          cedule.textContent = `⌛ panel '${klic}' zatím nemá obsah`;
          telo.appendChild(cedule);
        }
      }
      return api;
    },

    /** Element, do kterého daný panel píše (null, pokud panel nevisí). */
    telo(id) { return tela.get(id) || null; },

    /** Název právě vykresleného rozvržení. */
    aktivni() { return aktivni; },
  };
  return api;
}
