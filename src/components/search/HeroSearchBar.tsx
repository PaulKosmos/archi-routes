// src/components/search/HeroSearchBar.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from './SearchBar'
import { useSearch } from '@/hooks/useSearch'
import { searchToUrlParams } from '@/utils/searchUtils'

interface HeroSearchBarProps {
  className?: string
}

export function HeroSearchBar({ className = '' }: HeroSearchBarProps) {
  const router = useRouter()
  const [searchInitiated, setSearchInitiated] = useState(false)
  const [localQuery, setLocalQuery] = useState('')

  // Используем useSearch для автокомплита
  const {
    suggestions,
    suggestionsLoading,
    searchHistory,
    metadata,
    updateQuery: updateSearchQuery
  } = useSearch({
    autoSearch: false, // Отключаем автопоиск
    syncWithUrl: false // Не синхронизируем с URL на главной
  })

  // Обработчик выбора предложения
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'building') {
      // Переходим на страницу здания
      router.push(`/buildings/${suggestion.id}`)
    } else {
      // Переходим на поиск с соответствующим фильтром
      const params = new URLSearchParams()
      params.set('q', suggestion.value)

      if (suggestion.type === 'architect') {
        params.set('architects', suggestion.value)
      } else if (suggestion.type === 'style') {
        params.set('styles', suggestion.value)
      } else if (suggestion.type === 'city') {
        params.set('cities', suggestion.value)
      }

      router.push(`/buildings?${params.toString()}`)
    }
  }, [router])

  // Обработчик выбора из истории
  const handleHistorySelect = useCallback((historyItem: any) => {
    const params = searchToUrlParams(historyItem.query, historyItem.filters)
    router.push(`/buildings?${params.toString()}`)
  }, [router])

  // Обработчик поиска (Enter или клик на кнопку)
  const handleSearch = useCallback(() => {
    if (localQuery.trim()) {
      const params = new URLSearchParams()
      params.set('q', localQuery.trim())
      router.push(`/buildings?${params.toString()}`)
    } else {
      // Если запрос пустой, переходим просто на каталог
      router.push('/buildings')
    }
  }, [localQuery, router])

  // Обработчик нажатия Enter (исправлено)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }, [handleSearch])

  // Обновляем запрос для автокомплита
  const handleQueryChange = useCallback((newQuery: string) => {
    setLocalQuery(newQuery)
    updateSearchQuery(newQuery) // Обновляем для автокомплита
  }, [updateSearchQuery])

  // Обработчик клика на кнопку фильтров
  const handleFiltersToggle = useCallback(() => {
    router.push('/buildings')
  }, [router])

  return (
    <div className={`relative ${className}`}>
      <div className="max-w-2xl mx-auto">
        <SearchBar
          query={localQuery}
          onQueryChange={handleQueryChange}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          searchHistory={searchHistory}
          onSuggestionSelect={handleSuggestionSelect}
          onHistorySelect={handleHistorySelect}
          activeFiltersCount={0}
          onFiltersToggle={handleFiltersToggle}
          size="lg"
          placeholder="Find buildings, architects, styles..."
          showFiltersButton={true}
          className="w-full"
        />

        {/* Кнопка поиска для мобильных */}
        <div className="mt-4 text-center sm:hidden">
          <button
            onClick={handleSearch}
            className="w-full bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors font-medium border border-white/30"
          >
            Find Architecture
          </button>
        </div>

        {/* Популярные поиски */}
        {!searchInitiated && metadata.styles.length > 0 && (
          <div className="mt-6 text-center">
            <div className="text-blue-100 text-sm mb-3">Popular Styles:</div>
            <div className="flex flex-wrap justify-center gap-2">
              {metadata.styles.slice(0, 4).map((style) => (
                <button
                  key={style.value}
                  onClick={() => {
                    const params = new URLSearchParams()
                    params.set('styles', style.value)
                    router.push(`/buildings?${params.toString()}`)
                  }}
                  className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm hover:bg-white/30 transition-colors border border-white/30"
                >
                  {style.value} ({style.count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}