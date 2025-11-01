const CACHE_NAME = "cancionero-dinamico-v1";

// Archivos base que siempre deben estar
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/",
  "./scripts/",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./images/logoagustino.png",
  "./manifest.json",
  "./sitemap.xml"
];

/**
 * Lee el sitemap.xml y devuelve una lista de rutas (excluyendo /files/)
 */
async function getUrlsFromSitemap() {
  try {
    const res = await fetch("./sitemap.xml");
    const text = await res.text();
    const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map(m => {
        const u = new URL(m[1]);
        return decodeURIComponent(u.pathname.startsWith("/") ? "." + u.pathname : "./" + u.pathname);
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
 * INSTALACIÓN
 */
self.addEventListener("install", event => {
  console.log("🟦 [SW] Instalando...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      // Cachear las páginas del sitemap
      const urls = await getUrlsFromSitemap();
      await cache.addAll(urls);

      console.log("✅ [SW] Instalación completa.");
      self.skipWaiting();
    })()
  );
});

/**
 * ACTIVACIÓN
 */
self.addEventListener("activate", event => {
  console.log("🟨 [SW] Activando...");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/**
 * FETCH: Estrategia Network First (red si hay, cache si no)
 */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/files/")) return; // no cachear adjuntos

  event.respondWith(
    (async () => {
      try {
        const netRes = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, netRes.clone());
        return netRes;
      } catch {
        const cacheRes = await caches.match(event.request);
        return cacheRes || caches.match("./index.html");
      }
    })()
  );
});
