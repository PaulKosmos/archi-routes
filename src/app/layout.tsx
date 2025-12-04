import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Sora } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://archi-routes.com'),
  title: {
    default: 'Archi-Routes - Архитектурные маршруты с аудиогидами',
    template: '%s | Archi-Routes'
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
    title: 'Archi-Routes - Архитектурные маршруты с аудиогидами',
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
    title: 'Archi-Routes - Архитектурные маршруты с аудиогидами',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${sora.variable} antialiased`}
      >
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
