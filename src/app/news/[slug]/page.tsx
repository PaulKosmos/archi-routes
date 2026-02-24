import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import NewsDetailClient from './NewsDetailClient';
import { NewsArticle } from '@/types/news';

interface NewsDetailPageProps {
  params: Promise<{ slug: string }>;
}

// ✅ ГЕНЕРАЦИЯ ДИНАМИЧЕСКИХ МЕТАДАННЫХ
export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = await createServerClient();

    // Загружаем новость для метаданных
    const { data: article, error } = await supabase
      .from('architecture_news')
      .select(`
        title,
        summary,
        content,
        featured_image_url,
        category,
        city,
        country,
        tags,
        published_at,
        meta_title,
        meta_description,
        meta_keywords,
        author_id,
        profiles!architecture_news_author_id_fkey (
          full_name
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published') // Только опубликованные для SEO
      .single();

    if (error || !article) {
      return {
        title: 'News Not Found | Archi Routes',
        description: 'The requested news article was not found or is no longer available.',
      };
    }

    // Формируем метаданные
    const title = article.meta_title || `${article.title} | Archi Routes`;
    const description = article.meta_description || article.summary ||
      article.content.substring(0, 160).replace(/\n/g, ' ') + '...';

    const imageUrl = article.featured_image_url || '/images/default-news-og.jpg';
    const publishedTime = article.published_at || undefined;
    const profiles = article.profiles as { full_name?: string } | { full_name?: string }[] | null;
    const author = Array.isArray(profiles) ? profiles[0]?.full_name :
      profiles?.full_name || 'Archi Routes';

    // Формируем ключевые слова
    const keywords = [
      ...(article.meta_keywords || []),
      ...(article.tags || []),
      'architecture',
      'architecture news',
      article.title.toLowerCase(),
      ...(article.tags || [])
    ].filter(Boolean).join(', ');

    const categoryNames = {
      'projects': 'architectural projects',
      'events': 'architecture events',
      'personalities': 'architects personalities',
      'trends': 'architecture trends',
      'planning': 'urban planning',
      'heritage': 'architectural heritage'
    };

    const categoryName = categoryNames[article.category as keyof typeof categoryNames] || 'architecture';

    return {
      title,
      description,
      keywords,

      // Open Graph для социальных сетей
      openGraph: {
        type: 'article',
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: article.title,
          }
        ],
        publishedTime,
        authors: author ? [author] : undefined,
        section: categoryName,
        tags: article.tags || [],
        locale: 'ru_RU',
        siteName: 'ArchiRoutes',
      },

      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@archi_routes',
      },

      // Дополнительные meta теги
      other: {
        'article:author': author || '',
        'article:published_time': publishedTime || '',
        'article:section': categoryName,
        'article:tag': (article.tags || []).join(','),
        'geo.placename': article.city || '',
        'geo.region': article.country || '',
      },

      // Robots и индексация
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
    };

  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Architecture News | Archi Routes',
      description: 'Latest news and events in the world of architecture and design.',
    };
  }
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  return <NewsDetailClient slug={slug} />;
}
