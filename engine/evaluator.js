// Vyhodnocení kouzla (port `spelllang/evaluator.py`, §10–11).
//
// ZATÍM JEN konstanta, kterou čtou ceny (pojistka proti nekonečnému rozbalování
// vnořených jmen, §6.2). Vlastní vyhodnocení (AST → efekt, divoká magie
// Vyusteni/zdivocej — čeká na RNG) přibude sem dalším dílem.

export const MAX_HLOUBKA_ROZBALENI = 16;
