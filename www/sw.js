const CACHE_NAME = 'axioma-v2';
const ASSETS = [
  './',
  './index.html',
  './renderer.js',
  './manifest.json',
  './app_icon.png',
  './data/bosses.js',
  './multimedia/audio.js'
];

// Instalar el Service Worker y almacenar los recursos estáticos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Guardando recursos estáticos en caché...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones para servir desde caché (Estrategia: Cache-First con caída a Red)
self.addEventListener('fetch', (event) => {
  // No cachear peticiones de API (Gemini/Groq) que usan POST o parámetros de consulta dinámicos
  if (event.request.url.includes('generativelanguage.googleapis.com') || event.request.url.includes('api.groq.com')) {
    return; // Dejar que vaya directamente a la red
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retornar el recurso si está en caché
        if (response) {
          return response;
        }

        // Si no está, buscar en la red
        return fetch(event.request).then((networkResponse) => {
          // Verificar respuesta válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonar respuesta antes de guardarla en la caché
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Si falla la red y no hay caché, podemos retornar una página de error o simplemente fallar
          console.log('[Service Worker] Error al recuperar recurso:', event.request.url);
        });
      })
  );
});
