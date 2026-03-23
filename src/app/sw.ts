import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
    Serwist,
    NetworkFirst,
    CacheFirst,
    StaleWhileRevalidate,
    ExpirationPlugin,
    NetworkOnly,
} from 'serwist';

declare global {
    interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__SW_MANIFEST || [];

// Ensure critical app shell pages are always pre-cached
const entriesToPrecache = [
    { url: '/', revision: 'v16-offline-opt' },
    { url: '/offline', revision: 'v16-offline-opt' },
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
        // ── Navigation requests: CacheFirst → instant offline, update in bg ──
        {
            matcher({ request }) {
                return request.mode === 'navigate';
            },
            handler: new NetworkFirst({
                cacheName: 'navigations',
                networkTimeoutSeconds: 3, // Give up on network after 3 s → serve cache instantly
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                    }),
                ],
            }),
        },

        // ── Local static assets (JS, CSS, fonts, images): CacheFirst ──
        {
            matcher: /\/_next\/static\/.+/,
            handler: new CacheFirst({
                cacheName: 'next-static',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    }),
                ],
            }),
        },

        // ── Local images & icons: CacheFirst ──
        {
            matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: new CacheFirst({
                cacheName: 'images',
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 60,
                        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                    }),
                ],
            }),
        },

        // ── Google Fonts stylesheets: StaleWhileRevalidate (served from cache if offline) ──
        {
            matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: new StaleWhileRevalidate({
                cacheName: 'google-fonts-stylesheets',
                plugins: [
                    new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
                ],
            }),
        },

        // ── Google Fonts files: CacheFirst (font files almost never change) ──
        {
            matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: new CacheFirst({
                cacheName: 'google-fonts-webfonts',
                plugins: [
                    new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
                ],
            }),
        },

        // ── Strava API & other external APIs: NetworkOnly ──
        // Do NOT cache API responses; failure is handled in the app gracefully
        {
            matcher: /^https:\/\/(www\.strava\.com|strava\.com)\/.*/i,
            handler: new NetworkOnly(),
        },

        // ── Manifest.webmanifest: NetworkFirst with short timeout ──
        {
            matcher: /\/manifest\.webmanifest$/i,
            handler: new NetworkFirst({
                cacheName: 'manifest',
                networkTimeoutSeconds: 2,
            }),
        },

        // ── Fallback for remaining local assets ──
        ...defaultCache,
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
    console.log('[SW] Installing v16 – offline-optimized');
    (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
    console.log('[SW] Activating');
    event.waitUntil((self as any).clients.claim());
});

serwist.addEventListeners();
