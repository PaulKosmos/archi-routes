'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useNewsAPI } from '@/hooks/useNewsAPI';
import { useNewsGridAPI } from '@/hooks/useNewsGridAPI';
import { NewsArticle, NewsFilters, NewsSortOptions, NewsCategory, NewsGridCardWithNews, canEditNewsGrid } from '@/types/news';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import CategoryTabs from '@/components/news/CategoryTabs';
import NewsMasonryGrid from '@/components/news/NewsMasonryGrid';
import NewsCard from '@/components/news/NewsCard';
import GridCardsRenderer from '@/components/news/grid/GridCardsRenderer';
import GridEditor from '@/components/news/grid/GridEditor';
import { ChevronLeft, ChevronRight, TrendingUp, Clock, Star, Search, Plus, ChevronDown, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';

export default function NewsListPage() {
  const supabase = useMemo(() => createClient(), []);
  const { fetchNews } = useNewsAPI();
  const { fetchGridCards } = useNewsGridAPI();
  const { profile } = useAuth();

  const [buildings, setBuildings] = useState<any[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [featuredNews, setFeaturedNews] = useState<NewsArticle | null>(null);
  const [gridCards, setGridCards] = useState<NewsGridCardWithNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NewsFilters>({ status: 'published' });
  const [sort, setSort] = useState<NewsSortOptions>({ field: 'published_at', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0
  });

  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');

  // Check if user can manage news
  const canManageNews = profile?.role === 'admin' || profile?.role === 'moderator' || profile?.role === 'editor';

  // Check if user can edit grid
  const canEditGrid = profile?.role ? canEditNewsGrid(profile.role) : false;

  // Fetch buildings for header
  useEffect(() => {
    const fetchBuildings = async () => {
      const { data } = await supabase
        .from('buildings')
        .select('*')
        .limit(100);
      setBuildings(data || []);
    };
    fetchBuildings();
  }, [supabase]);

  // Загрузка карточек сетки
  const fetchGridData = async () => {
    try {
      const cards = await fetchGridCards(true) as NewsGridCardWithNews[];
      setGridCards(cards);
    } catch (err) {
      console.error('Error fetching grid cards:', err);
    }
  };

  // Получить ID новостей, уже используемых в сетке
  const getUsedNewsIds = useMemo(() => {
    return gridCards.map(card => card.news_id).filter(Boolean);
  }, [gridCards]);

  // Загрузка новостей (исключая те, что в сетке)
  const fetchNewsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchNews(
        filters,
        sort,
        pagination.page,
        pagination.limit
      );

      // Фильтруем новости, исключая те, что уже в блоках сетки
      const filteredNews = result.data.filter(
        newsItem => !getUsedNewsIds.includes(newsItem.id)
      );

      setNews(filteredNews);
      setPagination({
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка доступных городов для фильтров
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/news?status=published&limit=1000');
      if (response.ok) {
        const data = await response.json();

        const cities = [...new Set(
          data.data
            .map((n: any) => n.city)
            .filter(Boolean)
        )] as string[];

        setAvailableCities(cities.sort());
      }
    } catch (error) {
      console.error('Ошибка загрузки опций фильтров:', error);
    }
  };

  // Загрузка featured новости
  const fetchFeaturedNews = async () => {
    try {
      const result = await fetchNews({ status: 'published', featured: true }, { field: 'published_at', direction: 'desc' }, 1, 1);
      if (result.data.length > 0) {
        setFeaturedNews(result.data[0]);
      }
    } catch (err) {
      console.error('Error fetching featured news:', err);
    }
  };

  // Эффекты
  useEffect(() => {
    fetchGridData();
    fetchFilterOptions();
    fetchFeaturedNews();
  }, []);

  useEffect(() => {
    fetchNewsData();
  }, [filters, sort, pagination.page, pagination.limit, gridCards]);

  // Debounce для поиска (300ms задержка)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchInput || undefined
      }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Обработчики категорий и тегов
  const handleCategoryChange = (category?: NewsCategory) => {
    setFilters(prev => ({
      ...prev,
      category
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  // Обработчик поиска
  const handleSearchChange = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search: search || undefined
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Обработчик города
  const handleCityChange = (city?: string) => {
    setFilters(prev => ({
      ...prev,
      city
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Обработчик featured
  const handleFeaturedChange = (featured?: boolean) => {
    setFilters(prev => ({
      ...prev,
      featured
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Обработчик has_buildings
  const handleHasBuildingsChange = (hasBuildings?: boolean) => {
    setFilters(prev => ({
      ...prev,
      has_buildings: hasBuildings
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Обработчик date_from
  const handleDateFromChange = (dateFrom?: string) => {
    setFilters(prev => ({
      ...prev,
      date_from: dateFrom
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field: string) => {
    setSort(prev => ({
      field: field as any,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Grid editor handlers
  const handleEditGrid = () => {
    setIsEditingGrid(true);
  };

  const handleSaveGrid = async () => {
    setIsEditingGrid(false);
    await fetchGridData();
    await fetchNewsData();
  };

  const handleCancelGridEdit = () => {
    setIsEditingGrid(false);
  };

  // Рендер сортировки
  const renderSortButton = (field: string, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => handleSortChange(field)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        sort.field === field
          ? 'bg-blue-600 text-white shadow-md'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {icon}
      {label}
      {sort.field === field && (
        <span className="text-xs font-bold">
          {sort.direction === 'desc' ? '↓' : '↑'}
        </span>
      )}
    </button>
  );

  // Рендер пагинации
  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const maxVisiblePages = 7;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, pagination.page - halfVisible);
    let endPage = Math.min(pagination.pages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-12">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-2 rounded-lg border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-medium transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
              pagination.page === page
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < pagination.pages && (
          <>
            {endPage < pagination.pages - 1 && <span className="px-2 text-gray-400">...</span>}
            <button
              onClick={() => handlePageChange(pagination.pages)}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-medium transition-colors"
            >
              {pagination.pages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.pages}
          className="p-2 rounded-lg border-2 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - sticky */}
      <Header buildings={buildings} />

      <main>
        {/* Hero Section - Title with right alignment */}
        <section className="py-8 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
                  Новости архитектуры
                </h1>
                <p className="text-gray-600 text-lg mt-2">
                  Последние события, проекты и тренды в мире архитектуры и градостроительства
                </p>
              </div>

              {/* Action Buttons - Admin/Moderator/Editor only */}
              {canManageNews && (
                <div className="flex items-center gap-3">
                  {canEditGrid && !isEditingGrid && (
                    <button
                      onClick={handleEditGrid}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-md border border-gray-300"
                    >
                      <Edit2 size={20} />
                      Редактировать сетку
                    </button>
                  )}
                  <Link
                    href="/admin/news/create"
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <Plus size={20} />
                    Добавить новость
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Search Bar Section */}
        <section className="px-4 sm:px-6 lg:px-8 bg-gray-50 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Искать новости..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <section className="py-6 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">

            {/* Category Tabs - limited to content width, archi.ru style */}
            <div className="mb-4">
              <CategoryTabs
                selectedCategory={filters.category}
                onCategoryChange={handleCategoryChange}
              />
            </div>

            {/* Collapsible Filters Panel */}
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors w-full"
              >
                <span>Фильтры</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {showFilters && (
                <div className="mt-4 space-y-6">

                  {/* Города и даты */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Город */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Город
                      </label>
                      <select
                        value={filters.city || ''}
                        onChange={(e) => handleCityChange(e.target.value || undefined)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="">Все города</option>
                        {availableCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    {/* Период */}
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Период
                      </label>
                      <select
                        value={
                          filters.date_from ? (
                            filters.date_from.includes(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? 'week' :
                            filters.date_from.includes(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? 'month' :
                            filters.date_from.includes(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) ? '3months' :
                            'custom'
                          ) : ''
                        }
                        onChange={(e) => {
                          const now = new Date();
                          if (e.target.value === 'week') {
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            handleDateFromChange(weekAgo.toISOString());
                          } else if (e.target.value === 'month') {
                            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            handleDateFromChange(monthAgo.toISOString());
                          } else if (e.target.value === '3months') {
                            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                            handleDateFromChange(threeMonthsAgo.toISOString());
                          } else {
                            handleDateFromChange(undefined);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="">Все время</option>
                        <option value="week">Последняя неделя</option>
                        <option value="month">Последний месяц</option>
                        <option value="3months">Последние 3 месяца</option>
                      </select>
                    </div>
                  </div>

                  {/* Дополнительные фильтры */}
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!filters.featured}
                        onChange={(e) => handleFeaturedChange(e.target.checked ? true : undefined)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Только главные новости</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!filters.has_buildings}
                        onChange={(e) => handleHasBuildingsChange(e.target.checked ? true : undefined)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">С упоминанием зданий</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Sorting and counter - Hide in edit mode */}
            {!isEditingGrid && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex flex-wrap gap-2">
                  {renderSortButton('published_at', 'По дате', <Clock className="w-4 h-4" />)}
                  {renderSortButton('views_count', 'По популярности', <TrendingUp className="w-4 h-4" />)}
                  {renderSortButton('likes_count', 'По лайкам', <Star className="w-4 h-4" />)}
                </div>

                {!loading && (
                  <div className="text-sm text-gray-600 font-medium">
                    Найдено: <span className="text-blue-600">{pagination.total}</span> {pagination.total === 1 ? 'новость' : 'новостей'}
                  </div>
                )}
              </div>
            )}

            {/* Inline Grid Editor */}
            {isEditingGrid ? (
              <GridEditor
                onSave={handleSaveGrid}
                onCancel={handleCancelGridEdit}
                featuredNews={featuredNews}
              />
            ) : (
              <>
                {/* Featured News - всегда первой */}
                {featuredNews && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <span className="text-amber-500">⭐</span>
                      Главная новость
                    </h2>
                    <NewsCard news={featuredNews} size="featured" />
                  </div>
                )}

                {/* Custom Grid Cards */}
                {gridCards.length > 0 && (
                  <div className="mb-12">
                    <GridCardsRenderer cards={gridCards} />
                  </div>
                )}

                {/* Regular News Grid */}
                {error ? (
                  <div className="text-center py-12">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-red-600 mb-4">{error}</p>
                      <button
                        onClick={fetchNewsData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Попробовать снова
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <NewsMasonryGrid news={news} loading={loading} />
                    {!loading && renderPagination()}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <EnhancedFooter />
    </div>
  );
}
