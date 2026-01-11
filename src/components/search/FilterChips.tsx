// src/components/search/FilterChips.tsx
'use client'

import { X } from 'lucide-react'
import { SearchFilters, formatYearRange } from '@/utils/searchUtils'

interface FilterChipsProps {
  filters: SearchFilters
  metadata: {
    yearRange: [number, number]
  }
  onRemoveFilter: (filterType: keyof SearchFilters, value?: string) => void
  onClearAll: () => void
  className?: string
}

export function FilterChips({
  filters,
  metadata,
  onRemoveFilter,
  onClearAll,
  className = ''
}: FilterChipsProps) {
  const chips: Array<{
    id: string
    label: string
    type: keyof SearchFilters
    value?: string
  }> = []

  // Стили
  filters.styles.forEach(style => {
    chips.push({
      id: `style-${style}`,
      label: style,
      type: 'styles',
      value: style
    })
  })

  // Архитекторы
  filters.architects.forEach(architect => {
    chips.push({
      id: `architect-${architect}`,
      label: architect,
      type: 'architects',
      value: architect
    })
  })

  // Города
  filters.cities.forEach(city => {
    chips.push({
      id: `city-${city}`,
      label: city,
      type: 'cities',
      value: city
    })
  })

  // Период лет
  if (filters.yearRange[0] > metadata.yearRange[0] || filters.yearRange[1] < metadata.yearRange[1]) {
    chips.push({
      id: 'year-range',
      label: `Years: ${formatYearRange(filters.yearRange)}`,
      type: 'yearRange'
    })
  }

  // Рейтинг
  if (filters.minRating > 0) {
    chips.push({
      id: 'rating',
      label: `From ${filters.minRating} stars`,
      type: 'minRating'
    })
  }

  // Наличие фото
  if (filters.hasPhoto !== null) {
    chips.push({
      id: 'photo',
      label: filters.hasPhoto ? 'With photos' : 'Without photos',
      type: 'hasPhoto'
    })
  }

  if (chips.length === 0) return null

  const handleRemoveChip = (chip: typeof chips[0]) => {
    if (chip.type === 'styles' && chip.value) {
      onRemoveFilter('styles', chip.value)
    } else if (chip.type === 'architects' && chip.value) {
      onRemoveFilter('architects', chip.value)
    } else if (chip.type === 'cities' && chip.value) {
      onRemoveFilter('cities', chip.value)
    } else if (chip.type === 'yearRange') {
      onRemoveFilter('yearRange')
    } else if (chip.type === 'minRating') {
      onRemoveFilter('minRating')
    } else if (chip.type === 'hasPhoto') {
      onRemoveFilter('hasPhoto')
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 font-medium">Filters:</span>

      {chips.map(chip => (
        <div
          key={chip.id}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full border border-blue-200 hover:bg-blue-200 transition-colors"
        >
          <span className="max-w-32 truncate">{chip.label}</span>
          <button
            onClick={() => handleRemoveChip(chip)}
            className="ml-1 hover:bg-blue-300 rounded-full p-0.5 transition-colors"
            title={`Remove filter: ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}