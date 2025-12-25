'use client';

import React from 'react';
import Link from 'next/link';
import { NewsArticleWithDetails } from '@/types/news';
import { Calendar, Eye, Heart, Clock, MessageCircle } from 'lucide-react';
import LikeButton from '@/components/LikeButton';

interface NewsCardProps {
  news: NewsArticleWithDetails;
  variant?: 'compact' | 'horizontal' | 'featured';
  className?: string;
  disableLink?: boolean;
}

export default function NewsCard({
  news,
  variant = 'compact',
  className = '',
  disableLink = false
}: NewsCardProps) {

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getCategoryName = (category: string) => {
    const categories = {
      'projects': 'Архитектурные проекты',
      'events': 'События',
      'personalities': 'Персоналии',
      'trends': 'Тренды',
      'planning': 'Городское планирование',
      'heritage': 'Наследие'
    };
    return categories[category as keyof typeof categories] || category;
  };

  const readingTime = Math.max(1, Math.round((news.content?.length || 0) / 1000));

  // Вариант horizontal (для featured новости)
  if (variant === 'horizontal' || variant === 'featured') {
    const content = (
      <article className={`group bg-card border border-border overflow-hidden hover:shadow-md transition-shadow h-full ${className}`}>
          <div className="flex flex-col md:flex-row md:h-[320px]">
            <div className="md:w-2/5 relative aspect-[4/3] md:aspect-auto overflow-hidden">
              {news.featured_image_url ? (
                <img
                  src={news.featured_image_url}
                  alt={news.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Изображение отсутствует</span>
                </div>
              )}
              {news.category && (
                <span className="absolute top-3 left-3 bg-[hsl(var(--news-primary))] text-white px-3 py-1 text-xs font-medium border-0 rounded-full">
                  {getCategoryName(news.category)}
                </span>
              )}
              {news.featured && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 text-xs font-medium border-0 rounded-full">
                  Главная новость
                </span>
              )}
            </div>
            <div className="md:w-3/5 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {news.published_at && formatDate(news.published_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readingTime} мин
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2 group-hover:text-[hsl(var(--news-primary))] transition-colors line-clamp-2">
                  {news.title}
                </h3>
                {news.summary && (
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{news.summary}</p>
                )}
                {news.buildings && news.buildings.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {news.buildings.slice(0, 4).map((building) => (
                      <span
                        key={building.id}
                        className="inline-flex items-center bg-[hsl(var(--news-primary))]/10 text-[hsl(var(--news-primary))] px-2 py-1 text-xs font-medium rounded-full"
                      >
                        {building.name}
                      </span>
                    ))}
                  </div>
                )}
                {news.tags && news.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {news.tags.slice(0, 4).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center text-xs font-normal border border-border px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-metrics">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {news.views_count || 0}
                  </span>
                  <LikeButton
                    type="news"
                    itemId={news.id}
                    initialCount={news.likes_count || 0}
                    variant="compact"
                    showCount={true}
                  />
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {news.comments_count || 0}
                  </span>
                </div>
                <button className="text-xs text-[hsl(var(--news-primary))] font-medium hover:underline">
                  Читать далее →
                </button>
              </div>
            </div>
          </div>
        </article>
    );

    return disableLink ? content : <Link href={`/news/${news.slug}`}>{content}</Link>;
  }

  // Вариант compact (для сетки 3 колонки)
  const content = (
    <article className={`group bg-card border border-border overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col ${className}`}>
        <div className="relative aspect-[3/2] overflow-hidden">
          {news.featured_image_url ? (
            <img
              src={news.featured_image_url}
              alt={news.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Изображение отсутствует</span>
            </div>
          )}
          {news.category && (
            <span className="absolute top-3 left-3 bg-[hsl(var(--news-primary))] text-white px-3 py-1 text-xs font-medium border-0 rounded-full">
              {getCategoryName(news.category)}
            </span>
          )}
        </div>
        <div className="p-3 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {news.published_at && formatDate(news.published_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTime} мин
              </span>
            </div>
            <h3 className="font-semibold text-sm mb-2 group-hover:text-[hsl(var(--news-primary))] transition-colors line-clamp-2">
              {news.title}
            </h3>
            {news.summary && (
              <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{news.summary}</p>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-metrics">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {news.views_count || 0}
              </span>
              <LikeButton
                type="news"
                itemId={news.id}
                initialCount={news.likes_count || 0}
                variant="compact"
                showCount={true}
              />
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {news.comments_count || 0}
              </span>
            </div>
            <button className="text-xs text-[hsl(var(--news-primary))] font-medium hover:underline">
              Читать далее →
            </button>
          </div>
        </div>
      </article>
  );

  return disableLink ? content : <Link href={`/news/${news.slug}`}>{content}</Link>;
}
