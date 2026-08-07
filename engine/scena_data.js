// GENEROVÁNO `oracle_sceny.py` z `spelllang/scene.py` + `sceny.py`.
// Needívat ručně: spec polí dataclassu Objekt (pořadí, kategorie převodu,
// zda běhové, zda povinné, a serializovaná výchozí hodnota pro vynechání).
// `kat`: skalar | mnozina | ntice | nticeSeznam | slovnikMnozin | obsah | spousti.
export const POLE_OBJEKTU = [
  {
    "jmeno": "id",
    "kat": "skalar",
    "beh": false,
    "povinne": true,
    "vych": null
  },
  {
    "jmeno": "nazev",
    "kat": "skalar",
    "beh": false,
    "povinne": true,
    "vych": null
  },
  {
    "jmeno": "rod",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "tvary",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "tagy",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "stavy",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "docasne",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "trvani_jevu",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "zadrzuje",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "docasne_tagy",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "potlacene_tagy",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "popis",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "zivel",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "kvalita",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": 0.0
  },
  {
    "jmeno": "slozeny_zivel",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "vycerpatelny",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": false
  },
  {
    "jmeno": "zdroj_many",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": false
  },
  {
    "jmeno": "prenosny",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": false
  },
  {
    "jmeno": "otviratelny",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": false
  },
  {
    "jmeno": "slot",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "vybaveno",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": false
  },
  {
    "jmeno": "otisky",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "puvod_kouzla",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "rozhovor",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "bonusy",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "vydrz",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "obsah",
    "kat": "obsah",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "spousti",
    "kat": "spousti",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "podtyp",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "pozice",
    "kat": "ntice",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "tvar",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": "bod"
  },
  {
    "jmeno": "rozmer",
    "kat": "ntice",
    "beh": false,
    "povinne": false,
    "vych": [
      0.0,
      0.0
    ]
  },
  {
    "jmeno": "smer",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": 0.0
  },
  {
    "jmeno": "body",
    "kat": "nticeSeznam",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "pozice_do",
    "kat": "ntice",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "z",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": 0.0
  },
  {
    "jmeno": "z_do",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "vyska",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "zorne_pole",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "vnimane",
    "kat": "mnozina",
    "beh": true,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "pamet_stavu",
    "kat": "slovnikMnozin",
    "beh": true,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "chovani",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "rezim",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "postup_chovani",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": {}
  },
  {
    "jmeno": "cekani",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": 0.0
  },
  {
    "jmeno": "zajem",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "zajem_misto",
    "kat": "ntice",
    "beh": true,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "prekonava",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": 0.0
  },
  {
    "jmeno": "vyska_vstoje",
    "kat": "skalar",
    "beh": true,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "stav_uvnitr",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "povoluje",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": []
  },
  {
    "jmeno": "brani",
    "kat": "mnozina",
    "beh": false,
    "povinne": false,
    "vych": null
  },
  {
    "jmeno": "zanikne_za",
    "kat": "skalar",
    "beh": false,
    "povinne": false,
    "vych": null
  }
];
