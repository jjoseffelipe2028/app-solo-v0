// Testes das contas: rodar com  node --test testes/
// O laudo de exemplo tem que bater com a planilha (tolerância ±0,1).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Solo, DOSES, calcular, EXEMPLO } = require("../calculos.js");

const perto = (app, esperado, nome) =>
  assert.ok(Math.abs(app - esperado) <= 0.1 + 1e-9, `${nome}: app ${app} ≠ planilha ${esperado}`);

test("laudo de exemplo bate com a planilha (números)", () => {
  const r = calcular(EXEMPLO);
  const casos = [
    ["V1 (%)", 69.76, r.cal.v1],
    ["Calcário (t/ha)", 0, r.cal.nc],
    ["Gesso (kg/ha)", 2437.5, r.ges.dose],
    ["P corretivo", 149.5, r.pCorr],
    ["Superfosfato corretivo", 830.4, Solo.produto(r.pCorr, 18)],
    ["Farinha de ossos corretivo", 996.5, Solo.produto(r.pCorr, 15)],
    ["Potássio (kg K₂O)", 0, r.k.dose],
    ["Ácido bórico", 11.76, Solo.produto(DOSES.boro, 17)],
    ["Sulfato de zinco", 26.09, Solo.produto(DOSES.zinco, 23)],
    ["Ureia plantio", 66.7, Solo.produto(DOSES.nPlantio, 45)],
    ["Esterco plantio", 2000, Solo.produto(DOSES.nPlantio, 1.5)],
    ["Superfosfato plantio", 444.4, Solo.produto(80, 18)],
    ["Farinha plantio", 533.3, Solo.produto(80, 15)],
    ["Ureia cobertura", 222.2, Solo.produto(DOSES.nCobertura, 45)],
    ["Cama de frango cobertura", 3125, Solo.produto(DOSES.nCobertura, 3.2)],
  ];
  for (const [nome, esperado, app] of casos) perto(app, esperado, nome);
});

test("laudo de exemplo bate com a planilha (classes)", () => {
  const r = calcular(EXEMPLO);
  assert.equal(r.classeP, "Baixa");
  assert.equal(r.k.classe, "Alto");
  assert.deepEqual(Object.values(r.micros), ["Baixo", "Baixo", "Alto", "Alto"]);
  assert.match(r.ges.aviso, /Sem análise de 20–40 cm/);
});

test("calcário nunca dá negativo e aparece quando V% está baixo", () => {
  assert.equal(Solo.calagem(10.61, 15.21, 50, 80).nc, 0);
  // V1 = 3/10×100 = 30% → (50−30)/100 × 10 × (100/80) = 2,5 t/ha
  perto(Solo.calagem(3, 10, 50, 80).nc, 2.5, "calcário V1 30%");
});

test("gesso: com análise de 20–40 cm, só indica se Ca baixo ou Al alto", () => {
  assert.equal(Solo.gesso(30, 50, true, 0.8, 10).dose, 0);
  assert.equal(Solo.gesso(30, 50, true, 0.4, 10).dose, 1500);
  assert.equal(Solo.gesso(30, 75, true, 0.8, 25).dose, 2250);
});

test("fósforo: classes nas bordas e dose zero quando já está bom", () => {
  assert.equal(Solo.classeP(32.5, 5), "Muito baixa");
  assert.equal(Solo.classeP(32.5, 5.1), "Baixa");
  assert.equal(Solo.classeP(10, 41), "Muito alta");
  assert.equal(Solo.classeP(70, 2), "Muito baixa");
  assert.equal(Solo.fosforoCorretivo(32.5, 40, true), 0);
  assert.ok(Solo.fosforoCorretivo(32.5, 6.2, false) < Solo.fosforoCorretivo(32.5, 6.2, true), "sequeiro mira menos que irrigado");
});

test("potássio e micronutrientes: limites de classe", () => {
  assert.deepEqual(Solo.potassio(25), { classe: "Baixo", dose: 100 });
  assert.deepEqual(Solo.potassio(26), { classe: "Médio", dose: 50 });
  assert.deepEqual(Solo.potassio(80), { classe: "Adequado", dose: 0 });
  assert.equal(Solo.classeMicro(0.20, 0.20, 0.60), "Baixo");
  assert.equal(Solo.classeMicro(0.21, 0.20, 0.60), "Médio");
  assert.equal(Solo.classeMicro(0.61, 0.20, 0.60), "Alto");
});
