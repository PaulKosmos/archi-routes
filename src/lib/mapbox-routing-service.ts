// lib/mapbox-routing-service.ts - Исправленная версия для автогенерации

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'your_mapbox_token_here'
const MAPBOX_BASE_URL = 'https://api.mapbox.com/directions/v5/mapbox'

export interface RoutePoint {
  latitude: number
  longitude: number
  title?: string
}

export interface RouteOptions {
  transportMode: 'walking' | 'cycling' | 'driving' | 'public_transport'
  avoidTolls?: boolean
  avoidFerries?: boolean
  preferGreen?: boolean
  optimized?: boolean
}

export interface RouteResult {
  geometry: GeoJSON.LineString
  distance: number // метры
  duration: number // секунды
  instructions: RouteInstruction[]
  summary: {
    distance: number
    duration: number
  }
}

export interface RouteInstruction {
  instruction: string
  distance: number
  duration: number
  type: string
  way_points: [number, number]
}

// Маппинг типов транспорта в профили MapBox
const MAPBOX_PROFILES = {
  walking: 'walking',
  cycling: 'cycling', 
  driving: 'driving',
  public_transport: 'walking' // Fallback
}

/**
 * 🔧 УПРОЩЕННЫЙ построитель маршрутов БЕЗ кеширования для исправления ошибки
 */
export async function buildRoute(
  points: RoutePoint[],
  options: RouteOptions = { transportMode: 'walking' }
): Promise<RouteResult> {
  console.log('🔍 DEBUG: Starting buildRoute (SIMPLIFIED VERSION)')
  
  if (points.length < 2) {
    throw new Error('Требуется минимум 2 точки для построения маршрута')
  }

  // 🔧 ОПТИМИЗАЦИЯ: Ограничиваем количество точек для экономии API
  if (points.length > 25) {
    console.log('⚠️ Too many points, limiting to 25 for API efficiency')
    points = points.slice(0, 25)
  }

  // Проверяем токен
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_mapbox_token_here') {
    console.log('❌ DEBUG: No valid MapBox token, using fallback')
    return buildStraightLineRoute(points, options)
  }

  // Разрешаем использование как публичных (pk.), так и секретных (sk.) токенов

  try {
    const result = await buildRouteFromAPI(points, options)

    console.log('🎉 Route built successfully:', {
      distance: `${(result.distance / 1000).toFixed(2)} км`,
      duration: `${Math.round(result.duration / 60)} мин`,
      instructions: result.instructions.length,
      geometryCoords: result.geometry.coordinates.length
    })

    return result

  } catch (error) {
    console.error('❌ Error building route with MapBox:', error)
    console.log('🔄 Falling back to straight lines')
    return buildStraightLineRoute(points, options)
  }
}

/**
 * Прямой вызов MapBox API (без кеширования)
 */
async function buildRouteFromAPI(
  points: RoutePoint[],
  options: RouteOptions
): Promise<RouteResult> {
  console.log('🗺️ Building route with MapBox API:', {
    points: points.length,
    transportMode: options.transportMode,
    tokenPreview: MAPBOX_TOKEN.substring(0, 10) + '...'
  })

  // Подготавливаем координаты в формате longitude,latitude
  const coordinates = points
    .map(point => `${point.longitude},${point.latitude}`)
    .join(';')
  
  console.log('🔍 DEBUG: Coordinates string:', coordinates.substring(0, 100) + '...')
  
  // Выбираем профиль транспорта
  const profile = MAPBOX_PROFILES[options.transportMode]
  console.log('🔍 DEBUG: Selected profile:', profile)
  
  // Строим URL с параметрами
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    steps: 'true',
    geometries: 'geojson',
    overview: 'full',
    annotations: 'duration,distance'
  })

  // Добавляем специфичные для транспорта опции
  if (options.transportMode === 'driving') {
    const exclude = []
    if (options.avoidTolls) exclude.push('toll')
    if (options.avoidFerries) exclude.push('ferry')
    if (exclude.length > 0) {
      params.append('exclude', exclude.join(','))
    }
  }

  const url = `${MAPBOX_BASE_URL}/${profile}/${coordinates}?${params}`
  console.log('📡 DEBUG: Making request to MapBox API...')

  const response = await fetch(url)
  console.log('📡 DEBUG: Response status:', response.status)

  if (!response.ok) {
    const errorData = await response.json()
    console.error('❌ MapBox API Error:', response.status, errorData)
    
    if (response.status === 401) {
      throw new Error('Неверный MapBox Access Token')
    } else if (response.status === 422) {
      throw new Error('Невозможно построить маршрут между указанными точками')
    } else if (response.status === 429) {
      throw new Error('Превышен лимит запросов к MapBox API. Попробуйте позже.')
    }
    
    throw new Error(`MapBox API Error: ${response.status} - ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  console.log('✅ MapBox Response received')

  // Проверяем структуру ответа
  if (!data.routes || !data.routes[0]) {
    throw new Error('No routes found in MapBox response')
  }

  const route = data.routes[0]
  
  // Извлекаем геометрию
  const geometry: GeoJSON.LineString = route.geometry

  // Обрабатываем инструкции
  const instructions: RouteInstruction[] = []
  if (route.legs) {
    route.legs.forEach((leg: any) => {
      if (leg.steps) {
        leg.steps.forEach((step: any) => {
          instructions.push({
            instruction: step.maneuver?.instruction || 'Продолжайте движение',
            distance: step.distance || 0,
            duration: step.duration || 0,
            type: step.maneuver?.type || 'continue',
            way_points: [0, 0] // MapBox использует другую структуру
          })
        })
      }
    })
  }

  return {
    geometry,
    distance: route.distance || 0,
    duration: route.duration || 0,
    instructions,
    summary: {
      distance: route.distance || 0,
      duration: route.duration || 0
    }
  }
}

/**
 * Fallback: построить маршрут по прямым линиям
 */
function buildStraightLineRoute(
  points: RoutePoint[], 
  options: RouteOptions
): RouteResult {
  console.log('📏 Building straight line route as fallback')
  
  const coordinates = points.map(point => [point.longitude, point.latitude])
  
  // Приблизительный расчет расстояния
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    const dist = haversineDistance(
      coordinates[i][1], coordinates[i][0],
      coordinates[i + 1][1], coordinates[i + 1][0]
    )
    totalDistance += dist
  }

  // Приблизительная скорость по типу транспорта
  const speeds = {
    walking: 5, // км/ч
    cycling: 15,
    driving: 40,
    public_transport: 25
  }

  const duration = (totalDistance / 1000) / speeds[options.transportMode] * 3600 // в секундах

  const result: RouteResult = {
    geometry: {
      type: 'LineString',
      coordinates
    },
    distance: totalDistance,
    duration,
    instructions: [{
      instruction: `Следуйте ${totalDistance > 1000 ? (totalDistance/1000).toFixed(1) + ' км' : Math.round(totalDistance) + ' м'} до пункта назначения`,
      distance: totalDistance,
      duration,
      type: 'depart',
      way_points: [0, coordinates.length - 1]
    }],
    summary: {
      distance: totalDistance,
      duration
    }
  }

  console.log('📏 Straight line route calculated:', {
    distance: `${(result.distance / 1000).toFixed(2)} км`,
    duration: `${Math.round(result.duration / 60)} мин`
  })

  return result
}

/**
 * 🔧 УПРОЩЕННАЯ оптимизация маршрута без кеширования
 */
export async function optimizeRoute(
  points: RoutePoint[],
  options: RouteOptions = { transportMode: 'walking' }
): Promise<{ optimizedPoints: RoutePoint[], route: RouteResult }> {
  console.log('🔧 Route optimization requested for', points.length, 'points')
  
  // 🔧 ОПТИМИЗАЦИЯ: Ограничиваем оптимизацию для больших маршрутов
  if (points.length > 12) {
    console.log('⚠️ Too many points for optimization, using simple ordering')
    const route = await buildRoute(points, options)
    return { optimizedPoints: points, route }
  }

  // Простая оптимизация: nearest neighbor для небольших маршрутов
  if (points.length >= 4 && points.length <= 8) {
    const optimized = await simpleOptimization(points, options)
    return optimized
  }

  // Без оптимизации для очень маленьких маршрутов
  const route = await buildRoute(points, options)
  return { optimizedPoints: points, route }
}

/**
 * Простая оптимизация методом ближайшего соседа
 */
async function simpleOptimization(
  points: RoutePoint[],
  options: RouteOptions
): Promise<{ optimizedPoints: RoutePoint[], route: RouteResult }> {
  console.log('🔧 Applying simple nearest neighbor optimization')
  
  if (points.length < 3) {
    const route = await buildRoute(points, options)
    return { optimizedPoints: points, route }
  }

  // Сохраняем первую и последнюю точки
  const start = points[0]
  const end = points[points.length - 1]
  const middle = points.slice(1, -1)

  // Простая сортировка средних точек по расстоянию от старта
  const optimizedMiddle = middle.sort((a, b) => {
    const distA = haversineDistance(start.latitude, start.longitude, a.latitude, a.longitude)
    const distB = haversineDistance(start.latitude, start.longitude, b.latitude, b.longitude)
    return distA - distB
  })

  const optimizedPoints = [start, ...optimizedMiddle, end]
  const route = await buildRoute(optimizedPoints, options)

  console.log('✅ Simple optimization completed')
  return { optimizedPoints, route }
}

/**
 * Рассчитать расстояние между двумя точками по формуле гаверсинусов
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // радиус Земли в метрах
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

// Экспортируем функции форматирования
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} км`
  }
  return `${Math.round(meters)} м`
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`
  }
  return `${minutes} мин`
}

/**
 * 🔧 УДАЛЕНО: Функции для получения статистики использования API и очистки кеша
 * Эти функции временно удалены для исправления ошибки кеширования
 */
