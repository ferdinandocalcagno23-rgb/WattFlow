import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from 'serwist';

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// Explicitly add essential routes to precache manifest if not already there
const manifest = self.__SW_MANIFEST || [];

const entriesToPrecache = [
    { url: '/', revision: Date.now().toString() },
    { url: '/offline', revision: '2' }
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
    navigationPreload: true,
    runtimeCaching: [
        {
            matcher({ request }) {
                return request.mode === 'navigate';
            },
            handler: new NetworkFirst({
                cacheName: 'navigations',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 10,
                        maxAgeSeconds: 24 * 60 * 60 * 7, // 7 days
                    }),
                ],
            }),
        },
        {
            matcher: ({ url }) => url.pathname === '/',
            handler: new NetworkFirst({
                cacheName: 'start-url',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 1,
                        maxAgeSeconds: 24 * 60 * 60 * 30, // 30 days
                    }),
                ],
            }),
        },
        ...defaultCache,
        {
            matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: new CacheFirst({
                cacheName: 'google-fonts',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 10,
                        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                    }),
                ],
            }),
        },
    ],
    fallbacks: {
        entries: [
            {
                url: '/offline',
                matcher({ request }) {
                    return request.destination === 'document';
                },
            },
        ],
    },
});

serwist.addEventListeners();
