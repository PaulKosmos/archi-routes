/**
 * Конфигурация кэширования для оптимизации производительности
 */

// Типы кэша
export enum CacheType {
  MEMORY = 'memory',
  LOCAL_STORAGE = 'localStorage',
  SESSION_STORAGE = 'sessionStorage',
  INDEXED_DB = 'indexedDB',
  HTTP = 'http'
}

// Интерфейс для элементов кэша
interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

// Конфигурация кэша
export const CACHE_CONFIG = {
  // TTL для разных типов данных (в миллисекундах)
  TTL: {
    STATIC_ASSETS: 31536000000, // 1 год
    API_RESPONSES: 300000, // 5 минут
    IMAGES: 86400000, // 1 день
    COMPONENTS: 3600000, // 1 час
    USER_PREFERENCES: 86400000, // 1 день
    SEARCH_RESULTS: 600000, // 10 минут
    BUILDINGS: 1800000, // 30 минут
    ROUTES: 1800000, // 30 минут
    NEWS: 900000, // 15 минут
  },
  
  // Максимальные размеры кэша
  MAX_SIZE: {
    MEMORY: 50, // 50 элементов
    LOCAL_STORAGE: 5 * 1024 * 1024, // 5MB
    SESSION_STORAGE: 2 * 1024 * 1024, // 2MB
  },
  
  // Стратегии инвалидации
  INVALIDATION: {
    TIME_BASED: 'time',
    EVENT_BASED: 'event',
    MANUAL: 'manual'
  }
} as const

// Класс для управления кэшем в памяти
export class MemoryCache {
  private cache = new Map<string, CacheItem>()
  private maxSize: number

  constructor(maxSize: number = CACHE_CONFIG.MAX_SIZE.MEMORY) {
    this.maxSize = maxSize
  }

  set<T>(key: string, data: T, ttl: number = 3600000): void {
    // Удаляем старые элементы если превышен лимит
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    // Проверяем TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    return item ? Date.now() - item.timestamp <= item.ttl : false
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  // Очистка устаревших элементов
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Класс для управления кэшем в localStorage
export class LocalStorageCache {
  private prefix: string

  constructor(prefix: string = 'archi_routes_') {
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  set<T>(key: string, data: T, ttl: number = 3600000): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key
      }
      localStorage.setItem(this.getKey(key), JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error)
    }
  }

  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.getKey(key))
      if (!itemStr) return null

      const item: CacheItem<T> = JSON.parse(itemStr)
      
      // Проверяем TTL
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key)
        return null
      }

      return item.data
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error)
      return null
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    try {
      localStorage.removeItem(this.getKey(key))
      return true
    } catch (error) {
      console.warn('Failed to delete localStorage cache:', error)
      return false
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error)
    }
  }

  // Получение размера кэша
  size(): number {
    try {
      let size = 0
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          const item = localStorage.getItem(key)
          if (item) {
            size += item.length
          }
        }
      })
      return size
    } catch (error) {
      console.warn('Failed to calculate localStorage cache size:', error)
      return 0
    }
  }
}

// Менеджер кэша
export class CacheManager {
  private memoryCache: MemoryCache
  private localStorageCache: LocalStorageCache
  private cacheStrategy: Map<string, CacheType>

  constructor() {
    this.memoryCache = new MemoryCache()
    this.localStorageCache = new LocalStorageCache()
    this.cacheStrategy = new Map()

    // Настройка стратегий кэширования
    this.setupCacheStrategies()

    // Автоматическая очистка каждые 5 минут
    setInterval(() => {
      this.cleanup()
    }, 300000)
  }

  private setupCacheStrategies(): void {
    // Кэширование в памяти для часто используемых данных
    this.cacheStrategy.set('user_preferences', CacheType.MEMORY)
    this.cacheStrategy.set('search_history', CacheType.MEMORY)
    this.cacheStrategy.set('filter_state', CacheType.MEMORY)
    
    // Кэширование в localStorage для персистентных данных
    this.cacheStrategy.set('buildings', CacheType.LOCAL_STORAGE)
    this.cacheStrategy.set('routes', CacheType.LOCAL_STORAGE)
    this.cacheStrategy.set('news', CacheType.LOCAL_STORAGE)
    this.cacheStrategy.set('user_profile', CacheType.LOCAL_STORAGE)
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const strategy = this.cacheStrategy.get(key) || CacheType.MEMORY
    const cacheTtl = ttl || this.getDefaultTtl(key)

    switch (strategy) {
      case CacheType.MEMORY:
        this.memoryCache.set(key, data, cacheTtl)
        break
      case CacheType.LOCAL_STORAGE:
        this.localStorageCache.set(key, data, cacheTtl)
        break
      default:
        this.memoryCache.set(key, data, cacheTtl)
    }
  }

  get<T>(key: string): T | null {
    const strategy = this.cacheStrategy.get(key) || CacheType.MEMORY

    switch (strategy) {
      case CacheType.MEMORY:
        return this.memoryCache.get<T>(key)
      case CacheType.LOCAL_STORAGE:
        return this.localStorageCache.get<T>(key)
      default:
        return this.memoryCache.get<T>(key)
    }
  }

  has(key: string): boolean {
    const strategy = this.cacheStrategy.get(key) || CacheType.MEMORY

    switch (strategy) {
      case CacheType.MEMORY:
        return this.memoryCache.has(key)
      case CacheType.LOCAL_STORAGE:
        return this.localStorageCache.has(key)
      default:
        return this.memoryCache.has(key)
    }
  }

  delete(key: string): boolean {
    const strategy = this.cacheStrategy.get(key) || CacheType.MEMORY

    switch (strategy) {
      case CacheType.MEMORY:
        return this.memoryCache.delete(key)
      case CacheType.LOCAL_STORAGE:
        return this.localStorageCache.delete(key)
      default:
        return this.memoryCache.delete(key)
    }
  }

  clear(): void {
    this.memoryCache.clear()
    this.localStorageCache.clear()
  }

  private getDefaultTtl(key: string): number {
    // Определяем TTL на основе типа данных
    if (key.includes('buildings')) return CACHE_CONFIG.TTL.BUILDINGS
    if (key.includes('routes')) return CACHE_CONFIG.TTL.ROUTES
    if (key.includes('news')) return CACHE_CONFIG.TTL.NEWS
    if (key.includes('search')) return CACHE_CONFIG.TTL.SEARCH_RESULTS
    if (key.includes('user')) return CACHE_CONFIG.TTL.USER_PREFERENCES
    
    return CACHE_CONFIG.TTL.API_RESPONSES
  }

  private cleanup(): void {
    this.memoryCache.cleanup()
    // localStorage автоматически очищается по TTL при чтении
  }

  // Получение статистики кэша
  getStats(): {
    memory: { size: number; maxSize: number }
    localStorage: { size: number; maxSize: number }
  } {
    return {
      memory: {
        size: this.memoryCache.size(),
        maxSize: CACHE_CONFIG.MAX_SIZE.MEMORY
      },
      localStorage: {
        size: this.localStorageCache.size(),
        maxSize: CACHE_CONFIG.MAX_SIZE.LOCAL_STORAGE
      }
    }
  }
}

// Глобальный экземпляр менеджера кэша
export const cacheManager = new CacheManager()

// Хук для использования кэша в React компонентах
export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl?: number) {
  // Проверяем кэш
  const cached = cacheManager.get<T>(key)
  
  if (cached) {
    return Promise.resolve(cached)
  }

  // Загружаем данные и кэшируем
  return fetcher().then(data => {
    cacheManager.set(key, data, ttl)
    return data
  })
}

export default cacheManager
