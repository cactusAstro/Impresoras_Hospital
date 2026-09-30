// Service worker del panel de impresoras.
// Primero la red (para ver siempre la última versión) y, si no hay red, la copia guardada.
// Los pings y el estado del servidor nunca se guardan.
const CACHE = "panel-impresoras-v3";
const ARCHIVOS = ["./", "index.html", "impresoras_con_serial.js", "qrcode.min.js", "manifest.json", "icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/ping") || url.pathname.endsWith("/estado")) return;

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
