'use client'

import { useState, useCallback } from 'react'
import {
  X, Search, Navigation, MapPin, Headphones, Star,
  Building2, ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal,
  Car, Bike, Footprints, Bus, Layers
} from 'lucide-react'

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
  onSearchSubmit?: (query: string) => void
}

// ── Компонент секции — ВЫНЕСЕН за пределы FilterPanel ───────────
interface FilterSectionProps {
  id: string
  title: string
  icon: React.ElementType
  children: React.ReactNode
  count?: number
  isExpanded: boolean
  onToggle: () => void
}

function FilterSection({ title, icon: Icon, children, count, isExpanded, onToggle }: FilterSectionProps) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="bg-[hsl(var(--map-primary))]/10 text-[hsl(var(--map-primary))] text-[10px] px-1.5 py-0.5 rounded-full font-metrics">
              {count}
            </span>
          )}
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Звёздный рейтинг — ВЫНЕСЕН за пределы FilterPanel ───────────
function StarRating({ filters, onFilterChange }: { filters: Filters; onFilterChange: (f: Filters) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onFilterChange({
            ...filters,
            minRating: filters.minRating === star ? 0 : star
          })}
          className={`transition-colors ${
            star <= filters.minRating
              ? 'text-yellow-400 hover:text-yellow-500'
              : 'text-muted-foreground/25 hover:text-muted-foreground/50'
          }`}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground font-metrics">
        {filters.minRating > 0 ? `from ${filters.minRating}★` : 'Any'}
      </span>
    </div>
  )
}

// ── Чекбокс-строка — ВЫНЕСЕН за пределы FilterPanel ─────────────
function CheckItem({
  checked, onChange, label, count
}: {
  checked: boolean
  onChange: () => void
  label: string
  count?: number
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-[var(--radius)] px-2 py-1.5 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-border accent-[hsl(var(--map-primary))] shrink-0"
      />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground/60">({count})</span>
      )}
    </label>
  )
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
  isMobile = false,
  onSearchSubmit
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['search', 'location', 'rating', 'styles', 'types'])
  )
  const [gettingLocation, setGettingLocation] = useState(false)

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
  }, [])

  const isExpanded = (section: string) => expandedSections.has(section)

  const activeCount = [
    filters.search !== '',
    filters.architecturalStyles.length > 0,
    filters.buildingTypes.length > 0,
    filters.cities.length > 0,
    filters.minRating > 0,
    filters.showOnlyFeatured,
    filters.hasAudio,
    filters.currentLocation !== null,
    filters.difficultyLevels.length > 0,
    filters.transportModes.length > 0,
  ].filter(Boolean).length

  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) return
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onFilterChange({
          ...filters,
          currentLocation: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        })
        setGettingLocation(false)
      },
      () => setGettingLocation(false)
    )
  }, [filters, onFilterChange])

  const toggleArrayFilter = useCallback(<K extends keyof Filters>(
    key: K,
    value: string
  ) => {
    const current = (filters[key] as string[])
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    onFilterChange({ ...filters, [key]: next })
  }, [filters, onFilterChange])

  if (!showFilters && !isMobile) return null

  return (
    <div className={isMobile ? 'bg-background' : 'bg-card'}>

      {/* ── Заголовок ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="bg-[hsl(var(--map-primary))] text-white text-[10px] px-1.5 py-0.5 rounded-full font-metrics leading-none">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* ── Секции ───────────────────────────────────────────────── */}
      <div>

        {/* Поиск */}
        <FilterSection
          id="search"
          title="Search"
          icon={Search}
          count={filters.search !== '' ? 1 : 0}
          isExpanded={isExpanded('search')}
          onToggle={() => toggleSection('search')}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSearchSubmit?.(filters.search)
            }}
            className="relative flex gap-1.5"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                placeholder="City, name, architect..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground rounded-[var(--radius)] outline-none focus:border-[hsl(var(--map-primary))] transition-colors"
              />
            </div>
            {onSearchSubmit && (
              <button
                type="submit"
                className="shrink-0 px-3 py-2 bg-[hsl(var(--map-primary))] hover:bg-[hsl(var(--map-primary))]/90 text-white text-xs font-medium rounded-[var(--radius)] transition-colors"
              >
                Go
              </button>
            )}
          </form>
        </FilterSection>

        {/* Геолокация */}
        <FilterSection
          id="location"
          title="Location"
          icon={Navigation}
          count={filters.currentLocation ? 1 : 0}
          isExpanded={isExpanded('location')}
          onToggle={() => toggleSection('location')}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onRadiusModeChange?.('location')
                  handleGeolocation()
                }}
                disabled={gettingLocation}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2.5 border rounded-[var(--radius)] transition-colors text-xs ${
                  radiusMode === 'location'
                    ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <Navigation className="w-4 h-4" />
                {gettingLocation ? 'Detecting…' : 'My Location'}
              </button>
              <button
                onClick={() => onRadiusModeChange?.('map')}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2.5 border rounded-[var(--radius)] transition-colors text-xs ${
                  radiusMode === 'map'
                    ? 'bg-[hsl(var(--map-primary))]/10 border-[hsl(var(--map-primary))] text-[hsl(var(--map-primary))]'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Choose on Map
              </button>
            </div>

            {radiusMode !== 'none' && (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Radius</span>
                  <span className="font-metrics font-medium text-foreground">{filters.radiusKm} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={filters.radiusKm}
                  onChange={(e) => onFilterChange({ ...filters, radiusKm: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-[hsl(var(--map-primary))]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>0.5 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
                {radiusMode === 'map' && (
                  <p className="text-[11px] text-muted-foreground">Click on the map to set the search center</p>
                )}
                {radiusMode === 'location' && filters.currentLocation && (
                  <p className="text-[11px] text-[hsl(var(--map-primary))]">Center set at your location</p>
                )}
              </div>
            )}

            {radiusMode !== 'none' && (
              <button
                onClick={() => {
                  onRadiusModeChange?.('none')
                  onFilterChange({ ...filters, currentLocation: null })
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-[var(--radius)] hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3" />
                Disable
              </button>
            )}
          </div>
        </FilterSection>

        {/* Рейтинг */}
        <FilterSection
          id="rating"
          title="Rating"
          icon={Star}
          count={filters.minRating > 0 ? 1 : 0}
          isExpanded={isExpanded('rating')}
          onToggle={() => toggleSection('rating')}
        >
          <StarRating filters={filters} onFilterChange={onFilterChange} />
        </FilterSection>

        {/* Архитектурные стили */}
        {uniqueValues.architecturalStyles.length > 0 && (
          <FilterSection
            id="styles"
            title="Architectural Style"
            icon={Building2}
            count={filters.architecturalStyles.length}
            isExpanded={isExpanded('styles')}
            onToggle={() => toggleSection('styles')}
          >
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {uniqueValues.architecturalStyles.map(style => (
                <CheckItem
                  key={style}
                  checked={filters.architecturalStyles.includes(style)}
                  onChange={() => toggleArrayFilter('architecturalStyles', style)}
                  label={style}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Типы зданий */}
        {uniqueValues.buildingTypes.length > 0 && (
          <FilterSection
            id="types"
            title="Object Type"
            icon={Layers}
            count={filters.buildingTypes.length}
            isExpanded={isExpanded('types')}
            onToggle={() => toggleSection('types')}
          >
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {uniqueValues.buildingTypes.map(type => (
                <CheckItem
                  key={type}
                  checked={filters.buildingTypes.includes(type)}
                  onChange={() => toggleArrayFilter('buildingTypes', type)}
                  label={type}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Транспорт (для маршрутов) */}
        {uniqueValues.transportModes.length > 0 && (
          <FilterSection
            id="transport"
            title="Transport Mode"
            icon={Footprints}
            count={filters.transportModes.length}
            isExpanded={isExpanded('transport')}
            onToggle={() => toggleSection('transport')}
          >
            <div className="space-y-0.5">
              {uniqueValues.transportModes.map(mode => {
                const icons: Record<string, React.ReactNode> = {
                  walking: <Footprints className="w-3.5 h-3.5 text-muted-foreground" />,
                  cycling: <Bike className="w-3.5 h-3.5 text-muted-foreground" />,
                  driving: <Car className="w-3.5 h-3.5 text-muted-foreground" />,
                  public_transport: <Bus className="w-3.5 h-3.5 text-muted-foreground" />,
                }
                const labels: Record<string, string> = {
                  walking: 'Walking', cycling: 'Cycling',
                  driving: 'Driving', public_transport: 'Public Transport',
                }
                return (
                  <label
                    key={mode}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-[var(--radius)] px-2 py-1.5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.transportModes.includes(mode)}
                      onChange={() => toggleArrayFilter('transportModes', mode)}
                      className="w-4 h-4 rounded border-border accent-[hsl(var(--map-primary))] shrink-0"
                    />
                    {icons[mode]}
                    <span className="text-sm text-foreground">{labels[mode] ?? mode}</span>
                  </label>
                )
              })}
            </div>
          </FilterSection>
        )}

        {/* Города */}
        {uniqueValues.cities.length > 1 && (
          <FilterSection
            id="cities"
            title="Cities"
            icon={MapPin}
            count={filters.cities.length}
            isExpanded={isExpanded('cities')}
            onToggle={() => toggleSection('cities')}
          >
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {uniqueValues.cities.map(city => (
                <CheckItem
                  key={city}
                  checked={filters.cities.includes(city)}
                  onChange={() => toggleArrayFilter('cities', city)}
                  label={city}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Аудио + Featured */}
        <FilterSection
          id="extra"
          title="Additional"
          icon={Headphones}
          count={[filters.hasAudio, filters.showOnlyFeatured].filter(Boolean).length}
          isExpanded={isExpanded('extra')}
          onToggle={() => toggleSection('extra')}
        >
          <div className="space-y-0.5">
            <label className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-[var(--radius)] px-2 py-1.5 transition-colors">
              <input
                type="checkbox"
                checked={filters.hasAudio}
                onChange={() => onFilterChange({ ...filters, hasAudio: !filters.hasAudio })}
                className="w-4 h-4 rounded border-border accent-[hsl(var(--map-primary))] shrink-0"
              />
              <Headphones className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">Has audio guide</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-[var(--radius)] px-2 py-1.5 transition-colors">
              <input
                type="checkbox"
                checked={filters.showOnlyFeatured}
                onChange={() => onFilterChange({ ...filters, showOnlyFeatured: !filters.showOnlyFeatured })}
                className="w-4 h-4 rounded border-border accent-[hsl(var(--map-primary))] shrink-0"
              />
              <Star className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">Featured only</span>
            </label>
          </div>
        </FilterSection>

      </div>
    </div>
  )
}
