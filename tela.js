// App Solo v0: TELA. Só lê os campos, chama as contas (calculos.js) e mostra.
// Texto na tela só com textContent (nada de innerHTML).
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const CAMPOS = ["sb", "t", "argila", "v2", "prnt", "p", "k", "pplantio", "b", "zn", "cu", "mn", "ca-sub", "al-sub"];
  const GUARDA = "app-solo-ultimo-laudo"; // só neste aparelho
  const estado = { irrigado: true, organico: false };

  // ---------- Ajudantes ----------
  const num = (v) => { const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
  const fmt = (n, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const kg = (n) => (n >= 100 ? fmt(Math.round(n), 0) : fmt(n, 1));
  const classeCss = (c) => (/baix/i.test(c) ? "baixa" : /^m[eé]di/i.test(c) ? "media" : "boa");

  /** Cria um elemento com classe e texto (sempre textContent). */
  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  // ---------- Ler o laudo ----------
  function lerLaudo() {
    const v = {};
    for (const id of CAMPOS) v[id] = num($(id).value);
    return {
      sb: v.sb, t: v.t, argila: v.argila, v2: v.v2, prnt: v.prnt, p: v.p, k: v.k, pplantio: v.pplantio,
      b: v.b, zn: v.zn, cu: v.cu, mn: v.mn, caSub: v["ca-sub"], alSub: v["al-sub"],
      irrigado: estado.irrigado, temSub: $("tem-sub").checked, fator: num($("fator").value),
    };
  }

  function camposValidos() {
    let ok = true;
    for (const id of CAMPOS) {
      const campo = $(id);
      if (campo.closest("[hidden]")) { campo.classList.remove("invalido"); continue; }
      const bom = campo.value.trim() !== "" && Number.isFinite(num(campo.value)) && num(campo.value) >= 0;
      campo.classList.toggle("invalido", !bom);
      if (!bom) ok = false;
    }
    if (num($("t").value) === 0 || num($("prnt").value) === 0) ok = false;
    return ok;
  }

  // ---------- Montar a recomendação ----------
  function itens(r, organico) {
    const P = organico ? PRODUTOS.farinha : PRODUTOS.superfosfato;
    const prod = (dose, p) => ({ nome: p.nome, kg: Solo.produto(dose, p.pct), pct: p.pct });
    const lista = [];
    lista.push({ nome: "Calcário", dose: r.cal.nc * 1000, unidade: "kg/ha",
      detalhe: `V% atual ${fmt(r.cal.v1, 1)}%. ${r.cal.nc === 0 ? "Já está acima do desejado: não precisa." : "Aplicar antes do plantio."}`, produtos: [] });
    lista.push({ nome: "Gesso agrícola", dose: r.ges.dose, unidade: "kg/ha", detalhe: "Leva cálcio para baixo e melhora a raiz.", alerta: r.ges.aviso, produtos: [] });
    lista.push({ nome: "Fósforo corretivo", classe: r.classeP, dose: r.pCorr, unidade: "kg P₂O₅/ha",
      detalhe: r.pCorr > 100 ? "Acima de 100: a lanço e incorporado. Pode dividir em até 5 safras." : r.pCorr > 0 ? "Até 100: no sulco." : "Fósforo já está bom.",
      produtos: r.pCorr > 0 ? [prod(r.pCorr, P)] : [] });
    lista.push({ nome: "Fósforo no plantio", dose: r.pPlantio, unidade: "kg P₂O₅/ha",
      detalhe: estado.irrigado ? "Irrigado: 80 a 120 (agrônomo)." : "Sequeiro: 60 a 100 (agrônomo).", produtos: r.pPlantio > 0 ? [prod(r.pPlantio, P)] : [] });
    lista.push({ nome: "Potássio", classe: r.k.classe, dose: r.k.dose, unidade: "kg K₂O/ha",
      detalhe: r.k.dose ? "Aplicar no plantio ou a lanço." : "Potássio já está bom.", produtos: r.k.dose ? [prod(r.k.dose, PRODUTOS.kcl)] : [] });
    const bBaixo = r.micros.b === "Baixo", znBaixo = r.micros.zn === "Baixo";
    lista.push({ nome: "Boro", classe: r.micros.b, dose: bBaixo ? DOSES.boro : 0, unidade: "kg B/ha",
      detalhe: "Dose do agrônomo (fonte ainda a confirmar).", produtos: bBaixo ? [prod(DOSES.boro, PRODUTOS.acidoBorico)] : [] });
    lista.push({ nome: "Zinco", classe: r.micros.zn, dose: znBaixo ? DOSES.zinco : 0, unidade: "kg Zn/ha",
      detalhe: "Dose do agrônomo.", produtos: znBaixo ? [prod(DOSES.zinco, PRODUTOS.sulfatoZinco)] : [] });
    lista.push({ nome: "Cobre e manganês", classe: `Cu ${r.micros.cu} · Mn ${r.micros.mn}`, dose: 0, unidade: "kg/ha", detalhe: "Só aplica se estiver baixo.", produtos: [] });
    lista.push({ nome: "Nitrogênio no plantio", dose: DOSES.nPlantio, unidade: "kg N/ha", detalhe: "Junto com a semente.",
      produtos: [prod(DOSES.nPlantio, organico ? PRODUTOS.esterco : PRODUTOS.ureia)] });
    lista.push({ nome: "Nitrogênio em cobertura", dose: DOSES.nCobertura, unidade: "kg N/ha", detalhe: "Com 7 a 8 folhas.",
      produtos: [prod(DOSES.nCobertura, organico ? PRODUTOS.cama : PRODUTOS.ureia)] });
    if (organico) {
      for (const i of lista) {
        if (/Boro|Zinco|Potássio/.test(i.nome) && i.produtos.length) i.alerta = "Sem opção orgânica cadastrada ainda: mostrando o adubo mineral.";
      }
    }
    return lista;
  }

  function cartao(i) {
    const card = el("article", "resultado" + (i.dose === 0 ? " zero" : ""));
    const nome = el("div", "nome", i.nome);
    if (i.classe) nome.append(el("span", "classe " + classeCss(i.classe), i.classe));
    const dose = el("div", "dose");
    dose.append(el("b", "", i.dose === 0 ? "0" : kg(i.dose)), el("small", "", i.unidade));
    card.append(nome, dose, el("div", "detalhe", i.detalhe));
    if (i.alerta) card.append(el("div", "alerta", "⚠️ " + i.alerta));
    if (i.produtos.length) {
      const caixa = el("div", "produtos");
      for (const p of i.produtos) {
        const linha = el("div", "produto");
        const rotulo = el("span", "", p.nome + " ");
        rotulo.append(el("small", "", `(${fmt(p.pct, p.pct % 1 ? 1 : 0)}%)`));
        linha.append(rotulo, el("b", "", kg(p.kg) + " kg/ha"));
        caixa.append(linha);
      }
      card.append(caixa);
    }
    return card;
  }

  function linhaTabela(corpo, celulas) {
    const tr = corpo.insertRow();
    for (const [texto, classe] of celulas) {
      const td = tr.insertCell();
      td.textContent = texto;
      if (classe) td.className = classe;
    }
  }

  function render() {
    const lista = $("lista-rec"), corpo = $("tab-rel").tBodies[0];
    lista.replaceChildren();
    corpo.replaceChildren();
    if (!camposValidos()) {
      const aviso = el("div", "bloco");
      aviso.append(el("p", "sub", "Preencha todos os números do laudo (campos em vermelho) para ver a recomendação."));
      lista.append(aviso);
      $("rec-resumo").textContent = "";
      $("texto-copia").value = "";
      return;
    }
    const v = lerLaudo(), r = calcular(v), its = itens(r, estado.organico);
    $("rec-resumo").textContent = `Milho ${v.irrigado ? "irrigado" : "sequeiro"} · argila ${fmt(v.argila, 1)}% · ${estado.organico ? "adubos orgânicos" : "adubos convencionais"}`;
    for (const i of its) lista.append(cartao(i));

    const linhas = [];
    for (const i of its) {
      if (i.dose === 0) continue;
      if (i.produtos.length) for (const p of i.produtos) linhas.push([i.nome, p.nome, p.kg]);
      else linhas.push([i.nome, i.nome === "Calcário" ? `Calcário PRNT ${fmt(v.prnt, 0)}%` : "Gesso agrícola", i.dose]);
    }
    for (const [a, p, q] of linhas) linhaTabela(corpo, [[a], [p], [kg(q), "num"]]);
    $("texto-copia").value = `🌱 App Solo — milho ${v.irrigado ? "irrigado" : "sequeiro"} (${estado.organico ? "orgânico" : "convencional"})\n`
      + linhas.map(([a, p, q]) => `• ${a}: ${p} ${kg(q)} kg/ha`).join("\n") + "\nBase: Embrapa Cerrados. Confira com o agrônomo.";
    guardar();
  }

  // ---------- Conferência com a planilha (laudo de exemplo) ----------
  function conferencia() {
    const r = calcular(EXEMPLO);
    const casos = [
      ["V1 (%)", 69.76, r.cal.v1], ["Calcário (t/ha)", 0, r.cal.nc], ["Gesso (kg/ha)", 2437.5, r.ges.dose],
      ["P corretivo (kg P₂O₅)", 149.5, r.pCorr], ["Superfosfato corretivo", 830.4, Solo.produto(r.pCorr, 18)],
      ["Farinha de ossos corretivo", 996.5, Solo.produto(r.pCorr, 15)], ["Potássio (kg K₂O)", 0, r.k.dose],
      ["Ácido bórico", 11.76, Solo.produto(DOSES.boro, 17)], ["Sulfato de zinco", 26.09, Solo.produto(DOSES.zinco, 23)],
      ["Ureia plantio", 66.7, Solo.produto(30, 45)], ["Esterco plantio", 2000, Solo.produto(30, 1.5)],
      ["Superfosfato plantio", 444.4, Solo.produto(80, 18)], ["Farinha plantio", 533.3, Solo.produto(80, 15)],
      ["Ureia cobertura", 222.2, Solo.produto(100, 45)], ["Cama de frango cobertura", 3125, Solo.produto(100, 3.2)],
    ];
    const textos = [["Classe P", "Baixa", r.classeP], ["Classe K", "Alto", r.k.classe],
      ["B / Zn / Cu / Mn", "Baixo / Baixo / Alto / Alto", Object.values(r.micros).join(" / ")]];
    const corpo = $("tab-conf").tBodies[0];
    corpo.replaceChildren();
    let ok = 0, total = 0;
    for (const [nome, esp, app] of casos) {
      total++;
      const bate = Math.abs(esp - app) <= 0.1 + 1e-9;
      if (bate) ok++;
      linhaTabela(corpo, [[nome], [fmt(esp, 2), "num"], [fmt(app, 2), "num"], [bate ? "✓" : "✗", bate ? "ok-txt" : "erro-txt"]]);
    }
    for (const [nome, esp, app] of textos) {
      total++;
      const bate = esp === app;
      if (bate) ok++;
      linhaTabela(corpo, [[nome], [esp, "num"], [app, "num"], [bate ? "✓" : "✗", bate ? "ok-txt" : "erro-txt"]]);
    }
    const titulo = $("conf-titulo");
    titulo.replaceChildren("Conferência com a planilha: ", el("span", ok === total ? "ok-txt" : "erro-txt", `${ok} de ${total} batem`));
    return { ok, total };
  }

  // ---------- Guardar o último laudo (só neste aparelho) ----------
  function guardar() {
    try {
      const dados = { irrigado: estado.irrigado, temSub: $("tem-sub").checked, fator: $("fator").value };
      for (const id of CAMPOS) dados[id] = $(id).value;
      localStorage.setItem(GUARDA, JSON.stringify(dados));
    } catch { /* sem armazenamento: o app continua funcionando */ }
  }
  function lerGuardado() {
    try {
      const d = JSON.parse(localStorage.getItem(GUARDA) || "null");
      return d && typeof d === "object" ? d : null;
    } catch { return null; }
  }

  // ---------- Ações da tela ----------
  const paraTexto = (n) => (typeof n === "number" && Number.isFinite(n) ? String(n).replace(".", ",") : (typeof n === "string" ? n.slice(0, 20) : ""));
  function preencher(dados) {
    for (const id of CAMPOS) {
      const chave = id === "ca-sub" ? "caSub" : id === "al-sub" ? "alSub" : id;
      $(id).value = paraTexto(dados[id] ?? dados[chave]);
    }
    $("tem-sub").checked = !!dados.temSub;
    $("campos-sub").hidden = !dados.temSub;
    $("fator").value = String(dados.fator) === "50" ? "50" : "75";
    definirSistema(dados.irrigado !== false);
  }
  function definirSistema(irrigado) {
    estado.irrigado = irrigado;
    $("sis-irrigado").setAttribute("aria-pressed", String(irrigado));
    $("sis-sequeiro").setAttribute("aria-pressed", String(!irrigado));
    $("pplantio-faixa").textContent = irrigado ? "kg P₂O₅/ha · 80 a 120" : "kg P₂O₅/ha · 60 a 100";
    render();
  }
  function definirTipo(org) {
    estado.organico = org;
    $("tipo-conv").setAttribute("aria-pressed", String(!org));
    $("tipo-org").setAttribute("aria-pressed", String(org));
    render();
  }
  function abrir(painelId) {
    document.querySelectorAll("section.painel").forEach((s) => s.classList.toggle("ativo", s.id === painelId));
    document.querySelectorAll("nav.abas button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.painel === painelId)));
    window.scrollTo({ top: 0 });
  }
  function aviso(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(aviso.tm);
    aviso.tm = setTimeout(() => { t.hidden = true; }, 2200);
  }

  CAMPOS.forEach((id) => $(id).addEventListener("input", render));
  $("fator").addEventListener("change", render);
  $("tem-sub").addEventListener("change", (e) => { $("campos-sub").hidden = !e.target.checked; render(); });
  $("sis-irrigado").addEventListener("click", () => definirSistema(true));
  $("sis-sequeiro").addEventListener("click", () => definirSistema(false));
  $("tipo-conv").addEventListener("click", () => definirTipo(false));
  $("tipo-org").addEventListener("click", () => definirTipo(true));
  $("exemplo").addEventListener("click", () => { preencher(EXEMPLO); aviso("Exemplo carregado"); });
  $("limpar").addEventListener("click", () => { preencher({ irrigado: estado.irrigado, fator: "75", v2: "50" }); aviso("Laudo limpo"); });
  $("ver-rec").addEventListener("click", () => abrir("painel-rec"));
  $("ver-rel").addEventListener("click", () => abrir("painel-relatorio"));
  document.querySelectorAll("nav.abas button").forEach((b) => b.addEventListener("click", () => abrir(b.dataset.painel)));
  $("copiar").addEventListener("click", async () => {
    const txt = $("texto-copia").value;
    if (!txt) { aviso("Preencha o laudo primeiro."); return; }
    try {
      await navigator.clipboard.writeText(txt);
      aviso("Resumo copiado. É só colar no WhatsApp.");
    } catch {
      const ta = $("texto-copia");
      ta.hidden = false; ta.focus(); ta.select();
      aviso("Selecionei o texto: copie com o dedo.");
    }
  });

  // ---------- Instalar e funcionar sem internet ----------
  let pedidoInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pedidoInstalar = e;
    $("caixa-instalar").hidden = false;
  });
  $("instalar").addEventListener("click", async () => {
    if (!pedidoInstalar) return;
    pedidoInstalar.prompt();
    await pedidoInstalar.userChoice;
    pedidoInstalar = null;
    $("caixa-instalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => { $("caixa-instalar").hidden = true; aviso("App instalado ✅"); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* sem offline, mas o app funciona */ });
  }

  // ---------- Começo ----------
  preencher(lerGuardado() || EXEMPLO);
  window.__conferencia = conferencia();
})();
