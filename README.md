# Zkušebny z enginu vsc-magie

Dvě pískoviště k otevření v prohlížeči — obojí bez příběhu, jen mechanika:

| | |
| --- | --- |
| **[Geometrie prostoru](https://adrtru.github.io/git-magie/)** | devět místností, ve kterých se dá chodit a zkoušet, co brání výhledu a co pohybu |
| **[Rozvržení panelů](https://adrtru.github.io/git-magie/rozvrzeni.html)** | jak se ovládací panely dílny skládají na různě široké obrazovky |

## Přepis do JS enginu (probíhá)

Cíl: **celý engine kouzel poběží v prohlížeči**, ne jako zapékané náhledy.
Dnes se scéna počítá v Pythonu (`vsc-magie`) a sem se vozí jen hotové obrázky —
na telefonu se tak nedá nic interaktivně rozběhnout. JS engine to řeší: jeden
statický web, hratelný na mobilu, blízko i „spustitelnému" balení.

Aby z toho nevznikla druhá, rozcházející se pravda, jede přepis **proti
oracle**: pro každý portovaný kus vydá Python engine očekávané hodnoty
(`oracle_geometrie.py` → `test/fixtury_geometrie.json`, `oracle_jazyk.py` →
`test/fixtury_jazyk.json`) a `npm test` (`test/vse.mjs` pustí všechny zkoušky)
ověří, že JS počítá totéž. Až JS pokryje celý engine, Python jde do důchodu
a JS je jediná pravda.

Postupuje se po částech, každá ověřená v CI:

1. **Kostra + geometrie** — `engine/geometrie.js`: tvary, vzdálenost, dvě
   nezávislé osy clonění (výhled × pohyb), výška (2.5D), zorné pole a **zorný
   klín** (věnec paprsků s cloněním). ✅
2. **Zóna pohybu** — `engine/pohyb.js`: kam bytost dojde, než se scéna pohne.
   Viditelnostní graf **po patrech** (rohy překážek + žebříky/pěšiny jako
   přechody), Dijkstra, mřížka dosažitelných bodů. **UMÍ PATRA** — kdo vyleze
   po žebříku, má zónu i nahoře. ✅
3. **Jazyk kouzel + skloňování** — pipeline hotov (viz níže).
4. **Běh scény, manipulace, chování, uložení; konec serveru** — *tady jsme dál*.
   Sem spadne i zbytek jazyka (učení, jména, vyústění), protože visí na běhu
   a kontextu scény.
   - **Scéna jako data** (`engine/scena.js`, port `sceny.py`; spec polí
     `engine/scena_data.js` GENEROVANÝ z `scene.py`) ✅ — definice místnosti tam
     a zpátky (JSON): `zeSlovniku`/`doSlovniku` nad `Objekt`/`Scena`/`Spoust`.
     Objekt je PROSTÝ JS objekt se všemi poli — přesně to, co už čte
     `geometrie.js` (jedna pravda, ne druhá kopie); množiny drží jako `Set`.
     Formát je DEFINICE, ne uložená hra: píše jen autorská pole lišící se od
     výchozí, běhový stav jen s `sBehem` (uložená hra). Neznámý klíč je chyba.
     Ověřeno ROUND-TRIPEM: **10 reálných scén** (`sceny/*.json` jsou fixtury) +
     hrany (běhový stav, `brani` None/prázdná/plná, obsah, spouště, ignorovaná
     poznámka) + 6 chybových větví; navíc **hlídač** srovná generovaný spec
     53 polí s Python dataclassem. (`Udalost` — běhová událost pro spouště —
     přijde s chováním, díl 3e.)
   - **Čerpání a živlové okolí** (`engine/cerpani.js`, port mechanické části
     `scene.py`; tabulky `engine/mechaniky_data.js` GENEROVANÉ z Pythonu) ✅ —
     dvě otázky, které scéna klade jazyku. CO JDE ČERPAT: čím objekt zrovna je
     jako zdroj (`zdrojObjektu` — statický i odvozený ze stavu: hořící dveře
     jsou slabý zdroj Ohně) a na které základní runy se to rozpadne
     (`cerpatelne`, `slozkyZivlu` — Jed = Voda + ne Život, recept rekurzivně).
     JAK DLOUHO TO NA ČEM VYDRŽÍ: `trvaniStavu` (troje hodiny — jev, kouzlo,
     objekt), `nasobekTrvani` (materiál a autorský přepis kusu) a
     `zadrzujeSireni` (§8.2: pec hoří, ale chalupu nezapálí). Odtud bere
     validátor `dostupneZvenci` a ceny slevu za živel z okolí — obojí bylo
     portované z kroku 3, ale bez scény NEOVĚŘENÉ. Sem patří i **odvozené látky**
     v knize (`zaznamenejLatku`/`slozkyLatky` ve `spellbook.js`,
     `receptPodstaty` v `lexikon.js`): látka objevená u zdroje se zavede jako
     jméno-podstata, viděná ≠ naučená, a neznámá vnitřní složka naučení brání.
     **44 příznaků + 51 rozkladů + 1035 jevů na 23 objektech** proti oracle.
     Jen ČTENÍ: zápis stavu, šíření a tik scény jsou stavové a jdou s chováním (3e).
     podstatná jména ze slovníku (`slova.js`, GENEROVANÝ z Pythonu, ne opsaný),
     přídavná jména pravidlem (tvrdá/měkká/přivlastňovací × rod × pád),
     opisovaný ocas fráze, vokalizace předložek (k → ke), zájmena. **1317/1317
     tvarů** proti oracle.
   - **Lexer runové věty** (`engine/parser.js` → `lexuj`, port z `parser.py`) ✅ —
     text kouzla → tokeny, párování slov na runy bez ohledu na velikost a
     diakritiku (`Zazehni Ohen` = `Zažehni Oheň`), závorky/`:` jako tokeny,
     neznámé slovo → šipka na chybu. Slovník run a interakční tabulky jsou
     v `engine/lexikon_data.js` (GENEROVANÝ z Pythonu), funkce `neguj`/`zuz`
     v `engine/lexikon.js`. **86 případů + 46 run** proti oracle.
   - **Parser runové věty** (`engine/parser.js` → `parsuj`, `engine/ast_nodes.js`) ✅ —
     tokeny → AST (všechny platné výklady, §9). Fráze s pevným slovosledem,
     výchozí `Zažehni`, bloky `( )` s doplněním slotů, spojky `a`/`pak`,
     `pokud` s negací predikátu, `skrze` (i řetězené), volání jména, slučování
     `ne` a zúžení cíle `:`. Sloučená slovesa → víc výkladů. **40 případů**
     (výklady i chyby) proti oracle.
   - **Validátor** (`engine/validator.js`, port `validator.py`; `engine/progression.js`) ✅ —
     kontrola AST proti ČARODĚJI: zná runu? je odemčená fáze gramatiky pro
     daný rys (živel/modifikátor/forma/spojky/podmínka…)? Runa čerpaná z okolního
     zdroje projde i bez znalosti (§8.1). NeovladaneSlovo / NepovolenaGramatika.
     **25 případů** (fázové brány i znalosti) proti oracle. (`progression.js` je
     zatím jen část pro validátor — fáze a `zna`; učení přijde později.)
   - **Ceny** (`engine/costs.js`, port `costs.py`; `runyV` v `ast_nodes.js`) ✅ —
     z AST spočítá manu (součet cen slov × modifikátory × přirážka za složky),
     obtížnost (počet run + hloubka) a šanci na seslání (min-mastery přímo
     sesílaných run − korekce). Mastery dává slevu; živel čerpaný z okolí je na
     manu zdarma a podepře šanci (§8.1). **19 případů** proti oracle.
   - **Vyhodnocení** (`engine/evaluator.js`, port `evaluator.py`; `engine/effects.js`) ✅ —
     z AST na SpellEffect: sloveso dá typ/sílu/dosah/trvání, živly se skládají
     (stejný → intenzita, různé → interakce z tabulky, neznámá dvojice → surge),
     cíle stackují, formy se skládají (geometrie z dat), modifikátory transformují
     parametry; spojení `a`/`pak` dělá obálku se složkami, podmínka a `skrze` se
     zapíšou pro engine. **37 případů** proti oracle.
   - **Celý pipeline jazyka běží v JS**: `Zažehni Oheň Voda Nepřítel Výbuch silně`
     → tokeny → AST → validace(fáze/znalosti) → cena(mana/šance) → efekt
     (Pára ~Výbuch, síla 24). Ověřeno bod po bodu proti Pythonu.
   - **Pojmenování kouzel** (`engine/spellbook.js`, port `spellbook.py`; odvozené
     látky přibyly s čerpáním, viz níže) ✅ —
     z hotového kouzla udělá nové slovo (§6): zvaliduje definici, odvodí slovní
     druh z kořene (látkový efekt → podstata, jinak sloveso), zaregistruje runu
     JMENO do lexikonu a uloží záznam s (volitelně **ukotveným**) výkladem
     u nejednoznačného textu (§9.1). Volání jménem se rozbaluje zpět na definici —
     tím se konečně ověřily cesty `Volani` v parseru, cenách i vyhodnocení, které
     byly portované, ale bez knihy NEOVĚŘENÉ. Pojistky: fázová brána, práh mastery
     pro zabalení, kontrola cyklu při redefinici, strop hloubky rozbalení (ceny na
     něj narazí o úroveň dřív než vyhodnocení — fixtura pinuje oba). **15 scénářů,
     36 kroků** proti oracle (z toho 5 scénářů o látkách).
   - **Sdílená náhoda a divoká magie** (`engine/nahoda.js`, port
     `spelllang/nahoda.py`; vyústění a `zdivocej` v `engine/errors.js`) ✅ —
     JEDEN GENERÁTOR PRO OBA JAZYKY. Pythonův `random` (Mersenne Twister) se
     v JS zopakovat nedá a `Math.random()` se nedá ani nasadit; jenže celý
     přepis stojí na tom, že se JS dá porovnat s Pythonem. Oba jazyky proto
     ustoupily a používají **mulberry32** — desetiřádkový 32bitový generátor,
     který v obou počítá po bitech totéž (JS přes `Math.imul`, Python přes
     maskování). Semínko drží hráč, takže hod jde zopakovat i uložit.
     Na něm stojí škála vyústění (čisté / **surge** / fatální selhání, §11),
     `zdivocej` (jiný živel — a živel se i PROJEVÍ, ne jen přepíše nálepka —
     odraz na sesilatele, nebo ujetá síla) a objev podtypu zabitím (§3.7).
     Ověřeno **3000 hodů BIT V BIT** (bez tolerance) na šesti semínkách,
     7 škál vyústění po 60 hodech, 20 zdivočení, 4 objevy. Fixtury pinují i
     STAV generátoru po každé sérii: náhoda je jedna páska, ne studna
     nezávislých čísel, takže přeskočený nebo přebytečný hod se musí projevit
     hned, ne o kus dál jako „divná čísla někde jinde".
   - Zbývá k jazyku (přijde se scénou, krok 4, protože potřebuje běh/kontext):
     smyčka učení (zbytek `progression.py`).
5. Vypnout pečení/publikaci; JS je primár, Python zmrazit jako spec.

Geometrická vrstva je ověřená bod po bodu proti Pythonu — každou hodnotu
(vzdálenost, výhled, průchod, zorný klín, zóna pohybu) na každém scénáři
fixtury, včetně víceúrovňové „plošina a žebřík" a páru „iluze zničení"
vs. „zeď zničená" (zdánlivý stav klame vnímání, ne geometrii). Přesný počet
říká `npm test`, ne tenhle odstavec — vypsané číslo by zestárlo, jakmile
přibude scénář, a nikdo by si toho nevšiml. Geometrie je čistá
(`geometrie.js`), pohyb staví na jejích primitivech (`pohyb.js`).

**Vidět naživo** (na mobilu, přes Pages) — vše importuje skutečné moduly
enginu a staví JS vedle Python oracle:
[geometrie](https://adrtru.github.io/git-magie/engine-demo.html) ·
[skloňování](https://adrtru.github.io/git-magie/jazyk-demo.html) (napiš jméno,
vyber pád; dole celý slovník) ·
[runová věta](https://adrtru.github.io/git-magie/kouzlo-demo.html) (napiš
kouzlo, tokeny se obarví podle slovního druhu; dole **pojmenuj kouzlo a volej ho
jménem** — volání se v poli nahoře rozbalí zpět na definici — a **hoď na
vyústění**: zadej semínko a šanci, série 20 hodů se ze stejného semínka odehraje
pokaždé stejně) ·
[scéna a živlové okolí](https://adrtru.github.io/git-magie/scena-demo.html)
(vyber místnost; engine ji načte z JSONu, zapíše zpět proti Pythonu a rovnou
nakreslí z týchž dat — a dole ukáže, co z čeho jde čerpat a jak dlouho na čem
který jev vydrží).

Zapékané pískoviště níž zatím běží beze změny vedle nového enginu.

## Geometrie prostoru

Vyber v horní liště místnost, klepni na postavu a táhni s ní. Zelená plocha pod
ní je **zóna pohybu** — kam odtud dojde, než se scéna posune o krok. Přepočítá
se, jakmile prst pustíš; jantarová plocha je patro, na které se dá vylézt
žebříkem nebo pěšinou, a stojí to kroky navíc.

## Co která místnost zkouší

| místnost | oč jde |
| --- | --- |
| zeď mezi | plná překážka: neuvidíš, neprojdeš |
| mříž | vidíš skrz, neprojdeš |
| závěs | projdeš, neuvidíš |
| hradba a výška | stráž nahoře vidí přes zídku, kdo je dole, ne |
| obrubník a krok | co je nízké, překročíš; vysokou zeď ne |
| rozbitá zeď | troska nepřekáží ničemu |
| tvary a strop | kruh, natočený obdélník, lustr u stropu |
| přepis brání | autor smí překážkovost přepsat proti tagům |
| lomená a polygon | kóta končí na obrysu, ne v kotvě |

Výhled a pohyb jsou **dvě nezávislé osy** — proto mříž a závěs, každá jinak.
Svislá osa je třetí: co končí pod okem, nezacloní, a co je nižší než půl kroku,
se překročí.

## Odkud to je

Odvozenina z enginu [vsc-magie](https://github.com/AdrTru/vsc-magie) (soukromý):
textová adventura s runovým jazykem kouzel. Zdejší soubor je **jen geometrické
pískoviště** — nejsou v něm scény ani příběh, protože scény s sebou nesou
řešení.

Geometrie je přepsaná z `spelllang/prostor.py` do JS a **hlídá se proti
Pythonu**: tentýž výpočet běží v enginu a jeho odpovědi jsou v souboru zapečené
jako měřítko. Odznak vpravo nahoře je porovnává při každém načtení — když ukazuje
`= python`, obě implementace se shodují bod po bodu.

`index.html` je jeden soběstačný soubor. Nic se nestahuje, nic se neodesílá,
funguje i bez sítě.

## Rozvržení panelů

`rozvrzeni.html` zkouší druhou vrstvu: **kde co v dílně leží**. Panel se
deklaruje (co je zač a kolik sloupců zabere v kterém rozvržení), obsah se do
něj věší až potom — proto tam panely žádný herní obsah nemají a hlásí, že ho
čekají. Přepínači nahoře se rozvržení volí ručně, `Podle okna` se vrátí
k automatice; dole je vypsané spočítané rozmístění.

Na rozdíl od geometrie to **není** soběstačný soubor: engine si stránka načte
vedle sebe jako `panely.js`. Obojí je tu tak, jak leží v enginu, aby
neexistovala druhá slepená kopie, která by se s ním rozešla.

## Odkud se to sem bere

Soubory vyrábí CI v enginu a tenhle repozitář si je stahuje z artefaktu; co jde
ven, rozhoduje `publikace.py` tam, ne seznam tady. Publikuje se celý artefakt,
takže další stránka nevyžaduje změnu na téhle straně.
