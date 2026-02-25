'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Save, X as XIcon, Maximize2 } from 'lucide-react';
import { useNewsGridAPI } from '@/hooks/useNewsGridAPI';
import { useNewsAPI } from '@/hooks/useNewsAPI';
import GridCardsRenderer from './GridCardsRenderer';
import CardSizePopover from './CardSizePopover';
import NewsSelector from './NewsSelector';
import NewsCard from '@/components/news/NewsCard';
import {
  NewsGridCardWithNews,
  CardSizeConfig,
  NewsArticle
} from '@/types/news';

interface GridEditorProps {
  onSave?: () => void;
  onCancel?: () => void;
  featuredNews?: NewsArticle | null;
}

/**
 * GridEditor - Инлайновый редактор сетки новостей
 *
 * Функционал:
 * - Автоматическая синхронизация с опубликованными новостями
 * - Drag & drop для изменения порядка карточек
 * - Popover для изменения размера карточки (клик по кнопке на карточке)
 * - Добавление новой карточки (выбор новости)
 * - Удаление карточки
 * - Сохранение/отмена изменений
 *
 * Новая система: каждая карточка = одна новость с настраиваемым размером (col_span × row_span)
 */
export default function GridEditor({ onSave, onCancel, featuredNews }: GridEditorProps) {
  const {
    fetchGridCards,
    addCardToGrid,
    updateCardSize,
    deleteCard,
    updateCardPositions,
    loading,
    error
  } = useNewsGridAPI();

  const { fetchNews } = useNewsAPI();

  const [cards, setCards] = useState<NewsGridCardWithNews[]>([]);
  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [showNewsSelector, setShowNewsSelector] = useState(false);
  const [showSizePopover, setShowSizePopover] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Требуется переместить на 8px для активации drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Загрузка карточек и всех опубликованных новостей при монтировании
  useEffect(() => {
    loadCards();
    loadAllNews();
  }, []);

  const loadCards = async () => {
    const data = await fetchGridCards(true) as NewsGridCardWithNews[];
    setCards(data);
  };

  const loadAllNews = async () => {
    const result = await fetchNews({ status: 'published' }, { field: 'published_at', direction: 'desc' }, 1, 100);
    setAllNews(result.data);
  };

  // Автоматическая синхронизация: создать карточки для всех новостей, которых еще нет в сетке
  const syncNewsToGrid = async () => {
    setIsSyncing(true);
    try {
      const existingNewsIds = cards.map(c => c.news_id);
      const newsToAdd = allNews.filter(news => !existingNewsIds.includes(news.id));

      if (newsToAdd.length === 0) {
        alert('All news already added to grid!');
        return;
      }

      // Создаем карточки для новостей, которых нет в сетке
      for (let i = 0; i < newsToAdd.length; i++) {
        await addCardToGrid(
          newsToAdd[i].id,
          cards.length + i,
          {
            colSpan: 1,
            rowSpan: 1,
            cardSize: 'medium'
          }
        );
      }

      // Перезагружаем карточки
      await loadCards();
      setHasChanges(true);
      alert(`Added ${newsToAdd.length} news to grid!`);
    } catch (err) {
      console.error('Error syncing news to grid:', err);
      alert('Error synchronizing news');
    } finally {
      setIsSyncing(false);
    }
  };

  // Отфильтрованные карточки - исключаем featured новость
  const filteredCards = useMemo(() => {
    if (!featuredNews) return cards;
    return cards.filter(card => card.news_id !== featuredNews.id);
  }, [cards, featuredNews]);

  // Получить все используемые ID новостей
  const usedNewsIds = useMemo(() => {
    return filteredCards.map((card) => card.news_id).filter(Boolean);
  }, [filteredCards]);

  // Обработчик завершения перетаскивания
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🔄 handleDragEnd called', { activeId: active.id, overId: over?.id });

    if (over && active.id !== over.id) {
      const oldIndex = filteredCards.findIndex((c) => c.id === active.id);
      const newIndex = filteredCards.findIndex((c) => c.id === over.id);
      console.log('🔄 Moving card from index', oldIndex, 'to', newIndex);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Сохраняем старое состояние для отката
        const oldCards = [...filteredCards];
        const newCards = arrayMove(filteredCards, oldIndex, newIndex);

        // Создаем новый массив cards с обновленными позициями
        // Нужно обновить исходный массив cards, добавив обратно featured новость если она была
        const featuredCard = cards.find(c => c.news_id === featuredNews?.id);
        const updatedCards = featuredCard ? [featuredCard, ...newCards] : newCards;

        // Оптимистичное обновление UI
        setCards(updatedCards);
        setHasChanges(true);
        console.log('🔄 Optimistic UI update done');

        // Обновляем позиции на сервере - обновляем ВСЕ карточки в новом порядке
        try {
          const positionUpdates = newCards.map((card, index) => ({
            id: card.id,
            position: index
          }));
          console.log('🔄 Updating positions for', positionUpdates.length, 'cards');

          await updateCardPositions(positionUpdates);

          console.log('✅ Positions updated successfully');
          // Перезагружаем карточки после успешного обновления
          await loadCards();
        } catch (err) {
          console.error('❌ Error updating positions:', err);
          // Откатываем изменения при ошибке - возвращаем старый массив
          const oldCardsRestored = featuredCard ? [featuredCard, ...oldCards] : oldCards;
          setCards(oldCardsRestored);
          console.log('🔄 Rolled back to old state');
        }
      } else {
        console.warn('⚠️ Invalid indices:', { oldIndex, newIndex });
      }
    } else {
      console.log('ℹ️ Drag ended but no reorder needed');
    }
  };

  // Открыть модал выбора новости для добавления карточки
  const handleAddCard = () => {
    setShowNewsSelector(true);
  };

  // После выбора новости - создать карточку
  const handleNewsSelected = async (newsIds: string[]) => {
    if (newsIds.length === 0) return;

    try {
      // Создаем карточку с дефолтным размером 1×1 (medium)
      const newCard = await addCardToGrid(
        newsIds[0], // Берем первую выбранную новость
        cards.length, // Позиция в конце
        {
          colSpan: 1,
          rowSpan: 1,
          cardSize: 'medium'
        }
      );

      if (newCard) {
        await loadCards(); // Перезагружаем с полными данными
        setHasChanges(true);
      }
    } catch (err) {
      console.error('Error creating card:', err);
    }
  };

  // Открыть Popover для изменения размера карточки
  const handleCardClick = (cardId: string) => {
    setSelectedCardId(cardId);
    setShowSizePopover(true);
  };

  // Изменить размер карточки
  const handleSizeSelect = async (config: CardSizeConfig) => {
    if (!selectedCardId) return;

    try {
      await updateCardSize(
        selectedCardId,
        config.colSpan,
        config.rowSpan,
        config.cardSize
      );
      await loadCards();
      setHasChanges(true);
    } catch (err) {
      console.error('Error updating card size:', err);
    } finally {
      setShowSizePopover(false);
      setSelectedCardId(null);
    }
  };

  // Удалить карточку (пока не реализовано в UI, но API готово)
  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Remove this card from the grid?')) return;

    try {
      await deleteCard(cardId);
      await loadCards();
      setHasChanges(true);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  // Сохранить изменения
  const handleSave = () => {
    setHasChanges(false);
    onSave?.();
  };

  // Отмена
  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Leave without saving?')) {
        onCancel?.();
      }
    } else {
      onCancel?.();
    }
  };

  const selectedCard = selectedCardId
    ? cards.find((c) => c.id === selectedCardId)
    : null;

  return (
    <div className="space-y-6">
      {/* Fixed Header with Save/Cancel */}
      <div className="sticky top-0 z-30 bg-white shadow-lg">
        <div className="flex items-center justify-between p-4 bg-white border-b-2 border-[hsl(var(--news-primary))]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[hsl(var(--news-primary))] animate-pulse"></div>
              <h2 className="text-xl font-bold">Grid Edit Mode</h2>
            </div>
            {hasChanges && (
              <span className="text-sm text-orange-600 font-medium bg-orange-50 px-3 py-1.5 border border-orange-200 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 animate-pulse"></span>
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 bg-card border-2 border-border hover:bg-muted transition-all font-medium flex items-center gap-2"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={`px-5 py-2.5 font-medium transition-all flex items-center gap-2 ${hasChanges
                  ? 'bg-[hsl(var(--news-primary))] text-white hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
            >
              <Save className="w-4 h-4" />
              Save & Exit
            </button>
          </div>
        </div>

        {/* UX Tips Bar */}
        <div className="bg-white px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 text-[hsl(var(--news-primary))]">↔</span>
                <span><strong>Drag</strong> to reorder</span>
              </div>
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-[hsl(var(--news-primary))]" />
                <span><strong>Click "Resize"</strong> on a card</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[hsl(var(--news-primary))]" />
                <span><strong>Add</strong> a new card</span>
              </div>
            </div>

            {/* Sync Button */}
            <button
              onClick={syncNewsToGrid}
              disabled={isSyncing || loading}
              className="px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {isSyncing ? 'Syncing...' : 'Sync all articles'}
            </button>
          </div>
        </div>
      </div>

      {/* Featured News - Non-editable, always on top */}
      {featuredNews && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-amber-500 text-2xl">⭐</span>
              Featured Article
              <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold border border-amber-300 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Read-only
              </span>
            </h2>
            <div className="text-sm text-muted-foreground">
              Change in article settings
            </div>
          </div>

          {/* Featured news container - exactly 3 grid columns width */}
          <div
            className="relative border-4 border-amber-400 overflow-hidden shadow-lg max-h-[400px]"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)'
            }}
          >
            {/* Lock icon overlay */}
            <div className="absolute top-4 right-4 z-10 bg-amber-500 text-white p-2 shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>

            <NewsCard news={featuredNews} variant="horizontal" className="border-0" />
          </div>

          <p className="mt-2 text-sm text-muted-foreground italic flex items-center gap-1">
            <span className="text-amber-500">ℹ️</span>
            Featured article spans 3 columns and always appears first
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive text-destructive">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Grid Cards with Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredCards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <GridCardsRenderer
            cards={filteredCards}
            isEditMode={true}
            onCardClick={handleCardClick}
          />
        </SortableContext>
      </DndContext>

      {/* Add Card button */}
      <button
        onClick={handleAddCard}
        disabled={loading}
        className="w-full p-8 border-2 border-dashed border-[hsl(var(--news-primary))] hover:bg-muted transition-all flex flex-col items-center justify-center gap-3 text-[hsl(var(--news-primary))] font-semibold group"
      >
        <div className="w-12 h-12 bg-[hsl(var(--news-primary))]/10 group-hover:bg-[hsl(var(--news-primary))]/20 flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6" />
        </div>
        <div className="text-center">
          <div className="text-lg">Add Card</div>
          <div className="text-sm text-muted-foreground font-normal mt-1">
            Select an article to display in the grid
          </div>
        </div>
      </button>

      {/* Modals */}
      <NewsSelector
        isOpen={showNewsSelector}
        onClose={() => setShowNewsSelector(false)}
        onSelect={handleNewsSelected}
        requiredCount={1} // Одна новость на карточку
        initialSelectedIds={[]}
        excludeIds={usedNewsIds} // Исключаем уже используемые новости
      />

      {/* Popover для изменения размера карточки */}
      {showSizePopover && selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setShowSizePopover(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CardSizePopover
              currentColSpan={selectedCard.col_span}
              currentRowSpan={selectedCard.row_span}
              onSelectSize={handleSizeSelect}
              onClose={() => setShowSizePopover(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
