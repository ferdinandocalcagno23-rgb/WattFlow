import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, CacheFirst, ExpirationPlugin } from 'serwist';

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// Explicitly add essential routes to precache manifest if not already there
const manifest = self.__SW_MANIFEST || [];
if (!manifest.some((entry) => (typeof entry === 'string' ? entry === '/' : entry.url === '/'))) {
    manifest.push({ url: '/', revision: Date.now().toString() });
}
if (!manifest.some((entry) => (typeof entry === 'string' ? entry === '/offline' : entry.url === '/offline'))) {
    manifest.push({ url: '/offline', revision: '1' });
}

const serwist = new Serwist({
    precacheEntries: manifest,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
    runtimeCaching: [
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
