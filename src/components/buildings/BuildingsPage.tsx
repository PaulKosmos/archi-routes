// src/components/buildings/BuildingsPage.tsx
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { SearchBar } from '../search/SearchBar'
import { FilterPanel } from '../search/FilterPanel'
import { FilterChips } from '../search/FilterChips'
import { SearchResults } from '../search/SearchResults'
import { SearchFilters } from '@/utils/searchUtils'

interface BuildingsPageProps {
  initialQuery?: string
  initialFilters?: Partial<SearchFilters>
  className?: string
}

export function BuildingsPage({
  initialQuery = '',
  initialFilters = {},
  className = ''
}: BuildingsPageProps) {
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useState(false)

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
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Заголовок страницы */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Каталог зданий и объектов
              </h1>
              <p className="text-gray-600">
                Исследуйте архитектурные объекты, здания и памятники с помощью умного поиска и фильтров
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
                onFiltersToggle={() => setIsFiltersPanelOpen(!isFiltersPanelOpen)}
                size="lg"
                autoFocus
                placeholder="Поиск зданий, памятников, объектов..."
                className="w-full"
              />
            </div>

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

          {/* Правая колонка: фильтры (десктоп) */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-6">
              <FilterPanel
                filters={filters}
                metadata={metadata}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
                isOpen={isFiltersPanelOpen}
                onClose={() => setIsFiltersPanelOpen(false)}
                activeFiltersCount={activeFiltersCount}
              />
            </div>
          </div>
        </div>

        {/* Статистика поиска в футере */}
        {!loading && results.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <div className="flex items-center justify-center gap-8">
                <div>
                  Показано <span className="font-medium">{results.length}</span> из{' '}
                  <span className="font-medium">{totalCount}</span> объектов
                </div>
                {metadata.styles.length > 0 && (
                  <div>
                    Доступно <span className="font-medium">{metadata.styles.length}</span> архитектурных стилей
                  </div>
                )}
                {metadata.cities.length > 1 && (
                  <div>
                    В <span className="font-medium">{metadata.cities.length}</span> городах
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