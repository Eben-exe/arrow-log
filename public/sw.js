// Arrow Log · Service Worker
// Estrategia: network-first para la página (siempre la versión nueva si hay red),
// cache-first para assets y fuentes (carga instantánea y funcionamiento offline).
const VERSION = "v1";
const STATIC_CACHE = `arrowlog-static-${VERSION}`;
const RUNTIME_CACHE = `arrowlog-runtime-${VERSION}`;

const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("arrowlog-") && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !isFont) return;

  // Navegación: red primero, caché como respaldo (offline en el campo de tiro)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Assets y fuentes: caché primero, y se rellena al vuelo
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
