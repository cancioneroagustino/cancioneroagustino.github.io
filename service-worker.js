const CACHE_NAME = "cancionero-dinamico-v2";

/**
 * 🧩 Archivos base que siempre deben estar disponibles offline
 * (todas rutas reales, sin carpetas vacías)
 */
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/cancionero.css",
  "./scripts/cancionero.js",
  "./scripts/cancioneromenor.js",
  "./scripts/canciones.js",
  "./scripts/jquery.min.js",
  "./images/logoagustino.png",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./manifest.json",
  "./sitemap.xml"
];

/**
 * 📜 Lee el sitemap y devuelve todas las URLs (excluyendo /files/)
 */
async function getUrlsFromSitemap() {
  try {
    const res = await fetch("./sitemap.xml");
    const text = await res.text();
    const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map(m => {
        const u = new URL(m[1]);
        const path = decodeURIComponent(u.pathname);
        return path.startsWith("/") ? "." + path : "./" + path;
      })
      .filter(path => !path.includes("/files/"));
    console.log(`🕸️ [SW] ${urls.length} URLs encontradas en sitemap.`);
    return urls;
  } catch (err) {
    console.warn("⚠️ [SW] No se pudo leer el sitemap:", err);
    return [];
  }
}

/**
 * 🧱 INSTALACIÓN — cachea los archivos base y todas las páginas del sitemap
 */
self.addEventListener("install", event => {
  console.log("🟦 [SW] Instalando...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      console.log("🟩 [SW] Cache abierto:", CACHE_NAME);
      // Cachear archivos base con tolerancia a errores
      await Promise.allSettled(
        CORE_ASSETS.map(u =>
          cache.add(u).catch(err => console.warn("❌ No se pudo cachear:", u, err))
        )
      );

      // Cachear las páginas del sitemap
      const urls = await getUrlsFromSitemap();
      await Promise.allSettled(
        urls.map(u =>
          cache.add(u).catch(err => console.warn("❌ No se pudo cachear:", u, err))
        )
      );

      console.log("✅ [SW] Instalación completa, sitio cacheado.");
      self.skipWaiting();
    })()
  );
});

/**
 * 🧹 ACTIVACIÓN — limpia versiones viejas del cache
 */
self.addEventListener("activate", event => {
  console.log("🟨 [SW] Activando...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log("🧽 [SW] Borrando cache antiguo:", k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
  console.log("🟩 [SW] Activado correctamente");
});

/**
 * 🌐 FETCH — Estrategia Network First
 * (usa la red si hay conexión, cache si no)
 */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/files/")) return; // no cachear adjuntos pesados

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || caches.match("./index.html");
      }
    })()
  );
});
