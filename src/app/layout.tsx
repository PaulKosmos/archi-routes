import type { Metadata, Viewport } from "next";
import { Rubik, Geologica } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const geologica = Geologica({
  variable: "--font-geologica",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://archiroutes.com'),
  title: {
    default: 'Archiroutes - Discover cities and their stories',
    template: '%s | Archiroutes'
  },
  description: 'Discover the world\'s architectural masterpieces through interactive routes with professional audio guides. Explore buildings, create your own routes, share your impressions.',
  keywords: ['architecture', 'audio guides', 'routes', 'buildings', 'travel', 'culture', 'architectural tours', 'city exploration'],
  authors: [{ name: 'ArchiRoutes Team' }],
  creator: 'ArchiRoutes',
  publisher: 'ArchiRoutes',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'ArchiRoutes',
    title: 'Archiroutes - Discover cities and their stories',
    description: 'Discover the world\'s architectural masterpieces through interactive routes with professional audio guides',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ArchiRoutes - Architectural Routes',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Archiroutes - Discover cities and their stories',
    description: 'Discover the world\'s architectural masterpieces through interactive routes with professional audio guides',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/ar-logo.svg', type: 'image/svg+xml' },
      { url: '/ar-logo.png', type: 'image/png' },
    ],
    shortcut: '/ar-logo.png',
    apple: '/ar-logo.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${geologica.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
