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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://archi-routes.com'),
  title: {
    default: 'Archiroutes - Discover cities and their stories',
    template: '%s | Archiroutes'
  },
  description: 'Откройте для себя архитектурные шедевры мира через интерактивные маршруты с профессиональными аудиогидами. Исследуйте здания, создавайте собственные маршруты, делитесь впечатлениями.',
  keywords: ['архитектура', 'аудиогиды', 'маршруты', 'здания', 'путешествия', 'культура', 'architecture', 'audio guides', 'routes', 'buildings'],
  authors: [{ name: 'Archi-Routes Team' }],
  creator: 'Archi-Routes',
  publisher: 'Archi-Routes',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'Archi-Routes',
    title: 'Archiroutes - Discover cities and their stories',
    description: 'Откройте для себя архитектурные шедевры мира через интерактивные маршруты с профессиональными аудиогидами',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Archi-Routes - Архитектурные маршруты',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Archiroutes - Discover cities and their stories',
    description: 'Откройте для себя архитектурные шедевры мира через интерактивные маршруты с профессиональными аудиогидами',
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
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
    <html lang="ru">
      <body
        className={`${rubik.variable} ${geologica.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
