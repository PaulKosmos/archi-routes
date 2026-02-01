// src/components/search/SearchPage.tsx
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { SearchBar } from './SearchBar'
import { FilterPanel } from './FilterPanel'
import { MobileFilterPanel } from './MobileFilterPanel'
import { FilterChips } from './FilterChips'
import { SearchResults } from './SearchResults'
import { SearchFilters, resetFilters } from '@/utils/searchUtils'

interface SearchPageProps {
  initialQuery?: string
  initialFilters?: Partial<SearchFilters>
  className?: string
}

export function SearchPage({
  initialQuery = '',
  initialFilters = {},
  className = ''
}: SearchPageProps) {
  // Filters panel state for mobile
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const {
    query,
    filters,
    results,
    totalCount,
    loading,
    error,
    suggestions,
    suggestionsLoading,
    metadata,
    hasMore,
    searchHistory,
    activeFiltersCount,
    updateQuery,
    updateFilters,
    clearFilters,
    loadMore
  } = useSearch({
    initialQuery,
    initialFilters,
    syncWithUrl: true,
    autoSearch: true
  })

  // Обработчики
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'building') {
      updateQuery(suggestion.value)
    } else if (suggestion.type === 'architect') {
      updateFilters({ architects: [suggestion.value] })
      updateQuery('')
    } else if (suggestion.type === 'style') {
      updateFilters({ styles: [suggestion.value] })
      updateQuery('')
    } else if (suggestion.type === 'city') {
      updateFilters({ cities: [suggestion.value] })
      updateQuery('')
    }
  }, [updateQuery, updateFilters])

  const handleHistorySelect = useCallback((historyItem: any) => {
    updateQuery(historyItem.query)
    updateFilters(historyItem.filters)
  }, [updateQuery, updateFilters])

  const handleRemoveFilter = useCallback((filterType: keyof SearchFilters, value?: string) => {
    if (filterType === 'styles' && value) {
      updateFilters({
        styles: filters.styles.filter(s => s !== value)
      })
    } else if (filterType === 'architects' && value) {
      updateFilters({
        architects: filters.architects.filter(a => a !== value)
      })
    } else if (filterType === 'cities' && value) {
      updateFilters({
        cities: filters.cities.filter(c => c !== value)
      })
    } else if (filterType === 'yearRange') {
      updateFilters({
        yearRange: metadata.yearRange
      })
    } else if (filterType === 'minRating') {
      updateFilters({
        minRating: 0
      })
    } else if (filterType === 'hasPhoto') {
      updateFilters({
        hasPhoto: null
      })
    }
  }, [filters, updateFilters, metadata.yearRange])

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Заголовок страницы */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Link
              href="/"
              className="p-2 rounded-[var(--radius)] hover:bg-muted transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground mb-1 sm:mb-2">
                Universal Search
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">
                Find buildings, routes, podcasts, articles and architecture news in one place
              </p>
            </div>
          </div>
        </div>

        {/* Основная область поиска */}
        <div className="lg:flex lg:gap-8">
          {/* Левая колонка: поиск и результаты */}
          <div className="lg:flex-1">
            {/* Поисковая строка */}
            <div className="mb-6">
              <SearchBar
                query={query}
                onQueryChange={updateQuery}
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
                searchHistory={searchHistory}
                onSuggestionSelect={handleSuggestionSelect}
                onHistorySelect={handleHistorySelect}
                activeFiltersCount={activeFiltersCount}
                onFiltersToggle={() => { }}
                size="lg"
                autoFocus
                showFiltersButton={false}
                className="w-full"
              />
            </div>

            {/* Кнопка фильтров для мобильных */}
            <button
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="lg:hidden flex items-center justify-between w-full py-3 px-4 bg-muted hover:bg-muted/80 rounded-[var(--radius)] transition-colors mb-4"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                <span className="font-medium">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isMobileFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Мобильная панель фильтров (раскрывающаяся) */}
            {isMobileFiltersOpen && (
              <div className="lg:hidden mb-6 bg-card border border-border rounded-[var(--radius)] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <MobileFilterPanel
                  filters={filters}
                  metadata={metadata}
                  onFiltersChange={updateFilters}
                  onClearFilters={clearFilters}
                  activeFiltersCount={activeFiltersCount}
                  onClose={() => setIsMobileFiltersOpen(false)}
                />
              </div>
            )}

            {/* Активные фильтры */}
            {activeFiltersCount > 0 && (
              <div className="mb-6">
                <FilterChips
                  filters={filters}
                  metadata={metadata}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={clearFilters}
                />
              </div>
            )}

            {/* Результаты поиска */}
            <SearchResults
              results={results}
              totalCount={totalCount}
              loading={loading}
              error={error}
              query={query}
              hasMore={hasMore}
              onLoadMore={loadMore}
              className="flex-1"
            />
          </div>

          {/* Правая колонка: фильтры (скрыты на мобильных) */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-6">
              <FilterPanel
                filters={filters}
                metadata={metadata}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
                isOpen={true}
                onClose={() => { }}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </div>
        </div>

        {/* Статистика поиска в футере */}
        {!loading && results.length > 0 && (
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-border">
            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-8">
                <div className="font-metrics">
                  Showing <span className="font-semibold text-foreground">{results.length}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalCount}</span> buildings
                </div>
                {metadata.styles.length > 0 && (
                  <div className="font-metrics hidden sm:block">
                    Available <span className="font-semibold text-foreground">{metadata.styles.length}</span> architectural styles
                  </div>
                )}
                {metadata.cities.length > 1 && (
                  <div className="font-metrics hidden sm:block">
                    In <span className="font-semibold text-foreground">{metadata.cities.length}</span> cities
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}