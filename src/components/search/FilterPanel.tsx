// src/components/search/FilterPanel.tsx - ИСПРАВЛЕННЫЙ
'use client'

import { useState } from 'react'
import { 
  X, ChevronDown, ChevronUp, RotateCcw, Camera, MapPin, Calendar, Star, User, Building2,
  Volume2, VolumeX, Navigation, ArrowUpDown, MessageSquare, Accessibility
} from 'lucide-react'
import { 
  SearchFilters, SearchMetadata, formatYearRange, getUserLocation,
  SORT_OPTIONS, ACCESSIBILITY_OPTIONS
} from '@/utils/searchUtils'

interface FilterPanelProps {
  filters: SearchFilters
  metadata: SearchMetadata
  onFiltersChange: (filters: Partial<SearchFilters>) => void
  onClearFilters: () => void
  isOpen: boolean
  onClose: () => void
  activeFiltersCount: number
}

export function FilterPanel({
  filters,
  metadata,
  onFiltersChange,
  onClearFilters,
  isOpen,
  onClose,
  activeFiltersCount
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['styles', 'years', 'rating']) // Открываем самые важные секции по умолчанию
  )
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

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

  const handleYearRangeChange = (value: [number, number]) => {
    onFiltersChange({ yearRange: value })
  }

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ minRating: rating === filters.minRating ? 0 : rating })
  }

  const handlePhotoFilter = (hasPhoto: boolean | null) => {
    onFiltersChange({ hasPhoto })
  }

  // НОВЫЕ ОБРАБОТЧИКИ
  const handleAudioFilter = (hasAudio: boolean | null) => {
    onFiltersChange({ hasAudio })
  }

  const handleAccessibilityToggle = (accessibility: string) => {
    const currentAccessibility = filters.accessibility || []
    const newAccessibility = currentAccessibility.includes(accessibility)
      ? currentAccessibility.filter(a => a !== accessibility)
      : [...currentAccessibility, accessibility]
    onFiltersChange({ accessibility: newAccessibility })
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
      console.error('Ошибка геолокации:', error)
    } finally {
      setGettingLocation(false)
    }
  }

  const handleMaxDistanceChange = (distance: number) => {
    onFiltersChange({ maxDistance: distance })
  }

  const handleSearchInReviewsToggle = () => {
    onFiltersChange({ searchInReviews: !filters.searchInReviews })
  }

  // Компонент звездочек для рейтинга
  const StarRating = ({ rating, onRatingClick }: { rating: number; onRatingClick: (rating: number) => void }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingClick(star)}
          className={`transition-colors ${
            star <= rating
              ? 'text-yellow-400 hover:text-yellow-500'
              : 'text-muted-foreground/30 hover:text-muted-foreground/50'
          }`}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground font-metrics">
        {rating > 0 ? `от ${rating} звезд` : 'Любой рейтинг'}
      </span>
    </div>
  )

  // Компонент текстовых полей для диапазона лет
  const YearRangeSlider = () => {
    const [minYear, maxYear] = metadata.yearRange
    const [currentMin, currentMax] = filters.yearRange

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (value === '') {
        handleYearRangeChange([minYear, currentMax])
        return
      }
      const newMin = parseInt(value)
      if (!isNaN(newMin) && newMin >= minYear && newMin <= (currentMax === 3000 ? maxYear : currentMax)) {
        handleYearRangeChange([newMin, currentMax])
      }
    }

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (value === '') {
        handleYearRangeChange([currentMin, maxYear])
        return
      }
      const newMax = parseInt(value)
      if (!isNaN(newMax) && newMax <= maxYear && newMax >= (currentMin === 0 ? minYear : currentMin)) {
        handleYearRangeChange([currentMin, newMax])
      }
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1 font-metrics">От</label>
            <input
              type="number"
              min={minYear}
              max={currentMax === 3000 ? maxYear : currentMax}
              value={currentMin === 0 ? '' : currentMin}
              onChange={handleMinChange}
              placeholder={minYear.toString()}
              className="w-full px-3 py-2 border border-border bg-background text-foreground text-sm font-metrics focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <span className="text-muted-foreground mt-5">—</span>
          <div className="flex-1">
            <label className="block text-xs text-muted-foreground mb-1 font-metrics">До</label>
            <input
              type="number"
              min={currentMin === 0 ? minYear : currentMin}
              max={maxYear}
              value={currentMax === 3000 ? '' : currentMax}
              onChange={handleMaxChange}
              placeholder={maxYear.toString()}
              className="w-full px-3 py-2 border border-border bg-background text-foreground text-sm font-metrics focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    )
  }

  // Секция фильтров с возможностью свертывания
  const FilterSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children, 
    count,
    badge
  }: { 
    id: string
    title: string
    icon: any
    children: React.ReactNode
    count?: number
    badge?: string
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
          {badge && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
              {badge}
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
      {/* Overlay для мобильных */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Панель фильтров */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 overflow-y-auto lg:relative lg:w-full lg:h-auto lg:shadow-none lg:bg-transparent">
        <div className="lg:bg-white lg:border lg:border-gray-200 lg:rounded-lg">
          {/* Заголовок */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 lg:bg-white lg:rounded-t-lg">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Фильтры</h3>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-sm px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Очистить
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors lg:hidden"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Фильтры */}
          <div className="divide-y divide-gray-200">
            
            {/* Сортировка */}
            <FilterSection
              id="sort"
              title="Сортировка"
              icon={ArrowUpDown}
              count={filters.sortBy !== 'relevance' ? 1 : 0}
            >
              <div className="space-y-2">
                {SORT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                  >
                    <input
                      type="radio"
                      name="sort"
                      checked={filters.sortBy === option.value}
                      onChange={() => handleSortChange(option.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700">{option.label}</span>
                    {option.value === 'distance' && !filters.nearMe && (
                      <span className="text-xs text-gray-400">(включите геолокацию)</span>
                    )}
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Геолокационный поиск */}
            <FilterSection
              id="location"
              title="Рядом со мной"
              icon={Navigation}
              count={filters.nearMe ? 1 : 0}
              badge={filters.nearMe ? 'Активно' : undefined}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNearMeToggle}
                    disabled={gettingLocation}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      filters.nearMe
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    } ${gettingLocation ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {gettingLocation ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        Определяем...
                      </>
                    ) : filters.nearMe ? (
                      <>
                        <Navigation className="w-4 h-4" />
                        Поиск рядом включен
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Найти рядом со мной
                      </>
                    )}
                  </button>
                </div>

                {locationError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                    {locationError}
                  </div>
                )}

                {filters.nearMe && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Максимальное расстояние: {filters.maxDistance} км
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={filters.maxDistance || 10}
                        onChange={(e) => handleMaxDistanceChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1 км</span>
                        <span>25 км</span>
                        <span>50 км</span>
                      </div>
                    </div>
                    
                    {filters.userLocation && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        📍 Ваше местоположение: {filters.userLocation.latitude.toFixed(4)}, {filters.userLocation.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Поиск в обзорах */}
            <FilterSection
              id="reviews"
              title="Поиск в обзорах"
              icon={MessageSquare}
              count={filters.searchInReviews ? 1 : 0}
              badge={filters.searchInReviews ? `${metadata.totalReviews || 0} обзоров` : undefined}
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.searchInReviews || false}
                    onChange={handleSearchInReviewsToggle}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm text-gray-700">Искать в содержимом обзоров</span>
                    <p className="text-xs text-gray-500">
                      Включает поиск по заголовкам и тексту пользовательских обзоров
                    </p>
                  </div>
                </label>
                
                {metadata.totalReviews && metadata.totalReviews > 0 && (
                  <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                    💬 Доступно {metadata.totalReviews} обзоров для поиска
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Аудио-гиды */}
            <FilterSection
              id="audio"
              title="Аудио-гиды"
              icon={Volume2}
              count={filters.hasAudio !== null && filters.hasAudio !== undefined ? 1 : 0}
              badge={metadata.audioGuidesCount && metadata.audioGuidesCount > 0 ? `${metadata.audioGuidesCount} доступно` : undefined}
            >
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audio"
                    checked={filters.hasAudio === null || filters.hasAudio === undefined}
                    onChange={() => handleAudioFilter(null)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Не важно</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audio"
                    checked={filters.hasAudio === true}
                    onChange={() => handleAudioFilter(true)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <Volume2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Есть аудио-гид</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="audio"
                    checked={filters.hasAudio === false}
                    onChange={() => handleAudioFilter(false)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <VolumeX className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Без аудио-гида</span>
                </label>
              </div>
            </FilterSection>

            {/* Доступность */}
            <FilterSection
              id="accessibility"
              title="Доступность"
              icon={Accessibility}
              count={filters.accessibility ? filters.accessibility.length : 0}
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ACCESSIBILITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.accessibility ? filters.accessibility.includes(option.value) : false}
                      onChange={() => handleAccessibilityToggle(option.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            {/* Архитектурные стили */}
            <FilterSection
              id="styles"
              title="Архитектурный стиль"
              icon={Building2}
              count={filters.styles.length}
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {metadata.styles.map((style) => (
                  <label
                    key={style.value}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.styles.includes(style.value)}
                      onChange={() => handleStyleToggle(style.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700">{style.value}</span>
                    <span className="text-xs text-gray-500">({style.count})</span>
                  </label>
                ))}
                {metadata.styles.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">
                    Стили будут появляться по мере добавления зданий
                  </div>
                )}
              </div>
            </FilterSection>

            {/* Период постройки */}
            <FilterSection
              id="years"
              title="Год постройки"
              icon={Calendar}
              count={
                filters.yearRange[0] > metadata.yearRange[0] || 
                filters.yearRange[1] < metadata.yearRange[1] ? 1 : 0
              }
            >
              <YearRangeSlider />
            </FilterSection>

            {/* Рейтинг */}
            <FilterSection
              id="rating"
              title="Рейтинг"
              icon={Star}
              count={filters.minRating > 0 ? 1 : 0}
            >
              <StarRating rating={filters.minRating} onRatingClick={handleRatingChange} />
            </FilterSection>

            {/* Архитекторы */}
            {metadata.architects.length > 0 && (
              <FilterSection
                id="architects"
                title="Архитекторы"
                icon={User}
                count={filters.architects.length}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metadata.architects.map((architect) => (
                    <label
                      key={architect.value}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.architects.includes(architect.value)}
                        onChange={() => handleArchitectToggle(architect.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-700">{architect.value}</span>
                      <span className="text-xs text-gray-500">({architect.count})</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Города */}
            {metadata.cities.length > 1 && (
              <FilterSection
                id="cities"
                title="Города"
                icon={MapPin}
                count={filters.cities.length}
              >
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metadata.cities.map((city) => (
                    <label
                      key={city.value}
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.cities.includes(city.value)}
                        onChange={() => handleCityToggle(city.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-700">{city.value}</span>
                      <span className="text-xs text-gray-500">({city.count})</span>
                    </label>
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Дополнительные фильтры */}
            <FilterSection
              id="additional"
              title="Дополнительно"
              icon={Camera}
              count={filters.hasPhoto !== null ? 1 : 0}
            >
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Наличие фотографий</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="photo"
                        checked={filters.hasPhoto === null}
                        onChange={() => handlePhotoFilter(null)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Не важно</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="photo"
                        checked={filters.hasPhoto === true}
                        onChange={() => handlePhotoFilter(true)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <Camera className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">Есть фотографии</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="photo"
                        checked={filters.hasPhoto === false}
                        onChange={() => handlePhotoFilter(false)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Без фотографий</span>
                    </label>
                  </div>
                </div>
              </div>
            </FilterSection>
          </div>

          {/* Футер с действиями */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 lg:bg-white lg:rounded-b-lg">
            <div className="flex gap-3">
              <button
                onClick={onClearFilters}
                disabled={activeFiltersCount === 0}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сбросить всё
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors lg:hidden"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Стили для слайдера */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  )
}
