// GENEROVANÝ SOUBOR — needituj ručně.
// Vyrábí `oracle_kouzla.py` z `spelllang/lexicon.py` (zaklad_lexikon()).
// Čistá DATA lexikonu (runy + interakční tabulky); funkce neguj/zuz jsou
// v ručně psaném `lexikon.js`, který tohle re-exportuje. Jeden zdroj pravdy
// je Python. Klíč interakce = `A|B` (seřazená dvojice názvů).

export function zakladLexikon() {
  return {
  "runy": {
    "zazehni": {
      "id": "zazehni",
      "druh": "sloveso",
      "nazev": "Zažehni",
      "data": {
        "typ": "POSKOZENI",
        "sila": 10,
        "dosah": 6,
        "trvani": 0,
        "cena": 3
      }
    },
    "zmraz": {
      "id": "zmraz",
      "druh": "sloveso",
      "nazev": "Zmraz",
      "data": {
        "typ": "OVLADNUTI",
        "sila": 6,
        "dosah": 6,
        "trvani": 3,
        "cena": 3
      }
    },
    "zhoj": {
      "id": "zhoj",
      "druh": "sloveso",
      "nazev": "Zhoj",
      "data": {
        "typ": "LECENI",
        "sila": 12,
        "dosah": 2,
        "trvani": 0,
        "cena": 3.5
      }
    },
    "rozbij": {
      "id": "rozbij",
      "druh": "sloveso",
      "nazev": "Rozbij",
      "data": {
        "typ": "POSKOZENI",
        "sila": 14,
        "dosah": 4,
        "trvani": 0,
        "cena": 4
      }
    },
    "zastit": {
      "id": "zastit",
      "druh": "sloveso",
      "nazev": "Zaštiť",
      "data": {
        "typ": "POSILENI",
        "sila": 8,
        "dosah": 0,
        "trvani": 5,
        "cena": 3
      }
    },
    "odhal": {
      "id": "odhal",
      "druh": "sloveso",
      "nazev": "Odhal",
      "data": {
        "typ": "UZITEK",
        "sila": 0,
        "dosah": 8,
        "trvani": 0,
        "cena": 2,
        "priznak": "odhalení"
      }
    },
    "svaz": {
      "id": "svaz",
      "druh": "sloveso",
      "nazev": "Sváž",
      "data": {
        "typ": "UZITEK",
        "sila": 4,
        "dosah": 8,
        "trvani": 10,
        "cena": 2.5,
        "produkuje": "Spojení",
        "latentni": {
          "jadro": "SPOJENI(A, B)",
          "napoveda": "pouto mezi dvěma body v prostoru — efekt lze vést skrze ně (kanál Spojeni), ne jen svázat provaz",
          "priklad": "Sváž Já Bod pak Přesuň Já skrze Spojení = teleport"
        }
      }
    },
    "presun": {
      "id": "presun",
      "druh": "sloveso",
      "nazev": "Přesuň",
      "data": {
        "typ": "UZITEK",
        "sila": 5,
        "dosah": 10,
        "trvani": 0,
        "cena": 3,
        "latentni": {
          "jadro": "PRESUN(co, kam)",
          "napoveda": "přemístění v prostoru — vedeno po poutu (skrze Spojeni) se z něj stává teleport",
          "priklad": "Přesuň Já skrze Spojení"
        }
      }
    },
    "ohen": {
      "id": "ohen",
      "druh": "podstata",
      "nazev": "Oheň",
      "data": {
        "priznak": "hoří",
        "cena": 2
      }
    },
    "voda": {
      "id": "voda",
      "druh": "podstata",
      "nazev": "Voda",
      "data": {
        "priznak": "promáčeno",
        "cena": 2
      }
    },
    "vitr": {
      "id": "vitr",
      "druh": "podstata",
      "nazev": "Vítr",
      "data": {
        "priznak": "odmrštěno",
        "cena": 2
      }
    },
    "kamen": {
      "id": "kamen",
      "druh": "podstata",
      "nazev": "Kámen",
      "data": {
        "priznak": "zavaleno",
        "cena": 2
      }
    },
    "svetlo": {
      "id": "svetlo",
      "druh": "podstata",
      "nazev": "Světlo",
      "data": {
        "priznak": "ozářeno",
        "cena": 2
      }
    },
    "zivot": {
      "id": "zivot",
      "druh": "podstata",
      "nazev": "Život",
      "data": {
        "priznak": "oživeno",
        "cena": 2.5
      }
    },
    "mysl": {
      "id": "mysl",
      "druh": "podstata",
      "nazev": "Mysl",
      "data": {
        "priznak": "zmámeno",
        "cena": 2.5
      }
    },
    "zvuk": {
      "id": "zvuk",
      "druh": "podstata",
      "nazev": "Zvuk",
      "data": {
        "priznak": "ohlušeno",
        "cena": 2
      }
    },
    "blesk": {
      "id": "blesk",
      "druh": "podstata",
      "nazev": "Blesk",
      "data": {
        "priznak": "šok",
        "cena": 2.5
      }
    },
    "spojeni": {
      "id": "spojeni",
      "druh": "podstata",
      "nazev": "Spojení",
      "data": {
        "priznak": "pouto",
        "cena": 2
      }
    },
    "eter": {
      "id": "eter",
      "druh": "podstata",
      "nazev": "Éter",
      "data": {
        "priznak": "odhmotněno",
        "cena": 2.5
      }
    },
    "ja": {
      "id": "ja",
      "druh": "cil",
      "nazev": "Já",
      "data": {
        "strana": "self",
        "cena": 0.5
      }
    },
    "nepritel": {
      "id": "nepritel",
      "druh": "cil",
      "nazev": "Nepřítel",
      "data": {
        "strana": "enemy",
        "cena": 1
      }
    },
    "spojenec": {
      "id": "spojenec",
      "druh": "cil",
      "nazev": "Spojenec",
      "data": {
        "strana": "ally",
        "cena": 1
      }
    },
    "bod": {
      "id": "bod",
      "druh": "cil",
      "nazev": "Bod",
      "data": {
        "strana": "point",
        "cena": 1
      }
    },
    "smer": {
      "id": "smer",
      "druh": "cil",
      "nazev": "Směr",
      "data": {
        "strana": "smer",
        "cena": 0.5
      }
    },
    "vse": {
      "id": "vse",
      "druh": "cil",
      "nazev": "Cíl",
      "data": {
        "strana": "any",
        "cena": 2
      }
    },
    "projektil": {
      "id": "projektil",
      "druh": "forma",
      "nazev": "Projektil",
      "data": {
        "plosne": false,
        "cena": 1.5,
        "dorucuje": true,
        "cena_dosahem": 0.03
      }
    },
    "vybuch": {
      "id": "vybuch",
      "druh": "forma",
      "nazev": "Výbuch",
      "data": {
        "plosne": true,
        "dosah_nasobek": 1.3,
        "cena": 2.5,
        "obrazec": "koule",
        "stred": "cíl",
        "polomer": 2.5,
        "cena_dosahem": 0.15
      }
    },
    "paprsek": {
      "id": "paprsek",
      "druh": "forma",
      "nazev": "Paprsek",
      "data": {
        "plosne": true,
        "zasahne_drahu": true,
        "cena": 2,
        "obrazec": "pas",
        "stred": "já",
        "sirka": 1.0,
        "cena_dosahem": 0.05
      }
    },
    "kuzel": {
      "id": "kuzel",
      "druh": "forma",
      "nazev": "Kužel",
      "data": {
        "plosne": true,
        "dosah_nasobek": 0.8,
        "cena": 2,
        "obrazec": "vysec",
        "stred": "já",
        "uhel": 60.0
      }
    },
    "zed": {
      "id": "zed",
      "druh": "forma",
      "nazev": "Zeď",
      "data": {
        "plosne": true,
        "teren": true,
        "trvani_zaklad": 4,
        "trvani_nasobek": 2.0,
        "cena": 2.5
      }
    },
    "aura": {
      "id": "aura",
      "druh": "forma",
      "nazev": "Aura",
      "data": {
        "plosne": true,
        "sleduje_nositele": true,
        "dosah_nasobek": 0.3,
        "trvani_nasobek": 1.5,
        "cena": 2,
        "obrazec": "koule",
        "stred": "já"
      }
    },
    "silne": {
      "id": "silne",
      "druh": "modifikator",
      "nazev": "silně",
      "data": {
        "parametr": "sila",
        "nasobek": 1.5,
        "cena_nasobek": 1.25,
        "dovednost": true
      }
    },
    "slabe": {
      "id": "slabe",
      "druh": "modifikator",
      "nazev": "slabě",
      "data": {
        "parametr": "sila",
        "nasobek": 0.6,
        "cena_nasobek": 0.9,
        "dovednost": true
      }
    },
    "dlouze": {
      "id": "dlouze",
      "druh": "modifikator",
      "nazev": "dlouze",
      "data": {
        "parametr": "trvani",
        "nasobek": 1.8,
        "cena_nasobek": 1.3,
        "dovednost": true
      }
    },
    "dosiroka": {
      "id": "dosiroka",
      "druh": "modifikator",
      "nazev": "doširoka",
      "data": {
        "parametr": "dosah",
        "nasobek": 1.6,
        "cena_nasobek": 1.3,
        "dovednost": true
      }
    },
    "soustredene": {
      "id": "soustredene",
      "druh": "modifikator",
      "nazev": "soustředěně",
      "data": {
        "rezim": "soustředění",
        "cena_nasobek": 0.7,
        "dovednost": true
      }
    },
    "tise": {
      "id": "tise",
      "druh": "modifikator",
      "nazev": "tiše",
      "data": {
        "priznak": "nenápadné",
        "cena_nasobek": 1.4,
        "dovednost": true
      }
    },
    "okazale": {
      "id": "okazale",
      "druh": "modifikator",
      "nazev": "okázale",
      "data": {
        "priznak": "okázalé",
        "cena_nasobek": 0.8,
        "dovednost": true
      }
    },
    "iluzorne": {
      "id": "iluzorne",
      "druh": "modifikator",
      "nazev": "iluzorně",
      "data": {
        "parametr": "sila",
        "nasobek": 0.0,
        "priznak": "iluze",
        "cena_nasobek": 0.5
      }
    },
    "prurazne": {
      "id": "prurazne",
      "druh": "modifikator",
      "nazev": "průrazně",
      "data": {
        "priznak": "průrazné",
        "cena_nasobek": 1.3
      }
    },
    "a": {
      "id": "a",
      "druh": "spojka",
      "nazev": "a",
      "data": {}
    },
    "pak": {
      "id": "pak",
      "druh": "spojka",
      "nazev": "pak",
      "data": {}
    },
    "pokud": {
      "id": "pokud",
      "druh": "spojka",
      "nazev": "pokud",
      "data": {}
    },
    "skrze": {
      "id": "skrze",
      "druh": "spojka",
      "nazev": "skrze",
      "data": {}
    },
    "ne": {
      "id": "ne",
      "druh": "spojka",
      "nazev": "ne",
      "data": {}
    },
    "zuzeni": {
      "id": "zuzeni",
      "druh": "spojka",
      "nazev": ":",
      "data": {}
    }
  },
  "interakceZivlu": {
    "Oheň|Voda": {
      "zivel": "Pára",
      "priznak": "tepelný šok",
      "sila_bonus": 6
    },
    "Oheň|Vítr": {
      "zivel": "Ohnivá bouře",
      "priznak": "šíří se",
      "sila_bonus": 8
    },
    "Kámen|Oheň": {
      "zivel": "Láva",
      "priznak": "taví",
      "sila_bonus": 5
    },
    "Kámen|Vítr": {
      "zivel": "Písečná bouře",
      "priznak": "oslepeno",
      "sila_bonus": 3
    },
    "Chlad|Voda": {
      "zivel": "Led",
      "priznak": "zmrazeno",
      "sila_bonus": 4
    },
    "Smrt|Voda": {
      "zivel": "Jed",
      "priznak": "otráveno",
      "sila_bonus": 5
    },
    "Blesk|Voda": {
      "zivel": "Vodivý výboj",
      "priznak": "řetězí se",
      "sila_bonus": 6
    },
    "Led|Vítr": {
      "zivel": "Ledová tříšť",
      "priznak": "krvácí",
      "sila_bonus": 4
    },
    "Kámen|Led": {
      "zivel": "Ledovec",
      "priznak": "znehybněno",
      "sila_bonus": 5
    },
    "Chlad|Láva": {
      "zivel": "Obsidián",
      "priznak": "ostré střepy",
      "sila_bonus": 6
    },
    "Pára|Vítr": {
      "zivel": "Horká mlha",
      "priznak": "oslepeno párou",
      "sila_bonus": 4
    },
    "Oheň|Pára": {
      "zivel": "Přehřátá pára",
      "priznak": "opařeno",
      "sila_bonus": 7
    },
    "Oheň|Světlo": {
      "zivel": "Sžíravá zář",
      "priznak": "oslněno",
      "sila_bonus": 4
    },
    "Oheň|Život": {
      "zivel": "Horečka",
      "priznak": "horečnaté",
      "sila_bonus": 3
    },
    "Oheň|Zvuk": {
      "zivel": "Třesk",
      "priznak": "ohlušeno",
      "sila_bonus": 6
    },
    "Blesk|Oheň": {
      "zivel": "Kulový blesk",
      "priznak": "šok",
      "sila_bonus": 7
    },
    "Oheň|Spojení": {
      "zivel": "Ohnivý řetěz",
      "priznak": "žhne poutem",
      "sila_bonus": 5
    },
    "Kámen|Voda": {
      "zivel": "Bahno",
      "priznak": "zabahněno",
      "sila_bonus": 3
    },
    "Spojení|Voda": {
      "zivel": "Vír",
      "priznak": "vtaženo",
      "sila_bonus": 3
    },
    "Světlo|Voda": {
      "zivel": "Svěcená voda",
      "priznak": "posvěceno",
      "sila_bonus": 4
    },
    "Voda|Život": {
      "zivel": "Živá voda",
      "priznak": "obrozeno",
      "sila_bonus": 5
    },
    "Mysl|Voda": {
      "zivel": "Sen",
      "priznak": "spí",
      "sila_bonus": 3
    },
    "Voda|Zvuk": {
      "zivel": "Tlaková vlna",
      "priznak": "odmrštěno",
      "sila_bonus": 4
    },
    "Vítr|Život": {
      "zivel": "Dech života",
      "priznak": "nadechnuto",
      "sila_bonus": 4
    },
    "Vítr|Zvuk": {
      "zivel": "Burácení",
      "priznak": "ohlušeno",
      "sila_bonus": 4
    },
    "Blesk|Vítr": {
      "zivel": "Bouře",
      "priznak": "šok",
      "sila_bonus": 7
    },
    "Kámen|Světlo": {
      "zivel": "Křišťál",
      "priznak": "ozářeno",
      "sila_bonus": 3
    },
    "Kámen|Život": {
      "zivel": "Golem",
      "priznak": "oživeno",
      "sila_bonus": 5
    },
    "Kámen|Mysl": {
      "zivel": "Zkamenění",
      "priznak": "zkamenělé",
      "sila_bonus": 5
    },
    "Kámen|Zvuk": {
      "zivel": "Dunění",
      "priznak": "otřeseno",
      "sila_bonus": 5
    },
    "Blesk|Kámen": {
      "zivel": "Magnetovec",
      "priznak": "zmagnetizováno",
      "sila_bonus": 4
    },
    "Kámen|Spojení": {
      "zivel": "Pilíř",
      "priznak": "ukotveno",
      "sila_bonus": 3
    },
    "Světlo|Život": {
      "zivel": "Požehnání",
      "priznak": "požehnáno",
      "sila_bonus": 4
    },
    "Blesk|Světlo": {
      "zivel": "Oslnivý výboj",
      "priznak": "šok",
      "sila_bonus": 5
    },
    "Spojení|Světlo": {
      "zivel": "Světlovod",
      "priznak": "provázáno světlem",
      "sila_bonus": 3
    },
    "Světlo|Éter": {
      "zivel": "Astrální svit",
      "priznak": "zjeveno",
      "sila_bonus": 3
    },
    "Zvuk|Život": {
      "zivel": "Píseň života",
      "priznak": "povzbuzeno",
      "sila_bonus": 3
    },
    "Blesk|Život": {
      "zivel": "Jiskra života",
      "priznak": "oživeno",
      "sila_bonus": 5
    },
    "Spojení|Život": {
      "zivel": "Symbióza",
      "priznak": "symbióza",
      "sila_bonus": 3
    },
    "Éter|Život": {
      "zivel": "Přízrak",
      "priznak": "odhmotněno",
      "sila_bonus": 4
    },
    "Mysl|Zvuk": {
      "zivel": "Vnitřní hlas",
      "priznak": "zmámeno",
      "sila_bonus": 3
    },
    "Blesk|Mysl": {
      "zivel": "Přetížení",
      "priznak": "omráčeno",
      "sila_bonus": 5
    },
    "Blesk|Zvuk": {
      "zivel": "Hrom",
      "priznak": "otřeseno",
      "sila_bonus": 6
    },
    "Spojení|Zvuk": {
      "zivel": "Rezonance",
      "priznak": "rezonuje",
      "sila_bonus": 4
    },
    "Blesk|Spojení": {
      "zivel": "Obvod",
      "priznak": "obvod",
      "sila_bonus": 5
    }
  },
  "interakceForem": {
    "Projektil|Výbuch": {
      "forma": "Tříštivý projektil",
      "priznak": "tříští se"
    },
    "Kužel|Projektil": {
      "forma": "Vějíř",
      "priznak": "více střel"
    },
    "Aura|Zeď": {
      "forma": "Kupole",
      "priznak": "uzavřený prostor"
    }
  },
  "protikladySloves": {
    "zazehni": {
      "vyklad": "uhas",
      "typ": "UZITEK",
      "sila": 8,
      "dosah": 6,
      "trvani": 0,
      "cena": 3,
      "priznak": "uhašeno"
    },
    "zmraz": {
      "vyklad": "uvolni",
      "typ": "UZITEK",
      "sila": 6,
      "dosah": 6,
      "trvani": 0,
      "cena": 3,
      "priznak": "uvolněno"
    },
    "zhoj": {
      "vyklad": "zraň",
      "typ": "POSKOZENI",
      "sila": 10,
      "dosah": 2,
      "trvani": 0,
      "cena": 3.5,
      "priznak": "vysáto"
    },
    "rozbij": {
      "vyklad": "sprav",
      "typ": "UZITEK",
      "sila": 12,
      "dosah": 4,
      "trvani": 0,
      "cena": 4,
      "priznak": "spraveno"
    },
    "zastit": {
      "vyklad": "obnaž",
      "typ": "OSLABENI",
      "sila": 8,
      "dosah": 6,
      "trvani": 5,
      "cena": 3,
      "priznak": "obnaženo"
    },
    "svaz": {
      "vyklad": "rozvaž",
      "typ": "UZITEK",
      "sila": 4,
      "dosah": 8,
      "trvani": 0,
      "cena": 2.5,
      "priznak": "rozvázáno"
    }
  },
  "absenceZivlu": {
    "ohen": {
      "zivel": "Chlad",
      "priznak": "prochladlé"
    },
    "svetlo": {
      "zivel": "Tma",
      "priznak": "zatemněno"
    },
    "zivot": {
      "zivel": "Smrt",
      "priznak": "odumírá"
    },
    "zvuk": {
      "zivel": "Ticho",
      "priznak": "utišeno"
    },
    "vitr": {
      "zivel": "Vakuum",
      "priznak": "dusí se"
    }
  },
  "inverzniRuny": {
    "silne": "slabe",
    "slabe": "silne",
    "tise": "okazale",
    "okazale": "tise"
  }
};
}
