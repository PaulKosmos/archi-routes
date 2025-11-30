// components/news/TagChips.tsx
// Chips для тегов (подкатегорий) с возможностью множественного выбора

'use client';

import { X } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface Tag {
  name: string;
  count?: number;
  featured?: boolean;
}

interface TagChipsProps {
  tags: Tag[] | string[]; // Поддержка простого массива строк или объектов
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxVisible?: number;
  showCount?: boolean;
  className?: string;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function TagChips({
  tags,
  selectedTags = [],
  onTagsChange,
  maxVisible = 20,
  showCount = true,
  className = ''
}: TagChipsProps) {

  // Нормализация тегов к единому формату
  const normalizedTags: Tag[] = tags.map(tag =>
    typeof tag === 'string' ? { name: tag } : tag
  );

  // Сортируем: featured первыми, затем по алфавиту
  const sortedTags = [...normalizedTags].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });

  // Показываем только первые maxVisible тегов
  const visibleTags = sortedTags.slice(0, maxVisible);
  const hiddenCount = sortedTags.length - maxVisible;

  // Обработчик переключения тега
  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    onTagsChange(newTags);
  };

  // Очистить все теги
  const clearAll = () => {
    onTagsChange([]);
  };

  // Если нет тегов
  if (normalizedTags.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-xl p-4 ${className}`}>

      {/* Заголовок */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Теги {showCount && `(${normalizedTags.length})`}
        </h4>

        {selectedTags.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Очистить ({selectedTags.length})
          </button>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);

          return (
            <button
              key={tag.name}
              onClick={() => toggleTag(tag.name)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all transform hover:scale-105
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md'
                  : tag.featured
                    ? 'bg-amber-50 text-amber-700 border-2 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }
              `}
            >
              {tag.featured && <span className="text-xs">⭐</span>}
              <span>#{tag.name}</span>
              {showCount && tag.count && (
                <span className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                  {tag.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Скрытые теги */}
        {hiddenCount > 0 && (
          <span className="inline-flex items-center px-3 py-1.5 text-sm text-gray-500">
            +{hiddenCount} {hiddenCount === 1 ? 'тег' : 'тегов'}
          </span>
        )}
      </div>

      {/* Подсказка */}
      {selectedTags.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">
          Выберите теги для уточнения поиска
        </p>
      )}
    </div>
  );
}
