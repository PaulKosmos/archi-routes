// hooks/useNewsAPI.ts
// Расширенный клиентский хук для работы с новостями через Supabase

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';
import {
  CreateNewsArticle,
  UpdateNewsArticle,
  NewsFilters,
  NewsSortOptions,
  ContentBlock,
  CreateContentBlock
} from '@/types/news';

export function useNewsAPI() {
  const supabase = useMemo(() => createClient(), [])
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNews = async (newsData: CreateNewsArticle) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Генерация slug если не предоставлен
      if (!newsData.slug) {
        newsData.slug = newsData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 100);
      }

      const { data, error: createError } = await supabase
        .from('architecture_news')
        .insert([{
          ...newsData,
          author_id: user.id,
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create news';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateNews = async (newsId: string, updateData: Partial<UpdateNewsArticle>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Если статус меняется на published, устанавливаем published_at
      if (updateData.status === 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase
        .from('architecture_news')
        .update({
          ...updateData,
          editor_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', newsId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update news';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteNews = async (newsId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('architecture_news')
        .delete()
        .eq('id', newsId);

      if (deleteError) {
        throw deleteError;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete news';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async (filters: NewsFilters = {}, sort: NewsSortOptions = { field: 'published_at', direction: 'desc' }, page: number = 1, limit: number = 12) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('architecture_news').select('*', { count: 'exact' });

      // Применение фильтров
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.subcategory) {
        query = query.eq('subcategory', filters.subcategory);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      if (filters.region) {
        query = query.eq('region', filters.region);
      }
      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }
      if (filters.date_from) {
        query = query.gte('published_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('published_at', filters.date_to);
      }
      if (filters.has_buildings) {
        query = query.not('related_buildings', 'eq', '{}');
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase().trim();
        query = query.or(`slug.eq.${searchTerm},slug.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      // Сортировка
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Пагинация
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        pages: Math.ceil((count || 0) / limit),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const searchBuildings = async (query: string) => {
    if (query.length < 2) return [];

    try {
      console.log('🔍 Searching buildings for query:', query);
      
      const { data: buildings, error } = await supabase
        .from('buildings')
        .select('id, name, architect, city, country, image_url, year_built, architectural_style') // ✅ Используем image_url как в рабочем компоненте
        .or(`name.ilike.%${query}%,architect.ilike.%${query}%,city.ilike.%${query}%`)
        .order('name')
        .limit(10);

      if (error) {
        console.error('❌ Building search error:', error.message, error.code);
        throw new Error(`Building search failed: ${error.message}`);
      }

      console.log('✅ Buildings found:', buildings?.length || 0);
      return buildings || [];
      
    } catch (err) {
      console.error('❌ Building search failed:', err);
      // Возвращаем пустой массив вместо ошибки
      return [];
    }
  };

  // ============================================================
  // РАБОТА С БЛОКАМИ КОНТЕНТА
  // ============================================================

  /**
   * Получает блоки контента для новости
   */
  const fetchContentBlocks = async (newsId: string): Promise<ContentBlock[]> => {
    try {
      const { data, error } = await supabase
        .from('news_content_blocks')
        .select('*')
        .eq('news_id', newsId)
        .order('order_index', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching content blocks:', err);
      return [];
    }
  };

  /**
   * Создает блок контента
   */
  const createContentBlock = async (block: CreateContentBlock): Promise<ContentBlock | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from('news_content_blocks')
        .insert([block])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create content block';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обновляет блок контента
   */
  const updateContentBlock = async (
    blockId: string,
    updates: Partial<ContentBlock>
  ): Promise<ContentBlock | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('news_content_blocks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', blockId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update content block';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Удаляет блок контента
   */
  const deleteContentBlock = async (blockId: string): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('news_content_blocks')
        .delete()
        .eq('id', blockId);

      if (deleteError) {
        throw deleteError;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete content block';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Массово обновляет блоки (для drag & drop)
   */
  const updateContentBlocksOrder = async (
    blocks: Array<{ id: string; order_index: number }>
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Обновляем каждый блок
      const promises = blocks.map(block =>
        supabase
          .from('news_content_blocks')
          .update({ order_index: block.order_index })
          .eq('id', block.id)
      );

      const results = await Promise.all(promises);

      // Проверяем ошибки
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Failed to update some blocks');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update blocks order';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Сохраняет все блоки для новости (заменяет существующие)
   */
  const saveAllContentBlocks = async (
    newsId: string,
    blocks: CreateContentBlock[]
  ): Promise<boolean> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Удаляем все существующие блоки
      const { error: deleteError } = await supabase
        .from('news_content_blocks')
        .delete()
        .eq('news_id', newsId);

      if (deleteError) {
        throw deleteError;
      }

      // Если есть новые блоки, вставляем их
      if (blocks.length > 0) {
        const { error: insertError } = await supabase
          .from('news_content_blocks')
          .insert(blocks);

        if (insertError) {
          throw insertError;
        }
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save content blocks';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    // Существующие методы
    createNews,
    updateNews,
    deleteNews,
    fetchNews,
    searchBuildings,

    // Новые методы для блоков
    fetchContentBlocks,
    createContentBlock,
    updateContentBlock,
    deleteContentBlock,
    updateContentBlocksOrder,
    saveAllContentBlocks,

    // Состояние
    loading,
    error,
  };
}
