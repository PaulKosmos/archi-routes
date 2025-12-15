'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useNewsAPI } from '@/hooks/useNewsAPI';
import { useNewsGridAPI } from '@/hooks/useNewsGridAPI';
import { NewsArticle, NewsFilters, NewsSortOptions, NewsCategory, NewsGridCardWithNews, canEditNewsGrid } from '@/types/news';
import Header from '@/components/Header';
import EnhancedFooter from '@/components/EnhancedFooter';
import CategoryTabs from '@/components/news/CategoryTabs';
import NewsCard from '@/components/news/NewsCard';
import GridCardsRenderer from '@/components/news/grid/GridCardsRenderer';
import GridEditor from '@/components/news/grid/GridEditor';
import { ChevronRight, Search, Plus, Edit2 } from 'lucide-react';
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
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    pages: 0
  });

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

  // Загрузка новостей - загружаем ВСЕ новости, фильтрация на клиенте
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

      setNews(result.data);
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


  // Загрузка featured новости
  const fetchFeaturedNews = async () => {
    try {
      // Главная новость загружается без фильтра по категории
      const result = await fetchNews(
        { status: 'published', featured: true },
        { field: 'published_at', direction: 'desc' },
        1,
        1
      );
      if (result.data.length > 0) {
        setFeaturedNews(result.data[0]);
      } else {
        setFeaturedNews(null);
      }
    } catch (err) {
      console.error('Error fetching featured news:', err);
      setFeaturedNews(null);
    }
  };

  // Эффекты
  useEffect(() => {
    fetchGridData();
    fetchFeaturedNews();
  }, []);

  useEffect(() => {
    fetchNewsData();
  }, [filters, sort, pagination.page, pagination.limit]);

  // Клиентская фильтрация по поисковому запросу (используем useMemo)
  const filteredNews = useMemo(() => {
    // Получаем ID новостей из grid cards
    const gridNewsIds = gridCards.map(card => card.news_id).filter(Boolean);

    // Исключаем featured новость И новости из grid cards
    let newsToFilter = news.filter(newsItem => {
      // Исключаем featured новость
      if (featuredNews && newsItem.id === featuredNews.id) {
        return false;
      }
      // Исключаем новости из grid cards
      if (gridNewsIds.includes(newsItem.id)) {
        return false;
      }
      return true;
    });

    if (searchInput) {
      const searchLower = searchInput.toLowerCase();
      return newsToFilter.filter(newsItem =>
        newsItem.title.toLowerCase().includes(searchLower) ||
        (newsItem.summary && newsItem.summary.toLowerCase().includes(searchLower)) ||
        (newsItem.tags && newsItem.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    return newsToFilter;
  }, [news, searchInput, featuredNews, gridCards]);

  // Фильтрация featured новости
  const filteredFeaturedNews = useMemo(() => {
    if (!featuredNews) return null;

    // Главная новость всегда видна, независимо от категории
    // Проверяем только соответствие поисковому запросу
    if (searchInput) {
      const searchLower = searchInput.toLowerCase();
      const matches =
        featuredNews.title.toLowerCase().includes(searchLower) ||
        (featuredNews.summary && featuredNews.summary.toLowerCase().includes(searchLower)) ||
        (featuredNews.tags && featuredNews.tags.some(tag => tag.toLowerCase().includes(searchLower)));

      return matches ? featuredNews : null;
    }

    return featuredNews;
  }, [featuredNews, searchInput]);

  // Фильтрация grid cards
  const filteredGridCards = useMemo(() => {
    // Исключаем featured новость из grid cards
    let cardsToFilter = gridCards.filter(card =>
      !featuredNews || card.news_id !== featuredNews.id
    );

    // Фильтруем по категории если выбрана
    if (filters.category) {
      cardsToFilter = cardsToFilter.filter(card => {
        if (!card.news) return false;
        return card.news.category === filters.category;
      });
    }

    if (!searchInput) return cardsToFilter;

    const searchLower = searchInput.toLowerCase();
    return cardsToFilter.filter(card => {
      if (!card.news) return false;
      return (
        card.news.title.toLowerCase().includes(searchLower) ||
        (card.news.summary && card.news.summary.toLowerCase().includes(searchLower)) ||
        (card.news.tags && card.news.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    });
  }, [gridCards, searchInput, featuredNews, filters.category]);

  // Обработчики категорий
  const handleCategoryChange = (category?: NewsCategory) => {
    setFilters(prev => ({
      ...prev,
      category
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  return (
    <div className="min-h-screen bg-background news-theme">
      {/* Header - sticky */}
      <Header buildings={buildings} />

      <main className="container mx-auto px-6 py-8">
        {/* Поиск */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Искать новости..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 h-12 border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--news-primary))] transition-colors"
            />
          </div>
        </div>

        {/* Информация и кнопки управления */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-6 border-b-2 border-border">
          <span className="text-sm font-medium">
            Найдено новостей: <span className="font-bold text-[hsl(var(--news-primary))]">
              {(filteredFeaturedNews ? 1 : 0) + filteredGridCards.length + filteredNews.length}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {canManageNews && canEditGrid && !isEditingGrid && (
              <button
                onClick={handleEditGrid}
                className="inline-flex items-center gap-2 bg-background border border-border text-foreground px-6 py-3 rounded-[var(--radius)] hover:bg-muted transition-colors font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Редактировать сетку
              </button>
            )}
            {canManageNews && (
              <Link
                href="/admin/news/create"
                className="inline-flex items-center gap-2 bg-[hsl(var(--news-primary))] text-white px-6 py-3 rounded-[var(--radius)] hover:opacity-90 transition-opacity font-medium"
              >
                <Plus className="w-4 h-4" />
                Добавить новость
              </Link>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          selectedCategory={filters.category}
          onCategoryChange={handleCategoryChange}
        />

        {/* Inline Grid Editor */}
        {isEditingGrid ? (
          <GridEditor
            onSave={handleSaveGrid}
            onCancel={handleCancelGridEdit}
            featuredNews={featuredNews}
          />
        ) : (
          <>
            {/* Featured News - horizontal */}
            {filteredFeaturedNews && (
              <div className="mb-6">
                <NewsCard news={filteredFeaturedNews} variant="horizontal" />
              </div>
            )}

            {/* Custom Grid Cards */}
            {filteredGridCards.length > 0 && (
              <div className="mb-6">
                <GridCardsRenderer cards={filteredGridCards} />
              </div>
            )}

            {/* News Grid/List */}
            {error ? (
              <div className="text-center py-12">
                <div className="bg-destructive/10 border-2 border-destructive rounded-[var(--radius)] p-6 max-w-md mx-auto">
                  <p className="text-destructive mb-4">{error}</p>
                  <button
                    onClick={fetchNewsData}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-[var(--radius)] hover:bg-destructive/90 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-muted rounded-lg h-64 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredNews.map((newsItem) => (
                  <NewsCard
                    key={newsItem.id}
                    news={newsItem}
                    variant="compact"
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredNews.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Новостей не найдено</h3>
                <p className="text-muted-foreground">Попробуйте изменить фильтры или поисковый запрос</p>
              </div>
            )}

            {/* Pagination - simplified */}
            {!loading && filteredNews.length > 0 && pagination.pages > 1 && (
              <div className="flex justify-center py-12">
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="group w-14 h-14 border-2 border-[hsl(var(--news-primary))] bg-transparent hover:bg-[hsl(var(--news-primary))] transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-6 w-6 text-[hsl(var(--news-primary))] group-hover:text-white transition-colors duration-300" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <EnhancedFooter />
    </div>
  );
}
