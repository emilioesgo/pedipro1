const CACHE_NAME = 'pedipro-v5';
const ASSETS = [
    './dashboard.html',
    './assets/dashboard.css?v=4',
    './assets/icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Para una PWA simple, intentamos responder de la red primero,
    // y si falla, devolvemos lo que hay en caché.
    // Esto asegura que la DB de Firebase (que tiene su propio offline handling) no se estanque.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
