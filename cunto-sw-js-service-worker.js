/* Service worker di «Cunto de li Cunti» — sta accanto a index.html.
   L'app vive in un file solo: la cache porta offline la pagina e il manifest.
   Strategia: prima la rete (così gli aggiornamenti arrivano sempre freschi),
   la cache è il salvagente quando il telefono non ha segnale.
   A ogni modifica dell'app alza la versione qui sotto (v1 → v2): alla
   prossima apertura i telefoni si aggiornano da soli e le cache vecchie
   vengono buttate via da sole. */
const NOME = "cunto-v1";
const FILE = ["./", "./manifest.webmanifest", "icona-192.png", "icona-512.png",
              "icona-512-mascherabile.png", "apple-touch-icon.png"];

/* Installazione: i file si mettono in cassaforte uno per uno — se qualcuno
   manca, gli altri restano lo stesso (addAll bloccherebbe tutto) */
self.addEventListener("install", e => {
  e.waitUntil(caches.open(NOME)
    .then(c => Promise.allSettled(FILE.map(f => c.add(f))))
    .then(() => self.skipWaiting()));
});

/* Attivazione: si buttano le cache delle versioni passate e si prende
   subito il controllo delle schede già aperte */
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(nomi => Promise.all(nomi.filter(n => n !== NOME).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

/* Ogni richiesta passa prima dalla rete; senza rete si serve la copia
   in cassaforte, e in extremis la pagina principale */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(risp => {
      if (risp && risp.ok) {   // la risposta buona finisce in cassaforte per il prossimo offline
        const copia = risp.clone();
        caches.open(NOME).then(c => c.put(e.request, copia));
      }
      return risp;
    }).catch(() => caches.match(e.request, {ignoreSearch: true})
      .then(dallaCache => dallaCache || caches.match("./")))
  );
});