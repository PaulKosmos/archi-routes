// hooks/useNewsGridAPI.ts
// Хук для работы с конструктором сетки новостей (масштабируемые карточки)

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';
import {
  NewsGridCard,
  NewsGridCardWithNews,
  CreateNewsGridCard,
  UpdateNewsGridCard,
  GridSpan,
  CardSize,
  canEditNewsGrid
} from '@/types/news';

export function useNewsGridAPI() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка прав доступа
  const canEdit = useMemo(() => {
    return profile?.role ? canEditNewsGrid(profile.role) : false;
  }, [profile?.role]);

  // Получить все активные карточки сетки
  const fetchGridCards = useCallback(async (includeNews = false): Promise<NewsGridCard[] | NewsGridCardWithNews[]> => {
    setLoading(true);
    setError(null);

    try {
      if (includeNews) {
        // Загружаем карточки с JOIN к новостям
        const { data: cards, error: fetchError } = await supabase
          .from('news_grid_blocks')
          .select(`
            *,
            news:architecture_news!news_id (*)
          `)
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        console.log('📊 fetchGridCards: Loaded', cards?.length || 0, 'cards with news from DB');
        return cards || [];
      } else {
        // Загружаем только карточки без новостей
        const { data: cards, error: fetchError } = await supabase
          .from('news_grid_blocks')
          .select('*')
          .eq('is_active', true)
          .order('position', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        console.log('📊 fetchGridCards: Loaded', cards?.length || 0, 'cards without news from DB');
        return cards || [];
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch grid cards';
      setError(errorMessage);
      console.error('Error fetching grid cards:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Добавить новость в сетку (создать карточку)
  const addCardToGrid = useCallback(async (
    newsId: string,
    position: number,
    options?: {
      colSpan?: GridSpan;
      rowSpan?: GridSpan;
      cardSize?: CardSize;
    }
  ): Promise<NewsGridCard | null> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to add cards to grid');
    }

    setLoading(true);
    setError(null);

    try {
      const cardData: CreateNewsGridCard = {
        news_id: newsId,
        position,
        col_span: options?.colSpan || 1,
        row_span: options?.rowSpan || 1,
        card_size: options?.cardSize || 'medium',
        is_active: true
      };

      const { data, error: createError } = await supabase
        .from('news_grid_blocks')
        .insert([{
          ...cardData,
          created_by: user.id
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      console.log('✅ addCardToGrid: Created card for news', newsId, 'at position', position);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add card to grid';
      setError(errorMessage);
      console.error('Error adding card to grid:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  // Обновить существующую карточку
  const updateCard = useCallback(async (cardId: string, updateData: Partial<UpdateNewsGridCard>): Promise<NewsGridCard | null> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to update grid cards');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('news_grid_blocks')
        .update(updateData)
        .eq('id', cardId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ updateCard: Updated card', cardId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update grid card';
      setError(errorMessage);
      console.error('Error updating grid card:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  // Изменить размер карточки (col_span × row_span)
  const updateCardSize = useCallback(async (
    cardId: string,
    colSpan: GridSpan,
    rowSpan: GridSpan,
    cardSize?: CardSize
  ): Promise<NewsGridCard | null> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to update card size');
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Partial<UpdateNewsGridCard> = {
        col_span: colSpan,
        row_span: rowSpan
      };

      // Если передан cardSize, обновляем его тоже
      if (cardSize) {
        updateData.card_size = cardSize;
      }

      const { data, error: updateError } = await supabase
        .from('news_grid_blocks')
        .update(updateData)
        .eq('id', cardId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      console.log('✅ updateCardSize: Updated card', cardId, 'to', colSpan, '×', rowSpan);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update card size';
      setError(errorMessage);
      console.error('Error updating card size:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  // Удалить карточку
  const deleteCard = useCallback(async (cardId: string): Promise<boolean> => {
    if (!user || !profile || profile.role !== 'admin') {
      throw new Error('Only admins can delete grid cards');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('news_grid_blocks')
        .delete()
        .eq('id', cardId);

      if (deleteError) {
        throw deleteError;
      }

      console.log('✅ deleteCard: Deleted card', cardId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete grid card';
      setError(errorMessage);
      console.error('Error deleting grid card:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, profile, supabase]);

  // Изменить порядок карточки (drag & drop)
  const reorderCard = useCallback(async (cardId: string, newPosition: number): Promise<boolean> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to reorder grid cards');
    }

    setLoading(true);
    setError(null);

    try {
      // Вызываем функцию из базы данных для атомарного изменения порядка
      const { error: reorderError } = await supabase
        .rpc('reorder_news_grid_cards', {
          card_id: cardId,
          new_position: newPosition
        });

      if (reorderError) {
        throw reorderError;
      }

      console.log('✅ reorderCard: Reordered card', cardId, 'to position', newPosition);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder grid card';
      setError(errorMessage);
      console.error('Error reordering grid card:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  // Деактивировать карточку (вместо удаления)
  const deactivateCard = useCallback(async (cardId: string): Promise<boolean> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to deactivate grid cards');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('news_grid_blocks')
        .update({ is_active: false })
        .eq('id', cardId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ deactivateCard: Deactivated card', cardId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate grid card';
      setError(errorMessage);
      console.error('Error deactivating grid card:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  // Активировать карточку
  const activateCard = useCallback(async (cardId: string): Promise<boolean> => {
    if (!user || !canEdit) {
      throw new Error('Insufficient permissions to activate grid cards');
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('news_grid_blocks')
        .update({ is_active: true })
        .eq('id', cardId);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ activateCard: Activated card', cardId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate grid card';
      setError(errorMessage);
      console.error('Error activating grid card:', err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, canEdit, supabase]);

  return {
    // State
    loading,
    error,
    canEdit,

    // Methods - новая система карточек
    fetchGridCards,
    addCardToGrid,
    updateCard,
    updateCardSize,
    deleteCard,
    reorderCard,
    deactivateCard,
    activateCard,

    // Deprecated - старые названия для обратной совместимости
    /** @deprecated Use fetchGridCards instead */
    fetchGridBlocks: fetchGridCards,
    /** @deprecated Use addCardToGrid instead */
    createBlock: addCardToGrid,
    /** @deprecated Use updateCard instead */
    updateBlock: updateCard,
    /** @deprecated Use deleteCard instead */
    deleteBlock: deleteCard,
    /** @deprecated Use reorderCard instead */
    reorderBlock: reorderCard,
    /** @deprecated Use deactivateCard instead */
    deactivateBlock: deactivateCard,
    /** @deprecated Use activateCard instead */
    activateBlock: activateCard
  };
}
