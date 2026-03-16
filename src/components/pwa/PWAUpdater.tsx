'use client';

import { useEffect } from 'react';

export function PWAUpdater() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                console.log('[PWA] Service Worker ready');
                // Force an update check on every load
                registration.update();
            });

            // Handle controller changes (new worker takes over)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[PWA] New version available, reloading...');
                window.location.reload();
            });
        }
    }, []);

    return null;
}
