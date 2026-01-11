// components/news/NewsMasonryGrid.tsx
// Structured grid для новостей с логичными размерами карточек

'use client';

import { NewsArticleWithDetails } from '@/types/news';
import NewsCard from './NewsCard';

// ============================================================
// ТИПЫ
// ============================================================

interface NewsMasonryGridProps {
  news: NewsArticleWithDetails[];
  loading?: boolean;
  className?: string;
}

type CardSize = 'small' | 'medium' | 'large' | 'featured';

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function NewsMasonryGrid({
  news,
  loading = false,
  className = ''
}: NewsMasonryGridProps) {

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl mb-3"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 mb-4">
          <span className="text-6xl">📰</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          Новостей не найдено
        </h3>
        <p className="text-gray-500">
          Попробуйте изменить фильтры или поисковый запрос
        </p>
      </div>
    );
  }

  // Featured новости (если есть)
  const featuredNews = news.filter(n => n.featured);
  const regularNews = news.filter(n => !n.featured);

  return (
    <div className={className}>

      {/* Featured новости - полная ширина */}
      {featuredNews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Top News</h2>
          <div className="space-y-6">
            {featuredNews.map(article => (
              <NewsCard
                key={article.id}
                news={article}
                size="featured"
                showSummary={true}
                showRelatedBuildings={true}
                showMetrics={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Обычные новости - structured grid */}
      {regularNews.length > 0 && (
        <div>
          {/* Первая новость - на всю ширину (3 колонки) */}
          {regularNews.length > 0 && (
            <div className="mb-6">
              <NewsCard
                key={regularNews[0].id}
                news={regularNews[0]}
                size="large"
                showSummary={true}
                showRelatedBuildings={true}
                showMetrics={true}
              />
            </div>
          )}

          {/* Остальные новости - в сетке */}
          {regularNews.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularNews.slice(1).map(article => (
                <NewsCard
                  key={article.id}
                  news={article}
                  size="medium"
                  showSummary={true}
                  showRelatedBuildings={false}
                  showMetrics={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
