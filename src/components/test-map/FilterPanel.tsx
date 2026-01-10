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
  isMobile?: boolean
}

export default function FilterPanel({
  filters,
  uniqueValues,
  onFilterChange,
  onReset,
  showFilters,
  onToggleFilters,
  radiusMode = 'none',
  onRadiusModeChange,
  isMobile = false
}: FilterPanelProps) {
  // Убрали isExpanded - все фильтры всегда видимы

  const handleQuickFilter = useCallback((filter: string, value: string) => {
    switch (filter) {
      case 'rating':
        const newRating = parseFloat(value)
        onFilterChange({
          ...filters,
          minRating: filters.minRating >= newRating ? 0 : newRating
        })
        break
      case 'distance':
        const newDistance = parseFloat(value)
        onFilterChange({
          ...filters,
          maxDistance: filters.maxDistance <= newDistance ? 50 : newDistance
        })
        break
      case 'featured':
        onFilterChange({
          ...filters,
          showOnlyFeatured: !filters.showOnlyFeatured
        })
        break
      case 'published':
        onFilterChange({
          ...filters,
          showOnlyPublished: !filters.showOnlyPublished
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
    <div className={`${isMobile ? 'bg-background' : 'bg-card border-b border-border'}`}>
      {/* Панель фильтров */}
      {(showFilters || isMobile) && (
        <div className={`${isMobile ? 'px-0 pb-4' : 'px-4 pb-4'}`}>
          {/* Поиск */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                placeholder="Search by name, architect, style..."
                className={`w-full pl-10 pr-4 ${isMobile ? 'py-3 text-base' : 'py-2 text-sm'} border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--map-primary))] transition-colors`}
              />
            </div>
          </div>

          {/* Геолокация и радиус */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Location
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
                  className={`flex flex-col items-center justify-center px-3 py-3 border rounded-[var(--radius)] transition-colors ${
                    radiusMode === 'location'
                      ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <Navigation className="w-5 h-5 mb-1" />
                  <span className="text-xs text-center">My Location</span>
                </button>

                <button
                  onClick={() => onRadiusModeChange?.('map')}
                  className={`flex flex-col items-center justify-center px-3 py-3 border rounded-[var(--radius)] transition-colors ${
                    radiusMode === 'map'
                      ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <MapPin className="w-5 h-5 mb-1" />
                  <span className="text-xs text-center">Choose on Map</span>
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
                className="w-full flex items-center justify-center px-3 py-2 bg-muted border border-border rounded-[var(--radius)] hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm text-foreground">Disable</span>
              </button>
            </div>
            
            {/* Настройки радиуса */}
            {radiusMode !== 'none' && (
              <div className="space-y-3">
                {/* Ввод радиуса цифрами */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Search Radius (km)
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
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--map-primary))] transition-colors"
                  />
                </div>

                {/* Ползунок радиуса */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Radius: {filters.radiusKm} km
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
                    className="w-full h-2 bg-muted rounded-[var(--radius)] appearance-none cursor-pointer accent-[hsl(var(--map-primary))]"
                  />
                </div>

                {/* Подсказка */}
                {radiusMode === 'map' && (
                  <p className="text-xs text-muted-foreground">
                    💡 Click on the map to choose search center
                  </p>
                )}
                {radiusMode === 'location' && filters.currentLocation && (
                  <p className="text-xs text-[hsl(var(--map-primary))]">
                    ✅ Center set at your location
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Быстрые фильтры */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Quick Filters
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickFilter('rating', '4')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.minRating >= 4
                    ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                    : 'bg-muted border-border text-foreground hover:bg-muted/80'
                }`}
              >
                4+ Rating
              </button>
              <button
                onClick={() => handleQuickFilter('featured', 'true')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.showOnlyFeatured
                    ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                    : 'bg-muted border-border text-foreground hover:bg-muted/80'
                }`}
              >
                Featured
              </button>
              <button
                onClick={() => handleQuickFilter('distance', '5')}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.maxDistance <= 5
                    ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                    : 'bg-muted border-border text-foreground hover:bg-muted/80'
                }`}
              >
                Within 5 km
              </button>
            </div>
          </div>

          {/* Расширенные фильтры */}
          <div className="space-y-4">
              {/* Архитектурные стили */}
              {uniqueValues.architecturalStyles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Architectural Styles
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
                            ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                            : 'bg-muted border-border text-foreground hover:bg-muted/80'
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Building Types
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {uniqueValues.buildingTypes.map(type => (
                      <label key={type} className="flex items-center cursor-pointer hover:bg-muted/50 rounded-[var(--radius)] px-2 py-1 transition-colors">
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
                          className="mr-2 rounded border-border accent-[hsl(var(--map-primary))]"
                        />
                        <span className="text-sm text-foreground">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Фильтр аудио */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Audio
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onFilterChange({
                      ...filters,
                      hasAudio: !filters.hasAudio
                    })}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      filters.hasAudio
                        ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                        : 'bg-muted border-border text-foreground hover:bg-muted/80'
                    }`}
                  >
                    🎧 With Audio
                  </button>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
