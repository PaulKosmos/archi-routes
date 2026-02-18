// src/components/RouteFilterPanel.tsx
'use client'

import { useState } from 'react'
import {
  X, ChevronDown, ChevronUp, RotateCcw, MapPin, Clock, Navigation2, Car, Bike, BusFront, Footprints
} from 'lucide-react'

interface RouteFilters {
  cities: string[]
  transport: string[]
  durationRange: [number, number]
}

interface RouteFilterPanelProps {
  filters: RouteFilters
  availableCities: string[]
  onFiltersChange: (filters: Partial<RouteFilters>) => void
  onClearFilters: () => void
  isOpen: boolean
  onClose: () => void
  activeFiltersCount: number
}

export function RouteFilterPanel({
  filters,
  availableCities,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onClose,
  activeFiltersCount
}: RouteFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['transport', 'duration']) // Открываем важные секции по умолчанию
  )

  if (!isOpen) return null

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const isExpanded = (section: string) => expandedSections.has(section)

  const handleCityToggle = (city: string) => {
    const currentCities = filters.cities || []
    const newCities = currentCities.includes(city)
      ? currentCities.filter(c => c !== city)
      : [...currentCities, city]
    onFiltersChange({ cities: newCities })
  }

  const handleTransportToggle = (mode: string) => {
    const currentTransport = filters.transport || []
    const newTransport = currentTransport.includes(mode)
      ? currentTransport.filter(m => m !== mode)
      : [...currentTransport, mode]
    onFiltersChange({ transport: newTransport })
  }

  const handleDurationChange = (value: [number, number]) => {
    onFiltersChange({ durationRange: value })
  }

  const transportModes = [
    { value: 'walking', label: 'Walking', icon: Footprints },
    { value: 'cycling', label: 'Cycling', icon: Bike },
    { value: 'driving', label: 'Driving', icon: Car },
    { value: 'public_transport', label: 'Public Transport', icon: BusFront }
  ]

  // Секция фильтров с возможностью свертывания
  const FilterSection = ({
    id,
    title,
    icon: Icon,
    children,
    count
  }: {
    id: string
    title: string
    icon: any
    children: React.ReactNode
    count?: number
  }) => (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-foreground">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-metrics">
              {count}
            </span>
          )}
        </div>
        {isExpanded(id) ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded(id) && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Overlay — только на sm+ где панель не полноэкранная */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 hidden sm:block lg:hidden"
        onClick={onClose}
      />

      {/* Панель фильтров */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-80 bg-card shadow-xl z-50 overflow-y-auto lg:relative lg:w-full lg:h-auto lg:shadow-none">
        <div className="lg:bg-card lg:border lg:border-border lg:rounded-lg">
          {/* Заголовок */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 lg:bg-card lg:rounded-t-lg">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">Filters</h3>
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-primary-foreground text-sm px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1 hover:bg-muted rounded-md transition-colors lg:hidden"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Фильтры */}
          <div>
            {/* Транспорт */}
            <FilterSection
              id="transport"
              title="Transport Mode"
              icon={Navigation2}
              count={filters.transport.length}
            >
              <div className="space-y-2">
                {transportModes.map((mode) => {
                  const ModeIcon = mode.icon
                  return (
                    <label
                      key={mode.value}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.transport.includes(mode.value)}
                        onChange={() => handleTransportToggle(mode.value)}
                        className="w-4 h-4"
                      />
                      <ModeIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-sm text-foreground">{mode.label}</span>
                    </label>
                  )
                })}
              </div>
            </FilterSection>

            {/* Продолжительность */}
            <FilterSection
              id="duration"
              title="Duration"
              icon={Clock}
              count={filters.durationRange[0] > 0 || filters.durationRange[1] < 300 ? 1 : 0}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1 font-metrics">From (min)</label>
                    <input
                      type="number"
                      min="0"
                      max={filters.durationRange[1]}
                      value={filters.durationRange[0]}
                      onChange={(e) => handleDurationChange([parseInt(e.target.value) || 0, filters.durationRange[1]])}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground text-sm font-metrics rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">—</span>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1 font-metrics">To (min)</label>
                    <input
                      type="number"
                      min={filters.durationRange[0]}
                      max="300"
                      value={filters.durationRange[1]}
                      onChange={(e) => handleDurationChange([filters.durationRange[0], parseInt(e.target.value) || 300])}
                      className="w-full px-3 py-2 border border-border bg-background text-foreground text-sm font-metrics rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </FilterSection>

            {/* Города */}
            {availableCities.length > 0 && (
              <FilterSection
                id="cities"
                title="Cities"
                icon={MapPin}
                count={filters.cities.length}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCities.map((city) => (
                    <label
                      key={city}
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.cities.includes(city)}
                        onChange={() => handleCityToggle(city)}
                        className="w-4 h-4"
                      />
                      <span className="flex-1 text-sm text-foreground">{city}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}
          </div>

          {/* Футер с действиями */}
          <div className="p-4 border-t border-border bg-muted/30 lg:bg-card lg:rounded-b-lg">
            <div className="flex gap-3">
              <button
                onClick={onClearFilters}
                disabled={activeFiltersCount === 0}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset All
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors lg:hidden"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
