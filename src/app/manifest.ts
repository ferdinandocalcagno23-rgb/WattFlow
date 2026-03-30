import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'WattFlow';
    const isAleflow = appName.toLowerCase() === 'aleflow';

    return {
        name: appName,
        short_name: appName,
        description: 'The ultimate indoor cycling companion.',
        start_url: '/',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
            {
                src: isAleflow ? '/icons/icon-aleflow-192.png' : '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: isAleflow ? '/icons/icon-aleflow-512.png' : '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
