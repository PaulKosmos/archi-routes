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

  const handleCategoryClick = (category?: NewsCategory) => {
    console.log('Category clicked:', category);
    onCategoryChange(category);
  };

  return (
    <div className={`mb-6 pb-4 border-b border-border ${className}`}>
      <div className="flex items-center justify-between">

        <button
          type="button"
          onClick={() => handleCategoryClick(undefined)}
          className={`text-sm font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer ${!selectedCategory
              ? 'text-[hsl(var(--news-primary))]'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          All
        </button>

        {NEWS_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.value}
            onClick={() => handleCategoryClick(category.value)}
            className={`text-sm font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer ${selectedCategory === category.value
                ? 'text-[hsl(var(--news-primary))]'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
