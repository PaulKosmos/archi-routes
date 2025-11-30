// components/news/RelatedNews.tsx
// Компонент для отображения похожих новостей

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRelatedNews } from '@/hooks/useRelatedNews';
import { getNewsCategoryIcon } from '@/types/news';
import { Calendar, Clock, Sparkles, TrendingUp } from 'lucide-react';

// ============================================================
// ТИПЫ
// ============================================================

interface RelatedNewsProps {
  newsId: string;
  limit?: number;
  title?: string;
  showScore?: boolean; // Показывать score релевантности (для отладки)
  className?: string;
}

// ============================================================
// КОМПОНЕНТ
// ============================================================

export default function RelatedNews({
  newsId,
  limit = 6,
  title = 'Похожие новости',
  showScore = false,
  className = ''
}: RelatedNewsProps) {

  // Загружаем похожие новости через хук
  const { relatedNews, loading, error } = useRelatedNews({
    newsId,
    limit,
    autoFetch: true,
    useSimpleAlgorithm: false // Используем продвинутый алгоритм
  });

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Получаем название категории
  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'projects': 'Проекты',
      'events': 'События',
      'personalities': 'Персоналии',
      'trends': 'Тренды',
      'planning': 'Планирование',
      'heritage': 'Наследие'
    };
    return names[category] || category;
  };

  // Состояние загрузки
  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Ошибка
  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          {title}
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            Не удалось загрузить похожие новости
          </p>
        </div>
      </div>
    );
  }

  // Нет похожих новостей
  if (!relatedNews || relatedNews.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          {title}
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            Похожих новостей пока нет
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>

      {/* Заголовок */}
      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-600" />
        {title}
        <span className="text-sm font-normal text-gray-500 ml-auto">
          {relatedNews.length} {relatedNews.length === 1 ? 'новость' : 'новостей'}
        </span>
      </h3>

      {/* Сетка новостей */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedNews.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.slug}`}
            className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
          >
            {/* Изображение */}
            {article.featured_image_url && (
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <Image
                  src={article.featured_image_url}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Категория */}
                <div className="absolute top-3 left-3">
                  <span className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700 flex items-center gap-1">
                    <span className="text-sm">{getNewsCategoryIcon(article.category)}</span>
                    {getCategoryName(article.category)}
                  </span>
                </div>

                {/* Featured badge */}
                {article.featured && (
                  <div className="absolute top-3 right-3">
                    <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                      ⭐
                    </span>
                  </div>
                )}

                {/* Relevance score (для отладки) */}
                {showScore && article.relevance_score !== undefined && (
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-mono flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {(article.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Контент */}
            <div className="p-4">
              {/* Заголовок */}
              <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h4>

              {/* Краткое описание */}
              {article.summary && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.summary}
                </p>
              )}

              {/* Метаданные */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                {/* Дата */}
                {article.published_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(article.published_at)}</span>
                  </div>
                )}

                {/* Время чтения */}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>~{Math.max(1, Math.round((article.content?.length || 0) / 1000))} мин</span>
                </div>
              </div>

              {/* Теги (показываем первые 2) */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {article.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                  {article.tags.length > 2 && (
                    <span className="text-gray-400 text-xs px-1">
                      +{article.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Ссылка на все новости */}
      <div className="mt-6 text-center">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
        >
          Посмотреть все новости
          <span className="text-lg">→</span>
        </Link>
      </div>
    </div>
  );
}
