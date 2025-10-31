const CACHE_NAME = "cancionero-v1";

// Archivos base siempre necesarios
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/",
  "./scripts/",
  "./images/",
  "./fonts/",
  "./manifest.json"
];

// Durante la instalación, primero cacheamos los archivos básicos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

// Activación: limpiar versiones viejas si cambias el nombre del caché
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Luego del primer uso, intentamos cachear todo el sitemap.xml
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si ya está cacheado, devuelve eso
      if (response) return response;

      // Si no, intenta obtenerlo de la red y guardar si corresponde
      return fetch(event.request).then(networkResponse => {
        // 🔹 NO guardar nada dentro de carpetas "files/"
        const url = event.request.url;
        if (!url.includes("/files/")) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return networkResponse;
      }).catch(() => {
        // Si no hay conexión y no está cacheado, devuelve una página de error simple
        if (event.request.destination === "document") {
          return new Response("<h1>Sin conexión</h1><p>Esta página no está disponible sin internet.</p>", {
            headers: { "Content-Type": "text/html" }
          });
        }
      });
    })
  );
});

// (Opcional) Cacheo automático del sitemap en background
self.addEventListener("sync", event => {
  if (event.tag === "cache-sitemap") {
    event.waitUntil(cacheAllPages());
  }
});

// 🧩 Función que recorre el sitemap y cachea páginas
async function cacheAllPages() {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch("./sitemap.xml");
  const text = await res.text();

  // Extrae todas las URLs del sitemap
  const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

  // Excluye cualquier URL que contenga "/files/"
  const filtered = urls.filter(u => !u.includes("/files/"));

  // Cachea todas las demás
  await cache.addAll(filtered);

  // Envía mensaje a las páginas abiertas
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "CACHE_COMPLETE", count: filtered.length });
  });
}
