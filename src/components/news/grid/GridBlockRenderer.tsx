'use client';

import React from 'react';
import NewsCard from '@/components/news/NewsCard';
import { NewsGridBlockWithNews, NewsArticleWithDetails } from '@/types/news';

interface GridBlockRendererProps {
  block: NewsGridBlockWithNews;
  className?: string;
}

export default function GridBlockRenderer({ block, className = '' }: GridBlockRendererProps) {
  // @deprecated: Using legacy fields block_type and news_articles
  const block_type = (block as any).block_type || block.card_size || 'featured-single';
  const news_articles: NewsArticleWithDetails[] = (block as any).news_articles || (block.news ? [block.news] : []);

  // Если нет новостей для отображения
  if (!news_articles || news_articles.length === 0) {
    return null;
  }

  // Рендер в зависимости от типа блока
  const renderBlock = () => {
    switch (block_type) {
      case 'featured-single':
        // Главная новость на всю ширину (3 колонки)
        return (
          <div className="w-full">
            <NewsCard
              news={news_articles[0]}
              size="featured"
              showSummary={true}
              showRelatedBuildings={true}
              showMetrics={true}
            />
          </div>
        );

      case 'row-2':
        // Две равные карточки в ряд (по 1.5 колонки каждая)
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news_articles.slice(0, 2).map((news: NewsArticleWithDetails) => (
              <NewsCard
                key={news.id}
                news={news}
                size="medium"
                showSummary={true}
                showRelatedBuildings={false}
                showMetrics={true}
              />
            ))}
          </div>
        );

      case 'row-3':
        // Три равные карточки в ряд (по 1 колонке каждая)
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news_articles.slice(0, 3).map((news: NewsArticleWithDetails) => (
              <NewsCard
                key={news.id}
                news={news}
                size="medium"
                showSummary={true}
                showRelatedBuildings={false}
                showMetrics={true}
              />
            ))}
          </div>
        );

      case 'mosaic':
        // Мозаика 2x2 (2 колонки × 2 ряда)
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news_articles.slice(0, 4).map((news: NewsArticleWithDetails) => (
              <NewsCard
                key={news.id}
                news={news}
                size="medium"
                showSummary={true}
                showRelatedBuildings={false}
                showMetrics={true}
              />
            ))}
          </div>
        );

      case 'complex-big-small':
        // Комплексный: слева 2×2 сетка (4 новости) + справа 2×1 колонка (2 новости)
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Левая часть: 2×2 сетка (занимает 2 колонки) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {news_articles.slice(0, 4).map((news: NewsArticleWithDetails) => (
                <NewsCard
                  key={news.id}
                  news={news}
                  size="small"
                  showSummary={true}
                  showRelatedBuildings={false}
                  showMetrics={true}
                />
              ))}
            </div>
            {/* Правая часть: 2×1 колонка (занимает 1 колонку) */}
            <div className="md:col-span-1 flex flex-col gap-6">
              {news_articles.slice(4, 6).map((news: NewsArticleWithDetails) => (
                <NewsCard
                  key={news.id}
                  news={news}
                  size="small"
                  showSummary={true}
                  showRelatedBuildings={false}
                  showMetrics={true}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`grid-block grid-block-${block_type} ${className}`}>
      {renderBlock()}
    </div>
  );
}
