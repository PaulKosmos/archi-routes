'use client'

import { useState, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { PodcastSeries, PodcastTag, PodcastFilters } from '@/types/podcast'

interface PodcastFiltersProps {
  series: PodcastSeries[]
  tags: PodcastTag[]
  onFiltersChange: (filters: PodcastFilters) => void
  loading?: boolean
}

export default function PodcastFiltersComponent({
  series,
  tags,
  onFiltersChange,
  loading = false
}: PodcastFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'published_at' | 'episode_number'>('published_at')
  const [showSeriesDropdown, setShowSeriesDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)

  useEffect(() => {
    // Debounce filter updates
    const timer = setTimeout(() => {
      onFiltersChange({
        search: searchQuery || undefined,
        series_id: selectedSeries || undefined,
        tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
        sort_by: sortBy,
        sort_order: 'desc'
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedSeries, selectedTags, sortBy, onFiltersChange])

  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedSeries(null)
    setSelectedTags([])
    setSortBy('published_at')
  }

  const hasActiveFilters = searchQuery || selectedSeries || selectedTags.length > 0 || sortBy !== 'published_at'

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search episodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Series dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowSeriesDropdown(!showSeriesDropdown)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-left text-gray-900 flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
            disabled={loading}
          >
            <span className={selectedSeries ? 'font-medium' : 'text-gray-500'}>
              {selectedSeries
                ? series.find(s => s.id === selectedSeries)?.title || 'Выбрать серию'
                : 'Все серии'}
            </span>
            <ChevronDown size={18} className={`transition-transform ${showSeriesDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSeriesDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setSelectedSeries(null)
                  setShowSeriesDropdown(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-200"
              >
                Все серии
              </button>
              {series.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSeries(s.id)
                    setShowSeriesDropdown(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${selectedSeries === s.id ? 'bg-purple-50 text-purple-600 font-medium' : ''}`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setShowTagsDropdown(!showTagsDropdown)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-left text-gray-900 flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50"
            disabled={loading}
          >
            <span className={selectedTags.length > 0 ? 'font-medium' : 'text-gray-500'}>
              {selectedTags.length > 0 ? `${selectedTags.length} тег${selectedTags.length > 1 ? 'и' : ''}` : 'Все теги'}
            </span>
            <ChevronDown size={18} className={`transition-transform ${showTagsDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showTagsDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0 flex items-center gap-2 ${selectedTags.includes(tag.id) ? 'bg-purple-50' : ''
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    readOnly
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>{tag.name}</span>
                </button>
              ))}
              {tags.length === 0 && (
                <div className="px-4 py-3 text-center text-gray-500">
                  Нет доступных тегов
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {selectedTags.map(tagId => {
            const tag = tags.find(t => t.id === tagId)
            return (
              <div
                key={tagId}
                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-2"
              >
                {tag?.name}
                <button
                  onClick={() => handleToggleTag(tagId)}
                  className="hover:text-purple-900 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}

          {selectedSeries && (
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
              {series.find(s => s.id === selectedSeries)?.title}
              <button
                onClick={() => setSelectedSeries(null)}
                className="hover:text-blue-900 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 text-gray-600 hover:text-gray-900 text-sm underline transition-colors"
            >
              Очистить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  )
}
