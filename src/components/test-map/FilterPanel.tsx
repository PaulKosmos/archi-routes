'use client'

import { useState, useCallback, SetStateAction } from 'react'
import { 
  Filter, 
  X, 
  Search, 
  MapPin, 
  Navigation
} from 'lucide-react'
import type { Building, Route } from '@/types/building'

interface Filters {
  search: string
  cities: string[]
  architecturalStyles: string[]
  buildingTypes: string[]
  difficultyLevels: string[]
  transportModes: string[]
  showOnlyPublished: boolean
  showOnlyFeatured: boolean
  minRating: number
  maxDistance: number
  radiusKm: number
  currentLocation: { lat: number; lng: number } | null
  hasAudio: boolean
}

interface UniqueValues {
  cities: string[]
  architecturalStyles: string[]
  buildingTypes: string[]
  difficultyLevels: string[]
  transportModes: string[]
}

interface FilterPanelProps {
  filters: Filters
  uniqueValues: UniqueValues
  onFilterChange: (filters: Filters) => void
  onReset: () => void
  showFilters: boolean
  onToggleFilters: () => void
  radiusMode?: 'none' | 'location' | 'map'
  onRadiusModeChange?: (mode: 'none' | 'location' | 'map') => void
}

export default function FilterPanel({
  filters,
  uniqueValues,
  onFilterChange,
  onReset,
  showFilters,
  onToggleFilters,
  radiusMode = 'none',
  onRadiusModeChange
}: FilterPanelProps) {
  // Убрали isExpanded - все фильтры всегда видимы

  const handleQuickFilter = useCallback((filter: string, value: string) => {
    switch (filter) {
      case 'rating':
        onFilterChange({
          ...filters,
          minRating: parseFloat(value)
        })
        break
      case 'distance':
        onFilterChange({
          ...filters,
          maxDistance: parseFloat(value)
        })
        break
      case 'featured':
        onFilterChange({
          ...filters,
          showOnlyFeatured: value === 'true'
        })
        break
      case 'published':
        onFilterChange({
          ...filters,
          showOnlyPublished: value === 'true'
        })
        break
    }
  }, [filters, onFilterChange])

  const handleGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onFilterChange({
            ...filters,
            currentLocation: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          })
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error)
        }
      )
    }
  }, [filters, onFilterChange])

  return (
    <div className="bg-card border-b border-border">
      {/* Кнопка показать/скрыть фильтры */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onToggleFilters}
          className={`flex items-center px-4 py-2 rounded-[var(--radius)] border transition-colors ${
            showFilters
              ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
              : 'bg-card border-border text-foreground hover:bg-muted'
          }`}
        >
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
          {showFilters && (
            <span className="ml-2 bg-[hsl(var(--map-primary))] text-white text-xs rounded-full px-2 py-1">
              Активны
            </span>
          )}
        </button>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="px-4 pb-4">
          {/* Поиск */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                placeholder="Поиск по названию, архитектору, стилю..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Геолокация и радиус */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Местоположение
            </label>
            
            {/* Кнопки выбора режима - 2 кубика в ряд, отключить снизу */}
            <div className="space-y-2 mb-3">
              {/* Два кубика в ряд */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onRadiusModeChange?.('location')
                    handleGeolocation()
                  }}
                  className={`flex flex-col items-center justify-center px-3 py-3 border rounded-lg transition-colors ${
                    radiusMode === 'location'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Navigation className="w-5 h-5 mb-1" />
                  <span className="text-xs text-center">Моё местоположение</span>
                </button>
                
                <button
                  onClick={() => onRadiusModeChange?.('map')}
                  className={`flex flex-col items-center justify-center px-3 py-3 border rounded-lg transition-colors ${
                    radiusMode === 'map'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-5 h-5 mb-1" />
                  <span className="text-xs text-center">Выбрать на карте</span>
                </button>
              </div>
              
              {/* Отключить снизу на всю ширину */}
              <button
                onClick={() => {
                  onRadiusModeChange?.('none')
                  onFilterChange({
                    ...filters,
                    currentLocation: null
                  })
                }}
                className="w-full flex items-center justify-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 mr-2 text-gray-600" />
                <span className="text-sm">Отключить</span>
              </button>
            </div>
            
            {/* Настройки радиуса */}
            {radiusMode !== 'none' && (
              <div className="space-y-3">
                {/* Ввод радиуса цифрами */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Радиус поиска (км)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={filters.radiusKm}
                    onChange={(e) => onFilterChange({ 
                      ...filters, 
                      radiusKm: parseFloat(e.target.value) || 0.5
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Ползунок радиуса */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Радиус: {filters.radiusKm} км
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={filters.radiusKm}
                    onChange={(e) => onFilterChange({ 
                      ...filters, 
                      radiusKm: parseFloat(e.target.value) 
                    })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                {/* Подсказка */}
                {radiusMode === 'map' && (
                  <p className="text-xs text-gray-500">
                    💡 Кликните на карту, чтобы выбрать центр поиска
                  </p>
                )}
                {radiusMode === 'location' && filters.currentLocation && (
                  <p className="text-xs text-green-600">
                    ✅ Центр установлен на вашем местоположении
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Быстрые фильтры */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Быстрые фильтры
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickFilter('rating', '4')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.minRating >= 4 
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⭐ 4+ рейтинг
              </button>
              <button
                onClick={() => handleQuickFilter('featured', 'true')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.showOnlyFeatured 
                    ? 'bg-purple-100 border-purple-300 text-purple-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌟 Рекомендуемые
              </button>
              <button
                onClick={() => handleQuickFilter('distance', '5')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.maxDistance <= 5 
                    ? 'bg-green-100 border-green-300 text-green-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📍 До 5 км
              </button>
            </div>
          </div>

          {/* Расширенные фильтры */}
          <div className="space-y-4">
              {/* Города */}
              {uniqueValues.cities.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Города
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.cities.map(city => (
                      <label key={city} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.cities.includes(city)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onFilterChange({
                                ...filters,
                                cities: [...filters.cities, city]
                              })
                            } else {
                              onFilterChange({
                                ...filters,
                                cities: filters.cities.filter(c => c !== city)
                              })
                            }
                          }}
                          className="mr-2 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{city}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Архитектурные стили */}
              {uniqueValues.architecturalStyles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Архитектурные стили
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {uniqueValues.architecturalStyles.map(style => (
                      <button
                        key={style}
                        onClick={() => {
                          if (filters.architecturalStyles.includes(style)) {
                            onFilterChange({
                              ...filters,
                              architecturalStyles: filters.architecturalStyles.filter(s => s !== style)
                            })
                          } else {
                            onFilterChange({
                              ...filters,
                              architecturalStyles: [...filters.architecturalStyles, style]
                            })
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          filters.architecturalStyles.includes(style)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Типы зданий */}
              {uniqueValues.buildingTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Типы зданий
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.buildingTypes.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.buildingTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onFilterChange({
                                ...filters,
                                buildingTypes: [...filters.buildingTypes, type]
                              })
                            } else {
                              onFilterChange({
                                ...filters,
                                buildingTypes: filters.buildingTypes.filter(t => t !== type)
                              })
                            }
                          }}
                          className="mr-2 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Фильтр аудио */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Аудио
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onFilterChange({
                      ...filters,
                      hasAudio: !filters.hasAudio
                    })}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      filters.hasAudio
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎧 С аудио
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
