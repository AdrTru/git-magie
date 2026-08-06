// Spustí VŠECHNY zkoušky enginu — `test/*.test.mjs`.
//
// GLOB, NE VÝČET. Nová zkouška (další portovaný kus enginu) se přidá sama:
// stačí ji pojmenovat `něco.test.mjs`. Výčet souborů v `package.json` nebo v CI
// by zestárl v okamžiku, kdy přibude test, a zeleň by lhala. Každý test je
// samostatný skript, který na neúspěch volá `process.exit(1)`; běhoun je pouští
// po řadě a první pád tím celý běh shodí (fail-fast, což CI stačí).
//
// Spuštění:  node test/vse.mjs   (nebo `npm test`)

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ZDE = dirname(fileURLToPath(import.meta.url));
const soubory = readdirSync(ZDE).filter((f) => f.endsWith(".test.mjs")).sort();

if (soubory.length === 0) {
  console.error("!! test/vse.mjs nenašel jedinou zkoušku (*.test.mjs)");
  process.exit(1);
}

for (const soubor of soubory) {
  await import(join(ZDE, soubor));   // spustí se; při rozdílu volá process.exit(1)
}
