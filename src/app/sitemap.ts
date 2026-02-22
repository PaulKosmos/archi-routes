// src/app/sitemap.ts
import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://archiroutes.com'

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials for sitemap generation')
    // Return only static pages if DB is not available
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/buildings`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/routes`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/news`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ]
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Получаем опубликованные здания
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, updated_at')
    .eq('verified', true)
    .eq('moderation_status', 'approved')
    .order('updated_at', { ascending: false })

  // Получаем опубликованные маршруты
  const { data: routes } = await supabase
    .from('routes')
    .select('id, updated_at')
    .eq('is_published', true)
    .eq('publication_status', 'published')
    .order('updated_at', { ascending: false })

  // Получаем опубликованные блог-посты
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  // Получаем опубликованные новости
  const { data: newsPosts } = await supabase
    .from('architecture_news')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/buildings`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/routes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/podcasts`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]

  // Динамические страницы зданий
  const buildingPages: MetadataRoute.Sitemap = (buildings || []).map((building) => ({
    url: `${baseUrl}/buildings/${building.id}`,
    lastModified: new Date(building.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Динамические страницы маршрутов
  const routePages: MetadataRoute.Sitemap = (routes || []).map((route) => ({
    url: `${baseUrl}/routes/${route.id}`,
    lastModified: new Date(route.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Динамические страницы блог-постов
  const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Динамические страницы новостей
  const newsPages: MetadataRoute.Sitemap = (newsPosts || []).map((post) => ({
    url: `${baseUrl}/news/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...buildingPages,
    ...routePages,
    ...blogPages,
    ...newsPages,
  ]
}
