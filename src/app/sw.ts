import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, ExpirationPlugin, StaleWhileRevalidate, CacheFirst } from 'serwist';

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__SW_MANIFEST || [];

// Use a very specific revision to ensure cache invalidation
const CACHE_REVISION = 'v13-' + Date.now();

const entriesToPrecache = [
    { url: '/', revision: CACHE_REVISION },
    { url: '/offline', revision: CACHE_REVISION },
    { url: '/manifest.json', revision: '1' }
];

entriesToPrecache.forEach(entry => {
    if (!manifest.some((m) => (typeof m === 'string' ? m === entry.url : m.url === entry.url))) {
        manifest.push(entry);
    }
});

const serwist = new Serwist({
    precacheEntries: manifest,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
    runtimeCaching: [
        {
            // Aggressive caching for the root to ensure it's always ready offline
            matcher: ({ url }) => url.pathname === '/',
            handler: new StaleWhileRevalidate({
                cacheName: 'app-shell',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 1,
                        maxAgeSeconds: 24 * 60 * 60 * 30, // 30 days
                    }),
                ],
            }),
        },
        {
            matcher({ request }) {
                return request.mode === 'navigate';
            },
            handler: new NetworkFirst({
                cacheName: 'navigations',
                networkTimeoutSeconds: 3,
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 50,
                        maxAgeSeconds: 24 * 60 * 60 * 7, // 7 days
                    }),
                ],
            }),
        },
        ...defaultCache,
        {
            matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i,
            handler: new StaleWhileRevalidate({
                cacheName: 'static-assets',
            }),
        }
    ],
    fallbacks: {
        entries: [
            {
                url: '/',
                matcher({ request }) {
                    return request.mode === 'navigate';
                },
            },
        ],
    },
});

self.addEventListener('install', () => {
    console.log('[Service Worker] Installed!');
    (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
    console.log('[Service Worker] Activated!');
    event.waitUntil((self as any).clients.claim());
});

serwist.addEventListeners();
