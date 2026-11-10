// App Solo v0: guarda os arquivos do app no aparelho para funcionar SEM internet.
// Trocou algum arquivo? Suba a VERSAO para os aparelhos baixarem a nova.
"use strict";
const VERSAO = "app-solo-v0.1";
const ARQUIVOS = [
  "./", "index.html", "estilo.css", "calculos.js", "tela.js", "manifest.webmanifest",
  "icones/icone-192.png", "icones/icone-512.png", "icones/icone-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Só arquivos do próprio app: primeiro tenta a internet (pega a versão nova), sem internet usa a cópia.
self.addEventListener("fetch", (e) => {
  const pedido = e.request;
  if (pedido.method !== "GET" || new URL(pedido.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((c) => c.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
