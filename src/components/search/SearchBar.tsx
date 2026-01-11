// src/components/search/SearchBar.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, X, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import { SearchSuggestion } from '@/utils/searchUtils'

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  suggestions: SearchSuggestion[]
  suggestionsLoading: boolean
  searchHistory: Array<{
    id: string
    query: string
    filters: any
    timestamp: string
  }>
  onSuggestionSelect: (suggestion: SearchSuggestion) => void
  onHistorySelect: (item: any) => void
  activeFiltersCount: number
  onFiltersToggle: () => void
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  showFiltersButton?: boolean
  autoFocus?: boolean
  className?: string
}

export function SearchBar({
  query,
  onQueryChange,
  suggestions,
  suggestionsLoading,
  searchHistory,
  onSuggestionSelect,
  onHistorySelect,
  activeFiltersCount,
  onFiltersToggle,
  size = 'md',
  placeholder = 'Search buildings, architects...',
  showFiltersButton = true,
  autoFocus = false,
  className = ''
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Показывать dropdown с предложениями или историей
  const showDropdown = isFocused && (suggestions.length > 0 || (!query.trim() && searchHistory.length > 0))
  const dropdownItems = query.trim() ? suggestions : searchHistory.slice(0, 5)

  // Размеры компонента
  const sizeClasses = {
    sm: {
      container: 'h-10',
      input: 'text-sm pl-10 pr-4',
      icon: 'w-4 h-4 left-3 top-1/2 -translate-y-1/2',
      filterButton: 'px-2 py-1.5 text-xs'
    },
    md: {
      container: 'h-12',
      input: 'text-base pl-12 pr-4',
      icon: 'w-5 h-5 left-4 top-1/2 -translate-y-1/2',
      filterButton: 'px-3 py-2 text-sm'
    },
    lg: {
      container: 'h-14',
      input: 'text-lg pl-14 pr-4',
      icon: 'w-6 h-6 left-4 top-1/2 -translate-y-1/2',
      filterButton: 'px-4 py-3 text-base'
    }
  }

  const currentSize = sizeClasses[size]

  // Обработка клавиш навигации
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDropdown) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < dropdownItems.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > -1 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < dropdownItems.length) {
            const item = dropdownItems[selectedIndex]
            if ('type' in item) {
              // Это suggestion
              onSuggestionSelect(item as SearchSuggestion)
            } else {
              // Это история
              onHistorySelect(item)
            }
            setIsFocused(false)
            inputRef.current?.blur()
          }
          break
        case 'Escape':
          setIsFocused(false)
          inputRef.current?.blur()
          break
      }
    }

    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFocused, showDropdown, dropdownItems, selectedIndex, onSuggestionSelect, onHistorySelect])

  // Сброс выбранного элемента при изменении предложений
  useEffect(() => {
    setSelectedIndex(-1)
  }, [suggestions, searchHistory, query])

  // Автофокус
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Клик вне dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQueryChange(e.target.value)
  }

  const handleClear = () => {
    onQueryChange('')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (item: SearchSuggestion | any) => {
    if ('type' in item) {
      onSuggestionSelect(item as SearchSuggestion)
    } else {
      onHistorySelect(item)
    }
    setIsFocused(false)
  }

  const formatHistoryTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.round(diffHours / 24)}d ago`
  }

  return (
    <div className={`relative ${className}`}>
      {/* Основное поле ввода */}
      <div className={`relative flex items-center ${currentSize.container}`}>
        <div className="relative flex-1">
          <Search className={`absolute ${currentSize.icon} text-gray-400 pointer-events-none`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className={`
              w-full ${currentSize.container} ${currentSize.input}
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              hover:border-gray-400 transition-colors
              ${query ? 'pr-10' : ''}
            `}
          />

          {/* Кнопка очистки */}
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Кнопка фильтров */}
        {showFiltersButton && (
          <button
            onClick={onFiltersToggle}
            className={`
              ml-3 ${currentSize.filterButton}
              border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors
              flex items-center gap-2
              ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-700'}
            `}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Dropdown с предложениями */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Предложения поиска */}
          {query.trim() && suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 font-medium mb-2 px-2">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors
                    flex items-center gap-3
                    ${selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <span dangerouslySetInnerHTML={{ __html: suggestion.label }} />
                  {suggestion.count && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {suggestion.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Загрузка предложений */}
          {query.trim() && suggestionsLoading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Searching...
            </div>
          )}

          {/* История поисков */}
          {!query.trim() && searchHistory.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-500 font-medium mb-2 px-2 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {searchHistory.slice(0, 5).map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors
                    ${selectedIndex === index ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.query || 'Search with filters'}
                      </div>
                      {Object.values(item.filters).some(v =>
                        Array.isArray(v) ? v.length > 0 : v !== null && v !== 0
                      ) && (
                          <div className="text-xs text-gray-500 mt-1">
                            With filters
                          </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatHistoryTime(item.timestamp)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Пустое состояние */}
          {query.trim() && !suggestionsLoading && suggestions.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nothing found
            </div>
          )}

          {/* Навигационные подсказки */}
          {dropdownItems.length > 0 && (
            <div className="border-t border-gray-100 p-2">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <ArrowUp className="w-3 h-3" />
                  <ArrowDown className="w-3 h-3" />
                  navigate
                </div>
                <div>Enter select</div>
                <div>Esc close</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}