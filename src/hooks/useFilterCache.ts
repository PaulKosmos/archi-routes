import { useState, useEffect, useCallback } from 'react'

interface FilterCache {
  [key: string]: any
}

interface UseFilterCacheOptions {
  cacheKey?: string
  persistToStorage?: boolean
  defaultFilters?: any
}

/**
 * Хук для кэширования состояния фильтров
 * @param options - опции кэширования
 * @returns объект с методами для работы с кэшем
 */
export function useFilterCache<T>(options: UseFilterCacheOptions = {}) {
  const {
    cacheKey = 'filter-cache',
    persistToStorage = true,
    defaultFilters = {}
  } = options

  const [cache, setCache] = useState<FilterCache>({})

  // Загружаем кэш из localStorage при инициализации
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          const parsedCache = JSON.parse(stored)
          setCache(parsedCache)
        }
      } catch (error) {
        console.warn('Failed to load filter cache from localStorage:', error)
      }
    }
  }, [cacheKey, persistToStorage])

  // Сохраняем кэш в localStorage при изменении
  useEffect(() => {
    if (persistToStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cache))
      } catch (error) {
        console.warn('Failed to save filter cache to localStorage:', error)
      }
    }
  }, [cache, cacheKey, persistToStorage])

  // Получить фильтры по ключу
  const getFilters = useCallback((key: string): T | undefined => {
    return cache[key] || defaultFilters
  }, [cache, defaultFilters])

  // Сохранить фильтры по ключу
  const setFilters = useCallback((key: string, filters: T) => {
    setCache(prev => ({
      ...prev,
      [key]: filters
    }))
  }, [])

  // Очистить фильтры по ключу
  const clearFilters = useCallback((key: string) => {
    setCache(prev => {
      const newCache = { ...prev }
      delete newCache[key]
      return newCache
    })
  }, [])

  // Очистить весь кэш
  const clearAllFilters = useCallback(() => {
    setCache({})
  }, [])

  // Получить все ключи кэша
  const getCacheKeys = useCallback(() => {
    return Object.keys(cache)
  }, [cache])

  // Проверить существование ключа в кэше
  const hasFilters = useCallback((key: string) => {
    return key in cache
  }, [cache])

  return {
    getFilters,
    setFilters,
    clearFilters,
    clearAllFilters,
    getCacheKeys,
    hasFilters,
    cache
  }
}
