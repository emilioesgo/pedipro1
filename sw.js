const CACHE_NAME = 'pedipro-v1';
const ASSETS = [
    './dashboard.html',
    './assets/dashboard.css',
    './assets/icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
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
