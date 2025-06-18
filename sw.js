// Service Worker para optimización de caché
const CACHE_NAME = 'vacunatorios-v3';
const STATIC_CACHE_NAME = 'vacunatorios-static-v3';

// Recursos estáticos para cachear
const STATIC_ASSETS = [
    '/styles.css',
    '/js/vacunatorios.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Recursos dinámicos para cachear
const DYNAMIC_ASSETS = [
    '/data/vacunatorios_coordinates.json',
    '/vacunas.csv'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker instalándose...');

    event.waitUntil(
        Promise.all([
            // Caché estático
            caches.open(STATIC_CACHE_NAME).then(cache => {
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
                    cache: 'reload'
                })));
            }),
            // Forzar activación inmediata
            self.skipWaiting()
        ])
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker activándose...');

    event.waitUntil(
        Promise.all([
            // Limpiar cachés antiguos
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

// Interceptar peticiones
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Solo cachear requests GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Estrategia para recursos estáticos
    if (STATIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            cacheFirst(event.request, STATIC_CACHE_NAME)
        );
        return;
    }

    // Estrategia para datos dinámicos
    if (DYNAMIC_ASSETS.some(asset => event.request.url.includes(asset))) {
        event.respondWith(
            networkFirst(event.request, CACHE_NAME)
        );
        return;
    }

    // Estrategia para tiles de mapa
    if (url.hostname.includes('basemaps.cartocdn.com') ||
        url.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            cacheFirst(event.request, CACHE_NAME, { maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 días
        );
        return;
    }
});

// Estrategia Cache First (para recursos estáticos)
async function cacheFirst(request, cacheName, options = {}) {
    try {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);

        if (cached) {
            // Verificar si el caché no ha expirado
            if (options.maxAge) {
                const dateHeader = cached.headers.get('date');
                if (dateHeader) {
                    const cachedDate = new Date(dateHeader);
                    const now = new Date();
                    if (now - cachedDate > options.maxAge) {
                        // Caché expirado, intentar actualizar en background
                        updateCacheInBackground(request, cache);
                    }
                }
            }
            return cached;
        }

        // No está en caché, buscar en red
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

// Estrategia Network First (para datos dinámicos)
async function networkFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);

        try {
            // Intentar red primero
            const response = await fetch(request, {
                cache: 'no-cache'
            });

            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;

        } catch (networkError) {
            // Red falló, usar caché
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

// Actualizar caché en background
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

// Limpiar caché periódicamente
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

// Precarga de recursos críticos
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
