// src/utils/searchUtils.ts - ДОПОЛНЕННЫЙ с новыми фильтрами

export interface SearchFilters {
  // Существующие фильтры
  styles: string[]
  yearRange: [number, number]
  minRating: number
  cities: string[]
  hasPhoto: boolean | null
  architects: string[]

  // НОВЫЕ ФИЛЬТРЫ согласно аудиту
  hasAudio?: boolean | null // ❌ Фильтр по наличию аудио-гидов
  accessibility?: string[] // ❌ Фильтр по доступности для посещения
  sortBy?: 'relevance' | 'rating' | 'year' | 'name' | 'distance' | 'recent' // ❌ Продвинутая сортировка
  nearMe?: boolean // ❌ Геолокационный поиск "здания рядом со мной"
  searchInReviews?: boolean // ❌ Поиск по содержимому обзоров
  userLocation?: { latitude: number; longitude: number } // Для геолокации
  maxDistance?: number // Максимальное расстояние в км
}

export interface SearchMetadata {
  // Существующие
  styles: { value: string; count: number }[]
  architects: { value: string; count: number }[]
  cities: { value: string; count: number }[]
  yearRange: [number, number]
  ratingRange: [number, number]

  // НОВЫЕ метаданные
  accessibilityOptions?: { value: string; count: number }[] // Типы доступности
  audioGuidesCount?: number // Количество зданий с аудио-гидами
  totalReviews?: number // Общее количество обзоров для поиска
}

export interface SearchSuggestion {
  type: 'building' | 'architect' | 'style' | 'city' | 'review' // добавили 'review'
  value: string
  label: string
  count?: number
  id?: string
  distance?: number // Для геолокационных результатов
}

// Нормализация текста для поиска (убираем акценты, приводим к нижнему регистру)
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // удаляем диакритические знаки
    .trim()
}

// Подсветка совпадений в тексте
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text

  const normalizedQuery = normalizeText(query)
  const normalizedText = normalizeText(text)

  if (!normalizedText.includes(normalizedQuery)) return text

  // Находим оригинальные позиции совпадений
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 rounded px-1">$1</mark>')
}

// Генерация SQL условий для поиска
export function buildSearchQuery(query: string, filters: SearchFilters) {
  const conditions: string[] = []
  const params: any = {}
  let orderBy = 'name ASC' // По умолчанию

  // Основной поиск по тексту
  if (query.trim()) {
    if (filters.searchInReviews) {
      // Поиск включая содержимое обзоров
      conditions.push(`(
        buildings.name ILIKE :query OR 
        buildings.architect ILIKE :query OR 
        buildings.address ILIKE :query OR 
        buildings.city_normalized = normalize_city_name(:queryPlain) OR
        buildings.city ILIKE :query OR
        buildings.architectural_style ILIKE :query OR
        buildings.description ILIKE :query OR
        EXISTS (
          SELECT 1 FROM building_reviews 
          WHERE building_reviews.building_id = buildings.id 
          AND (
            building_reviews.title ILIKE :query OR 
            building_reviews.content ILIKE :query
          )
        )
      )`)
    } else {
      // Обычный поиск только по зданиям
      conditions.push(`(
        buildings.name ILIKE :query OR 
        buildings.architect ILIKE :query OR 
        buildings.address ILIKE :query OR 
        buildings.city_normalized = normalize_city_name(:queryPlain) OR
        buildings.city ILIKE :query OR
        buildings.architectural_style ILIKE :query OR
        buildings.description ILIKE :query
      )`)
    }
    params.query = `%${query.trim()}%`
    params.queryPlain = query.trim()
  }

  // Существующие фильтры
  if (filters.styles.length > 0) {
    conditions.push(`buildings.architectural_style = ANY(:styles)`)
    params.styles = filters.styles
  }

  if (filters.architects.length > 0) {
    conditions.push(`buildings.architect = ANY(:architects)`)
    params.architects = filters.architects
  }

  if (filters.cities.length > 0) {
    // Use normalized city names for filtering
    // This will match cities regardless of script (Cyrillic/Latin) or accents
    conditions.push(`(
      buildings.city = ANY(:cities) OR
      buildings.city_normalized IN (
        SELECT normalize_city_name(unnest(:cities::text[]))
      )
    )`)
    params.cities = filters.cities
  }

  if (filters.yearRange[0] > 0 || filters.yearRange[1] < 3000) {
    conditions.push(`buildings.year_built BETWEEN :yearFrom AND :yearTo`)
    params.yearFrom = filters.yearRange[0]
    params.yearTo = filters.yearRange[1]
  }

  if (filters.minRating > 0) {
    conditions.push(`buildings.rating >= :minRating`)
    params.minRating = filters.minRating
  }

  if (filters.hasPhoto !== null) {
    if (filters.hasPhoto) {
      conditions.push(`(buildings.image_url IS NOT NULL OR array_length(buildings.image_urls, 1) > 0)`)
    } else {
      conditions.push(`(buildings.image_url IS NULL AND (buildings.image_urls IS NULL OR array_length(buildings.image_urls, 1) = 0))`)
    }
  }

  // НОВЫЕ ФИЛЬТРЫ

  // Фильтр по наличию аудио-гидов
  if (filters.hasAudio !== null && filters.hasAudio !== undefined) {
    if (filters.hasAudio) {
      conditions.push(`EXISTS (
        SELECT 1 FROM building_reviews 
        WHERE building_reviews.building_id = buildings.id 
        AND building_reviews.audio_url IS NOT NULL
      )`)
    } else {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM building_reviews 
        WHERE building_reviews.building_id = buildings.id 
        AND building_reviews.audio_url IS NOT NULL
      )`)
    }
  }

  // Фильтр по доступности
  if (filters.accessibility && filters.accessibility.length > 0) {
    conditions.push(`buildings.accessibility && :accessibility`)
    params.accessibility = filters.accessibility
  }

  // Геолокационный фильтр обрабатывается отдельно в хуке

  // Сортировка
  switch (filters.sortBy) {
    case 'rating':
      orderBy = 'buildings.rating DESC NULLS LAST, buildings.name ASC'
      break
    case 'year':
      orderBy = 'buildings.year_built DESC NULLS LAST, buildings.name ASC'
      break
    case 'name':
      orderBy = 'buildings.name ASC'
      break
    case 'recent':
      orderBy = 'buildings.created_at DESC'
      break
    case 'distance':
      // Сортировка по расстоянию обрабатывается в хуке
      orderBy = 'buildings.name ASC'
      break
    case 'relevance':
    default:
      if (query.trim()) {
        // Сортировка по релевантности для текстового поиска
        orderBy = `
          CASE 
            WHEN buildings.name ILIKE :exactQuery THEN 1
            WHEN buildings.name ILIKE :queryStart THEN 2
            WHEN buildings.architect ILIKE :exactQuery THEN 3
            WHEN buildings.architectural_style ILIKE :exactQuery THEN 4
            ELSE 5
          END,
          buildings.rating DESC NULLS LAST,
          buildings.name ASC
        `
        params.exactQuery = `%${query.trim()}%`
        params.queryStart = `${query.trim()}%`
      } else {
        orderBy = 'buildings.rating DESC NULLS LAST, buildings.name ASC'
      }
      break
  }

  return {
    where: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    orderBy,
    params
  }
}

// Работа с URL параметрами для поиска
export function searchToUrlParams(query: string, filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()

  if (query.trim()) params.set('q', query.trim())
  if (filters.styles.length > 0) params.set('styles', filters.styles.join(','))
  if (filters.architects.length > 0) params.set('architects', filters.architects.join(','))
  if (filters.cities.length > 0) params.set('cities', filters.cities.join(','))
  if (filters.yearRange[0] > 0) params.set('year_from', filters.yearRange[0].toString())
  if (filters.yearRange[1] < 3000) params.set('year_to', filters.yearRange[1].toString())
  if (filters.minRating > 0) params.set('min_rating', filters.minRating.toString())
  if (filters.hasPhoto !== null) params.set('has_photo', filters.hasPhoto.toString())

  // Новые параметры
  if (filters.hasAudio !== null && filters.hasAudio !== undefined) params.set('has_audio', filters.hasAudio.toString())
  if (filters.accessibility && filters.accessibility.length > 0) params.set('accessibility', filters.accessibility.join(','))
  if (filters.sortBy && filters.sortBy !== 'relevance') params.set('sort', filters.sortBy)
  if (filters.nearMe) params.set('near_me', 'true')
  if (filters.searchInReviews) params.set('search_reviews', 'true')
  if (filters.maxDistance) params.set('max_distance', filters.maxDistance.toString())

  return params
}

export function urlParamsToSearch(params: URLSearchParams): { query: string; filters: SearchFilters } {
  return {
    query: params.get('q') || '',
    filters: {
      // Существующие
      styles: params.get('styles')?.split(',').filter(Boolean) || [],
      architects: params.get('architects')?.split(',').filter(Boolean) || [],
      cities: params.get('cities')?.split(',').filter(Boolean) || [],
      yearRange: [
        parseInt(params.get('year_from') || '0') || 0,
        parseInt(params.get('year_to') || '3000') || 3000
      ],
      minRating: parseFloat(params.get('min_rating') || '0') || 0,
      hasPhoto: params.get('has_photo') ? params.get('has_photo') === 'true' : null,

      // Новые
      hasAudio: params.get('has_audio') ? params.get('has_audio') === 'true' : null,
      accessibility: params.get('accessibility')?.split(',').filter(Boolean) || [],
      sortBy: (params.get('sort') as any) || 'relevance',
      nearMe: params.get('near_me') === 'true',
      searchInReviews: params.get('search_reviews') === 'true',
      maxDistance: parseInt(params.get('max_distance') || '10') || 10
    }
  }
}

// Работа с историей поисков
export function saveSearchToHistory(query: string, filters: SearchFilters) {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') {
    return
  }

  if (!query.trim() && Object.values(filters).every(v =>
    Array.isArray(v) ? v.length === 0 : v === null || v === 0 || v === false || (Array.isArray(v) && v[0] === 0 && v[1] === 3000)
  )) {
    return // Не сохраняем пустые поиски
  }

  try {
    const history = getSearchHistory()
    const newSearch = {
      id: Date.now().toString(),
      query: query.trim(),
      filters,
      timestamp: new Date().toISOString()
    }

    // Удаляем дубли и добавляем в начало
    const filtered = history.filter(item =>
      item.query !== newSearch.query || JSON.stringify(item.filters) !== JSON.stringify(newSearch.filters)
    )

    const updated = [newSearch, ...filtered].slice(0, 5) // Оставляем только 5 последних

    localStorage.setItem('search_history', JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to save search history:', e)
  }
}

export function getSearchHistory(): Array<{
  id: string
  query: string
  filters: SearchFilters
  timestamp: string
}> {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const history = localStorage.getItem('search_history')
    return history ? JSON.parse(history) : []
  } catch (e) {
    console.warn('Failed to load search history:', e)
    return []
  }
}

export function clearSearchHistory() {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem('search_history')
  } catch (e) {
    console.warn('Failed to clear search history:', e)
  }
}

// Создание предложений для автокомплита
export function createSuggestions(
  query: string,
  metadata: SearchMetadata,
  buildings: any[] = []
): SearchSuggestion[] {
  const normalizedQuery = normalizeText(query)
  const suggestions: SearchSuggestion[] = []

  if (!query.trim()) return suggestions

  // Предложения зданий
  buildings
    .filter(building => normalizeText(building.name).includes(normalizedQuery))
    .slice(0, 3)
    .forEach(building => {
      suggestions.push({
        type: 'building',
        value: building.name,
        label: `🏛️ ${building.name}`,
        id: building.id,
        distance: building.distance
      })
    })

  // Предложения архитекторов
  metadata.architects
    .filter(arch => arch.value && normalizeText(arch.value).includes(normalizedQuery))
    .slice(0, 2)
    .forEach(arch => {
      suggestions.push({
        type: 'architect',
        value: arch.value,
        label: `👤 ${arch.value} (${arch.count} ${arch.count === 1 ? 'building' : 'buildings'})`,
        count: arch.count
      })
    })

  // Предложения стилей
  metadata.styles
    .filter(style => normalizeText(style.value).includes(normalizedQuery))
    .slice(0, 2)
    .forEach(style => {
      suggestions.push({
        type: 'style',
        value: style.value,
        label: `🏛️ ${style.value} (${style.count} ${style.count === 1 ? 'building' : 'buildings'})`,
        count: style.count
      })
    })

  // Предложения городов
  metadata.cities
    .filter(city => normalizeText(city.value).includes(normalizedQuery))
    .slice(0, 2)
    .forEach(city => {
      suggestions.push({
        type: 'city',
        value: city.value,
        label: `📍 ${city.value} (${city.count} ${city.count === 1 ? 'building' : 'buildings'})`,
        count: city.count
      })
    })

  return suggestions.slice(0, 8) // Максимум 8 предложений
}

// Подсчет активных фильтров
export function getActiveFiltersCount(filters: SearchFilters): number {
  let count = 0

  if (filters.styles.length > 0) count++
  if (filters.architects.length > 0) count++
  if (filters.cities.length > 0) count++
  if (filters.yearRange[0] > 0 || filters.yearRange[1] < 3000) count++
  if (filters.minRating > 0) count++
  if (filters.hasPhoto !== null) count++

  // Новые фильтры
  if (filters.hasAudio !== null && filters.hasAudio !== undefined) count++
  if (filters.accessibility && filters.accessibility.length > 0) count++
  if (filters.sortBy && filters.sortBy !== 'relevance') count++
  if (filters.nearMe) count++
  if (filters.searchInReviews) count++

  return count
}

// Сброс фильтров
export function resetFilters(): SearchFilters {
  return {
    // Существующие
    styles: [],
    architects: [],
    cities: [],
    yearRange: [0, 3000],
    minRating: 0,
    hasPhoto: null,

    // Новые
    hasAudio: null,
    accessibility: [],
    sortBy: 'relevance',
    nearMe: false,
    searchInReviews: false,
    maxDistance: 10
  }
}

// Format year range
export function formatYearRange(range: [number, number]): string {
  if (range[0] === 0 && range[1] === 3000) return 'All years'
  if (range[0] === range[1]) return range[0].toString()

  const from = range[0] === 0 ? 'until' : range[0].toString()
  const to = range[1] === 3000 ? 'present' : range[1].toString()

  if (range[0] === 0) return `until ${to}`
  if (range[1] === 3000) return `from ${from}`

  return `${from}–${to}`
}

// Функция для получения геолокации пользователя
export function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        // Check for error code (some browser extensions may not provide code)
        if (!error.code) {
          reject(new Error('Geolocation unavailable. Check your browser settings or disable extensions blocking geolocation'))
          return
        }

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            reject(new Error('Geolocation access blocked.\n\nLocation Guard or similar extension detected.\nSolutions:\n• Open site in incognito mode (Ctrl+Shift+N)\n• OR disable geolocation blocking extension\n• OR add site to extension exceptions'))
            break
          case 2: // POSITION_UNAVAILABLE
            reject(new Error('Location information unavailable'))
            break
          case 3: // TIMEOUT
            reject(new Error('Geolocation request timed out. Please try again'))
            break
          default:
            reject(new Error(`Geolocation error (code ${error.code}). ${error.message || 'Check your browser settings'}`))
            break
        }
      },
      {
        enableHighAccuracy: false, // Используем менее точную, но более быструю геолокацию
        timeout: 5000, // Уменьшаем timeout до 5 секунд
        maximumAge: 60000 // Кэш на 1 минуту
      }
    )
  })
}

// Функция для расчета расстояния между двумя точками (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Радиус Земли в км
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Sort options for UI
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'By relevance' },
  { value: 'rating', label: 'By rating' },
  { value: 'year', label: 'By construction year' },
  { value: 'name', label: 'Alphabetically' },
  { value: 'distance', label: 'By distance' },
  { value: 'recent', label: 'Recently added' }
] as const

// Accessibility options
export const ACCESSIBILITY_OPTIONS = [
  { value: 'wheelchair', label: 'Wheelchair accessible' },
  { value: 'blind', label: 'Accessible for visually impaired' },
  { value: 'deaf', label: 'Accessible for hearing impaired' },
  { value: 'limited_mobility', label: 'Limited mobility' },
  { value: 'elevator', label: 'Has elevator' },
  { value: 'ramp', label: 'Has ramp' },
  { value: 'parking', label: 'Accessible parking' }
] as const

// Format distance
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`
  } else {
    return `${Math.round(distanceKm)} km`
  }
}
