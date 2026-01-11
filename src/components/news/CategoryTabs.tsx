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
      <div className="flex items-center justify-between overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Вкладка "Все новости" */}
        <button
          type="button"
          onClick={() => handleCategoryClick(undefined)}
          className={`px-6 py-2.5 text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer border-b-2 ${!selectedCategory
              ? 'text-[hsl(var(--news-primary))] border-[hsl(var(--news-primary))]'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30'
            }`}
        >
          ALL NEWS
        </button>

        {/* Вкладки категорий */}
        {NEWS_CATEGORIES.map((category) => (
          <button
            type="button"
            key={category.value}
            onClick={() => handleCategoryClick(category.value)}
            className={`px-6 py-2.5 text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer border-b-2 ${selectedCategory === category.value
                ? 'text-[hsl(var(--news-primary))] border-[hsl(var(--news-primary))]'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30'
              }`}
          >
            {category.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
