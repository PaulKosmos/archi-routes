'use client'

import { Suspense, lazy } from 'react'
import { Filter } from 'lucide-react'

// Ленивая загрузка FilterPanel
const FilterPanel = lazy(() => import('./FilterPanel'))

interface Filters {
  search: string
  cities: string[]
  architecturalStyles: string[]
  buildingTypes: string[]
  transportModes: string[]
  difficultyLevels: string[]
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
  transportModes: string[]
  difficultyLevels: string[]
}

interface LazyFilterPanelProps {
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

// Компонент загрузки для фильтров
function LoadingSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Кнопка показать/скрыть фильтры */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg animate-pulse">
          <Filter className="w-4 h-4 mr-2 text-gray-400" />
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      </div>

      {/* Панель фильтров */}
      <div className="px-4 pb-4 border-t border-gray-100">
        {/* Поиск */}
        <div className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-12 mb-2 animate-pulse"></div>
          <div className="relative">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Геолокация и радиус */}
        <div className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
          <div className="flex items-center space-x-3">
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Быстрые фильтры */}
        <div className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-8 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LazyFilterPanel(props: LazyFilterPanelProps) {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FilterPanel {...props} />
    </Suspense>
  )
}
