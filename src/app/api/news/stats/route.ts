// app/api/news/stats/route.ts
// API роут для получения статистики новостей

import { NextRequest, NextResponse } from 'next/server';
import { NewsStats, NewsArticle } from '@/types/news';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Общая статистика новостей
    const { data: allNews } = await supabase
      .from('architecture_news')
      .select('status, views_count, likes_count, shares_count, category, created_at');

    if (!allNews) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Подсчет по категориям
    const categoriesDistribution = allNews.reduce((acc, news) => {
      acc[news.category] = (acc[news.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Дата неделю назад
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Trending статьи (высокие просмотры и лайки за последнюю неделю)
    const { data: trendingNews } = await supabase
      .from('architecture_news')
      .select(`
        id, title, slug, views_count, likes_count, category,
        author:profiles!author_id(full_name)
      `)
      .eq('status', 'published')
      .gte('published_at', oneWeekAgo.toISOString())
      .order('views_count', { ascending: false })
      .order('likes_count', { ascending: false })
      .limit(5);

    // Формирование статистики
    const stats: NewsStats = {
      total_articles: allNews.length,
      published_articles: allNews.filter(n => n.status === 'published').length,
      draft_articles: allNews.filter(n => n.status === 'draft').length,
      total_views: allNews.reduce((sum, n) => sum + (n.views_count || 0), 0),
      total_likes: allNews.reduce((sum, n) => sum + (n.likes_count || 0), 0),
      total_shares: allNews.reduce((sum, n) => sum + (n.shares_count || 0), 0),
      categories_distribution: categoriesDistribution,
      recent_activity: {
        new_articles_this_week: allNews.filter(n =>
          new Date(n.created_at) >= oneWeekAgo
        ).length,
        trending_articles: (trendingNews || []) as unknown as NewsArticle[],
      },
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
