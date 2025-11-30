import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Получаем опубликованные новости
    const { data: newsArticles, error } = await supabase
      .from('architecture_news')
      .select('slug, updated_at, published_at, priority')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching news for sitemap:', error);
      return [];
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://archi-routes.com';

    // Формируем sitemap для новостей
    const newsSitemap: MetadataRoute.Sitemap = (newsArticles || []).map((article) => ({
      url: `${baseUrl}/news/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: 'weekly' as const,
      priority: article.priority ? article.priority / 10 : 0.7, // priority 1-10 -> 0.1-1.0
    }));

    // Добавляем основные страницы новостей
    const staticNewsPages: MetadataRoute.Sitemap = [
      {
        url: `${baseUrl}/news`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
      },
    ];

    // Добавляем категории новостей
    const categories = [
      'projects',
      'events', 
      'personalities',
      'trends',
      'planning',
      'heritage'
    ];

    const categorySitemap: MetadataRoute.Sitemap = categories.map(category => ({
      url: `${baseUrl}/news?category=${category}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [
      ...staticNewsPages,
      ...categorySitemap,
      ...newsSitemap,
    ];

  } catch (error) {
    console.error('Error generating news sitemap:', error);
    return [];
  }
}
