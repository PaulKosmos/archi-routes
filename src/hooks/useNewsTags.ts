// hooks/useNewsTags.ts
// Хук для работы с тегами новостей

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import {
  NewsTag,
  CreateNewsTag,
  NewsCategory,
  NewsArticleTag
} from '@/types/news';

// ============================================================
// ТИПЫ ДЛЯ ХУКА
// ============================================================

interface UseNewsTagsOptions {
  autoFetch?: boolean;
  includeUnused?: boolean; // Включать неиспользуемые теги
}

interface UseNewsTagsReturn {
  // Состояние
  tags: NewsTag[];
  featuredTags: NewsTag[];
  loading: boolean;
  error: string | null;

  // Методы
  fetchTags: () => Promise<void>;
  fetchTagsByCategory: (category: NewsCategory) => Promise<NewsTag[]>;
  createTag: (tag: CreateNewsTag) => Promise<NewsTag | null>;
  updateTag: (id: string, updates: Partial<NewsTag>) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  getTagById: (id: string) => NewsTag | undefined;
  getTagBySlug: (slug: string) => NewsTag | undefined;
  searchTags: (query: string) => NewsTag[];
}

// ============================================================
// ОСНОВНОЙ ХУК
// ============================================================

export const useNewsTags = (options: UseNewsTagsOptions = {}): UseNewsTagsReturn => {
  const {
    autoFetch = true,
    includeUnused = true
  } = options;

  const supabase = useMemo(() => createClient(), []);

  const [tags, setTags] = useState<NewsTag[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // ПОЛУЧЕНИЕ ТЕГОВ
  // ============================================================

  /**
   * Загружает все теги из БД
   */
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('news_tags')
        .select('*')
        .order('display_order', { ascending: true })
        .order('usage_count', { ascending: false });

      if (!includeUnused) {
        query = query.gt('usage_count', 0);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTags(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tags';
      setError(errorMessage);
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, includeUnused]);

  /**
   * Загружает теги по категории
   */
  const fetchTagsByCategory = useCallback(async (category: NewsCategory): Promise<NewsTag[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('news_tags')
        .select('*')
        .eq('parent_category', category)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching tags by category:', err);
      return [];
    }
  }, [supabase]);

  // ============================================================
  // СОЗДАНИЕ, ОБНОВЛЕНИЕ, УДАЛЕНИЕ
  // ============================================================

  /**
   * Создает новый тег
   */
  const createTag = useCallback(async (tag: CreateNewsTag): Promise<NewsTag | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: createError } = await supabase
        .from('news_tags')
        .insert([tag])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Обновляем локальный список
      if (data) {
        setTags(prev => [...prev, data]);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag';
      setError(errorMessage);
      console.error('Error creating tag:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Обновляет существующий тег
   */
  const updateTag = useCallback(async (id: string, updates: Partial<NewsTag>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('news_tags')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Обновляем локальный список
      setTags(prev => prev.map(tag =>
        tag.id === id ? { ...tag, ...updates } : tag
      ));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      console.error('Error updating tag:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Удаляет тег
   */
  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('news_tags')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Обновляем локальный список
      setTags(prev => prev.filter(tag => tag.id !== id));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(errorMessage);
      console.error('Error deleting tag:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ============================================================

  /**
   * Находит тег по ID
   */
  const getTagById = useCallback((id: string): NewsTag | undefined => {
    return tags.find(tag => tag.id === id);
  }, [tags]);

  /**
   * Находит тег по slug
   */
  const getTagBySlug = useCallback((slug: string): NewsTag | undefined => {
    return tags.find(tag => tag.slug === slug);
  }, [tags]);

  /**
   * Поиск тегов по названию
   */
  const searchTags = useCallback((query: string): NewsTag[] => {
    if (!query.trim()) {
      return tags;
    }

    const lowerQuery = query.toLowerCase();
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(lowerQuery) ||
      tag.slug.toLowerCase().includes(lowerQuery) ||
      tag.description?.toLowerCase().includes(lowerQuery)
    );
  }, [tags]);

  // ============================================================
  // ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ
  // ============================================================

  /**
   * Featured теги (категории для фильтрации)
   */
  const featuredTags = useMemo(() => {
    return tags
      .filter(tag => tag.is_featured_category)
      .sort((a, b) => a.display_order - b.display_order);
  }, [tags]);

  // ============================================================
  // ЭФФЕКТЫ
  // ============================================================

  useEffect(() => {
    if (autoFetch) {
      fetchTags();
    }
  }, [autoFetch, fetchTags]);

  return {
    tags,
    featuredTags,
    loading,
    error,
    fetchTags,
    fetchTagsByCategory,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagBySlug,
    searchTags
  };
};

// ============================================================
// ДОПОЛНИТЕЛЬНЫЙ ХУК ДЛЯ РАБОТЫ СО СВЯЗЯМИ НОВОСТЬ-ТЕГ
// ============================================================

interface UseNewsArticleTagsReturn {
  loading: boolean;
  error: string | null;
  addTagToNews: (newsId: string, tagId: string) => Promise<boolean>;
  removeTagFromNews: (newsId: string, tagId: string) => Promise<boolean>;
  getTagsForNews: (newsId: string) => Promise<NewsTag[]>;
  setTagsForNews: (newsId: string, tagIds: string[]) => Promise<boolean>;
}

export const useNewsArticleTags = (): UseNewsArticleTagsReturn => {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Добавляет тег к новости
   */
  const addTagToNews = useCallback(async (newsId: string, tagId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: insertError } = await supabase
        .from('news_article_tags')
        .insert([{ news_id: newsId, tag_id: tagId }]);

      if (insertError) {
        throw insertError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tag to news';
      setError(errorMessage);
      console.error('Error adding tag to news:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Удаляет тег из новости
   */
  const removeTagFromNews = useCallback(async (newsId: string, tagId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('news_article_tags')
        .delete()
        .eq('news_id', newsId)
        .eq('tag_id', tagId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tag from news';
      setError(errorMessage);
      console.error('Error removing tag from news:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Получает все теги для новости
   */
  const getTagsForNews = useCallback(async (newsId: string): Promise<NewsTag[]> => {
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('news_article_tags')
        .select(`
          tag_id,
          news_tags (*)
        `)
        .eq('news_id', newsId);

      if (fetchError) {
        throw fetchError;
      }

      // Извлекаем теги из результата
      const tags = data
        ?.map((item: any) => item.news_tags)
        .filter(Boolean) as NewsTag[];

      return tags || [];
    } catch (err) {
      console.error('Error fetching tags for news:', err);
      return [];
    }
  }, [supabase]);

  /**
   * Устанавливает теги для новости (заменяет все существующие)
   */
  const setTagsForNews = useCallback(async (newsId: string, tagIds: string[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Удаляем все существующие связи
      const { error: deleteError } = await supabase
        .from('news_article_tags')
        .delete()
        .eq('news_id', newsId);

      if (deleteError) {
        throw deleteError;
      }

      // Если есть новые теги, добавляем их
      if (tagIds.length > 0) {
        const newLinks = tagIds.map(tagId => ({
          news_id: newsId,
          tag_id: tagId
        }));

        const { error: insertError } = await supabase
          .from('news_article_tags')
          .insert(newLinks);

        if (insertError) {
          throw insertError;
        }
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set tags for news';
      setError(errorMessage);
      console.error('Error setting tags for news:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    loading,
    error,
    addTagToNews,
    removeTagFromNews,
    getTagsForNews,
    setTagsForNews
  };
};

// ============================================================
// ХУК ДЛЯ ПОПУЛЯРНЫХ ТЕГОВ
// ============================================================

interface UsePopularTagsReturn {
  popularTags: NewsTag[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePopularTags = (limit: number = 20): UsePopularTagsReturn => {
  const supabase = useMemo(() => createClient(), []);
  const [popularTags, setPopularTags] = useState<NewsTag[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPopularTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Используем SQL функцию из БД
      const { data, error: fetchError } = await supabase
        .rpc('get_popular_tags', { limit_count: limit });

      if (fetchError) {
        throw fetchError;
      }

      setPopularTags(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular tags';
      setError(errorMessage);
      console.error('Error fetching popular tags:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, limit]);

  useEffect(() => {
    fetchPopularTags();
  }, [fetchPopularTags]);

  return {
    popularTags,
    loading,
    error,
    refetch: fetchPopularTags
  };
};
