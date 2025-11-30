// components/news/CategoryTabs.tsx
// Вкладки категорий в стиле archi.ru (текст на фоне страницы, без рамок)

'use client';

import { NEWS_CATEGORIES, NewsCategory } from '@/types/news';

// ============================================================
// ТИПЫ
// ============================================================

interface CategoryTabsProps {
  selectedCategory?: NewsCategory;
  onCategoryChange: (category?: NewsCategory) => void;
  className?: string;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function CategoryTabs({
  selectedCategory,
  onCategoryChange,
  className = ''
}: CategoryTabsProps) {

  return (
    <div className={`py-4 ${className}`}>
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">

        {/* Вкладка "Все новости" */}
        <button
          onClick={() => onCategoryChange(undefined)}
          className={`
            flex items-center gap-2 px-1 pb-2 font-medium text-sm transition-all whitespace-nowrap border-b-2
            ${!selectedCategory
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
            }
          `}
        >
          <span className="text-lg">📰</span>
          <span>Все новости</span>
        </button>

        {/* Вкладки категорий */}
        {NEWS_CATEGORIES.map((category) => (
          <button
            key={category.value}
            onClick={() => onCategoryChange(
              selectedCategory === category.value ? undefined : category.value
            )}
            className={`
              flex items-center gap-2 px-1 pb-2 font-medium text-sm transition-all whitespace-nowrap border-b-2
              ${selectedCategory === category.value
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
              }
            `}
          >
            <span className="text-lg">{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Стили для скрытия scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
