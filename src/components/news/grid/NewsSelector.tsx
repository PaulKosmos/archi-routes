'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Calendar, Eye, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { NewsArticleWithDetails, NewsCategory, NEWS_CATEGORIES } from '@/types/news';
import { useNewsAPI } from '@/hooks/useNewsAPI';

interface NewsSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (newsIds: string[]) => void;
  requiredCount: number;
  initialSelectedIds?: string[];
  excludeIds?: string[]; // Новости, уже используемые в других блоках
}

export default function NewsSelector({
  isOpen,
  onClose,
  onSelect,
  requiredCount,
  initialSelectedIds = [],
  excludeIds = []
}: NewsSelectorProps) {
  const { fetchNews } = useNewsAPI();
  const [news, setNews] = useState<NewsArticleWithDetails[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // Синхронизация selectedIds с initialSelectedIds при открытии модала
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  // Загрузка новостей
  useEffect(() => {
    if (isOpen) {
      loadNews();
    }
  }, [isOpen, categoryFilter]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const result = await fetchNews(
        {
          status: 'published',
          category: categoryFilter !== 'all' ? categoryFilter : undefined
        },
        { field: 'published_at', direction: 'desc' },
        1,
        50
      );

      setNews(result.data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация новостей по поиску
  const filteredNews = useMemo(() => {
    if (!searchQuery) return news;

    const query = searchQuery.toLowerCase();
    return news.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.summary?.toLowerCase().includes(query)
    );
  }, [news, searchQuery]);

  // Обработчик выбора новости
  const handleToggleNews = (newsId: string) => {
    if (selectedIds.includes(newsId)) {
      setSelectedIds(selectedIds.filter((id) => id !== newsId));
    } else {
      if (selectedIds.length < requiredCount) {
        setSelectedIds([...selectedIds, newsId]);
      }
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === requiredCount) {
      onSelect(selectedIds);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Выберите новости</h2>
            <p className="text-sm text-gray-500 mt-1">
              Выбрано {selectedIds.length} из {requiredCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по заголовку или описанию..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as NewsCategory | 'all')}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">Все категории</option>
              {NEWS_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* News List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Новости не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredNews.map((newsItem) => {
                const isSelected = selectedIds.includes(newsItem.id);
                const isExcluded = excludeIds.includes(newsItem.id);
                const canSelect = !isExcluded && (isSelected || selectedIds.length < requiredCount);

                return (
                  <button
                    key={newsItem.id}
                    onClick={() => canSelect && handleToggleNews(newsItem.id)}
                    disabled={isExcluded || (!isSelected && selectedIds.length >= requiredCount)}
                    className={`relative flex gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : isExcluded
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : canSelect
                        ? 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {/* Image */}
                    {newsItem.featured_image_url && (
                      <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={newsItem.featured_image_url}
                          alt={newsItem.title}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {newsItem.title}
                      </h3>
                      {newsItem.summary && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {newsItem.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 font-metrics">
                        {newsItem.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(newsItem.published_at)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {newsItem.views_count || 0}
                        </span>
                        {isExcluded && (
                          <span className="text-orange-600 font-medium">
                            Уже используется
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedIds.length === requiredCount ? (
              <span className="text-green-600 font-medium">✓ Все новости выбраны</span>
            ) : (
              <span>
                Выберите еще {requiredCount - selectedIds.length}{' '}
                {requiredCount - selectedIds.length === 1 ? 'новость' : 'новости'}
              </span>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length !== requiredCount}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                selectedIds.length === requiredCount
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Подтвердить выбор
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
