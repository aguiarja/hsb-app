// ==================== SERVICE WORKER - HSB APP ====================
// Versión del cache - CAMBIA ESTO cada vez que actualices la app
const CACHE_VERSION = 'hsb-app-v1.1.1';

// Tipo de actualización (cambia según el tipo de cambio)
// 'minor' = silencioso, 'major' = notificar, 'critical' = forzar
const UPDATE_TYPE = 'major';

// Archivos que se guardarán en cache (para funcionar offline)
const CACHE_FILES = [
    './index.html',
    './manifest.json'
];

// ==================== INSTALACIÓN ====================
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando versión:', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[Service Worker] Cacheando archivos');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('[Service Worker] Instalación completa');
                // Forzar activación inmediata
                return self.skipWaiting();
            })
    );
});

// ==================== ACTIVACIÓN ====================
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando versión:', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar caches antiguos
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_VERSION) {
                            console.log('[Service Worker] Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activación completa');
                // Tomar control de todas las páginas inmediatamente
                return self.clients.claim();
            })
            .then(() => {
                // Notificar a la app sobre la actualización
                return self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'UPDATE_AVAILABLE',
                            version: CACHE_VERSION,
                            updateType: UPDATE_TYPE
                        });
                    });
                });
            })
    );
});

// ==================== INTERCEPTAR REQUESTS ====================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // NO cachear Firebase (debe ser siempre en tiempo real)
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('firebaseio') ||
        url.hostname.includes('googleapis')) {
        return; // Dejar pasar sin cachear
    }
    
    // Estrategia: Network First, luego Cache (para contenido dinámico)
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, guardar en cache
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, usar cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si no está en cache, mostrar página offline básica
                    return new Response(
                        '<h1>Sin conexión</h1><p>Por favor verifica tu conexión a internet.</p>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
    );
});

// ==================== MENSAJES DE LA APP ====================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[Service Worker] Cargado - Versión:', CACHE_VERSION);
