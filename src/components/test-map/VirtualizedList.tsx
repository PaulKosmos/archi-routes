'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualizedListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode
  className?: string
  overscanCount?: number
}

/**
 * Компонент для виртуализации списков
 * Использует react-window для эффективного рендеринга больших списков
 */
export default function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = '',
  overscanCount = 5
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null)

  // Мемоизируем рендер функции для оптимизации
  const ItemRenderer = useMemo(() => ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index]
    if (!item) return null
    
    return renderItem({ index, style, item })
  }, [items, renderItem])

  // Автоматически скроллить к началу при изменении списка
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0)
    }
  }, [items])

  // Если список пуст, показываем заглушку
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📋</div>
          <p>Список пуст</p>
          <p className="text-sm">Попробуйте изменить фильтры</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscanCount}
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {ItemRenderer}
      </List>
    </div>
  )
}

// Хук для определения оптимальной высоты элементов
export function useItemHeight(items: any[], baseHeight: number = 80): number {
  return useMemo(() => {
    // Простая эвристика: если много элементов, уменьшаем высоту
    if (items.length > 100) return Math.max(baseHeight * 0.8, 60)
    if (items.length > 50) return Math.max(baseHeight * 0.9, 70)
    return baseHeight
  }, [items.length, baseHeight])
}

// Хук для определения оптимального количества элементов для предзагрузки
export function useOverscanCount(items: any[]): number {
  return useMemo(() => {
    // Больше элементов = больше предзагрузка для плавного скролла
    if (items.length > 1000) return 10
    if (items.length > 500) return 7
    if (items.length > 100) return 5
    return 3
  }, [items.length])
}
