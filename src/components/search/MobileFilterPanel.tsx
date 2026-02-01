// src/components/search/MobileFilterPanel.tsx
'use client'

import { useState } from 'react'
import {
    ChevronDown, ChevronUp, RotateCcw, Camera, MapPin, Calendar, Star, User, Building2,
    Volume2, VolumeX, Navigation, ArrowUpDown, MessageSquare, Accessibility, X
} from 'lucide-react'
import {
    SearchFilters, SearchMetadata, getUserLocation,
    SORT_OPTIONS, ACCESSIBILITY_OPTIONS
} from '@/utils/searchUtils'

interface MobileFilterPanelProps {
    filters: SearchFilters
    metadata: SearchMetadata
    onFiltersChange: (filters: Partial<SearchFilters>) => void
    onClearFilters: () => void
    activeFiltersCount: number
    onClose: () => void
}

export function MobileFilterPanel({
    filters,
    metadata,
    onFiltersChange,
    onClearFilters,
    activeFiltersCount,
    onClose
}: MobileFilterPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['styles', 'rating'])
    )
    const [gettingLocation, setGettingLocation] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)

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

    // Обработчики фильтров
    const handleStyleToggle = (style: string) => {
        const currentStyles = filters.styles || []
        const newStyles = currentStyles.includes(style)
            ? currentStyles.filter(s => s !== style)
            : [...currentStyles, style]
        onFiltersChange({ styles: newStyles })
    }

    const handleArchitectToggle = (architect: string) => {
        const currentArchitects = filters.architects || []
        const newArchitects = currentArchitects.includes(architect)
            ? currentArchitects.filter(a => a !== architect)
            : [...currentArchitects, architect]
        onFiltersChange({ architects: newArchitects })
    }

    const handleCityToggle = (city: string) => {
        const currentCities = filters.cities || []
        const newCities = currentCities.includes(city)
            ? currentCities.filter(c => c !== city)
            : [...currentCities, city]
        onFiltersChange({ cities: newCities })
    }

    const handleRatingChange = (rating: number) => {
        onFiltersChange({ minRating: rating === filters.minRating ? 0 : rating })
    }

    const handlePhotoFilter = (hasPhoto: boolean | null) => {
        onFiltersChange({ hasPhoto })
    }

    const handleSortChange = (sortBy: SearchFilters['sortBy']) => {
        onFiltersChange({ sortBy })
    }

    const handleNearMeToggle = async () => {
        if (filters.nearMe) {
            onFiltersChange({
                nearMe: false,
                userLocation: undefined,
                sortBy: filters.sortBy === 'distance' ? 'relevance' : filters.sortBy
            })
            setLocationError(null)
            return
        }

        setGettingLocation(true)
        setLocationError(null)

        try {
            const location = await getUserLocation()
            onFiltersChange({
                nearMe: true,
                userLocation: location,
                sortBy: 'distance'
            })
        } catch (error: any) {
            setLocationError(error.message)
        } finally {
            setGettingLocation(false)
        }
    }

    // Компонент звездочек для рейтинга
    const StarRating = ({ rating, onRatingClick }: { rating: number; onRatingClick: (rating: number) => void }) => (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => onRatingClick(star)}
                    className={`transition-colors ${star <= rating
                        ? 'text-yellow-400 hover:text-yellow-500'
                        : 'text-muted-foreground/30 hover:text-muted-foreground/50'
                        }`}
                >
                    <Star className="w-6 h-6 fill-current" />
                </button>
            ))}
        </div>
    )

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
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm text-foreground">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-metrics">
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
                <div className="px-3 pb-3">
                    {children}
                </div>
            )}
        </div>
    )

    return (
        <div className="max-h-[60vh] overflow-y-auto">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                            {activeFiltersCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onClearFilters}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Clear
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Фильтры */}
            <div>
                {/* Сортировка */}
                <FilterSection id="sort" title="Sort" icon={ArrowUpDown} count={filters.sortBy !== 'relevance' ? 1 : 0}>
                    <div className="space-y-1">
                        {SORT_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors"
                            >
                                <input
                                    type="radio"
                                    name="mobile-sort"
                                    checked={filters.sortBy === option.value}
                                    onChange={() => handleSortChange(option.value)}
                                    className="w-4 h-4 text-primary border-border focus:ring-primary"
                                />
                                <span className="text-sm text-foreground">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>

                {/* Геолокация */}
                <FilterSection id="location" title="Near Me" icon={Navigation} count={filters.nearMe ? 1 : 0}>
                    <button
                        onClick={handleNearMeToggle}
                        disabled={gettingLocation}
                        className={`w-full px-3 py-2 rounded border transition-colors flex items-center justify-center gap-2 text-sm ${filters.nearMe
                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                            : 'bg-muted border-border text-foreground hover:bg-muted/80'
                            } ${gettingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {gettingLocation ? (
                            <>
                                <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
                                Determining...
                            </>
                        ) : filters.nearMe ? (
                            <>
                                <Navigation className="w-4 h-4" />
                                Search nearby enabled
                            </>
                        ) : (
                            <>
                                <MapPin className="w-4 h-4" />
                                Find near me
                            </>
                        )}
                    </button>
                    {locationError && (
                        <p className="text-xs text-destructive mt-2">{locationError}</p>
                    )}
                </FilterSection>

                {/* Рейтинг */}
                <FilterSection id="rating" title="Rating" icon={Star} count={filters.minRating > 0 ? 1 : 0}>
                    <div className="flex flex-col items-center gap-2">
                        <StarRating rating={filters.minRating} onRatingClick={handleRatingChange} />
                        <span className="text-xs text-muted-foreground">
                            {filters.minRating > 0 ? `From ${filters.minRating} stars` : 'Any rating'}
                        </span>
                    </div>
                </FilterSection>

                {/* Архитектурные стили */}
                {metadata.styles.length > 0 && (
                    <FilterSection id="styles" title="Architectural Style" icon={Building2} count={filters.styles.length}>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {metadata.styles.map((style) => (
                                <label
                                    key={style.value}
                                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.styles.includes(style.value)}
                                        onChange={() => handleStyleToggle(style.value)}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="flex-1 text-sm text-foreground">{style.value}</span>
                                    <span className="text-xs text-muted-foreground">({style.count})</span>
                                </label>
                            ))}
                        </div>
                    </FilterSection>
                )}

                {/* Города */}
                {metadata.cities.length > 1 && (
                    <FilterSection id="cities" title="Cities" icon={MapPin} count={filters.cities.length}>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {metadata.cities.map((city) => (
                                <label
                                    key={city.value}
                                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.cities.includes(city.value)}
                                        onChange={() => handleCityToggle(city.value)}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="flex-1 text-sm text-foreground">{city.value}</span>
                                    <span className="text-xs text-muted-foreground">({city.count})</span>
                                </label>
                            ))}
                        </div>
                    </FilterSection>
                )}

                {/* Архитекторы */}
                {metadata.architects.length > 0 && (
                    <FilterSection id="architects" title="Architects" icon={User} count={filters.architects.length}>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {metadata.architects.map((architect) => (
                                <label
                                    key={architect.value}
                                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={filters.architects.includes(architect.value)}
                                        onChange={() => handleArchitectToggle(architect.value)}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                    />
                                    <span className="flex-1 text-sm text-foreground truncate">{architect.value}</span>
                                    <span className="text-xs text-muted-foreground">({architect.count})</span>
                                </label>
                            ))}
                        </div>
                    </FilterSection>
                )}

                {/* Фото */}
                <FilterSection id="photo" title="Photos" icon={Camera} count={filters.hasPhoto !== null ? 1 : 0}>
                    <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                            <input
                                type="radio"
                                name="mobile-photo"
                                checked={filters.hasPhoto === null}
                                onChange={() => handlePhotoFilter(null)}
                                className="w-4 h-4 text-primary border-border focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">Any</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                            <input
                                type="radio"
                                name="mobile-photo"
                                checked={filters.hasPhoto === true}
                                onChange={() => handlePhotoFilter(true)}
                                className="w-4 h-4 text-primary border-border focus:ring-primary"
                            />
                            <Camera className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-foreground">Has photos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                            <input
                                type="radio"
                                name="mobile-photo"
                                checked={filters.hasPhoto === false}
                                onChange={() => handlePhotoFilter(false)}
                                className="w-4 h-4 text-primary border-border focus:ring-primary"
                            />
                            <span className="text-sm text-foreground">No photos</span>
                        </label>
                    </div>
                </FilterSection>
            </div>

            {/* Футер с действиями */}
            <div className="p-3 border-t border-border bg-card sticky bottom-0">
                <div className="flex gap-2">
                    <button
                        onClick={onClearFilters}
                        disabled={activeFiltersCount === 0}
                        className="flex-1 px-3 py-2 text-sm border border-border bg-background rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Reset all
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    )
}
