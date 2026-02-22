import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://archiroutes.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/news/',
          '/news/sitemap.xml',
          '/buildings/',
          '/routes/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/profile/',
          '/_next/',
          '/static/',
          '*.json',
          '*?*utm_*',
          '*?*fbclid*',
          '*?*gclid*',
        ],
        crawlDelay: 1,
      },
      // Специальные правила для поисковых ботов
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/news/',
          '/buildings/', 
          '/routes/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/profile/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/news/',
          '/buildings/',
          '/routes/',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/profile/',
        ],
        crawlDelay: 2,
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/news/sitemap.xml`,
    ],
    host: baseUrl,
  };
}
