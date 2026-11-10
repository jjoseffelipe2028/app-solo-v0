// App Solo v0: CONTAS (funções puras: entra número, sai número). Tela não faz conta.
// Base: Embrapa Cerrados (Circular Técnica 33/2016, Sousa & Lobato 2004,
// Vilela, Sousa e Silva 2002) e doses do agrônomo. Sempre conferir com o agrônomo.
"use strict";

const Solo = {
  /** Calagem: V1 = SB/T×100 · NC (t/ha) = (V2−V1)/100 × T × (100/PRNT), nunca negativo. */
  calagem(sb, t, v2, prnt) {
    const v1 = sb / t * 100;
    const nc = Math.max(0, (v2 - v1) / 100 * t * (100 / prnt));
    return { v1, nc };
  },

  /** Gesso: indicado se, em 20–40 cm, Ca < 0,5 ou sat. Al > 20%. Dose = fator × argila. */
  gesso(argila, fator, temSub, ca, satAl) {
    if (!temSub) {
      return { dose: fator * argila, aviso: "Sem análise de 20–40 cm: dose calculada só pela argila. Peça a análise ao agrônomo." };
    }
    const indicado = ca < 0.5 || satAl > 20;
    return { dose: indicado ? fator * argila : 0, aviso: indicado ? "" : "Ca e alumínio de 20–40 cm estão bons: gesso não indicado." };
  },

  /** Classe de P (Mehlich-1, 0–20 cm): limite superior de cada classe por faixa de argila. */
  classeP(argila, p) {
    const tab = argila <= 15 ? [6, 12, 18, 25, 40]
      : argila <= 35 ? [5, 10, 15, 20, 35]
      : argila <= 60 ? [3, 5, 8, 12, 18]
      : [2, 3, 4, 6, 9];
    const nomes = ["Muito baixa", "Baixa", "Média", "Adequada", "Alta"];
    for (let i = 0; i < tab.length; i++) {
      if (p <= tab[i]) return nomes[i];
    }
    return "Muito alta";
  },

  /** P corretivo (kg P₂O₅/ha): irrigado mira 90%, sequeiro 80%. Válido até 70% de argila. */
  fosforoCorretivo(argila, p, irrigado) {
    const alvo = irrigado ? 32 - 0.4 * argila : 23 - 0.28 * argila;
    return Math.max(0, alvo - p) * 2.43 * Math.exp(0.0483 * argila);
  },

  /** Potássio (CTC > 4): classe e dose de K₂O. */
  potassio(k) {
    if (k <= 25) return { classe: "Baixo", dose: 100 };
    if (k <= 50) return { classe: "Médio", dose: 50 };
    if (k <= 80) return { classe: "Adequado", dose: 0 };
    return { classe: "Alto", dose: 0 };
  },

  classeMicro(valor, baixo, medio) {
    return valor <= baixo ? "Baixo" : valor <= medio ? "Médio" : "Alto";
  },

  /** Conversor: kg do produto = dose do nutriente ÷ (% do produto ÷ 100). */
  produto(doseNutriente, porcento) {
    return doseNutriente / (porcento / 100);
  },
};

const LIMITES_MICRO = { b: [0.20, 0.60], zn: [0.59, 1.30], cu: [0.20, 0.80], mn: [1.20, 5.00] };

const PRODUTOS = {
  superfosfato: { nome: "Superfosfato simples", pct: 18, nutr: "P₂O₅" },
  farinha: { nome: "Farinha de ossos", pct: 15, nutr: "P₂O₅" },
  ureia: { nome: "Ureia", pct: 45, nutr: "N" },
  esterco: { nome: "Esterco bovino", pct: 1.5, nutr: "N" },
  cama: { nome: "Cama de frango", pct: 3.2, nutr: "N" },
  acidoBorico: { nome: "Ácido bórico", pct: 17, nutr: "B" },
  sulfatoZinco: { nome: "Sulfato de zinco", pct: 23, nutr: "Zn" },
  kcl: { nome: "Cloreto de potássio", pct: 60, nutr: "K₂O" },
};

// Doses do agrônomo (milho)
const DOSES = { nPlantio: 30, nCobertura: 100, boro: 2, zinco: 6 };

/** Junta tudo a partir dos números do laudo. */
function calcular(v) {
  const micros = {};
  for (const m of Object.keys(LIMITES_MICRO)) {
    micros[m] = Solo.classeMicro(v[m], LIMITES_MICRO[m][0], LIMITES_MICRO[m][1]);
  }
  return {
    cal: Solo.calagem(v.sb, v.t, v.v2, v.prnt),
    ges: Solo.gesso(v.argila, v.fator, v.temSub, v.caSub, v.alSub),
    classeP: Solo.classeP(v.argila, v.p),
    pCorr: Solo.fosforoCorretivo(v.argila, v.p, v.irrigado),
    k: Solo.potassio(v.k),
    micros,
    pPlantio: v.pplantio,
  };
}

// Laudo de exemplo (milho irrigado): tem que bater com a planilha
const EXEMPLO = {
  sb: 10.61, t: 15.21, argila: 32.5, v2: 50, prnt: 80, p: 6.2, k: 740.3, pplantio: 80,
  b: 0.04, zn: 0.4, cu: 1.5, mn: 315.6, irrigado: true, temSub: false, fator: 75, caSub: NaN, alSub: NaN,
};

// No navegador vira global; no Node (testes) vira módulo
if (typeof module !== "undefined") {
  module.exports = { Solo, LIMITES_MICRO, PRODUTOS, DOSES, calcular, EXEMPLO };
}
