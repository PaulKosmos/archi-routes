// hooks/useRelatedNews.ts
// Хук для получения похожих и связанных новостей

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { NewsArticle, NewsArticleWithDetails } from '@/types/news';

// ============================================================
// ТИПЫ ДЛЯ ХУКА
// ============================================================

interface RelatedNewsWithScore extends NewsArticle {
  relevance_score?: number;
}

interface UseRelatedNewsOptions {
  newsId: string;
  limit?: number;
  autoFetch?: boolean;
  useSimpleAlgorithm?: boolean; // Использовать упрощенный алгоритм
}

interface UseRelatedNewsReturn {
  relatedNews: RelatedNewsWithScore[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================
// ОСНОВНОЙ ХУК ДЛЯ ПОХОЖИХ НОВОСТЕЙ
// ============================================================

export const useRelatedNews = (options: UseRelatedNewsOptions): UseRelatedNewsReturn => {
  const {
    newsId,
    limit = 6,
    autoFetch = true,
    useSimpleAlgorithm = false
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [relatedNews, setRelatedNews] = useState<RelatedNewsWithScore[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Загружает похожие новости используя SQL функцию
   */
  const fetchRelatedNews = useCallback(async () => {
    if (!newsId) return;

    try {
      setLoading(true);
      setError(null);

      const functionName = useSimpleAlgorithm
        ? 'get_related_news_simple'
        : 'get_related_news';

      const { data, error: fetchError } = await supabase
        .rpc(functionName, {
          news_id_param: newsId,
          limit_count: limit
        });

      if (fetchError) {
        throw fetchError;
      }

      setRelatedNews(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch related news';
      setError(errorMessage);
      console.error('Error fetching related news:', err);
      setRelatedNews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, newsId, limit, useSimpleAlgorithm]);

  useEffect(() => {
    if (autoFetch && newsId) {
      fetchRelatedNews();
    }
  }, [autoFetch, newsId, fetchRelatedNews]);

  return {
    relatedNews,
    loading,
    error,
    refetch: fetchRelatedNews
  };
};

// ============================================================
// ХУК ДЛЯ НОВОСТЕЙ ПО ЗДАНИЮ
// ============================================================

interface UseNewsByBuildingOptions {
  buildingId: string;
  limit?: number;
  autoFetch?: boolean;
}

interface UseNewsByBuildingReturn {
  news: NewsArticle[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNewsByBuilding = (options: UseNewsByBuildingOptions): UseNewsByBuildingReturn => {
  const {
    buildingId,
    limit = 10,
    autoFetch = true
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNewsByBuilding = useCallback(async () => {
    if (!buildingId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_news_by_building', {
          building_id_param: buildingId,
          limit_count: limit
        });

      if (fetchError) {
        throw fetchError;
      }

      setNews(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news by building';
      setError(errorMessage);
      console.error('Error fetching news by building:', err);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, buildingId, limit]);

  useEffect(() => {
    if (autoFetch && buildingId) {
      fetchNewsByBuilding();
    }
  }, [autoFetch, buildingId, fetchNewsByBuilding]);

  return {
    news,
    loading,
    error,
    refetch: fetchNewsByBuilding
  };
};

// ============================================================
// ХУК ДЛЯ НОВОСТЕЙ ПО ТЕГУ
// ============================================================

interface UseNewsByTagOptions {
  tagId: string;
  limit?: number;
  offset?: number;
  autoFetch?: boolean;
}

interface UseNewsByTagReturn {
  news: NewsArticle[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useNewsByTag = (options: UseNewsByTagOptions): UseNewsByTagReturn => {
  const {
    tagId,
    limit = 20,
    offset = 0,
    autoFetch = true
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [news, setNews] = useState<NewsArticle[]>([]);
  const [currentOffset, setCurrentOffset] = useState<number>(offset);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchNewsByTag = useCallback(async (offsetValue: number = 0, append: boolean = false) => {
    if (!tagId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_news_by_tag', {
          tag_id_param: tagId,
          limit_count: limit,
          offset_count: offsetValue
        });

      if (fetchError) {
        throw fetchError;
      }

      const fetchedNews = data || [];

      if (append) {
        setNews(prev => [...prev, ...fetchedNews]);
      } else {
        setNews(fetchedNews);
      }

      setHasMore(fetchedNews.length === limit);
      setCurrentOffset(offsetValue);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news by tag';
      setError(errorMessage);
      console.error('Error fetching news by tag:', err);
      if (!append) {
        setNews([]);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, tagId, limit]);

  const fetchMore = useCallback(async () => {
    const nextOffset = currentOffset + limit;
    await fetchNewsByTag(nextOffset, true);
  }, [currentOffset, limit, fetchNewsByTag]);

  const refetch = useCallback(async () => {
    setCurrentOffset(0);
    await fetchNewsByTag(0, false);
  }, [fetchNewsByTag]);

  useEffect(() => {
    if (autoFetch && tagId) {
      fetchNewsByTag(offset);
    }
  }, [autoFetch, tagId, offset, fetchNewsByTag]);

  return {
    news,
    loading,
    error,
    hasMore,
    fetchMore,
    refetch
  };
};

// ============================================================
// ХУК ДЛЯ ПОПУЛЯРНЫХ/TRENDING НОВОСТЕЙ
// ============================================================

interface UseTrendingNewsOptions {
  daysBack?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface TrendingNewsItem extends NewsArticle {
  trending_score: number;
}

interface UseTrendingNewsReturn {
  trendingNews: TrendingNewsItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTrendingNews = (options: UseTrendingNewsOptions = {}): UseTrendingNewsReturn => {
  const {
    daysBack = 30,
    limit = 10,
    autoFetch = true
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [trendingNews, setTrendingNews] = useState<TrendingNewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_trending_news', {
          days_back: daysBack,
          limit_count: limit
        });

      if (fetchError) {
        throw fetchError;
      }

      setTrendingNews(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trending news';
      setError(errorMessage);
      console.error('Error fetching trending news:', err);
      setTrendingNews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, daysBack, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchTrendingNews();
    }
  }, [autoFetch, fetchTrendingNews]);

  return {
    trendingNews,
    loading,
    error,
    refetch: fetchTrendingNews
  };
};

// ============================================================
// ХУК ДЛЯ ПОЛУЧЕНИЯ НЕСКОЛЬКИХ НОВОСТЕЙ ПО ID
// ============================================================

interface UseNewsListByIdsOptions {
  newsIds: string[];
  autoFetch?: boolean;
}

interface UseNewsListByIdsReturn {
  newsList: NewsArticle[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useNewsListByIds = (options: UseNewsListByIdsOptions): UseNewsListByIdsReturn => {
  const { newsIds, autoFetch = true } = options;

  const supabase = useMemo(() => createClient(), []);

  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNewsList = useCallback(async () => {
    if (!newsIds || newsIds.length === 0) {
      setNewsList([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('architecture_news')
        .select('*')
        .in('id', newsIds)
        .eq('status', 'published');

      if (fetchError) {
        throw fetchError;
      }

      // Сортируем в том же порядке, что и newsIds
      const sortedNews = newsIds
        .map(id => data?.find(n => n.id === id))
        .filter(Boolean) as NewsArticle[];

      setNewsList(sortedNews);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news list';
      setError(errorMessage);
      console.error('Error fetching news list:', err);
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, newsIds]);

  useEffect(() => {
    if (autoFetch) {
      fetchNewsList();
    }
  }, [autoFetch, fetchNewsList]);

  return {
    newsList,
    loading,
    error,
    refetch: fetchNewsList
  };
};

// ============================================================
// ХУК ДЛЯ "ЧИТАЙТЕ ТАКЖЕ" (КОМБИНИРОВАННАЯ ЛОГИКА)
// ============================================================

interface UseReadAlsoOptions {
  currentNewsId: string;
  category?: string;
  buildingIds?: string[];
  limit?: number;
  autoFetch?: boolean;
}

interface UseReadAlsoReturn {
  readAlsoNews: NewsArticle[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Комбинированный хук для секции "Читайте также"
 * Сначала пытается найти похожие новости, если их мало - добавляет из той же категории
 */
export const useReadAlso = (options: UseReadAlsoOptions): UseReadAlsoReturn => {
  const {
    currentNewsId,
    category,
    buildingIds = [],
    limit = 4,
    autoFetch = true
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [readAlsoNews, setReadAlsoNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadAlso = useCallback(async () => {
    if (!currentNewsId) return;

    try {
      setLoading(true);
      setError(null);

      // Сначала пытаемся получить похожие новости
      const { data: relatedData, error: relatedError } = await supabase
        .rpc('get_related_news_simple', {
          news_id_param: currentNewsId,
          limit_count: limit
        });

      if (relatedError) {
        throw relatedError;
      }

      let finalNews = relatedData || [];

      // Если похожих новостей меньше лимита, добавляем из той же категории
      if (finalNews.length < limit && category) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('architecture_news')
          .select('*')
          .eq('category', category)
          .eq('status', 'published')
          .neq('id', currentNewsId)
          .order('published_at', { ascending: false })
          .limit(limit - finalNews.length);

        if (categoryError) {
          throw categoryError;
        }

        // Добавляем новости из категории, которых еще нет
        const existingIds = new Set(finalNews.map(n => n.id));
        const additionalNews = (categoryData || []).filter(n => !existingIds.has(n.id));
        finalNews = [...finalNews, ...additionalNews];
      }

      setReadAlsoNews(finalNews.slice(0, limit));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch read also news';
      setError(errorMessage);
      console.error('Error fetching read also news:', err);
      setReadAlsoNews([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentNewsId, category, limit]);

  useEffect(() => {
    if (autoFetch && currentNewsId) {
      fetchReadAlso();
    }
  }, [autoFetch, currentNewsId, fetchReadAlso]);

  return {
    readAlsoNews,
    loading,
    error,
    refetch: fetchReadAlso
  };
};
