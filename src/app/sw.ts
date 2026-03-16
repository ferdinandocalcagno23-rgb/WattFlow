import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, ExpirationPlugin, StaleWhileRevalidate, CacheFirst } from 'serwist';

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
    { url: '/offline', revision: '10' }, // Use a clear revision to force update
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
    navigationPreload: false, // Disabled to ensure more robust offline cold-start interception
    runtimeCaching: [
        {
            matcher({ request }) {
                return request.mode === 'navigate';
            },
            handler: new NetworkFirst({
                cacheName: 'navigations',
                networkTimeoutSeconds: 5,
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
            matcher: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: new CacheFirst({
                cacheName: 'google-fonts',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 20,
                        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
                    }),
                ],
            }),
        },
        {
            matcher: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico)$/i,
            handler: new StaleWhileRevalidate({
                cacheName: 'static-resources',
            }),
        }
    ],
    fallbacks: {
        entries: [
            {
                url: '/', // Fallback to root for navigations
                matcher({ request }) {
                    return request.mode === 'navigate';
                },
            },
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
