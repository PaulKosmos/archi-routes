// lib/mapbox-status-checker.ts - Утилита для диагностики MapBox API
'use client'
import React from 'react'

export interface MapBoxStatusResult {
  hasToken: boolean
  tokenValid: boolean
  tokenLength: number
  apiAccessible: boolean
  quotaStatus: 'ok' | 'warning' | 'exceeded' | 'unknown'
  recommendations: string[]
  errors: string[]
}

/**
 * Проверяет статус MapBox API и дает рекомендации по оптимизации
 */
export async function checkMapBoxStatus(): Promise<MapBoxStatusResult> {
  const result: MapBoxStatusResult = {
    hasToken: false,
    tokenValid: false,
    tokenLength: 0,
    apiAccessible: false,
    quotaStatus: 'unknown',
    recommendations: [],
    errors: []
  }

  // Проверяем наличие токена
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  
  if (!token) {
    result.errors.push('❌ NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN не найден в переменных окружения')
    result.recommendations.push('🔧 Добавьте токен MapBox в файл .env.local')
    return result
  }

  result.hasToken = true
  result.tokenLength = token.length

  if (token === 'your_mapbox_token_here' || token.length < 50) {
    result.errors.push('❌ Токен MapBox выглядит как заглушка или слишком короткий')
    result.recommendations.push('🔧 Получите настоящий токен на https://account.mapbox.com/access-tokens/')
    return result
  }

  // Проверяем формат токена
  if (!token.startsWith('pk.')) {
    result.errors.push('❌ Токен должен начинаться с "pk." (публичный токен)')
    result.recommendations.push('🔧 Убедитесь, что используете публичный токен, а не секретный')
    return result
  }

  result.tokenValid = true

  // Тестируем доступность API
  try {
    console.log('🔍 Тестируем доступность MapBox API...')
    
    // Простой запрос для проверки доступности
    const testUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${token}&limit=1`
    
    const response = await fetch(testUrl)
    
    if (response.ok) {
      result.apiAccessible = true
      result.quotaStatus = 'ok'
      result.recommendations.push('✅ MapBox API работает корректно')
    } else if (response.status === 401) {
      result.errors.push('❌ Токен недействителен (401 Unauthorized)')
      result.recommendations.push('🔧 Проверьте правильность токена на account.mapbox.com')
    } else if (response.status === 429) {
      result.apiAccessible = true
      result.quotaStatus = 'exceeded'
      result.errors.push('❌ Превышен лимит запросов (429 Too Many Requests)')
      result.recommendations.push('⚠️ Дождитесь сброса лимитов или обновите план')
    } else {
      result.errors.push(`❌ API вернул статус ${response.status}`)
      result.recommendations.push('🔧 Проверьте статус сервиса MapBox')
    }

  } catch (error: any) {
    result.errors.push(`❌ Ошибка подключения к API: ${error.message}`)
    result.recommendations.push('🔧 Проверьте интернет-соединение и настройки firewall')
  }

  // Добавляем общие рекомендации по оптимизации
  if (result.apiAccessible) {
    result.recommendations.push(
      '💡 Рекомендации по оптимизации:',
      '• Кешируйте результаты запросов в localStorage',
      '• Используйте debounce для пользовательского ввода',
      '• Ограничивайте количество точек в маршруте (макс. 25)',
      '• Группируйте близкие точки для экономии запросов'
    )
  }

  return result
}

/**
 * Компонент для отображения статуса MapBox в UI
 */
export function MapBoxStatusIndicator({ status }: { status: MapBoxStatusResult }) {
  const getStatusColor = () => {
    if (status.errors.length > 0) return 'bg-red-50 border-red-200 text-red-800'
    if (status.apiAccessible) return 'bg-green-50 border-green-200 text-green-800'
    return 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }

  const getStatusIcon = () => {
    if (status.errors.length > 0) return '❌'
    if (status.apiAccessible) return '✅'
    return '⚠️'
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center mb-2">
        <span className="text-lg mr-2">{getStatusIcon()}</span>
        <h3 className="font-semibold">
          MapBox API Статус
        </h3>
      </div>
      
      <div className="space-y-1 text-sm mb-3">
        <div>Токен: {status.hasToken ? '✅ Найден' : '❌ Отсутствует'}</div>
        <div>Валидность: {status.tokenValid ? '✅ Валидный' : '❌ Невалидный'}</div>
        <div>API: {status.apiAccessible ? '✅ Доступен' : '❌ Недоступен'}</div>
        <div>Квота: {
          status.quotaStatus === 'ok' ? '✅ В норме' :
          status.quotaStatus === 'warning' ? '⚠️ Предупреждение' :
          status.quotaStatus === 'exceeded' ? '❌ Превышена' : '❓ Неизвестно'
        }</div>
      </div>

      {status.errors.length > 0 && (
        <div className="mb-3">
          <div className="font-medium mb-1">Ошибки:</div>
          {status.errors.map((error, index) => (
            <div key={index} className="text-xs">{error}</div>
          ))}
        </div>
      )}

      {status.recommendations.length > 0 && (
        <div>
          <div className="font-medium mb-1">Рекомендации:</div>
          {status.recommendations.map((rec, index) => (
            <div key={index} className="text-xs">{rec}</div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Утилита для кеширования запросов к MapBox
 */
export class MapBoxCache {
  private static instance: MapBoxCache
  private cache: Map<string, { data: any, timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 минут

  static getInstance(): MapBoxCache {
    if (!MapBoxCache.instance) {
      MapBoxCache.instance = new MapBoxCache()
    }
    return MapBoxCache.instance
  }

  private generateKey(url: string, params: any): string {
    return `${url}_${JSON.stringify(params)}`
  }

  async get<T>(url: string, params: any, fetcher: () => Promise<T>): Promise<T> {
    const key = this.generateKey(url, params)
    const cached = this.cache.get(key)

    // Проверяем валидность кеша
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📦 Using cached MapBox result for:', key)
      return cached.data
    }

    // Выполняем запрос
    console.log('🌐 Fetching new MapBox data for:', key)
    const data = await fetcher()
    
    // Сохраняем в кеш
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })

    // Очищаем старые записи
    this.cleanup()

    return data
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

/**
 * Хук для использования MapBox статуса в React компонентах
 */
export function useMapBoxStatus() {
  const [status, setStatus] = React.useState<MapBoxStatusResult | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkMapBoxStatus()
        setStatus(result)
      } catch (error) {
        console.error('Error checking MapBox status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  return { status, loading }
}

// Экспортируем cache instance для использования в других модулях
export const mapboxCache = MapBoxCache.getInstance()
