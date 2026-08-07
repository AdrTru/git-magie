// GENEROVÁNO `oracle_sceny.py` z `spelllang/scene.py` — needituj ručně.
// Mechanika příznaků (#39): co stav ruší, dává, kam se šíří, čeho je
// zdrojem, jak dlouho žije; násobky životnosti podle materiálu (§5.1);
// ošetřené zdroje, z nichž jev ven nepřeskočí (§8.2).
// Jsou to AUTORSKÁ DATA k ladění, ne kód — proto se generují, aby jazyk
// (Python) a prohlížeč (JS) nedrželi dvě kopie téhož vyvážení.

export const MECHANIKY_PRIZNAKU = {
  "hoří": {
    "trvani": 4,
    "rusi": [
      "prochladlé",
      "zmrazeno",
      "uhašeno"
    ],
    "siri_se_na": "hořlavé",
    "zdroj": [
      "ohen",
      0.3
    ],
    "poskozuje": 2.0
  },
  "uhašeno": {
    "trvani": 0,
    "rusi": [
      "hoří",
      "taví"
    ]
  },
  "promáčeno": {
    "trvani": 6,
    "rusi": [
      "hoří",
      "taví"
    ],
    "dava": [
      "vodivé"
    ]
  },
  "prochladlé": {
    "trvani": 4,
    "rusi": [
      "hoří",
      "taví"
    ]
  },
  "zmrazeno": {
    "trvani": 3,
    "rusi": [
      "hoří",
      "taví"
    ],
    "dava": [
      "znehybněno"
    ]
  },
  "uvolněno": {
    "trvani": 0,
    "rusi": [
      "zmrazeno",
      "zavaleno",
      "spoutáno",
      "znehybněno"
    ]
  },
  "zavaleno": {
    "trvani": 0,
    "dava": [
      "znehybněno"
    ]
  },
  "spraveno": {
    "trvani": 0,
    "rusi": [
      "rozbito",
      "zničeno"
    ]
  },
  "rozvázáno": {
    "trvani": 0,
    "rusi": [
      "pouto",
      "zamčeno"
    ]
  },
  "zamčeno": {
    "trvani": 0,
    "rusi": [
      "odemčeno"
    ]
  },
  "odemčeno": {
    "trvani": 0,
    "rusi": [
      "zamčeno"
    ]
  },
  "ozářeno": {
    "trvani": 3,
    "rusi": [
      "zatemněno"
    ],
    "zdroj": [
      "svetlo",
      0.3
    ]
  },
  "zatemněno": {
    "trvani": 3,
    "rusi": [
      "ozářeno"
    ]
  },
  "šok": {
    "trvani": 1,
    "retezi_pres": [
      "vodivé",
      "kovové"
    ]
  },
  "řetězí se": {
    "trvani": 1,
    "retezi_pres": [
      "vodivé",
      "kovové",
      "promáčeno"
    ]
  },
  "taví": {
    "trvani": 3,
    "rusi": [
      "zmrazeno"
    ],
    "poskozuje": 3.0,
    "tuhne_na": "zavaleno"
  },
  "otráveno": {
    "trvani": 4,
    "poskozuje": 1.0
  },
  "otevřeno": {
    "trvani": 0,
    "rusi": [
      "zavřeno"
    ]
  },
  "zavřeno": {
    "trvani": 0,
    "rusi": [
      "otevřeno"
    ]
  },
  "odumírá": {
    "rusi": [
      "oživeno"
    ],
    "poskozuje": 1.0
  },
  "oživeno": {
    "trvani": 0,
    "rusi": [
      "odumírá"
    ]
  },
  "praská": {
    "trvani": 1,
    "poskozuje": 3.0
  },
  "horečnaté": {
    "trvani": 4,
    "poskozuje": 1.0
  },
  "žhne poutem": {
    "trvani": 2,
    "retezi_pres": [
      "pouto"
    ],
    "poskozuje": 2.0
  },
  "zabahněno": {
    "trvani": 5,
    "dava": [
      "znehybněno"
    ]
  },
  "posvěceno": {
    "rusi": [
      "odumírá",
      "zmámeno"
    ]
  },
  "obrozeno": {
    "rusi": [
      "otráveno",
      "odumírá"
    ]
  },
  "přikrčeno": {
    "trvani": 0
  },
  "spí": {
    "trvani": 3,
    "dava": [
      "znehybněno"
    ]
  },
  "nadechnuto": {
    "trvani": 0,
    "rusi": [
      "dusí se"
    ]
  },
  "zkamenělé": {
    "trvani": 4,
    "dava": [
      "znehybněno"
    ]
  },
  "otřeseno": {
    "trvani": 1,
    "dava": [
      "znehybněno"
    ]
  },
  "ukotveno": {
    "trvani": 0,
    "rusi": [
      "odmrštěno"
    ]
  },
  "požehnáno": {
    "rusi": [
      "odumírá",
      "zatemněno"
    ]
  },
  "provázáno světlem": {
    "trvani": 2,
    "retezi_pres": [
      "ozářeno"
    ]
  },
  "zjeveno": {
    "trvani": 0,
    "rusi": [
      "odhmotněno"
    ]
  },
  "povzbuzeno": {
    "trvani": 4,
    "rusi": [
      "zmámeno",
      "ohlušeno"
    ]
  },
  "symbióza": {
    "trvani": 3,
    "retezi_pres": [
      "pouto"
    ]
  },
  "omráčeno": {
    "trvani": 2,
    "dava": [
      "znehybněno"
    ]
  },
  "rezonuje": {
    "trvani": 2,
    "retezi_pres": [
      "pouto"
    ]
  },
  "obvod": {
    "trvani": 2,
    "retezi_pres": [
      "pouto",
      "vodivé",
      "kovové"
    ]
  },
  "oslněno": {
    "trvani": 1,
    "rusi": [
      "zatemněno"
    ]
  },
  "zmagnetizováno": {
    "trvani": 2,
    "pritahuje": "kovové"
  },
  "vtaženo": {
    "trvani": 2,
    "dava": [
      "znehybněno"
    ]
  }
};

export const TRVANI_PODLE_TAGU = {
  "hořlavé": {
    "hoří": 2.0,
    "promáčeno": 0.5
  },
  "kamenné": {
    "hoří": 0.25,
    "zmrazeno": 2.0,
    "prochladlé": 2.0,
    "promáčeno": 0.5,
    "taví": 1.5,
    "otřeseno": 1.5
  },
  "kovové": {
    "hoří": 0.25,
    "šok": 0.5,
    "zmrazeno": 2.0,
    "prochladlé": 2.0,
    "promáčeno": 0.5,
    "zmagnetizováno": 2.0
  },
  "křehké": {
    "praská": 2.0,
    "otřeseno": 2.0,
    "rezonuje": 2.0
  },
  "stavba": {
    "hoří": 1.5,
    "otřeseno": 1.5
  }
};

export const ZADRZUJICI_TAGY = {
  "ohniště": [
    "hoří",
    "taví",
    "žhne poutem"
  ],
  "nádoba": [
    "hoří",
    "otráveno",
    "promáčeno",
    "taví",
    "zabahněno"
  ],
  "stíněné": [
    "obvod",
    "zmagnetizováno",
    "řetězí se",
    "šok"
  ],
  "ošetřené": [
    "*"
  ]
};

export const ZADRZ_VSE = "*";
