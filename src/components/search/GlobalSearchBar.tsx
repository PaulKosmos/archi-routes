// src/components/search/GlobalSearchBar.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from './SearchBar'
import { useSearch } from '@/hooks/useSearch'
import { searchToUrlParams } from '@/utils/searchUtils'

interface GlobalSearchBarProps {
  className?: string
}

export function GlobalSearchBar({ className = '' }: GlobalSearchBarProps) {
  const router = useRouter()

  // Используем useSearch только для автокомплита
  const {
    suggestions,
    suggestionsLoading,
    searchHistory
  } = useSearch({
    autoSearch: false,
    syncWithUrl: false
  })

  const [localQuery, setLocalQuery] = useState('')

  // Обработчик выбора предложения
  const handleSuggestionSelect = useCallback((suggestion: any) => {
    if (suggestion.type === 'building') {
      router.push(`/buildings/${suggestion.id}`)
    } else {
      const params = new URLSearchParams()

      if (suggestion.type === 'architect') {
        params.set('architects', suggestion.value)
      } else if (suggestion.type === 'style') {
        params.set('styles', suggestion.value)
      } else if (suggestion.type === 'city') {
        params.set('cities', suggestion.value)
      } else {
        params.set('q', suggestion.value)
      }

      router.push(`/buildings?${params.toString()}`)
    }
    setLocalQuery('') // Очищаем поле после перехода
  }, [router])

  // Обработчик выбора из истории
  const handleHistorySelect = useCallback((historyItem: any) => {
    const params = searchToUrlParams(historyItem.query, historyItem.filters)
    router.push(`/buildings?${params.toString()}`)
    setLocalQuery('')
  }, [router])

  // Обработчик перехода к расширенному поиску
  const handleFiltersToggle = useCallback(() => {
    const params = localQuery.trim() ? `?q=${encodeURIComponent(localQuery.trim())}` : ''
    router.push(`/buildings${params}`)
    setLocalQuery('')
  }, [localQuery, router])

  return (
    <div className={className}>
      <SearchBar
        query={localQuery}
        onQueryChange={setLocalQuery}
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        searchHistory={searchHistory}
        onSuggestionSelect={handleSuggestionSelect}
        onHistorySelect={handleHistorySelect}
        activeFiltersCount={0}
        onFiltersToggle={handleFiltersToggle}
        size="sm"
        placeholder="Search architecture..."
        showFiltersButton={false} // В header не показываем кнопку фильтров
        className="w-full"
      />
    </div>
  )
}