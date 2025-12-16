'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NewsGridCardWithNews } from '@/types/news';
import NewsCard from '@/components/news/NewsCard';

interface GridCardsRendererProps {
  cards: NewsGridCardWithNews[];
  isEditMode?: boolean;
  onCardClick?: (cardId: string) => void;
}

/**
 * GridCardsRenderer - Простой рендерер сетки новостных карточек
 *
 * Использует CSS Grid с 3 колонками (фиксированно, адаптивно на мобильных).
 * Каждая карточка имеет col_span (1-2) и row_span (1-2) для масштабирования.
 *
 * Замена старому GridBlockRenderer с его сложной логикой switch/case.
 */
export default function GridCardsRenderer({
  cards,
  isEditMode = false,
  onCardClick
}: GridCardsRendererProps) {
  // Логируем количество карточек для отладки
  console.log('📊 GridCardsRenderer: Rendering', cards.length, 'cards');

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">Нет карточек для отображения</p>
        {isEditMode && (
          <p className="text-sm mt-2">Добавьте новые карточки в режиме редактирования</p>
        )}
      </div>
    );
  }

  return (
    <div
      className="
        grid
        grid-cols-1
        md:grid-cols-2
        lg:grid-cols-3
        gap-6
        auto-rows-fr
      "
      style={{
        // Минимальная высота строки для сохранения пропорций
        gridAutoRows: 'minmax(300px, auto)'
      }}
    >
      {cards.map((card, index) => {
        if (!card.news) {
          console.warn('❌ Card has no news:', card.id, 'at index:', index);
          return null;
        }

        console.log(`✅ Rendering card ${index}:`, card.id, 'col_span:', card.col_span, 'row_span:', card.row_span);

        // В режиме редактирования используем SortableCard
        if (isEditMode) {
          return (
            <SortableCard
              key={card.id}
              card={card}
              onCardClick={onCardClick}
            />
          );
        }

        // В обычном режиме - обычный рендер
        // На мобильных ограничиваем col_span до 1, на планшетах/desktop используем полный span
        const getColSpanClass = (span: number) => {
          switch(span) {
            case 1: return 'col-span-1'
            case 2: return 'col-span-1 md:col-span-2 lg:col-span-2'
            case 3: return 'col-span-1 md:col-span-2 lg:col-span-3'
            default: return 'col-span-1'
          }
        }

        const getRowSpanClass = (span: number) => {
          switch(span) {
            case 1: return 'row-span-1'
            case 2: return 'row-span-2'
            default: return 'row-span-1'
          }
        }

        return (
          <div
            key={card.id}
            className={`relative ${getColSpanClass(card.col_span)} ${getRowSpanClass(card.row_span)}`}
          >
            <NewsCard
              news={card.news}
              variant="compact"
              className="h-full"
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * SortableCard - Карточка с поддержкой Drag & Drop
 */
interface SortableCardProps {
  card: NewsGridCardWithNews;
  onCardClick?: (cardId: string) => void;
}

function SortableCard({ card, onCardClick }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  // На мобильных col_span всегда 1
  const getColSpanClass = (span: number) => {
    switch(span) {
      case 1: return 'col-span-1'
      case 2: return 'col-span-1 md:col-span-2 lg:col-span-2'
      case 3: return 'col-span-1 md:col-span-2 lg:col-span-3'
      default: return 'col-span-1'
    }
  }

  const getRowSpanClass = (span: number) => {
    switch(span) {
      case 1: return 'row-span-1'
      case 2: return 'row-span-2'
      default: return 'row-span-1'
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-move ${getColSpanClass(card.col_span)} ${getRowSpanClass(card.row_span)}`}
      {...attributes}
      {...listeners}
    >
      {/* Overlay для визуального отклика */}
      <div className="absolute inset-0 bg-[hsl(var(--news-primary))]/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10 border-2 border-[hsl(var(--news-primary))]/0 hover:border-[hsl(var(--news-primary))]"></div>

      {/* Индикатор размера в режиме редактирования */}
      <div className="absolute top-2 left-2 bg-[hsl(var(--news-primary))] text-white text-xs font-bold px-2 py-1 shadow-lg z-20">
        {card.col_span}×{card.row_span}
      </div>

      {/* Кнопка изменения размера */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCardClick?.(card.id);
        }}
        className="absolute top-2 right-2 bg-card border border-border text-xs font-bold px-3 py-1.5 shadow-lg z-20 hover:bg-muted transition-colors"
      >
        Изменить размер
      </button>

      {/* NewsCard */}
      {card.news && (
        <NewsCard
          news={card.news}
          variant="compact"
          className="h-full"
          disableLink={true}
        />
      )}
    </div>
  );
}
