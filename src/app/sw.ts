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

// Robust precaching for the App Shell
const entriesToPrecache = [
    { url: '/', revision: 'v14-final' },
    { url: '/offline', revision: 'v14-final' },
    { url: '/manifest.json', revision: 'v14-final' }
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
            // For navigation requests, use StaleWhileRevalidate to ensure instant offline load
            matcher({ request }) {
                return request.mode === 'navigate';
            },
            handler: new StaleWhileRevalidate({
                cacheName: 'navigations',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 10,
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
    console.log('[PWA] Service Worker installing...');
    (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
    console.log('[PWA] Service Worker activating...');
    event.waitUntil((self as any).clients.claim());
});

serwist.addEventListeners();
