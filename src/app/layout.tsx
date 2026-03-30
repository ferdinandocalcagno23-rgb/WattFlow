import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAUpdater } from '@/components/pwa/PWAUpdater';

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'WattFlow';
const isAleflow = appName.toLowerCase() === 'aleflow';

export const metadata: Metadata = {
  title: appName,
  description: 'The ultimate indoor cycling companion.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: appName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: isAleflow ? '/icons/icon-aleflow-192.png' : '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PWAUpdater />
        {children}
      </body>
    </html>
  );
}
