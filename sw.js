const CACHE_NAME = 'vacunatorios-v4';
const STATIC_CACHE_NAME = 'vacunatorios-static-v4';

const STATIC_ASSETS = [
    '/styles.css',
    '/js/vacunatorios.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

const DYNAMIC_ASSETS = [
    '/data/vacunatorios_coordinates.json',
    '/vacunas.csv'
];

self.addEventListener('install', event => {
    console.log('Service Worker instalándose...');

    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'reload'
                })));
            }),
            self.skipWaiting()
        ])
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activándose...');

    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                            console.log('Eliminando caché antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Tomar control inmediato
            self.clients.claim()
        ])
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') {
        return;
    }

    if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            cacheFirst(event.request, STATIC_CACHE_NAME)
        );
        return;
    }

    if (DYNAMIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            networkFirst(event.request, CACHE_NAME)
        );
        return;
    }

    if (url.hostname.includes('basemaps.cartocdn.com') ||
        url.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            cacheFirst(event.request, CACHE_NAME, { maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 días
        );
        return;
    }
});

async function cacheFirst(request, cacheName, options = {}) {
    try {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);

        if (cached) {
            if (options.maxAge) {
                const dateHeader = cached.headers.get('date');
                if (dateHeader) {
                    const cachedDate = new Date(dateHeader);
                    const now = new Date();
                    if (now - cachedDate > options.maxAge) {
                        updateCacheInBackground(request, cache);
                    }
                }
            }
            return cached;
        }

        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;

    } catch (error) {
        console.error('Error en cacheFirst:', error);
        return new Response('Error de conexión', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);

        try {
            const response = await fetch(request, {
                cache: 'no-cache'
            });

            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;

        } catch (networkError) {
            const cached = await cache.match(request);
            if (cached) {
                return cached;
            }

            throw networkError;
        }

    } catch (error) {
        console.error('Error en networkFirst:', error);
        return new Response('Sin conexión y sin caché', { status: 503 });
    }
}

async function updateCacheInBackground(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response);
        }
    } catch (error) {
        console.log('Error actualizando caché en background:', error);
    }
}

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'PRELOAD_CRITICAL') {
        event.waitUntil(
            preloadCriticalResources()
        );
    }
});

async function preloadCriticalResources() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = DYNAMIC_ASSETS.map(url => new Request(url));

        await Promise.all(
            requests.map(async request => {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.put(request, response);
                    }
                } catch (error) {
                    console.log('Error precargando:', request.url, error);
                }
            })
        );
    } catch (error) {
        console.error('Error en precarga:', error);
    }
}
