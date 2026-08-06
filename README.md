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
3. **Jazyk kouzel + skloňování** — *tady jsme*.
   - **Skloňování hlášek** (`engine/cestina.js`, port `cestina.py`) ✅ —
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
   - Zbývá: validátor, ceny, vyhodnocení.
4. Běh scény, manipulace, chování, uložení; konec serveru.
5. Vypnout pečení/publikaci; JS je primár, Python zmrazit jako spec.

Geometrická vrstva je ověřená bod po bodu proti Pythonu: **627/627 hodnot** na
šesti zkouškách (vč. víceúrovňové „plošina a žebřík"). Geometrie je čistá
(`geometrie.js`), pohyb staví na jejích primitivech (`pohyb.js`).

**Vidět naživo** (na mobilu, přes Pages) — vše importuje skutečné moduly
enginu a staví JS vedle Python oracle:
[geometrie](https://adrtru.github.io/git-magie/engine-demo.html) ·
[skloňování](https://adrtru.github.io/git-magie/jazyk-demo.html) (napiš jméno,
vyber pád; dole celý slovník) ·
[runová věta](https://adrtru.github.io/git-magie/kouzlo-demo.html) (napiš
kouzlo, tokeny se obarví podle slovního druhu).

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
