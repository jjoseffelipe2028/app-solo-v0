# 🌱 App Solo v0.2 (teste)

Você digita os números do **laudo de análise de solo** e o app mostra, por hectare, **calcário, gesso, fósforo, potássio, micronutrientes e nitrogênio**, em adubo **convencional ou orgânico**. O relatório vai **direto pro WhatsApp** ou vira **PDF**.

- Celular e PC, **funciona sem internet** depois de instalado.
- Base: **Embrapa Cerrados** (Circular Técnica 33/2016, Sousa & Lobato 2004, Vilela, Sousa e Silva 2002) e doses do agrônomo.
- ⚠️ **Versão de teste.** Não use na lavoura sem o agrônomo conferir.

## O que tem
| Parte | Arquivo |
|---|---|
| Contas (funções puras, uma por módulo) | `calculos.js` |
| Tela (Laudo → Recomendação → Relatório) | `index.html`, `tela.js`, `estilo.css` |
| Instalar como app | `manifest.webmanifest`, `icones/` |
| Funcionar sem internet | `sw.js` (guarda os arquivos no aparelho) |
| Testes das contas | `testes/calculos.test.js` |

## Testes
```bash
node --test testes/
```
O laudo de exemplo (milho irrigado) tem que bater com a planilha: **18 de 18** contas (tolerância ±0,1). A mesma conferência aparece no app, em *Relatório → Conferência com a planilha*.

## Segurança e privacidade
- Nada sai do aparelho: sem servidor, sem cadastro, sem propaganda e sem rastreador.
- O último laudo fica salvo **só no próprio aparelho**.
- CSP trancada: só arquivos do próprio app, nada de fora e nada de script embutido.
- Texto na tela só com `textContent` (nada de `innerHTML`).

## Atualizar uma versão
1. Mude o arquivo.
2. Rode os testes.
3. Suba `VERSAO` em `sw.js` (ex.: `app-solo-v0.2`) e o número em `index.html`.
4. Publique. Na próxima vez que o aparelho abrir **com internet**, ele baixa a versão nova sozinho.

## Falta (depende do agrônomo)
- Critério para escolher o fator do gesso (75× ou 50×).
- Fonte da dose de boro (2 kg/ha).
- Como escolher o P no plantio dentro da faixa.
- Outras culturas além do milho.

Como instalar no celular e no PC: [`COMO-INSTALAR.md`](COMO-INSTALAR.md).
