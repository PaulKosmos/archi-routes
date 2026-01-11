// src/hooks/useSearch.ts - ИСПРАВЛЕННЫЙ без циклов

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  SearchFilters,
  SearchMetadata,
  SearchSuggestion,
  searchToUrlParams,
  urlParamsToSearch,
  saveSearchToHistory,
  getSearchHistory,
  createSuggestions,
  getActiveFiltersCount,
  resetFilters,
  normalizeText,
  calculateDistance
} from '@/utils/searchUtils'

export interface Building {
  id: string
  name: string
  architect?: string
  architectural_style?: string
  year_built?: number
  city: string
  country: string
  address?: string
  latitude: number
  longitude: number
  image_url?: string
  image_urls?: string[]
  rating: number
  review_count: number
  view_count: number
  created_at: string
  description?: string
  accessibility?: string[]
  distance?: number
}

interface UseSearchOptions {
  initialQuery?: string
  initialFilters?: Partial<SearchFilters>
  autoSearch?: boolean
  syncWithUrl?: boolean
  pageSize?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    initialQuery = '',
    initialFilters = {},
    autoSearch = true,
    syncWithUrl = true,
    pageSize = 20
  } = options

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // Refs для предотвращения циклов
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitializedRef = useRef(false)

  // Состояние поиска
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    styles: [],
    architects: [],
    cities: [],
    yearRange: [0, 3000],
    minRating: 0,
    hasPhoto: null,
    hasAudio: null,
    accessibility: [],
    sortBy: 'relevance',
    nearMe: false,
    searchInReviews: false,
    maxDistance: 10,
    ...initialFilters
  }))

  // Состояние результатов
  const [results, setResults] = useState<Building[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Состояние автокомплита
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Метаданные для фильтров
  const [metadata, setMetadata] = useState<SearchMetadata>({
    styles: [],
    architects: [],
    cities: [],
    yearRange: [0, 3000],
    ratingRange: [0, 5],
    accessibilityOptions: [],
    audioGuidesCount: 0,
    totalReviews: 0
  })

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Загрузка метаданных для фильтров
  const loadMetadata = useCallback(async () => {
    try {
      // Получаем уникальные стили с количеством
      const { data: stylesData } = await supabase
        .from('buildings')
        .select('architectural_style')
        .not('architectural_style', 'is', null)

      const stylesCounts = stylesData?.reduce((acc, item) => {
        const style = item.architectural_style?.trim()
        if (style) {
          acc[style] = (acc[style] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {}

      // Получаем уникальных архитекторов с количеством
      const { data: architectsData } = await supabase
        .from('buildings')
        .select('architect')
        .not('architect', 'is', null)

      const architectsCounts = architectsData?.reduce((acc, item) => {
        const architect = item.architect?.trim()
        if (architect) {
          acc[architect] = (acc[architect] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {}

      // Получаем уникальные города с количеством
      const { data: citiesData } = await supabase
        .from('buildings')
        .select('city')

      const citiesCounts = citiesData?.reduce((acc, item) => {
        const city = item.city?.trim()
        if (city) {
          acc[city] = (acc[city] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {}

      // Получаем диапазон годов
      const { data: yearData } = await supabase
        .from('buildings')
        .select('year_built')
        .not('year_built', 'is', null)
        .order('year_built', { ascending: true })

      const years = yearData?.map(item => item.year_built).filter(Boolean) || []
      const minYear = years.length > 0 ? Math.min(...years) : 1000
      const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

      // Получаем количество зданий с аудио-гидами
      const { data: audioData } = await supabase
        .from('building_reviews')
        .select('building_id')
        .not('audio_url', 'is', null)

      const uniqueAudioBuildings = new Set(audioData?.map(item => item.building_id) || [])

      // Получаем общее количество обзоров для поиска
      const { count: reviewsCount } = await supabase
        .from('building_reviews')
        .select('*', { count: 'exact', head: true })

      setMetadata({
        styles: Object.entries(stylesCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        architects: Object.entries(architectsCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        cities: Object.entries(citiesCounts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
        yearRange: [minYear, maxYear],
        ratingRange: [0, 5],
        accessibilityOptions: [], // Заполним позже
        audioGuidesCount: uniqueAudioBuildings.size,
        totalReviews: reviewsCount || 0
      })

    } catch (err) {
      console.error('Failed to load search metadata:', err)
    }
  }, [])

  // УПРОЩЕННОЕ выполнение поиска
  const executeSearch = useCallback(async (
    searchQuery: string = query,
    searchFilters: SearchFilters = filters,
    page: number = 1,
    append: boolean = false
  ) => {
    if (loading) return // Предотвращаем множественные запросы

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Executing search:', { searchQuery, searchFilters, page })

      // Строим базовый запрос
      let baseQuery = supabase.from('buildings').select('*', { count: 'exact' })

      // Применяем текстовый поиск (с нормализованным поиском по городам)
      if (searchQuery.trim()) {
        const escapedQuery = searchQuery.trim().replace(/'/g, "''")

        // Если включен поиск в обзорах, сначала найдем ID зданий с подходящими обзорами
        if (searchFilters.searchInReviews) {
          const { data: reviewsData } = await supabase
            .from('building_reviews')
            .select('building_id')
            .ilike('review_text', `%${escapedQuery}%`)

          if (reviewsData && reviewsData.length > 0) {
            const buildingIds = [...new Set(reviewsData.map(r => r.building_id))]
            baseQuery = baseQuery.in('id', buildingIds)
          } else {
            // Если нет обзоров с таким текстом, вернем пустой результат
            setResults([])
            setTotalCount(0)
            setHasMore(false)
            setLoading(false)
            return
          }
        } else {
          // Обычный поиск по зданиям
          // Используем RPC для получения нормализованного названия города
          const { data: normalizedCity } = await supabase.rpc('normalize_city_name', {
            city_name: escapedQuery
          })

          // Ищем по имени, архитектору, адресу и стилю с ILIKE, а для городов используем нормализацию
          if (normalizedCity) {
            baseQuery = baseQuery.or(`name.ilike.%${escapedQuery}%,architect.ilike.%${escapedQuery}%,address.ilike.%${escapedQuery}%,city_normalized.eq.${normalizedCity},city.ilike.%${escapedQuery}%,architectural_style.ilike.%${escapedQuery}%`)
          } else {
            // Fallback если нормализация не сработала
            baseQuery = baseQuery.or(`name.ilike.%${escapedQuery}%,architect.ilike.%${escapedQuery}%,address.ilike.%${escapedQuery}%,city.ilike.%${escapedQuery}%,architectural_style.ilike.%${escapedQuery}%`)
          }
        }
      }

      // Применяем существующие фильтры
      if (searchFilters.styles.length > 0) {
        baseQuery = baseQuery.in('architectural_style', searchFilters.styles)
      }

      if (searchFilters.architects.length > 0) {
        baseQuery = baseQuery.in('architect', searchFilters.architects)
      }

      if (searchFilters.cities.length > 0) {
        baseQuery = baseQuery.in('city', searchFilters.cities)
      }

      if (searchFilters.yearRange[0] > 0 || searchFilters.yearRange[1] < 3000) {
        baseQuery = baseQuery
          .gte('year_built', searchFilters.yearRange[0])
          .lte('year_built', searchFilters.yearRange[1])
      }

      if (searchFilters.minRating > 0) {
        baseQuery = baseQuery.gte('rating', searchFilters.minRating)
      }

      if (searchFilters.hasPhoto !== null) {
        if (searchFilters.hasPhoto) {
          baseQuery = baseQuery.not('image_url', 'is', null)
        } else {
          baseQuery = baseQuery.is('image_url', null)
        }
      }

      // Фильтр по наличию аудио-гидов
      if (searchFilters.hasAudio !== null && searchFilters.hasAudio) {
        const { data: audioReviews } = await supabase
          .from('building_reviews')
          .select('building_id')
          .not('audio_url', 'is', null)

        if (audioReviews && audioReviews.length > 0) {
          const buildingsWithAudio = [...new Set(audioReviews.map(r => r.building_id))]
          baseQuery = baseQuery.in('id', buildingsWithAudio)
        } else {
          // Если нет зданий с аудио-гидами, вернем пустой результат
          setResults([])
          setTotalCount(0)
          setHasMore(false)
          setLoading(false)
          return
        }
      }

      // Фильтр по доступности
      if (searchFilters.accessibility && searchFilters.accessibility.length > 0) {
        // Проверяем, что все выбранные опции доступности присутствуют в здании
        for (const accessOption of searchFilters.accessibility) {
          baseQuery = baseQuery.contains('accessibility', [accessOption])
        }
      }

      // Применяем сортировку
      switch (searchFilters.sortBy) {
        case 'rating':
          baseQuery = baseQuery.order('rating', { ascending: false }).order('name')
          break
        case 'year':
          baseQuery = baseQuery.order('year_built', { ascending: false }).order('name')
          break
        case 'name':
          baseQuery = baseQuery.order('name')
          break
        case 'recent':
          baseQuery = baseQuery.order('created_at', { ascending: false })
          break
        default:
          baseQuery = baseQuery.order('rating', { ascending: false }).order('name')
          break
      }

      // Применяем пагинацию
      baseQuery = baseQuery.range((page - 1) * pageSize, page * pageSize - 1)

      const { data, count, error: searchError } = await baseQuery

      if (searchError) {
        console.error('Supabase search error:', searchError)
        throw new Error(`Search error: ${searchError.message}`)
      }

      console.log('✅ Search completed:', { resultsCount: data?.length, totalCount: count })

      let processedResults = data || []

      // Геолокационная фильтрация (если включена)
      if (searchFilters.nearMe && searchFilters.userLocation && processedResults.length > 0) {
        processedResults = processedResults
          .map(building => ({
            ...building,
            distance: calculateDistance(
              searchFilters.userLocation!.latitude,
              searchFilters.userLocation!.longitude,
              building.latitude,
              building.longitude
            )
          }))
          .filter(building => building.distance <= (searchFilters.maxDistance || 10))

        if (searchFilters.sortBy === 'distance') {
          processedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        }
      }

      setTotalCount(count || 0)
      setResults(append ? prev => [...prev, ...processedResults] : processedResults)
      setHasMore((processedResults.length) === pageSize && (page * pageSize) < (count || 0))
      setCurrentPage(page)

      // Сохраняем в историю поисков (только для значимых поисков)
      if (searchQuery.trim() || getActiveFiltersCount(searchFilters) > 0) {
        saveSearchToHistory(searchQuery, searchFilters)
      }

    } catch (err: any) {
      console.error('Search error details:', err)
      setError(err?.message || 'An error occurred during search')
    } finally {
      setLoading(false)
    }
  }, [pageSize]) // Убираем все зависимости кроме pageSize

  // Загрузка предложений для автокомплита
  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }

    setSuggestionsLoading(true)
    try {
      const escapedQuery = searchQuery.trim().replace(/'/g, "''")

      // Получаем нормализованное название города для поиска
      const { data: normalizedCity } = await supabase.rpc('normalize_city_name', {
        city_name: escapedQuery
      })

      // Ищем здания с использованием нормализации для городов
      let buildingsQuery = supabase
        .from('buildings')
        .select('id, name, architect, city, latitude, longitude')

      if (normalizedCity) {
        // Используем нормализованный поиск по городам + обычный ILIKE для других полей
        buildingsQuery = buildingsQuery.or(`name.ilike.%${escapedQuery}%,architect.ilike.%${escapedQuery}%,city_normalized.eq.${normalizedCity},city.ilike.%${escapedQuery}%`)
      } else {
        // Fallback на обычный поиск
        buildingsQuery = buildingsQuery.or(`name.ilike.%${escapedQuery}%,architect.ilike.%${escapedQuery}%,city.ilike.%${escapedQuery}%`)
      }

      const { data: buildings } = await buildingsQuery
        .order('rating', { ascending: false })
        .limit(5)

      const suggestions = createSuggestions(searchQuery, metadata, buildings || [])
      setSuggestions(suggestions)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [metadata])

  // Инициализация из URL (только один раз)
  useEffect(() => {
    if (!isInitializedRef.current && syncWithUrl && searchParams.size > 0) {
      const { query: urlQuery, filters: urlFilters } = urlParamsToSearch(searchParams)
      setQuery(urlQuery)
      setFilters(prev => ({ ...prev, ...urlFilters }))
      isInitializedRef.current = true
    }
  }, [searchParams, syncWithUrl])

  // Debounced поиск
  useEffect(() => {
    if (!autoSearch || !isInitializedRef.current) return

    // Очищаем предыдущий таймер
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query, filters, 1, false)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, autoSearch]) // Убираем filters из зависимостей

  // Отдельный эффект для фильтров
  useEffect(() => {
    if (!autoSearch || !isInitializedRef.current) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query, filters, 1, false)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [filters.styles, filters.architects, filters.cities, filters.yearRange, filters.minRating, filters.hasPhoto, filters.sortBy, filters.hasAudio, filters.accessibility, filters.nearMe, filters.searchInReviews, autoSearch])

  // Debounced автокомплит
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      loadSuggestions(query)
    }, 150)

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [query, loadSuggestions])

  // Загрузка метаданных при монтировании и выполнение начального поиска
  useEffect(() => {
    loadMetadata().then(() => {
      isInitializedRef.current = true
      // Выполняем начальный поиск для загрузки всех зданий
      if (autoSearch) {
        executeSearch(query, filters, 1, false)
      }
    })
  }, [loadMetadata])

  // Функции управления
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setCurrentPage(1)
  }, [])

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(resetFilters())
    setCurrentPage(1)
  }, [])

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      executeSearch(query, filters, currentPage + 1, true)
    }
  }, [hasMore, loading, query, filters, currentPage, executeSearch])

  const refresh = useCallback(() => {
    executeSearch(query, filters, 1, false)
    loadMetadata()
  }, [query, filters, executeSearch, loadMetadata])

  // История поисков
  const searchHistory = useMemo(() => getSearchHistory(), [])

  // Активные фильтры
  const activeFiltersCount = useMemo(() => getActiveFiltersCount(filters), [filters])

  return {
    // Состояние поиска
    query,
    filters,
    results,
    totalCount,
    loading,
    error,

    // Автокомплит
    suggestions,
    suggestionsLoading,

    // Метаданные
    metadata,

    // Пагинация
    currentPage,
    hasMore,

    // История и статистика
    searchHistory,
    activeFiltersCount,

    // Действия
    updateQuery,
    updateFilters,
    clearFilters,
    executeSearch,
    loadMore,
    refresh
  }
}
