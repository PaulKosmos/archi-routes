'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NewsArticle } from '@/types/news';
import { createClient } from '@/lib/supabase';
import NewsCard from '@/components/news/NewsCard';
import { Building2, ChevronRight, Calendar, Eye } from 'lucide-react';

interface BuildingNewsProps {
  buildingId: string;
  buildingName: string;
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export default function BuildingNews({
  buildingId,
  buildingName,
  limit = 6,
  showTitle = true,
  className = ''
}: BuildingNewsProps) {
  const supabase = useMemo(() => createClient(), []);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBuildingNews = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏢 [DEBUG] Загружаем новости для здания:', buildingId, buildingName);
      const newsStartTime = Date.now();

      // Используем API endpoint для получения новостей
      const response = await fetch(`/api/buildings/${buildingId}/news`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      const newsEndTime = Date.now();
      console.log('🏢 [DEBUG] News API took:', newsEndTime - newsStartTime, 'ms');

      if (!result.success) {
        throw new Error(result.error || 'News loading error');
      }

      setNews(result.news || []);
      setTotalCount(result.count || 0);
      console.log(`✅ Загружено ${result.news?.length || 0} новостей из ${result.count || 0} для здания ${buildingName}`);

    } catch (err) {
      console.error('🏢 [ERROR] Ошибка загрузки новостей здания:', err);
      if (err instanceof Error) {
        console.error('🏢 [ERROR] Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      setError(err instanceof Error ? err.message : 'Error loading news');
    } finally {
      console.log('🏢 [DEBUG] News loading finished');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buildingId) {
      fetchBuildingNews();
    }
  }, [buildingId, limit]);

  if (loading) {
    return (
      <div className={`bg-card rounded-[var(--radius)] border border-border p-6 ${className}`}>
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold font-display text-foreground">News About This Object</h3>
          </div>
        )}
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-20 h-20 bg-muted rounded-[var(--radius)]"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-destructive/10 border border-destructive rounded-[var(--radius)] p-6 ${className}`}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className={`bg-muted border border-border rounded-[var(--radius)] p-6 text-center ${className}`}>
        <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">
          No news about this building yet
        </p>
        <Link
          href="/news"
          className="inline-block mt-2 text-primary hover:text-primary/80 text-sm transition-colors"
        >
          View all news
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-[var(--radius)] border border-border overflow-hidden ${className}`}>

      {/* Заголовок */}
      {showTitle && (
        <div className="bg-muted/30 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold font-display text-foreground">
                Building News
              </h3>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium font-metrics">
                {totalCount}
              </span>
            </div>

            {totalCount > limit && (
              <Link
                href={`/news?building=${buildingId}`}
                className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                All news
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Компактные карточки новостей */}
        <div className="space-y-4">
          {news.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="flex gap-4 p-4 rounded-[var(--radius)] border border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 group"
            >
              {/* Изображение */}
              {article.featured_image_url && (
                <div className="relative w-20 h-20 rounded-[var(--radius)] overflow-hidden flex-shrink-0">
                  <Image
                    src={article.featured_image_url}
                    alt={article.featured_image_alt || article.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    sizes="80px"
                  />
                </div>
              )}

              {/* Контент */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold font-display text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
                  {article.title}
                </h4>

                {article.summary && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-metrics">
                  {article.published_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(article.published_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{article.views_count || 0}</span>
                  </div>

                  {article.category && (
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">
                      {article.category === 'projects' && 'Projects'}
                      {article.category === 'events' && 'Events'}
                      {article.category === 'personalities' && 'Personalities'}
                      {article.category === 'trends' && 'Trends'}
                      {article.category === 'planning' && 'Planning'}
                      {article.category === 'heritage' && 'Heritage'}
                    </span>
                  )}
                </div>
              </div>

              {/* Стрелка */}
              <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>

        {/* Ссылка на все новости */}
        {totalCount > limit && (
          <div className="mt-6 pt-4 border-t border-border text-center">
            <Link
              href={`/news?building=${buildingId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[var(--radius)] hover:bg-primary/90 transition-colors"
            >
              View all {totalCount} news
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
