# Zkušebna — geometrie prostoru z enginu vsc-magie

Devět zkušebních místností, ve kterých se dá **chodit** a zkoušet, co brání
výhledu a co pohybu. Otevři si je v prohlížeči:

**https://adrtru.github.io/git-magie/**

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
