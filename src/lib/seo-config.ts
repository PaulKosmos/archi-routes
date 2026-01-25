/**
 * SEO конфигурация и оптимизация
 */

// Базовые мета-данные
export const SEO_CONFIG = {
  // Основные мета-теги
  DEFAULT_META: {
    title: 'ArchiRoutes - Архитектурная карта города',
    description: 'Откройте для себя архитектурные шедевры вашего города. Интерактивная карта с зданиями, маршрутами и историческими объектами.',
    keywords: 'архитектура, здания, маршруты, город, история, достопримечательности',
    author: 'ArchiRoutes Team',
    viewport: 'width=device-width, initial-scale=1.0',
    robots: 'index, follow',
    language: 'ru',
  },

  // Open Graph мета-теги
  OPEN_GRAPH: {
    type: 'website',
    site_name: 'ArchiRoutes',
    locale: 'ru_RU',
    image: {
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'ArchiRoutes - Архитектурная карта города'
    }
  },

  // Twitter Card мета-теги
  TWITTER_CARD: {
    card: 'summary_large_image',
    site: '@archiroutes',
    creator: '@archiroutes'
  },

  // Структурированные данные (JSON-LD)
  STRUCTURED_DATA: {
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ArchiRoutes',
      description: 'Платформа для изучения архитектуры города',
      url: 'https://archiroutes.com',
      logo: 'https://archiroutes.com/logo.png',
      sameAs: [
        'https://twitter.com/archiroutes',
        'https://facebook.com/archiroutes',
        'https://instagram.com/archiroutes'
      ]
    },
    
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ArchiRoutes',
      url: 'https://archiroutes.com',
      description: 'Интерактивная архитектурная карта города',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://archiroutes.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },

    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: []
    }
  },

  // Sitemap конфигурация
  SITEMAP: {
    changefreq: {
      home: 'daily',
      buildings: 'weekly',
      routes: 'weekly',
      news: 'daily',
      blog: 'weekly'
    },
    priority: {
      home: 1.0,
      buildings: 0.8,
      routes: 0.8,
      news: 0.9,
      blog: 0.7
    }
  }
} as const

// Интерфейсы для SEO
export interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
  noindex?: boolean
  canonical?: string
}

// Класс для генерации SEO мета-тегов
export class SEOGenerator {
  private baseUrl: string
  private defaultMeta: typeof SEO_CONFIG.DEFAULT_META

  constructor(baseUrl: string = 'https://archiroutes.com') {
    this.baseUrl = baseUrl
    this.defaultMeta = SEO_CONFIG.DEFAULT_META
  }

  // Генерация мета-тегов
  generateMetaTags(seoProps: SEOProps): Record<string, string> {
    const {
      title,
      description,
      keywords,
      image,
      url,
      type = 'website',
      publishedTime,
      modifiedTime,
      author,
      section,
      tags,
      noindex,
      canonical
    } = seoProps

    const fullTitle = title ? `${title} | ${this.defaultMeta.title}` : this.defaultMeta.title
    const fullDescription = description || this.defaultMeta.description
    const fullKeywords = keywords || this.defaultMeta.keywords
    const fullImage = image ? `${this.baseUrl}${image}` : `${this.baseUrl}${SEO_CONFIG.OPEN_GRAPH.image.url}`
    const fullUrl = url ? `${this.baseUrl}${url}` : this.baseUrl

    const metaTags: Record<string, string> = {
      // Основные мета-теги
      title: fullTitle,
      description: fullDescription,
      keywords: fullKeywords,
      author: author || this.defaultMeta.author,
      viewport: this.defaultMeta.viewport,
      robots: noindex ? 'noindex, nofollow' : this.defaultMeta.robots,
      language: this.defaultMeta.language,

      // Open Graph
      'og:title': fullTitle,
      'og:description': fullDescription,
      'og:type': type,
      'og:url': fullUrl,
      'og:image': fullImage,
      'og:image:width': SEO_CONFIG.OPEN_GRAPH.image.width.toString(),
      'og:image:height': SEO_CONFIG.OPEN_GRAPH.image.height.toString(),
      'og:image:alt': SEO_CONFIG.OPEN_GRAPH.image.alt,
      'og:site_name': SEO_CONFIG.OPEN_GRAPH.site_name,
      'og:locale': SEO_CONFIG.OPEN_GRAPH.locale,

      // Twitter Card
      'twitter:card': SEO_CONFIG.TWITTER_CARD.card,
      'twitter:site': SEO_CONFIG.TWITTER_CARD.site,
      'twitter:creator': SEO_CONFIG.TWITTER_CARD.creator,
      'twitter:title': fullTitle,
      'twitter:description': fullDescription,
      'twitter:image': fullImage,

      // Канонический URL
      canonical: canonical || fullUrl
    }

    // Дополнительные мета-теги для статей
    if (type === 'article') {
      if (publishedTime) metaTags['article:published_time'] = publishedTime
      if (modifiedTime) metaTags['article:modified_time'] = modifiedTime
      if (author) metaTags['article:author'] = author
      if (section) metaTags['article:section'] = section
      if (tags) {
        tags.forEach((tag, index) => {
          metaTags[`article:tag:${index}`] = tag
        })
      }
    }

    return metaTags
  }

  // Генерация структурированных данных
  generateStructuredData(type: 'organization' | 'website' | 'breadcrumb' | 'building' | 'route', data?: any): object {
    // Only organization and website have base templates
    const baseStructuredData = type in SEO_CONFIG.STRUCTURED_DATA
      ? { ...(SEO_CONFIG.STRUCTURED_DATA as Record<string, object>)[type] }
      : {}

    switch (type) {
      case 'breadcrumb':
        return {
          ...baseStructuredData,
          itemListElement: data?.breadcrumbs || []
        }

      case 'building':
        return {
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: data?.name,
          description: data?.description,
          address: {
            '@type': 'PostalAddress',
            addressLocality: data?.city,
            addressCountry: data?.country
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: data?.latitude,
            longitude: data?.longitude
          },
          image: data?.image_url,
          dateCreated: data?.created_at,
          ...(data?.architect && { creator: { '@type': 'Person', name: data.architect } })
        }

      case 'route':
        return {
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: data?.title,
          description: data?.description,
          itinerary: data?.buildings?.map((building: any) => ({
            '@type': 'TouristAttraction',
            name: building.name,
            address: {
              '@type': 'PostalAddress',
              addressLocality: building.city
            }
          })),
          duration: data?.estimated_duration_minutes ? `PT${data.estimated_duration_minutes}M` : undefined,
          distance: data?.distance_km ? `${data.distance_km} km` : undefined
        }

      default:
        return baseStructuredData
    }
  }

  // Генерация sitemap
  generateSitemap(pages: Array<{ url: string; changefreq?: string; priority?: number; lastmod?: string }>): string {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${this.baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq || 'weekly'}</changefreq>
    <priority>${page.priority || 0.5}</priority>
  </url>`).join('\n')}
</urlset>`

    return sitemap
  }

  // Генерация robots.txt
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

Sitemap: ${this.baseUrl}/sitemap.xml

# Блокируем служебные страницы
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /test-*

# Разрешаем важные страницы
Allow: /buildings/
Allow: /routes/
Allow: /news/
Allow: /blog/
Allow: /collections/`
  }
}

// Хук для использования SEO в Next.js
export function useSEO(seoProps: SEOProps) {
  const seoGenerator = new SEOGenerator()
  
  return {
    metaTags: seoGenerator.generateMetaTags(seoProps),
    structuredData: (type: 'organization' | 'website' | 'breadcrumb' | 'building' | 'route', data?: any) => 
      seoGenerator.generateStructuredData(type, data)
  }
}

// Утилиты для SEO
export const SEOUtils = {
  // Очистка текста для мета-описания
  cleanDescription: (text: string, maxLength: number = 160): string => {
    return text
      .replace(/<[^>]*>/g, '') // Удаляем HTML теги
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim()
      .substring(0, maxLength)
      .replace(/\s+\S*$/, '') // Удаляем последнее неполное слово
      + '...'
  },

  // Генерация slug для URL
  generateSlug: (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Удаляем специальные символы
      .replace(/[\s_-]+/g, '-') // Заменяем пробелы и подчеркивания на дефисы
      .replace(/^-+|-+$/g, '') // Удаляем дефисы в начале и конце
  },

  // Валидация мета-тегов
  validateMetaTags: (metaTags: Record<string, string>): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!metaTags.title || metaTags.title.length > 60) {
      errors.push('Title должен быть от 1 до 60 символов')
    }

    if (!metaTags.description || metaTags.description.length > 160) {
      errors.push('Description должен быть от 1 до 160 символов')
    }

    if (metaTags['og:image'] && !metaTags['og:image'].startsWith('http')) {
      errors.push('OG Image должен быть абсолютным URL')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Глобальный экземпляр SEO генератора
export const seoGenerator = new SEOGenerator()

export default seoGenerator
