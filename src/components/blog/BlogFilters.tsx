'use client'

import { useState } from 'react'
import { BlogPostFilters, BlogTag } from '@/types/blog'
import { Filter, X, Calendar, Building2, MapPin, User } from 'lucide-react'

interface BlogFiltersProps {
  filters: BlogPostFilters
  tags: BlogTag[]
  onFiltersChange: (filters: BlogPostFilters) => void
  onClose: () => void
}

export default function BlogFilters({ filters, tags, onFiltersChange, onClose }: BlogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<BlogPostFilters>(filters)

  const handleFilterChange = (key: keyof BlogPostFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value, offset: 0 }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters: BlogPostFilters = {
      status: 'published',
      sort_by: 'published_at',
      sort_order: 'desc',
      limit: 12,
      offset: 0
    }
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const hasActiveFilters = localFilters.author_id || localFilters.tag_slug || 
                          localFilters.building_id || localFilters.city

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Фильтры</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Сортировка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Сортировка
            </label>
            <select
              value={`${localFilters.sort_by}-${localFilters.sort_order}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                handleFilterChange('sort_by', sortBy)
                handleFilterChange('sort_order', sortOrder)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="published_at-desc">Сначала новые</option>
              <option value="published_at-asc">Сначала старые</option>
              <option value="view_count-desc">По популярности</option>
              <option value="title-asc">По алфавиту (А-Я)</option>
              <option value="title-desc">По алфавиту (Я-А)</option>
            </select>
          </div>

          {/* Теги */}
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тема
              </label>
              <select
                value={localFilters.tag_slug || ''}
                onChange={(e) => handleFilterChange('tag_slug', e.target.value || undefined)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все темы</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name} ({tag.post_count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Город */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Город
            </label>
            <input
              type="text"
              value={localFilters.city || ''}
              onChange={(e) => handleFilterChange('city', e.target.value || undefined)}
              placeholder="Например: Москва"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Статус */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус публикации
            </label>
            <select
              value={localFilters.status || 'published'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="published">Опубликованные</option>
              <option value="draft">Черновики</option>
              <option value="archived">Архивные</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Сбросить фильтры
            </button>
          )}
          <div className="flex space-x-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
